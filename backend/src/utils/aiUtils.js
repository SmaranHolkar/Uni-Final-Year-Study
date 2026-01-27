import fetch from 'node-fetch';
import { pipeline } from '@huggingface/transformers';
import pool from './dbPool.js';

const GROQ_KEY = process.env.GROQ_API;
// Ensure GROQ_KEY is set

// Embedding model instance gets embeddings.
let embedder;
export async function getEmbedding(text) {
  if (!embedder) {
    console.log('Loading embedding model');
    embedder = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2',
      { quantized: true }
    );
    console.log('Embedding model loaded');
  }
  const output = await embedder(text, {
    pooling: 'mean',
    normalize: true,
  });
  return Array.from(output.data);
}

// Retrieve top K similar text chunks from DB using vector similarity search
export async function getTopChunks(embedding, k = 10) {
  const vec = `[${embedding.join(',')}]`;
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT chunk_text FROM public.w_embeddings ORDER BY embedding <-> $1::vector LIMIT $2`,
      [vec, k]
    );
    return rows;
  } finally {
    client.release();
  }
}

export async function generateMCQs(context, count) {
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

export async function aiMindmapNode({ question, correctAnswer, context, sourceLink = '' }) {
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