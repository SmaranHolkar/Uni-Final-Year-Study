import fs from 'fs';
import pool from '../../shared/config/dbPool.js';
import { getEmbedding, describeImage } from '../ai/ml.engine.js';
import { extractTextFromFile, chunkText, chunkTextWithParagraphs, extractPageImages } from './document.service.js';
import { supabaseAdmin, supabase } from '../../shared/config/supabaseClient.js';

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

    /* UPLOAD RAW BINARY TO SUPABASE STORAGE "userDocuments" BUCKET */
    let storageFileUrl = null;
    const storageClient = supabaseAdmin || supabase;

    if (storageClient && uploadedFilePath) {
      try {
        const fileBuffer = fs.readFileSync(uploadedFilePath);
        const safeFileName = `${userId}/${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const targetBuckets = ['userDocuments', 'documents'];

        for (const bucketName of targetBuckets) {
          try {
            // Attempt auto-creation if bucket doesn't exist yet
            if (supabaseAdmin?.storage?.createBucket) {
              await supabaseAdmin.storage.createBucket(bucketName, { public: true }).catch(() => {});
            }

            const { data: uploadData, error: uploadErr } = await storageClient.storage
              .from(bucketName)
              .upload(safeFileName, fileBuffer, {
                contentType: req.file.mimetype || 'application/pdf',
                upsert: true,
              });

            if (!uploadErr && uploadData) {
              const { data: signedData } = await storageClient.storage
                .from(bucketName)
                .createSignedUrl(safeFileName, 60 * 60 * 24 * 365);

              storageFileUrl = signedData?.signedUrl || storageClient.storage.from(bucketName).getPublicUrl(safeFileName).data?.publicUrl;
              console.log(`[STORAGE] Successfully saved raw PDF to "${bucketName}" bucket: ${storageFileUrl}`);
              break;
            } else if (uploadErr) {
              console.warn(`[STORAGE NOTICE] Bucket "${bucketName}" upload note:`, uploadErr.message);
            }
          } catch (bucketErr) {
            console.warn(`[STORAGE NOTICE] Bucket "${bucketName}" attempt skipped:`, bucketErr.message);
          }
        }
      } catch (storErr) {
        console.warn('[STORAGE NOTICE] Storage upload skipped:', storErr.message);
      }
    }

    /*  EXTRACT TEXT  */
    let text = await extractTextFromFile(req.file.path, req.file.mimetype);

    if (!text || text.trim().length < 50) {
      throw new Error('Document contains insufficient readable text');
    }

    /*  CLEAN UP EXISTING EMBEDDINGS FOR THIS TITLE & USER (Enables seamless re-upload/update)  */
    await client.query(
      'DELETE FROM public.w_embeddings WHERE user_id = $1 AND (title = $2 OR REPLACE(title, \'+\', \' \') = $3)',
      [userId, title, title.replace(/\+/g, ' ')]
    );

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
          (title, chunk_text, embedding, user_id, paragraph_index, page_number, file_url, created_at)
          VALUES ($1, $2, $3::vector, $4, $5, $6, $7, NOW())
          `,
          [
            title,
            chunkObj.text,
            `[${embedding.join(',')}]`,
            userId,
            chunkObj.paragraphIndex || (i + 1),
            chunkObj.pageNumber || 1,
            storageFileUrl || null
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
      document: {
        id: documentId,
        title,
        originalName: req.file.originalname,
        userId,
        fileUrl: storageFileUrl || null
      },
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

/*  GET DOCUMENT PARAGRAPHS (FOR PARAGRAPH INSPECTOR & CITATION SPLIT-VIEWER)  */
export async function getDocumentParagraphs(req, res) {
  try {
    const userId = req.user?.id;
    const rawTitle = (req.query.title || '').trim();

    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    let rows = [];
    let matchedTitle = rawTitle;

    if (rawTitle) {
      const cleanTitle = rawTitle.replace(/\+/g, ' ');
      const queryRes = await pool.query(
        `
        SELECT id, title, chunk_text, COALESCE(paragraph_index, 1) as paragraph_index, COALESCE(page_number, 1) as page_number, file_url, created_at
        FROM public.w_embeddings
        WHERE user_id = $1 AND (
          title = $2 OR
          title ILIKE $2 OR
          title ILIKE $3 OR
          REPLACE(title, '+', ' ') ILIKE $3
        )
        ORDER BY paragraph_index ASC, id ASC
        `,
        [userId, rawTitle, `%${cleanTitle}%`]
      );
      rows = queryRes.rows;
      if (rows.length > 0) {
        matchedTitle = rows[0].title;
      }
    }

    // If still no rows (or no title passed), fetch most recent document for this user
    if (rows.length === 0) {
      const recentRes = await pool.query(
        `
        SELECT id, title, chunk_text, COALESCE(paragraph_index, 1) as paragraph_index, COALESCE(page_number, 1) as page_number, file_url, created_at
        FROM public.w_embeddings
        WHERE user_id = $1 AND title = (
          SELECT title FROM public.w_embeddings WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1
        )
        ORDER BY paragraph_index ASC, id ASC
        `,
        [userId]
      );
      rows = recentRes.rows;
      if (rows.length > 0) {
        matchedTitle = rows[0].title;
      }
    }

    let resolvedFileUrl = rows.find((r) => r.file_url)?.file_url || null;

    // If fileUrl is missing in the database row, dynamically query the userDocuments Supabase bucket
    if (!resolvedFileUrl && (supabaseAdmin || supabase)) {
      const storageClient = supabaseAdmin || supabase;
      try {
        const { data: fileList, error: listErr } = await storageClient.storage
          .from('userDocuments')
          .list(userId, { limit: 50, sortBy: { column: 'created_at', order: 'desc' } });

        if (!listErr && Array.isArray(fileList) && fileList.length > 0) {
          const cleanSearchSlug = (matchedTitle || rawTitle || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const matchedFile = fileList.find((f) => f.name.toLowerCase().replace(/[^a-z0-9]/g, '').includes(cleanSearchSlug)) || fileList[0];

          if (matchedFile) {
            const filePath = `${userId}/${matchedFile.name}`;
            const { data: signedData } = await storageClient.storage
              .from('userDocuments')
              .createSignedUrl(filePath, 60 * 60 * 24 * 365);

            resolvedFileUrl = signedData?.signedUrl || storageClient.storage.from('userDocuments').getPublicUrl(filePath).data?.publicUrl;

            // Cache to w_embeddings for future instant lookups
            if (resolvedFileUrl && matchedTitle) {
              pool.query(
                'UPDATE public.w_embeddings SET file_url = $1 WHERE user_id = $2 AND title = $3',
                [resolvedFileUrl, userId, matchedTitle]
              ).catch(() => {});
            }
          }
        }
      } catch (storageLookupErr) {
        console.warn('[STORAGE LOOKUP NOTE]:', storageLookupErr.message);
      }
    }

    res.json({
      success: true,
      title: matchedTitle || rawTitle || 'Course Document',
      fileUrl: resolvedFileUrl || null,
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

