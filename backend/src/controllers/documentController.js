import fs from 'fs';
import pool from '../utils/dbPool.js';
import { getEmbedding } from '../utils/aiUtils.js';
import { extractTextFromFile, chunkText } from '../services/documentService.js';



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
    const text = await extractTextFromFile(
      req.file.path,
      req.file.mimetype
    );

    if (!text || text.trim().length < 50) {
      throw new Error('Document contains insufficient readable text');
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
          [
            title,
            chunks[i],
            `[${embedding.join(',')}]`,
            userId
          ]
        );

        storedChunks++;

        } catch (err) {
          failedChunks.push({
            index: i,
            error: err.message
          });
        }
    }
    await client.query('COMMIT');
    /*  RESPONSE  */
    // Get the ID of the first inserted embedding to return as documentId
    const idResult = await client.query(
      'SELECT id FROM public.w_embeddings WHERE title = $1 AND user_id = $2 LIMIT 1',
      [title, userId]
    );
    const documentId = idResult.rows[0]?.id || null;

    res.json({
      success: true,
      document: {
        id: documentId,
        title,
        originalName: req.file.originalname,
        userId
      },
      stats: {
        textLength: text.length,
        totalChunks: chunks.length,
        storedChunks,
        failedChunks: failedChunks.length
      },
      failures: failedChunks.length ? failedChunks : undefined
    });

  } catch (error) {
    await client.query('ROLLBACK');

    console.error(' Document processing failed:', error.message);

    res.status(500).json({
      error: 'Failed to process document',
      details: error.message
    });

  } finally {
    client.release();

    // Always remove uploaded file
    if (uploadedFilePath) {
      fs.unlink(uploadedFilePath, () => {});
    }
  }
}


/*  DELETE DOCUMENT EMBEDDINGS       */


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

    res.json({
      success: true,
      deletedCount: result.rowCount
    });

  } catch (error) {
    console.error('Delete failed:', error.message);

    res.status(500).json({
      error: 'Failed to delete embeddings'
    });
  }
}
