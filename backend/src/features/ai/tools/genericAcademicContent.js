/**
 * genericAcademicContent.js
 *
 * Clean pedagogical scaffold generator for offline / fallback tool creation.
 * Never hardcodes factual claims. Uses structural heuristics to produce
 * high-value self-assessment and diagnostic revision scaffolds.
 */

// ---------------------------------------------------------------------------
// 1. Domain classification — structural, not factual
// ---------------------------------------------------------------------------

const DOMAIN_KEYWORDS = {
  scienceProcess: [
    'biology', 'chemistry', 'physics', 'photosynthesis', 'respiration', 'cell',
    'reaction', 'enzyme', 'ecosystem', 'circuit', 'genetics', 'evolution',
    'mitosis', 'meiosis', 'osmosis', 'diffusion', 'metabolism', 'anatomy',
    'physiology', 'thermodynamics', 'mechanics', 'wave', 'force', 'energy',
    'timber', 'wood', 'joint', 'materials', 'engineering', 'bonding'
  ],
  timelineHumanities: [
    'history', 'war', 'revolution', 'empire', 'century', 'era', 'dynasty',
    'movement', 'treaty', 'reform', 'colonisation', 'colonization',
    'independence', 'civilisation', 'civilization', 'politics', 'government',
    'philosophy', 'sociology', 'economics', 'geography', 'river', 'climate'
  ],
  quantFormula: [
    'algebra', 'calculus', 'equation', 'formula', 'statistics', 'probability',
    'geometry', 'trigonometry', 'derivative', 'integral', 'matrix', 'vector',
    'theorem', 'proof', 'function', 'programming', 'algorithm', 'code', 'math'
  ],
  language: [
    'grammar', 'vocabulary', 'verb', 'tense', 'language', 'spanish', 'french',
    'german', 'mandarin', 'japanese', 'literature', 'poem', 'novel',
    'linguistics', 'syntax', 'pronunciation', 'idiom'
  ]
};

function classifyDomain(topicLower) {
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    if (keywords.some((k) => topicLower.includes(k))) return domain;
  }
  return 'generic';
}

// ---------------------------------------------------------------------------
// 2. Shape-appropriate templates
// ---------------------------------------------------------------------------

const SHAPES = {
  scienceProcess: [
    ['Core Definition & Principle', 'What is {topic}? State the formal definition, key components, and scale.'],
    ['Step-by-Step Mechanism', 'List the ordered stages of the {topic} process. What triggers each stage, and what does it produce?'],
    ['Governing Variables', 'What environmental or internal variables control the rate or outcome of {topic} (e.g. temperature, concentration, pressure)?'],
    ['Key Terminology', 'Define the 3–5 technical terms most commonly tested alongside {topic}.'],
    ['Real-World Example', 'Give one concrete example, practical application, or experiment demonstrating {topic}.'],
    ['Common Exam Pitfall', 'What is the most common mistake students make when explaining {topic}, and how do you avoid it?']
  ],
  timelineHumanities: [
    ['Core Definition & Context', 'What is {topic}? Who or what was primarily involved, and roughly when/where did it take place?'],
    ['Causes', 'What were the main long-term and short-term causes leading to {topic}?'],
    ['Key Events / Sequence', 'List the major events of {topic} in chronological sequence.'],
    ['Consequences & Impact', 'What were the immediate and long-term consequences of {topic}?'],
    ['Key Figures & Groups', 'Who were the most significant people or groups involved in {topic}, and what did each want?'],
    ['Historiographical Debate', 'What do historians/commentators disagree about regarding {topic}?']
  ],
  quantFormula: [
    ['Core Definition', 'What does {topic} mean, and what type of problem is it used to solve?'],
    ['Formula & Notation', 'Write out the standard formula or notation for {topic}, labelling every variable.'],
    ['Worked Example', 'Work through one example problem using {topic} step by step.'],
    ['When It Applies', 'Under what conditions or constraints does {topic} apply (and when does it NOT apply)?'],
    ['Common Error', 'What is the most common calculation or conceptual error made with {topic}?'],
    ['Connection to Other Concepts', 'How does {topic} relate to or build on other concepts in this unit?']
  ],
  language: [
    ['Core Rule', 'What is the rule for {topic}? State it precisely.'],
    ['Example Usage', 'Give 2–3 example sentences correctly using {topic}.'],
    ['Common Mistake', 'What mistake do learners typically make with {topic}, and what is the corrected form?'],
    ['Exceptions', 'Are there exceptions to the {topic} rule? List them.'],
    ['Related Vocabulary', 'List 4–5 words or phrases closely associated with {topic}.'],
    ['Practice Prompt', 'Write one sentence of your own correctly demonstrating {topic}.']
  ],
  generic: [
    ['Core Definition & Key Principles', 'What is {topic}? State the fundamental definition and governing principles.'],
    ['Primary Process / Mechanism', 'What are the key steps, stages, or mechanisms involved in {topic}?'],
    ['Essential Terminology', 'What technical terms are essential to understanding {topic}?'],
    ['Practical Application', 'Give a real-world example or application of {topic}.'],
    ['Common Pitfall', 'What is a common misconception or mistake related to {topic}?'],
    ['Synthesis', 'How does {topic} connect to the broader subject it belongs to?']
  ]
};

function fill(template, topic) {
  return template.replace(/{topic}/g, topic);
}

// ---------------------------------------------------------------------------
// 3. Public generator
// ---------------------------------------------------------------------------

/**
 * Generates structurally-appropriate study items for ANY topic,
 * without hardcoding or inventing facts. Intended as a resilient fallback
 * when live AI generation is unavailable.
 *
 * @param {string} rawTopic
 * @param {string} toolType e.g. 'flashcards' | 'quiz' | ...
 * @returns {Array<object>} items compatible with normalizeToolItems()
 */
export function generateDynamicAcademicCards(rawTopic, toolType = 'flashcards') {
  const topic = String(rawTopic || 'this topic')
    .replace(/\b(create|generate|make|build|flashcards|quiz|notes|tool|for|on|about|the|a|an)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim() || 'this topic';

  const domain = classifyDomain(topic.toLowerCase());
  const shape = SHAPES[domain] || SHAPES.generic;
  const isQuiz = /quiz|mcq|test|assessment/.test(String(toolType).toLowerCase());

  if (!isQuiz) {
    return shape.map(([front, backTemplate], idx) => ({
      id: String(idx + 1),
      front: `${topic}: ${front}`,
      back: fill(backTemplate, topic),
      left: `${topic}: ${front}`,
      right: fill(backTemplate, topic),
      word: front.replace(/[^a-zA-Z]/g, '').slice(0, 10).toUpperCase() || `ITEM${idx + 1}`,
      clue: fill(backTemplate, topic)
    }));
  }

  // Quiz shape: diagnostic self-assessment prompts
  return shape.map(([front, backTemplate], idx) => ({
    id: String(idx + 1),
    question: `${front} — ${fill(backTemplate, topic)}`,
    choices: [
      'I can answer this confidently',
      'I can partially answer this',
      "I don't know this yet — needs review",
      'Not applicable to this topic'
    ],
    answer: 'A',
    answerText: 'I can answer this confidently',
    explanation: `This is a self-assessment prompt for "${topic}" — review any concept you could not answer confidently. Regenerate when live AI connectivity is active for full fact-based multiple choice questions.`
  }));
}

// ---------------------------------------------------------------------------
// 4. Live Model Cascade with Fallback
// ---------------------------------------------------------------------------

/**
 * Executes a primary call and secondary model call before falling back to scaffold.
 * @param {() => Promise<any>} primaryCall
 * @param {() => Promise<any>} secondaryCall
 * @param {(raw: string) => any[] | null} parse
 * @returns {Promise<any[] | null>}
 */
export async function generateItemsWithFallback(primaryCall, secondaryCall, parse) {
  if (typeof primaryCall === 'function') {
    try {
      const raw = await primaryCall();
      const parsed = parse(raw);
      const list = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.items) ? parsed.items : null);
      if (Array.isArray(list) && list.length > 0) return list;
    } catch (err) {
      console.warn('[content] primary model failed:', err.message);
    }
  }

  if (typeof secondaryCall === 'function') {
    try {
      const raw = await secondaryCall();
      const parsed = parse(raw);
      const list = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.items) ? parsed.items : null);
      if (Array.isArray(list) && list.length > 0) return list;
    } catch (err) {
      console.warn('[content] secondary model fallback failed:', err.message);
    }
  }

  return null;
}
