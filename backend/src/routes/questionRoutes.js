import express from 'express';
import { generateQuestions, generateMindmap, saveQuizMindmap, getQuizzesMindmapsController, getMetacognitiveAnalysis } from '../controllers/questionController.js';
import { getSuggestionsForUser } from '../utils/MachineLearning.js';
import requireAuth from '../middleware/requireAuth.js';

const router = express.Router();

router.post('/generate-questions', requireAuth, generateQuestions);
router.post('/generate-mindmap', requireAuth, generateMindmap);
router.post('/save-quiz-mindmap', requireAuth, saveQuizMindmap);
router.get('/quiz-history', requireAuth, getQuizzesMindmapsController);
router.get('/suggestions', requireAuth, getSuggestionsForUser);
router.get('/metacognitive-analysis/:quizId', requireAuth, getMetacognitiveAnalysis);

export default router;