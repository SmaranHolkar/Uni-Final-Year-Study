import pool from '../../shared/config/dbPool.js';
import { getEmbedding, getChatCompletion } from './ml.engine.js';

/**
 * Handles Source-Grounded Chat query execution with exact paragraph citations and confidence metrics.
 */
export async function executeGroundedChat({
  prompt,
  selectedDocumentTitles = [],
  groundingMode = 'strict', // 'strict' or 'enrich'
  chatHistory = [],
  userId
}) {
  if (!prompt || typeof prompt !== 'string') {
    throw new Error('Prompt is required');
  }
  if (!userId) {
    throw new Error('User authentication required');
  }

  // 1. Generate query embedding
  const queryVec = await getEmbedding(prompt);
  const vecStr = `[${queryVec.join(',')}]`;

  // 2. Fetch top vector matching chunks from DB
  const client = await pool.connect();
  let retrievedChunks = [];

  try {
    let query, params;
    const hasFilter = Array.isArray(selectedDocumentTitles) && selectedDocumentTitles.length > 0;

    if (hasFilter) {
      query = `
        SELECT 
          id, 
          title, 
          chunk_text, 
          COALESCE(paragraph_index, 1) as paragraph_index,
          COALESCE(page_number, 1) as page_number,
          (embedding <-> $1::vector) as distance
        FROM public.w_embeddings
        WHERE user_id = $2 AND title = ANY($3::text[])
        ORDER BY embedding <-> $1::vector ASC
        LIMIT 10
      `;
      params = [vecStr, userId, selectedDocumentTitles];
    } else {
      query = `
        SELECT 
          id, 
          title, 
          chunk_text, 
          COALESCE(paragraph_index, 1) as paragraph_index,
          COALESCE(page_number, 1) as page_number,
          (embedding <-> $1::vector) as distance
        FROM public.w_embeddings
        WHERE user_id = $2
        ORDER BY embedding <-> $1::vector ASC
        LIMIT 10
      `;
      params = [vecStr, userId];
    }

    const { rows } = await client.query(query, params);
    retrievedChunks = rows;
  } finally {
    client.release();
  }

  // 3. Compute Grounding Confidence Rating
  let groundingConfidence = 0;
  if (retrievedChunks.length > 0) {
    // Distance ranges from ~0 (identical) to ~1+ (orthogonal)
    const bestDistance = Number(retrievedChunks[0].distance) || 0.5;
    const similarity = Math.max(0, 1 - bestDistance);
    groundingConfidence = Math.min(99, Math.round(similarity * 100));
  }

  // 4. Construct Context Block with Citation Identifiers
  const contextBlock = retrievedChunks.map((chunk, idx) => {
    return `--- CONTEXT CHUNK ${idx + 1} ---
ID: ${chunk.id}
Document Title: "${chunk.title}"
Paragraph Index: ${chunk.paragraph_index}
Page Number: ${chunk.page_number}
Text:
${chunk.chunk_text}
`;
  }).join('\n\n');

  // 5. System Prompt Construction
  const isStrict = groundingMode === 'strict';
  const systemPrompt = `You are HydrusLearn Source-Grounded AI, an accurate study assistant modeled on Google NotebookLM.

GROUNDING RULES:
${isStrict 
  ? `1. STRICT SOURCE GROUNDING MODE IS ACTIVE. You MUST answer the user's question ONLY using the provided source context chunks below. Do NOT use outside knowledge or make ungrounded assumptions.
2. If the answer cannot be answered directly from the provided source chunks, state explicitly: "Based on your selected study documents, this information is not present in your uploaded material."`
  : `1. HYBRID GROUNDING MODE ACTIVE. Prioritize the provided source context chunks. First explain using the uploaded context, then you may enrich with supplementary academic context.`
}

CITATION RULES:
- Whenever you present a fact or explanation from a context chunk, you MUST attach an inline paragraph citation using EXACTLY this tag format:
  [Cite: id="{chunk_id}", title="{document_title}", para={paragraph_index}]
- Example: "Photosynthesis takes place in chloroplasts [Cite: id="102", title="Biology Notes", para=3]."
- Include multiple citations if synthesizing from multiple chunks.

USER QUESTION:
"${prompt}"

AVAILABLE SOURCE CONTEXT:
${contextBlock || 'NO SOURCE DOCUMENTS AVAILABLE FOR THIS USER QUERY.'}
`;

  // 6. Generate Response via Groq LLM
  const historyMessages = Array.isArray(chatHistory) 
    ? chatHistory.slice(-4).map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n')
    : '';

  const fullPrompt = historyMessages 
    ? `Recent Conversation History:\n${historyMessages}\n\n${systemPrompt}`
    : systemPrompt;

  const rawAnswer = await getChatCompletion(fullPrompt, 'llama-3.3-70b-versatile', 0.2, 1200);

  // 7. Parse & Extract Citations for Frontend Render
  const citationRegex = /\[Cite:\s*id="([^"]+)",\s*title="([^"]+)",\s*para=(\d+)\]/g;
  const citations = [];
  let match;

  while ((match = citationRegex.exec(rawAnswer)) !== null) {
    const chunkId = match[1];
    const docTitle = match[2];
    const paraIndex = parseInt(match[3], 10);
    
    // Find matching chunk text snippet
    const matchedChunk = retrievedChunks.find(c => String(c.id) === String(chunkId)) || 
      retrievedChunks.find(c => c.title === docTitle && Number(c.paragraph_index) === paraIndex);

    citations.push({
      chunkId,
      title: docTitle,
      paragraphIndex: paraIndex,
      snippet: matchedChunk ? matchedChunk.chunk_text.slice(0, 180) + '...' : ''
    });
  }

  return {
    answer: rawAnswer,
    citations,
    groundingConfidence,
    retrievedChunks: retrievedChunks.map(c => ({
      id: c.id,
      title: c.title,
      paragraphIndex: c.paragraph_index,
      pageNumber: c.page_number,
      snippet: c.chunk_text
    }))
  };
}
