import express from 'express';
import requireAuth from '../middleware/requireAuth.js';

const router = express.Router();

// GET /api/auth/me
// Verifies Bearer token and returns user/session info
router.get('/me', requireAuth, (req, res) => {
  return res.json({ user: req.user });
});

export default router;
