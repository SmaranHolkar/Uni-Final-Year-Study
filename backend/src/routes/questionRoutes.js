// Defines authenticated API routes for question, mindmap, and suggestion workflows.
import express from 'express';
import { generateQuestions, generateMindmap, saveQuizMindmap, getQuizzesMindmapsController, getMetacognitiveAnalysis, generateLearningTool, getSuggestionsForUser, shareMindmapController, getSharedWithMeController } from '../controllers/questionController.js';
import { generateSimilarTopic, generateMCQForTopic } from '../controllers/topicController.js';
import requireAuth from '../middleware/requireAuth.js';

const router = express.Router();

router.post('/generate-questions', requireAuth, generateQuestions);
router.post('/generate-mindmap', requireAuth, generateMindmap);
router.post('/save-quiz-mindmap', requireAuth, saveQuizMindmap);
router.get('/quiz-history', requireAuth, getQuizzesMindmapsController);
router.get('/suggestions', requireAuth, getSuggestionsForUser);
router.get('/metacognitive-analysis/:quizId', requireAuth, getMetacognitiveAnalysis);
router.post('/chat-tools', requireAuth, generateLearningTool);
router.post('/generate-similar-topic', requireAuth, generateSimilarTopic);
router.post('/generate-mcq-for-topic', requireAuth, generateMCQForTopic);
router.post('/share-mindmap', requireAuth, shareMindmapController);
router.get('/shared-with-me', requireAuth, getSharedWithMeController);

export default router;
