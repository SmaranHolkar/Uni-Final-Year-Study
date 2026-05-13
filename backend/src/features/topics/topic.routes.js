import express from 'express';
import requireAuth from '../../shared/middleware/requireAuth.js';
import { generateSimilarTopic, generateMCQForTopic } from './topic.controller.js';

const router = express.Router();

router.post('/generate-similar-topic', requireAuth, generateSimilarTopic);
router.post('/generate-mcq-for-topic', requireAuth, generateMCQForTopic);

export default router;
