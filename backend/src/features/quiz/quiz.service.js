import pool from '../../shared/config/dbPool.js';
import { getEmbedding } from '../ai/ml.engine.js';

// Handles generateEmbeddingText logic.
function generateEmbeddingText(quizResults, mindmapNodes) {
  let text = '';

  if (Array.isArray(quizResults)) {
    text += quizResults
      .map(q => `${q.prompt || ''} ${q.userAnswer || ''} ${q.correctAnswer || ''}`)
      .join(' ');
  }

  if (Array.isArray(mindmapNodes)) {
    text += ' ' + mindmapNodes
      .map(node => `${node.text || ''} ${node.concept || ''}`)
      .join(' ');
  }
  return text.trim() || 'quiz mindmap';
}

// Handles saveQuizMindmap logic.
export async function saveQuizMindmap({ userId, title, quizResults, mindmapNodes, retakeOfQuizId = null }) {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const embeddingText = generateEmbeddingText(quizResults, mindmapNodes);
    const embeddingVector = await getEmbedding(embeddingText);
    const embedding = `[${embeddingVector.join(',')}]`;
    const insertQuery = `
      INSERT INTO public.quizzes_mindmaps (user_id, title, quiz, mindmap, embedding, retake_of_quiz_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5::vector, $6, NOW(), NOW())
      RETURNING id;
    `;
    const result = await client.query(insertQuery, [
      userId,
      title,
      JSON.stringify(quizResults),
      JSON.stringify(mindmapNodes),
      embedding,
      retakeOfQuizId,
    ]);
    await client.query('COMMIT');
    return { id: result.rows[0].id };
  } catch (error) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch {}
    }
    throw error;
  } finally {
    if (client) client.release();
  }
}

// Retrieves all quiz + mindmap records for a user.
export async function getUserQuizzesMindmaps(userId) {
  const client = await pool.connect();
  try {
    const query = `
      SELECT id, user_id, title, quiz, mindmap, embedding, retake_of_quiz_id, created_at, updated_at
      FROM public.quizzes_mindmaps
      WHERE user_id = $1
      ORDER BY created_at DESC;
    `;
    const result = await client.query(query, [userId]);
    return result.rows;
  } finally {
    client.release();
  }
}

// Retrieves a single quiz record by ID, scoped to a user.
export async function getQuizById(quizId, userId) {
  const client = await pool.connect();
  try {
    const query = `
      SELECT id, user_id, title, quiz, mindmap, retake_of_quiz_id, created_at
      FROM public.quizzes_mindmaps
      WHERE id = $1 AND user_id = $2
    `;
    const result = await client.query(query, [quizId, userId]);
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

// Share a quiz+mindmap with another registered user by their email
export async function shareQuizMindmap({ senderId, recipientEmail, quizMindmapId }) {
  const client = await pool.connect();
  try {
    const userResult = await client.query(
      `SELECT id FROM auth.users WHERE email = $1`,
      [recipientEmail.toLowerCase().trim()]
    );
    if (userResult.rowCount === 0) {
      const err = new Error('No user found with that email');
      err.code = 'USER_NOT_FOUND';
      throw err;
    }
    const recipientId = userResult.rows[0].id;

    if (recipientId === senderId) {
      const err = new Error('You cannot share a mindmap with yourself');
      err.code = 'SELF_SHARE';
      throw err;
    }

    const ownerResult = await client.query(
      `SELECT id FROM public.quizzes_mindmaps WHERE id = $1 AND user_id = $2`,
      [quizMindmapId, senderId]
    );
    if (ownerResult.rowCount === 0) {
      const err = new Error('Quiz not found or not owned by you');
      err.code = 'NOT_OWNER';
      throw err;
    }

    const insertResult = await client.query(
      `INSERT INTO public.shared_assets (sender_id, recipient_id, asset_id, asset_type, created_at)
       VALUES ($1, $2, $3, 'quiz', NOW()) RETURNING id`,
      [senderId, recipientId, quizMindmapId]
    );
    return { id: insertResult.rows[0].id, recipientId };
  } finally {
    client.release();
  }
}

// Get all mindmaps that have been shared with a user
export async function getSharedWithMe(recipientId) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT sm.id AS share_id, sm.created_at AS shared_at,
              qm.id AS quiz_id, qm.title, qm.quiz, qm.mindmap, qm.created_at,
              au.email AS sender_email
       FROM public.shared_assets sm
       JOIN public.quizzes_mindmaps qm ON qm.id = sm.asset_id
       JOIN auth.users au ON au.id = sm.sender_id
       WHERE sm.recipient_id = $1 AND sm.asset_type = 'quiz'
       ORDER BY sm.created_at DESC`,
      [recipientId]
    );
    return result.rows;
  } finally {
    client.release();
  }
}
