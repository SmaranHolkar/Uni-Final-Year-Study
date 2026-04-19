import { getEmbedding, getTopChunks, getChatCompletion } from '../utils/aiUtils.js';

// Generate a related topic node from the document for mind map expansion
export async function generateSimilarTopic(req, res) {
  try {
    const { topic, description } = req.body;
    const userId = req.user?.id;

    if (!topic || !String(topic).trim()) {
      return res.status(400).json({ error: 'topic is required' });
    }

    // Find relevant document context using the topic as the query
    const embedding = await getEmbedding(topic);
    const chunks = await getTopChunks(embedding, 3, userId);

    const context = chunks.length
      ? chunks.map(c => c.chunk_text).join('\n')
      : `Topic: ${topic}`;

    const prompt = `You are a study assistant. Given this topic from a student's mind map and relevant document context, generate ONE closely related topic that expands on it and comes from the same document material.

Current topic: ${topic}
${description ? `Current description: ${description}` : ''}

Document context:
${context}

Return ONLY valid JSON with this exact structure (no markdown, no extra text):
{
  "label": "Short topic name (max 8 words)",
  "description": "2-3 sentence explanation of this related topic based on the document content",
  "category": "Related Topic"
}`;

    const raw = await getChatCompletion(prompt, 'llama-3.1-8b-instant', 0.4, 400, { forceJson: true });
    const parsed = JSON.parse(raw);

    return res.json({
      label: parsed.label,
      description: parsed.description,
      category: parsed.category || 'Related Topic',
    });
  } catch (err) {
    console.error('GENERATE SIMILAR TOPIC ERROR:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate similar topic' });
  }
}

// Generate a single MCQ for a mind map node so the user can self-test
export async function generateMCQForTopic(req, res) {
  try {
    const { topic, description } = req.body;
    const userId = req.user?.id;

    if (!topic || !String(topic).trim()) {
      return res.status(400).json({ error: 'topic is required' });
    }

    // Find relevant document context
    const embedding = await getEmbedding(topic);
    const chunks = await getTopChunks(embedding, 3, userId);

    const context = chunks.length
      ? chunks.map(c => c.chunk_text).join('\n')
      : `Topic: ${topic}`;

    const prompt = `You are a study assistant. Generate exactly ONE multiple-choice question to test a student's understanding of this topic, based on the document context provided.

    Topic: ${topic}
    ${description ? `Context about the topic: ${description}` : ''}

    Document context:
    ${context}

    Return ONLY valid JSON with this exact structure (no markdown, no extra text):
    {
      "question": "The full question text",
      "choices": ["Option A text", "Option B text", "Option C text", "Option D text"],
      "answer": "A"
    }

    Rules:
    - choices must be 4 plain strings with NO letter prefixes
    - answer must be exactly one of: "A", "B", "C", "D"
    - The question must be directly answerable from the document context`;

    const raw = await getChatCompletion(prompt, 'llama-3.1-8b-instant', 0.7, 500, { forceJson: true });
    const parsed = JSON.parse(raw);

    return res.json({
      question: parsed.question,
      choices: parsed.choices,
      answer: parsed.answer,
    });
  } catch (err) {
    console.error('GENERATE MCQ FOR TOPIC ERROR:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate MCQ' });
  }
}
