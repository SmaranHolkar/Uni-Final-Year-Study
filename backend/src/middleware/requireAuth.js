import { supabase } from '../supabaseClient.js';

export default async function requireAuth(req, res, next) {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase client not configured' });
    }
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = auth.split(' ')[1];

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = data.user;
    return next();
  } catch (err) {
    console.error('Auth middleware error:', err?.message ?? err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
