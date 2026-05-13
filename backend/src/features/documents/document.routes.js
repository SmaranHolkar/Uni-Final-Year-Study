import express from 'express';
import requireAuth from '../../shared/middleware/requireAuth.js';
import upload from './upload.middleware.js';
import { processAndStoreDocument, deleteDocumentEmbeddings } from './document.controller.js';

const router = express.Router();

// Upload endpoint — extracts text, chunks it, generates embeddings, and stores in w_embeddings
router.post('/upload-document', requireAuth, upload.single('document'), processAndStoreDocument);

router.delete('/document/:title', requireAuth, deleteDocumentEmbeddings);

export default router;
