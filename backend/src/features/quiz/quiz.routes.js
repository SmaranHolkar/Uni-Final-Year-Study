import express from 'express';
import requireAuth from '../../shared/middleware/requireAuth.js';
import {
  saveQuizMindmap,
  getQuizzesMindmapsController,
  getMetacognitiveAnalysis,
  shareMindmapController,
  getSharedWithMeController,
} from './quiz.controller.js';

const router = express.Router();

router.post('/save-quiz-mindmap', requireAuth, saveQuizMindmap);
router.get('/quiz-history', requireAuth, getQuizzesMindmapsController);
router.get('/metacognitive-analysis/:quizId', requireAuth, getMetacognitiveAnalysis);
router.post('/share-mindmap', requireAuth, shareMindmapController);
router.get('/shared-with-me', requireAuth, getSharedWithMeController);

export default router;
