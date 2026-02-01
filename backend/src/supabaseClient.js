import { createClient } from '@supabase/supabase-js';

// Backend should read env vars from process.env (do NOT hard-code keys)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

function deriveRestUrlFromAnonKey(anonKey) {
  try {
    const payload = anonKey?.split('.')?.[1];
    if (!payload) return null;
    const decoded = Buffer.from(payload, 'base64').toString('utf8');
    const data = JSON.parse(decoded);
    if (data?.ref) {
      return `https://${data.ref}.supabase.co`;
    }
  } catch {
    return null;
  }
  return null;
}

function resolveSupabaseUrl(rawUrl, anonKey) {
  if (!rawUrl) return null;
  if (/^postgres(ql)?:\/\//i.test(rawUrl)) {
    return deriveRestUrlFromAnonKey(anonKey);
  }
  return rawUrl;
}

const resolvedUrl = resolveSupabaseUrl(SUPABASE_URL, SUPABASE_ANON_KEY);

if (!resolvedUrl || !SUPABASE_ANON_KEY) {
  console.warn('Missing or invalid SUPABASE_URL/SUPABASE_ANON_KEY for Supabase client.');
}

export const supabase = resolvedUrl && SUPABASE_ANON_KEY
  ? createClient(resolvedUrl, SUPABASE_ANON_KEY)
  : null;