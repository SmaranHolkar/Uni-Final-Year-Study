
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import questionRoutes from './routes/questionRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import authRoutes from './routes/auth.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

/*  MIDDLEWARE */


const allowedOrigins = [
  'https://uni-final-year-study.onrender.com',
  'http://localhost:5173'
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

// Memory optimization: Limit request body size
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ROUTES
app.use('/api', questionRoutes);
app.use('/api', documentRoutes);
app.use('/api/auth', authRoutes);

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

// Memory optimization: Force garbage collection periodically
if (global.gc) {
  setInterval(() => {
    global.gc();
  }, 60000); // Every minute
}

app.listen(PORT, '0.0.0.0', () =>
  console.log(`Server running on http://localhost:${PORT}`)
);