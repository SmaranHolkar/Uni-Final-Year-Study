import express from 'express';
import requireAuth from '../../shared/middleware/requireAuth.js';
import {
	generateQuestions,
	generateMindmap,
	generateLearningTool,
	getSuggestionsForUser,
	saveLearningPlaygroundSession,
	getLearningPlaygroundSessions,
	saveMarketplaceToolToCollection,
	getUserSavedTools,
	getPublishedMarketplaceTools,
} from './question.controller.js';

const router = express.Router();

router.post('/generate-questions', requireAuth, generateQuestions);
router.post('/generate-mindmap', requireAuth, generateMindmap);
router.post('/chat-tools', requireAuth, generateLearningTool);
router.post('/learning-playground/sessions', requireAuth, saveLearningPlaygroundSession);
router.get('/learning-playground/sessions', requireAuth, getLearningPlaygroundSessions);
router.get('/suggestions', requireAuth, getSuggestionsForUser);

// Marketplace endpoints
router.post('/marketplace/tools/save', requireAuth, saveMarketplaceToolToCollection);
router.get('/marketplace/tools/saved', requireAuth, getUserSavedTools);
router.get('/marketplace/tools/public', getPublishedMarketplaceTools);

export default router;
