import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import pool from '../../shared/config/dbPool.js';
import requireAuth from '../../shared/middleware/requireAuth.js';
import { getEmbedding } from './ml.engine.js';
import { chunkTextWithParagraphs } from '../documents/document.service.js';
import {
  ingestYouTubeVideo,
  transcribeAudioFile,
  extractTextFromImage,
} from './multimodal.service.js';

const router = express.Router();

// Configure Multer for Audio and Image uploads with safety limits
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.resolve('uploads/multimodal');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${cleanBase}_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter: (req, file, cb) => {
    const allowedExtensions = [
      '.mp3', '.wav', '.m4a', '.webm', '.ogg', '.flac', // audio
      '.jpg', '.jpeg', '.png', '.webp', '.bmp'           // image
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext) || file.mimetype.startsWith('audio/') || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type (${ext}). Please upload an audio file (.mp3, .wav, .m4a) or image (.png, .jpg)`));
    }
  },
});

/**
 * Helper to store extracted text into w_embeddings for RAG vector search.
 */
async function storeTextAsRAGDocument(userId, title, text) {
  if (!userId || !text) return;
  const client = await pool.connect();
  try {
    const structuredChunks = chunkTextWithParagraphs(text, 350).slice(0, 100);
    if (!structuredChunks.length) return;

    await client.query('BEGIN');
    for (let i = 0; i < structuredChunks.length; i++) {
      const chunkObj = structuredChunks[i];
      try {
        const embedding = await getEmbedding(chunkObj.text);
        if (Array.isArray(embedding)) {
          await client.query(
            `INSERT INTO public.w_embeddings
             (title, chunk_text, embedding, user_id, paragraph_index, page_number, created_at)
             VALUES ($1, $2, $3::vector, $4, $5, 1, NOW())`,
            [title, chunkObj.text, `[${embedding.join(',')}]`, userId, chunkObj.paragraphIndex || i + 1]
          );
        }
      } catch (err) {
        console.warn('[MULTIMODAL RAG] Chunk embedding error:', err.message);
      }
    }
    await client.query('COMMIT');
  } catch (dbErr) {
    await client.query('ROLLBACK');
    console.warn('[MULTIMODAL RAG] Failed to save embeddings:', dbErr.message);
  } finally {
    client.release();
  }
}

/**
 * POST /api/multimodal/youtube
 * Ingests a YouTube video URL and generates study notes/context.
 */
router.post('/multimodal/youtube', requireAuth, async (req, res) => {
  try {
    const { youtubeUrl, title } = req.body;
    if (!youtubeUrl) {
      return res.status(400).json({ error: 'youtubeUrl is required' });
    }

    const result = await ingestYouTubeVideo(youtubeUrl);
    const finalTitle = title?.trim() || result.title;

    // Save to user RAG documents
    if (req.user?.id) {
      await storeTextAsRAGDocument(req.user.id, finalTitle, result.extractedText);
    }

    res.json({
      success: true,
      document: {
        id: `yt_${Date.now()}`,
        title: finalTitle,
        extractedText: result.extractedText,
        summary: result.summary,
        source: 'youtube',
      },
    });
  } catch (err) {
    console.error('[MULTIMODAL] YouTube Ingestion Error:', err);
    res.status(500).json({ error: err.message || 'Failed to process YouTube lecture' });
  }
});

/**
 * POST /api/multimodal/audio
 * Transcribes lecture audio via Groq Whisper.
 */
router.post('/multimodal/audio', requireAuth, upload.single('audio'), async (req, res) => {
  const filePath = req.file?.path;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const customTitle = req.body.title?.trim();
    const result = await transcribeAudioFile(filePath, req.file.originalname);
    const finalTitle = customTitle || result.title;

    // Save to user RAG documents
    if (req.user?.id) {
      await storeTextAsRAGDocument(req.user.id, finalTitle, result.extractedText);
    }

    res.json({
      success: true,
      document: {
        id: `audio_${Date.now()}`,
        title: finalTitle,
        extractedText: result.extractedText,
        duration: result.duration,
        source: 'audio',
      },
    });
  } catch (err) {
    console.error('[MULTIMODAL] Audio Transcription Error:', err);
    res.status(500).json({ error: err.message || 'Failed to transcribe lecture audio' });
  } finally {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlink(filePath, () => {});
    }
  }
});

/**
 * POST /api/multimodal/image-ocr
 * Extracts handwritten notes / study diagrams via Groq Vision.
 */
router.post('/multimodal/image-ocr', requireAuth, upload.single('image'), async (req, res) => {
  const filePath = req.file?.path;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const customTitle = req.body.title?.trim();
    const result = await extractTextFromImage(filePath, req.file.mimetype);
    const finalTitle = customTitle || result.title;

    // Save to user RAG documents
    if (req.user?.id) {
      await storeTextAsRAGDocument(req.user.id, finalTitle, result.extractedText);
    }

    res.json({
      success: true,
      document: {
        id: `ocr_${Date.now()}`,
        title: finalTitle,
        extractedText: result.extractedText,
        source: 'ocr_image',
      },
    });
  } catch (err) {
    console.error('[MULTIMODAL] Image OCR Error:', err);
    res.status(500).json({ error: err.message || 'Failed to extract text from image' });
  } finally {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlink(filePath, () => {});
    }
  }
});

export default router;
