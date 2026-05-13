import 'dotenv/config';
import pool from '../src/shared/config/dbPool.js';

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Starting migration...');
    
    await client.query('BEGIN');

    // Rename table if it exists and shared_assets doesn't
    const tableCheck = await client.query(`
      SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'shared_mindmaps') as old_exists,
             EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'shared_assets') as new_exists
    `);

    if (tableCheck.rows[0].old_exists && !tableCheck.rows[0].new_exists) {
      console.log('Renaming shared_mindmaps to shared_assets...');
      await client.query('ALTER TABLE public.shared_mindmaps RENAME TO shared_assets');
    } else {
      console.log('Table rename skipped (either already renamed or old table missing).');
    }

    // Rename column if it exists
    const colCheck = await client.query(`
      SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'shared_assets' AND column_name = 'quiz_mindmap_id') as col_exists
    `);

    if (colCheck.rows[0].col_exists) {
      console.log('Renaming quiz_mindmap_id to asset_id...');
      await client.query('ALTER TABLE public.shared_assets RENAME COLUMN quiz_mindmap_id TO asset_id');
    }

    // Add asset_type column if it doesn't exist
    const typeCheck = await client.query(`
      SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'shared_assets' AND column_name = 'asset_type') as type_exists
    `);

    if (!typeCheck.rows[0].type_exists) {
      console.log('Adding asset_type column...');
      await client.query("ALTER TABLE public.shared_assets ADD COLUMN asset_type VARCHAR(20) DEFAULT 'quiz'");
    }

    // Update existing records
    console.log('Updating existing records...');
    await client.query("UPDATE public.shared_assets SET asset_type = 'quiz' WHERE asset_type IS NULL");

    await client.query('COMMIT');
    console.log('Migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
  } finally {
    client.release();
    process.exit();
  }
}

migrate();
