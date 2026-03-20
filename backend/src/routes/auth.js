import express from 'express';
import requireAuth from '../middleware/requireAuth.js';
import pool from '../utils/dbPool.js';
import { supabaseAdmin } from '../supabaseClient.js';

const router = express.Router();

// DB error codes we can safely ignore for optional/legacy tables and columns.
const SKIPPABLE_DB_ERRORS = new Set(['42P01', '42703']);

// Executes a delete for a user with a savepoint so one table issue does not abort the whole transaction.
async function safeDeleteByUser(client, table, userId) {
  const savepoint = `sp_del_${table.replace(/[^a-zA-Z0-9]/g, '_')}`;
  await client.query(`SAVEPOINT ${savepoint}`);
  try {
    const result = await client.query(`DELETE FROM ${table} WHERE user_id = $1`, [userId]);
    await client.query(`RELEASE SAVEPOINT ${savepoint}`);
    return result.rowCount;
  } catch (error) {
    await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
    await client.query(`RELEASE SAVEPOINT ${savepoint}`);
    if (SKIPPABLE_DB_ERRORS.has(error?.code)) {
      return 0;
    }
    throw error;
  }
}

// Counts remaining user rows with a savepoint for robust post-delete verification.
async function safeCountByUser(client, table, userId) {
  const savepoint = `sp_cnt_${table.replace(/[^a-zA-Z0-9]/g, '_')}`;
  await client.query(`SAVEPOINT ${savepoint}`);
  try {
    const result = await client.query(
      `SELECT COUNT(*)::int AS count FROM ${table} WHERE user_id::text = $1`,
      [String(userId)]
    );
    await client.query(`RELEASE SAVEPOINT ${savepoint}`);
    return result.rows[0]?.count || 0;
  } catch (error) {
    await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
    await client.query(`RELEASE SAVEPOINT ${savepoint}`);
    if (SKIPPABLE_DB_ERRORS.has(error?.code)) {
      return 0;
    }
    throw error;
  }
}

// Deletes all user-scoped data across app tables.
async function deleteUserDataForUser(client, userId) {
  const tables = ['public.quizzes_mindmaps', 'public.w_embeddings', 'public.suggestions_history'];
  const deleted = {};

  for (const table of tables) {
    deleted[table] = await safeDeleteByUser(client, table, userId);
  }

  return deleted;
}

// GET /api/auth/me
// Verifies Bearer token and returns user info.
router.get('/me', requireAuth, (req, res) => {
  return res.json({ user: req.user });
});

// DELETE /api/auth/data
// Removes all user application data and verifies nothing remains.
router.delete('/data', requireAuth, async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const deleted = await deleteUserDataForUser(client, userId);

    const remaining = {
      quizzes: await safeCountByUser(client, 'public.quizzes_mindmaps', userId),
      embeddings: await safeCountByUser(client, 'public.w_embeddings', userId),
      suggestions: await safeCountByUser(client, 'public.suggestions_history', userId),
    };

    if (remaining.quizzes > 0 || remaining.embeddings > 0 || remaining.suggestions > 0) {
      throw new Error('Some user data still remains after delete operation');
    }

    await client.query('COMMIT');

    return res.json({
      success: true,
      message: 'User data deleted successfully',
      deleted,
      remaining,
    });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('Delete data error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete data' });
  } finally {
    client.release();
  }
});

// DELETE /api/auth/account
// Removes all user application data, verifies deletion, then removes the auth account.
router.delete('/account', requireAuth, async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  if (!supabaseAdmin) {
    return res.status(503).json({ success: false, message: 'Account deletion is currently unavailable' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const deleted = await deleteUserDataForUser(client, userId);

    const remaining = {
      quizzes: await safeCountByUser(client, 'public.quizzes_mindmaps', userId),
      embeddings: await safeCountByUser(client, 'public.w_embeddings', userId),
      suggestions: await safeCountByUser(client, 'public.suggestions_history', userId),
    };

    if (remaining.quizzes > 0 || remaining.embeddings > 0 || remaining.suggestions > 0) {
      throw new Error('Some user data still remains after delete operation');
    }

    await client.query('COMMIT');

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) {
      console.error('Supabase account deletion error:', error);
      return res.status(500).json({ success: false, message: 'Failed to delete account' });
    }

    return res.json({
      success: true,
      message: 'Account deleted successfully',
      deleted,
      remaining,
    });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('Delete account error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete account' });
  } finally {
    client.release();
  }
});

export default router;
