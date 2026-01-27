import { getEmbedding, getTopChunks, generateMCQs, aiMindmapNode } from '../utils/aiUtils.js';

// Generate Questions
export async function generateQuestions(req, res) {
  try {
    const { queryText, count = 8 } = req.body;
    console.log('Query:', queryText);

    const embedding = await getEmbedding(queryText);
    const chunks = await getTopChunks(embedding, 5);

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

// Generate Mindmap
export async function generateMindmap(req, res) {
  try {
    const { wrongQuestions } = req.body;

    if (!Array.isArray(wrongQuestions)) {
      return res.status(400).json({ error: 'wrongQuestions must be an array' });
    }

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
          const chunks = await getTopChunks(emb, 3);
          if (Array.isArray(chunks) && chunks.length) {
            description = await aiMindmapNode({
              question: q.prompt,
              correctAnswer: q.answer,
              context: chunks[0].chunk_text,
              sourceLink: q.sourceLink || ''
            });
            await new Promise(resolve => setTimeout(resolve, 3000));
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