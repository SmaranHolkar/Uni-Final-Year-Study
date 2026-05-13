import pool from '../../shared/config/dbPool.js';

// DB error codes we can safely ignore for optional/legacy tables and columns.
const SKIPPABLE_DB_ERRORS = new Set(['42P01', '42703']);

// Executes a delete for a user with a savepoint so one table issue does not abort the whole transaction.
export async function safeDeleteByUser(client, table, userId) {
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

// Executes a delete for a user with owner_user_id column instead of user_id.
export async function safeDeleteByOwnerUserId(client, table, userId) {
  const savepoint = `sp_del_own_${table.replace(/[^a-zA-Z0-9]/g, '_')}`;
  await client.query(`SAVEPOINT ${savepoint}`);
  try {
    const result = await client.query(`DELETE FROM ${table} WHERE owner_user_id = $1`, [userId]);
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
export async function safeCountByUser(client, table, userId) {
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

// Counts remaining user rows using owner_user_id column
export async function safeCountByOwnerUserId(client, table, userId) {
  const savepoint = `sp_cnt_own_${table.replace(/[^a-zA-Z0-9]/g, '_')}`;
  await client.query(`SAVEPOINT ${savepoint}`);
  try {
    const result = await client.query(
      `SELECT COUNT(*)::int AS count FROM ${table} WHERE owner_user_id::text = $1`,
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
export async function deleteUserDataForUser(client, userId) {
  const userTables = ['public.quizzes_mindmaps', 'public.w_embeddings', 'public.suggestions_history', 'public.learning_playground_sessions'];
  const ownerUserTables = ['public.playground_marketplace_tools'];
  const deleted = {};

  for (const table of userTables) {
    deleted[table] = await safeDeleteByUser(client, table, userId);
  }
  for (const table of ownerUserTables) {
    deleted[table] = await safeDeleteByOwnerUserId(client, table, userId);
  }

  return deleted;
}

// Connects a pool client and runs a count verification across the three user data tables.
export async function verifyUserDataDeleted(client, userId) {
  return {
    quizzes: await safeCountByUser(client, 'public.quizzes_mindmaps', userId),
    embeddings: await safeCountByUser(client, 'public.w_embeddings', userId),
    suggestions: await safeCountByUser(client, 'public.suggestions_history', userId),
    learningPlaygroundSessions: await safeCountByUser(client, 'public.learning_playground_sessions', userId),
    marketplaceTools: await safeCountByOwnerUserId(client, 'public.playground_marketplace_tools', userId),
  };
}

export { pool };
