// Creates and exports the PostgreSQL connection pool used by backend services.
import pkg from 'pg';
const { Pool } = pkg;

function getDatabaseUrl() {
  const candidates = [
    process.env.SUPABASE_DB_URL,
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
  ];

  for (const c of candidates) {
    if (c && /^postgres(ql)?:\/\//i.test(c)) {
      return c;
    }
  }

  // Fallback: check if SUPABASE_URL happens to be a postgres URL
  if (process.env.SUPABASE_URL && /^postgres(ql)?:\/\//i.test(process.env.SUPABASE_URL)) {
    return process.env.SUPABASE_URL;
  }

  if (process.env.SUPABASE_URL && !/^postgres(ql)?:\/\//i.test(process.env.SUPABASE_URL)) {
    console.warn('[dbPool] SUPABASE_URL is an HTTP(S) URL and cannot be used directly as a PostgreSQL connection string. Ensure SUPABASE_DB_URL or DATABASE_URL is set.');
  }

  return process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || '';
}

const DATABASE_URL = getDatabaseUrl();

if (!DATABASE_URL) {
  console.error('[dbPool] Missing SUPABASE_DB_URL or DATABASE_URL connection string (must be postgresql://...)');
}

const pool = new Pool({
  connectionString: DATABASE_URL || undefined,
  ssl: { rejectUnauthorized: false },
  max: 5,
  connectionTimeoutMillis: 20000,
  idleTimeoutMillis: 30000,
  query_timeout: 120000,
});

pool.on('error', (err) => {
  console.error('[dbPool] Unexpected PostgreSQL pool client error:', err.message);
});

export default pool;

