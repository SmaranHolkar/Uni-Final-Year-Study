import { getEmbedding, getTopChunks, getChatCompletion } from '../ai/ml.engine.js';

/**
 * Sanitizes user input to prevent prompt boundary escaping and DoS length abuse
 */
function sanitizeInput(str, maxLength = 300) {
  if (typeof str !== 'string') return '';
  return str
    .slice(0, maxLength)
    .replace(/<\/[^>]+>/g, '') // Strip closing XML tags
    .trim();
}

/**
 * Resilient JSON extractor for LLM output
 */
function extractAndParseJson(rawOutput, fallback = {}) {
  if (!rawOutput || typeof rawOutput !== 'string') return fallback;
  try {
    const sanitized = rawOutput.replace(/```json\s*|\s*```/g, '').trim();
    const jsonMatch = sanitized.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(sanitized);
  } catch (err) {
    console.warn('[TopicController] LLM output parsing fallback engaged:', err.message);
    return fallback;
  }
}

/**
 * Generate a related topic node for mind map expansion
 * POST /api/generate-similar-topic
 */
export async function generateSimilarTopic(req, res) {
  try {
    const rawTopic = req.body?.topic;
    const rawDescription = req.body?.description;
    const userId = req.user?.id;

    if (!rawTopic || typeof rawTopic !== 'string' || !rawTopic.trim()) {
      return res.status(400).json({ error: 'Valid topic string is required' });
    }

    const topic = sanitizeInput(rawTopic, 120);
    const description = sanitizeInput(rawDescription, 300);

    // Retrieve grounding context via vector similarity
    const embedding = await getEmbedding(topic);
    const chunks = Array.isArray(embedding)
      ? await getTopChunks(embedding, 3, userId)
      : [];

    const context = chunks.length
      ? chunks.map(c => c.chunk_text).join('\n')
      : `Topic: ${topic}`;

    const prompt = `You are an expert academic curriculum assistant.
Analyze the student topic and the reference context, then generate ONE closely related topic that directly expands on it.

<student_topic>
${topic}
</student_topic>
${description ? `<topic_context>\n${description}\n</topic_context>` : ''}
<reference_material>
${context}
</reference_material>

Return ONLY valid JSON matching this exact schema (no markdown, no preamble):
{
  "label": "Short topic name (max 8 words)",
  "description": "2-3 sentence explanation of this related topic based on the material",
  "category": "Related Topic"
}`;

    const raw = await getChatCompletion(prompt, undefined, 0.4, 400, { forceJson: false });

    const parsed = extractAndParseJson(raw, {
      label: `${topic} Concepts`,
      description: `Key mechanisms, principles, and applications related to ${topic}.`,
      category: 'Related Topic'
    });

    return res.json({
      label: String(parsed.label || `${topic} Concepts`).slice(0, 100),
      description: String(parsed.description || 'Core concept analysis and details.').slice(0, 500),
      category: String(parsed.category || 'Related Topic').slice(0, 50),
    });
  } catch (err) {
    console.error('[TopicController] generateSimilarTopic failed:', err.message);
    return res.status(500).json({ error: 'Failed to generate similar topic' });
  }
}

/**
 * Generate a single verified MCQ for active recall
 * POST /api/generate-mcq-topic
 */
export async function generateMCQForTopic(req, res) {
  try {
    const rawTopic = req.body?.topic;
    const rawDescription = req.body?.description;
    const userId = req.user?.id;

    if (!rawTopic || typeof rawTopic !== 'string' || !rawTopic.trim()) {
      return res.status(400).json({ error: 'Valid topic string is required' });
    }

    const topic = sanitizeInput(rawTopic, 120);
    const description = sanitizeInput(rawDescription, 300);

    const embedding = await getEmbedding(topic);
    const chunks = Array.isArray(embedding)
      ? await getTopChunks(embedding, 3, userId)
      : [];

    const context = chunks.length
      ? chunks.map(c => c.chunk_text).join('\n')
      : `Topic: ${topic}`;

    const prompt = `You are an expert exam question generator.
Generate exactly ONE high-yield multiple-choice question testing understanding of the topic.

<student_topic>
${topic}
</student_topic>
${description ? `<topic_context>\n${description}\n</topic_context>` : ''}
<reference_material>
${context}
</reference_material>

Return ONLY valid JSON matching this exact schema:
{
  "question": "Full question prompt",
  "choices": ["Choice A text", "Choice B text", "Choice C text", "Choice D text"],
  "answer": "A"
}

Rules:
- choices must be an array of exactly 4 strings without 'A.', 'B.', etc. prefixes
- answer must be exactly one letter: 'A', 'B', 'C', or 'D'`;

    const raw = await getChatCompletion(prompt, undefined, 0.6, 500, { forceJson: false });

    const parsed = extractAndParseJson(raw, {
      question: `What is the primary role of ${topic}?`,
      choices: [
        'Primary functional mechanism and regulation',
        'Secondary non-essential pathway',
        'Passive structural degradation',
        'None of the above'
      ],
      answer: 'A'
    });

    // Validate choices array integrity
    const rawChoices = Array.isArray(parsed.choices) && parsed.choices.length === 4
      ? parsed.choices.map(c => String(c).trim())
      : [
        'Primary functional mechanism and regulation',
        'Secondary non-essential pathway',
        'Passive structural degradation',
        'None of the above'
      ];

    const validAnswers = new Set(['A', 'B', 'C', 'D']);
    const answer = validAnswers.has(parsed.answer?.toUpperCase())
      ? parsed.answer.toUpperCase()
      : 'A';

    return res.json({
      question: String(parsed.question || `What is the primary significance of ${topic}?`).trim(),
      choices: rawChoices,
      answer,
    });
  } catch (err) {
    console.error('[TopicController] generateMCQForTopic failed:', err.message);
    return res.status(500).json({ error: 'Failed to generate MCQ' });
  }
}
