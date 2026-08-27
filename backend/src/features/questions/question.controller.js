import { getEmbedding, getTopChunks, generateMCQs, aiMindmapNode, generateLearningTool as generateLearningToolUtil, toolGenAI, generateDeterministicFallbackHtml } from '../ai/ml.engine.js';

import { generateStudySuggestions } from '../ai/ai.service.js';
import { getCorrectAnswerText } from '../../shared/utils/quiz.utils.js';
import pool from '../../shared/config/dbPool.js';
import {
  getTierStatusForUser,
  getDueSpacedRepetition as getDueSpacedRepetitionItems,
  markSpacedRepetitionReviewed as markSpacedRepetitionReviewedItem,
} from '../../shared/services/tier.service.js';

// Generate Questions
export async function generateQuestions(req, res) {
  try {
    const { queryText, count = 15, documentId = null } = req.body;
    const userId = req.user?.id;
    console.log('Query:', queryText, 'DocumentId:', documentId, 'UserId:', userId);

    const embedding = await getEmbedding(queryText);
    const chunks = await getTopChunks(embedding, 15, userId, documentId);

    if (!chunks.length) {
      return res.status(404).json({ error: 'No matching content' });
    }

    const context = chunks.map(c => c.chunk_text).join('\n');
    const questions = await generateMCQs(context, count);

    res.json({ questions });
  } catch (err) {
    console.error('BACKEND ERROR:', err);
    res.status(500).json({ error: 'Failed to generate questions' });
  }
}

/* Generate Mindmap */
export async function generateMindmap(req, res) {
  try {
    const { wrongQuestions, topic, prompt: topicPrompt } = req.body;
    const userId = req.user?.id;

    // ── Route A: Quiz-review mindmap from wrong questions ─────────────────────
    if (Array.isArray(wrongQuestions) && wrongQuestions.length > 0) {
      const nodes = [{ id: 'root', label: 'Review Topics', description: 'Topics to review based on your incorrect answers', sourceLink: 'Source link' }];
      const edges = [];

      const maxQuestions = Number(process.env.MINDMAP_MAX_QUESTIONS || 6);
      const concurrency = Math.max(1, Number(process.env.MINDMAP_CONCURRENCY || 2));
      const maxConcurrency = Math.min(concurrency, 3);
      const selectedWrongQuestions = wrongQuestions.slice(0, maxQuestions);
      console.log(`[MINDMAP] Processing ${selectedWrongQuestions.length}/${wrongQuestions.length} wrong questions with concurrency ${maxConcurrency}`);

      const generatedNodes = [];
      let cursor = 0;

      async function processOne(index) {
        const q = selectedWrongQuestions[index];
        const id = `n${index}`;
        const label = (q.prompt && String(q.prompt).slice(0, 120)) || `Topic ${index + 1}`;
        let description = '';

        try {
          const text = (q.prompt && String(q.prompt)) || '';
          if (text.trim()) {
            const emb = await getEmbedding(text);
            const chunks = await getTopChunks(emb, 3, userId);
            if (Array.isArray(chunks) && chunks.length) {
              console.log('Context received for mindmap node:', chunks[0].chunk_text ? 'Yes' : 'No');
              const correctAnswerText = getCorrectAnswerText(q);
              description = await aiMindmapNode({
                question: q.prompt,
                correctAnswer: correctAnswerText,
                context: chunks[0].chunk_text,
                sourceLink: q.sourceLink || ''
              });
            }
          }
        } catch (err) {
          console.error('Error fetching chunks for question:', err);
        }

        if (description && description.trim().length > 0) {
          generatedNodes.push({
            index,
            node: { id, label, description, category: 'Suggested Review', sourceLink: q.resource || '' },
            edge: { from: 'root', to: id }
          });
        } else {
          console.warn(`AI did not return description for node ${id} (${label})`);
        }

        // Small jitter smooths burstiness while staying far faster than fixed 5s sleeps.
        const jitterMs = 250 + Math.floor(Math.random() * 250);
        await new Promise(resolve => setTimeout(resolve, jitterMs));
      }

      async function worker() {
        while (cursor < selectedWrongQuestions.length) {
          const nextIndex = cursor;
          cursor += 1;
          await processOne(nextIndex);
        }
      }

      await Promise.all(Array.from({ length: Math.min(maxConcurrency, selectedWrongQuestions.length) }, () => worker()));

      generatedNodes
        .sort((a, b) => a.index - b.index)
        .forEach(({ node, edge }) => {
          nodes.push(node);
          edges.push(edge);
        });

      return res.json({ mindmap: { nodes, edges } });
    }

    // ── Route B: Topic-based mindmap from a free-form text prompt ─────────────
    const topicText = String(topic || topicPrompt || '').trim();
    if (topicText) {
      const mindmapPrompt = `You are building a study mindmap. Generate a structured mindmap for this topic: "${topicText}"

Return ONLY valid JSON — no markdown, no extra text:
{
  "title": "short root label (4-7 words max)",
  "concepts": [
    { "label": "concept name (3-6 words)", "description": "2-3 sentence explanation. Be specific and educational. Max 60 words." },
    { "label": "...", "description": "..." }
  ]
}

Rules:
- Include exactly 6 concepts
- Each concept must be a distinct, important aspect of the topic
- Descriptions must be educational and student-focused
- No repetition between concepts`;

      let parsed = null;
      try {
        const raw = await toolGenAI(mindmapPrompt, 'llama-3.3-70b-versatile', 0.3, 900, { forceJson: true });
        parsed = JSON.parse(raw);
      } catch (e) {
        console.error('Failed to parse mindmap JSON:', e);
        return res.status(500).json({ error: 'Failed to generate mindmap structure' });
      }

      if (!parsed || !Array.isArray(parsed.concepts)) {
        return res.status(500).json({ error: 'Invalid mindmap structure returned by AI' });
      }

      const nodes = [
        { id: 'root', label: parsed.title || topicText.slice(0, 60), description: '', sourceLink: '' },
        ...parsed.concepts.map((c, i) => ({
          id: `n${i}`,
          label: String(c.label || `Topic ${i + 1}`).slice(0, 120),
          description: String(c.description || ''),
          category: 'Key Concept',
          sourceLink: '',
        }))
      ];
      const edges = parsed.concepts.map((_, i) => ({ from: 'root', to: `n${i}` }));

      return res.json({ mindmap: { nodes, edges } });
    }

    return res.status(400).json({ error: 'Provide either wrongQuestions array or a topic string' });
  } catch (err) {
    console.error(' MINDMAP ERROR:', err);
    res.status(500).json({ error: err.message });
  }
}

// Generate an interactive learning tool plan from a free-form user prompt
export async function generateLearningTool(req, res) {
  try {
    let { prompt, context, metacognitiveAnalysis, documentTitle, chatHistory, previousTool } = req.body;

    const userId = req.user?.id;

    if (documentTitle) {
      try {
        documentTitle = decodeURIComponent(String(documentTitle).replace(/\+/g, ' ')).trim();
      } catch {
        documentTitle = String(documentTitle).replace(/\+/g, ' ').trim();
      }
    }

    console.log('--- GENERATE LEARNING TOOL CALLED ---');
    console.log('Prompt:', prompt);
    console.log('Document Title:', documentTitle || 'None');

    console.log('Previous Tool:', previousTool?.title || 'None');
    console.log('Chat History length:', Array.isArray(chatHistory) ? chatHistory.length : 0);
    console.log('Context length:', context ? (Array.isArray(context) ? context.length : 'object') : 'none');

    if (!prompt || !String(prompt).trim()) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    const tool = await generateLearningToolUtil(userId, prompt, context, {
      metacognitiveAnalysis,
      documentTitle,
      chatHistory,
      previousTool
    });

    return res.json({ success: true, tool });
  } catch (err) {
    console.error('TOOL GENERATOR CONTROLLER ERROR:', err);
    // Provide a resilient fallback tool so tool generation never crashes with HTTP 500
    const rawPrompt = String(req.body?.prompt || '').trim();
    const lowerP = rawPrompt.toLowerCase();
    const isChem = lowerP.includes('chem') || lowerP.includes('titration') || lowerP.includes('beaker');
    const is3D = lowerP.includes('3d');
    const isCrossword = lowerP.includes('crossword');
    const isQuiz = lowerP.includes('quiz') || lowerP.includes('mcq');
    const isGuide = lowerP.includes('guide') || lowerP.includes('notes');

    const cleanTopic = rawPrompt.replace(/^(create|generate|make|build|give me|help me with|flashcards for|quiz on|crossword on|diagram of)\s+/i, '').trim() || 'Study Concept';
    const fallbackToolType = isChem ? 'chemistry-simulator' : (is3D ? '3d-simulation' : (isCrossword ? 'crossword' : (isQuiz ? 'quiz' : (isGuide ? 'revision-kit' : 'flashcards'))));
    const fallbackTitle = `${cleanTopic} Revision Tool`;
    const fallbackDesc = `Interactive revision tool on ${cleanTopic}.`;
    const fallbackHtml = generateDeterministicFallbackHtml(fallbackToolType, fallbackTitle, fallbackDesc, []);

    const fallbackTool = {
      toolType: fallbackToolType,
      title: fallbackTitle,
      description: fallbackDesc,
      chatResponse: `I've prepared your interactive ${fallbackToolType} for **${cleanTopic}** on the canvas!`,
      render: 'iframe',
      ui: 'interactive',
      app: { html: fallbackHtml },
      html: fallbackHtml,
      data: {
        chatResponse: `I've prepared your interactive ${fallbackToolType} for **${cleanTopic}** on the canvas!`,
        items: []
      }
    };
    return res.json({ success: true, tool: fallbackTool });
  }
}



// Save a Learning Playground session (messages + latest generated tool)
export async function saveLearningPlaygroundSession(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ success: false, message: 'Auth required' });

  try {
    const {
      title = '',
      messages = [],
      generatedTool = null,
      context = null,
      latestPrompt = '',
      sessionId = null,
    } = req.body || {};

    if (!Array.isArray(messages)) {
      return res.status(400).json({ success: false, message: 'messages must be an array' });
    }

    const safeTitle = String(title || '').trim().slice(0, 180) || 'Learning Playground Session';
    const safePrompt = String(latestPrompt || '').trim().slice(0, 400);

    if (sessionId) {
      // Update existing session
      const updateQuery = `
        UPDATE public.learning_playground_sessions
        SET title = COALESCE(NULLIF($1, ''), title),
            latest_prompt = COALESCE(NULLIF($2, ''), latest_prompt),
            messages = $3::jsonb,
            generated_tool = $4::jsonb,
            context = $5::jsonb,
            updated_at = NOW()
        WHERE id = $6 AND user_id = $7
        RETURNING id, user_id, title, latest_prompt, created_at, updated_at;
      `;
      const { rows } = await pool.query(updateQuery, [
        safeTitle,
        safePrompt,
        JSON.stringify(messages),
        JSON.stringify(generatedTool),
        JSON.stringify(context),
        sessionId,
        userId,
      ]);

      if (rows.length > 0) {
        return res.status(200).json({ success: true, data: rows[0] });
      }
      // If no rows were updated (e.g. wrong userId), fall through to insert
    }

    // Insert new session
    const query = `
      INSERT INTO public.learning_playground_sessions
        (user_id, title, latest_prompt, messages, generated_tool, context, created_at, updated_at)
      VALUES
        ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, NOW(), NOW())
      RETURNING id, user_id, title, latest_prompt, created_at, updated_at;
    `;

    const { rows } = await pool.query(query, [
      userId,
      safeTitle,
      safePrompt,
      JSON.stringify(messages),
      JSON.stringify(generatedTool),
      JSON.stringify(context),
    ]);

    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('SAVE LEARNING PLAYGROUND SESSION ERROR:', err);
    return res.status(500).json({ success: false, message: 'Failed to save session' });
  }
}

// Fetch Learning Playground sessions for current user
export async function getLearningPlaygroundSessions(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ success: false, message: 'Auth required' });

  try {
    const query = `
      SELECT id, user_id, title, latest_prompt, messages, generated_tool, context, created_at, updated_at
      FROM public.learning_playground_sessions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 100;
    `;
    console.log('Fetching sessions for user:', userId);
    const { rows } = await pool.query(query, [userId]);
    console.log('Sessions found:', rows.length);
    return res.json({ success: true, data: rows, count: rows.length });
  } catch (err) {
    console.error('GET LEARNING PLAYGROUND SESSIONS ERROR:', err);
    console.error('User ID:', req.user?.id);
    console.error('Error details:', err.message, err.code);
    return res.status(500).json({ success: false, message: 'Failed to fetch sessions', error: err.message });
  }
}

// Save/fork a tool to user's personal collection (from marketplace)
export async function saveMarketplaceToolToCollection(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ success: false, message: 'Auth required' });

  try {
    const {
      title = '',
      description = '',
      tool_type = 'notes',
      category = 'study-guide',
      tags = [],
      generated_tool = null,
      latest_prompt = '',
      forked_from_tool_id = null, // If provided, this is a fork
      visibility = 'private',
    } = req.body || {};

    if (!generated_tool) {
      return res.status(400).json({ success: false, message: 'generated_tool is required' });
    }

    const safeTitle = String(title || '').trim().slice(0, 255) || 'Saved Tool';
    const safeDesc = String(description || '').trim().slice(0, 500);
    const safePrompt = String(latest_prompt || '').trim().slice(0, 500);
    const safeTags = Array.isArray(tags) ? tags.slice(0, 20) : [];

    // If forking an existing tool, track the fork
    let updateForkCountQuery = '';
    if (forked_from_tool_id) {
      updateForkCountQuery = `
        UPDATE public.playground_marketplace_tools 
        SET fork_count = fork_count + 1, last_forked_at = NOW()
        WHERE id = $5;
      `;
    }

    const query = `
      INSERT INTO public.playground_marketplace_tools (
        owner_user_id, title, description, tool_type, category, tags,
        generated_tool, latest_prompt, visibility, is_published,
        forked_from_tool_id, forked_from_user_id,
        created_at, updated_at
      )
      VALUES (
        $1, $2, $3, $4::text, $5::text, $6::jsonb,
        $7::jsonb, $8::text, $9::text, false,
        $10::uuid, (SELECT owner_user_id FROM public.playground_marketplace_tools WHERE id = $10),
        NOW(), NOW()
      )
      RETURNING id, owner_user_id, title, tool_type, visibility, created_at;
    `;

    const { rows } = await pool.query(query, [
      userId,
      safeTitle,
      safeDesc,
      tool_type,
      category,
      JSON.stringify(safeTags),
      JSON.stringify(generated_tool),
      safePrompt,
      visibility,
      forked_from_tool_id,
    ]);

    // If this is a fork, update fork count on original tool
    if (forked_from_tool_id && updateForkCountQuery) {
      try {
        await pool.query(updateForkCountQuery, [forked_from_tool_id]);
      } catch (err) {
        console.warn('Failed to update fork count:', err);
      }
    }

    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('SAVE MARKETPLACE TOOL ERROR:', err);
    return res.status(500).json({ success: false, message: 'Failed to save tool' });
  }
}

// Get user's saved/forked tools
export async function getUserSavedTools(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ success: false, message: 'Auth required' });

  try {
    const { category = '', search = '' } = req.query;

    let query = `
      SELECT 
        id, owner_user_id, title, description, tool_type, category, tags,
        generated_tool, latest_prompt, visibility, is_published,
        forked_from_tool_id, fork_count,
        created_at, updated_at
      FROM public.playground_marketplace_tools
      WHERE owner_user_id = $1
    `;

    const params = [userId];
    let paramIndex = 2;

    if (category && String(category).trim()) {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (search && String(search).trim()) {
      const searchTerm = `%${String(search).trim()}%`;
      query += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex + 1})`;
      params.push(searchTerm, searchTerm);
    }

    query += ` ORDER BY created_at DESC LIMIT 100`;

    const { rows } = await pool.query(query, params);
    return res.json({ success: true, data: rows, count: rows.length });
  } catch (err) {
    console.error('GET USER SAVED TOOLS ERROR:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch saved tools' });
  }
}

// Get public/published marketplace tools (browse)
export async function getPublishedMarketplaceTools(req, res) {
  try {
    const { category = '', search = '', limit = 50, offset = 0 } = req.query;
    const userId = req.user?.id;

    let query = `
      SELECT 
        id, owner_user_id, title, description, tool_type, category, tags,
        latest_prompt, visibility, is_published,
        forked_from_tool_id, fork_count,
        created_at, updated_at
      FROM public.playground_marketplace_tools
      WHERE is_published = true AND visibility = 'public'
    `;

    const params = [];
    let paramIndex = 1;

    if (category && String(category).trim()) {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (search && String(search).trim()) {
      const searchTerm = `%${String(search).trim()}%`;
      query += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex + 1})`;
      params.push(searchTerm, searchTerm);
      paramIndex += 2;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit) || 50, parseInt(offset) || 0);

    const { rows } = await pool.query(query, params);

    return res.json({ success: true, data: rows, count: rows.length });
  } catch (err) {
    console.error('GET PUBLISHED MARKETPLACE TOOLS ERROR:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch marketplace tools' });
  }
}

// Study suggestions based on quiz history
export async function getSuggestionsForUser(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Auth required' });
  try {
    const data = await generateStudySuggestions(userId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function getTierStatus(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Auth required' });

  try {
    const status = await getTierStatusForUser(userId);
    return res.json({ success: true, data: status });
  } catch (err) {
    console.error('GET TIER STATUS ERROR:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch tier status' });
  }
}

export async function getDueSpacedRepetition(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Auth required' });

  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    const rows = await getDueSpacedRepetitionItems(userId, limit);
    return res.json({ success: true, data: rows, count: rows.length });
  } catch (err) {
    console.error('GET DUE SPACED REPETITION ERROR:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch spaced repetition items' });
  }
}

export async function markSpacedRepetitionReviewed(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Auth required' });

  try {
    const queueId = parseInt(req.params.id, 10);
    if (!Number.isInteger(queueId) || queueId <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid spaced repetition id' });
    }

    const row = await markSpacedRepetitionReviewedItem(userId, queueId);
    if (!row) {
      return res.status(404).json({ success: false, error: 'Spaced repetition item not found' });
    }

    return res.json({ success: true, data: row });
  } catch (err) {
    console.error('MARK SPACED REPETITION REVIEWED ERROR:', err);
    return res.status(500).json({ success: false, error: 'Failed to update spaced repetition item' });
  }
}

