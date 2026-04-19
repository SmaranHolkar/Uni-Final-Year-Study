import { createClient } from '@supabase/supabase-js';

/* ----------------------- SUPABASE CLIENT SETUP ----------------------- */
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Handles deriveRestUrlFromAnonKey logic.
function deriveRestUrlFromAnonKey(anonKey) {
  try {
    // Ensure we have a JWT-like token: three dot-separated parts.
    if (typeof anonKey !== 'string') return null;
    const parts = anonKey.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    if (!payload) return null;

    // Basic validation for base64url characters to avoid malformed input.
    if (!/^[A-Za-z0-9\-_]+$/.test(payload)) {
      return null;
    }

    // Normalize from base64url to base64 and add required padding.
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);

    const decoded = Buffer.from(padded, 'base64').toString('utf8');
    const data = JSON.parse(decoded);
    if (data && typeof data.ref === 'string' && data.ref.length > 0) {
      return `https://${data.ref}.supabase.co`;
    }
  } catch {
    return null;
  }
  return null;
}

// Handles resolveSupabaseUrl logic.
function resolveSupabaseUrl(rawUrl, anonKey) {
  if (!rawUrl) return null;
  if (/^postgres(ql)?:\/\//i.test(rawUrl)) {
    return deriveRestUrlFromAnonKey(anonKey);
  }
  return rawUrl;
}

const resolvedUrl = resolveSupabaseUrl(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('[supabaseClient] SUPABASE_URL raw format:', SUPABASE_URL ? SUPABASE_URL.substring(0, 15) + '...' : 'NOT SET');
console.log('[supabaseClient] Resolved URL:', resolvedUrl ? resolvedUrl.substring(0, 30) + '...' : 'FAILED TO RESOLVE');
console.log('[supabaseClient] SUPABASE_ANON_KEY set:', !!SUPABASE_ANON_KEY);
console.log('[supabaseClient] SUPABASE_SERVICE_ROLE_KEY set:', !!SUPABASE_SERVICE_ROLE_KEY);

if (!resolvedUrl || !SUPABASE_ANON_KEY) {
  console.warn('Missing or invalid SUPABASE_URL/SUPABASE_ANON_KEY for Supabase client.');
}

export const supabase = resolvedUrl && SUPABASE_ANON_KEY
  ? createClient(resolvedUrl, SUPABASE_ANON_KEY)
  : null;

export const supabaseAdmin = resolvedUrl && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(resolvedUrl, SUPABASE_SERVICE_ROLE_KEY)
  : null;

console.log('[supabaseClient] supabase client created:', !!supabase);
console.log('[supabaseClient] supabaseAdmin client created:', !!supabaseAdmin);
