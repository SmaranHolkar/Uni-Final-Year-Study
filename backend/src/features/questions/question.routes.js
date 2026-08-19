import express from 'express';
import requireAuth from '../../shared/middleware/requireAuth.js';
import enforceDailyQuota from '../../shared/middleware/enforceDailyQuota.js';
import {
	generateQuestions,
	generateMindmap,
	generateLearningTool,
	getSuggestionsForUser,
	getTierStatus,
	getDueSpacedRepetition,
	markSpacedRepetitionReviewed,
	saveLearningPlaygroundSession,
	getLearningPlaygroundSessions,
	saveMarketplaceToolToCollection,
	getUserSavedTools,
} from './question.controller.js';

const router = express.Router();

router.post('/generate-questions', requireAuth, enforceDailyQuota('study_session_start'), generateQuestions);
router.post('/generate-mindmap', requireAuth, generateMindmap);
router.post('/chat-tools', requireAuth, enforceDailyQuota('learning_tool_generate'), generateLearningTool);
router.post('/learning-playground/sessions', requireAuth, saveLearningPlaygroundSession);
router.get('/learning-playground/sessions', requireAuth, getLearningPlaygroundSessions);
router.get('/suggestions', requireAuth, getSuggestionsForUser);
router.get('/tier-status', requireAuth, getTierStatus);
router.get('/spaced-repetition/due', requireAuth, getDueSpacedRepetition);
router.post('/spaced-repetition/:id/reviewed', requireAuth, markSpacedRepetitionReviewed);

// Marketplace save/list endpoints (write paths)
router.post('/marketplace/tools/save', requireAuth, saveMarketplaceToolToCollection);
router.get('/marketplace/tools/saved', requireAuth, getUserSavedTools);
// NOTE: /marketplace/tools/public is defined (with requireAuth) in marketplace.routes.js

export default router;
