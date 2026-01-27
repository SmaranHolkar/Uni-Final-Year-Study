import express from 'express';
import { generateQuestions, generateMindmap } from '../controllers/questionController.js';

const router = express.Router();

router.post('/generate-questions', generateQuestions);
router.post('/generate-mindmap', generateMindmap);

export default router;