/**
 * Resilient In-Memory Layer 7 Rate Limiter
 * Provides sliding-window rate limiting keyed by User ID or Client IP with automatic memory cleanup.
 */

const rateLimitBuckets = new Map();

// Periodic prune to prevent unbounded memory growth
setInterval(() => {
  const now = Date.now();
  for (const [bucketKey, timestamps] of rateLimitBuckets) {
    const valid = timestamps.filter((ts) => now - ts < 15 * 60 * 1000);
    if (valid.length === 0) {
      rateLimitBuckets.delete(bucketKey);
    } else {
      rateLimitBuckets.set(bucketKey, valid);
    }
  }
}, 60 * 1000);

export function createRateLimiter({
  windowMs = 60 * 1000,
  max = 100,
  message = 'Too many requests. Please slow down and try again.',
  bucket = 'global',
  keyGenerator = null,
}) {
  return (req, res, next) => {
    const clientKey = keyGenerator
      ? keyGenerator(req)
      : req.user?.id || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';

    const fullKey = `${bucket}:${clientKey}`;
    const now = Date.now();
    const existing = rateLimitBuckets.get(fullKey) || [];
    const recent = existing.filter((timestamp) => now - timestamp < windowMs);

    if (recent.length >= max) {
      const retryAfterSeconds = Math.ceil((windowMs - (now - recent[0])) / 1000);
      res.setHeader('Retry-After', String(Math.max(retryAfterSeconds, 1)));
      return res.status(429).json({
        error: message,
        retryAfter: Math.max(retryAfterSeconds, 1),
      });
    }

    recent.push(now);
    rateLimitBuckets.set(fullKey, recent);
    return next();
  };
}

// 1. Global API Protection: Max 300 requests / minute per IP
export const globalApiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 300,
  bucket: 'global-api',
  message: 'API rate limit exceeded. Please wait a moment before sending more requests.',
});

// 2. Auth & Login Brute Force Defense: Max 20 requests / 15 minutes per IP
export const authBruteForceLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  bucket: 'auth-login',
  message: 'Too many authentication attempts. Please wait 15 minutes before trying again.',
});

// 3. AI Learning Tool Generation Limiter: Max 30 generations / 5 minutes per user/IP
export const aiGenerationLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 30,
  bucket: 'ai-tool-gen',
  message: 'AI generation rate limit reached. Please wait a few minutes before generating more tools.',
});

// 4. File Upload & Ingest Limiter: Max 20 uploads / 10 minutes
export const fileUploadLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 20,
  bucket: 'file-upload',
  message: 'File upload rate limit reached. Please wait before uploading more documents.',
});
