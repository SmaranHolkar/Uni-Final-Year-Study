// // W%9$ez3EqSC$f3Q

// import postgres from 'postgres'

// const connectionString = process.env.DATABASE_URL
// const sql = postgres(connectionString)

// export default sql

import postgres from 'postgres'

const connectionString = process.env.SUPABASE_DB_URL || process.env.SUPABASE_URL

// Enable SSL for remote databases (required by Supabase and most cloud PostgreSQL services)
const sql = postgres(connectionString, {
  ssl: 'require'
})

export default sql