import pool from '../../shared/config/dbPool.js';

/**
 * GET /api/canvas/notes
 * Fetches all canvas notes/pins for the authenticated user, optionally filtered by sessionId.
 */
export async function getCanvasNotes(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { sessionId } = req.query;
    let query = `
      SELECT id, user_id, session_id, type, title, content, items, color,
             position_x, position_y, width, height, is_pinned,
             created_at, updated_at
      FROM public.canvas_notes
      WHERE user_id = $1
    `;
    const params = [userId];

    if (sessionId) {
      query += ` AND (session_id = $2 OR session_id IS NULL)`;
      params.push(sessionId);
    }

    query += ` ORDER BY updated_at DESC`;

    const { rows } = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[CANVAS GET NOTES ERROR]:', err);
    res.status(500).json({ error: 'Failed to fetch canvas notes' });
  }
}

/**
 * POST /api/canvas/notes
 * Creates a new canvas note, pin, or checklist item.
 */
export async function createCanvasNote(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      id, // Client may generate UUID or let DB generate
      sessionId = null,
      type = 'sticky',
      title = '',
      content = '',
      items = [],
      color = 'yellow',
      positionX = 100,
      positionY = 100,
      width = 260,
      height = 220,
      isPinned = false,
    } = req.body;

    let query;
    let params;

    if (id) {
      query = `
        INSERT INTO public.canvas_notes (
          id, user_id, session_id, type, title, content, items, color,
          position_x, position_y, width, height, is_pinned, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          content = EXCLUDED.content,
          items = EXCLUDED.items,
          color = EXCLUDED.color,
          position_x = EXCLUDED.position_x,
          position_y = EXCLUDED.position_y,
          width = EXCLUDED.width,
          height = EXCLUDED.height,
          is_pinned = EXCLUDED.is_pinned,
          session_id = EXCLUDED.session_id,
          updated_at = NOW()
        RETURNING *;
      `;
      params = [
        id, userId, sessionId, type, title, content, JSON.stringify(items),
        color, Number(positionX) || 100, Number(positionY) || 100,
        Number(width) || 260, Number(height) || 220, Boolean(isPinned)
      ];
    } else {
      query = `
        INSERT INTO public.canvas_notes (
          user_id, session_id, type, title, content, items, color,
          position_x, position_y, width, height, is_pinned, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        RETURNING *;
      `;
      params = [
        userId, sessionId, type, title, content, JSON.stringify(items),
        color, Number(positionX) || 100, Number(positionY) || 100,
        Number(width) || 260, Number(height) || 220, Boolean(isPinned)
      ];
    }

    const { rows } = await pool.query(query, params);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[CANVAS CREATE NOTE ERROR]:', err);
    res.status(500).json({ error: 'Failed to create canvas note' });
  }
}

/**
 * PUT /api/canvas/notes/:id
 * Updates an existing canvas note / pin.
 */
export async function updateCanvasNote(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const {
      title,
      content,
      items,
      color,
      positionX,
      positionY,
      width,
      height,
      isPinned,
      sessionId
    } = req.body;

    const query = `
      UPDATE public.canvas_notes
      SET
        title = COALESCE($1, title),
        content = COALESCE($2, content),
        items = CASE WHEN $3::jsonb IS NOT NULL THEN $3::jsonb ELSE items END,
        color = COALESCE($4, color),
        position_x = COALESCE($5, position_x),
        position_y = COALESCE($6, position_y),
        width = COALESCE($7, width),
        height = COALESCE($8, height),
        is_pinned = COALESCE($9, is_pinned),
        session_id = COALESCE($10, session_id),
        updated_at = NOW()
      WHERE id = $11 AND user_id = $12
      RETURNING *;
    `;

    const params = [
      title !== undefined ? title : null,
      content !== undefined ? content : null,
      items !== undefined ? JSON.stringify(items) : null,
      color !== undefined ? color : null,
      positionX !== undefined ? Number(positionX) : null,
      positionY !== undefined ? Number(positionY) : null,
      width !== undefined ? Number(width) : null,
      height !== undefined ? Number(height) : null,
      isPinned !== undefined ? Boolean(isPinned) : null,
      sessionId !== undefined ? sessionId : null,
      id,
      userId
    ];

    const { rows } = await pool.query(query, params);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Note not found or unauthorized' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[CANVAS UPDATE NOTE ERROR]:', err);
    res.status(500).json({ error: 'Failed to update canvas note' });
  }
}

/**
 * DELETE /api/canvas/notes/:id
 * Deletes a canvas note.
 */
export async function deleteCanvasNote(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { rowCount } = await pool.query(
      'DELETE FROM public.canvas_notes WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Note not found or unauthorized' });
    }

    res.json({ success: true, message: 'Note deleted successfully' });
  } catch (err) {
    console.error('[CANVAS DELETE NOTE ERROR]:', err);
    res.status(500).json({ error: 'Failed to delete canvas note' });
  }
}
