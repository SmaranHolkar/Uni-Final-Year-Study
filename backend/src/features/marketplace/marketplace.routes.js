import express from 'express';
import requireAuth, { optionalAuth } from '../../shared/middleware/requireAuth.js';
import {
  getPublicTools,
  getSavedTools,
  saveTool,
  voteTool,
  streamMarketplaceEvents,
  publishTool,
  deleteTool,
  shareToolToUser,
  getSharedToolsWithMe,
  getToolById,
} from './marketplace.controller.js';


const router = express.Router();

// Lightweight in-memory limiter for marketplace write endpoints.
// Keyed by authenticated user when available, with IP fallback.
const marketplaceRateBuckets = new Map();

function createMarketplaceRateLimiter({ bucket, windowMs, max, message }) {
  return (req, res, next) => {
    const actorKey = req.user?.id || req.ip || 'anonymous';
    const key = `${bucket}:${actorKey}`;
    const now = Date.now();

    const existing = marketplaceRateBuckets.get(key) || [];
    const recent = existing.filter((timestamp) => now - timestamp < windowMs);

    if (recent.length >= max) {
      const retryAfterSeconds = Math.ceil((windowMs - (now - recent[0])) / 1000);
      res.setHeader('Retry-After', String(Math.max(retryAfterSeconds, 1)));
      return res.status(429).json({ error: message });
    }

    recent.push(now);
    marketplaceRateBuckets.set(key, recent);

    // Prune expired entries to prevent unbounded Map growth
    if (marketplaceRateBuckets.size > 10000) {
      for (const [k, timestamps] of marketplaceRateBuckets) {
        if (timestamps.every(ts => now - ts >= windowMs)) {
          marketplaceRateBuckets.delete(k);
        }
      }
    }

    return next();
  };
}

const saveForkLimiter = createMarketplaceRateLimiter({
  bucket: 'save-fork',
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: 'Too many save/fork requests. Please wait a few minutes and try again.',
});

const publishLimiter = createMarketplaceRateLimiter({
  bucket: 'publish',
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: 'Too many publish requests. Please wait a few minutes and try again.',
});

const voteLimiter = createMarketplaceRateLimiter({
  bucket: 'vote',
  windowMs: 5 * 60 * 1000,
  max: 80,
  message: 'Too many vote requests. Please wait before voting again.',
});

const deleteLimiter = createMarketplaceRateLimiter({
  bucket: 'delete',
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: 'Too many delete requests. Please wait a few minutes and try again.',
});

// Public marketplace listing (allows read access to public tools)
router.get('/marketplace/tools/public', optionalAuth, getPublicTools);

// Get single tool by ID (for direct sharing and loading)
router.get('/marketplace/tools/:id', optionalAuth, getToolById);


// Live marketplace updates stream
router.get('/marketplace/tools/stream', requireAuth, streamMarketplaceEvents);

// User's saved/created tools
router.get('/marketplace/tools/saved', requireAuth, getSavedTools);

// Save or fork a tool into the user's collection
router.post('/marketplace/tools/save', requireAuth, saveForkLimiter, saveTool);

// Vote on a public tool
router.post('/marketplace/tools/vote', requireAuth, voteLimiter, voteTool);

// Publish (or un-publish) a tool to the public marketplace
router.post('/marketplace/tools/publish', requireAuth, publishLimiter, publishTool);

// Delete a tool from the user's collection
router.delete('/marketplace/tools/:id', requireAuth, deleteLimiter, deleteTool);

// Share a tool to another user via email
router.post('/marketplace/tools/share-to-user', requireAuth, shareToolToUser);

// Get tools shared with the current user
router.get('/marketplace/tools/shared-with-me', requireAuth, getSharedToolsWithMe);

export default router;
