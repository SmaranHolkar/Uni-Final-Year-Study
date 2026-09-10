import fetch from 'node-fetch';
import { pipeline } from '@huggingface/transformers';
import pool from '../../../shared/config/dbPool.js';

const GROQ_KEY = process.env.GROQ_API;
export const DEFAULT_AI_MODEL = process.env.GROQ_MODEL || 'qwen/qwen3.6-27b';
export const FALLBACK_AI_MODEL = 'qwen/qwen3.6-27b';

let embedder = null;

/**
 * Handles text embedding using Xenova/all-MiniLM-L6-v2.
 */
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

/**
 * Retry helper with capped backoff to prevent network timeouts.
 */
export async function retryWithBackoff(fn, maxRetries = 2, initialDelay = 1000) {
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
        await new Promise((resolve) => setTimeout(resolve, initialDelay));
      } else {
        throw error;
      }
    }
  }
}

/**
 * Chat completion orchestrator with key rotation, model fallbacks,
 * and token-budget enforcement.
 */
export async function getChatCompletion(
  prompt,
  model = DEFAULT_AI_MODEL,
  temperature = 0.7,
  maxTokens = 2000,
  options = {}
) {
  const keys = [
    process.env.GROQ_API,
    process.env.LearningPlayground_API_KEY,
    process.env.GROQ_API_KEY,
  ].filter(Boolean);

  if (keys.length === 0) {
    throw new Error('GROQ_API is not set in the server environment');
  }

  const targetModel = model || DEFAULT_AI_MODEL;
  const { forceJson = false } = options;

  const modelsToTry = [
    targetModel,
    process.env.GROQ_MODEL,
    'qwen/qwen3.6-27b',
  ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);
  let lastError = null;

  for (const currentModel of modelsToTry) {
    for (let kIdx = 0; kIdx < keys.length; kIdx++) {
      const activeKey = keys[kIdx];
      const modelMaxTokens = currentModel.includes('qwen')
        ? Math.min(maxTokens || 480, 480)
        : Math.min(maxTokens || 2500, 4096);

      try {
        return await retryWithBackoff(async () => {
          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${activeKey}`,
            },
            signal: AbortSignal.timeout(45000),
            body: JSON.stringify({
              model: currentModel,
              messages: [
                {
                  role: 'system',
                  content:
                    'You are Vela, an advanced academic study assistant with deep pedagogical intelligence. Deliver sharp, clear, accurate, and deeply helpful explanations and tools.',
                },
                { role: 'user', content: prompt },
              ],
              temperature,
              max_tokens: modelMaxTokens,
              ...(currentModel.includes('qwen') ? { reasoning_effort: 'none' } : {}),
              ...(forceJson ? { response_format: { type: 'json_object' } } : {}),
            }),
          });

          if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Groq API error (${res.status}): ${errText}`);
          }

          const data = await res.json();
          const rawContent = data.choices[0]?.message?.content || '';
          const cleaned = rawContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
          return cleaned || rawContent;
        }, 1, 1000);
      } catch (err) {
        lastError = err;
        console.warn(
          `[ML ENGINE] Groq model ${currentModel} key ${kIdx + 1}/${keys.length} error: ${err.message}.`
        );
      }
    }
  }

  throw lastError || new Error('All AI API keys and models failed');
}

/**
 * toolGenAI: routes all AI calls to Groq via getChatCompletion.
 */
export async function toolGenAI(
  prompt,
  model = DEFAULT_AI_MODEL,
  temperature = 0.7,
  maxTokens = 2200,
  options = {}
) {
  const groqModel = model || DEFAULT_AI_MODEL;
  return getChatCompletion(prompt, groqModel, temperature, maxTokens, options);
}

/**
 * Retrieve top K similar text chunks from DB using vector similarity search.
 */
export async function getTopChunks(embedding, k = 10, userId = null, documentId = null) {
  const vec = `[${embedding.join(',')}]`;
  const client = await pool.connect();
  try {
    let query, params;

    if (documentId && userId) {
      query = `SELECT id, chunk_text, title, COALESCE(paragraph_index, 1) as paragraph_index, COALESCE(page_number, 1) as page_number, file_url 
               FROM public.w_embeddings
               WHERE user_id = $3 AND (
                 id::text = $4 OR 
                 title = (SELECT title FROM public.w_embeddings WHERE id::text = $4 AND user_id = $3 LIMIT 1) OR
                 title = $4
               )
               ORDER BY embedding <-> $1::vector LIMIT $2`;
      params = [vec, k, userId, String(documentId)];
    } else if (documentId) {
      query = `SELECT id, chunk_text, title, COALESCE(paragraph_index, 1) as paragraph_index, COALESCE(page_number, 1) as page_number, file_url 
               FROM public.w_embeddings
               WHERE (
                 id::text = $3 OR 
                 title = (SELECT title FROM public.w_embeddings WHERE id::text = $3 LIMIT 1) OR
                 title = $3
               )
               ORDER BY embedding <-> $1::vector LIMIT $2`;
      params = [vec, k, String(documentId)];
    } else if (userId) {
      query = `SELECT id, chunk_text, title, COALESCE(paragraph_index, 1) as paragraph_index, COALESCE(page_number, 1) as page_number, file_url 
               FROM public.w_embeddings
               WHERE user_id = $3
               ORDER BY embedding <-> $1::vector LIMIT $2`;
      params = [vec, k, userId];
    } else {
      query = `SELECT id, chunk_text, title, COALESCE(paragraph_index, 1) as paragraph_index, COALESCE(page_number, 1) as page_number, file_url 
               FROM public.w_embeddings
               ORDER BY embedding <-> $1::vector LIMIT $2`;
      params = [vec, k];
    }

    const { rows } = await client.query(query, params);
    return rows;
  } finally {
    client.release();
  }
}

/**
 * Generate multiple choice questions based on provided context using GROQ API.
 */
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
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: DEFAULT_AI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2500,
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

/**
 * Generates a corrective study mindmap node.
 */
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

  return toolGenAI(prompt, undefined, 0.1, 140);
}

/**
 * Describes a rendered PDF page image using Groq Vision.
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
        model: 'llama-3.2-11b-vision-preview',
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
        temperature: 0.2,
        max_tokens: 1500,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Groq Vision API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.choices[0]?.message?.content || '';
  });
}

/**
 * Metacognitive analysis function for quiz attempts.
 */
export async function generateMetacognitiveAnalysis(quizData) {
  const questions = Array.isArray(quizData?.quiz)
    ? quizData.quiz
    : typeof quizData?.quiz === 'string'
      ? JSON.parse(quizData.quiz || '[]')
      : [];

  const totalQuestions = questions.length;
  const correctCount = questions.filter((q) => q?.isCorrect).length;
  const incorrectQuestions = questions.filter((q) => !q?.isCorrect);
  const scorePercentage =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

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
    calibrationScore =
      questionsWithConfidence.length > 0
        ? Math.round((calibrated / questionsWithConfidence.length) * 100)
        : 0;
  } else {
    errorTypeProfile.unclassified = incorrectQuestions.length;
  }

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

  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'of', 'in', 'on', 'at', 'to', 'for',
    'with', 'what', 'which', 'how', 'when', 'where', 'who', 'does', 'do', 'did', 'that',
    'this', 'these', 'those', 'from', 'and', 'or', 'but', 'not',
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

  const inferredKnowledgeGaps = [
    ...new Set(
      incorrectQuestions
        .map((q) => q?.topic || q?.tag || q?.category || q?.prompt)
        .filter(Boolean)
    ),
  ]
    .slice(0, 5)
    .join(', ');

  let aiAnalysis = null;
  if (GROQ_KEY && totalQuestions > 0) {
    try {
      const questionSummary = questions
        .slice(0, 30)
        .map((q, i) => {
          const status = q?.isCorrect ? 'Correct' : 'Incorrect';
          const conf = q?.confidence != null ? ` (confidence: ${q.confidence}/5)` : '';
          const wrongAnswerInfo =
            !q?.isCorrect && q?.userAnswer && q?.correctAnswer
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

      const raw = await getChatCompletion(aiPrompt, undefined, 0.3, 1500, { forceJson: true });
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') aiAnalysis = parsed;
    } catch (err) {
      console.warn('AI metacognitive analysis failed, using rule-based fallback:', err.message);
    }
  }

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
        prompt: `Generate flashcards focusing on ${inferredKnowledgeGaps || 'the concepts missed in the recent quiz'}.`,
      },
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
