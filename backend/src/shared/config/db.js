import postgres from 'postgres';

function getConnectionString() {
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

  if (process.env.SUPABASE_URL && /^postgres(ql)?:\/\//i.test(process.env.SUPABASE_URL)) {
    return process.env.SUPABASE_URL;
  }

  return process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || '';
}

const connectionString = getConnectionString();

// Enable SSL for remote databases (required by Supabase and most cloud PostgreSQL services)
const sql = postgres(connectionString || 'postgres://localhost:5432/postgres', {
  ssl: { rejectUnauthorized: false },
});

export default sql;

