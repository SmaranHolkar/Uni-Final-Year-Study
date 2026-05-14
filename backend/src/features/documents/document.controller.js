import fs from 'fs';
import pool from '../../shared/config/dbPool.js';
import { getEmbedding, describeImage } from '../ai/ml.engine.js';
import { extractTextFromFile, chunkText, extractPageImages } from './document.service.js';

/*  PROCESS & STORE DOCUMENT   */

// Handles processAndStoreDocument logic.
export async function processAndStoreDocument(req, res) {
  const client = await pool.connect();
  const uploadedFilePath = req.file?.path;

  try {
    /*  VALIDATION  */
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const title = req.body.title?.trim();
    if (!title) {
      return res.status(400).json({ error: 'Document title is required' });
    }

    /* AUTH USER */
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    /*  CHECK FOR DUPLICATES  */
    const duplicateCheck = await client.query(
      'SELECT COUNT(*) FROM public.w_embeddings WHERE title = $1 AND user_id = $2',
      [title, userId]
    );

    if (parseInt(duplicateCheck.rows[0].count) > 0) {
      return res.status(409).json({
        error: 'Document already exists',
        message: `A document with the title "${title}" has already been uploaded. Please use a different title or delete the existing document first.`
      });
    }

    /*  EXTRACT TEXT  */
    let text = await extractTextFromFile(req.file.path, req.file.mimetype);

    if (!text || text.trim().length < 50) {
      throw new Error('Document contains insufficient readable text');
    }

    /*  CHECK FOR CONTENT DUPLICATES (by first 500 chars of extracted text)  */
    const newTextPrefix = text.trim().slice(0, 500);
    const contentDuplicateCheck = await client.query(
      `SELECT title
       FROM public.w_embeddings
       WHERE user_id = $1
         AND id IN (
           SELECT MIN(id) FROM public.w_embeddings WHERE user_id = $1 GROUP BY title
         )
         AND LEFT(TRIM(chunk_text), 500) = $2
       LIMIT 1`,
      [userId, newTextPrefix]
    );

    if (contentDuplicateCheck.rows.length > 0) {
      const existingTitle = contentDuplicateCheck.rows[0].title;
      return res.status(409).json({
        error: 'Document already exists',
        message: `This document's content matches an existing document titled "${existingTitle}". Please delete the existing document first or upload different content.`
      });
    }

    /*  IMAGE ENRICHMENT (PDF only) — non-fatal  */
    let imagesDescribed = 0;
    if (req.file.mimetype === 'application/pdf') {
      try {
        const pageImages = await extractPageImages(req.file.path);
        if (pageImages.length > 0) {
          console.log(`[VISION] Found ${pageImages.length} image-containing page(s) in "${title}"`);
          const descriptions = [];
          for (const { pageNum, base64 } of pageImages) {
            try {
              const desc = await describeImage(base64);
              descriptions.push(`[Page ${pageNum} Visual Content]:\n${desc}`);
              imagesDescribed++;
              console.log(`[VISION] Described page ${pageNum} (${desc.length} chars)`);
            } catch (visionErr) {
              console.warn(`[VISION] Could not describe page ${pageNum}:`, visionErr.message);
            }
          }
          if (descriptions.length) {
            text += '\n\n' + descriptions.join('\n\n');
          }
        } else {
          console.log(`[VISION] No image-containing pages found in "${title}" — text-only document`);
        }
      } catch (imgErr) {
        // Image enrichment failure must never block the upload
        console.warn('[VISION] Image extraction failed, continuing with text-only:', imgErr.message);
      }
    }

    /*  CHUNKING  */
    const MAX_CHUNKS = 500;
    const chunks = chunkText(text, 1000, 100).slice(0, MAX_CHUNKS);

    if (!chunks.length) {
      throw new Error('No valid chunks generated');
    }

    /*  DB INSERT  */
    await client.query('BEGIN');

    let storedChunks = 0;
    const failedChunks = [];

    for (let i = 0; i < chunks.length; i++) {
      try {
        const embedding = await getEmbedding(chunks[i]);

        if (
          !Array.isArray(embedding) ||
          embedding.some(v => typeof v !== 'number')
        ) {
          throw new Error('Invalid embedding vector');
        }

        await client.query(
          `
          INSERT INTO public.w_embeddings
          (title, chunk_text, embedding, user_id, created_at)
          VALUES ($1, $2, $3::vector, $4, NOW())
          `,
          [title, chunks[i], `[${embedding.join(',')}]`, userId]
        );

        storedChunks++;

      } catch (err) {
        failedChunks.push({ index: i, error: err.message });
      }
    }
    await client.query('COMMIT');

    /*  RESPONSE  */
    const idResult = await client.query(
      'SELECT id FROM public.w_embeddings WHERE title = $1 AND user_id = $2 LIMIT 1',
      [title, userId]
    );
    const documentId = idResult.rows[0]?.id || null;

    res.json({
      success: true,
      document: { id: documentId, title, originalName: req.file.originalname, userId },
      stats: {
        textLength: text.length,
        totalChunks: chunks.length,
        storedChunks,
        failedChunks: failedChunks.length,
        imagesDescribed,
      },
      failures: failedChunks.length ? failedChunks : undefined
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(' Document processing failed:', error.message);
    res.status(500).json({ error: 'Failed to process document', details: error.message });

  } finally {
    client.release();
    if (uploadedFilePath) {
      fs.unlink(uploadedFilePath, () => {});
    }
  }
}

/*  DELETE DOCUMENT EMBEDDINGS  */

// Handles deleteDocumentEmbeddings logic.
export async function deleteDocumentEmbeddings(req, res) {
  try {
    const { title } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    const result = await pool.query(
      'DELETE FROM public.w_embeddings WHERE title = $1 AND user_id = $2',
      [title, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Document not found or you do not have permission to delete it'
      });
    }

    res.json({ success: true, deletedCount: result.rowCount });

  } catch (error) {
    console.error('Delete failed:', error.message);
    res.status(500).json({ error: 'Failed to delete embeddings' });
  }
}
