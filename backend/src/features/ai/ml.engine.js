import fetch from 'node-fetch';
import { pipeline } from '@huggingface/transformers';
import pool from '../../shared/config/dbPool.js';
import fs from 'fs/promises';
import path from 'path';

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

// Retry helper with backoff
async function retryWithBackoff(fn, maxRetries = 5, initialDelay = 2000) {
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
        const delay = initialDelay * Math.pow(2, i);
        console.log(`Rate limited by GROQ. Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
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
          model: 'llama-3.1-8b-instant',
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
  model = 'llama-3.1-8b-instant',
  temperature = 0.7,
  maxTokens = 1000,
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
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature,
        max_tokens: maxTokens,
        ...(forceJson ? { response_format: { type: 'json_object' } } : {}),
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Groq API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.choices[0].message.content.trim();
  });
}

// AI function for the learning playground — delegates to getChatCompletion with a larger model.
// Kept as a separate export so call-sites remain unchanged.
export async function toolGenAI(
  prompt,
  model = 'llama-3.3-70b-versatile',
  temperature = 0.7,
  maxTokens = 1000,
  options = {}
) {
  return getChatCompletion(prompt, model, temperature, maxTokens, options);
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

  // Reuses getChatCompletion instead of duplicating the fetch block
  return getChatCompletion(prompt, 'llama-3.1-8b-instant', 0.1, 140);
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


// generateLearningTool  (two-phase: plan → build)
// PHASE 1 — small JSON-only call; planner picks toolType + writes its own htmlDesignBrief.
// PHASE 2 — plain-text HTML-only call. No JSON wrapping → no Groq json_validate_failed errors.

export async function generateLearningTool(userId, prompt, context, options = {}) {
  const promptText = String(prompt || '').trim();
  if (!promptText) throw new Error('prompt is required');

  console.log('ML ENGINE generateLearningTool context type:', typeof context, 'isArray:', Array.isArray(context), 'length:', context?.length);

  let contextString = '';
  if (Array.isArray(context) && context.length > 0) {
    contextString = `\n\nSTUDENT'S RECENT MISTAKES TO FOCUS ON:\n`;
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
    const cleaned = String(text || '').replace(/```json|```/gi, '').trim();
    try { return JSON.parse(cleaned); } catch { /* try extraction */ }
    const first = cleaned.indexOf('{');
    const last  = cleaned.lastIndexOf('}');
    if (first !== -1 && last > first) {
      try { return JSON.parse(cleaned.slice(first, last + 1)); } catch { /* fall */ }
    }
    return null;
  };

  // ── PHASE 1 — plan (~1 600 tokens, JSON) ───────────────────────────────────
  const planPrompt = `
You are an educational tool planner. Given a user's learning request, decide the BEST tool format and produce a
structured content plan.

USER REQUEST: "${promptText}"${contextString}

Return ONLY valid JSON — no markdown, no extra text:
{
  "toolType": "the single best format for this request — you may use any of these or invent your own if it fits better:
  flashcards | quiz | timeline | diagram | comparison-table | flowchart | mnemonic | story | memory-game | study-guide |
  formula-visualizer | concept-map | checklist | drag-and-drop-sort | drag-and-drop-match | word-scramble | fill-in-the-blank |
  crossword | matching-pairs | ordering-activity | annotation | simulation | calculator | converter | cheat-sheet | reference-card |
   lesson | tutorial | debate | pros-cons | case-study | image",
  "title": "clear title for this tool",
  "description": "2 sentences explaining what this tool teaches and how",
  "ui": "best layout keyword: cards | list | board | graph | steps | grid | interactive | visual | game | table | document | image",
  "htmlDesignBrief": "3–5 specific sentences describing exactly what the HTML app should look like and how it should behave. Reference the toolType, key interactions, layout, and any animations or game mechanics. This will be used directly as a build instruction — be precise.",
  "items": [
    {
      "id": "1",
      "front": "question, term, event title, step, word, or concept (max 15 words)",
      "back": "answer, definition, explanation, detail, or hint (max 80 words)",
      "tags": ["relevant", "tags"]
    }
  ]
}

Rules:
- If the user asks for a realistic picture, photograph, complex illustration, or anatomical drawing (like the human body, animal, landscape), you MUST set toolType to "image".
- If the user asks for a mindmap, mind map, or concept map, you MUST set toolType to "mindmap".
- If the user asks for a flowchart, structural diagram, set toolType to "diagram" or "flowchart".
- items array must have 12–18 entries, each substantive and specific to the request
- htmlDesignBrief must describe the SPECIFIC tool being built, not be generic — if it is a word scramble,
 describe the scrambled letters mechanic; if a crossword, describe the grid; if a calculator, describe the inputs and formula; etc.
- Keep ALL strings free of unescaped double-quotes (use single quotes inside strings)
`;

  let plan = null;
  try {
    const planRaw = await toolGenAI(planPrompt, 'llama-3.3-70b-versatile', 0.3, 1600, { forceJson: true });
    plan = safeParse(planRaw);
  } catch {
    const planRaw = await toolGenAI(planPrompt, 'llama-3.3-70b-versatile', 0.3, 1600, { forceJson: false });
    plan = safeParse(planRaw);
  }

  if (!plan || !Array.isArray(plan.items)) {
    plan = {
      toolType: 'flashcards',
      title: promptText.slice(0, 60),
      description: 'Interactive flashcards generated from your request.',
      ui: 'cards',
      htmlDesignBrief: 'A flip-card deck where clicking each card rotates it 180 degrees to reveal the answer on the back. Include Previous, Next, and Shuffle buttons, a progress counter, and a completion banner.',
      items: [{ id: '1', front: 'Review your notes', back: 'No content could be parsed. Please try a more specific prompt.', tags: [] }],
    };
  }

  const toolType    = String(plan.toolType        || 'flashcards').toLowerCase();
  const title       = String(plan.title           || 'Learning Tool');
  const description = String(plan.description     || 'Generated from your request.');
  const ui          = String(plan.ui              || 'cards').toLowerCase();
  const brief       = String(plan.htmlDesignBrief || `An interactive ${toolType} learning tool that displays each item engagingly.`);
  const items       = plan.items.slice(0, 18);
  const itemsJson   = JSON.stringify(items);

  // ── IMAGE SHORT-CIRCUIT (Bypass HTML Generation) ─────────────────────────
  console.log('AI PLANNER SELECTED TOOL TYPE:', toolType);
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

  // ── PHASE 2 — build HTML (plain text, up to 32 768 tokens) ────────────────

  // Fixed design-system theme injected into every generated tool
  const TOOL_THEME_CSS = `
  :root {
    --background: oklch(0.1743 0.0227 283.7998);
    --foreground: oklch(0.9185 0.0257 285.8834);
    --card: oklch(0.2284 0.0384 282.9324);
    --card-foreground: oklch(0.9185 0.0257 285.8834);
    --popover: oklch(0.2284 0.0384 282.9324);
    --popover-foreground: oklch(0.9185 0.0257 285.8834);
    --primary: oklch(0.750 0.150 190.0);
    --primary-foreground: oklch(0.1743 0.0227 283.7998);
    --secondary: oklch(0.3139 0.0736 283.4591);
    --secondary-foreground: oklch(0.8367 0.0849 285.9111);
    --muted: oklch(0.2710 0.0621 281.4377);
    --muted-foreground: oklch(0.7166 0.0462 285.1741);
    --accent: oklch(0.320 0.070 190.0);
    --accent-foreground: oklch(0.950 0.020 200.0);
    --destructive: oklch(0.6861 0.2061 14.9941);
    --destructive-foreground: oklch(1.0000 0 0);
    --border: oklch(0.3261 0.0597 282.5832);
    --input: oklch(0.3261 0.0597 282.5832);
    --ring: oklch(0.750 0.150 190.0);
    --radius: 0.5rem;
    --font-sans: Inter, sans-serif;
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; }
  body { background: var(--background); color: var(--foreground); font-family: var(--font-sans); }
  #app { display: flex; flex-direction: column; min-height: 100vh; }
  #app-header { background: var(--card); border-bottom: 1px solid var(--border); padding: 1rem 1.5rem; display: flex; flex-direction: column; gap: 0.25rem; }
  #app-header h1 { font-size: 1.25rem; font-weight: 700; color: var(--primary); }
  #app-header p  { font-size: 0.875rem; color: var(--muted-foreground); }
  #app-progress  { font-size: 0.75rem; color: var(--muted-foreground); text-align: right; }
  #app-main { flex: 1; overflow-y: auto; padding: 1.5rem; display: flex; flex-direction: column; align-items: center; gap: 1rem; }
  #app-footer { background: var(--card); border-top: 1px solid var(--border); padding: 0.75rem 1.5rem; display: flex; justify-content: center; gap: 0.75rem; flex-wrap: wrap; }
  .card { background: var(--card); color: var(--card-foreground); border-radius: var(--radius); border: 1px solid var(--border); padding: 1.25rem; }
  .card:hover { border-color: var(--primary); }
  .btn { border: none; border-radius: var(--radius); padding: 0.5rem 1.25rem; font-weight: 600; cursor: pointer; transition: opacity 0.15s, background 0.15s; font-size: 0.9rem; }
  .btn-primary { background: var(--primary); color: var(--primary-foreground); }
  .btn-primary:hover { opacity: 0.85; }
  .btn-secondary { background: var(--secondary); color: var(--secondary-foreground); border: 1px solid var(--border); }
  .btn-secondary:hover { background: var(--accent); color: var(--accent-foreground); }
  .btn-ghost { background: transparent; color: var(--muted-foreground); border: 1px solid var(--border); }
  .btn-ghost:hover { background: var(--muted); color: var(--foreground); }
  .btn-destructive { background: var(--destructive); color: var(--destructive-foreground); }
  input, select, textarea { background: var(--input); color: var(--foreground); border: 1px solid var(--border); border-radius: var(--radius); padding: 0.5rem 0.75rem; outline: none; width: 100%; }
  input:focus, select:focus, textarea:focus { box-shadow: 0 0 0 2px var(--ring); }
  .muted { color: var(--muted-foreground); }
  .badge { background: var(--secondary); color: var(--secondary-foreground); border-radius: 9999px; padding: 0.125rem 0.6rem; font-size: 0.75rem; display: inline-block; }
  .correct { background: oklch(0.35 0.10 155); color: oklch(0.9 0.05 155); }
  .incorrect { background: oklch(0.35 0.12 15); color: oklch(0.95 0.04 15); }
  .divider { width: 100%; height: 1px; background: var(--border); }
`;

  const mechanicHints = [
    toolType.includes('drag') && `- Use the HTML5 Drag and Drop API: draggable="true" on source elements, dragstart sets dataTransfer.setData('text/plain', id), dragover calls e.preventDefault(), drop calls e.preventDefault() then reads dataTransfer.getData('text/plain').`,
    (toolType.includes('quiz') || toolType.includes('fill')) && `- Show instant per-question feedback (green correct / red incorrect). Display a final score screen with retry button.`,
    (toolType.includes('game') || toolType.includes('memory') || toolType.includes('scramble') || toolType.includes('crossword')) && `- Track score/moves/time. Show a win/completion screen with stats and a play-again button.`,
    toolType.includes('flash') && `- CSS flip animation: transform rotateY(180deg) on click, using transform-style: preserve-3d and backface-visibility: hidden on front/back faces.`,
    toolType.includes('timeline') && `- Alternating left/right layout on desktop, single column on mobile. Vertical connecting line with coloured dots at each node.`,
    (toolType.includes('calculator') || toolType.includes('converter') || toolType.includes('formula')) && `- Live computation: update result as the user types. Show step-by-step working where relevant.`,
    (toolType.includes('diagram') || toolType.includes('flowchart') || toolType.includes('concept') || toolType.includes('map')) && `- Embed Mermaid.js via CDN (<script type="module">import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs'; mermaid.initialize({ startOnLoad: true, theme: 'dark', background: 'transparent' });</script>) and render a highly detailed diagram representing the learning concepts using <pre class="mermaid">...</pre>. CRITICAL: The mermaid syntax MUST be 100% valid. ALWAYS wrap node text labels in double quotes (e.g., A["Label with (parens)"]). DO NOT use spaces or special characters in node IDs.`,
  ].filter(Boolean).join('\n');

  const buildPrompt = `
You are building a self-contained interactive HTML learning tool. Return ONLY the raw HTML — nothing else.

TOOL TYPE   : ${toolType}
TITLE       : ${title}
DESCRIPTION : ${description}

CONTENT DATA (embed exactly as: const DATA = ${itemsJson}; inside a <script> tag):

WHAT TO BUILD — follow this brief precisely:
${brief}
${mechanicHints ? `\nAdditional mechanic requirements:\n${mechanicHints}` : ''}

REQUIRED PAGE STRUCTURE — every tool MUST use this exact shell:
<div id="app">
  <header id="app-header">
    <h1>[Tool title]</h1>
    <p>[Short description]</p>
    <span id="app-progress">[e.g. "3 / 12" or score]</span>
  </header>
  <main id="app-main">
    <!-- tool-specific content rendered here by JS -->
  </main>
  <footer id="app-footer">
    <!-- navigation / action buttons here -->
  </footer>
</div>
Use the CSS classes defined in the theme (<style> block below) for ALL colours, buttons, cards, and inputs.
Do NOT use Tailwind colour utilities (e.g. bg-indigo-500) for colours — use var(--primary), var(--card), etc. instead.
Tailwind may still be used for layout helpers (flex, grid, gap, padding, etc.).

STRICT RULES:
1. Start with <!DOCTYPE html> and end with </html> — nothing before or after.
2. <head> must include in this exact order:
   <meta charset="UTF-8">
   <meta name="viewport" content="width=device-width, initial-scale=1.0">
   <script src="https://cdn.tailwindcss.com"></script>
   <style> [the THEME_CSS block below, then any extra animations] </style>
3. Paste the THEME_CSS verbatim inside the <style> block — do not modify it.
4. All JavaScript inside <script> tags at end of <body>. No external JS libraries.
5. Embed the DATA array directly in JS — do NOT fetch or import anything.
6. Fully functional offline — no external API calls.
7. Mobile-responsive. Works at both 375 px and 1280 px wide.
8. Minimum 500 lines. Cover EVERY item in DATA.
9. Do NOT wrap in markdown fences — raw HTML only.

THEME_CSS (paste verbatim inside your <style> block):
${TOOL_THEME_CSS}
`;

  let html = '';
  try {
    html = await toolGenAI(buildPrompt, 'llama-3.3-70b-versatile', 0.4, 32768, { forceJson: false });
    html = html.replace(/^```(?:html)?\s*/i, '').replace(/\s*```$/i, '').trim();
    if (!html.toLowerCase().startsWith('<!doctype')) {
      const idx = html.toLowerCase().indexOf('<!doctype');
      html = idx !== -1 ? html.slice(idx)
        : `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><script src="https://cdn.tailwindcss.com"></script><style>${TOOL_THEME_CSS}</style></head><body><div id="app"><header id="app-header"><h1>${title}</h1><p>${description}</p></header><main id="app-main"></main><footer id="app-footer"></footer></div></body></html>`;
    }
  } catch (buildErr) {
    console.error('HTML build phase failed:', buildErr.message);
    html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><script src="https://cdn.tailwindcss.com"></script><style>${TOOL_THEME_CSS}</style></head><body><div id="app"><header id="app-header"><h1>${title}</h1><p>${description}</p></header><main id="app-main"><div class="card w-full max-w-2xl"><ul class="space-y-3">${items.map(it => `<li class="card"><strong>${it.front}</strong><p class="muted text-sm mt-1">${it.back}</p></li>`).join('')}</ul></div></main><footer id="app-footer"></footer></div></body></html>`;
  }

  return {
    toolType,
    title,
    description,
    render: 'iframe',
    ui,
    app: { html },
    data: {
      items: items.map((it) => ({
        id:       String(it.id),
        title:    String(it.front),
        content:  String(it.back),
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

      const raw = await getChatCompletion(aiPrompt, 'llama-3.3-70b-versatile', 0.3, 1500, { forceJson: true });
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
