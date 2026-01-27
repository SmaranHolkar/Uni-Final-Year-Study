import pkg from 'pg';
const { Pool } = pkg;
const DATABASE_URL = process.env.SUPABASE_URL;
if (!DATABASE_URL) {
  throw new Error(' SUPABASE_URL missing (must be pooler :6543)');
}
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl:{ rejectUnauthorized: false },
  max:5,
  connectionTimeoutMillis: 20000,
  idleTimeoutMillis: 30000,
  query_timeout: 120000,
});
export default pool;