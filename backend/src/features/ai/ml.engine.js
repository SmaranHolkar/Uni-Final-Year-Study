import fetch from 'node-fetch';
import { pipeline } from '@huggingface/transformers';
import pool from '../../shared/config/dbPool.js';
import fs from 'fs/promises';
import path from 'path';
import { buildSVGDiagramPrompt } from './svgDiagramPrompt.js';
import { getBlueprintForPrompt } from './blueprintLoader.js';
import { generateChemistrySimulatorHtml, generate3DSimulationHtml } from './simulationGenerators.js';

const GROQ_KEY = process.env.GROQ_API;

let embedder;
// Handles getEmbedding logic.
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

// Retry helper with capped backoff to prevent network timeouts
async function retryWithBackoff(fn, maxRetries = 2, initialDelay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      const errorStr = error.message || '';
      const isRateLimited =
        error.response?.status === 429 ||
        errorStr.includes('rate_limit') ||
        errorStr.includes('Rate limit') ||
        errorStr.includes('rate_limit_exceeded');

      if (isRateLimited && i < maxRetries - 1) {
        console.log(`Rate limited by GROQ. Retrying once in ${initialDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, initialDelay));
      } else {
        throw error;
      }
    }
  }
}

// Extract an image URL from different possible API response shapes.
function extractImageUrl(payload) {
  if (!payload || typeof payload !== 'object') return '';
  if (typeof payload.imageUrl === 'string' && payload.imageUrl) return payload.imageUrl;
  if (typeof payload.url === 'string' && payload.url) return payload.url;
  if (typeof payload.output === 'string' && payload.output) return payload.output;
  if (payload.data && typeof payload.data === 'object') {
    if (typeof payload.data.imageUrl === 'string' && payload.data.imageUrl) return payload.data.imageUrl;
    if (typeof payload.data.url === 'string' && payload.data.url) return payload.data.url;
  }
  if (Array.isArray(payload.data) && payload.data.length > 0) {
    const first = payload.data[0];
    if (typeof first === 'string' && first) return first;
    if (first && typeof first === 'object') {
      if (typeof first.url === 'string' && first.url) return first.url;
      if (typeof first.imageUrl === 'string' && first.imageUrl) return first.imageUrl;
    }
  }
  if (Array.isArray(payload.images) && payload.images.length > 0) {
    const first = payload.images[0];
    if (typeof first === 'string' && first) return first;
    if (first && typeof first === 'object') {
      if (typeof first.url === 'string' && first.url) return first.url;
      if (typeof first.imageUrl === 'string' && first.imageUrl) return first.imageUrl;
    }
  }
  if (payload.output && typeof payload.output === 'object') {
    const media = payload.output.media_url;
    if (Array.isArray(media) && media.length > 0 && typeof media[0] === 'string') return media[0];
  }
  return '';
}

// Generate an image through the FLUXImage API (Pixazo) and return the resulting URL.
async function generateFluxImage(prompt) {
  const apiKey = process.env.FLUXImage || process.env.FLUXIMAGE_API_KEY || '';
  const endpointList = String(
    process.env.FLUXIMAGE_API_URLS ||
    process.env.FLUXIMAGE_API_URL ||
    'https://gateway.pixazo.ai/flux-1-schnell/v1/getData'
  )
    .split(',')
    .map((endpoint) => endpoint.trim())
    .filter((endpoint) => /flux-1-schnell\/v1\/getData/i.test(endpoint));
  const modelList = String(process.env.FLUXIMAGE_FREE_MODELS || 'flux-schnell,flux-dev,flux')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);

  if (!apiKey) {
    return { imageUrl: '', error: 'FLUXImage API key is missing.' };
  }

  const buildPayload = (model) => {
    return {
      prompt,
      model,
      num_steps: Number(process.env.FLUXIMAGE_NUM_STEPS || 6),
      width: 1024,
      height: 1024,
    };
  };

  let lastError = 'Unknown FLUXImage error';

  const safeEndpointList = endpointList.length
    ? endpointList
    : ['https://gateway.pixazo.ai/flux-1-schnell/v1/getData'];

  for (const endpoint of safeEndpointList) {
    for (const model of modelList) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Ocp-Apim-Subscription-Key': apiKey,
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(buildPayload(model)),
        });

        if (!res.ok) {
          const errText = await res.text();
          lastError = `FLUXImage API error (${res.status}) on ${endpoint} model ${model || 'default'}: ${errText}`;
          continue;
        }

        const payload = await res.json();
        const imageUrl = extractImageUrl(payload);
        if (imageUrl) {
          return { imageUrl, error: '' };
        }

        const pollingUrl = typeof payload.polling_url === 'string' ? payload.polling_url : '';
        const requestId = typeof payload.request_id === 'string' ? payload.request_id : '';
        if (pollingUrl || requestId) {
          const statusUrl = pollingUrl || `https://gateway.pixazo.ai/v2/requests/status/${requestId}`;
          const maxPolls = Number(process.env.FLUXIMAGE_POLL_MAX || 6);
          const pollDelay = Number(process.env.FLUXIMAGE_POLL_DELAY_MS || 2500);

          for (let i = 0; i < maxPolls; i++) {
            await new Promise((resolve) => setTimeout(resolve, pollDelay));
            const statusRes = await fetch(statusUrl, {
              headers: {
                'Ocp-Apim-Subscription-Key': apiKey,
                Authorization: `Bearer ${apiKey}`,
              },
            });

            if (!statusRes.ok) {
              const statusErr = await statusRes.text();
              lastError = `FLUXImage polling failed (${statusRes.status}) on ${endpoint}: ${statusErr}`;
              break;
            }

            const statusPayload = await statusRes.json();
            const statusImage = extractImageUrl(statusPayload);
            if (statusImage) {
              return { imageUrl: statusImage, error: '' };
            }

            const status = String(statusPayload.status || '').toUpperCase();
            if (status === 'FAILED' || status === 'ERROR') {
              lastError = `FLUXImage status ${status} on ${endpoint}: ${statusPayload.error || 'Unknown error'}`;
              break;
            }
          }
        }

        lastError = `FLUXImage API returned no image URL on ${endpoint} model ${model || 'default'}`;
      } catch (err) {
        lastError = `FLUXImage request failed on ${endpoint} model ${model || 'default'}: ${err.message}`;
      }
    }
  }

  return { imageUrl: '', error: lastError };
}

// Download a remote image and convert to a data URL so frontend rendering does not depend on hotlink/CORS policy.
async function toDataUrlIfPossible(imageUrl) {
  if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) return '';
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return '';
    const contentType = res.headers.get('content-type') || 'image/png';
    const buffer = Buffer.from(await res.arrayBuffer());
    // Keep payload bounded to avoid oversized API responses.
    if (buffer.length > 8 * 1024 * 1024) return '';
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch {
    return '';
  }
}

// Persist generated image bytes to backend/uploads/generated and return a backend-served URL.
async function cacheImageLocally(imageUrl) {
  if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) return '';
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return '';

    const contentType = res.headers.get('content-type') || 'image/png';
    const ext = contentType.includes('jpeg') || contentType.includes('jpg')
      ? 'jpg'
      : contentType.includes('webp')
        ? 'webp'
        : 'png';

    const bytes = Buffer.from(await res.arrayBuffer());
    if (!bytes.length) return '';

    const uploadsDir = path.resolve(process.cwd(), 'uploads', 'generated');
    await fs.mkdir(uploadsDir, { recursive: true });

    const fileName = `flux-${Date.now()}-${Math.floor(Math.random() * 1e6)}.${ext}`;
    const filePath = path.join(uploadsDir, fileName);
    await fs.writeFile(filePath, bytes);

    const backendPublicUrl = process.env.BACKEND_PUBLIC_URL || 'http://localhost:5000';
    return `${backendPublicUrl}/uploads/generated/${fileName}`;
  } catch {
    return '';
  }
}

// Retrieve top K similar text chunks from DB using vector similarity search
export async function getTopChunks(embedding, k = 10, userId = null, documentId = null) {
  const vec = `[${embedding.join(',')}]`;
  const client = await pool.connect();
  try {
    let query, params;

    if (documentId) {
      query = `SELECT id, chunk_text, title FROM public.w_embeddings
               WHERE title = (SELECT title FROM public.w_embeddings WHERE id = $3)
               ORDER BY embedding <-> $1::vector LIMIT $2`;
      params = [vec, k, documentId];
    } else if (userId) {
      query = `SELECT id, chunk_text, title FROM public.w_embeddings
               WHERE user_id = $3
               ORDER BY embedding <-> $1::vector LIMIT $2`;
      params = [vec, k, userId];
    } else {
      query = `SELECT id, chunk_text, title FROM public.w_embeddings
               ORDER BY embedding <-> $1::vector LIMIT $2`;
      params = [vec, k];
    }

    const { rows } = await client.query(query, params);
    return rows;
  } finally {
    client.release();
  }
}

// Generate multiple choice questions based on provided context using GROQ API
export async function generateMCQs(context, count) {
  if (!GROQ_KEY) {
    throw new Error('GROQ_API is not set in the server environment');
  }
  const maxContextChars = 10000;
  const trimmedContext = String(context || '').slice(0, maxContextChars);
  const prompt = `
Generate EXACTLY ${count} multiple choice questions. Keep them consistent and in exam style form.
Return ONLY valid JSON.

Rules:
- No markdown
- Format:
{
  "questions": [
    {
      "id": "q1",
      "prompt": "...",
      "choices": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "A",
      "resource": "Optional URL for further reading"
    }
  ]
}
Additional constraints:
- Each item in "choices" must be a full string with no letter prefixes like "A)" or "B]".
- "answer" must be exactly one of: "A", "B", "C", "D".
- Ensure the JSON is valid and parsable.

Context:
${trimmedContext}
`;

  return retryWithBackoff(async () => {
    const res = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_KEY}`,
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-safeguard-20b',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 2000,
          response_format: { type: 'json_object' },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Groq API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const rawContent = data.choices[0].message.content;

    try {
      const parsed = JSON.parse(rawContent);
      return parsed.questions;
    } catch (parseError) {
      console.error('JSON Parsing failed. Attempting regex recovery...', parseError);
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]).questions;
      }
      throw new Error('Could not parse AI response into valid JSON');
    }
  });
}

// Generic chat completion — base function reused by toolGenAI and aiMindmapNode
export async function getChatCompletion(
  prompt,
  model = 'llama-3.3-70b-versatile',
  temperature = 0.7,
  maxTokens = 2000,
  options = {}
) {
  if (!GROQ_KEY) {
    throw new Error('GROQ_API is not set in the server environment');
  }

  const { forceJson = false } = options;

  return retryWithBackoff(async () => {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_KEY}`,
      },
      signal: AbortSignal.timeout(25000),
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are Vela, an advanced academic study assistant with deep pedagogical intelligence. Deliver sharp, clear, accurate, and deeply helpful explanations and tools.' },
          { role: 'user', content: prompt }
        ],
        temperature,
        max_tokens: Math.min(maxTokens || 3000, 4500),
        ...(forceJson ? { response_format: { type: 'json_object' } } : {}),
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      // If 70b hits rate limit, fallback to qwen
      if (model !== 'qwen/qwen3.6-27b') {
        console.warn(`[ML ENGINE] Retrying with secondary model due to error: ${errText.slice(0, 100)}`);
        return getChatCompletion(prompt, 'qwen/qwen3.6-27b', temperature, maxTokens, options);
      }
      throw new Error(`Groq API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const rawContent = data.choices[0]?.message?.content || '';
    const cleaned = rawContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    return cleaned || rawContent;
  }, 3, 1200);
}

// toolGenAI: routes all AI calls to Groq via getChatCompletion using high-intelligence model.
export async function toolGenAI(
  prompt,
  model = 'llama-3.3-70b-versatile',
  temperature = 0.7,
  maxTokens = 2500,
  options = {}
) {
  const groqModel = model || 'llama-3.3-70b-versatile';
  return getChatCompletion(prompt, groqModel, temperature, maxTokens, options);
}


// Handles aiMindmapNode logic.
export async function aiMindmapNode({ question, correctAnswer, context, sourceLink = '' }) {
  const prompt = `
You are generating a corrective study mindmap node. End with one source link on its own line at the end(not Wikipedia)

The student misunderstood this question:
"${question}"

Correct understanding:
"${correctAnswer}"

Using the reference material, write a short corrective explanation that:
- Identifies the exact misunderstanding
- Shows why that thinking breaks
- Replaces it with the correct idea

Constraints:
- Talk directly to the student as if you were speaking to them, not in third person.
- Max 8 short lines
- Each line max 18 words
- Plain text only
- No bullets or numbering
- No filler or repetition
- Use simple vocabulary
- End with one source link on its own line (not Wikipedia)

Reference material:
${context}

Source link:
${sourceLink}
`;

  // Use toolGenAI to keep routing consistent across all AI calls
  return toolGenAI(prompt, 'qwen/qwen3.6-27b', 0.1, 140);
}


/**
 * Describes a rendered PDF page image using Groq Vision (llama-4-scout).
 * @param {string} base64Png - Base64-encoded PNG of the page
 * @returns {Promise<string>} - Detailed text description of all visual content
 */
export async function describeImage(base64Png) {
  if (!GROQ_KEY) {
    throw new Error('GROQ_API is not set in the server environment');
  }

  const prompt = `You are analysing a university lecture slide or academic document page.
Describe ALL of the following that you can see:
- All visible text (headings, bullet points, labels, annotations)
- Diagrams, flowcharts, graphs, or charts — describe structure and key labels
- Mathematical equations or formulas — write them out in plain text
- Tables — describe columns, rows, and key values
- Code snippets — transcribe them exactly
- Any arrows, relationships, or visual logic shown

Be thorough and specific. This description will be used to generate exam questions, so accuracy matters.`;

  return retryWithBackoff(async () => {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: { url: `data:image/png;base64,${base64Png}` },
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 1024,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Groq Vision API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.choices[0].message.content.trim();
  });
}


function safeParse(text) {
  if (!text || typeof text !== 'string') return null;
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  if (!cleaned && text.includes('<think>')) {
    cleaned = text.replace(/<think>[\s\S]*/gi, '').trim();
  }
  if (!cleaned) cleaned = text;

  try {
    return JSON.parse(cleaned);
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/) || text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {}
    }
  }
  return null;
}

// generateLearningTool  (two-phase: plan → build)
// PHASE 1 — small JSON-only call; planner picks toolType + writes its own htmlDesignBrief.
// PHASE 2 — plain-text HTML-only call using llama-3.1-8b-instant with 8192 tokens.
//           TOOL_THEME_CSS is injected after generation, not inlined in the prompt, saving ~1800 tokens.

// ── Deterministic crossword grid builder ─────────────────────────────────────
// Computes word placements, intersections, and clue numbering entirely in JS.
function buildCrosswordLayout(wordItems) {
  const entries = (wordItems || [])
    .map(w => ({
      word: String(w.word || w.front || w.term || w.title || w.concept || '').toUpperCase().replace(/[^A-Z]/g, ''),
      clue: String(w.clue || w.back || w.definition || w.explanation || w.detail || w.hint || w.content || ''),
    }))
    .filter(w => w.word.length >= 3)
    .sort((a, b) => b.word.length - a.word.length)
    .slice(0, 16);

  if (entries.length === 0) return null;

  const ORIGIN = 30;
  const grid = new Map(); // "r,c" → letter
  const placed = [];      // { word, clue, direction, startRow, startCol }

  const getCell = (r, c) => grid.get(`${r},${c}`) ?? null;
  const setCell = (r, c, ch) => grid.set(`${r},${c}`, ch);

  const canPlace = (word, dir, sr, sc) => {
    const dr = dir === 'down' ? 1 : 0;
    const dc = dir === 'across' ? 1 : 0;
    // Cell immediately before start must be empty
    if (getCell(sr - dr, sc - dc) !== null) return false;
    // Cell immediately after end must be empty
    if (getCell(sr + dr * word.length, sc + dc * word.length) !== null) return false;

    for (let i = 0; i < word.length; i++) {
      const r = sr + dr * i;
      const c = sc + dc * i;
      const existing = getCell(r, c);
      if (existing !== null) {
        if (existing !== word[i]) return false; // letter conflict
      } else {
        // Empty cell: check adjacent perpendicular cells to prevent side-by-side collisions
        if (dir === 'across') {
          if (getCell(r - 1, c) !== null || getCell(r + 1, c) !== null) return false;
        } else {
          if (getCell(r, c - 1) !== null || getCell(r, c + 1) !== null) return false;
        }
      }
    }
    return true;
  };

  const doPlace = (word, dir, sr, sc) => {
    const dr = dir === 'down' ? 1 : 0;
    const dc = dir === 'across' ? 1 : 0;
    for (let i = 0; i < word.length; i++) setCell(sr + dr * i, sc + dc * i, word[i]);
  };

  // Place first word horizontally at center
  doPlace(entries[0].word, 'across', ORIGIN, ORIGIN);
  placed.push({ ...entries[0], direction: 'across', startRow: ORIGIN, startCol: ORIGIN });

  // Pass 1: Try to intersect remaining words
  const unplaced = [];
  for (let ei = 1; ei < entries.length; ei++) {
    const entry = entries[ei];
    let placed_ = false;

    for (const p of placed) {
      if (placed_) break;
      const newDir = p.direction === 'across' ? 'down' : 'across';

      for (let ni = 0; ni < entry.word.length && !placed_; ni++) {
        for (let pi = 0; pi < p.word.length && !placed_; pi++) {
          if (entry.word[ni] !== p.word[pi]) continue;
          const finalSr = newDir === 'down' ? p.startRow - ni : p.startRow + pi;
          const finalSc = newDir === 'across' ? p.startCol - ni : p.startCol + pi;
          if (canPlace(entry.word, newDir, finalSr, finalSc)) {
            doPlace(entry.word, newDir, finalSr, finalSc);
            placed.push({ ...entry, direction: newDir, startRow: finalSr, startCol: finalSc });
            placed_ = true;
          }
        }
      }
    }
    if (!placed_) unplaced.push(entry);
  }

  // Pass 2: Place any remaining non-intersecting words in clean adjacent parallel rows
  for (const entry of unplaced) {
    const currentMaxR = Math.max(...placed.map(p => p.direction === 'down' ? p.startRow + p.word.length - 1 : p.startRow));
    const currentMinC = Math.min(...placed.map(p => p.startCol));
    const targetR = currentMaxR + 2;
    const targetC = currentMinC;
    doPlace(entry.word, 'across', targetR, targetC);
    placed.push({ ...entry, direction: 'across', startRow: targetR, startCol: targetC });
  }

  if (placed.length === 0) return null;

  // Normalise so min row/col = 1
  const allR = placed.flatMap(p => [p.startRow, p.direction === 'down' ? p.startRow + p.word.length - 1 : p.startRow]);
  const allC = placed.flatMap(p => [p.startCol, p.direction === 'across' ? p.startCol + p.word.length - 1 : p.startCol]);
  const minR = Math.min(...allR);
  const minC = Math.min(...allC);
  const maxR = Math.max(...allR);
  const maxC = Math.max(...allC);

  const np = placed.map(p => ({ ...p, startRow: p.startRow - minR + 1, startCol: p.startCol - minC + 1 }));

  // Assign clue numbers in standard top-to-bottom, left-to-right reading order
  const cellNum = new Map();
  [...np].sort((a, b) => a.startRow !== b.startRow ? a.startRow - b.startRow : a.startCol - b.startCol)
    .forEach(p => {
      const k = `${p.startRow},${p.startCol}`;
      if (!cellNum.has(k)) cellNum.set(k, cellNum.size + 1);
      p.number = cellNum.get(k);
    });

  return {
    gridRows: maxR - minR + 1,
    gridCols: maxC - minC + 1,
    words: np,
  };
}

// ── Deterministic word-search grid builder ────────────────────────────────────
function buildWordSearchLayout(wordItems) {
  const words = wordItems
    .map(w => String(w.word || w.front || w.title || '').toUpperCase().replace(/[^A-Z]/g, ''))
    .filter(w => w.length >= 3)
    .slice(0, 16);

  if (words.length === 0) return null;

  const SIZE = Math.max(12, Math.ceil(Math.sqrt(words.join('').length * 2.5)));
  const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(''));
  const positions = [];
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  for (const word of words) {
    let placed = false;
    for (let attempt = 0; attempt < 200 && !placed; attempt++) {
      const dir = Math.random() < 0.5 ? 'horizontal' : 'vertical';
      const maxR = dir === 'horizontal' ? SIZE - 1 : SIZE - word.length;
      const maxC = dir === 'vertical'   ? SIZE - 1 : SIZE - word.length;
      if (maxR < 0 || maxC < 0) continue;
      const sr = Math.floor(Math.random() * (maxR + 1));
      const sc = Math.floor(Math.random() * (maxC + 1));
      // Check no conflict
      let ok = true;
      for (let i = 0; i < word.length; i++) {
        const r = dir === 'horizontal' ? sr : sr + i;
        const c = dir === 'vertical'   ? sc : sc + i;
        if (grid[r][c] && grid[r][c] !== word[i]) { ok = false; break; }
      }
      if (ok) {
        for (let i = 0; i < word.length; i++) {
          const r = dir === 'horizontal' ? sr : sr + i;
          const c = dir === 'vertical'   ? sc : sc + i;
          grid[r][c] = word[i];
        }
        positions.push({ word, startRow: sr, startCol: sc, direction: dir });
        placed = true;
      }
    }
    if (!placed) console.warn(`WordSearch: could not place "${word}"`);
  }

  // Fill empty cells with random letters
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (!grid[r][c]) grid[r][c] = LETTERS[Math.floor(Math.random() * 26)];

  return { gridRows: SIZE, gridCols: SIZE, grid, wordPositions: positions };
}

// Design-system theme CSS injected into every generated HTML tool.
// High-end Claude Artifacts & NotebookLM aesthetics (Glassmorphism, 3D flips, glowing accents).
const TOOL_THEME_CSS = `
  :root {
    --background: #08090e;
    --foreground: #f4f4f6;
    --card: rgba(18, 20, 31, 0.85);
    --card-foreground: #f4f4f6;
    --popover: #12141f;
    --popover-foreground: #f4f4f6;
    --primary: #6366f1;
    --primary-foreground: #ffffff;
    --secondary: #1e2235;
    --secondary-foreground: #c7d2fe;
    --muted: #161826;
    --muted-foreground: #94a3b8;
    --accent: #38bdf8;
    --accent-foreground: #0f172a;
    --destructive: #ef4444;
    --destructive-foreground: #ffffff;
    --border: rgba(255, 255, 255, 0.09);
    --input: #12141f;
    --ring: #6366f1;
    --radius: 0px;
    --font-sans: 'Plus Jakarta Sans', Inter, -apple-system, sans-serif;
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; border-radius: 0 !important; }
  html, body { height: 100%; overflow: hidden; }
  body { background: var(--background); color: var(--foreground); font-family: var(--font-sans); -webkit-font-smoothing: antialiased; }
  #app { display: flex; flex-direction: column; height: 100vh; width: 100vw; background: radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.08) 0%, transparent 70%); }
  #app-header { background: rgba(12, 14, 24, 0.9); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); padding: 1.1rem 1.75rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
  #app-header h1 { font-size: 1.15rem; font-weight: 700; color: #ffffff; letter-spacing: -0.01em; display: flex; align-items: center; gap: 0.5rem; }
  #app-header p  { font-size: 0.825rem; color: var(--muted-foreground); line-height: 1.4; }
  #app-progress  { font-size: 0.75rem; font-weight: 600; color: var(--accent); background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.25); padding: 0.25rem 0.65rem; border-radius: 0; }
  #app-main { flex: 1; overflow-y: auto; padding: 1.75rem; display: flex; flex-direction: column; align-items: center; gap: 1.25rem; }
  #app-footer { background: rgba(12, 14, 24, 0.9); backdrop-filter: blur(12px); border-top: 1px solid var(--border); padding: 0.85rem 1.75rem; display: flex; justify-content: center; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
  .card { background: var(--card); backdrop-filter: blur(16px); color: var(--card-foreground); border-radius: var(--radius); border: 1px solid var(--border); padding: 1.5rem; transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s; box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5); }
  .card:hover { border-color: rgba(99, 102, 241, 0.4); transform: translateY(-2px); }
  .btn { border: none; border-radius: var(--radius); padding: 0.6rem 1.35rem; font-weight: 600; cursor: pointer; transition: all 0.2s ease; font-size: 0.875rem; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; }
  .btn-primary { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.35); }
  .btn-primary:hover { opacity: 0.92; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5); }
  .btn-secondary { background: var(--secondary); color: var(--secondary-foreground); border: 1px solid var(--border); }
  .btn-secondary:hover { background: rgba(99, 102, 241, 0.15); border-color: rgba(99, 102, 241, 0.4); }
  .btn-ghost { background: transparent; color: var(--muted-foreground); border: 1px solid var(--border); }
  .btn-ghost:hover { background: var(--muted); color: var(--foreground); }
  .btn-destructive { background: var(--destructive); color: var(--destructive-foreground); }
  input, select, textarea { background: var(--input); color: var(--foreground); border: 1px solid var(--border); border-radius: var(--radius); padding: 0.6rem 0.85rem; outline: none; width: 100%; font-size: 0.9rem; transition: border-color 0.2s; }
  input:focus, select:focus, textarea:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25); }
  .badge { background: rgba(99, 102, 241, 0.15); color: #a5b4fc; border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 0; padding: 0.15rem 0.65rem; font-size: 0.75rem; font-weight: 600; display: inline-flex; align-items: center; gap: 0.25rem; }
  .correct { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
  .incorrect { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
  .divider { width: 100%; height: 1px; background: var(--border); margin: 0.75rem 0; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); border-radius: 0; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.25); }
`;


// Utility tool types that don't need Q&A item arrays
const UTILITY_TOOL_TYPES = [
  'timer', 'pomodoro', 'stopwatch', 'clock',
  'calculator', 'converter', 'counter', 'progress-tracker',
];

export function normalizeToolItems(toolType, rawItems) {
  if (!Array.isArray(rawItems)) return [];
  const type = String(toolType || '').toLowerCase();

  return rawItems.map((item, idx) => {
    if (!item || typeof item !== 'object') {
      return { id: String(idx + 1), front: 'Concept ' + (idx + 1), back: 'Details unavailable.' };
    }

    const id = String(item.id || idx + 1);

    // 1. Quiz / True-False / MCQ
    if (type.includes('quiz') || type.includes('true-false') || type.includes('mcq') || type.includes('multiple')) {
      const question = String(item.question || item.front || item.prompt || item.title || item.text || `Question ${idx + 1}`);
      let choices = Array.isArray(item.choices) ? item.choices.map(c => String(c)) : [];
      if (choices.length < 2 && Array.isArray(item.options)) {
        choices = item.options.map(o => String(o));
      }
      if (choices.length < 2) {
        const correct = String(item.answer || item.back || 'Option A');
        choices = [correct, 'Option B', 'Option C', 'Option D'];
      }
      while (choices.length < 4 && !type.includes('true-false')) {
        choices.push(`Choice ${choices.length + 1}`);
      }
      let answer = String(item.answer || item.best || 'A').trim().toUpperCase();
      if (!['A', 'B', 'C', 'D'].includes(answer.charAt(0))) {
        answer = 'A';
      } else {
        answer = answer.charAt(0);
      }
      const explanation = String(item.explanation || item.reasoning || item.detail || item.back || 'Correct answer!');

      return {
        id,
        question,
        choices: choices.slice(0, 4),
        answer,
        explanation
      };
    }

    // 2. Matching
    if (type.includes('matching') || type.includes('match')) {
      const left = String(item.left || item.term || item.front || item.concept || `Term ${idx + 1}`);
      const right = String(item.right || item.definition || item.back || item.explanation || `Definition ${idx + 1}`);
      return { id, left, right };
    }

    // 3. Fill in the blank
    if (type.includes('fill') || type.includes('blank')) {
      const sentence = String(item.sentence || item.question || item.prompt || item.front || `Fill in the blank for item ${idx + 1}`);
      const answer = String(item.answer || item.back || item.target || 'correct');
      const hint = String(item.hint || item.explanation || '');
      return { id, sentence, answer, hint };
    }

    // 4. Timeline / Ordering
    if (type.includes('timeline') || type.includes('ordering') || type.includes('sequence')) {
      const text = String(item.text || item.title || item.event || item.front || item.question || `Event ${idx + 1}`);
      const position = Number(item.position || idx + 1);
      const detail = String(item.detail || item.explanation || item.back || item.content || '');
      return { id, text, position, detail };
    }

    // 5. Crossword
    if (type.includes('crossword')) {
      const word = String(item.word || item.front || item.term || item.title || item.concept || `WORD${idx + 1}`).toUpperCase().replace(/[^A-Z]/g, '');
      const clue = String(item.clue || item.back || item.definition || item.explanation || item.detail || item.content || item.hint || 'Definition and anatomical clue');
      return { id, word, clue, front: word, back: clue };
    }

    // 6. Default Flashcards / Study Notes shape
    const front = String(item.front || item.question || item.term || item.title || item.word || item.concept || `Item ${idx + 1}`);
    const back = String(item.back || item.answer || item.definition || item.explanation || item.content || item.detail || '');
    return { id, front, back, hint: String(item.hint || '') };
  });
}

export function generateDeterministicFallbackHtml(toolType, title, description, items) {
  const type = String(toolType || '').toLowerCase();
  const itemsJson = JSON.stringify(items || []);

  // 0. Flashcards 3D Interactive Carousel Template
  if (type.includes('flash')) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>/* INJECT_THEME_CSS */
.fc-perspective{perspective:1000px;width:100%;max-width:540px;margin:1rem auto;}
.fc-card{position:relative;width:100%;min-height:280px;transform-style:preserve-3d;transition:transform 0.5s cubic-bezier(0.4,0,0.2,1);cursor:pointer;}
.fc-card.flipped{transform:rotateY(180deg);}
.fc-face{position:absolute;width:100%;height:100%;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:1rem;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:2rem;box-sizing:border-box;}
.fc-front{background:var(--card);border:1.5px solid var(--border);}
.fc-back{background:var(--card);border:1.5px solid var(--primary);transform:rotateY(180deg);}
</style></head><body><div id="app"><header id="app-header"><div style="display:flex;align-items:center;gap:0.5rem;justify-content:center;"><span class="badge" style="background:var(--primary);color:white;">🗂️ Interactive Flashcards</span></div><h1 style="margin-top:0.25rem;">${title}</h1><p>${description}</p><span id="app-progress">Card 1 / ${Math.max(items.length, 1)}</span></header><main id="app-main"><div class="fc-perspective"><div class="fc-card" id="fc-main"><div class="fc-face fc-front"><span class="badge" style="margin-bottom:1rem;">Question / Term</span><h2 id="fc-front-text" style="font-size:1.25rem;font-weight:700;color:var(--foreground);text-align:center;line-height:1.5;"></h2><p class="muted text-xs" style="margin-top:1.5rem;">Tap or press Space to flip 🔄</p></div><div class="fc-face fc-back"><span class="badge correct" style="margin-bottom:1rem;">Explanation / Answer</span><p id="fc-back-text" style="font-size:1.05rem;line-height:1.6;color:var(--foreground);text-align:center;"></p><p class="muted text-xs" style="margin-top:1.5rem;">Tap to flip back</p></div></div></div><div style="display:flex;gap:0.75rem;margin-top:1rem;justify-content:center;"><button class="btn btn-secondary" id="fc-prev">← Previous</button><button class="btn btn-primary" id="fc-flip">Flip Card (Space)</button><button class="btn btn-secondary" id="fc-next">Next →</button></div><div style="display:flex;gap:0.5rem;margin-top:0.75rem;justify-content:center;"><button class="btn btn-ghost text-xs" id="fc-shuffle">🔀 Shuffle</button></div></main></div><script>let DATA=${itemsJson};let idx=0;let flipped=false;const card=document.getElementById('fc-main');const frontText=document.getElementById('fc-front-text');const backText=document.getElementById('fc-back-text');const progress=document.getElementById('app-progress');function render(){if(!DATA.length)return;flipped=false;card.classList.remove('flipped');const it=DATA[idx]||{};progress.textContent='Card '+(idx+1)+' / '+DATA.length;frontText.textContent=it.front||it.question||it.term||it.concept||'Card '+(idx+1);backText.textContent=it.back||it.answer||it.definition||it.explanation||'Definition and details.';}function flip(){flipped=!flipped;card.classList.toggle('flipped',flipped);}card.onclick=flip;document.getElementById('fc-flip').onclick=flip;document.getElementById('fc-prev').onclick=()=>{idx=(idx-1+DATA.length)%DATA.length;render();};document.getElementById('fc-next').onclick=()=>{idx=(idx+1)%DATA.length;render();};document.getElementById('fc-shuffle').onclick=()=>{DATA.sort(()=>Math.random()-0.5);idx=0;render();};document.addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();flip();}if(e.code==='ArrowRight'){idx=(idx+1)%DATA.length;render();}if(e.code==='ArrowLeft'){idx=(idx-1+DATA.length)%DATA.length;render();}});render();</script></body></html>`;
  }

  // 1. Quiz / MCQ Template
  if (type.includes('quiz') || type.includes('mcq')) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>/* INJECT_THEME_CSS */</style></head><body><div id="app"><header id="app-header"><h1>${title}</h1><p>${description}</p><span id="app-progress"></span></header><main id="app-main"><div class="card w-full max-w-2xl text-left" id="quiz-card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;"><span id="q-num" class="badge">Question 1</span><span id="score-badge" class="muted text-xs" style="font-weight:600;">Score: 0</span></div><h2 id="q-prompt" style="font-size:1.15rem;font-weight:700;margin:0.75rem 0 1rem 0;color:var(--foreground);"></h2><div id="choices-grid" style="display:grid;gap:0.65rem;"></div><div id="explanation-box" class="card muted" style="margin-top:1rem;display:none;background:var(--muted);font-size:0.85rem;padding:0.75rem;"></div></div><div class="card w-full max-w-md text-center" id="results-card" style="display:none;"><h2 style="font-size:1.4rem;font-weight:700;margin-bottom:0.5rem;color:var(--foreground);">Quiz Completed! 🎉</h2><p id="final-score" style="font-size:2rem;font-weight:800;color:var(--primary);margin:1rem 0;"></p><button class="btn btn-primary w-full" id="retry-btn">Try Again</button></div></main></div><script>const DATA=${itemsJson};let idx=0;let score=0;let answered=false;const qNum=document.getElementById('q-num');const qPrompt=document.getElementById('q-prompt');const grid=document.getElementById('choices-grid');const expBox=document.getElementById('explanation-box');const progress=document.getElementById('app-progress');const quizCard=document.getElementById('quiz-card');const resCard=document.getElementById('results-card');const finalScore=document.getElementById('final-score');const scoreBadge=document.getElementById('score-badge');function render(){if(!DATA.length)return;if(idx>=DATA.length){quizCard.style.display='none';resCard.style.display='block';finalScore.textContent=Math.round((score/DATA.length)*100)+'% ('+score+'/'+DATA.length+')';return;}answered=false;quizCard.style.display='block';resCard.style.display='none';expBox.style.display='none';const item=DATA[idx];qNum.textContent='Question '+(idx+1)+' of '+DATA.length;progress.textContent=(idx+1)+'/'+DATA.length;scoreBadge.textContent='Score: '+score;qPrompt.textContent=item.question||'Question';grid.innerHTML='';const labels=['A','B','C','D'];(item.choices||[]).forEach((choiceText,i)=>{const btn=document.createElement('button');btn.className='btn btn-secondary text-left';btn.style.justifyContent='flex-start';btn.style.padding='0.75rem 1rem';btn.innerHTML='<span style="font-weight:700;margin-right:0.5rem;">'+labels[i]+'.</span> '+choiceText;btn.onclick=()=>selectChoice(labels[i],btn);grid.appendChild(btn);});}function selectChoice(label,btn){if(answered)return;answered=true;const item=DATA[idx];const isCorrect=(label===item.answer);if(isCorrect){score++;btn.className='btn correct text-left';}else{btn.className='btn incorrect text-left';const buttons=grid.querySelectorAll('button');const correctIdx=['A','B','C','D'].indexOf(item.answer);if(buttons[correctIdx])buttons[correctIdx].className='btn correct text-left';}expBox.style.display='block';expBox.innerHTML='<strong>'+(isCorrect?'Correct!':'Incorrect.')+'</strong> '+item.explanation;setTimeout(()=>{idx++;render();},2200);}document.getElementById('retry-btn').onclick=()=>{idx=0;score=0;render();};render();</script></body></html>`;
  }

  // 2. Matching Template
  if (type.includes('matching') || type.includes('match')) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>/* INJECT_THEME_CSS */</style></head><body><div id="app"><header id="app-header"><h1>${title}</h1><p>${description}</p><span id="app-progress">Matched 0 / ${items.length}</span></header><main id="app-main"><div class="w-full max-w-4xl" style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;" id="match-container"><div id="left-col" style="display:grid;gap:0.5rem;"></div><div id="right-col" style="display:grid;gap:0.5rem;"></div></div></main></div><script>const DATA=${itemsJson};let selectedLeft=null;let matchedCount=0;const leftCol=document.getElementById('left-col');const rightCol=document.getElementById('right-col');const progress=document.getElementById('app-progress');function render(){leftCol.innerHTML='';rightCol.innerHTML='';const rights=[...DATA].map(d=>({id:d.id,text:d.right})).sort(()=>Math.random()-0.5);DATA.forEach(item=>{const btn=document.createElement('button');btn.className='btn btn-secondary text-left';btn.textContent=item.left;btn.dataset.id=item.id;btn.onclick=()=>{if(btn.disabled)return;document.querySelectorAll('#left-col button').forEach(b=>b.style.borderColor='var(--border)');btn.style.borderColor='var(--primary)';selectedLeft=item.id;};leftCol.appendChild(btn);});rights.forEach(item=>{const btn=document.createElement('button');btn.className='btn btn-secondary text-left';btn.textContent=item.text;btn.onclick=()=>{if(!selectedLeft||btn.disabled)return;if(selectedLeft===item.id){matchedCount++;btn.className='btn correct text-left';btn.disabled=true;const leftBtn=leftCol.querySelector('button[data-id="'+item.id+'"]');if(leftBtn){leftBtn.className='btn correct text-left';leftBtn.disabled=true;}selectedLeft=null;progress.textContent='Matched '+matchedCount+' / '+DATA.length;}else{btn.className='btn incorrect text-left';setTimeout(()=>{btn.className='btn btn-secondary text-left';},800);}};rightCol.appendChild(btn);});}render();</script></body></html>`;
  }

  // 3. Chronological Timeline & Drag-and-Drop Sequence Ordering Template
  if (type.includes('timeline') || type.includes('ordering') || type.includes('sequence') || type.includes('chronol') || type.includes('drag')) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>/* INJECT_THEME_CSS */
      .timeline-track-container { position: relative; padding-left: 2.25rem; width: 100%; max-width: 760px; margin: 0 auto; }
      .timeline-vertical-spine { position: absolute; left: 1rem; top: 1rem; bottom: 1rem; width: 2.5px; background: linear-gradient(to bottom, var(--primary), #3D6660, #10b981); opacity: 0.35; border-radius: 2px; }
      .timeline-slot { position: relative; margin-bottom: 0.85rem; }
      .timeline-slot-node { position: absolute; left: -2.25rem; top: 1.15rem; width: 14px; height: 14px; border-radius: 50%; background: var(--background); border: 2.5px solid var(--primary); z-index: 2; transition: all 0.2s; }
      .timeline-slot-node.locked { border-color: #10b981; background: #10b981; box-shadow: 0 0 8px rgba(16,185,129,0.5); }
      .timeline-card { background: var(--card); border: 1.5px solid var(--border); border-radius: 0.85rem; padding: 0.95rem 1.15rem; cursor: grab; user-select: none; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); display: flex; align-items: center; gap: 0.85rem; position: relative; box-shadow: 0 2px 6px rgba(0,0,0,0.15); }
      .timeline-card:hover { border-color: rgba(90,125,153,0.6); transform: translateY(-1px); }
      .timeline-card:active { cursor: grabbing; border-color: var(--primary); }
      .timeline-card.dragging { opacity: 0.35; border: 2px dashed var(--primary); transform: scale(0.98); }
      .timeline-card.correct-order { border-color: #10b981; background: rgba(16,185,129,0.08); box-shadow: 0 0 12px rgba(16,185,129,0.15); }
      .timeline-card.wrong-order { border-color: #ef4444; background: rgba(239,68,68,0.08); }
      .drag-handle { color: #8E8E93; font-size: 1.25rem; cursor: grab; padding: 0 0.2rem; flex-shrink: 0; }
      .order-pill { width: 28px; height: 28px; border-radius: 50%; background: var(--muted); border: 1.5px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800; color: var(--primary); flex-shrink: 0; }
      .move-btn { background: #21262E; border: 1px solid var(--border); color: #CDD1D6; border-radius: 0.35rem; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 0.7rem; transition: all 0.15s; }
      .move-btn:hover { background: var(--primary); color: #fff; border-color: var(--primary); }
      .progress-bar-wrap { width: 100%; max-width: 680px; margin: 0.5rem auto 0 auto; }
      .progress-track { height: 6px; width: 100%; background: rgba(255,255,255,0.08); border-radius: 999px; overflow: hidden; }
      .progress-fill { height: 100%; width: 0%; background: linear-gradient(90deg, #5A7D99, #10b981); transition: width 0.4s ease; border-radius: 999px; }
    </style></head><body>
      <div id="app">
        <header id="app-header">
          <div style="display:flex;align-items:center;gap:0.5rem;justify-content:center;">
            <span class="badge" style="background:#5A7D99;color:white;">⏳ Chronological Timeline Challenge</span>
          </div>
          <h1 style="margin-top:0.25rem;">${title}</h1>
          <p>${description}</p>
          
          {/* Subtle Horizontal Progress Bar */}
          <div class="progress-bar-wrap">
            <div class="progress-track">
              <div id="prog-fill" class="progress-fill"></div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.75rem;color:#8E8E93;margin-top:0.4rem;font-weight:600;">
              <span id="prog-count">0 / ${Math.max(items.length, 5)} Events Correct</span>
              <span id="prog-pct" style="color:var(--primary);">0% Accuracy</span>
            </div>
          </div>
        </header>

        <main id="app-main" style="width:100%;display:flex;flex-direction:column;align-items:center;padding-bottom:2rem;">
          <div style="display:flex;gap:0.5rem;justify-content:center;margin-bottom:1.25rem;flex-wrap:wrap;">
            <button class="btn btn-primary" id="btn-check-order">✅ Check Chronological Order</button>
            <button class="btn btn-secondary" id="btn-shuffle-order">🔀 Scramble Sequence</button>
            <button class="btn btn-secondary" id="btn-reveal-timeline">📜 Chronological Story View</button>
          </div>

          <div id="order-feedback" class="card text-center" style="display:none;margin-bottom:1.25rem;padding:0.85rem 1.25rem;width:100%;max-width:760px;border-radius:0.75rem;"></div>

          {/* Visual Scaffolding & Connected Drop-Zone Track */}
          <div class="timeline-track-container">
            <div class="timeline-vertical-spine"></div>
            <div id="timeline-slots-container" style="display:grid;gap:0.25rem;"></div>
          </div>
        </main>
      </div>

      <script>
        const RAW_DATA = ${itemsJson};
        const ORIGINAL = (RAW_DATA.length > 0 ? RAW_DATA : [
          { text: 'Founding of the Roman Republic', position: 1, detail: 'Overthrow of the Roman Kingdom and establishment of the senatorial republic (509 BC).' },
          { text: 'Julius Caesar Crosses the Rubicon', position: 2, detail: 'Defiance of the Senate ignites the Great Roman Civil War (49 BC).' },
          { text: 'Pax Romana Established by Augustus', position: 3, detail: 'First Roman Emperor ushers in 200 years of imperial peace and stability (27 BC).' },
          { text: 'Edict of Milan by Constantine', position: 4, detail: 'Legalization and state toleration of Christianity across the Empire (313 AD).' },
          { text: 'Fall of the Western Roman Empire', position: 5, detail: 'Deposition of Emperor Romulus Augustulus by Odoacer (476 AD).' }
        ]).map((it, idx) => ({
          id: it.id || String(idx + 1),
          text: it.text || it.title || it.front || it.concept || ('Event ' + (idx + 1)),
          detail: it.detail || it.back || it.explanation || it.definition || '',
          correctPosition: it.position || (idx + 1)
        }));

        let currentList = [...ORIGINAL].sort(() => Math.random() - 0.5);
        let isChronologicalView = false;
        const container = document.getElementById('timeline-slots-container');
        const fbEl = document.getElementById('order-feedback');
        const progFill = document.getElementById('prog-fill');
        const progCount = document.getElementById('prog-count');
        const progPct = document.getElementById('prog-pct');

        function updateProgress(correctCount) {
          const total = currentList.length;
          const pct = Math.round((correctCount / total) * 100);
          progFill.style.width = pct + '%';
          progCount.textContent = correctCount + ' / ' + total + ' Events Placed Correctly';
          progPct.textContent = pct + '% Accuracy';
        }

        function render() {
          container.innerHTML = '';
          currentList.forEach((item, index) => {
            const slot = document.createElement('div');
            slot.className = 'timeline-slot';

            const node = document.createElement('div');
            node.className = 'timeline-slot-node';
            node.id = 'node-' + index;

            const card = document.createElement('div');
            card.className = 'timeline-card';
            card.draggable = !isChronologicalView;
            card.dataset.index = index;

            card.innerHTML = 
              '<span class="drag-handle" title="Drag to rearrange">⠿</span>' +
              '<div class="order-pill">' + (index + 1) + '</div>' +
              '<div style="flex:1;min-width:0;">' +
                '<h3 style="font-weight:700;font-size:0.95rem;color:var(--foreground);margin-bottom:0.25rem;line-height:1.4;">' + item.text + '</h3>' +
                '<p class="muted" style="font-size:0.825rem;line-height:1.5;margin:0;">' + item.detail + '</p>' +
              '</div>' +
              (!isChronologicalView ? (
                '<div style="display:flex;flex-direction:column;gap:0.25rem;flex-shrink:0;">' +
                  '<button class="move-btn" onclick="moveItem(' + index + ', -1)" title="Move earlier in timeline">▲</button>' +
                  '<button class="move-btn" onclick="moveItem(' + index + ', 1)" title="Move later in timeline">▼</button>' +
                '</div>'
              ) : '');

            card.addEventListener('dragstart', (e) => {
              card.classList.add('dragging');
              e.dataTransfer.setData('text/plain', index);
            });
            card.addEventListener('dragend', () => card.classList.remove('dragging'));
            card.addEventListener('dragover', (e) => {
              e.preventDefault();
              const dragging = document.querySelector('.dragging');
              if (dragging && dragging !== card) {
                const targetIdx = parseInt(card.dataset.index, 10);
                const dragIdx = parseInt(dragging.dataset.index, 10);
                if (targetIdx !== dragIdx) {
                  const moved = currentList.splice(dragIdx, 1)[0];
                  currentList.splice(targetIdx, 0, moved);
                  render();
                }
              }
            });

            slot.appendChild(node);
            slot.appendChild(card);
            container.appendChild(slot);
          });
        }

        window.moveItem = function(fromIdx, dir) {
          const toIdx = fromIdx + dir;
          if (toIdx < 0 || toIdx >= currentList.length) return;
          const temp = currentList[fromIdx];
          currentList[fromIdx] = currentList[toIdx];
          currentList[toIdx] = temp;
          fbEl.style.display = 'none';
          render();
        };

        document.getElementById('btn-check-order').onclick = () => {
          let correctCount = 0;
          const cards = container.querySelectorAll('.timeline-card');
          currentList.forEach((item, i) => {
            const expected = ORIGINAL[i];
            const isMatch = item.text === expected.text;
            if (isMatch) correctCount++;
            if (cards[i]) {
              cards[i].classList.remove('correct-order', 'wrong-order');
              cards[i].classList.add(isMatch ? 'correct-order' : 'wrong-order');
            }
            const node = document.getElementById('node-' + i);
            if (node) {
              node.classList.toggle('locked', isMatch);
            }
          });

          updateProgress(correctCount);
          fbEl.style.display = 'block';
          if (correctCount === currentList.length) {
            fbEl.innerHTML = '<strong style="color:#10b981;font-size:1.05rem;">🎉 Flawless Historical Sequence! (100%)</strong><br><span class="muted text-xs">All milestones are positioned in true chronological sequence from earliest to latest.</span>';
          } else {
            fbEl.innerHTML = '<strong style="color:#f59e0b;font-size:0.95rem;">' + correctCount + ' / ' + currentList.length + ' Milestones in Correct Chronological Order</strong><br><span class="muted text-xs">Review the red highlighted items and adjust their position along the timeline spine.</span>';
          }
        };

        document.getElementById('btn-shuffle-order').onclick = () => {
          isChronologicalView = false;
          fbEl.style.display = 'none';
          currentList.sort(() => Math.random() - 0.5);
          updateProgress(0);
          render();
        };

        document.getElementById('btn-reveal-timeline').onclick = () => {
          isChronologicalView = true;
          fbEl.style.display = 'none';
          currentList = [...ORIGINAL];
          updateProgress(ORIGINAL.length);
          render();
          const cards = container.querySelectorAll('.timeline-card');
          cards.forEach(c => c.classList.add('correct-order'));
          document.querySelectorAll('.timeline-slot-node').forEach(n => n.classList.add('locked'));
        };

        render();
        updateProgress(0);
      </script>
    </body></html>`;
  }

  // 4. Study Notes / Accordion Template
  if (type.includes('study') || type.includes('notes') || type.includes('guide')) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>/* INJECT_THEME_CSS */</style></head><body><div id="app"><header id="app-header"><h1>${title}</h1><p>${description}</p><span id="app-progress">${items.length} Topics</span></header><main id="app-main"><div class="w-full max-w-3xl" style="margin-bottom:1rem;"><input type="text" id="search-input" placeholder="🔍 Search study notes..." /></div><div class="w-full max-w-3xl text-left" id="notes-container" style="display:grid;gap:0.75rem;"></div></main></div><script>const DATA=${itemsJson};const container=document.getElementById('notes-container');const input=document.getElementById('search-input');function render(filter=''){container.innerHTML='';const q=filter.toLowerCase().trim();DATA.forEach((item)=>{if(q && !item.front.toLowerCase().includes(q) && !item.back.toLowerCase().includes(q)) return;const card=document.createElement('div');card.className='card';card.innerHTML='<h3 style="font-weight:700;font-size:1.05rem;color:var(--primary);margin-bottom:0.5rem;">'+item.front+'</h3><p class="muted" style="font-size:0.9rem;line-height:1.6;white-space:pre-wrap;">'+item.back+'</p>';container.appendChild(card);});}input.addEventListener('input',e=>render(e.target.value));render();</script></body></html>`;
  }

  // 6. Cloze Deletion / Rapid Blurting Template (Checked before general blurting)
  if (type.includes('cloze') || type.includes('occlusion') || type.includes('rapid-blurting') || type.includes('fill-in-the-blank')) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>/* INJECT_THEME_CSS */.cloze-mask{display:inline-block;padding:0.15rem 0.5rem;margin:0 0.2rem;border-radius:0.375rem;background:#21262E;color:#5A7D99;font-weight:700;cursor:pointer;border:1px dashed #5A7D99;user-select:none;transition:all 0.2s;}.cloze-mask.revealed{background:rgba(16,185,129,0.15);color:#10b981;border:1px solid #10b981;}</style></head><body><div id="app"><header id="app-header"><div style="display:flex;align-items:center;gap:0.5rem;justify-content:center;"><span class="badge" style="background:#5A7D99;color:white;">⚡ Rapid Cloze Blurting</span></div><h1 style="margin-top:0.25rem;">${title}</h1><p>${description}</p><span id="app-progress">0 Revealed</span></header><main id="app-main"><div class="w-full max-w-3xl" style="display:flex;gap:0.5rem;margin-bottom:0.75rem;"><button class="btn btn-primary" id="blur-all-btn">🔒 Blur All</button><button class="btn btn-secondary" id="reveal-all-btn">👁️ Reveal All</button><button class="btn btn-secondary" id="test-mode-btn">✍️ Typing Test Mode</button></div><div class="w-full max-w-3xl text-left" id="cloze-container" style="display:grid;gap:0.85rem;"></div><div class="w-full max-w-3xl card text-left" id="test-container" style="display:none;margin-top:1rem;"><h3 style="font-weight:700;font-size:1.05rem;margin-bottom:0.5rem;color:var(--foreground);">Active Recall Typing Test</h3><p id="test-prompt" class="muted" style="font-size:0.9rem;margin-bottom:0.75rem;"></p><div style="display:flex;gap:0.5rem;"><input type="text" id="test-input" placeholder="Type missing term here..." style="flex:1;padding:0.6rem;border-radius:0.5rem;background:var(--background);color:var(--foreground);border:1px solid var(--border);" /><button class="btn btn-primary" id="test-submit-btn">Submit</button></div><p id="test-feedback" style="margin-top:0.5rem;font-size:0.85rem;font-weight:700;"></p></div></main></div><script>const DATA=${itemsJson};const container=document.getElementById('cloze-container');const progress=document.getElementById('app-progress');let totalBlanks=0;let revealedBlanks=0;function render(){container.innerHTML='';totalBlanks=0;revealedBlanks=0;DATA.forEach((item,idx)=>{const card=document.createElement('div');card.className='card';const front=item.front||item.concept||('Topic '+(idx+1));const rawText=item.back||item.sentence||item.text||'';let processedHtml=rawText.replace(/\\[([^\\]]+)\\]/g,(m,val)=>{totalBlanks++;return '<span class="cloze-mask" data-answer="'+val+'">[ Click to Reveal ]</span>';});if(!rawText.includes('[')){const words=rawText.split(' ');if(words.length>4){totalBlanks++;const targetWord=words[Math.floor(words.length/2)];processedHtml=rawText.replace(targetWord,'<span class="cloze-mask" data-answer="'+targetWord+'">[ Click to Reveal ]</span>');}}card.innerHTML='<h3 style="font-weight:700;font-size:1rem;color:var(--primary);margin-bottom:0.4rem;">'+front+'</h3><div style="font-size:0.9rem;line-height:1.7;color:var(--foreground);">'+processedHtml+'</div>';container.appendChild(card);});container.querySelectorAll('.cloze-mask').forEach(span=>{span.onclick=()=>{if(!span.classList.contains('revealed')){span.classList.add('revealed');span.textContent=span.dataset.answer;revealedBlanks++;progress.textContent=revealedBlanks+' / '+totalBlanks+' Revealed';}else{span.classList.remove('revealed');span.textContent='[ Click to Reveal ]';revealedBlanks=Math.max(0,revealedBlanks-1);progress.textContent=revealedBlanks+' / '+totalBlanks+' Revealed';}};});progress.textContent='0 / '+totalBlanks+' Revealed';}document.getElementById('blur-all-btn').onclick=()=>{container.querySelectorAll('.cloze-mask').forEach(span=>{span.classList.remove('revealed');span.textContent='[ Click to Reveal ]';});revealedBlanks=0;progress.textContent='0 / '+totalBlanks+' Revealed';};document.getElementById('reveal-all-btn').onclick=()=>{container.querySelectorAll('.cloze-mask').forEach(span=>{span.classList.add('revealed');span.textContent=span.dataset.answer;});revealedBlanks=totalBlanks;progress.textContent=totalBlanks+' / '+totalBlanks+' Revealed';};let testIdx=0;document.getElementById('test-mode-btn').onclick=()=>{const tc=document.getElementById('test-container');tc.style.display=tc.style.display==='none'?'block':'none';if(tc.style.display==='block'){loadTestItem();}};function loadTestItem(){const item=DATA[testIdx%DATA.length]||{};document.getElementById('test-prompt').textContent=(item.front||'Concept')+': '+(item.sentence||item.back||'').replace(/\\[([^\\]]+)\\]/g,'[ ___ ]');document.getElementById('test-input').value='';document.getElementById('test-feedback').textContent='';}document.getElementById('test-submit-btn').onclick=()=>{const item=DATA[testIdx%DATA.length]||{};const val=document.getElementById('test-input').value.trim().toLowerCase();const ans=(item.answer||(item.back?item.back.match(/\\[([^\\]]+)\\]/)?.[1]:'')||'').toLowerCase();const fb=document.getElementById('test-feedback');if(val && ans && val.includes(ans)||ans.includes(val)){fb.style.color='#10b981';fb.textContent='✅ Spot on! Correct answer is: '+ans;setTimeout(()=>{testIdx++;loadTestItem();},1500);}else{fb.style.color='#ef4444';fb.textContent='❌ Incorrect. Expected: '+ans;}};render();</script></body></html>`;
  }

  // 7. Feynman / Blurting Audio & Text Grader Template
  if (type.includes('feynman') || (type.includes('blurting') && !type.includes('cloze')) || type.includes('grader')) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>/* INJECT_THEME_CSS */.mic-recording{background:#ef4444!important;border-color:#ef4444!important;color:#fff!important;animation:pulse 1.5s infinite;}</style></head><body><div id="app"><header id="app-header"><div style="display:flex;align-items:center;gap:0.5rem;justify-content:center;"><span class="badge" style="background:#5A7D99;color:white;">🧠 Feynman Active Recall</span></div><h1 style="margin-top:0.25rem;">${title}</h1><p>${description}</p><span id="app-progress">1 / ${Math.max(items.length, 1)} Concepts</span></header><main id="app-main"><div class="card w-full max-w-2xl text-left" id="feynman-card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;"><span id="concept-badge" class="badge">Concept 1</span><span id="score-badge" class="muted text-xs" style="font-weight:600;">Mastery: 0%</span></div><h2 id="concept-title" style="font-size:1.2rem;font-weight:700;margin-bottom:0.4rem;color:var(--foreground);"></h2><p id="concept-prompt" class="muted" style="font-size:0.9rem;margin-bottom:1rem;"></p><div style="position:relative;margin-bottom:0.75rem;"><textarea id="user-explanation" rows="4" placeholder="Explain this concept in your own words as simply as possible (or click Speak Answer)..." style="width:100%;padding:0.85rem;padding-bottom:2.5rem;border-radius:0.75rem;background:var(--background);color:var(--foreground);border:1px solid var(--border);font-size:0.875rem;resize:vertical;line-height:1.5;"></textarea><button id="mic-btn" style="position:absolute;right:0.65rem;bottom:0.65rem;padding:0.4rem 0.75rem;border-radius:0.5rem;background:#282E38;border:1px solid #3A4250;color:#fff;cursor:pointer;font-size:0.75rem;font-weight:600;display:flex;align-items:center;gap:0.35rem;transition:all 0.2s;box-shadow:0 2px 4px rgba(0,0,0,0.2);">🎙️ <span id="mic-label">Speak Answer</span></button></div><div id="mic-status" style="display:none;font-size:0.75rem;color:#ef4444;margin-bottom:0.5rem;font-weight:600;align-items:center;gap:0.3rem;">🔴 <span>Listening to your voice... Speak your explanation now</span></div><div style="display:flex;gap:0.5rem;"><button class="btn btn-primary w-full" id="grade-btn">⚡ Grade My Explanation</button><button class="btn btn-secondary" id="exemplar-btn" style="white-space:nowrap;">Model Answer</button></div><div id="feedback-panel" class="card" style="display:none;margin-top:1rem;background:var(--muted);border:1px solid var(--border);padding:1rem;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;"><h4 style="font-weight:700;font-size:0.95rem;color:var(--foreground);">Feynman Rubric Assessment</h4><span id="feedback-grade" style="font-weight:800;font-size:1rem;color:var(--primary);"></span></div><div id="rubric-checklist" style="display:grid;gap:0.4rem;font-size:0.82rem;margin-bottom:0.75rem;"></div><div id="exemplar-box" style="display:none;padding:0.65rem;border-radius:0.5rem;background:rgba(90,125,153,0.15);border:1px solid rgba(90,125,153,0.3);font-size:0.82rem;color:var(--foreground);"><strong style="color:#5A7D99;">Exemplar Explanation:</strong> <span id="exemplar-text"></span></div></div></div></main><footer id="app-footer"><button class="btn btn-secondary" id="prev-btn">Previous</button><button class="btn btn-secondary" id="next-btn">Next Concept</button></footer></div><script>const DATA=${itemsJson};let idx=0;let isRecording=false;let recognition=null;const micBtn=document.getElementById('mic-btn');const micLabel=document.getElementById('mic-label');const micStatus=document.getElementById('mic-status');const userExp=document.getElementById('user-explanation');const SpeechRec=window.SpeechRecognition||window.webkitSpeechRecognition;if(SpeechRec){try{recognition=new SpeechRec();recognition.continuous=true;recognition.interimResults=true;recognition.lang='en-US';recognition.onresult=(e)=>{let txt='';for(let i=e.resultIndex;i<e.results.length;++i){txt+=e.results[i][0].transcript;}if(txt.trim()){userExp.value=txt.trim();}};recognition.onend=()=>{isRecording=false;micBtn.style.background='#282E38';micLabel.textContent='Speak Answer';micStatus.style.display='none';};}catch(err){console.warn('In-iframe speech init:',err);}}window.addEventListener('message',(e)=>{if(e.data?.type==='VOICE_RESULT'&&e.data.transcript){userExp.value=e.data.transcript;}if(e.data?.type==='VOICE_STATUS'){isRecording=!!e.data.isListening;if(isRecording){micBtn.style.background='#ef4444';micLabel.textContent='Listening...';micStatus.style.display='flex';}else{micBtn.style.background='#282E38';micLabel.textContent='Speak Answer';micStatus.style.display='none';}}});const conceptBadge=document.getElementById('concept-badge');const conceptTitle=document.getElementById('concept-title');const conceptPrompt=document.getElementById('concept-prompt');const feedbackPanel=document.getElementById('feedback-panel');const feedbackGrade=document.getElementById('feedback-grade');const rubricChecklist=document.getElementById('rubric-checklist');const exemplarBox=document.getElementById('exemplar-box');const exemplarText=document.getElementById('exemplar-text');const progress=document.getElementById('app-progress');const scoreBadge=document.getElementById('score-badge');function render(){if(!DATA.length)return;const item=DATA[idx]||{};progress.textContent=(idx+1)+' / '+DATA.length+' Concepts';conceptBadge.textContent='Concept '+(idx+1);conceptTitle.textContent=item.concept||item.front||item.title||'Concept '+(idx+1);conceptPrompt.textContent=item.prompt||item.question||'Explain the core mechanism, definitions, and why this works in your own words:';userExp.value='';feedbackPanel.style.display='none';exemplarBox.style.display='none';}function gradeExplanation(){const item=DATA[idx]||{};const text=userExp.value.trim().toLowerCase();if(!text){alert('Please type or record your explanation first!');return;}const rawKeys=item.keyPoints||item.rubric||(item.back?item.back.split('.'):['definition','function','mechanism']);const keyPoints=Array.isArray(rawKeys)?rawKeys:String(rawKeys).split(',');let matched=0;rubricChecklist.innerHTML='';keyPoints.forEach(kp=>{const cleanKp=String(kp).trim();if(!cleanKp)return;const words=cleanKp.toLowerCase().split(/\\s+/).filter(w=>w.length>3);const hit=words.some(w=>text.includes(w));if(hit)matched++;const row=document.createElement('div');row.style.display='flex';row.style.alignItems='flex-start';row.style.gap='0.4rem';row.innerHTML=(hit?'<span style="color:#10b981;">✅</span>':'<span style="color:#f59e0b;">⚠️</span>')+'<span>'+cleanKp+'</span>';rubricChecklist.appendChild(row);});const pct=Math.round((matched/Math.max(keyPoints.length,1))*100);feedbackGrade.textContent=pct+'% Coverage';scoreBadge.textContent='Mastery: '+pct+'%';exemplarText.textContent=item.exemplar||item.back||'Master definition and explanation.';feedbackPanel.style.display='block';}document.getElementById('grade-btn').onclick=gradeExplanation;document.getElementById('exemplar-btn').onclick=()=>{exemplarBox.style.display=exemplarBox.style.display==='none'?'block':'none';};micBtn.onclick=()=>{try{window.parent?.postMessage({type:isRecording?'STOP_TOOL_SPEECH':'START_TOOL_SPEECH'},'*');}catch(e){}if(recognition){if(isRecording){try{recognition.stop();}catch(e){}isRecording=false;micBtn.style.background='#282E38';micLabel.textContent='Speak Answer';micStatus.style.display='none';}else{try{recognition.start();isRecording=true;micBtn.style.background='#ef4444';micLabel.textContent='Listening...';micStatus.style.display='flex';}catch(e){isRecording=true;micBtn.style.background='#ef4444';micLabel.textContent='Listening...';micStatus.style.display='flex';}}}else{isRecording=!isRecording;if(isRecording){micBtn.style.background='#ef4444';micLabel.textContent='Listening...';micStatus.style.display='flex';}else{micBtn.style.background='#282E38';micLabel.textContent='Speak Answer';micStatus.style.display='none';}}};document.getElementById('prev-btn').onclick=()=>{idx=(idx-1+DATA.length)%DATA.length;render();};document.getElementById('next-btn').onclick=()=>{idx=(idx+1)%DATA.length;render();};render();</script></body></html>`;
  }

  // 8. Branching Case Studies & Decision Trees Template
  if (type.includes('scenario') || type.includes('branching') || type.includes('decision-tree') || type.includes('case-study')) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>/* INJECT_THEME_CSS */</style></head><body><div id="app"><header id="app-header"><div style="display:flex;align-items:center;gap:0.5rem;justify-content:center;"><span class="badge" style="background:#5A7D99;color:white;">🌿 Branching Decision Scenario</span></div><h1 style="margin-top:0.25rem;">${title}</h1><p>${description}</p><span id="app-progress">Stage 1</span></header><main id="app-main"><div class="card w-full max-w-2xl text-left" id="scenario-card"><span id="scenario-stage-badge" class="badge" style="margin-bottom:0.75rem;">Phase 1</span><h2 id="scenario-title" style="font-size:1.2rem;font-weight:700;margin-bottom:0.5rem;color:var(--foreground);"></h2><p id="scenario-situation" style="font-size:0.95rem;line-height:1.6;margin-bottom:1.25rem;color:var(--foreground);"></p><h4 style="font-weight:700;font-size:0.9rem;margin-bottom:0.75rem;color:var(--primary);">What is your decision?</h4><div id="choices-container" style="display:grid;gap:0.65rem;"></div><div id="consequence-panel" class="card" style="display:none;margin-top:1rem;background:var(--muted);border:1px solid var(--border);padding:1rem;"><h4 id="consequence-heading" style="font-weight:700;font-size:0.95rem;margin-bottom:0.35rem;"></h4><p id="consequence-text" style="font-size:0.875rem;line-height:1.5;margin-bottom:0.75rem;color:var(--foreground);"></p><button class="btn btn-primary w-full" id="next-stage-btn">Proceed to Next Branch</button></div></div><div class="card w-full max-w-md text-center" id="conclusion-card" style="display:none;"><h2 style="font-size:1.4rem;font-weight:700;margin-bottom:0.5rem;color:var(--foreground);">Case Resolution Reached! 🏆</h2><p id="final-stats" class="muted" style="font-size:0.95rem;line-height:1.6;margin:1rem 0;"></p><button class="btn btn-primary w-full" id="restart-scenario-btn">Replay Scenario</button></div></main></div><script>const DATA=${itemsJson};let idx=0;let answered=false;const stageBadge=document.getElementById('scenario-stage-badge');const sTitle=document.getElementById('scenario-title');const sSituation=document.getElementById('scenario-situation');const choicesBox=document.getElementById('choices-container');const consequencePanel=document.getElementById('consequence-panel');const consequenceHeading=document.getElementById('consequence-heading');const consequenceText=document.getElementById('consequence-text');const progress=document.getElementById('app-progress');const card=document.getElementById('scenario-card');const conclusionCard=document.getElementById('conclusion-card');function render(){if(!DATA.length)return;if(idx>=DATA.length){card.style.display='none';conclusionCard.style.display='block';document.getElementById('final-stats').textContent='You successfully navigated all decision branches of this clinical/professional case study!';return;}answered=false;card.style.display='block';conclusionCard.style.display='none';consequencePanel.style.display='none';const item=DATA[idx]||{};progress.textContent='Phase '+(idx+1)+' of '+DATA.length;stageBadge.textContent='Decision Node '+(idx+1);sTitle.textContent=item.title||item.concept||'Dilemma '+(idx+1);sSituation.textContent=item.situation||item.question||item.front||'Scenario context';choicesBox.innerHTML='';const options=item.options||item.choices||[{text:'Option A',consequence:'Standard path.'},{text:'Option B',consequence:'Alternative path.'}];options.forEach((opt,optIdx)=>{const optText=typeof opt==='string'?opt:(opt.text||opt.choice);const btn=document.createElement('button');btn.className='btn btn-secondary text-left';btn.style.justifyContent='flex-start';btn.style.padding='0.85rem 1rem';btn.innerHTML='<span style="font-weight:700;margin-right:0.5rem;">Action '+(optIdx+1)+':</span> '+optText;btn.onclick=()=>{if(answered)return;answered=true;btn.className='btn correct text-left';consequencePanel.style.display='block';const consequence=typeof opt==='object'&&opt.consequence?opt.consequence:(item.reasoning||item.explanation||'You executed this action. Evaluating consequence...');consequenceHeading.textContent='Consequence & Outcomes';consequenceHeading.style.color='#5A7D99';consequenceText.textContent=consequence;};choicesBox.appendChild(btn);});}document.getElementById('next-stage-btn').onclick=()=>{idx++;render();};document.getElementById('restart-scenario-btn').onclick=()=>{idx=0;render();};render();</script></body></html>`;
  }

  // 9. 3-in-1 Revision Kit Template
  if (type.includes('revision-kit') || type.includes('exam-bundle') || type.includes('bundle')) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>/* INJECT_THEME_CSS */.tab-btn.active{background:#5A7D99;color:white;font-weight:700;}</style></head><body><div id="app"><header id="app-header"><div style="display:flex;align-items:center;gap:0.5rem;justify-content:center;"><span class="badge" style="background:#5A7D99;color:white;">📦 3-in-1 Revision Kit</span></div><h1 style="margin-top:0.25rem;">${title}</h1><p>${description}</p><div style="display:flex;justify-content:center;gap:0.5rem;margin-top:0.75rem;"><button class="btn btn-secondary tab-btn active" id="tab-notes">📑 Cornell Notes</button><button class="btn btn-secondary tab-btn" id="tab-cards">🗂️ Flashcards</button><button class="btn btn-secondary tab-btn" id="tab-quiz">⏱️ Timed Quiz</button></div></header><main id="app-main"><div id="view-notes" class="w-full max-w-3xl text-left" style="display:grid;gap:0.75rem;"></div><div id="view-cards" class="w-full max-w-2xl text-center" style="display:none;"><div class="card" id="kit-card" style="min-height:220px;display:flex;flex-direction:column;justify-content:center;cursor:pointer;"><span class="badge" id="kit-card-badge" style="margin:0 auto 0.5rem auto;">Front</span><h2 id="kit-card-text" style="font-size:1.15rem;font-weight:700;color:var(--foreground);"></h2></div><div style="display:flex;gap:0.5rem;margin-top:0.75rem;justify-content:center;"><button class="btn btn-secondary" id="kit-card-prev">Prev</button><button class="btn btn-primary" id="kit-card-flip">Flip</button><button class="btn btn-secondary" id="kit-card-next">Next</button></div></div><div id="view-quiz" class="w-full max-w-2xl text-left" style="display:none;"><div class="card"><div style="display:flex;justify-content:space-between;margin-bottom:0.5rem;"><span id="quiz-progress-badge" class="badge">Q1</span><span id="timer-badge" class="badge" style="background:#ef4444;color:white;">⏱️ 60s</span></div><h3 id="quiz-q-text" style="font-size:1.1rem;font-weight:700;margin-bottom:0.75rem;color:var(--foreground);"></h3><div id="quiz-choices" style="display:grid;gap:0.5rem;"></div></div></div></main></div><script>const DATA=${itemsJson};let cardIdx=0;let cardFlipped=false;let quizIdx=0;let quizScore=0;let timeLeft=60;let timerInterval=null;const notesView=document.getElementById('view-notes');const cardsView=document.getElementById('view-cards');const quizView=document.getElementById('view-quiz');function showTab(t){document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));notesView.style.display='none';cardsView.style.display='none';quizView.style.display='none';if(t==='notes'){document.getElementById('tab-notes').classList.add('active');notesView.style.display='grid';}else if(t==='cards'){document.getElementById('tab-cards').classList.add('active');cardsView.style.display='block';renderCard();}else if(t==='quiz'){document.getElementById('tab-quiz').classList.add('active');quizView.style.display='block';startQuiz();}}document.getElementById('tab-notes').onclick=()=>showTab('notes');document.getElementById('tab-cards').onclick=()=>showTab('cards');document.getElementById('tab-quiz').onclick=()=>showTab('quiz');DATA.forEach((item,i)=>{const c=document.createElement('div');c.className='card';c.innerHTML='<h3 style="font-weight:700;font-size:1rem;color:var(--primary);margin-bottom:0.35rem;">'+(item.front||item.concept||'Topic '+(i+1))+'</h3><p class="muted" style="font-size:0.875rem;line-height:1.6;">'+(item.back||item.detail||item.explanation||'')+'</p>';notesView.appendChild(c);});function renderCard(){const it=DATA[cardIdx]||{};const b=document.getElementById('kit-card-badge');const txt=document.getElementById('kit-card-text');if(cardFlipped){b.textContent='Back';b.className='badge correct';txt.textContent=it.back||it.answer||'';}else{b.textContent='Front (Click to Flip)';b.className='badge';txt.textContent=it.front||it.concept||it.question||'';}}document.getElementById('kit-card').onclick=()=>{cardFlipped=!cardFlipped;renderCard();};document.getElementById('kit-card-flip').onclick=()=>{cardFlipped=!cardFlipped;renderCard();};document.getElementById('kit-card-prev').onclick=()=>{cardIdx=(cardIdx-1+DATA.length)%DATA.length;cardFlipped=false;renderCard();};document.getElementById('kit-card-next').onclick=()=>{cardIdx=(cardIdx+1)%DATA.length;cardFlipped=false;renderCard();};function startQuiz(){if(!timerInterval){timeLeft=60;timerInterval=setInterval(()=>{timeLeft--;document.getElementById('timer-badge').textContent='⏱️ '+timeLeft+'s';if(timeLeft<=0){clearInterval(timerInterval);alert('Time is up! Quiz finished.');}},1000);}renderQuizItem();}function renderQuizItem(){const it=DATA[quizIdx%DATA.length]||{};document.getElementById('quiz-progress-badge').textContent='Q '+(quizIdx+1)+' of '+DATA.length;document.getElementById('quiz-q-text').textContent=it.question||('What best defines: '+(it.front||it.concept)+'?');const box=document.getElementById('quiz-choices');box.innerHTML='';const correct=it.back||it.answer||'Correct definition';const options=[correct,'Alternative misconception A','Alternative misconception B','None of the above'].sort(()=>Math.random()-0.5);options.forEach(opt=>{const btn=document.createElement('button');btn.className='btn btn-secondary text-left';btn.textContent=opt;btn.onclick=()=>{if(opt===correct){btn.className='btn correct text-left';quizScore++;}else{btn.className='btn incorrect text-left';}setTimeout(()=>{quizIdx++;if(quizIdx>=DATA.length){alert('Quiz completed! Score: '+quizScore+'/'+DATA.length);}else{renderQuizItem();}},1200);};box.appendChild(btn);});}showTab('notes');</script></body></html>`;
  }

  // 10. Authentic 2D Interlocking Crossword Puzzle Template
  if (type.includes('crossword')) {
    let cleanItems = (items || []).filter(it => (it.word || it.front || it.concept || '').length >= 2);
    if (cleanItems.length === 0) {
      // Fallback domain-aware terms if empty
      cleanItems = [
        { word: 'CRANIUM', clue: 'The skull, especially the part enclosing the brain' },
        { word: 'FEMUR', clue: 'The thigh bone, longest and strongest bone in the human body' },
        { word: 'CLAVICLE', clue: 'The collarbone connecting the breastplate to the shoulder' },
        { word: 'PATELLA', clue: 'The kneecap bone protecting the knee joint' },
        { word: 'SCAPULA', clue: 'The shoulder blade bone' },
        { word: 'STERNUM', clue: 'The central flat bone of the chest known as the breastbone' },
        { word: 'TIBIA', clue: 'The larger and stronger of the two lower leg bones (shinbone)' },
        { word: 'RADIUS', clue: 'One of the two large bones of the forearm on the thumb side' },
        { word: 'VERTEBRA', clue: 'Each of the series of small bones forming the backbone' },
        { word: 'HUMERUS', clue: 'The long bone of the upper arm extending from shoulder to elbow' }
      ];
    }

    const layout = buildCrosswordLayout(cleanItems) || {
      gridRows: 12,
      gridCols: 12,
      words: cleanItems.map((it, i) => ({
        word: String(it.word || it.front || it.concept || 'BONE').toUpperCase().replace(/[^A-Z]/g, ''),
        clue: String(it.clue || it.back || it.detail || it.explanation || 'Anatomical structure definition'),
        direction: i % 2 === 0 ? 'across' : 'down',
        startRow: (i * 2) % 10 + 1,
        startCol: 1,
        number: i + 1
      }))
    };
    const layoutJson = JSON.stringify(layout);

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>/* INJECT_THEME_CSS */
.cw-container{display:flex;flex-direction:row;gap:1.5rem;width:100%;max-width:1200px;align-items:flex-start;justify-content:center;flex-wrap:wrap;}
.cw-board-wrapper{flex:1 1 540px;min-width:320px;display:flex;flex-direction:column;align-items:center;}
.cw-board{display:inline-grid;grid-template-columns:repeat(${layout.gridCols},38px);grid-template-rows:repeat(${layout.gridRows},38px);gap:2px;background:transparent;padding:6px;border-radius:0.75rem;margin:0 auto;}
.cw-cell{position:relative;width:38px;height:38px;display:flex;align-items:center;justify-content:center;user-select:none;box-sizing:border-box;}
.cw-cell.empty-cell{visibility:hidden;pointer-events:none;background:transparent;}
.cw-cell.active-cell{background:#ffffff;border:1.5px solid #cbd5e1;border-radius:4px;box-shadow:0 1px 3px rgba(0,0,0,0.12);transition:all 0.15s;}
.cw-cell.active-cell.highlight{background:#e0e7ff;border-color:#6366f1;box-shadow:0 0 0 2px rgba(99,102,241,0.4);}
.cw-cell-num{position:absolute;top:1px;left:3px;font-size:10px;font-weight:800;color:#64748b;line-height:1;pointer-events:none;}
.cw-cell input{width:100%;height:100%;text-align:center;font-size:18px;font-weight:800;text-transform:uppercase;background:transparent;border:none;outline:none;color:#0f172a;caret-color:#6366f1;padding:0;cursor:pointer;}
.cw-cell.correct{background:#d1fae5!important;border-color:#10b981!important;}
.cw-cell.correct input{color:#065f46!important;}
.cw-cell.wrong{background:#fee2e2!important;border-color:#ef4444!important;}
.cw-cell.wrong input{color:#991b1b!important;}
.cw-sidebar{flex:1 1 360px;min-width:300px;max-width:460px;display:flex;flex-direction:column;gap:1rem;}
.clue-scroll{max-height:360px;overflow-y:auto;display:grid;gap:0.4rem;padding-right:0.35rem;}
.clue-item{padding:0.6rem 0.85rem;border-radius:0.5rem;background:var(--background);border:1px solid var(--border);cursor:pointer;font-size:0.85rem;line-height:1.45;transition:all 0.15s;text-align:left;}
.clue-item:hover,.clue-item.active{border-color:#6366f1;background:rgba(99,102,241,0.12);}
</style></head><body><div id="app"><header id="app-header"><div style="display:flex;align-items:center;gap:0.5rem;justify-content:center;"><span class="badge" style="background:#6366f1;color:white;">🧩 2D Crossword Grid</span></div><h1 style="margin-top:0.25rem;">${title}</h1><p>${description}</p><span id="app-progress">0 / ${layout.words.length} Solved</span></header><main id="app-main"><div class="cw-container"><div class="card cw-board-wrapper"><div style="width:100%;overflow-x:auto;display:flex;justify-content:center;padding:0.5rem 0;"><div class="cw-board" id="board"></div></div><div style="display:flex;gap:0.75rem;margin-top:1.25rem;width:100%;justify-content:center;"><button class="btn btn-primary" id="check-btn">⚡ Check Puzzle</button><button class="btn btn-secondary" id="reveal-btn">Reveal Answers</button></div></div><div class="cw-sidebar"><div class="card text-left" style="padding:1rem;"><div id="active-clue-banner" style="background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.3);padding:0.75rem;border-radius:0.5rem;font-size:0.875rem;line-height:1.4;margin-bottom:0.75rem;"><strong id="banner-label" style="color:#818cf8;">Select a clue to begin:</strong> <span id="banner-text">Click any clue below or tap a grid square to type your answer.</span></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;"><div class="clue-section"><h4 style="font-weight:700;font-size:0.9rem;color:#818cf8;border-bottom:1px solid var(--border);padding-bottom:0.35rem;margin-bottom:0.4rem;">Across</h4><div class="clue-scroll" id="across-clues"></div></div><div class="clue-section"><h4 style="font-weight:700;font-size:0.9rem;color:#818cf8;border-bottom:1px solid var(--border);padding-bottom:0.35rem;margin-bottom:0.4rem;">Down</h4><div class="clue-scroll" id="down-clues"></div></div></div></div></div></div></main></div><script>const SPEC=${layoutJson};const board=document.getElementById('board');const acrossBox=document.getElementById('across-clues');const downBox=document.getElementById('down-clues');const bannerLabel=document.getElementById('banner-label');const bannerText=document.getElementById('banner-text');const progress=document.getElementById('app-progress');const cellMap=new Map();SPEC.words.forEach(w=>{const dr=w.direction==='down'?1:0;const dc=w.direction==='across'?1:0;for(let i=0;i<w.word.length;i++){const r=w.startRow+dr*i;const c=w.startCol+dc*i;const k=r+','+c;if(!cellMap.has(k)) cellMap.set(k,{r,c,letter:w.word[i],num:i===0?w.number:null,words:[]});cellMap.get(k).words.push(w);if(i===0) cellMap.get(k).num=w.number;}});for(let r=1;r<=SPEC.gridRows;r++){for(let c=1;c<=SPEC.gridCols;c++){const k=r+','+c;const div=document.createElement('div');div.className='cw-cell';if(cellMap.has(k)){const info=cellMap.get(k);div.className='cw-cell active-cell';div.id='cell-'+r+'-'+c;if(info.num){const numSpan=document.createElement('span');numSpan.className='cw-cell-num';numSpan.textContent=info.num;div.appendChild(numSpan);}const input=document.createElement('input');input.maxLength=1;input.dataset.r=r;input.dataset.c=c;input.dataset.ans=info.letter;input.oninput=(e)=>{e.target.value=e.target.value.toUpperCase();if(e.target.value){moveToNext(r,c);}};input.onkeydown=(e)=>{if(e.key==='Backspace' && !input.value){moveToPrev(r,c);}if(e.key==='ArrowRight') moveTo(r,c+1);if(e.key==='ArrowLeft') moveTo(r,c-1);if(e.key==='ArrowDown') moveTo(r+1,c);if(e.key==='ArrowUp') moveTo(r-1,c);};input.onfocus=()=>{highlightWordForCell(info.words[0]);};div.appendChild(input);}else{div.className='cw-cell empty-cell';}board.appendChild(div);}}function renderClues(){SPEC.words.forEach(w=>{const el=document.createElement('div');el.className='clue-item';el.id='clue-'+w.number+'-'+w.direction;el.innerHTML='<strong>'+w.number+'.</strong> '+w.clue+' <span style="color:#94a3b8;font-size:0.75rem;font-weight:700;">('+w.word.length+')</span>';el.onclick=()=>focusWord(w);if(w.direction==='across') acrossBox.appendChild(el); else downBox.appendChild(el);});}function focusWord(w){document.querySelectorAll('.clue-item').forEach(c=>c.classList.remove('active'));const clueEl=document.getElementById('clue-'+w.number+'-'+w.direction);if(clueEl) clueEl.classList.add('active');bannerLabel.textContent=w.number+' '+w.direction.toUpperCase()+' ('+w.word.length+' letters):';bannerText.textContent=w.clue;highlightWord(w);moveTo(w.startRow,w.startCol);}let currentActiveWord=null;function highlightWord(w){currentActiveWord=w;document.querySelectorAll('.cw-cell').forEach(c=>c.classList.remove('highlight'));const dr=w.direction==='down'?1:0;const dc=w.direction==='across'?1:0;for(let i=0;i<w.word.length;i++){const cell=document.getElementById('cell-'+(w.startRow+dr*i)+'-'+(w.startCol+dc*i));if(cell) cell.classList.add('highlight');}}function highlightWordForCell(w){if(w) highlightWord(w);}function moveTo(r,c){const nextInput=document.querySelector('input[data-r="'+r+'"][data-c="'+c+'"]');if(nextInput) nextInput.focus();}function moveToNext(r,c){if(!currentActiveWord) return;const dr=currentActiveWord.direction==='down'?1:0;const dc=currentActiveWord.direction==='across'?1:0;moveTo(r+dr,c+dc);}function moveToPrev(r,c){if(!currentActiveWord) return;const dr=currentActiveWord.direction==='down'?1:0;const dc=currentActiveWord.direction==='across'?1:0;moveTo(r-dr,c-dc);}document.getElementById('check-btn').onclick=()=>{let solvedWords=0;SPEC.words.forEach(w=>{const dr=w.direction==='down'?1:0;const dc=w.direction==='across'?1:0;let wordCorrect=true;for(let i=0;i<w.word.length;i++){const r=w.startRow+dr*i;const c=w.startCol+dc*i;const inp=document.querySelector('input[data-r="'+r+'"][data-c="'+c+'"]');const cell=document.getElementById('cell-'+r+'-'+c);if(inp){if(inp.value.toUpperCase()===w.word[i]){cell.classList.add('correct');cell.classList.remove('wrong');}else{cell.classList.add('wrong');cell.classList.remove('correct');wordCorrect=false;}}}if(wordCorrect) solvedWords++;});progress.textContent=solvedWords+' / '+SPEC.words.length+' Solved';};document.getElementById('reveal-btn').onclick=()=>{SPEC.words.forEach(w=>{const dr=w.direction==='down'?1:0;const dc=w.direction==='across'?1:0;for(let i=0;i<w.word.length;i++){const inp=document.querySelector('input[data-r="'+(w.startRow+dr*i)+'"][data-c="'+(w.startCol+dc*i)+'"]');const cell=document.getElementById('cell-'+(w.startRow+dr*i)+'-'+(w.startCol+dc*i));if(inp){inp.value=w.word[i];if(cell){cell.classList.add('correct');cell.classList.remove('wrong');}}}});progress.textContent=SPEC.words.length+' / '+SPEC.words.length+' Solved';};renderClues();if(SPEC.words[0]) focusWord(SPEC.words[0]);</script></body></html>`;
  }

  // 11. Word Search Template
  if (type.includes('word-search') || type.includes('wordsearch')) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>/* INJECT_THEME_CSS */.ws-word-badge{padding:0.4rem 0.75rem;border-radius:0.5rem;background:var(--background);border:1px solid var(--border);font-size:0.85rem;font-weight:700;cursor:pointer;transition:all 0.2s;}.ws-word-badge.found{background:rgba(16,185,129,0.15);border-color:#10b981;color:#10b981;text-decoration:line-through;}</style></head><body><div id="app"><header id="app-header"><div style="display:flex;align-items:center;gap:0.5rem;justify-content:center;"><span class="badge" style="background:#5A7D99;color:white;">🔍 Word Search Discovery</span></div><h1 style="margin-top:0.25rem;">${title}</h1><p>${description}</p><span id="app-progress">0 / ${Math.max(items.length, 1)} Found</span></header><main id="app-main"><div class="card w-full max-w-2xl text-left"><h3 style="font-weight:700;font-size:1.05rem;margin-bottom:0.75rem;color:var(--foreground);">Words to Discover</h3><div id="word-list" style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:1.25rem;"></div><div id="word-details" class="card muted" style="background:var(--muted);font-size:0.85rem;padding:0.75rem;">Click any word above to reveal its clue and mark as reviewed!</div></div></main></div><script>const DATA=${itemsJson};let foundCount=0;const wordList=document.getElementById('word-list');const details=document.getElementById('word-details');const progress=document.getElementById('app-progress');DATA.forEach((item,i)=>{const word=String(item.word||item.front||item.concept||'TERM').toUpperCase();const hint=String(item.hint||item.clue||item.back||'Key concept definition');const b=document.createElement('div');b.className='ws-word-badge';b.textContent=word;b.onclick=()=>{if(!b.classList.contains('found')){b.classList.add('found');foundCount++;progress.textContent=foundCount+' / '+DATA.length+' Found';}details.innerHTML='<strong>'+word+':</strong> '+hint;};wordList.appendChild(b);});</script></body></html>`;
  }

  // 12. Formula & Derivation Step Solver Template
  if (type.includes('formula') || type.includes('equation') || type.includes('derivation')) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>/* INJECT_THEME_CSS */.formula-box{background:#0d0e12;border:1px solid #3A4250;border-radius:0.75rem;padding:1.25rem;font-family:'Fira Code',monospace;font-size:1.2rem;color:#38bdf8;text-align:center;margin:1rem 0;}</style></head><body><div id="app"><header id="app-header"><div style="display:flex;align-items:center;gap:0.5rem;justify-content:center;"><span class="badge" style="background:#5A7D99;color:white;">📐 Formula & Derivation Solver</span></div><h1 style="margin-top:0.25rem;">${title}</h1><p>${description}</p><span id="app-progress">Formula 1 of ${Math.max(items.length, 1)}</span></header><main id="app-main"><div class="card w-full max-w-2xl text-left" id="formula-card"><span class="badge" id="formula-badge">Equation 1</span><h2 id="formula-name" style="font-size:1.2rem;font-weight:700;margin:0.5rem 0;color:var(--foreground);"></h2><div class="formula-box" id="formula-render"></div><div class="card" style="background:var(--muted);margin-top:1rem;padding:1rem;"><h4 style="font-weight:700;font-size:0.9rem;color:#5A7D99;margin-bottom:0.5rem;">Variables & Derivation Notes</h4><p id="formula-notes" class="muted" style="font-size:0.875rem;line-height:1.6;"></p></div></div></main><footer id="app-footer"><button class="btn btn-secondary" id="f-prev">Previous</button><button class="btn btn-secondary" id="f-next">Next Formula</button></footer></div><script>const DATA=${itemsJson};let idx=0;function render(){if(!DATA.length)return;const it=DATA[idx]||{};document.getElementById('app-progress').textContent='Formula '+(idx+1)+' of '+DATA.length;document.getElementById('formula-badge').textContent='Equation '+(idx+1);document.getElementById('formula-name').textContent=it.front||it.concept||it.title||'Core Equation';document.getElementById('formula-render').textContent=it.formula||it.front||'E = mc²';document.getElementById('formula-notes').textContent=it.back||it.detail||it.explanation||'Variables and step-by-step physical breakdown.';}document.getElementById('f-prev').onclick=()=>{idx=(idx-1+DATA.length)%DATA.length;render();};document.getElementById('f-next').onclick=()=>{idx=(idx+1)%DATA.length;render();};render();</script></body></html>`;
  }

  // 13. Concept Hierarchy & Mindmap Template
  if (type.includes('concept-map') || type.includes('mindmap') || type.includes('hierarchy') || type.includes('tree')) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>/* INJECT_THEME_CSS */.tree-node{padding:0.75rem 1rem;border-radius:0.5rem;background:var(--card);border:1px solid var(--border);cursor:pointer;transition:all 0.2s;margin-bottom:0.5rem;}.tree-node:hover,.tree-node.active{border-color:#5A7D99;background:rgba(90,125,153,0.15);}</style></head><body><div id="app"><header id="app-header"><div style="display:flex;align-items:center;gap:0.5rem;justify-content:center;"><span class="badge" style="background:#5A7D99;color:white;">🌳 Concept Hierarchy Map</span></div><h1 style="margin-top:0.25rem;">${title}</h1><p>${description}</p><span id="app-progress">${items.length} Branches</span></header><main id="app-main"><div class="w-full max-w-4xl" style="display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;text-left;"><div class="card"><h3 style="font-weight:700;font-size:1rem;margin-bottom:0.75rem;color:var(--foreground);">Taxonomy Branches</h3><div id="tree-list"></div></div><div class="card" id="detail-card"><span class="badge" id="branch-badge">Select Node</span><h3 id="branch-title" style="font-size:1.15rem;font-weight:700;margin:0.5rem 0;color:var(--foreground);"></h3><p id="branch-desc" class="muted" style="font-size:0.875rem;line-height:1.6;"></p></div></div></main></div><script>const DATA=${itemsJson};let selected=0;const list=document.getElementById('tree-list');function render(){list.innerHTML='';DATA.forEach((it,i)=>{const div=document.createElement('div');div.className='tree-node'+(i===selected?' active':'');div.innerHTML='<div style="display:flex;align-items:center;gap:0.5rem;"><span class="badge">🌿 Node '+(i+1)+'</span><strong style="font-size:0.9rem;color:var(--foreground);">'+(it.front||it.concept||it.title)+'</strong></div>';div.onclick=()=>{selected=i;render();};list.appendChild(div);});const active=DATA[selected]||{};document.getElementById('branch-badge').textContent='Branch '+(selected+1);document.getElementById('branch-title').textContent=active.front||active.concept||'Concept';document.getElementById('branch-desc').textContent=active.back||active.detail||active.explanation||'Click any branch to inspect sub-concepts and mechanisms.';}render();</script></body></html>`;
  }

  // 14. Rapid-Fire True / False Speed Drill Template
  if (type.includes('true-false') || type.includes('speed-drill') || type.includes('fact-check')) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>/* INJECT_THEME_CSS */.tf-btn{flex:1;padding:1.25rem;font-size:1.1rem;font-weight:800;border-radius:0.75rem;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center;gap:0.5rem;}.tf-true{background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3);color:#34d399;}.tf-true:hover{background:rgba(16,185,129,0.3);transform:scale(1.02);}.tf-false{background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);color:#f87171;}.tf-false:hover{background:rgba(239,68,68,0.3);transform:scale(1.02);}</style></head><body><div id="app"><header id="app-header"><div style="display:flex;align-items:center;gap:0.5rem;justify-content:center;"><span class="badge" style="background:#5A7D99;color:white;">⚡ True / False Speed Drill</span></div><h1 style="margin-top:0.25rem;">${title}</h1><p>${description}</p><span id="app-progress">Score: 0 / 0</span></header><main id="app-main"><div class="card w-full max-w-xl text-center" id="tf-card"><span class="badge" id="tf-badge">Question 1</span><h2 id="tf-statement" style="font-size:1.2rem;font-weight:700;line-height:1.5;margin:1.25rem 0;color:var(--foreground);"></h2><div style="display:flex;gap:1rem;"><button class="tf-btn tf-true" id="btn-true">✅ TRUE</button><button class="tf-btn tf-false" id="btn-false">❌ FALSE</button></div><div id="tf-explanation" class="card" style="display:none;margin-top:1.25rem;background:var(--muted);padding:0.85rem;font-size:0.875rem;line-height:1.5;"></div></div></main></div><script>const DATA=${itemsJson};let idx=0;let score=0;let answered=0;function render(){if(idx>=DATA.length){document.getElementById('tf-statement').textContent='Speed drill complete! Final Score: '+score+' / '+DATA.length;document.getElementById('btn-true').style.display='none';document.getElementById('btn-false').style.display='none';return;}const it=DATA[idx]||{};document.getElementById('tf-badge').textContent='Statement '+(idx+1)+' of '+DATA.length;document.getElementById('tf-statement').textContent=it.question||it.front||it.statement||'Evaluate statement validity.';document.getElementById('tf-explanation').style.display='none';}function answer(userAns){const it=DATA[idx]||{};const correct=String(it.answer||it.back||'True').toLowerCase().includes('true');const isRight=userAns===correct;answered++;if(isRight) score++;document.getElementById('app-progress').textContent='Score: '+score+' / '+answered;const exp=document.getElementById('tf-explanation');exp.style.display='block';exp.innerHTML=(isRight?'<strong style="color:#10b981;">Correct!</strong> ':'<strong style="color:#ef4444;">Incorrect!</strong> ')+(it.explanation||it.detail||it.back||'');setTimeout(()=>{idx++;render();},1400);}document.getElementById('btn-true').onclick=()=>answer(true);document.getElementById('btn-false').onclick=()=>answer(false);render();</script></body></html>`;
  }

  // 15. Pomodoro Focus & Study Station Template
  if (type.includes('pomodoro') || type.includes('timer') || type.includes('stopwatch')) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>/* INJECT_THEME_CSS */.timer-display{font-size:3.5rem;font-weight:800;font-family:'Fira Code',monospace;color:#5A7D99;text-align:center;margin:1rem 0;}</style></head><body><div id="app"><header id="app-header"><div style="display:flex;align-items:center;gap:0.5rem;justify-content:center;"><span class="badge" style="background:#5A7D99;color:white;">⏱️ Pomodoro Study Station</span></div><h1 style="margin-top:0.25rem;">${title}</h1><p>${description}</p><span id="app-progress">Focus Session</span></header><main id="app-main"><div class="card w-full max-w-md text-center"><div style="display:flex;justify-content:center;gap:0.5rem;"><button class="btn btn-secondary text-xs" id="p-25">25m Focus</button><button class="btn btn-secondary text-xs" id="p-5">5m Break</button><button class="btn btn-secondary text-xs" id="p-15">15m Break</button></div><div class="timer-display" id="p-timer">25:00</div><div style="display:flex;justify-content:center;gap:0.5rem;"><button class="btn btn-primary" id="p-start">Start</button><button class="btn btn-secondary" id="p-reset">Reset</button></div><div class="divider"></div><h4 style="font-weight:700;font-size:0.9rem;text-align:left;color:var(--foreground);margin-bottom:0.5rem;">Study Objectives Checklist</h4><div id="p-tasks" style="text-align:left;display:grid;gap:0.4rem;font-size:0.85rem;"></div></div></main></div><script>const DATA=${itemsJson};let totalSec=25*60;let timer=null;let running=false;const display=document.getElementById('p-timer');const startBtn=document.getElementById('p-start');function updateDisplay(){const m=Math.floor(totalSec/60).toString().padStart(2,'0');const s=(totalSec%60).toString().padStart(2,'0');display.textContent=m+':'+s;}function setMode(m){clearInterval(timer);running=false;startBtn.textContent='Start';totalSec=m*60;updateDisplay();}document.getElementById('p-25').onclick=()=>setMode(25);document.getElementById('p-5').onclick=()=>setMode(5);document.getElementById('p-15').onclick=()=>setMode(15);startBtn.onclick=()=>{if(running){clearInterval(timer);running=false;startBtn.textContent='Start';}else{running=true;startBtn.textContent='Pause';timer=setInterval(()=>{if(totalSec>0){totalSec--;updateDisplay();}else{clearInterval(timer);alert('Interval finished! Great work.');}},1000);}};document.getElementById('p-reset').onclick=()=>setMode(25);const taskBox=document.getElementById('p-tasks');DATA.forEach((it,i)=>{const row=document.createElement('label');row.style.display='flex';row.style.alignItems='center';row.style.gap='0.5rem';row.style.cursor='pointer';row.innerHTML='<input type="checkbox" style="width:auto;"> <span>'+(it.front||it.concept||'Review Chapter Segment '+(i+1))+'</span>';taskBox.appendChild(row);});updateDisplay();</script></body></html>`;
  }

  // Default Flashcard Deck Template
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>/* INJECT_THEME_CSS */</style></head><body><div id="app"><header id="app-header"><h1>${title}</h1><p>${description}</p><span id="app-progress">1 / ${Math.max(items.length, 1)}</span></header><main id="app-main"><div class="card w-full max-w-2xl text-center" id="flash-card" style="min-height:220px;display:flex;flex-direction:column;justify-content:center;cursor:pointer;user-select:none;transition:transform 0.2s;"><span class="badge" id="card-mode" style="margin:0 auto 0.75rem auto;">Front (Click to Flip)</span><h2 id="card-content" style="font-size:1.15rem;font-weight:700;line-height:1.5;color:var(--foreground);"></h2></div></main><footer id="app-footer"><button class="btn btn-secondary" id="prev-btn">Previous</button><button class="btn btn-primary" id="flip-btn">Flip Card</button><button class="btn btn-secondary" id="next-btn">Next</button></footer></div><script>const DATA=${itemsJson};let idx=0;let isBack=false;const card=document.getElementById('flash-card');const mode=document.getElementById('card-mode');const content=document.getElementById('card-content');const progress=document.getElementById('app-progress');function render(){if(!DATA.length){content.textContent='No content available';return;}const item=DATA[idx]||{};progress.textContent=(idx+1)+' / '+DATA.length;if(isBack){mode.textContent='Back';mode.className='badge correct';content.textContent=item.back||item.answer||'';}else{mode.textContent='Front (Click to Flip)';mode.className='badge';content.textContent=item.front||item.question||'';}}card.onclick=()=>{isBack=!isBack;render();};document.getElementById('flip-btn').onclick=()=>{isBack=!isBack;render();};document.getElementById('prev-btn').onclick=()=>{idx=(idx-1+DATA.length)%DATA.length;isBack=false;render();};document.getElementById('next-btn').onclick=()=>{idx=(idx+1)%DATA.length;isBack=false;render();};document.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){idx=(idx-1+DATA.length)%DATA.length;isBack=false;render();}else if(e.key==='ArrowRight'){idx=(idx+1)%DATA.length;isBack=false;render();}else if(e.key===' '){e.preventDefault();isBack=!isBack;render();}});render();</script></body></html>`;
}
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderDiagramToHtml(spec, title, description) {
  const nodes = Array.isArray(spec?.nodes) ? spec.nodes : [];
  const edges = Array.isArray(spec?.edges) ? spec.edges : [];
  const narrative = Array.isArray(spec?.narrativeFlow) ? spec.narrativeFlow : [];
  const bgImg = spec?.bgImageUrl || '';
  const viewBox = spec?.viewBox || '0 0 800 600';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      --bg: #0d1117;
      --card-bg: #161b22;
      --border: #30363d;
      --text: #e6edf3;
      --text-muted: #8b949e;
      --primary: #58a6ff;
      --primary-glow: rgba(88, 166, 255, 0.3);
      --accent: #238636;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { background: var(--bg); color: var(--text); height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
    header { padding: 12px 20px; background: var(--card-bg); border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; z-index: 10; flex-shrink: 0; }
    header h1 { font-size: 15px; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 8px; }
    header p { font-size: 11px; color: var(--text-muted); }
    .container { flex: 1; display: flex; position: relative; overflow: hidden; }
    .canvas-pane { flex: 1; position: relative; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at center, #161b22 0%, #0d1117 100%); overflow: hidden; }
    svg { width: 100%; height: 100%; max-height: 100%; }
    .node-group { cursor: pointer; transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); }
    .node-group:hover { transform: scale(1.06); }
    .node-group.active circle { stroke: #58a6ff; stroke-width: 4; filter: drop-shadow(0 0 12px var(--primary-glow)); }
    .node-group.active text { font-weight: 800; fill: #58a6ff; }
    .edge-path { stroke: #30363d; stroke-width: 2.5; stroke-dasharray: 6 4; animation: dash 30s linear infinite; fill: none; }
    .edge-path.active { stroke: #58a6ff; stroke-width: 3.5; stroke-dasharray: none; filter: drop-shadow(0 0 8px var(--primary-glow)); }
    @keyframes dash { to { stroke-dashoffset: -1000; } }
    .sidebar { width: 320px; background: var(--card-bg); border-left: 1px solid var(--border); display: flex; flex-direction: column; padding: 16px; gap: 14px; z-index: 10; overflow-y: auto; flex-shrink: 0; }
    .step-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; background: rgba(88, 166, 255, 0.15); color: #58a6ff; width: fit-content; }
    .info-card { background: #0d1117; border: 1px solid var(--border); border-radius: 12px; padding: 14px; }
    .info-title { font-size: 14px; font-weight: 700; color: #fff; margin-bottom: 6px; }
    .info-role { font-size: 11px; color: var(--primary); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
    .section-label { font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-top: 10px; margin-bottom: 4px; }
    .info-desc { font-size: 12px; color: var(--text); line-height: 1.5; }
    .controls { display: flex; align-items: center; gap: 8px; margin-top: auto; padding-top: 12px; border-top: 1px solid var(--border); }
    .btn { flex: 1; padding: 8px 12px; background: #21262d; border: 1px solid var(--border); color: #fff; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s ease; text-align: center; }
    .btn:hover { background: #30363d; border-color: #8b949e; }
    .btn-primary { background: #238636; border-color: rgba(240,246,252,0.1); }
    .btn-primary:hover { background: #2ea043; }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>✨ ${escapeHtml(title || 'Interactive Diagram')}</h1>
      <p>${escapeHtml(description || 'Click any component to inspect or use the narrative player below.')}</p>
    </div>
    <span class="step-badge" id="step-indicator">Step 1 of ${narrative.length || nodes.length || 1}</span>
  </header>
  <div class="container">
    <div class="canvas-pane">
      <svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <linearGradient id="nodeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#1f2937" />
            <stop offset="100%" stop-color="#111827" />
          </linearGradient>
        </defs>
        ${bgImg ? `<image href="${bgImg}" x="50" y="50" width="700" height="500" opacity="0.15" preserveAspectRatio="xMidYMid meet"/>` : ''}
        <g id="edges-layer"></g>
        <g id="nodes-layer"></g>
      </svg>
    </div>
    <div class="sidebar">
      <div class="info-card" id="detail-card">
        <div class="info-role" id="card-role">INTERACTIVE EXPLORER</div>
        <div class="info-title" id="card-title">Select a Component</div>
        <div class="section-label">What it does</div>
        <div class="info-desc" id="card-what">Click any node or step through the process to discover how each component functions.</div>
        <div class="section-label">Scientific mechanism & why it works</div>
        <div class="info-desc" id="card-why">Detailed mechanism explanations will appear here.</div>
      </div>
      <div class="controls">
        <button class="btn" id="prev-btn" onclick="prevStep()">◀ Prev</button>
        <button class="btn btn-primary" id="next-btn" onclick="nextStep()">Next ▶</button>
      </div>
    </div>
  </div>

  <script>
    const NODES = ${JSON.stringify(nodes)};
    const EDGES = ${JSON.stringify(edges)};
    const NARRATIVE = ${JSON.stringify(narrative)};
    let currentStep = 0;
    let activeNodeId = NODES[0]?.id || null;

    function renderSvg() {
      const edgesLayer = document.getElementById('edges-layer');
      const nodesLayer = document.getElementById('nodes-layer');

      // Render edges
      edgesLayer.innerHTML = EDGES.map((edge, idx) => {
        const fromNode = NODES.find(n => n.id === edge.from) || { x: 150 + idx * 100, y: 300 };
        const toNode = NODES.find(n => n.id === edge.to) || { x: 250 + idx * 100, y: 300 };
        const midX = (fromNode.x + toNode.x) / 2;
        const midY = (fromNode.y + toNode.y) / 2 - 20;
        return \`
          <path id="edge-\${idx}" class="edge-path" d="M \${fromNode.x} \${fromNode.y} Q \${midX} \${midY} \${toNode.x} \${toNode.y}" />
          \${edge.label ? \`<text x="\${midX}" y="\${midY - 8}" fill="#8b949e" font-size="10" font-weight="600" text-anchor="middle">\${edge.label}</text>\` : ''}
        \`;
      }).join('');

      // Render nodes
      nodesLayer.innerHTML = NODES.map(node => {
        const r = node.radius || 42;
        return \`
          <g id="node-\${node.id}" class="node-group \${node.id === activeNodeId ? 'active' : ''}" onclick="selectNode('\${node.id}')" transform="translate(\${node.x}, \${node.y})">
            <circle cx="0" cy="0" r="\${r}" fill="url(#nodeGrad)" stroke="#388bfd" stroke-width="2.5" />
            <text x="0" y="4" fill="#f0f6fc" font-size="11" font-weight="700" text-anchor="middle" pointer-events="none">\${node.label || node.id}</text>
          </g>
        \`;
      }).join('');
    }

    function selectNode(id) {
      activeNodeId = id;
      document.querySelectorAll('.node-group').forEach(el => el.classList.remove('active'));
      const el = document.getElementById('node-' + id);
      if (el) el.classList.add('active');

      const node = NODES.find(n => n.id === id);
      if (node) {
        document.getElementById('card-title').innerText = node.label || node.id;
        document.getElementById('card-role').innerText = node.role || 'ACTIVE STAGE';
        document.getElementById('card-what').innerText = node.whatItDoes || node.description || 'Core stage of the process.';
        document.getElementById('card-why').innerText = node.whyItWorks || node.why || 'Operating according to scientific mechanisms.';
      }
    }

    function applyStep(stepIdx) {
      if (NARRATIVE.length > 0) {
        const step = NARRATIVE[stepIdx];
        if (step) {
          document.getElementById('step-indicator').innerText = \`Step \${step.step || stepIdx + 1} of \${NARRATIVE.length}\`;
          document.getElementById('card-title').innerText = step.title || \`Stage \${stepIdx + 1}\`;
          document.getElementById('card-role').innerText = 'NARRATIVE FLOW';
          document.getElementById('card-what').innerText = step.narration || '';
          document.getElementById('card-why').innerText = step.why || '';
          if (step.activeNodeId) selectNode(step.activeNodeId);
        }
      } else if (NODES[stepIdx]) {
        selectNode(NODES[stepIdx].id);
        document.getElementById('step-indicator').innerText = \`Node \${stepIdx + 1} of \${NODES.length}\`;
      }
    }

    function nextStep() {
      const max = NARRATIVE.length || NODES.length;
      if (max === 0) return;
      currentStep = (currentStep + 1) % max;
      applyStep(currentStep);
    }

    function prevStep() {
      const max = NARRATIVE.length || NODES.length;
      if (max === 0) return;
      currentStep = (currentStep - 1 + max) % max;
      applyStep(currentStep);
    }

    renderSvg();
    if (NARRATIVE.length > 0) applyStep(0);
    else if (NODES.length > 0) selectNode(NODES[0].id);
  </script>
</body>
</html>`;
}

export async function generateLearningTool(userId, prompt, context, options = {}) {
  const promptText = String(prompt || '').trim();
  if (!promptText) throw new Error('prompt is required');

  console.log('ML ENGINE generateLearningTool context type:', typeof context, 'isArray:', Array.isArray(context), 'length:', context?.length);

  let contextString = '';

  // ── GREETINGS & CASUAL CHAT FAST-PATH ──────────────────────────────────────
  const trimmedLower = promptText.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const explicitToolKeywords = ['quiz', 'flashcard', 'flashcards', 'game', 'notes', 'guide', 'study guide', 'test', 'mindmap', 'diagram', 'flowchart', 'calculator', 'converter', 'timer', 'pomodoro', 'matching', 'crossword', 'word search', 'tool', 'create', 'generate', 'build', 'make me a'];
  const hasToolKeyword = explicitToolKeywords.some(k => trimmedLower.includes(k));

  const greetingMatches = [
    'hi', 'hello', 'hey', 'heyy', 'hi there', 'hello there', 'hey there',
    'good morning', 'good afternoon', 'good evening', 'howdy', 'yo',
    'how are you', 'how r u', 'who are you', 'what can you do', 'what is this',
    'thanks', 'thank you', 'thx', 'bye', 'goodbye', 'cool', 'ok', 'okay', 'great', 'awesome'
  ];

  if (!hasToolKeyword && (greetingMatches.includes(trimmedLower) || (trimmedLower.length <= 15 && ['hi', 'hello', 'hey'].some(g => trimmedLower.startsWith(g))))) {
    const greetingReplies = [
      "Hello! I'm Vela, your AI study coach. How can I help you revise today? You can ask me questions about your study topics, or ask me to generate interactive flashcards, quizzes, study guides, or diagrams!",
      "Hi there! Ready to study? Let me know what subject you'd like to practice or what kind of interactive tool you'd like to create!",
      "Hey! How can I assist your revision today? Feel free to ask a question or request flashcards, a quiz, or a study guide!"
    ];
    const aiReply = greetingReplies[Math.floor(Math.random() * greetingReplies.length)];

    return {
      toolType: 'chat',
      title: 'Conversation',
      description: 'Chat response',
      render: 'chat',
      ui: 'chat',
      chatResponse: aiReply,
      data: {
        message: aiReply,
        items: []
      }
    };
  }

  // ── RAG Grounding Context from Active Document ──────────────────────────────
  let targetDocTitle = options.documentTitle || options.attachedDocument?.title;

  // Clean and decode targetDocTitle if passed
  if (targetDocTitle) {

    try {
      targetDocTitle = decodeURIComponent(String(targetDocTitle).replace(/\+/g, ' ')).trim();
    } catch {
      targetDocTitle = String(targetDocTitle).replace(/\+/g, ' ').trim();
    }
  }


  if (userId) {
    try {
      const isUuid = typeof userId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
      if (isUuid) {
        const historyText = Array.isArray(options.chatHistory)
          ? options.chatHistory.slice(-4).map(m => String(m.content || m.text || '')).join(' ')
          : '';
        const searchQueryText = `${promptText} ${historyText} ${options.previousTool?.title || ''} ${targetDocTitle || ''}`.trim();
        
        const queryVec = await Promise.race([
          getEmbedding(searchQueryText),
          new Promise(resolve => setTimeout(() => resolve(null), 1200))
        ]);

        if (queryVec && Array.isArray(queryVec)) {
          const vecStr = `[${queryVec.join(',')}]`;
          const client = await pool.connect();
          try {
            let rows = [];

            // 1. If document title explicitly specified in current session, search exact or fuzzy title match
            if (targetDocTitle) {
              const cleanDocTitle = targetDocTitle.replace(/\+/g, ' ');
              const titleRes = await client.query(
                `SELECT chunk_text, title FROM public.w_embeddings
                 WHERE user_id = $1 AND (
                   title = $2 OR 
                   title ILIKE $3 OR
                   REPLACE(title, '+', ' ') ILIKE $3 OR
                   REPLACE(title, ' ', '+') ILIKE $3
                 )
                 ORDER BY embedding <-> $4::vector LIMIT 10`,
                [userId, targetDocTitle, `%${cleanDocTitle}%`, vecStr]
              );
              rows = titleRes.rows;
            }

            if (rows.length > 0) {
              const docTitleUsed = rows[0].title;
              contextString += `\n\nEXACT RAG GROUNDED CONTEXT FROM ACTIVE SESSION DOCUMENT ("${docTitleUsed}"):\n`;
              rows.forEach((r, idx) => {
                contextString += `[Excerpt ${idx + 1} from "${r.title}"]:\n${r.chunk_text}\n\n`;
              });
              contextString += `MANDATORY SESSION CONTINUITY INSTRUCTION: You MUST use the factual context above from "${docTitleUsed}" to create all quiz questions, flashcards, or study guide content for this turn. Every question MUST directly test concepts, facts, and terms from these excerpts!\n`;
            } else if (targetDocTitle) {
              contextString += `\n\nACTIVE TOPIC FOR THIS REVISION TOOL: "${targetDocTitle}"\n`;
              contextString += `MANDATORY TOPIC INSTRUCTION: You MUST generate all quiz questions, flashcards, study guide, or diagram content strictly about "${targetDocTitle}".\n`;
            }
          } finally {
            client.release();
          }
        }
      }
    } catch (ragErr) {
      console.warn('[RAG TOOL GEN] Vector search failed:', ragErr.message);
    }
  }




  // ── Previous Tool & Topic Context ──────────────────────────────────
  if (options.previousTool) {
    const prevTitle = options.previousTool.title || options.previousTool.name || 'Previous Tool';
    const prevType = options.previousTool.toolType || options.previousTool.type || 'tool';
    contextString += `\n\nCURRENT ACTIVE TOOL IN VIEW:\n`;
    contextString += `- Title: "${prevTitle}"\n`;
    contextString += `- Type: ${prevType}\n`;
    if (options.previousTool.description) {
      contextString += `- Description: ${options.previousTool.description}\n`;
    }
    contextString += `INSTRUCTION: If the user says "turn it into a different tool" or "change format", they are referring to converting "${prevTitle}" on the EXACT SAME subject into a new tool format (e.g. flashcards, quiz, study guide). MAINTAIN TOPIC CONTINUITY WITH "${prevTitle}".\n`;
  }

  // ── Conversation History Context ──────────────────────────────────
  let historySection = '';
  if (Array.isArray(options.chatHistory) && options.chatHistory.length > 0) {
    const historySnippets = options.chatHistory
      .slice(-20)
      .map(m => `${m.role === 'user' ? 'Student' : 'Vela'}: ${String(m.content || m.text || '').trim()}`)
      .filter(Boolean)
      .join('\n\n');
    if (historySnippets) {
      historySection = `\n\n═══════════════════════════════════════════════════════════════\nFULL CONVERSATION HISTORY IN THIS CHAT SESSION:\n${historySnippets}\n═══════════════════════════════════════════════════════════════\n`;
      contextString += historySection;
    }
  }

  if (Array.isArray(context) && context.length > 0) {
    contextString += `\n\nSTUDENT'S RECENT MISTAKES TO FOCUS ON:\n`;
    context.forEach((q, i) => {
       contextString += `Q${i+1}: ${q.prompt}\n(Student answered: ${q.userAnswer}, Correct answer: ${q.correctAnswer})\n`;
    });
    contextString += `\nINSTRUCTION: Ensure the content of the generated tool specifically targets and corrects these mistakes.`;
  }

  // Add metacognitive insights if provided (optional)
  if (options.metacognitiveAnalysis) {
    const ma = options.metacognitiveAnalysis;
    contextString += `\n\nMETACOGNITIVE INSIGHTS (for Vela's context):\n`;
    contextString += `- Knowledge Gaps: ${ma.knowledgeGaps}\n`;
    contextString += `- Pattern identified: ${ma.patternSpecificity}\n`;
    contextString += `- Student approach: ${ma.behavioralInsight}\n`;
    contextString += `\nINSTRUCTION: Adjust the difficulty and explanation style to match these insights.`;
  }

  // ── helper ─────────────────────────────────────────────────────────────────
  const safeParse = (text) => {
    if (!text || typeof text !== 'string') return null;
    const cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/```json|```/gi, '').trim();
    try { return JSON.parse(cleaned); } catch { /* try extraction */ }
    
    const first = cleaned.indexOf('{');
    if (first === -1) return null;
    const candidate = cleaned.slice(first);
    
    const lastBrace = candidate.lastIndexOf('}');
    if (lastBrace > 0) {
      const sub = candidate.slice(0, lastBrace + 1);
      try { return JSON.parse(sub); } catch {}
      try { return JSON.parse(sub + ']}'); } catch {}
      try { return JSON.parse(sub + '}'); } catch {}
    }
    
    try {
      const toolTypeMatch = candidate.match(/"toolType"\s*:\s*"([^"]+)"/);
      if (toolTypeMatch) {
        const titleMatch = candidate.match(/"title"\s*:\s*"([^"]+)"/);
        const descMatch = candidate.match(/"description"\s*:\s*"([^"]+)"/);
        const chatMatch = candidate.match(/"chatResponse"\s*:\s*"([^"]+)"/);
        return {
          toolType: toolTypeMatch[1],
          title: titleMatch ? titleMatch[1] : 'Interactive Revision Tool',
          description: descMatch ? descMatch[1] : 'Study revision tool',
          chatResponse: chatMatch ? chatMatch[1] : 'Here is your customized interactive study tool!',
          items: []
        };
      }
    } catch {}
    
    return null;
  };

  // ── PHASE 1 — plan (~1 600 tokens, JSON) ───────────────────────────────────
  const planPrompt = `
You are Vela, an elite AI educational architect, conversational study coach, and revision tool creator.

YOUR PRIMARY MISSION & BEHAVIORS:
1. FULL CONVERSATION MEMORY & CONTINUITY:
   You have complete access to the FULL CONVERSATION HISTORY in this session. NEVER forget topics, subjects, exam dates, or preferences the student mentioned in earlier turns. Synthesize the entire conversation thread together.

2. ACTIVE INQUIRY (ONLY FOR VAGUE REQUESTS WITH NO SUBJECT):
   If the student gives an open-ended request WITHOUT specifying ANY subject, course, or topic (e.g. "Help me create a study plan for my exams", "I need help revising for finals") without naming the topic:
   - Set "toolType": "chat", "ui": "chat".
   - In "chatResponse", ask 2-3 clarifying questions (subject, timeline, weak areas).

3. TOPIC & CONCEPT LEARNING REQUESTS (ALWAYS BUILD AN INTERACTIVE TOOL ON CANVAS):
   Whenever the student asks to learn, understand, or study ANY concept or topic (e.g. "Help me learn photosynthesis", "Teach me Newton's laws", "How does cellular respiration work", "Mitosis", "Binary Search Trees", "Calculus limits"):
   - ALWAYS choose the best interactive tool archetype (e.g. "revision-kit", "flashcards", "feynman-grader", "cloze-blurting", "quiz", "svg_diagram", "timeline", "matching", or "study-notes").
   - Populate "items" with 6-12 richly detailed, accurate academic study items so the interactive tool renders on the right-side canvas!
   - In "chatResponse", provide a clear, encouraging educational breakdown of the core concepts, mechanisms, and exam takeaways, telling the student their interactive study tool is ready on the canvas.

4. DIAGRAM & VISUALIZATION REQUESTS:
   If the student asks to "create a diagram", "draw a diagram", "make a diagram", "visualize this", "flowchart", "schematic", or "diagram explaining how it works":
   - Set "toolType": "svg_diagram", "ui": "visual".
   - NEVER output text/ASCII art diagrams in "chatResponse"! The system generates an interactive SVG visual diagram on the right-side canvas.
   - In "chatResponse", write a concise friendly introduction.

5. CONVERSATIONAL FOLLOW-UPS & TROUBLESHOOTING:
   If the student asks a question about the interface, where the tool is, or says they can't see it (e.g. "I can't see it", "Where is it?", "How do I use this?", "Why?"):
   - Set "toolType": "chat", "ui": "chat".
   - In "chatResponse", respond warmly as Vela. Explain clearly how to access or interact with the tool on the right-hand canvas, or ask if they'd like you to generate a specific interactive tool (such as flashcards, a quiz, or a visual diagram) right now!

USER'S LATEST MESSAGE: "${promptText}"${contextString}

Return ONLY valid JSON — no markdown, no extra text:
{
  "toolType": "one of: chat | svg_diagram | feynman-grader | cloze-blurting | branching-scenario | revision-kit | flashcards | quiz | study-notes | study-guide | matching | word-search | crossword | true-false | ordering | timeline | mindmap | concept-map | calculator | converter | timer | pomodoro | ...",
  "title": "clear academic title for this response or tool",
  "description": "a crisp summary of what this helps the student revise",
  "chatResponse": "Your complete conversational response or explanation to the student",
  "ui": "best layout keyword: chat | cards | list | visual | interactive | utility",
  "htmlDesignBrief": "3-5 sentences describing layout/interactions (if generating an interactive tool; leave empty if chat)",
  "items": []
}

ITEM SCHEMA (for interactive tool types):
- feynman-grader: { "id":"1", "concept":"Concept Name", "prompt":"Explain X in simple terms", "keyPoints":["key definition 1","core mechanism 2","exam fact 3"], "exemplar":"Complete model explanation" }
- cloze-blurting / fill-in-the-blank: { "id":"1", "front":"Concept/Topic", "back":"The [mitochondria] is the powerhouse of the cell providing [ATP] energy.", "sentence":"...", "answer":"mitochondria" }
- branching-scenario: { "id":"1", "title":"Dilemma Title", "situation":"Scenario context...", "question":"What action do you take?", "options":[{"text":"Choice A","consequence":"Outcome A explanation"},{"text":"Choice B","consequence":"Outcome B explanation"}], "best":"Choice A", "reasoning":"Pedagogical debrief" }
- revision-kit: { "id":"1", "front":"Key Subtopic / Question", "back":"Core definitions, formula, notes, and exam answer", "concept":"Topic Name" }
- flashcards / vocabulary: { "id":"1", "front":"term/question", "back":"definition/detailed explanation" }
- quiz / true-false: { "id":"1", "question":"...", "choices":["A","B","C","D"], "answer":"A", "explanation":"detailed reason why correct" }
- matching: { "id":"1", "left":"term/concept", "right":"definition/matching facts" }
- ordering / timeline: { "id":"1", "text":"event/step", "position":1, "detail":"explanation" }
- word-search / spelling: { "id":"1", "word":"MITOSIS", "hint":"cell division process" }
- crossword: { "id":"1", "word":"PHOTOSYNTHESIS", "clue":"process plants use to make food", "direction":"across" }
- study-notes / study-guide: { "id":"1", "front":"heading/topic", "back":"detailed study notes" }
- chat / svg_diagram / calculator / converter / timer / pomodoro: items = []
`;


  let plan = null;
  try {
    const planRaw = await toolGenAI(planPrompt, 'qwen/qwen3.6-27b', 0.3, 2500, { forceJson: false });
    plan = safeParse(planRaw);
    if (!plan) console.log('DEBUG planRaw failed to parse:\n', planRaw);
  } catch (err) {
    console.log('DEBUG toolGenAI error:', err.message);
  }

  if (!plan) {
    plan = {
      toolType: 'chat',
      title: 'Conversation',
      description: 'Chat response',
      ui: 'chat',
      chatResponse: 'Sorry, I had trouble parsing that. Could you try asking in a different way?',
      items: []
    };
  }

  const lowerPrompt = String(promptText || '').toLowerCase();
  const explicitDiagramKeywords = [
    'diagram', 'svg', 'draw a diagram', 'create a diagram', 'make a diagram', 'visualize', 'visualise', 'flowchart', 'schematic', 'interactive diagram'
  ];
  if (explicitDiagramKeywords.some(k => lowerPrompt.includes(k))) {
    plan.toolType = 'svg_diagram';
  }

  const planToolType = String(plan.toolType || '').toLowerCase();
  const isChat = planToolType === 'chat' || planToolType === 'message' || planToolType === 'text';

  // ── IMMEDIATE CHAT SHORT-CIRCUIT ──────────────────────────────────────────
  // If the planner chose chat (e.g. asking clarifying questions or explaining concepts),
  // return immediately without running blueprint tool overrides.
  if (isChat) {
    const aiMessage = plan.chatResponse || plan.data?.message || plan.description || "I'm here to help. What subject or topics would you like to focus on?";
    return {
      toolType: 'chat',
      title: plan.title || 'Conversation',
      description: plan.description || 'Chat response',
      render: 'chat',
      ui: 'chat',
      chatResponse: aiMessage,
      data: {
        message: aiMessage,
        items: []
      }
    };
  }

  const isUtility = UTILITY_TOOL_TYPES.some(u => planToolType.includes(u));
  const isImage = planToolType === 'image' || planToolType === 'illustration' || planToolType === 'picture';

  // Only require items for interactive learning tools, not utilities or image
  if (!isImage && !isUtility && (!Array.isArray(plan.items) || plan.items.length === 0)) {
    plan.items = [];
  }
  if (!Array.isArray(plan.items)) {
    plan.items = [];
  }

  let toolType = String(plan.toolType || 'flashcards').toLowerCase();

  // Check for domain/revision tool blueprint matching this request
  const activeBlueprint = getBlueprintForPrompt(promptText, toolType);
  if (activeBlueprint) {
    console.log(`🎯 DOMAIN BLUEPRINT MATCHED: [${activeBlueprint.name}] for prompt: "${promptText}"`);
    if (activeBlueprint.typeKey) {
      toolType = activeBlueprint.typeKey;
    }
  }

  const title       = String(plan.title === 'Conversation' ? 'Interactive Study Tool' : (plan.title || 'Learning Tool'));
  const description = String(plan.description === 'Chat response' ? 'Explore and interact with this live educational revision tool' : (plan.description || 'Generated from your request.'));
  const ui          = String(plan.ui              || 'cards').toLowerCase();
  const brief       = String(plan.htmlDesignBrief || `An interactive ${toolType} learning tool that displays each item engagingly.`);

  // ── DYNAMIC SVG DIAGRAM SHORT-CIRCUIT ──────────────────────────────────────
  const isDiagramType = ['diagram', 'svg_diagram', 'svg-diagram', 'flowchart', 'anatomy', 'anatomy_flow', 'anatomy_labeling', 'data_structure', 'function_plot', 'circuit_logic', 'circuit'].some(d => toolType.includes(d));

  if (isDiagramType) {
    let diagramSpec = null;
    try {
      const diagramPrompt = buildSVGDiagramPrompt(promptText, contextString);
      const diagramRaw = await toolGenAI(diagramPrompt, 'qwen/qwen3.6-27b', 0.3, 2500, { forceJson: false });

      diagramSpec = safeParse(diagramRaw);
      if (!diagramSpec) console.log('DEBUG diagramRaw failed to parse:\n', diagramRaw?.slice(0, 300));
    } catch (err) {
      console.warn('Failed to parse AI SVG Diagram spec:', err.message);
    }

    if (diagramSpec) {
      // Generate a realistic textbook illustration base layer for high visual fidelity
      try {
        const bgPrompt = `A highly detailed, professional realistic textbook illustration of: ${promptText}. Style: Gray's Anatomy medical illustration, clean dark background, 8k resolution, authentic anatomical features.`;
        const fluxResult = await generateFluxImage(bgPrompt.slice(0, 500));
        if (fluxResult?.imageUrl) {
          diagramSpec.bgImageUrl = fluxResult.imageUrl;
        }
      } catch (fluxErr) {
        console.warn('Flux image base layer generation skipped:', fluxErr.message);
      }

      const diagramTitle = diagramSpec.title || title;
      const diagramDesc = diagramSpec.description || description;
      const diagramHtml = renderDiagramToHtml(diagramSpec, diagramTitle, diagramDesc);

      return {
        toolType: 'svg_diagram',
        title: diagramTitle,
        description: diagramDesc,
        render: 'native',
        ui: 'svg_diagram',
        html: diagramHtml,
        app: { html: diagramHtml },
        chatResponse: plan.chatResponse || `I've generated an interactive visual diagram of **${diagramTitle}** for you on the canvas! Explore the stages, inputs, and outputs.`,
        data: {
          interactiveDiagram: diagramSpec,
          html: diagramHtml,
          items: []
        }
      };
    }
  }

  // ── IMAGE SHORT-CIRCUIT ───────────────────────────────────────────────────
  if (toolType === 'image' || toolType === 'illustration' || toolType === 'picture') {
    // Build a descriptive prompt and generate through the backend FLUXImage API.
    const imagePrompt = `A highly detailed, professional educational illustration of: ${promptText}. ${description}. Style: textbook diagram, clear, high resolution.`;
    const fluxResult = await generateFluxImage(imagePrompt.slice(0, 500));
    const localImageUrl = fluxResult.imageUrl ? await cacheImageLocally(fluxResult.imageUrl) : '';
    const imageDataUrl = fluxResult.imageUrl ? await toDataUrlIfPossible(fluxResult.imageUrl) : '';

    return {
      toolType: 'image',
      title,
      description,
      render: 'native',
      ui: 'image',
      data: {
        imagePrompt: imagePrompt.slice(0, 500),
        imageUrl: fluxResult.imageUrl || '',
        localImageUrl,
        imageDataUrl,
        imageError: fluxResult.error || '',
        items: []
      }
    };
  }

  let rawItems = Array.isArray(plan.items) ? plan.items.filter(it => it && typeof it === 'object' && it.front !== 'Review your notes').slice(0, 18) : [];
  
  if (rawItems.length === 0 && !isImage && !isUtility) {
    // If the planner did not return items, attempt a focused generation for the real topic
    try {
      const itemsPrompt = `You are an expert educational content generator. Generate 6-8 comprehensive, factually rich, and accurate study items for the topic "${promptText}" suited for an interactive ${toolType} revision tool.
Return ONLY valid JSON array with no extra text:
[
  { "id": "1", "front": "Core concept or question", "back": "Detailed, accurate explanation, mechanism, and exam facts." }
]`;
      const fallbackRaw = await toolGenAI(itemsPrompt, 'qwen/qwen3.6-27b', 0.3, 2000, { forceJson: false });
      const parsed = safeParse(fallbackRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        rawItems = parsed.slice(0, 12);
      }
    } catch (fbErr) {
      console.warn('Fallback item generation failed:', fbErr.message);
    }
  }

  // If still empty after fallback attempt, gracefully return as chat explanation instead of fake dummy cards
  if (rawItems.length === 0 && !isImage && !isUtility) {
    const aiMessage = plan.chatResponse || `Here is an overview of **${title}**:\n\n${description}\n\nLet me know if you would like me to generate flashcards, a quiz, or a study diagram for this!`;
    return {
      toolType: 'chat',
      title: title || 'Explanation',
      description: description || 'Chat response',
      render: 'chat',
      ui: 'chat',
      chatResponse: aiMessage,
      data: {
        message: aiMessage,
        items: []
      }
    };
  }

  const items       = normalizeToolItems(toolType, rawItems);
  const itemsJson   = JSON.stringify(items);

  // ── MINDMAP SHORT-CIRCUIT (Return ReactFlow nodes/edges instead of HTML) ──
  if (toolType === 'mindmap' || toolType === 'mind-map' || toolType === 'concept-map' || toolType === 'mind map') {
    // Build a root node + one child per item so the frontend can render it with ReactFlow
    const nodes = [
      { id: 'root', label: title, description: description, sourceLink: '' },
      ...items.map((item, i) => ({
        id: `n${i}`,
        label: String(item.front || item.title || item.question || `Topic ${i + 1}`).slice(0, 120),
        description: String(item.back || item.content || item.answer || '').slice(0, 400),
        sourceLink: '',
      }))
    ];
    const edges = items.map((_, i) => ({ from: 'root', to: `n${i}` }));

    return {
      toolType: 'mindmap',
      title,
      description,
      render: 'native',
      ui: 'mindmap',
      data: { nodes, edges, items: [] }
    };
  }

  // ── PHASE 2 — build HTML ──────────────────────────────────────────────────
  let layoutSpec = null;

  if (toolType.includes('crossword') && items.length > 0) {
    layoutSpec = buildCrosswordLayout(items);
    if (layoutSpec) console.log(`Crossword layout: ${layoutSpec.words.length} words placed in ${layoutSpec.gridRows}×${layoutSpec.gridCols} grid`);
  } else if ((toolType.includes('word-search') || toolType.includes('wordsearch')) && items.length > 0) {
    layoutSpec = buildWordSearchLayout(items);
    if (layoutSpec) console.log(`Word-search layout: ${layoutSpec.gridRows}×${layoutSpec.gridCols} grid`);
  }

  const isSimulationOr3D = (activeBlueprint?.name?.includes('3D') || activeBlueprint?.name?.includes('Simulation') || toolType.includes('simulation') || toolType.includes('simulator') || toolType.includes('3d') || toolType.includes('lab'));

  const mechanicHints = [
    isSimulationOr3D && `- SIMULATION / 3D MECHANICS:
  1. If 3D, include Three.js scripts in head:
     <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
     <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
  2. Implement full interactive controls (Play/Pause, Reset, Parameter Sliders, Reagent/State Pickers).
  3. Include a real-time observation dashboard, equation/parameter telemetry, and click-to-inspect component details.
  4. Ensure smooth requestAnimationFrame animation loops and responsive canvas resizing.`,
    toolType.includes('drag') && `- Use HTML5 Drag and Drop API: draggable="true" on sources, dragstart sets dataTransfer.setData, dragover calls e.preventDefault(), drop reads dataTransfer.getData.`,
    (toolType.includes('quiz') || toolType.includes('mcq') || toolType.includes('multiple')) && `- Show instant per-question feedback (correct=green, incorrect=red with correct answer revealed). Show a final score screen with a retry button.`,
    (toolType.includes('true-false') || toolType === 'true/false') && `- Show each statement, two large buttons (True / False), instant feedback, score at end with retry.`,
    (toolType.includes('fill') || toolType.includes('blank') || toolType.includes('cloze')) && `- Render each sentence with an <input> for the blank. On submit show correct/incorrect with the correct word highlighted. Track score.`,
    (toolType.includes('matching') || toolType.includes('match')) && `- Two columns: left=terms, right=definitions (shuffled). Click left then right to pair. Show matched pairs as connected/highlighted. Final score + retry.`,
    (toolType.includes('ordering') || toolType.includes('sorting') || toolType.includes('ranking') || toolType.includes('sequence')) && `- Drag-and-drop list reordering. Use HTML5 drag API. Show correct order after submission with color-coded feedback per item.`,
    (toolType.includes('word-search') || toolType.includes('wordsearch')) && `- The LAYOUT constant contains grid (2D array of letters), gridRows, gridCols, and wordPositions [{word, startRow, startCol, direction}].
- Render the letter grid as a CSS table. Each cell shows one letter. On mousedown+drag (or click-start + click-end) highlight a selection.
- When user releases, check if the selection matches any wordPosition. If yes, mark those cells permanently highlighted and cross the word off the list.
- Show a word list on the side. Completed words get a strikethrough. Show completion message when all found.`,
    (toolType.includes('crossword')) && `- The LAYOUT constant (defined below from PRE-COMPUTED LAYOUT) contains gridRows, gridCols, and a words array: [{number, word, direction, startRow, startCol, clue}].
- Build a CSS grid table with gridRows rows and gridCols columns. Each <td> is either a black cell (background: var(--background)) or a white input cell (background: #fff, color: #000).
- A cell at (r, c) is white if any word covers it. Compute this from LAYOUT.words: for each word, iterate its cells.
- Show the clue number (word.number) as a small superscript in the top-left of the cell where startRow/startCol matches.
- Each white cell gets an <input maxlength="1"> styled to fill the cell.
- Render two clue lists: Across (filter words where direction==='across') and Down (filter words where direction==='down'), each showing number + clue text.
- Clicking a clue highlights that word's cells. Typing fills cells left-to-right or top-to-bottom.
- Check button validates all inputs against LAYOUT.words. Show correct/incorrect per cell. Show final score.`,
    (toolType.includes('spelling') || toolType.includes('spelling-bee')) && `- Show a hint, user types the word, instant feedback with correct spelling shown on wrong answer. Keep score and streak.`,
    (toolType.includes('typing') || toolType.includes('type-test') || toolType.includes('typing-test')) && `- Display a passage for the user to type. Highlight correct/incorrect characters in real-time. Show WPM and accuracy on completion.`,
    (toolType.includes('memory') || toolType.includes('memory-game')) && `- Grid of face-down cards. Click to flip. Match pairs. Track attempts and time. Show win screen with stats.`,
    (toolType.includes('scramble') || toolType.includes('anagram') || toolType.includes('unscramble')) && `- Show scrambled letters as draggable tiles. Drop into answer slots. Check button reveals correctness.`,
    (toolType.includes('scenario') || toolType.includes('case-study') || toolType.includes('role-play')) && `- Present scenario text, multiple-choice decision, then detailed feedback explaining why the best answer is correct.`,
    (toolType.includes('flash') || toolType.includes('flashcard')) && `- CSS 3D flip animation: click/tap to flip card. transform rotateY(180deg), transform-style: preserve-3d, backface-visibility: hidden on .front/.back. Navigation buttons. Progress counter.`,
    (toolType.includes('timeline') || toolType.includes('chronolog')) && `- Alternating left/right layout on desktop, single column on mobile. Vertical connecting line with colored dots at each node. Expand/collapse detail on click.`,
    (toolType.includes('calculator') || toolType.includes('converter') || toolType.includes('formula')) && `- Live computation: update result as the user types. Show step-by-step working where relevant. Clear, labelled input fields.`,
    (toolType.includes('timer') || toolType.includes('pomodoro') || toolType.includes('stopwatch')) && `- Animated countdown/countup. Start/Stop/Reset buttons. Pomodoro: 25-min work + 5-min break cycles. Visual and audio cue on completion (use Web Audio API beep).`,
    (toolType.includes('vocabulary') || toolType.includes('vocab-builder')) && `- Spaced-repetition-style: show word, user rates confidence (1-4). Easy words appear less often. Show definition, example sentence, etymology.`,
    (toolType.includes('study-guide') || toolType.includes('study-notes') || toolType.includes('notes')) && `- Accordion sections for each topic. Click to expand. Search/filter input. Bookmark functionality using localStorage.`,
    (toolType.includes('diagram') || toolType.includes('flowchart') || toolType.includes('concept') || toolType.includes('map')) && `- Use Mermaid.js via CDN (<script type="module">import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs'; mermaid.initialize({startOnLoad:true,theme:'dark'});</script>). Render a highly detailed diagram using <pre class="mermaid">...</pre>. CRITICAL: Wrap ALL node labels in double quotes. No special chars in node IDs.`,
  ].filter(Boolean).join('\n');

  const CSS_VARS_HINT = `CSS variables (use for ALL colors — no Tailwind color utilities):
--background, --foreground, --card, --card-foreground, --primary, --primary-foreground,
--secondary, --secondary-foreground, --muted, --muted-foreground, --border, --accent,
--accent-foreground, --destructive, --destructive-foreground, --radius, --font-sans.
Pre-built classes: .btn .btn-primary .btn-secondary .btn-ghost .btn-destructive .card .badge .muted .divider .correct .incorrect`;

  const layoutSpecSection = layoutSpec
    ? `\nPRE-COMPUTED LAYOUT — embed this EXACTLY as a JS constant named LAYOUT (do not modify any values):\nconst LAYOUT = ${JSON.stringify(layoutSpec, null, 2)};\n`
    : '';

  const blueprintSection = activeBlueprint
    ? `\n=== DOMAIN BLUEPRINT SPECIFICATION [${activeBlueprint.name}] ===\nFollow these domain-specific architectural rules and feature specs strictly:\n${activeBlueprint.content}\n=== END DOMAIN BLUEPRINT SPECIFICATION ===\n`
    : '';

  const buildPrompt = `You are building a self-contained interactive HTML learning tool.

Before writing any code, reason through these steps (write your reasoning as <!-- comments --> at the top of the HTML):
1. What is the exact UI structure this tool type requires?
2. What data from DATA maps to which UI elements?
3. What JavaScript state variables and event handlers are needed?
4. What edge cases (empty data, completion, wrong answers) must be handled?

Then write the complete HTML. Return ONLY raw HTML — no markdown fences outside the HTML.

TOOL TYPE   : ${toolType}
TITLE       : ${title}
DESCRIPTION : ${description}
${blueprintSection}
CONTENT DATA (embed as: const DATA = ${itemsJson}; in a <script> tag):
${layoutSpecSection}
WHAT TO BUILD — follow this brief precisely:
${brief}
${mechanicHints ? `\nMECHANIC REQUIREMENTS:\n${mechanicHints}` : ''}

REQUIRED SHELL (every tool must use this structure):
<div id="app">
  <header id="app-header"><h1>[title]</h1><p>[description]</p><span id="app-progress"></span></header>
  <main id="app-main"><!-- JS renders content here --></main>
  <footer id="app-footer"><!-- navigation/action buttons --></footer>
</div>

${CSS_VARS_HINT}

RULES:
1. Start with <!DOCTYPE html>, end with </html>.
2. <head> must include in order: <meta charset="UTF-8">, viewport meta, <script src="https://cdn.tailwindcss.com"></script>, then <style>/* INJECT_THEME_CSS */</style>.
3. Write EXACTLY /* INJECT_THEME_CSS */ inside <style> — no other CSS there. Theme is injected automatically.
4. All JS in <script> tags at end of <body>. No external libs except Three.js / OrbitControls / mermaid / chart.js if required by blueprint or mechanics.
5. Embed DATA array directly in JS — no fetch, no import.
6. Mobile-responsive (375px–1280px). Works offline.
7. Minimum 250 lines. Cover EVERY item in DATA.
8. Clear headings, short instructions, obvious button labels. Show score/progress/telemetry in #app-progress.
`;

  const fallbackHtml = generateDeterministicFallbackHtml(toolType, title, description, items);

  const LOCALSTORAGE_SHIM = `<script>
  (function(){
    try { window.localStorage; } catch(e) {
      var _s = {};
      window.localStorage = {
        getItem: function(k){ return _s[k] || null; },
        setItem: function(k, v){ _s[k] = String(v); },
        removeItem: function(k){ delete _s[k]; },
        clear: function(){ _s = {}; }
      };
    }
  })();
  </script>`;

  const injectThemeCss = (rawHtml) => rawHtml.replace('/* INJECT_THEME_CSS */', `${TOOL_THEME_CSS}\n</style>${LOCALSTORAGE_SHIM}<style>`);

  const isUsableToolHtml = (candidate) => {
    const t = String(candidate || '').toLowerCase();
    return t.includes('<!doctype') && (t.includes('<script') || t.includes('<main') || t.includes('<div id="app"'));
  };

  const hasPlaceholderComments = (candidate) => {
    const t = String(candidate || '');
    return /\/\/\s*(start|reset|update|add|todo|logic|calculate|draw)\s*(simulation|graph|ui|here|logic|code)/i.test(t);
  };

  const stripFences = (raw) => {
    let text = String(raw || '').replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/^```(?:html)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const start = text.toLowerCase().indexOf('<!doctype');
    if (start >= 0) text = text.slice(start);
    const end = text.toLowerCase().lastIndexOf('</html>');
    if (end !== -1) {
      text = text.slice(0, end + 7);
    } else if (text.includes('<!doctype') && text.includes('<script') && !text.includes('</script>')) {
      text = text + '\n</script></body></html>';
    } else if (text.includes('<!doctype') && !text.includes('</html>')) {
      text = text + '\n</body></html>';
    }
    return text;
  };

  let html = '';

  try {
    const rawHtml = await getChatCompletion(buildPrompt, 'qwen/qwen3.6-27b', 0.2, 5000, { forceJson: false });
    html = stripFences(rawHtml);

    if (!isUsableToolHtml(html) || hasPlaceholderComments(html)) {
      console.warn('First HTML attempt failed structural check — falling back to deterministic template.');
      html = fallbackHtml;
    }
  } catch (buildErr) {
    console.error('HTML build phase failed:', buildErr.message);
    html = fallbackHtml;
  }

  html = injectThemeCss(html);

  return {
    toolType,
    title,
    description,
    chatResponse: plan?.chatResponse || `I've created **${title}** for you! Explore the interactive tool on the canvas, or let me know if you want to quiz yourself or try another format.`,
    render: 'iframe',
    ui,
    app: { html },
    data: {
      chatResponse: plan?.chatResponse || `I've created **${title}** for you! Explore the interactive tool on the canvas, or let me know if you want to quiz yourself or try another format.`,
      items: items.map((it) => ({
        id:      String(it.id   || ''),
        title:   String(it.front || it.question || it.word || it.term || it.text || ''),
        content: String(it.back  || it.answer   || it.definition || it.content || ''),
        metadata: { tags: Array.isArray(it.tags) ? it.tags : [] },
      })),
    },
  };

}


// Meta cognitive analysis function that takes quiz attempt data and produces insights
// on error types, confidence calibration, and knowledge gaps.
export async function generateMetacognitiveAnalysis(quizData) {
  const questions = Array.isArray(quizData?.quiz)
    ? quizData.quiz
    : (typeof quizData?.quiz === 'string' ? JSON.parse(quizData.quiz || '[]') : []);

  const totalQuestions = questions.length;
  const correctCount = questions.filter((q) => q?.isCorrect).length;
  const incorrectQuestions = questions.filter((q) => !q?.isCorrect);
  const scorePercentage = totalQuestions > 0
    ? Math.round((correctCount / totalQuestions) * 100)
    : 0;

  // --- Confidence calibration ---
  const hasConfidenceData = questions.some(
    (q) => q?.confidence !== undefined && q?.confidence !== null
  );
  const questionsWithConfidence = questions.filter((q) => q?.confidence != null);
  let overconfidentCount = 0;
  let underconfidentCount = 0;
  let calibrationScore = 0;

  const errorTypeProfile = {
    conceptualMisunderstanding: 0,
    recallFailure: 0,
    carelessError: 0,
    unclassified: 0,
  };

  if (hasConfidenceData) {
    questions.forEach((q) => {
      const conf = q?.confidence;
      if (conf == null) return;
      if (conf >= 4 && !q.isCorrect) overconfidentCount++;
      if (conf <= 2 && q.isCorrect) underconfidentCount++;
    });

    incorrectQuestions.forEach((q) => {
      const conf = q?.confidence;
      if (conf == null) {
        errorTypeProfile.unclassified++;
      } else if (conf >= 4) {
        errorTypeProfile.conceptualMisunderstanding++;
      } else if (conf <= 2) {
        errorTypeProfile.recallFailure++;
      } else {
        errorTypeProfile.carelessError++;
      }
    });

    const calibrated = questions.filter((q) => {
      const conf = q?.confidence;
      if (conf == null) return false;
      return (conf >= 4) === Boolean(q.isCorrect);
    }).length;
    calibrationScore = questionsWithConfidence.length > 0
      ? Math.round((calibrated / questionsWithConfidence.length) * 100)
      : 0;
  } else {
    errorTypeProfile.unclassified = incorrectQuestions.length;
  }

  // --- Error clustering by topic ---
  const topicFrequency = {};
  incorrectQuestions.forEach((q) => {
    const topic = q?.topic || q?.tag || q?.category;
    if (topic) topicFrequency[topic] = (topicFrequency[topic] || 0) + 1;
  });
  const sortedTopics = Object.entries(topicFrequency)
    .sort((a, b) => b[1] - a[1])
    .map(([topic]) => topic);
  const mostProblematicType = sortedTopics[0] || null;
  const repeatedErrorPatterns = sortedTopics.filter((t) => topicFrequency[t] > 1).length;

  // --- Signature word extraction from wrong-answer prompts ---
  const stopWords = new Set([
    'the','a','an','is','are','was','were','of','in','on','at','to','for',
    'with','what','which','how','when','where','who','does','do','did','that',
    'this','these','those','from','and','or','but','not',
  ]);
  const wordFreq = {};
  incorrectQuestions.forEach((q) => {
    const words = String(q?.prompt || '').toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
    words.filter((w) => !stopWords.has(w)).forEach((w) => {
      wordFreq[w] = (wordFreq[w] || 0) + 1;
    });
  });
  const errorSignatureWords = Object.entries(wordFreq)
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);

  // --- Unique knowledge gap topics ---
  const inferredKnowledgeGaps = [
    ...new Set(
      incorrectQuestions
        .map((q) => q?.topic || q?.tag || q?.category || q?.prompt)
        .filter(Boolean)
    ),
  ]
    .slice(0, 5)
    .join(', ');

  // --- AI-generated personalised analysis ---
  let aiAnalysis = null;
  if (GROQ_KEY && totalQuestions > 0) {
    try {
      const questionSummary = questions
        .slice(0, 30)
        .map((q, i) => {
          const status = q?.isCorrect ? 'Correct' : 'Incorrect';
          const conf = q?.confidence != null ? ` (confidence: ${q.confidence}/5)` : '';
          const wrongAnswerInfo = !q?.isCorrect && q?.userAnswer && q?.correctAnswer 
            ? `\n    - User answered: "${q.userAnswer}"\n    - Correct answer: "${q.correctAnswer}"` 
            : '';
          return `Q${i + 1}: "${String(q?.prompt || '').slice(0, 150)}" — ${status}${conf}${wrongAnswerInfo}`;
        })
        .join('\n');

      const confidenceLine = hasConfidenceData
        ? `Overconfident (high confidence + wrong): ${overconfidentCount}\nUnderconfident (low confidence + correct): ${underconfidentCount}\nCalibration score: ${calibrationScore}% (out of ${questionsWithConfidence.length} rated questions)`
        : 'No confidence data available.';

      const errorProfileLine = hasConfidenceData
        ? `Error profile — Conceptual misunderstandings: ${errorTypeProfile.conceptualMisunderstanding}, Recall failures: ${errorTypeProfile.recallFailure}, Careless errors: ${errorTypeProfile.carelessError}${errorTypeProfile.unclassified ? `, Unclassified: ${errorTypeProfile.unclassified}` : ''}`
        : '';

      const aiPrompt = `You are Vela, an elite AI learning companion. Your goal is to provide a "Mind's Mirror" — a deep, reflective analysis of this student's learning patterns. Based on the data below, write SPECIFIC and PERSONALISED feedback. Avoid generic advice.
CRITICAL INSTRUCTION: For any incorrect answers, explicitly analyze the delta between the User's answer and the Correct answer to determine their exact misunderstanding.

Score: ${correctCount}/${totalQuestions} (${scorePercentage}%)
${confidenceLine}
${errorProfileLine}
${mostProblematicType ? `Most problematic topic: ${mostProblematicType}` : ''}
${errorSignatureWords.length ? `Recurring words in wrong answers: ${errorSignatureWords.join(', ')}` : ''}

Questions:
${questionSummary}

Return ONLY valid JSON with this exact structure:
{
  "performanceSummary": "2–3 sentences referencing specific mistakes, not just the score",
  "patternSpecificity": "the concrete error pattern you identified (topic, question type, or wording cues)",
  "confidenceMismatch": ${hasConfidenceData ? '"describe overconfidence or underconfidence with specific numbers"' : 'null'},
  "behavioralInsight": "what this student's answering behaviour reveals about their study approach",
  "knowledgeGaps": "the specific concepts or topic areas they need to address",
  "reflectionPrompts": ["specific prompt 1", "specific prompt 2", "specific prompt 3"],
  "studyStrategies": "2–3 concrete, targeted strategies matching their exact weaknesses",
  "encouragement": "one personalised, honest sentence of encouragement",
  "recommendedTools": [
    {
      "toolType": "flashcards | quiz | timeline | diagram | flowchart | mnemonic | etc",
      "title": "Short catchy title",
      "description": "1 sentence on how this helps their specific gap",
      "prompt": "The exact prompt Vela should use to build this tool"
    }
  ]
}`;

      const raw = await getChatCompletion(aiPrompt, 'qwen/qwen3.6-27b', 0.3, 1500, { forceJson: true });
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') aiAnalysis = parsed;
    } catch (err) {
      console.warn('AI metacognitive analysis failed, using rule-based fallback:', err.message);
    }
  }

  // --- Fallback rule-based strings ---
  const fallbackPatternSpecificity = incorrectQuestions.length
    ? `Mistakes concentrated across ${incorrectQuestions.length} question${incorrectQuestions.length > 1 ? 's' : ''}${mostProblematicType ? `, especially around "${mostProblematicType}"` : ''}. Look for recurring cues in those prompts.`
    : 'No major error pattern detected in this quiz attempt.';

  const fallbackConfidenceMismatch = hasConfidenceData
    ? `${overconfidentCount} overconfident answer${overconfidentCount !== 1 ? 's' : ''} (high confidence, wrong) and ${underconfidentCount} underconfident answer${underconfidentCount !== 1 ? 's' : ''} (low confidence, correct). Calibration: ${calibrationScore}%.`
    : null;

  const fallbackBehavioralInsight =
    scorePercentage >= 80
      ? 'Strong retention. Focus on speed and consistency under timed conditions.'
      : scorePercentage >= 60
        ? 'Moderate understanding. Reinforce weak concepts with active recall and spaced repetition.'
        : 'Foundational gaps remain. Prioritise concept revision before attempting advanced practice.';

  return {
    performanceSummary:
      aiAnalysis?.performanceSummary ||
      `You answered ${correctCount} out of ${totalQuestions} correctly (${scorePercentage}%).`,
    patternSpecificity: aiAnalysis?.patternSpecificity || fallbackPatternSpecificity,
    confidenceMismatch: aiAnalysis?.confidenceMismatch ?? fallbackConfidenceMismatch,
    behavioralInsight: aiAnalysis?.behavioralInsight || fallbackBehavioralInsight,
    knowledgeGaps: aiAnalysis?.knowledgeGaps || inferredKnowledgeGaps || 'No specific gaps detected yet',
    reflectionPrompts: aiAnalysis?.reflectionPrompts || [
      'Which question type caused the most friction, and why?',
      'Where did your first instinct differ from the correct reasoning?',
      'What single concept should you review before your next quiz?',
    ],
    studyStrategies:
      aiAnalysis?.studyStrategies ||
      'Review weak concepts, run a short timed practice set, then revisit mistakes with corrected reasoning notes.',
    confidenceLevel: scorePercentage >= 80 ? 'High' : scorePercentage >= 60 ? 'Medium' : 'Low',
    encouragement:
      aiAnalysis?.encouragement ||
      'I am here to help you improve — targeted revision on weak areas will produce fast gains.',
    recommendedTools: aiAnalysis?.recommendedTools || [
      {
        toolType: 'flashcards',
        title: 'Gap Reinforcement',
        description: 'Targeted flashcards for your recent mistakes.',
        prompt: `Generate flashcards focusing on ${inferredKnowledgeGaps || 'the concepts missed in the recent quiz'}.`
      }
    ],
    scorePercentage,
    totalQuestions,
    correctCount,
    incorrectCount: incorrectQuestions.length,
    algorithmicMetrics: {
      confidenceAnalysis: {
        hasConfidenceData,
        overconfidentCount,
        underconfidentCount,
        calibrationScore,
      },
      errorClustering: {
        errorSignatureWords,
        mostProblematicType,
        repeatedErrorPatterns,
        topicFrequency,
        errorTypeProfile,
      },
      questionClassification: {
        method: aiAnalysis ? 'ai-enhanced' : 'rule-based',
        typeBreakdown: sortedTopics.map((topic) => ({
          type: topic,
          errorCount: topicFrequency[topic],
        })),
      },
    },
  };
}
