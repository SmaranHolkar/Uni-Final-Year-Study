import { supabase, supabaseAdmin } from '../config/supabaseClient.js';

// Handles requireAuth logic.
export default async function requireAuth(req, res, next) {
  try {
    // Prefer service-role client for server-side token verification
    const client = supabaseAdmin || supabase;
    if (!client) {
      console.error('Supabase client not configured');
      return res.status(500).json({ error: 'Supabase client not configured' });
    }
    
    // Log all headers for debugging — never log the token value itself
    console.log('Request headers:', {
      authorization: req.headers.authorization ? 'Bearer [redacted]' : 'MISSING',
      'content-type': req.headers['content-type'],
      origin: req.headers.origin
    });
    
    // Accept token from Authorization header only.
    // Query-param tokens are intentionally not supported: they appear in
    // server logs, browser history, CDN access logs, and Referer headers.
    let token = null;
    const auth = req.headers.authorization || '';
    
    if (auth.startsWith('Bearer ')) {
      token = auth.split(' ')[1];
    }
    
    if (!token) {
      console.error('Missing Authorization header. Received auth header:', auth ? '[present but malformed]' : '[missing]');
      return res.status(401).json({ error: 'Unauthorized: Missing authentication token' });
    }

    let authResult;
    try {
      authResult = await client.auth.getUser(token);
    } catch (authErr) {
      console.error('Supabase getUser exception:', authErr.message);
      return res.status(401).json({ error: 'Unauthorized: Token verification failed' });
    }

    const { data, error } = authResult || {};
    
    if (error || !data?.user) {
      console.error('Invalid token or user not found:', error?.message || 'No user data');
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }

    req.user = data.user;
    console.log('User authenticated:', data.user.email);
    return next();
  } catch (err) {
    console.error('Auth middleware error:', err?.message ?? err);
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

export async function optionalAuth(req, res, next) {
  try {
    const client = supabaseAdmin || supabase;
    const auth = req.headers.authorization || '';
    if (client && auth.startsWith('Bearer ')) {
      const token = auth.split(' ')[1];
      if (token) {
        const { data } = await client.auth.getUser(token);
        if (data?.user) {
          req.user = data.user;
        }
      }
    }
  } catch {
    // Soft failure for optional auth
  }
  return next();
}
