import fs from 'fs';
import pool from '../../shared/config/dbPool.js';
import { getEmbedding, describeImage } from '../ai/ml.engine.js';
import { extractTextFromFile, chunkText, chunkTextWithParagraphs, extractPageImages } from './document.service.js';

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
      `SELECT doc.title
       FROM (
         SELECT DISTINCT ON (title)
           title,
           chunk_text
         FROM public.w_embeddings
         WHERE user_id = $1
         ORDER BY title, created_at ASC, id ASC
       ) AS doc
       WHERE LEFT(TRIM(doc.chunk_text), 500) = $2
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

    /*  CHUNKING WITH PARAGRAPH INDEXES  */
    const MAX_CHUNKS = 500;
    const structuredChunks = chunkTextWithParagraphs(text, 350).slice(0, MAX_CHUNKS);

    if (!structuredChunks.length) {
      throw new Error('No valid chunks generated');
    }

    /*  DB INSERT  */
    await client.query('BEGIN');

    let storedChunks = 0;
    const failedChunks = [];

    for (let i = 0; i < structuredChunks.length; i++) {
      const chunkObj = structuredChunks[i];
      try {
        const embedding = await getEmbedding(chunkObj.text);

        if (
          !Array.isArray(embedding) ||
          embedding.some(v => typeof v !== 'number')
        ) {
          throw new Error('Invalid embedding vector');
        }

        await client.query(
          `
          INSERT INTO public.w_embeddings
          (title, chunk_text, embedding, user_id, paragraph_index, page_number, created_at)
          VALUES ($1, $2, $3::vector, $4, $5, $6, NOW())
          `,
          [
            title,
            chunkObj.text,
            `[${embedding.join(',')}]`,
            userId,
            chunkObj.paragraphIndex || (i + 1),
            chunkObj.pageNumber || 1
          ]
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
        totalChunks: structuredChunks.length,
        storedChunks,
        failedChunks: failedChunks.length,
        imagesDescribed,
      },
      failures: failedChunks.length ? failedChunks : undefined
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(' Document processing failed:', error.message);
    res.status(500).json({ error: 'Failed to process document' });

  } finally {
    client.release();
    if (uploadedFilePath) {
      fs.unlink(uploadedFilePath, () => {});
    }
  }
}

/*  GET USER DOCUMENTS LIST  */
export async function getUserDocuments(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    let rows = [];
    try {
      const result = await pool.query(
        `
        SELECT 
          title,
          COUNT(*) as chunk_count,
          MAX(COALESCE(paragraph_index, 1)) as max_paragraph,
          MIN(created_at) as created_at
        FROM public.w_embeddings
        WHERE user_id = $1
        GROUP BY title
        ORDER BY created_at DESC
        `,
        [userId]
      );
      rows = result.rows;
    } catch (dbErr) {
      if (dbErr.message?.includes('paragraph_index')) {
        const fallbackRes = await pool.query(
          `
          SELECT 
            title,
            COUNT(*) as chunk_count,
            1 as max_paragraph,
            MIN(created_at) as created_at
          FROM public.w_embeddings
          WHERE user_id = $1
          GROUP BY title
          ORDER BY created_at DESC
          `,
          [userId]
        );
        rows = fallbackRes.rows;
      } else {
        throw dbErr;
      }
    }

    res.json({
      success: true,
      documents: rows.map(r => ({
        title: r.title,
        chunkCount: parseInt(r.chunk_count, 10),
        maxParagraph: parseInt(r.max_paragraph || 1, 10),
        createdAt: r.created_at,
        isDeepResearch: r.title ? r.title.startsWith('[Deep Research]') : false
      }))
    });

  } catch (error) {
    console.error('Failed to get user documents:', error.message);
    res.status(500).json({ error: 'Failed to fetch user documents' });
  }
}

/*  GET DOCUMENT PARAGRAPHS (FOR PARAGRAPH INSPECTOR)  */
export async function getDocumentParagraphs(req, res) {
  try {
    const userId = req.user?.id;
    const { title } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    if (!title) {
      return res.status(400).json({ error: 'Document title is required' });
    }

    const { rows } = await pool.query(
      `
      SELECT id, title, chunk_text, paragraph_index, page_number, created_at
      FROM public.w_embeddings
      WHERE user_id = $1 AND title = $2
      ORDER BY paragraph_index ASC, id ASC
      `,
      [userId, title]
    );

    res.json({
      success: true,
      title,
      paragraphs: rows.map(r => ({
        id: r.id,
        text: r.chunk_text,
        paragraphIndex: r.paragraph_index || 1,
        pageNumber: r.page_number || 1
      }))
    });

  } catch (error) {
    console.error('Failed to get document paragraphs:', error.message);
    res.status(500).json({ error: 'Failed to fetch document paragraphs' });
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

