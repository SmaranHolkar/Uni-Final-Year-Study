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

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

/* ENV */

const GROQ_KEY = process.env.GROQ_API;
const DATABASE_URL = process.env.SUPABASE_URL;

if (!DATABASE_URL) {
  throw new Error('❌ SUPABASE_URL missing (must be pooler :6543)');
}

/* DB */

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
});

/* EMBEDDINGS (LOCAL) */

let embedder;

async function getEmbedding(text) {
  if (!embedder) {
    console.log('🧠 Loading embedding model...');
    embedder = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2'
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
      "answer": "A"
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
        max_tokens: 900,
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

/* ROUTE */

app.post('/api/generate-questions', async (req, res) => {
  try {
    const { queryText, count = 5 } = req.body;
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

// Minimal mindmap generator (returns a simple nodes/edges structure)
app.post('/api/generate-mindmap', async (req, res) => {
  try {
    const { wrongQuestions } = req.body;

    if (!Array.isArray(wrongQuestions)) {
      return res.status(400).json({ error: 'wrongQuestions must be an array' });
    }

    // Build mindmap: root node + one node per wrong question
    const nodes = [ { id: 'root', label: 'Review Topics', description: 'Topics to review based on your incorrect answers' } ];
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
            // concatenate top chunks as the node description
            description = chunks.map(r => r.chunk_text).join('\n\n');
          }
        }
      } catch (err) {
        console.error('Error fetching chunks for question:', err);
      }

      nodes.push({ id, label, description: description || 'Review this topic', category: 'Suggested Review' });
      edges.push({ from: 'root', to: id });
    }

    // Return expected shape for the frontend (nodes[], edges[])
    return res.json({ mindmap: { nodes, edges } });
  } catch (err) {
    console.error(' MINDMAP ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

/* START/RUN SERVER */

app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
