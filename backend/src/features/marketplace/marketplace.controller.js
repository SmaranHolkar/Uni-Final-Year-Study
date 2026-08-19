import pool from '../../shared/config/dbPool.js';
import { shareAsset, getSharedAssetsWithMe } from '../shared/services/assetSharing.service.js';

const MAX_TITLE_LEN = 180;
const MAX_DESC_LEN = 500;
const MAX_PROMPT_LEN = 1000;
const MAX_TAGS = 12;
const MAX_TAG_LEN = 32;

const marketplaceEventClients = new Set();

function broadcastMarketplaceEvent(type, payload = {}) {
  const data = JSON.stringify({ type, ...payload, ts: Date.now() });
  const message = `event: ${type}\ndata: ${data}\n\n`;

  for (const client of marketplaceEventClients) {
    try {
      client.write(message);
    } catch {
      marketplaceEventClients.delete(client);
    }
  }
}

export function streamMarketplaceEvents(req, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');

  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  res.write(`event: connected\ndata: ${JSON.stringify({ ok: true, ts: Date.now() })}\n\n`);

  const pingTimer = setInterval(() => {
    if (!res.writableEnded) {
      res.write(`event: ping\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);
    }
  }, 25000);

  marketplaceEventClients.add(res);

  req.on('close', () => {
    clearInterval(pingTimer);
    marketplaceEventClients.delete(res);
  });
}

function normalizeTags(rawTags) {
  if (!Array.isArray(rawTags)) return [];

  const unique = new Set();
  for (const tag of rawTags) {
    const safe = String(tag || '').trim().toLowerCase().slice(0, MAX_TAG_LEN);
    if (!safe) continue;
    unique.add(safe);
    if (unique.size >= MAX_TAGS) break;
  }
  return Array.from(unique);
}

function sanitizeToolPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }
  return payload;
}

/* ── GET /api/marketplace/tools/public ──────────────────────────────────── */
export async function getPublicTools(req, res) {
  try {
    const userId = req.user?.id;
    const { limit = 50, category, search } = req.query;

    let query = `
      SELECT
        t.id, t.owner_user_id, t.title, t.description, t.tool_type, t.category, t.tags,
        t.generated_tool,
        t.fork_count, t.forked_from_tool_id, t.latest_prompt, t.created_at, t.updated_at,
        COALESCE(v.vote_score, 0) AS vote_score,
        COALESCE(v.upvote_count, 0) AS upvote_count,
        COALESCE(v.downvote_count, 0) AS downvote_count,
        COALESCE(my_vote.my_vote, 0) AS my_vote
      FROM public.playground_marketplace_tools t
      LEFT JOIN (
        SELECT
          tool_id,
          COALESCE(SUM(vote_value), 0)::int AS vote_score,
          COUNT(*) FILTER (WHERE vote_value = 1) AS upvote_count,
          COUNT(*) FILTER (WHERE vote_value = -1) AS downvote_count
        FROM public.playground_tool_votes
        GROUP BY tool_id
      ) v ON v.tool_id = t.id
      LEFT JOIN (
        SELECT tool_id, vote_value AS my_vote
        FROM public.playground_tool_votes
        WHERE user_id = $1
      ) my_vote ON my_vote.tool_id = t.id
      WHERE t.is_published = true AND t.visibility = 'public'
    `;
    const params = [userId];

    if (category) {
      params.push(category);
      query += ` AND t.category = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (t.title ILIKE $${params.length} OR t.description ILIKE $${params.length})`;
    }

    params.push(Math.min(parseInt(limit, 10) || 50, 200));
    query += ` ORDER BY t.created_at DESC LIMIT $${params.length}`;

    let rows = [];
    try {
      const result = await pool.query(query, params);
      rows = result.rows;
    } catch (queryErr) {
      // If votes migration has not been applied yet, still return marketplace tools.
      if (queryErr?.code === '42P01' && String(queryErr?.message || '').includes('playground_tool_votes')) {
        let fallbackQuery = `
          SELECT
            t.id, t.owner_user_id, t.title, t.description, t.tool_type, t.category, t.tags,
            t.generated_tool,
            t.fork_count, t.forked_from_tool_id, t.latest_prompt, t.created_at, t.updated_at,
            0::int AS vote_score,
            0::int AS upvote_count,
            0::int AS downvote_count,
            0::int AS my_vote
          FROM public.playground_marketplace_tools t
          WHERE t.is_published = true AND t.visibility = 'public'
        `;

        const fallbackParams = [];

        if (category) {
          fallbackParams.push(category);
          fallbackQuery += ` AND t.category = $${fallbackParams.length}`;
        }
        if (search) {
          fallbackParams.push(`%${search}%`);
          fallbackQuery += ` AND (t.title ILIKE $${fallbackParams.length} OR t.description ILIKE $${fallbackParams.length})`;
        }

        fallbackParams.push(Math.min(parseInt(limit, 10) || 50, 200));
        fallbackQuery += ` ORDER BY t.created_at DESC LIMIT $${fallbackParams.length}`;

        const fallbackResult = await pool.query(fallbackQuery, fallbackParams);
        rows = fallbackResult.rows;
      } else {
        throw queryErr;
      }
    }

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getPublicTools error:', err);
    res.status(500).json({ error: 'Failed to load marketplace tools' });
  }
}

/* ── GET /api/marketplace/tools/saved ───────────────────────────────────── */
export async function getSavedTools(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorised' });

    const { rows } = await pool.query(
      `SELECT
         id, title, description, tool_type, category, tags,
         generated_tool, fork_count, forked_from_tool_id,
         is_published, visibility, latest_prompt, created_at, updated_at
       FROM public.playground_marketplace_tools
       WHERE owner_user_id = $1
       ORDER BY updated_at DESC`,
      [userId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getSavedTools error:', err);
    res.status(500).json({ error: 'Failed to load saved tools' });
  }
}

/* ── POST /api/marketplace/tools/vote ──────────────────────────────────────
   Vote on a published marketplace tool.
   Body: { tool_id, vote_value: 1 | -1 }
*/
export async function voteTool(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorised' });

    const { tool_id, vote_value } = req.body;
    const normalizedVote = Number(vote_value);

    if (!tool_id || ![1, -1].includes(normalizedVote)) {
      return res.status(400).json({ error: 'tool_id and vote_value (1 or -1) are required' });
    }

    const sourceToolResult = await pool.query(
      `SELECT owner_user_id, is_published, visibility
       FROM public.playground_marketplace_tools
       WHERE id = $1
       LIMIT 1`,
      [tool_id]
    );

    if (!sourceToolResult.rows.length) {
      return res.status(404).json({ error: 'Tool not found' });
    }

    const sourceTool = sourceToolResult.rows[0];
    if (!sourceTool.is_published || sourceTool.visibility !== 'public') {
      return res.status(403).json({ error: 'Only public published tools can be voted on' });
    }

    if (sourceTool.owner_user_id === userId) {
      return res.status(403).json({ error: 'You cannot vote on your own tool' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO public.playground_tool_votes (tool_id, user_id, vote_value)
         VALUES ($1, $2, $3)
         ON CONFLICT (tool_id, user_id)
         DO UPDATE SET vote_value = EXCLUDED.vote_value, updated_at = NOW()`,
        [tool_id, userId, normalizedVote]
      );

      const { rows } = await client.query(
        `SELECT
          COALESCE(SUM(vote_value), 0)::int AS vote_score,
          COUNT(*) FILTER (WHERE vote_value = 1) AS upvote_count,
          COUNT(*) FILTER (WHERE vote_value = -1) AS downvote_count,
          MAX(CASE WHEN user_id = $2 THEN vote_value END)::int AS my_vote
         FROM public.playground_tool_votes
         WHERE tool_id = $1`,
        [tool_id, userId]
      );

      await client.query('COMMIT');
      broadcastMarketplaceEvent('marketplace-updated', { reason: 'vote', tool_id });
      return res.json({ success: true, data: rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('voteTool error:', err);
    if (err?.code === '42P01' && String(err?.message || '').includes('playground_tool_votes')) {
      return res.status(503).json({ error: 'Voting is temporarily unavailable until vote migration is applied.' });
    }
    res.status(500).json({ error: err.message });
  }
}

/* ── POST /api/marketplace/tools/save ──────────────────────────────────────
   Saves (or forks) a tool to the user's private collection.
   Body: { title, description, tool_type, category, tags, generated_tool,
           latest_prompt, forked_from_tool_id?, visibility? }
*/
export async function saveTool(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorised' });

    const {
      title,
      description = '',
      tool_type,
      category = null,
      tags = [],
      generated_tool,
      latest_prompt = '',
      forked_from_tool_id = null,
      visibility = 'private',
    } = req.body;

    const safeTitle = String(title || '').trim().slice(0, MAX_TITLE_LEN);
    const safeDescription = String(description || '').trim().slice(0, MAX_DESC_LEN);
    const safeToolType = String(tool_type || '').trim().slice(0, 40);
    const safeCategory = category == null ? null : String(category).trim().slice(0, 80);
    const safePrompt = String(latest_prompt || '').trim().slice(0, MAX_PROMPT_LEN);
    const safeVisibility = String(visibility || 'private').trim();
    const safeTags = normalizeTags(tags);
    const safeGeneratedTool = sanitizeToolPayload(generated_tool);

    if (!safeTitle || !safeToolType || !safeGeneratedTool) {
      return res.status(400).json({ error: 'title, tool_type and generated_tool are required' });
    }

    if (!['private', 'shared-link', 'public'].includes(safeVisibility)) {
      return res.status(400).json({ error: 'visibility must be private, shared-link, or public' });
    }

    const isFork = !!forked_from_tool_id;
    if (!isFork && safeVisibility !== 'private') {
      return res.status(400).json({ error: 'New tools must be saved as private first and then published explicitly' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Block duplicate tools for the same owner (exact tool payload match).
      const duplicateTool = await client.query(
        `SELECT id, title
         FROM public.playground_marketplace_tools
         WHERE owner_user_id = $1 AND generated_tool = $2::jsonb
         LIMIT 1`,
        [userId, JSON.stringify(safeGeneratedTool)]
      );

      if (duplicateTool.rows.length) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: 'You already saved this tool.',
          duplicate_tool_id: duplicateTool.rows[0].id,
          duplicate_title: duplicateTool.rows[0].title,
        });
      }

      if (isFork) {
        const sourceResult = await client.query(
          `SELECT id, owner_user_id, is_published, visibility
           FROM public.playground_marketplace_tools
           WHERE id = $1
           LIMIT 1`,
          [forked_from_tool_id]
        );

        if (!sourceResult.rows.length) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: 'Source tool not found for forking' });
        }

        const sourceTool = sourceResult.rows[0];
        if (sourceTool.owner_user_id === userId) {
          await client.query('ROLLBACK');
          return res.status(403).json({ error: 'You cannot fork your own tool' });
        }

        if (!sourceTool.is_published || sourceTool.visibility !== 'public') {
          await client.query('ROLLBACK');
          return res.status(403).json({ error: 'Only public published tools can be forked' });
        }

        const existingFork = await client.query(
          `SELECT id
           FROM public.playground_marketplace_tools
           WHERE owner_user_id = $1 AND forked_from_tool_id = $2
           LIMIT 1`,
          [userId, forked_from_tool_id]
        );

        if (existingFork.rows.length) {
          await client.query('ROLLBACK');
          return res.status(409).json({
            error: 'You already forked this tool.',
            duplicate_tool_id: existingFork.rows[0].id,
          });
        }
      }

      const { rows } = await client.query(
        `INSERT INTO public.playground_marketplace_tools
           (owner_user_id, title, description, tool_type, category, tags,
            generated_tool, latest_prompt, forked_from_tool_id,
            visibility, is_published)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,$9,$10, false)
         RETURNING id, title, tool_type, created_at`,
        [
          userId, safeTitle, safeDescription, safeToolType, safeCategory,
          JSON.stringify(safeTags), JSON.stringify(safeGeneratedTool),
          safePrompt, forked_from_tool_id || null, safeVisibility,
        ]
      );

      // Increment fork_count on the original tool
      if (forked_from_tool_id) {
        await client.query(
          `UPDATE public.playground_marketplace_tools
           SET fork_count = fork_count + 1, last_forked_at = NOW()
           WHERE id = $1`,
          [forked_from_tool_id]
        );
      }

      await client.query('COMMIT');
      broadcastMarketplaceEvent('marketplace-updated', {
        reason: forked_from_tool_id ? 'fork' : 'save',
        tool_id: rows[0]?.id,
      });
      res.status(201).json({ success: true, tool: rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('saveTool error:', err);
    res.status(500).json({ error: err.message });
  }
}

/* ── POST /api/marketplace/tools/publish ───────────────────────────────────
   Toggles a tool between private and public in the marketplace.
   Body: { tool_id, publish: true|false }
*/
export async function publishTool(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorised' });

    const { tool_id, publish = true, title, description, tags } = req.body;
    if (!tool_id) return res.status(400).json({ error: 'tool_id is required' });

    const hasTitleUpdate = title !== undefined;
    const hasDescriptionUpdate = description !== undefined;
    const hasTagsUpdate = tags !== undefined;

    const safeTitle = hasTitleUpdate ? String(title || '').trim().slice(0, MAX_TITLE_LEN) : null;
    const safeDescription = hasDescriptionUpdate ? String(description || '').trim().slice(0, MAX_DESC_LEN) : null;
    let safeTags = null;

    if (hasTitleUpdate && !safeTitle) {
      return res.status(400).json({ error: 'title cannot be empty' });
    }

    if (hasTagsUpdate) {
      if (!Array.isArray(tags)) {
        return res.status(400).json({ error: 'tags must be an array of strings' });
      }
      safeTags = normalizeTags(tags);
    }

    const { rows } = await pool.query(
      `UPDATE public.playground_marketplace_tools
       SET is_published = $1,
           visibility   = $2,
           title        = COALESCE($5, title),
           description  = COALESCE($6, description),
           tags         = COALESCE($7::jsonb, tags),
           updated_at   = NOW()
       WHERE id = $3 AND owner_user_id = $4
       RETURNING id, title, description, tags, is_published, visibility`,
      [
        publish,
        publish ? 'public' : 'private',
        tool_id,
        userId,
        hasTitleUpdate ? safeTitle : null,
        hasDescriptionUpdate ? safeDescription : null,
        hasTagsUpdate ? JSON.stringify(safeTags) : null,
      ]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Tool not found or not owned by you' });
    }

    broadcastMarketplaceEvent('marketplace-updated', {
      reason: publish ? 'publish' : 'unpublish',
      tool_id,
    });

    res.json({ success: true, tool: rows[0] });
  } catch (err) {
    console.error('publishTool error:', err);
    res.status(500).json({ error: err.message });
  }
}

/* ── DELETE /api/marketplace/tools/:id ─────────────────────────────────── */
export async function deleteTool(req, res) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const { rowCount } = await pool.query(
      `DELETE FROM public.playground_marketplace_tools
       WHERE id = $1 AND owner_user_id = $2`,
      [id, userId]
    );

    if (!rowCount) return res.status(404).json({ error: 'Tool not found or not owned by you' });

    broadcastMarketplaceEvent('marketplace-updated', { reason: 'delete', tool_id: id });

    res.json({ success: true });
  } catch (err) {
    console.error('deleteTool error:', err);
    res.status(500).json({ error: err.message });
  }
}

/* ── POST /api/marketplace/tools/share-to-user ────────────────────────── */
export async function shareToolToUser(req, res) {
  try {
    const senderId = req.user?.id;
    const { tool_id, recipient_email } = req.body;

    if (!tool_id || !recipient_email) {
      return res.status(400).json({ error: 'tool_id and recipient_email are required' });
    }

    const result = await shareAsset({
      senderId,
      recipientEmail: recipient_email,
      assetId: tool_id,
      assetType: 'tool'
    });

    res.json({ success: true, message: `Tool shared with ${recipient_email}` });
  } catch (err) {
    console.error('shareToolToUser error:', err);
    const code = err.code || 'INTERNAL_ERROR';
    const status = {
      'USER_NOT_FOUND': 44,
      'SELF_SHARE': 400,
      'NOT_OWNER': 403
    }[code] || 500;
    res.status(status).json({ error: err.message });
  }
}

/* ── GET /api/marketplace/tools/shared-with-me ────────────────────────── */
export async function getSharedToolsWithMe(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorised' });

    const tools = await getSharedAssetsWithMe(userId, 'tool');
    res.json({ success: true, data: tools });
  } catch (err) {
    console.error('getSharedToolsWithMe error:', err);
    res.status(500).json({ error: err.message });
  }
}
