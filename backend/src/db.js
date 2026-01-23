// // W%9$ez3EqSC$f3Q

// import postgres from 'postgres'

// const connectionString = process.env.DATABASE_URL
// const sql = postgres(connectionString)

// export default sql

import postgres from 'postgres'

const connectionString = process.env.SUPABASE_URL
const sql = postgres(connectionString)

export default sql