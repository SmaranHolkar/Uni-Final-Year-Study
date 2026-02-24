import fetch from 'node-fetch';
import { pipeline } from '@huggingface/transformers';
import pool from './dbPool.js';

const GROQ_KEY = process.env.GROQ_API;

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


// Retry helper with backoff
async function retryWithBackoff(fn, maxRetries = 5, initialDelay = 2000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      // Check for rate limit in multiple places
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


// Embedding model gets embeddings.


// Retrieve top K similar text chunks from DB using vector similarity search
export async function getTopChunks(embedding, k = 8, userId = null, documentId = null) {
  const vec = `[${embedding.join(',')}]`;
  const client = await pool.connect();
  try {
    let query, params;
    
    if (documentId && userId) {
      // Filter by specific document and validate ownership
      query = `SELECT id, chunk_text, title FROM public.w_embeddings 
               WHERE title = (SELECT title FROM public.w_embeddings WHERE id = $3 AND user_id = $4)
               AND user_id = $4
               ORDER BY embedding <-> $1::vector LIMIT $2`;
      params = [vec, k, documentId, userId];
    } else if (documentId) {
      // Filter by specific document (legacy support)
      query = `SELECT id, chunk_text, title FROM public.w_embeddings 
               WHERE title = (SELECT title FROM public.w_embeddings WHERE id = $3)
               ORDER BY embedding <-> $1::vector LIMIT $2`;
      params = [vec, k, documentId];
    } else if (userId) {
      // Filter by user_id if provided
      query = `SELECT id, chunk_text, title FROM public.w_embeddings 
               WHERE user_id = $3
               ORDER BY embedding <-> $1::vector LIMIT $2`;
      params = [vec, k, userId];
    } else {
      // Get all chunks if no user filter
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

// Extract text from quiz and mindmap data for embedding generation
function generateEmbeddingText(quizResults, mindmapNodes) {
  let text = '';

  // Extract quiz prompts and answers
  if (Array.isArray(quizResults)) {
    text += quizResults
      .map(q => `${q.prompt || ''} ${q.userAnswer || ''} ${q.correctAnswer || ''}`)
      .join(' ');
  }

  // Extract mindmap node content
  if (Array.isArray(mindmapNodes)) {
    text += ' ' + mindmapNodes
      .map(node => `${node.text || ''} ${node.concept || ''}`)
      .join(' ');
  }

  return text.trim() || 'quiz mindmap';
}

export async function saveQuiz_Mindmap(req, res) {
  // save quiz results and mindmap nodes to DB in quizes_mindmaps table
  let client;
  try {
    const { title, quizResults, mindmapNodes } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'User authentication required' 
      });
    }
    
    client = await pool.connect();
    await client.query('BEGIN');

    // Generate embedding from quiz and mindmap content
    const embeddingText = generateEmbeddingText(quizResults, mindmapNodes);
    const embeddingVector = await getEmbedding(embeddingText);
    const embedding = `[${embeddingVector.join(',')}]`;

    // Insert quiz results and mindmap nodes
    const insertQuery = `
      INSERT INTO public.quizzes_mindmaps (user_id, title, quiz, mindmap, embedding, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5::vector, NOW(), NOW())
      RETURNING id;
    `;
    
    const result = await client.query(insertQuery, [
      userId,
      title,
      JSON.stringify(quizResults), // Convert to JSON string
      JSON.stringify(mindmapNodes), // Convert to JSON string
      embedding
    ]);

    await client.query('COMMIT');
    client.release();

    res.status(201).json({
      success: true,
      message: 'Quiz and mindmap saved successfully',
      id: result.rows[0].id
    });
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
      }
      client.release();
    }
    
    console.error('Error saving quiz and mindmap:', error);
    
    // Better error messaging
    let statusCode = 500;
    let errorMessage = 'Failed to save quiz and mindmap';
    
    if (error.code === '22P02') {
      errorMessage = 'Invalid data format for database';
      statusCode = 400;
    } else if (error.message?.includes('connection')) {
      errorMessage = 'Database connection error. Please try again.';
      statusCode = 503;
    }
    
    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: error.message
    });
  }
}

export async function getQuizzesMindmaps(req, res) {
  // Get quiz and mindmap records for a user
  let client;
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }

    client = await pool.connect();

    const query = `
      SELECT id, user_id, title, quiz, mindmap, embedding, created_at, updated_at
      FROM public.quizzes_mindmaps
      WHERE user_id = $1
      ORDER BY created_at DESC;
    `;

    const result = await client.query(query, [userId]);
    client.release();

    res.status(200).json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    if (client) client.release();
    
    console.error('Error fetching quizzes and mindmaps:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quizzes and mindmaps',
      error: error.message
    });
  }
}

// Generate multiple choice questions based on provided context using GROQ API
export async function generateMCQs(context, count) {
  if (!GROQ_KEY) {
    throw new Error('GROQ_API is not set in the server environment');
  }
  const maxContextChars = 6000;
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
          temperature: 0.2,
          max_tokens: 2000,
          // This tells Groq to return the JSON directly
          response_format: { type: "json_object" }, 
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
      // Direct parse because of json_object mode
      const parsed = JSON.parse(rawContent);
      return parsed.questions;
    } catch (parseError) {
      console.error("JSON Parsing failed. Attempting regex recovery...", parseError);
      // Fallback: Try to find the JSON block if the model added prefix text
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]).questions;
      }
      throw new Error("Could not parse AI response into valid JSON");
    }
  });
}


// Generic chat completion function for any prompt
export async function getChatCompletion(prompt, model = 'llama-3.1-8b-instant', temperature = 0.7, maxTokens = 1000) {
  if (!GROQ_KEY) {
    throw new Error('GROQ_API is not set in the server environment');
  }

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

  return retryWithBackoff(async () => {
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
  });
}

// Generate metacognitive analysis for quiz performance
export async function generateMetacognitiveAnalysis(quizData) {
  if (!GROQ_KEY) {
    throw new Error('GROQ_API is not set in the server environment');
  }

  // Parse quiz questions
  const questions = Array.isArray(quizData.quiz) ? quizData.quiz : 
                    (typeof quizData.quiz === 'string' ? JSON.parse(quizData.quiz) : []);
  
  const totalQuestions = questions.length;
  const correctCount = questions.filter(q => q.isCorrect).length;
  const incorrectQuestions = questions.filter(q => !q.isCorrect);
  const correctQuestions = questions.filter(q => q.isCorrect);
  const scorePercentage = Math.round((correctCount / totalQuestions) * 100);

  // 🚀 UPGRADE 1: LLM-Based Question Classification (batch classify once per quiz)
  const classifyQuestionsWithLLM = async (questionList) => {
    if (questionList.length === 0) return [];
    
    const classificationPrompt = `Classify these quiz questions by type. Return ONLY valid JSON.

Questions:
${questionList.map((q, i) => `${i + 1}. ${q.prompt}`).join('\n')}

For each question, classify as one of:
- "definition": Tests recall of concepts, definitions, or facts
- "application": Requires applying concepts to solve problems, convert, calculate
- "conceptual": Tests deeper understanding, comparison, analysis, reasoning
- "implementation": Involves code, algorithms, step-by-step procedures
- "synthesis": Combines multiple concepts or creates something new

Return JSON format:
{
  "classifications": [
    {"questionIndex": 0, "type": "definition", "reasoning": "brief explanation"},
    {"questionIndex": 1, "type": "application", "reasoning": "brief explanation"}
  ]
}`;

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: classificationPrompt }],
          temperature: 0.1,
          max_tokens: 800,
          response_format: { type: "json_object" },
        }),
      });

      if (!res.ok) throw new Error('Classification failed');
      
      const data = await res.json();
      const parsed = JSON.parse(data.choices[0].message.content);
      return parsed.classifications || [];
    } catch (err) {
      console.error('LLM classification failed, falling back to keyword:', err);
      return null; // Will trigger fallback
    }
  };

  // Classify questions using LLM
  const classifications = await classifyQuestionsWithLLM(questions);
  
  // Build type mapping
  const questionTypes = {};
  if (classifications) {
    classifications.forEach(c => {
      if (questions[c.questionIndex]) {
        questionTypes[c.questionIndex] = {
          type: c.type,
          reasoning: c.reasoning
        };
      }
    });
  }

  // Categorize performance by question type
  const performanceByType = {};
  questions.forEach((q, idx) => {
    const type = questionTypes[idx]?.type || 'general';
    if (!performanceByType[type]) {
      performanceByType[type] = { correct: 0, total: 0 };
    }
    performanceByType[type].total++;
    if (q.isCorrect) performanceByType[type].correct++;
  });

  // 🚀 UPGRADE 2: TRUE Confidence Mismatch Detection
  // Analyze per-question confidence vs correctness
  const analyzeConfidenceMismatch = () => {
    const overconfident = []; // High confidence but wrong
    const underconfident = []; // Low confidence but correct
    const calibrated = []; // Confidence matches performance
    
    questions.forEach((q, idx) => {
      const confidence = q.confidence || null; // 1-5 scale from user
      
      if (confidence !== null) {
        const isHighConfidence = confidence >= 4; // 4-5
        const isLowConfidence = confidence <= 2;  // 1-2
        
        if (isHighConfidence && !q.isCorrect) {
          overconfident.push({
            questionIndex: idx,
            prompt: q.prompt,
            confidence: confidence,
            type: questionTypes[idx]?.type || 'general'
          });
        } else if (isLowConfidence && q.isCorrect) {
          underconfident.push({
            questionIndex: idx,
            prompt: q.prompt,
            confidence: confidence,
            type: questionTypes[idx]?.type || 'general'
          });
        } else {
          calibrated.push({ questionIndex: idx });
        }
      }
    });
    
    return {
      overconfident,
      underconfident,
      calibrated,
      hasConfidenceData: questions.some(q => q.confidence !== null && q.confidence !== undefined),
      calibrationScore: calibrated.length / questions.length
    };
  };

  const confidenceAnalysis = analyzeConfidenceMismatch();
  
  // Fallback to score-based heuristic if no confidence data
  const confidenceMismatchLegacy = scorePercentage > 40 && scorePercentage < 70;

  // 🚀 UPGRADE 3: TRUE Error Clustering (Algorithmic Analysis)
  const performErrorClustering = () => {
    // Extract all words from incorrect answers
    const extractKeywords = (text) => {
      return String(text || '')
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3); // Only meaningful words
    };

    // Analyze incorrect answers
    const incorrectKeywords = {};
    const correctKeywords = {};
    
    incorrectQuestions.forEach(q => {
      const words = [...extractKeywords(q.userAnswer), ...extractKeywords(q.prompt)];
      words.forEach(word => {
        incorrectKeywords[word] = (incorrectKeywords[word] || 0) + 1;
      });
    });

    correctQuestions.forEach(q => {
      const words = [...extractKeywords(q.userAnswer), ...extractKeywords(q.prompt)];
      words.forEach(word => {
        correctKeywords[word] = (correctKeywords[word] || 0) + 1;
      });
    });

    // Find keywords that appear MORE in wrong answers than correct
    const errorSignatureWords = Object.entries(incorrectKeywords)
      .filter(([word, count]) => {
        const correctCount = correctKeywords[word] || 0;
        return count > correctCount && count >= 2; // Appears multiple times in errors
      })
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word, count]) => ({ word, frequency: count }));

    // Group errors by question type
    const errorsByType = {};
    incorrectQuestions.forEach((q, idx) => {
      const type = questionTypes[questions.indexOf(q)]?.type || 'general';
      if (!errorsByType[type]) {
        errorsByType[type] = [];
      }
      errorsByType[type].push(q);
    });

    // Find most problematic type
    const mostProblematicType = Object.entries(errorsByType)
      .sort((a, b) => b[1].length - a[1].length)[0];

    // Detect repeated error patterns
    const errorRepetitions = {};
    incorrectQuestions.forEach(q => {
      const normalizedAnswer = String(q.userAnswer || '').toLowerCase().trim();
      const normalizedCorrect = String(q.correctAnswer || '').toLowerCase().trim();
      const key = `${normalizedAnswer}→${normalizedCorrect}`;
      errorRepetitions[key] = (errorRepetitions[key] || 0) + 1;
    });

    const repeatedErrors = Object.entries(errorRepetitions)
      .filter(([_, count]) => count > 1)
      .sort((a, b) => b[1] - a[1]);

    return {
      errorSignatureWords,
      errorsByType,
      mostProblematicType: mostProblematicType ? {
        type: mostProblematicType[0],
        count: mostProblematicType[1].length,
        percentage: Math.round(mostProblematicType[1].length / incorrectQuestions.length * 100)
      } : null,
      repeatedErrors: repeatedErrors.length,
      totalErrorPatterns: Object.keys(errorRepetitions).length
    };
  };

  const errorClusters = performErrorClustering();

  // Map questions with their classifications for context
  const errorPatterns = incorrectQuestions.map((q, idx) => {
    const originalIndex = questions.indexOf(q);
    return {
      question: q.prompt,
      userAnswer: q.userAnswer,
      correctAnswer: q.correctAnswer,
      type: questionTypes[originalIndex]?.type || 'general',
      typeReasoning: questionTypes[originalIndex]?.reasoning || '',
      confidence: q.confidence || null
    };
  });

  // Build enriched context for AI analysis
  const quizSummary = `
Quiz Title: ${quizData.title}
Total Questions: ${totalQuestions}
Correct Answers: ${correctCount}
Incorrect Answers: ${incorrectQuestions.length}
Score: ${scorePercentage}%

DETAILED ERROR BREAKDOWN:
${errorPatterns.map((err, idx) => `
Error ${idx + 1} [${err.type.toUpperCase()} question]:
Q: ${err.question}
Your answer: ${err.userAnswer}
Correct: ${err.correctAnswer}
${err.confidence ? `Confidence: ${err.confidence}/5` : ''}
Classification reasoning: ${err.typeReasoning}
`).join('\n')}

PERFORMANCE BY QUESTION TYPE:
${Object.entries(performanceByType).map(([type, stats]) => 
  `${type.charAt(0).toUpperCase() + type.slice(1)}: ${stats.correct}/${stats.total} correct (${Math.round(stats.correct/stats.total*100)}%)`
).join('\n')}

ALGORITHMIC ERROR CLUSTERING RESULTS:
${errorClusters.mostProblematicType ? `Most Problematic Type: ${errorClusters.mostProblematicType.type} (${errorClusters.mostProblematicType.percentage}% of all errors)` : ''}
Error Signature Keywords (appear more in wrong answers): ${errorClusters.errorSignatureWords.map(w => `${w.word}(${w.frequency}×)`).join(', ')}
Repeated Error Patterns: ${errorClusters.repeatedErrors} instances
Total Unique Error Types: ${errorClusters.totalErrorPatterns}

${confidenceAnalysis.hasConfidenceData ? `
TRUE CONFIDENCE ANALYSIS:
- Overconfident answers (high confidence but wrong): ${confidenceAnalysis.overconfident.length}
${confidenceAnalysis.overconfident.slice(0, 2).map(oc => `  → Q: "${oc.prompt.slice(0, 60)}..." (Confidence: ${oc.confidence}/5, Type: ${oc.type})`).join('\n')}
- Underconfident answers (low confidence but correct): ${confidenceAnalysis.underconfident.length}
- Calibration Score: ${Math.round(confidenceAnalysis.calibrationScore * 100)}% (confidence matches performance)
` : 'No per-question confidence data available (legacy mode)'}

CORRECT QUESTIONS FOR COMPARISON:
${correctQuestions.slice(0, 3).map((q, idx) => {
  const originalIndex = questions.indexOf(q);
  return `${idx + 1}. [${(questionTypes[originalIndex]?.type || 'general').toUpperCase()}] ${q.prompt.slice(0, 80)}...`;
}).join('\n')}
`;

  const prompt = `
You are an ELITE cognitive learning analyst with access to ALGORITHMIC analysis results, not just raw data.

You have been given PRE-COMPUTED cognitive metrics:
- LLM-classified question types (not keyword guessing)
- ${confidenceAnalysis.hasConfidenceData ? 'TRUE confidence mismatch data per question' : 'Legacy score-based confidence estimation'}
- Algorithmic error clustering showing repeated patterns
- Error signature keywords that appear more in wrong answers

DO NOT write generic summaries. USE THE COMPUTED DATA. BE SURGICALLY SPECIFIC.

${quizSummary}

Generate an intelligent metacognitive analysis:

1. PATTERN SPECIFICITY - Use the algorithmic clustering data. Reference specific error signatures and types.

2. CONFIDENCE MISMATCH - ${confidenceAnalysis.hasConfidenceData ? 
  `Use the TRUE confidence data. Highlight the ${confidenceAnalysis.overconfident.length} overconfident answers explicitly.` : 
  `Score is ${scorePercentage}%. ${confidenceMismatchLegacy ? 'This suggests potential confusion.' : 'Confidence appears appropriate.'} Note: Enable per-question confidence ratings for deeper analysis.`}

3. BEHAVIORAL INSIGHT - Use the performance-by-type breakdown. Be specific about percentages and which types are weak.

4. ERROR CLUSTERING - Reference the ${errorClusters.repeatedErrors} repeated error patterns and ${errorClusters.errorSignatureWords.length} signature keywords.

Return ONLY valid JSON:
{
  "performanceSummary": "2-3 specific sentences with numbers/percentages from the data",
  "patternSpecificity": "Reference the algorithmic findings: error signatures, most problematic type (${errorClusters.mostProblematicType?.type || 'N/A'}), repeated patterns",
  "confidenceMismatch": ${confidenceAnalysis.hasConfidenceData ? 
    `"Specific analysis of the ${confidenceAnalysis.overconfident.length} overconfident cases, or null if none"` : 
    `"${confidenceMismatchLegacy ? 'Score-based warning about potential confusion' : 'null'}"`},
  "behavioralInsight": "Performance comparison across the ${Object.keys(performanceByType).length} question types with exact percentages",
  "knowledgeGaps": "Specific concepts tied to error signature keywords: ${errorClusters.errorSignatureWords.map(w => w.word).join(', ')}",
  "reflectionPrompts": [
    "Question targeting their algorithmic error pattern",
    "Question about confidence calibration${confidenceAnalysis.hasConfidenceData ? ' (specific to their overconfident cases)' : ''}",
    "Question about their weakest question type: ${errorClusters.mostProblematicType?.type || 'identified weak area'}"
  ],
  "studyStrategies": "3-4 targeted recommendations based on error clustering and type-specific weaknesses",
  "confidenceLevel": "${scorePercentage >= 80 ? 'High' : scorePercentage >= 60 ? 'Medium' : 'Low'}",
  "encouragement": "1 motivational sentence addressing their specific algorithmic patterns"
}

CRITICAL: Use the computed metrics. Reference specific numbers. Make it feel algorithmic, not interpretive.
`;

  return retryWithBackoff(async () => {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1500,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Groq API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const rawContent = data.choices[0].message.content;

    try {
      const parsed = JSON.parse(rawContent);
      return {
        ...parsed,
        scorePercentage,
        totalQuestions,
        correctCount,
        incorrectCount: incorrectQuestions.length,
        // Include algorithmic analysis metadata
        algorithmicMetrics: {
          confidenceAnalysis: {
            hasConfidenceData: confidenceAnalysis.hasConfidenceData,
            overconfidentCount: confidenceAnalysis.overconfident.length,
            underconfidentCount: confidenceAnalysis.underconfident.length,
            calibrationScore: Math.round(confidenceAnalysis.calibrationScore * 100)
          },
          errorClustering: {
            errorSignatureWords: errorClusters.errorSignatureWords,
            mostProblematicType: errorClusters.mostProblematicType,
            repeatedErrorPatterns: errorClusters.repeatedErrors
          },
          questionClassification: {
            method: classifications ? 'LLM-based' : 'keyword-fallback',
            typeBreakdown: Object.entries(performanceByType).map(([type, stats]) => ({
              type,
              correct: stats.correct,
              total: stats.total,
              percentage: Math.round(stats.correct / stats.total * 100)
            }))
          }
        }
      };
    } catch (parseError) {
      console.error("JSON Parsing failed for metacognitive analysis:", parseError);
      throw new Error("Could not parse AI response into valid JSON");
    }
  });
}