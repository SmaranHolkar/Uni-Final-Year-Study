import { getEmbedding, getTopChunks, generateMCQs, aiMindmapNode, generateMetacognitiveAnalysis, generateLearningTool as generateLearningToolUtil } from '../utils/aiUtils.js';
import { saveQuizMindmap as saveQuizMindmapService, getUserQuizzesMindmaps, getQuizById, shareQuizMindmap, getSharedWithMe } from '../services/quizService.js';
import { generateStudySuggestions } from '../services/suggestionService.js';
import { getCorrectAnswerText } from '../utils/quizUtils.js';

// Generate Questions
export async function generateQuestions(req, res) {
  try {
    // log the incoming request body and user info
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
    res.status(500).json({ error: err.message });
  }
}

/* Generate Mindmap */
// Handles generateMindmap logic.
export async function generateMindmap(req, res) {
  try {
    const { wrongQuestions } = req.body;
    const userId = req.user?.id;

    if (!Array.isArray(wrongQuestions)) {
      return res.status(400).json({ error: 'wrongQuestions must be an array' });
    }

    // Build mindmap: root node + one node per wrong question
    const nodes = [{ id: 'root', label: 'Review Topics', description: 'Topics to review based on your incorrect answers',
       sourceLink: 'Source link' }];
    const edges = [];

    for (let i = 0; i < wrongQuestions.length; i++) {
      const q = wrongQuestions[i];
      const id = `n${i}`;
      const label = (q.prompt && String(q.prompt).slice(0, 120)) || `Topic ${i + 1}`;
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
  try {
    const { userId, title, quizResults, mindmapNodes } = req.body;
    const result = await saveQuizMindmapService({ userId, title, quizResults, mindmapNodes });
    res.status(201).json({ success: true, message: 'Quiz and mindmap saved successfully', id: result.id });
  } catch (error) {
    console.error('Error saving quiz and mindmap:', error);
    let statusCode = 500;
    let errorMessage = 'Failed to save quiz and mindmap';
    if (error.code === '22P02') { errorMessage = 'Invalid data format for database'; statusCode = 400; }
    else if (error.message?.includes('connection')) { errorMessage = 'Database connection error. Please try again.'; statusCode = 503; }
    res.status(statusCode).json({ success: false, message: errorMessage, error: error.message });
  }
}

// Get Quiz and Mindmap History
export async function getQuizzesMindmapsController(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(400).json({ success: false, message: 'userId is required' });
    const rows = await getUserQuizzesMindmaps(userId);
    res.status(200).json({ success: true, data: rows, count: rows.length });
  } catch (error) {
    console.error('Error fetching quizzes and mindmaps:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch quizzes and mindmaps', error: error.message });
  }
}

// Generate Metacognitive Analysis for a quiz
export async function getMetacognitiveAnalysis(req, res) {
  try {
    const { quizId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const quizData = await getQuizById(quizId, userId);

    if (!quizData) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const analysis = await generateMetacognitiveAnalysis(quizData);

    res.json({ success: true, analysis });
  } catch (err) {
    console.error('METACOGNITIVE ANALYSIS ERROR:', err);
    res.status(500).json({ error: err.message });
  }
}

// Generate an interactive learning tool plan from a free-form user prompt
export async function generateLearningTool(req, res) {
  try {
    const { prompt } = req.body;
    const userId = req.user?.id;

    if (!prompt || !String(prompt).trim()) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    const tool = await generateLearningToolUtil(userId, prompt);

    return res.json({
      success: true,
      tool,
    });
  } catch (err) {
    console.error('TOOL GENERATOR CONTROLLER ERROR:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to generate tool',
    });
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



// Share a mindmap with another registered user
export async function shareMindmapController(req, res) {
  try {
    const senderId = req.user?.id;
    const { quizMindmapId, recipientEmail } = req.body;
    if (!quizMindmapId || !recipientEmail) {
      return res.status(400).json({ success: false, message: 'quizMindmapId and recipientEmail are required' });
    }
    await shareQuizMindmap({ senderId, recipientEmail, quizMindmapId });
    return res.json({ success: true, message: `Mindmap shared with ${recipientEmail}` });
  } catch (error) {
    if (error.code === 'USER_NOT_FOUND') return res.status(404).json({ success: false, message: 'No user found with that email' });
    if (error.code === 'NOT_OWNER') return res.status(403).json({ success: false, message: 'You do not own this quiz' });
    if (error.code === 'SELF_SHARE') return res.status(400).json({ success: false, message: 'You cannot share with yourself' });
    console.error('Error sharing mindmap:', error);
    return res.status(500).json({ success: false, message: 'Failed to share mindmap' });
  }
}

// Get all mindmaps shared with the current user
export async function getSharedWithMeController(req, res) {
  try {
    const rows = await getSharedWithMe(req.user?.id);
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching shared mindmaps:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch shared mindmaps' });
  }
}
