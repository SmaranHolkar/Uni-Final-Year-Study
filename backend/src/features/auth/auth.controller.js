import pool from '../../shared/config/dbPool.js';
import { supabaseAdmin } from '../../shared/config/supabaseClient.js';
import { deleteUserDataForUser, verifyUserDataDeleted } from './auth.service.js';

// GET /api/auth/me — verifies Bearer token and returns user info.
export async function getMeController(req, res) {
  return res.json({ user: req.user });
}

// DELETE /api/auth/data — removes all user application data and verifies nothing remains.
export async function deleteDataController(req, res) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const deleted = await deleteUserDataForUser(client, userId);
    const remaining = await verifyUserDataDeleted(client, userId);

    if (remaining.quizzes > 0 || remaining.embeddings > 0 || remaining.suggestions > 0 || remaining.learningPlaygroundSessions > 0 || remaining.marketplaceTools > 0) {
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
}

// DELETE /api/auth/account — removes all user data, verifies, then removes the auth account.
export async function deleteAccountController(req, res) {
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
    const remaining = await verifyUserDataDeleted(client, userId);

    if (remaining.quizzes > 0 || remaining.embeddings > 0 || remaining.suggestions > 0 || remaining.learningPlaygroundSessions > 0 || remaining.marketplaceTools > 0) {
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
}
