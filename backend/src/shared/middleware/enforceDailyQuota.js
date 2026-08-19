import { consumeDailyQuota } from '../services/tier.service.js';

export default function enforceDailyQuota(actionType) {
  return async function quotaMiddleware(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const result = await consumeDailyQuota(userId, actionType);

      if (!result.allowed) {
        return res.status(429).json({
          error: 'Daily free-tier limit reached',
          errorCode: 'FREE_TIER_LIMIT_REACHED',
          actionType,
          remaining: result.remaining,
          used: result.used,
          limit: result.limit,
        });
      }

      req.freeTierQuota = result;
      return next();
    } catch (err) {
      console.error('Quota middleware error:', err);
      return res.status(500).json({ error: 'Failed to apply tier limits' });
    }
  };
}
