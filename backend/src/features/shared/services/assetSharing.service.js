import pool from '../../../shared/config/dbPool.js';

/**
 * Unified service for sharing assets (quizzes, mindmaps, playground tools) between users.
 */

export async function shareAsset({ senderId, recipientEmail, assetId, assetType }) {
  const client = await pool.connect();
  try {
    // 1. Resolve recipient ID from email
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
      const err = new Error('You cannot share with yourself');
      err.code = 'SELF_SHARE';
      throw err;
    }

    // 2. Verify ownership (based on asset type)
    let ownershipQuery = '';
    if (assetType === 'quiz') {
      ownershipQuery = `SELECT id FROM public.quizzes_mindmaps WHERE id = $1 AND user_id = $2`;
    } else if (assetType === 'tool') {
      ownershipQuery = `SELECT id FROM public.playground_marketplace_tools WHERE id = $1 AND owner_user_id = $2`;
    } else {
      throw new Error(`Invalid asset type: ${assetType}`);
    }

    const ownerResult = await client.query(ownershipQuery, [assetId, senderId]);
    if (ownerResult.rowCount === 0) {
      const err = new Error('Asset not found or not owned by you');
      err.code = 'NOT_OWNER';
      throw err;
    }

    // 3. Record the share
    const insertResult = await client.query(
      `INSERT INTO public.shared_assets (sender_id, recipient_id, asset_id, asset_type, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (sender_id, recipient_id, asset_id, asset_type) DO NOTHING
       RETURNING id`,
      [senderId, recipientId, assetId, assetType]
    );

    return { 
      success: true, 
      id: insertResult.rows[0]?.id || 'already-shared', 
      recipientId 
    };
  } finally {
    client.release();
  }
}

/**
 * Get assets shared with the current user.
 */
export async function getSharedAssetsWithMe(recipientId, assetType) {
  const client = await pool.connect();
  try {
    let query = '';
    if (assetType === 'quiz') {
      query = `
        SELECT sa.id AS share_id, sa.created_at AS shared_at,
               qm.id AS quiz_id, qm.title, qm.quiz, qm.mindmap, qm.created_at,
               au.email AS sender_email
        FROM public.shared_assets sa
        JOIN public.quizzes_mindmaps qm ON qm.id = sa.asset_id
        JOIN auth.users au ON au.id = sa.sender_id
        WHERE sa.recipient_id = $1 AND sa.asset_type = 'quiz'
        ORDER BY sa.created_at DESC
      `;
    } else if (assetType === 'tool') {
      query = `
        SELECT sa.id AS share_id, sa.created_at AS shared_at,
               pt.id, pt.title, pt.description, pt.tool_type, pt.generated_tool,
               au.email AS sender_email
        FROM public.shared_assets sa
        JOIN public.playground_marketplace_tools pt ON pt.id = sa.asset_id
        JOIN auth.users au ON au.id = sa.sender_id
        WHERE sa.recipient_id = $1 AND sa.asset_type = 'tool'
        ORDER BY sa.created_at DESC
      `;
    } else {
      throw new Error(`Invalid asset type: ${assetType}`);
    }

    const result = await client.query(query, [recipientId]);
    return result.rows;
  } finally {
    client.release();
  }
}
