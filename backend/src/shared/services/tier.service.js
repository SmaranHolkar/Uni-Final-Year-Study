import pool from '../config/dbPool.js';

const FREE_TIER_LIMITS = Object.freeze({
  learning_tool_generate: 99999,
  study_session_start: 99999,
});

const ACTION_TYPES = new Set(Object.keys(FREE_TIER_LIMITS));
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

function normalizeTopicKey(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 120);
}

function getCurrentWeekStartDateUtc(baseDate = new Date()) {
  const d = new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), baseDate.getUTCDate()));
  const day = d.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diffToMonday);
  return d.toISOString().slice(0, 10);
}

function getConsecutiveWeekStarts(weekStartDate, count) {
  const start = new Date(`${weekStartDate}T00:00:00.000Z`);
  const out = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() - i * 7);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

async function ensureTierRowLocked(client, userId) {
  try {
    await client.query(
      `INSERT INTO public.user_tier_state (user_id, tier_name)
       VALUES ($1, 'free')
       ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    );
  } catch (err) {
    // FK constraint or DB error handled gracefully
  }

  try {
    const { rows } = await client.query(
      `SELECT user_id, tier_name, unlimited_until
       FROM public.user_tier_state
       WHERE user_id = $1
       FOR UPDATE`,
      [userId]
    );
    return rows[0] || { user_id: userId, tier_name: 'free', unlimited_until: null };
  } catch {
    return { user_id: userId, tier_name: 'free', unlimited_until: null };
  }
}

export async function consumeDailyQuota(userId, actionType) {
  if (!userId) throw new Error('userId is required');
  if (!ACTION_TYPES.has(actionType)) {
    throw new Error('Unsupported action type');
  }

  const limit = FREE_TIER_LIMITS[actionType];
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const tier = await ensureTierRowLocked(client, userId);
    const unlimitedUntil = tier?.unlimited_until ? new Date(tier.unlimited_until) : null;
    const isUnlimited = !!(unlimitedUntil && unlimitedUntil > new Date());

    if (isUnlimited) {
      await client.query('COMMIT');
      return {
        allowed: true,
        actionType,
        tier: 'free',
        isUnlimited: true,
        unlimitedUntil: unlimitedUntil?.toISOString() || null,
        used: null,
        limit: null,
        remaining: null,
      };
    }

    try {
      await client.query(
        `INSERT INTO public.daily_usage_counters (user_id, usage_date, action_type, used_count, limit_count)
         VALUES ($1, CURRENT_DATE, $2, 0, $3)
         ON CONFLICT (user_id, usage_date, action_type) DO NOTHING`,
        [userId, actionType, limit]
      );

      const { rows } = await client.query(
        `SELECT id, used_count, limit_count
         FROM public.daily_usage_counters
         WHERE user_id = $1 AND usage_date = CURRENT_DATE AND action_type = $2
         FOR UPDATE`,
        [userId, actionType]
      );

      const counter = rows[0];
      if (counter) {
        const used = Number(counter.used_count || 0);
        const limitCount = Number(counter.limit_count || limit);

        if (used >= limitCount) {
          await client.query('COMMIT');
          return {
            allowed: false,
            actionType,
            tier: 'free',
            isUnlimited: false,
            unlimitedUntil: null,
            used,
            limit: limitCount,
            remaining: 0,
          };
        }

        const { rows: updatedRows } = await client.query(
          `UPDATE public.daily_usage_counters
           SET used_count = used_count + 1, updated_at = NOW()
           WHERE id = $1
           RETURNING used_count, limit_count`,
          [counter.id]
        );

        const updated = updatedRows[0];
        const newUsed = Number(updated.used_count || 0);
        const newLimit = Number(updated.limit_count || limit);

        await client.query('COMMIT');
        return {
          allowed: true,
          actionType,
          tier: 'free',
          isUnlimited: false,
          unlimitedUntil: null,
          used: newUsed,
          limit: newLimit,
          remaining: Math.max(newLimit - newUsed, 0),
        };
      }
    } catch (counterErr) {
      console.warn('Daily usage counter update skipped due to DB constraint:', counterErr.message);
    }

    await client.query('COMMIT');
    return {
      allowed: true,
      actionType,
      tier: 'free',
      isUnlimited: true,
      unlimitedUntil: null,
      used: 0,
      limit,
      remaining: limit,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    // Return allowed: true fallback on DB constraint error so tool generation is never blocked
    return {
      allowed: true,
      actionType,
      tier: 'free',
      isUnlimited: true,
      unlimitedUntil: null,
      used: 0,
      limit,
      remaining: limit,
    };
  } finally {
    client.release();
  }
}

export async function getTierStatusForUser(userId) {
  if (!userId) throw new Error('userId is required');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tier = await ensureTierRowLocked(client, userId);

    const { rows } = await client.query(
      `SELECT action_type, used_count, limit_count
       FROM public.daily_usage_counters
       WHERE user_id = $1 AND usage_date = CURRENT_DATE`,
      [userId]
    );

    await client.query('COMMIT');

    const map = new Map(rows.map((r) => [r.action_type, r]));
    const quotas = Object.entries(FREE_TIER_LIMITS).map(([actionType, limit]) => {
      const row = map.get(actionType);
      const used = Number(row?.used_count || 0);
      return {
        actionType,
        used,
        limit,
        remaining: Math.max(limit - used, 0),
      };
    });

    const unlimitedUntil = tier?.unlimited_until ? new Date(tier.unlimited_until) : null;
    const isUnlimited = !!(unlimitedUntil && unlimitedUntil > new Date());

    return {
      tier: 'free',
      isUnlimited,
      unlimitedUntil: unlimitedUntil?.toISOString() || null,
      quotas,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

function extractWeakTopics(quizResults) {
  if (!Array.isArray(quizResults)) return [];

  const seen = new Set();
  const weak = [];

  for (const item of quizResults) {
    if (item?.isCorrect) continue;
    const label = String(item?.prompt || '').trim().slice(0, 160);
    const key = normalizeTopicKey(label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    weak.push({ key, label: label || 'Weak topic' });
    if (weak.length >= 12) break;
  }

  return weak;
}

export async function recordQuizOutcome(userId, { quizId, title, quizResults }) {
  if (!userId) throw new Error('userId is required');

  const total = Array.isArray(quizResults) ? quizResults.length : 0;
  const correct = Array.isArray(quizResults)
    ? quizResults.filter((q) => q?.isCorrect === true).length
    : 0;
  const scorePercentage = total > 0 ? Math.round((correct / total) * 100) : 0;
  const perfectScore = total > 0 && scorePercentage === 100;
  const topicLabel = String(title || 'Unknown Topic').trim().slice(0, 160) || 'Unknown Topic';
  const topicKey = normalizeTopicKey(topicLabel);
  const weekStart = getCurrentWeekStartDateUtc();
  const weakTopics = extractWeakTopics(quizResults);

  const result = {
    scorePercentage,
    perfectScore,
    masteryCredited: false,
    rewardUnlocked: false,
    unlimitedUntil: null,
  };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await ensureTierRowLocked(client, userId);

    for (const weak of weakTopics) {
      await client.query(
        `INSERT INTO public.spaced_repetition_queue
          (user_id, topic_key, topic_label, source_quiz_id, last_score_percentage, next_review_at, created_at, updated_at)
         VALUES
          ($1, $2, $3, $4, $5, NOW() + INTERVAL '3 days', NOW(), NOW())
         ON CONFLICT (user_id, topic_key)
         DO UPDATE SET
           topic_label = EXCLUDED.topic_label,
           source_quiz_id = EXCLUDED.source_quiz_id,
           last_score_percentage = EXCLUDED.last_score_percentage,
           next_review_at = LEAST(public.spaced_repetition_queue.next_review_at, NOW() + INTERVAL '3 days'),
           updated_at = NOW()`,
        [userId, weak.key, weak.label, quizId || null, scorePercentage]
      );
    }

    if (perfectScore && topicKey) {
      const masteryInsert = await client.query(
        `INSERT INTO public.mastery_events
          (user_id, topic_key, topic_label, score_percentage, quiz_id, week_start_date, achieved_at)
         VALUES
          ($1, $2, $3, 100, $4, $5::date, NOW())
         ON CONFLICT (user_id, topic_key, week_start_date) DO NOTHING
         RETURNING id`,
        [userId, topicKey, topicLabel, quizId || null, weekStart]
      );

      if (masteryInsert.rowCount > 0) {
        result.masteryCredited = true;

        await client.query(
          `INSERT INTO public.weekly_mastery_progress
            (user_id, week_start_date, mastered_topics_count, created_at, updated_at)
           VALUES ($1, $2::date, 1, NOW(), NOW())
           ON CONFLICT (user_id, week_start_date)
           DO UPDATE SET
             mastered_topics_count = public.weekly_mastery_progress.mastered_topics_count + 1,
             updated_at = NOW()`,
          [userId, weekStart]
        );

        const requiredWeeks = getConsecutiveWeekStarts(weekStart, 4);
        const weekly = await client.query(
          `SELECT week_start_date, mastered_topics_count
           FROM public.weekly_mastery_progress
           WHERE user_id = $1 AND week_start_date = ANY($2::date[])`,
          [userId, requiredWeeks]
        );

        const weeklyMap = new Map(
          weekly.rows.map((row) => [
            new Date(row.week_start_date).toISOString().slice(0, 10),
            Number(row.mastered_topics_count || 0),
          ])
        );

        const qualified = requiredWeeks.every((d) => (weeklyMap.get(d) || 0) >= 3);

        if (qualified) {
          const rewardsThisYear = await client.query(
            `SELECT COUNT(*)::int AS count
             FROM public.reward_unlock_events
             WHERE user_id = $1
               AND EXTRACT(YEAR FROM reward_granted_at) = EXTRACT(YEAR FROM NOW())`,
            [userId]
          );

          const yearlyCount = Number(rewardsThisYear.rows[0]?.count || 0);
          if (yearlyCount < 6) {
            const unlockUpdate = await client.query(
              `UPDATE public.user_tier_state
               SET unlimited_until = GREATEST(COALESCE(unlimited_until, NOW()), NOW()) + INTERVAL '2 days',
                   updated_at = NOW()
               WHERE user_id = $1
               RETURNING unlimited_until`,
              [userId]
            );

            const newUnlimitedUntil = unlockUpdate.rows[0]?.unlimited_until;

            const rewardInsert = await client.query(
              `INSERT INTO public.reward_unlock_events
                (user_id, qualification_window_end, reward_granted_at, unlimited_until, reason, created_at)
               VALUES ($1, $2::date, NOW(), $3, 'mastery_4_weeks', NOW())
               ON CONFLICT (user_id, qualification_window_end) DO NOTHING
               RETURNING id`,
              [userId, weekStart, newUnlimitedUntil]
            );

            if (rewardInsert.rowCount > 0) {
              result.rewardUnlocked = true;
              result.unlimitedUntil = newUnlimitedUntil ? new Date(newUnlimitedUntil).toISOString() : null;
            }
          }
        }
      }
    }

    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getDueSpacedRepetition(userId, limit = 10) {
  if (!userId) throw new Error('userId is required');
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);

  const { rows } = await pool.query(
    `SELECT id, topic_key, topic_label, source_quiz_id, next_review_at, last_reviewed_at, last_score_percentage
     FROM public.spaced_repetition_queue
     WHERE user_id = $1 AND next_review_at <= NOW()
     ORDER BY next_review_at ASC
     LIMIT $2`,
    [userId, safeLimit]
  );

  return rows;
}

export async function markSpacedRepetitionReviewed(userId, queueId) {
  if (!userId) throw new Error('userId is required');
  if (!Number.isInteger(queueId) || queueId <= 0) throw new Error('queueId must be a positive integer');

  const { rows } = await pool.query(
    `UPDATE public.spaced_repetition_queue
     SET last_reviewed_at = NOW(),
         next_review_at = NOW() + INTERVAL '3 days',
         updated_at = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING id, topic_key, topic_label, next_review_at, last_reviewed_at`,
    [queueId, userId]
  );

  return rows[0] || null;
}
