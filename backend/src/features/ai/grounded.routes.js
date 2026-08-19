import express from 'express';
import requireAuth from '../../shared/middleware/requireAuth.js';
import { executeGroundedChat } from './groundedChat.service.js';
import { executeDeepResearch } from './deepResearch.service.js';

const router = express.Router();

// Grounded Chat Endpoint
router.post('/ai/grounded-chat', requireAuth, async (req, res) => {
  try {
    const { prompt, selectedDocumentTitles, groundingMode, chatHistory } = req.body;
    const userId = req.user?.id;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const result = await executeGroundedChat({
      prompt,
      selectedDocumentTitles,
      groundingMode,
      chatHistory,
      userId
    });

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('[GROUNDED CHAT ERROR]:', error.message);
    res.status(500).json({ error: error.message || 'Failed to process grounded chat' });
  }
});

// Deep Research Endpoint
router.post('/ai/deep-research', requireAuth, async (req, res) => {
  try {
    const { topic, depth, autoIngest } = req.body;
    const userId = req.user?.id;

    if (!topic) {
      return res.status(400).json({ error: 'Research topic is required' });
    }

    const result = await executeDeepResearch({
      topic,
      depth,
      autoIngest: autoIngest !== false,
      userId
    });

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('[DEEP RESEARCH ERROR]:', error.message);
    res.status(500).json({ error: error.message || 'Failed to execute deep research' });
  }
});

export default router;
