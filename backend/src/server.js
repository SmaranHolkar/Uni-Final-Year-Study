
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Feature routers
import authRouter from './features/auth/auth.routes.js';
import documentRouter from './features/documents/document.routes.js';
import questionRouter from './features/questions/question.routes.js';
import quizRouter from './features/quiz/quiz.routes.js';
import topicRouter from './features/topics/topic.routes.js';
import marketplaceRouter from './features/marketplace/marketplace.routes.js';
import groundedRouter from './features/ai/grounded.routes.js';
import multimodalRouter from './features/ai/multimodal.routes.js';

// Shared middleware
import requireAuth from './shared/middleware/requireAuth.js';
import securityHeaders from './shared/middleware/securityHeaders.js';
import { globalApiLimiter, authBruteForceLimiter, aiGenerationLimiter } from './shared/middleware/rateLimiter.js';

import pool from './shared/config/dbPool.js';


// Auto-verify and run lightweight database migrations
async function runAutoMigrations() {
  try {
    const client = await pool.connect();
    try {
      await client.query(`
        DO $$ 
        BEGIN
            IF NOT EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'w_embeddings' 
                AND column_name = 'paragraph_index'
            ) THEN
                ALTER TABLE public.w_embeddings ADD COLUMN paragraph_index INT DEFAULT 1;
            END IF;
            IF NOT EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'w_embeddings' 
                AND column_name = 'page_number'
            ) THEN
                ALTER TABLE public.w_embeddings ADD COLUMN page_number INT DEFAULT 1;
            END IF;
        END $$;
      `);
      console.log('[DB MIGRATIONS] w_embeddings paragraph & page metadata verified');
    } finally {
      client.release();
    }
  } catch (err) {
    console.warn('[DB MIGRATION NOTICE]:', err.message);
  }
}
runAutoMigrations();

const app = express();
app.disable('x-powered-by'); // prevent tech-stack fingerprinting
const PORT = process.env.PORT || 5000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/*  MIDDLEWARE */

const allowedOrigins = [
  'https://uni-final-year-study.onrender.com',
  'https://uni-final-year-study-is6r.onrender.com',
  'https://hydruslearn.com',
  'https://www.hydruslearn.com',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000'
];

const envAllowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    // Check explicit whitelist
    if (allowedOrigins.includes(origin) || envAllowed.includes(origin)) {
      return callback(null, true);
    }

    // Allow all onrender.com subdomains for frontend and preview deployments
    if (origin.endsWith('.onrender.com')) {
      return callback(null, true);
    }

    // Allow local development on localhost/127.0.0.1
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }

    console.warn(`[CORS] Blocked unauthorized origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  exposedHeaders: ['Authorization'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

/* SECURITY HEADERS — applied to every response */
app.use(securityHeaders);

// GLOBAL API RATE LIMITING (Layer 7 DoS Protection)
app.use('/api', globalApiLimiter);

// Strict body payload ceilings (10 MB prevents buffer/memory exhaustion attacks)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ROUTES — each feature mounts its own router with dedicated rate limits where applicable
app.use('/api/auth', authBruteForceLimiter, authRouter);
app.use('/api/chat-tools', aiGenerationLimiter);
app.use('/api', documentRouter);
app.use('/api', marketplaceRouter);
app.use('/api', questionRouter);
app.use('/api', quizRouter);
app.use('/api', topicRouter);
app.use('/api', groundedRouter);
app.use('/api', multimodalRouter);

// Health check endpoint for Render
app.get('/api/health', (req, res) => {
  const memoryUsage = process.memoryUsage();
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    memory: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
    }
  });
});

// Test endpoint to verify auth is working
app.get('/api/test-auth', requireAuth, (req, res) => {
  res.json({
    success: true,
    message: 'Authentication working!',
    user: {
      id: req.user.id,
      email: req.user.email
    }
  });
});

// Centralized Safe Error Handling Middleware (Prevents Stack Trace & Schema Leaks)
app.use((err, req, res, next) => {
  console.error('[UNHANDLED ERROR]:', err?.message || err);
  if (res.headersSent) {
    return next(err);
  }
  const isDev = process.env.NODE_ENV === 'development';
  return res.status(err.status || 500).json({
    success: false,
    error: isDev ? (err.message || 'Internal Server Error') : 'An unexpected server error occurred. Please try again later.'
  });
});


// Memory optimization: Force garbage collection periodically
if (global.gc) {
  setInterval(() => {
    global.gc();
  }, 60000); // Every minute
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`SUPABASE_URL set: ${!!process.env.SUPABASE_URL}`);
  console.log(`SUPABASE_ANON_KEY set: ${!!process.env.SUPABASE_ANON_KEY}`);
  console.log(`SUPABASE_SERVICE_ROLE_KEY set: ${!!process.env.SUPABASE_SERVICE_ROLE_KEY}`);
});

