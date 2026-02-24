import sql from '../db.js';
import { getChatCompletion } from './aiUtils.js';

/**
 * Fetch the last 10 quiz attempts from Supabase
 */
export async function getUserQuizHistory(userId) {
  try {
    return await sql`
      SELECT id, user_id, title, quiz, mindmap, created_at 
      FROM quizzes_mindmaps 
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 10
    `;
  } catch (err) {
    console.error('Database fetch failed:', err);
    throw err;
  }
}

/**
 * Cracks open the quiz JSON and figures out where the student is struggling
 */
export async function analyzeQuizPerformance(quizHistory) {
  if (!quizHistory?.length) return null;

  // Calculate average score from correctness
  let totalCorrect = 0;
  let totalQuestions = 0;
  const topicStats = {};

  quizHistory.forEach(record => {
    // Parse quiz data (either JSON string or object)
    let quizData = record.quiz;
    if (typeof quizData === 'string') {
      try {
        quizData = JSON.parse(quizData);
      } catch {
        return; // Skip malformed quiz entries
      }
    }

    // Handle both array format and object format
    const questions = Array.isArray(quizData) ? quizData : [];
    
    questions.forEach(q => {
      totalQuestions++;
      if (q.isCorrect) totalCorrect++;

      // Group by topic if available
      if (q.topic) {
        if (!topicStats[q.topic]) topicStats[q.topic] = { total: 0, correct: 0 };
        topicStats[q.topic].total++;
        if (q.isCorrect) topicStats[q.topic].correct++;
      }
    });
  });

  const averageScore = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const recentPerformance = quizHistory.map(q => {
    let quizData = q.quiz;
    if (typeof quizData === 'string') {
      try {
        quizData = JSON.parse(quizData);
      } catch {
        return 0;
      }
    }
    const questions = Array.isArray(quizData) ? quizData : [];
    const correct = questions.filter(q => q.isCorrect).length;
    return questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
  });

  const lowestScoringAreas = Object.keys(topicStats)
    .filter(topic => (topicStats[topic].correct / topicStats[topic].total) < 0.5)
    .sort((a, b) => {
      const scoreA = topicStats[a].correct / topicStats[a].total;
      const scoreB = topicStats[b].correct / topicStats[b].total;
      return scoreA - scoreB; // Sort ascending (worst first)
    });

  // If no topics identified, extract quiz titles as topics
  const quizTitles = [];
  if (lowestScoringAreas.length === 0) {
    quizHistory.forEach(record => {
      if (record.title) {
        quizTitles.push(record.title);
      }
    });
  }

  return {
    totalQuizzes: quizHistory.length,
    averageScore,
    lowestScoringAreas: lowestScoringAreas.length > 0 ? lowestScoringAreas : quizTitles.slice(0, 3),
    recentPerformance,
    improvementTrend: recentPerformance[0] >= (recentPerformance[recentPerformance.length - 1] || 0) 
      ? 'Improving' 
      : 'Declining',
    topicStats // Include full stats for reference
  };
}

/**
  Sends stats to AI and returns a study game plan
 */
export async function generateStudySuggestions(userId) {
  try {
    console.log(`[SUGGESTIONS] Starting for userId: ${userId}`);
    
    const quizHistory = await getUserQuizHistory(userId);
    console.log(`[SUGGESTIONS] Retrieved ${quizHistory?.length || 0} quizzes`);
    
    if (!quizHistory?.length) {
      console.log('[SUGGESTIONS] No quiz history found');
      return { message: 'Take some quizzes first!' };
    }

    const stats = await analyzeQuizPerformance(quizHistory);
    console.log('[SUGGESTIONS] Performance analysis:', stats);

    if (!stats) {
      console.log('[SUGGESTIONS] Performance analysis returned null');
      return { message: 'Not enough quiz data to analyze yet' };
    }

    const analysisPrompt = `
      You are a helpful study coach. A student has taken ${stats.totalQuizzes} quizzes with an average score of ${stats.averageScore}%, and is currently ${stats.improvementTrend}.

      They need focused study help on these specific topics:
      1. ${stats.lowestScoringAreas[0] || 'Core concepts'}
      2. ${stats.lowestScoringAreas[1] || 'Practice problems'}
      3. ${stats.lowestScoringAreas[2] || 'Review material'}

      Create 3 specific, actionable study plan steps - one for each topic above. Each step should be practical and take 30-60 minutes.

      Return ONLY a JSON object (no markdown, no extra text):
      {
        "studyPlan": ["Specific action for topic 1", "Specific action for topic 2", "Specific action for topic 3"],
        "encouragement": "Motivating message based on ${stats.averageScore}% score",
        "estimatedProgress": "Realistic improvement timeline"
      }
    `;

    console.log('[SUGGESTIONS] Calling AI...');
    const aiRaw = await getChatCompletion(analysisPrompt);
    console.log('[SUGGESTIONS] AI response:', aiRaw);
    
    // Clean potential Markdown formatting if the AI gets fancy
    const cleanJson = aiRaw.replace(/```json|```/g, '').trim();
    console.log('[SUGGESTIONS] Cleaned JSON:', cleanJson);
    
    const aiSuggestions = JSON.parse(cleanJson);
    console.log('[SUGGESTIONS] Parsed AI suggestions:', aiSuggestions);

    // Combine stats-based topics with AI-generated study plans
    const suggestions = {
      urgentAreas: [
        stats.lowestScoringAreas[0] || 'Review fundamentals',
        stats.lowestScoringAreas[1] || 'Practice more questions',
        stats.lowestScoringAreas[2] || 'Strengthen weak areas'
      ],
      studyPlan: aiSuggestions.studyPlan || [
        'Review course materials daily for 30 minutes',
        'Practice 10-15 questions per session',
        'Take regular practice quizzes to track progress'
      ],
      encouragement: aiSuggestions.encouragement || 'Keep going! Consistent practice leads to improvement.',
      estimatedProgress: aiSuggestions.estimatedProgress || '2-4 weeks with regular study'
    };

    const result = {
      userId,
      analysisData: stats,
      suggestions,
      generatedAt: new Date()
    };

    // TODO: Optionally save to database with await saveSuggestions(userId, result);
    // Currently keeping in memory only - not saving to database

    console.log('[SUGGESTIONS] Success - returning result');
    return result;
  } catch (err) {
    console.error('Suggestion generation failed:', err.message || err);
    console.error('Full error:', err);
    return { error: 'Could not generate tips right now.' };
  }
}

/**
 * Saves the AI's advice to your Supabase table
 */
export async function saveSuggestions(userId, data) {
  try {
    await sql`
      INSERT INTO suggestions_history (user_id, suggestions, created_at)
      VALUES (${userId}, ${JSON.stringify(data.suggestions)}, NOW())
    `;
  } catch (err) {
    console.error('Failed to save to suggestions_history:', err);
  }
}

/**
 * API Controller
 */
export async function getSuggestionsForUser(req, res) {
  const userId = req.user?.id; // Assumes your requireAuth middleware is working
  if (!userId) return res.status(401).json({ error: 'Auth required' });

  try {
    const data = await generateStudySuggestions(userId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}