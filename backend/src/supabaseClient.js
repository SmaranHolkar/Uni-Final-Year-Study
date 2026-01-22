import { createClient } from '@supabase/supabase-js';

// Backend should read env vars from process.env (do NOT hard-code keys)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Missing SUPABASE_URL or SUPABASE_ANON_KEY in backend environment.');
}
console.log("URL:", process.env.SUPABASE_URL) // 
console.log("KEY:", process.env.SUPABASE_ANON_KEY)

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);