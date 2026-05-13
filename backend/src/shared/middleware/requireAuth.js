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
    
    // Log all headers for debugging
    console.log('Request headers:', {
      authorization: req.headers.authorization ? `${req.headers.authorization.substring(0, 30)}...` : 'MISSING',
      'content-type': req.headers['content-type'],
      origin: req.headers.origin
    });
    
    // Try to get token from header first, then query param as fallback
    let token = null;
    const auth = req.headers.authorization || '';
    
    if (auth.startsWith('Bearer ')) {
      token = auth.split(' ')[1];
    } else if (req.query.token) {
      // Fallback: check query parameter
      console.log('Using token from query parameter (header missing)');
      token = req.query.token;
    }
    
    if (!token) {
      console.error('Missing Authorization header and no query token. Received auth header:', auth.substring(0, 30));
      return res.status(401).json({ error: 'Unauthorized: Missing authentication token' });
    }

    const { data, error } = await client.auth.getUser(token);
    
    if (error || !data?.user) {
      console.error('Invalid token or user not found:', error?.message || 'No user data');
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }

    req.user = data.user;
    console.log('User authenticated:', data.user.email);
    return next();
  } catch (err) {
    console.error('Auth middleware error:', err?.message ?? err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
