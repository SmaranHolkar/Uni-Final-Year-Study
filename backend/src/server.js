
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

// Shared middleware
import requireAuth from './shared/middleware/requireAuth.js';

const app = express();
const PORT = process.env.PORT || 5000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/*  MIDDLEWARE */

const allowedOrigins = [
  'https://uni-final-year-study.onrender.com',  // Production frontend
  'https://hydruslearn.com*',
  'http://localhost:5173',  // Local Vite dev server
  'http://localhost:3000'   // Alternative dev port
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  exposedHeaders: ['Authorization'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Memory optimization: Limit request body size
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// ROUTES — each feature mounts its own router
app.use('/api/auth', authRouter);
app.use('/api', documentRouter);
app.use('/api', marketplaceRouter);
app.use('/api', questionRouter);
app.use('/api', quizRouter);
app.use('/api', topicRouter);

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
