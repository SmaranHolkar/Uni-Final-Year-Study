import { getEmbedding, getTopChunks, generateMCQs, aiMindmapNode, saveQuiz_Mindmap, getQuizzesMindmaps, generateMetacognitiveAnalysis } from '../utils/aiUtils.js';

// Generate Questions
export async function generateQuestions(req, res) {
  try {
    const { queryText, count = 8, documentId = null } = req.body;
    const userId = req.user?.id;
    console.log('Query:', queryText, 'DocumentId:', documentId, 'UserId:', userId);

    const embedding = await getEmbedding(queryText);
    const chunks = await getTopChunks(embedding, 5, userId, documentId);

    if (!chunks.length) {
      return res.status(404).json({ error: 'No matching content' });
    }

    const context = chunks.map(c => c.chunk_text).join('\n');
    const questions = await generateMCQs(context, count);

    res.json({ questions });
  } catch (err) {
    console.error('BACKEND ERROR:', err);
    res.status(500).json({ error: err.message });
  }
}

/* Generate Mindmap */
export async function generateMindmap(req, res) {
  try {
    const { wrongQuestions } = req.body;
    const userId = req.user?.id;

    if (!Array.isArray(wrongQuestions)) {
      return res.status(400).json({ error: 'wrongQuestions must be an array' });
    }

    // Helper function to get the correct answer text
    const getCorrectAnswerText = (q) => {
      if (!q) return 'Unknown';
      
      // If answer is a number (index), get the choice at that index
      if (typeof q.answer === 'number' && Array.isArray(q.choices)) {
        return q.choices[q.answer] || q.answer;
      }
      
      // If answer is a string number (like "2"), convert and get choice
      if (typeof q.answer === 'string' && /^\d+$/.test(q.answer) && Array.isArray(q.choices)) {
        const idx = Number(q.answer);
        return q.choices[idx] || q.answer;
      }
      
      // If answer is a single letter (A, B, C, D), convert to index
      if (typeof q.answer === 'string' && q.answer.trim().length === 1 && Array.isArray(q.choices)) {
        const letter = q.answer.trim().toUpperCase();
        const idx = letter.charCodeAt(0) - 65; // 'A' -> 0, 'B' -> 1, etc.
        if (idx >= 0 && idx < q.choices.length) {
          return q.choices[idx];
        }
      }
      
      // Otherwise, return the answer as-is
      return q.answer || 'Unknown';
    };

    // Build mindmap: root node + one node per wrong question
    const nodes = [ { id: 'root', label: 'Review Topics', description: 'Topics to review based on your incorrect answers', sourceLink:'Source link' } ];
    const edges = [];

    for (let i = 0; i < wrongQuestions.length; i++) {
      const q = wrongQuestions[i];
      const id = `n${i}`;
      const label = (q.prompt && String(q.prompt).slice(0, 120)) || `Topic ${i+1}`;
      let description = '';
      try {
        const text = (q.prompt && String(q.prompt)) || '';
        if (text.trim()) {
          const emb = await getEmbedding(text);
          const chunks = await getTopChunks(emb, 3, userId);
          if (Array.isArray(chunks) && chunks.length) {
            const correctAnswerText = getCorrectAnswerText(q);
            description = await aiMindmapNode({
              question: q.prompt,
              correctAnswer: correctAnswerText,
              context: chunks[0].chunk_text,
              sourceLink: q.sourceLink || ''
            });
            // Increased delay to avoid rate limiting (5 seconds per request)
            await new Promise(resolve => setTimeout(resolve, 5000));
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
    return res.json({ mindmap: { nodes, edges } });
  } catch (err) {
    console.error(' MINDMAP ERROR:', err);
    res.status(500).json({ error: err.message });
  }
}

// Save Quiz and Mindmap
export async function saveQuizMindmap(req, res) {
  return saveQuiz_Mindmap(req, res);
}

// Get Quiz and Mindmap History
export async function getQuizzesMindmapsController(req, res) {
  return getQuizzesMindmaps(req, res);
}

// Generate Metacognitive Analysis for a quiz
export async function getMetacognitiveAnalysis(req, res) {
  try {
    const { quizId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Fetch the quiz from database
    const pool = (await import('../utils/dbPool.js')).default;
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT id, user_id, title, quiz, mindmap, created_at
        FROM public.quizzes_mindmaps
        WHERE id = $1 AND user_id = $2
      `;
      
      const result = await client.query(query, [quizId, userId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Quiz not found' });
      }

      const quizData = result.rows[0];
      
      // Generate metacognitive analysis
      const analysis = await generateMetacognitiveAnalysis(quizData);
      
      res.json({ 
        success: true, 
        analysis 
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('METACOGNITIVE ANALYSIS ERROR:', err);
    res.status(500).json({ error: err.message });
  }
}