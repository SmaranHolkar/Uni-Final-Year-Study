import express from 'express';
import { processAndStoreDocument, deleteDocumentEmbeddings } from '../controllers/documentController.js';
import requireAuth from '../middleware/requireAuth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// Upload endpoint - extracts text, chunks it, generates embeddings, and stores in w_embeddings
router.post('/upload-document', requireAuth, upload.single('document'), processAndStoreDocument);


router.delete('/document/:title', requireAuth, deleteDocumentEmbeddings);



export default router;
