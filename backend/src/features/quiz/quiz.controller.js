import { saveQuizMindmap as saveQuizMindmapService, getUserQuizzesMindmaps, getQuizById, shareQuizMindmap, getSharedWithMe } from './quiz.service.js';
import { generateMetacognitiveAnalysis } from '../ai/ml.engine.js';

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
