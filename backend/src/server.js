
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import questionRoutes from './routes/questionRoutes.js';
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
app.use(express.json());

// ROUTES
app.use('/api', questionRoutes);


app.listen(PORT, '0.0.0.0', () =>
  console.log(`Server running on http://localhost:${PORT}`)
);