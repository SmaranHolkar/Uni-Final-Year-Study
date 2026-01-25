import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import pkg from 'pg';
import { pipeline } from '@huggingface/transformers';

const { Pool } = pkg;
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
/* ENV */

const GROQ_KEY = process.env.GROQ_API;
const DATABASE_URL = process.env.SUPABASE_URL;

if (!DATABASE_URL) {
  throw new Error(' SUPABASE_URL missing (must be pooler :6543)');
}

/* DB */

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl:{ rejectUnauthorized: false },
  max:5,
  connectionTimeoutMillis: 20000,     // 20 seconds to establish connection
  idleTimeoutMillis: 30000,           // 60 seconds before timing out idle clients
  query_timeout: 120000,              // 120 seconds for queries to complete
});

/* EMBEDDINGS (LOCAL) */

let embedder;

async function getEmbedding(text) {

  if (!embedder) {
    console.log('🧠 Loading embedding model...');
    embedder = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2',
      { quantized: true }
    );
    console.log('✅ Embedding model loaded');
  }

  const output = await embedder(text, {
    pooling: 'mean',
    normalize: true,
  });

  return Array.from(output.data);
}

/* VECTOR SEARCH */

async function getTopChunks(embedding, k = 10) {
  const vec = `[${embedding.join(',')}]`;
  const client = await pool.connect();

  try {
    const { rows } = await client.query(
      `
      SELECT chunk_text
      FROM public.w_embeddings
      ORDER BY embedding <-> $1::vector
      LIMIT $2
      `,
      [vec, k]
    );
    return rows;
  } finally {
    client.release();
  }
}

/* GROQ MCQ */

async function generateMCQs(context, count) {
  const prompt = `
Generate EXACTLY ${count} multiple choice questions. Keep them consistent and similar.

Rules:
- Output VALID JSON ONLY
- No markdown
- Format:
{
  "questions": [
    {
      "id": "q1",
      "prompt": "...",
      "choices": ["A", "B", "C", "D"],
      "answer": "A",
      "resource": "Optional URL for further reading"
    }
  ]
}

Context:
${context}
`;

  const res = await fetch(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 1000,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }

  const data = await res.json();
  return JSON.parse(data.choices[0].message.content).questions;
}

async function aiMindmapNode({ question, correctAnswer, context, sourceLink = '' }) {
  const prompt = `
You are generating a study mindmap node to help a student fix a misunderstanding. Provide a source link for more reading DO NOT USE WIKIPEDIA.

The student got this question wrong:
"${question}"

Correct answer:
"${correctAnswer}"

Using the reference material below, explain:
1) The core concept they misunderstood
2) Why the wrong reasoning fails
3) What is correct and why and how it is correct.

Rules:
- Max 8 short lines
- Each line max 18 words
- Plain text only
- No bullets, no filler
- Focus ONLY on what fixes the mistake
- Make sure to use simple vocabulary .

Source material: <a href=${sourceLink}></a>

Reference material:
${context}
`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 140,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }

  const data = await res.json();
  return data.choices[0].message.content.trim();
}


/* ROUTE */

app.post('/api/generate-questions', async (req, res) => {
  try {
    const { queryText, count = 8 } = req.body;
    console.log('Query:', queryText);

    const embedding = await getEmbedding(queryText);
    const chunks = await getTopChunks(embedding, 5);

    if (!chunks.length) {
      return res.status(404).json({ error: 'No matching content' });
    }

    const context = chunks.map(c => c.chunk_text).join('\n');
    const questions = await generateMCQs(context, count);

    res.json({ questions });
  } catch (err) {
    console.error('🔥 BACKEND ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});



// Minimal mindmap generator returns a simple nodes/edges structure
app.post('/api/generate-mindmap', async (req, res) => {
  try {
    const { wrongQuestions } = req.body;

    if (!Array.isArray(wrongQuestions)) {
      return res.status(400).json({ error: 'wrongQuestions must be an array' });
    }

    // Build mindmap: root node + one node per wrong question
    const nodes = [ { id: 'root', label: 'Review Topics', description: 'Topics to review based on your incorrect answers', sourceLink:'Source link' } ];
    const edges = [];

    // For each wrong question, fetch top related chunks from the vector DB
    for (let i = 0; i < wrongQuestions.length; i++) {
      const q = wrongQuestions[i];
      const id = `n${i}`;
      const label = (q.prompt && String(q.prompt).slice(0, 120)) || `Topic ${i+1}`;

      // Try to get embedding for the question prompt and then fetch top matching chunks
      let description = '';

      try {
        const text = (q.prompt && String(q.prompt)) || '';
        if (text.trim()) {
          const emb = await getEmbedding(text);
          const chunks = await getTopChunks(emb, 3);
          if (Array.isArray(chunks) && chunks.length) {
            // Use AI to condense the first chunk as the node description
            description = await aiMindmapNode({
              question: q.prompt,
              correctAnswer: q.answer, // or q.correctAnswer if that’s your field
              context: chunks[0].chunk_text,
              sourceLink: q.sourceLink || ''
            });
            // Add delay to avoid rate limit
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        }
      } catch (err) {
        console.error('Error fetching chunks for question:', err);
      }

      if (description && description.trim().length > 0) {
        nodes.push({ id, label, description, category: 'Suggested Review', sourceLink: q.resource || '' });
        edges.push({ from: 'root', to: id });
      } else {
        console.warn(`AI did not return description for node ${id} (${label})`);
      }
    }

    // Return expected shape for the frontend (nodes[], edges[])
    return res.json({ mindmap: { nodes, edges } });
  } catch (err) {
    console.error(' MINDMAP ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

// async function saveQuizSession() {


//     INSERT INTO public.quizzes_mindmaps (user_id, title, quiz, mindmap, embedding)
//     VALUES (
//       '00000000-0000-0000-0000-000000000000'::uuid, -- replace with actual user_id (auth.uid() on server)
//       'My Quiz Title',
//       '{"questions":[{"id":1,"text":"Q1","choices":["a","b"]}]}'::jsonb,
//       '{"nodes":[], "edges":[]}'::jsonb,
//       NULL  -- or an array literal for vector if available
//     )
//     RETURNING *;

// }

/* START/RUN SERVER */

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});