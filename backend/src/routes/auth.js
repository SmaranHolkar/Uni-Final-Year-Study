import express from 'express';
import { supabase } from '../supabaseClient.js';

const router = express.Router();

// GET /api/auth/me
// Verifies Bearer token and returns user/session info
router.get('/me', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase client not configured' });
    }
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const token = auth.split(' ')[1];

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return res.status(401).json({ error: 'Invalid token' });

    return res.json({ user: data.user });
  } catch (err) {
    console.error('Auth /me error:', err?.message ?? err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
