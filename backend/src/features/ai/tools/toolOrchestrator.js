/**
 * toolOrchestrator.js
 *
 * Core orchestration pipeline for generating interactive learning tools.
 * Decomposes intent classification, RAG retrieval, LLM planning, item normalization,
 * and deterministic HTML generation into clean, testable stages.
 */

import pool from '../../../shared/config/dbPool.js';
import { toolGenAI, getEmbedding, getChatCompletion } from '../client/aiClient.js';
import { safeParse } from '../utils/aiParser.js';
import { getBlueprintForPrompt } from '../blueprintLoader.js';
import { buildSVGDiagramPrompt } from '../svgDiagramPrompt.js';
import { generateChemistrySimulatorHtml, generate3DSimulationHtml } from '../simulationGenerators.js';
import { generateDynamicAcademicCards, generateItemsWithFallback } from './genericAcademicContent.js';
import { normalizeToolItems, resolveCanonicalType } from './normalizer.js';
import { generateDeterministicFallbackHtml, renderDiagramToHtml, injectThemeCss } from './templates/templateEngine.js';
import { generateFluxImage, cacheImageLocally, toDataUrlIfPossible } from '../image/flux.service.js';

const UTILITY_TOOL_TYPES = [
  'timer', 'pomodoro', 'stopwatch', 'clock',
  'calculator', 'converter', 'counter', 'progress-tracker',
];

/**
 * Checks if a string contains common greetings.
 */
function isGreeting(promptText) {
  const trimmedLower = promptText.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const explicitToolKeywords = [
    'quiz', 'flashcard', 'flashcards', 'game', 'notes', 'guide', 'study guide',
    'test', 'mindmap', 'diagram', 'flowchart', 'calculator', 'converter',
    'timer', 'pomodoro', 'matching', 'crossword', 'word search', 'tool',
    'create', 'generate', 'build', 'make me a',
  ];
  if (explicitToolKeywords.some((k) => trimmedLower.includes(k))) return false;

  const greetingMatches = [
    'hi', 'hello', 'hey', 'heyy', 'hi there', 'hello there', 'hey there',
    'good morning', 'good afternoon', 'good evening', 'howdy', 'yo',
    'how are you', 'how r u', 'who are you', 'what can you do', 'what is this',
    'thanks', 'thank you', 'thx', 'bye', 'goodbye', 'cool', 'ok', 'okay', 'great', 'awesome',
  ];
  return (
    greetingMatches.includes(trimmedLower) ||
    (trimmedLower.length <= 15 && ['hi', 'hello', 'hey'].some((g) => trimmedLower.startsWith(g)))
  );
}

/**
 * Builds grounding context from RAG, documents, session history, and previous tools.
 */
async function buildGroundingContext(userId, promptText, options = {}) {
  let contextString = '';
  let targetDocTitle = options.documentTitle || options.attachedDocument?.title;

  if (targetDocTitle) {
    try {
      targetDocTitle = decodeURIComponent(String(targetDocTitle).replace(/\+/g, ' ')).trim();
    } catch {
      targetDocTitle = String(targetDocTitle).replace(/\+/g, ' ').trim();
    }
  }

  // RAG Vector Search
  if (userId) {
    try {
      const isUuid =
        typeof userId === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

      if (isUuid) {
        const historyText = Array.isArray(options.chatHistory)
          ? options.chatHistory.slice(-4).map((m) => String(m.content || m.text || '')).join(' ')
          : '';
        const searchQueryText = `${promptText} ${historyText} ${options.previousTool?.title || ''} ${targetDocTitle || ''}`.trim();

        const queryVec = await Promise.race([
          getEmbedding(searchQueryText),
          new Promise((resolve) => setTimeout(() => resolve(null), 1200)),
        ]);

        if (queryVec && Array.isArray(queryVec)) {
          const vecStr = `[${queryVec.join(',')}]`;
          const client = await pool.connect();
          try {
            let rows = [];
            if (targetDocTitle) {
              const cleanDocTitle = targetDocTitle.replace(/\+/g, ' ');
              const titleRes = await client.query(
                `SELECT id, chunk_text, title, COALESCE(paragraph_index, 1) as paragraph_index, COALESCE(page_number, 1) as page_number 
                 FROM public.w_embeddings
                 WHERE user_id = $1 AND (
                   title = $2 OR 
                   title ILIKE $3 OR
                   REPLACE(title, '+', ' ') ILIKE $3 OR
                   REPLACE(title, ' ', '+') ILIKE $3
                 )
                 ORDER BY embedding <-> $4::vector LIMIT 10`,
                [userId, targetDocTitle, `%${cleanDocTitle}%`, vecStr]
              );
              rows = titleRes.rows;
            }

            if (rows.length > 0) {
              const docTitleUsed = rows[0].title;
              contextString += `\n\nEXACT RAG GROUNDED CONTEXT FROM ACTIVE SESSION DOCUMENT ("${docTitleUsed}"):\n`;
              rows.forEach((r, idx) => {
                contextString += `[Excerpt ${idx + 1} from "${r.title}" (Page ${r.page_number}, Paragraph ${r.paragraph_index})]:\n${r.chunk_text}\n\n`;
              });
              contextString += `MANDATORY SESSION CONTINUITY INSTRUCTION: You MUST use the factual context above from "${docTitleUsed}" to create all quiz questions, flashcards, or study guide content for this turn. Every question MUST directly test concepts, facts, and terms from these excerpts!\n`;
            } else if (targetDocTitle) {
              contextString += `\n\nACTIVE TOPIC FOR THIS REVISION TOOL: "${targetDocTitle}"\n`;
              contextString += `MANDATORY TOPIC INSTRUCTION: You MUST generate all quiz questions, flashcards, study guide, or diagram content strictly about "${targetDocTitle}".\n`;
            }
          } finally {
            client.release();
          }
        }
      }
    } catch (ragErr) {
      console.warn('[RAG TOOL GEN] Vector search failed:', ragErr.message);
    }
  }

  // Previous Tool Continuity
  if (options.previousTool) {
    const prevTitle = options.previousTool.title || options.previousTool.name || 'Previous Tool';
    const prevType = options.previousTool.toolType || options.previousTool.type || 'tool';
    contextString += `\n\nCURRENT ACTIVE TOOL IN VIEW:\n`;
    contextString += `- Title: "${prevTitle}"\n`;
    contextString += `- Type: ${prevType}\n`;
    if (options.previousTool.description) {
      contextString += `- Description: ${options.previousTool.description}\n`;
    }
    contextString += `INSTRUCTION: If the user says "turn it into a different tool" or "change format", convert "${prevTitle}" on the EXACT SAME subject into the requested new format. MAINTAIN TOPIC CONTINUITY.\n`;
  }

  // Conversation History
  if (Array.isArray(options.chatHistory) && options.chatHistory.length > 0) {
    const historySnippets = options.chatHistory
      .slice(-20)
      .map((m) => `${m.role === 'user' ? 'Student' : 'Vela'}: ${String(m.content || m.text || '').trim()}`)
      .filter(Boolean)
      .join('\n\n');
    if (historySnippets) {
      contextString += `\n\n═══════════════════════════════════════════════════════════════\nFULL CONVERSATION HISTORY IN THIS CHAT SESSION:\n${historySnippets}\n═══════════════════════════════════════════════════════════════\n`;
    }
  }

  if (Array.isArray(options.context) && options.context.length > 0) {
    contextString += `\n\nSTUDENT'S RECENT MISTAKES TO FOCUS ON:\n`;
    options.context.forEach((q, i) => {
      contextString += `Q${i + 1}: ${q.prompt}\n(Student answered: ${q.userAnswer}, Correct answer: ${q.correctAnswer})\n`;
    });
    contextString += `\nINSTRUCTION: Target and correct these mistakes in the generated content.`;
  }

  return contextString;
}

/**
 * Main entrypoint for generating an interactive learning tool.
 */
export async function generateLearningTool(userId, prompt, context, options = {}) {
  const promptText = String(prompt || '').trim();
  if (!promptText) throw new Error('prompt is required');

  // 1. GREETINGS FAST-PATH
  if (isGreeting(promptText)) {
    const greetingReplies = [
      "Hello! I'm Vela, your AI study coach. How can I help you revise today? You can ask me questions about your study topics, or ask me to generate interactive flashcards, quizzes, study guides, or diagrams!",
      "Hi there! Ready to study? Let me know what subject you'd like to practice or what kind of interactive tool you'd like to create!",
      "Hey! How can I assist your revision today? Feel free to ask a question or request flashcards, a quiz, or a study guide!",
    ];
    const aiReply = greetingReplies[Math.floor(Math.random() * greetingReplies.length)];
    return {
      toolType: 'chat',
      title: 'Conversation',
      description: 'Chat response',
      render: 'chat',
      ui: 'chat',
      chatResponse: aiReply,
      data: { message: aiReply, items: [] },
    };
  }

  // 2. BUILD GROUNDING CONTEXT
  const contextString = await buildGroundingContext(userId, promptText, { ...options, context });

  // 3. AI PLANNING CALL
  const planPrompt = `
You are Vela, an elite AI educational architect, study coach, and revision tool creator.

YOUR PRIMARY MISSION & BEHAVIORS:
1. FULL CONVERSATION MEMORY & CONTINUITY:
   Synthesize the entire conversation thread together. Maintain subject continuity.

2. ACTIVE INQUIRY (ONLY FOR VAGUE REQUESTS WITH NO SUBJECT):
   If the student gives an open-ended request WITHOUT specifying ANY subject or topic (e.g. "Help me revise"):
   - Set "toolType": "chat", "ui": "chat".
   - In "chatResponse", ask 2-3 clarifying questions.

3. TOPIC & CONCEPT LEARNING REQUESTS (ALWAYS BUILD AN INTERACTIVE TOOL ON CANVAS):
   Whenever the student asks to learn, understand, or study ANY concept or topic:
   - ALWAYS choose the best interactive tool archetype (flashcards, quiz, cloze-blurting, feynman-grader, revision-kit, matching, timeline, study-notes, svg_diagram).
   - Populate "items" with 4-6 authentic, syllabus-accurate items for "${promptText}".
   - In "chatResponse", provide a concise, encouraging educational summary.

4. DIAGRAM & VISUALIZATION REQUESTS:
   If the student asks to create/draw a diagram, flowchart, schematic:
   - Set "toolType": "svg_diagram", "ui": "visual".

USER'S LATEST MESSAGE: "${promptText}"${contextString}

Return ONLY valid JSON (no markdown outside):
{
  "toolType": "one of: flashcards | quiz | cloze-blurting | feynman-grader | revision-kit | study-notes | matching | crossword | true-false | ordering | timeline | svg_diagram | chat",
  "title": "Topic-specific title",
  "description": "Crisp summary of what this tool covers",
  "chatResponse": "Educational summary for the student",
  "items": [
    { "id": "1", "front": "Specific Stage / Core Concept 1", "back": "Accurate mechanism, inputs/outputs, and exam facts 1", "question": "Question 1 on ${promptText}", "choices": ["Correct answer", "Distractor 1", "Distractor 2", "Distractor 3"], "answer": "Correct answer", "explanation": "Exam reasoning 1" },
    { "id": "2", "front": "Specific Stage / Core Concept 2", "back": "Accurate mechanism, inputs/outputs, and exam facts 2", "question": "Question 2 on ${promptText}", "choices": ["Correct answer", "Distractor 1", "Distractor 2", "Distractor 3"], "answer": "Correct answer", "explanation": "Exam reasoning 2" },
    { "id": "3", "front": "Specific Stage / Core Concept 3", "back": "Accurate mechanism, inputs/outputs, and exam facts 3", "question": "Question 3 on ${promptText}", "choices": ["Correct answer", "Distractor 1", "Distractor 2", "Distractor 3"], "answer": "Correct answer", "explanation": "Exam reasoning 3" },
    { "id": "4", "front": "Specific Stage / Core Concept 4", "back": "Accurate mechanism, inputs/outputs, and exam facts 4", "question": "Question 4 on ${promptText}", "choices": ["Correct answer", "Distractor 1", "Distractor 2", "Distractor 3"], "answer": "Correct answer", "explanation": "Exam reasoning 4" },
    { "id": "5", "front": "Specific Stage / Core Concept 5", "back": "Accurate mechanism, inputs/outputs, and exam facts 5", "question": "Question 5 on ${promptText}", "choices": ["Correct answer", "Distractor 1", "Distractor 2", "Distractor 3"], "answer": "Correct answer", "explanation": "Exam reasoning 5" }
  ]
}

ITEM FORMAT INSTRUCTIONS:
- CRITICAL: You MUST populate "items" with at least 5 to 6 distinct, syllabus-accurate items covering different stages/mechanisms for "${promptText}".
- Keep explanations concise (1-2 clear sentences) so all items finish within the JSON payload.
`;

  let plan = null;
  try {
    const planRaw = await toolGenAI(planPrompt, undefined, 0.3, 2500, { forceJson: false });
    plan = safeParse(planRaw);
  } catch (err) {
    console.warn('[ML ENGINE] Planner call error:', err.message);
  }

  // Offline intent deduction if planning call fails
  if (!plan) {
    const detectedType = resolveCanonicalType(promptText);
    const cleanTopic =
      promptText
        .replace(/\b(create|generate|make|build|flashcards|quiz|notes|tool|for|on|about|the|a|an)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim() || 'Study Revision';

    if (detectedType !== 'chat') {
      plan = {
        toolType: detectedType,
        title: `${cleanTopic.charAt(0).toUpperCase() + cleanTopic.slice(1)} Revision`,
        description: `Interactive ${detectedType} learning module on ${cleanTopic}`,
        ui: 'cards',
        chatResponse: `I’ve prepared an interactive **${detectedType}** set for **${cleanTopic}**, now ready on your canvas!`,
        items: [],
      };
    } else {
      plan = {
        toolType: 'chat',
        title: 'Conversation',
        description: 'Chat response',
        ui: 'chat',
        chatResponse: `Here is an overview for **${promptText}**! Let me know if you would like me to turn this into flashcards, a quiz, or a diagram.`,
        items: [],
      };
    }
  }

  // Diagram keyword override
  const lowerPrompt = String(promptText || '').toLowerCase();
  const explicitDiagramKeywords = [
    'diagram', 'svg', 'draw a diagram', 'create a diagram', 'make a diagram',
    'visualize', 'visualise', 'flowchart', 'schematic', 'interactive diagram',
  ];
  if (explicitDiagramKeywords.some((k) => lowerPrompt.includes(k))) {
    plan.toolType = 'svg_diagram';
  }

  const canonicalToolType = resolveCanonicalType(plan.toolType);
  if (canonicalToolType === 'chat') {
    const aiMessage =
      plan.chatResponse ||
      plan.data?.message ||
      plan.description ||
      "I'm here to help. What subject would you like to focus on?";
    return {
      toolType: 'chat',
      title: plan.title || 'Conversation',
      description: plan.description || 'Chat response',
      render: 'chat',
      ui: 'chat',
      chatResponse: aiMessage,
      data: { message: aiMessage, items: [] },
    };
  }

  let toolType = String(plan.toolType || 'flashcards').toLowerCase();

  // Match domain blueprint
  const activeBlueprint = getBlueprintForPrompt(promptText, toolType);
  if (activeBlueprint) {
    console.log(`🎯 DOMAIN BLUEPRINT MATCHED: [${activeBlueprint.name}] for prompt: "${promptText}"`);
    if (activeBlueprint.typeKey) {
      toolType = activeBlueprint.typeKey;
    }
  }

  const title = String(plan.title === 'Conversation' ? 'Interactive Study Tool' : plan.title || 'Learning Tool');
  const description = String(
    plan.description === 'Chat response'
      ? 'Explore and interact with this live educational revision tool'
      : plan.description || 'Generated from your request.'
  );
  const ui = String(plan.ui || 'cards').toLowerCase();

  // 4. SVG DIAGRAM SHORT-CIRCUIT
  const isDiagramType = [
    'diagram', 'svg_diagram', 'svg-diagram', 'flowchart', 'anatomy',
    'anatomy_flow', 'anatomy_labeling', 'data_structure', 'function_plot',
    'circuit_logic', 'circuit',
  ].some((d) => toolType.includes(d));

  if (isDiagramType) {
    let diagramSpec = null;
    try {
      const diagramPrompt = buildSVGDiagramPrompt(promptText, contextString);
      const diagramRaw = await toolGenAI(diagramPrompt, undefined, 0.3, 2500, { forceJson: false });
      diagramSpec = safeParse(diagramRaw);
    } catch (err) {
      console.warn('Failed to parse AI SVG Diagram spec:', err.message);
    }

    if (diagramSpec) {
      try {
        const bgPrompt = `A highly detailed, professional realistic textbook illustration of: ${promptText}. Style: Gray's Anatomy medical illustration, clean dark background, 8k resolution, authentic anatomical features.`;
        const fluxResult = await generateFluxImage(bgPrompt.slice(0, 500));
        if (fluxResult?.imageUrl) {
          diagramSpec.bgImageUrl = fluxResult.imageUrl;
        }
      } catch (fluxErr) {
        console.warn('Flux image base layer generation skipped:', fluxErr.message);
      }

      const diagramTitle = diagramSpec.title || title;
      const diagramDesc = diagramSpec.description || description;
      const diagramHtml = renderDiagramToHtml(diagramSpec, diagramTitle, diagramDesc);

      return {
        toolType: 'svg_diagram',
        title: diagramTitle,
        description: diagramDesc,
        render: 'native',
        ui: 'svg_diagram',
        html: diagramHtml,
        app: { html: diagramHtml },
        chatResponse:
          plan.chatResponse ||
          `I've generated an interactive visual diagram of **${diagramTitle}** for you on the canvas!`,
        data: { interactiveDiagram: diagramSpec, html: diagramHtml, items: [] },
      };
    }
  }

  // 5. IMAGE SHORT-CIRCUIT
  if (toolType === 'image' || toolType === 'illustration' || toolType === 'picture') {
    const imagePrompt = `A highly detailed, professional educational illustration of: ${promptText}. ${description}. Style: textbook diagram, clear, high resolution.`;
    const fluxResult = await generateFluxImage(imagePrompt.slice(0, 500));
    const localImageUrl = fluxResult.imageUrl ? await cacheImageLocally(fluxResult.imageUrl) : '';
    const imageDataUrl = fluxResult.imageUrl ? await toDataUrlIfPossible(fluxResult.imageUrl) : '';

    return {
      toolType: 'image',
      title,
      description,
      render: 'native',
      ui: 'image',
      data: {
        imagePrompt: imagePrompt.slice(0, 500),
        imageUrl: fluxResult.imageUrl || '',
        localImageUrl,
        imageDataUrl,
        imageError: fluxResult.error || '',
        items: [],
      },
    };
  }

  // 6. RAW ITEMS EXTRACTION & TWO-TIER FALLBACK
  let rawItems = Array.isArray(plan.items)
    ? plan.items.filter((it) => it && typeof it === 'object' && it.front !== 'Review your notes').slice(0, 18)
    : [];

  const isUtility = UTILITY_TOOL_TYPES.some((u) => toolType.includes(u));

  if (rawItems.length < 4 && !isUtility) {
    const itemsPrompt = `You are an expert curriculum and exam content generator. Generate at least 5 to 6 authentic, syllabus-accurate study items for: "${promptText}".
Topic: ${title || promptText}
Tool Type: ${toolType}
${contextString ? `Context / Notes:\n${contextString}\n` : ''}
Return ONLY valid JSON:
{
  "items": [
    { "id": "1", "front": "Specific Stage / Concept 1 on ${promptText}", "back": "Accurate, concise explanation, inputs/outputs and facts 1" },
    { "id": "2", "front": "Specific Stage / Concept 2 on ${promptText}", "back": "Accurate, concise explanation, inputs/outputs and facts 2" },
    { "id": "3", "front": "Specific Stage / Concept 3 on ${promptText}", "back": "Accurate, concise explanation, inputs/outputs and facts 3" },
    { "id": "4", "front": "Specific Stage / Concept 4 on ${promptText}", "back": "Accurate, concise explanation, inputs/outputs and facts 4" },
    { "id": "5", "front": "Specific Stage / Concept 5 on ${promptText}", "back": "Accurate, concise explanation, inputs/outputs and facts 5" }
  ]
}`;

    try {
      const fallbackList = await generateItemsWithFallback(
        () => toolGenAI(itemsPrompt, undefined, 0.3, 2000, { forceJson: false }),
        () => toolGenAI(itemsPrompt, 'qwen/qwen3.6-27b', 0.3, 2000, { forceJson: false }),
        safeParse
      );

      if (Array.isArray(fallbackList) && fallbackList.length > 0) {
        const cleanFallback = fallbackList
          .filter((it) => it && typeof it === 'object' && (it.front || it.question || it.term || it.left))
          .slice(0, 16);

        const existingPrompts = new Set(
          rawItems.map((it) => String(it.front || it.question || it.term || it.left || '').toLowerCase().trim())
        );
        for (const item of cleanFallback) {
          const itemKey = String(item.front || item.question || item.term || item.left || '').toLowerCase().trim();
          if (!existingPrompts.has(itemKey)) {
            rawItems.push(item);
            existingPrompts.add(itemKey);
          }
        }
      }
    } catch (err) {
      console.warn('[ML ENGINE] Item fallback generation error:', err.message);
    }
  }

  // Last-resort structural scaffold if still under minimum items (never hardcodes subject facts)
  if (rawItems.length < 4 && !isUtility && toolType !== 'chat') {
    const scaffoldCards = generateDynamicAcademicCards(title || promptText, toolType);
    const existingPrompts = new Set(
      rawItems.map((it) => String(it.front || it.question || it.term || it.left || '').toLowerCase().trim())
    );
    for (const card of scaffoldCards) {
      const cardKey = String(card.front || card.question || card.term || card.left || '').toLowerCase().trim();
      if (!existingPrompts.has(cardKey)) {
        rawItems.push(card);
        existingPrompts.add(cardKey);
      }
    }
  }

  // 7. NORMALIZE ITEMS
  const items = normalizeToolItems(toolType, rawItems);

  // 8. SIMULATION GENERATORS SHORT-CIRCUIT
  if (activeBlueprint?.name?.includes('Chemistry') || toolType.includes('chemistry')) {
    const chemHtml = generateChemistrySimulatorHtml(title, description, items);
    if (chemHtml) {
      return {
        toolType: 'simulation',
        title,
        description,
        chatResponse: plan?.chatResponse || `I've prepared an interactive simulation of **${title}** for you!`,
        render: 'iframe',
        ui: 'simulation',
        app: { html: injectThemeCss(chemHtml) },
        data: { items },
      };
    }
  }

  // 9. DETERMINISTIC TEMPLATE ENGINE RENDERING
  const fallbackHtml = generateDeterministicFallbackHtml(toolType, title, description, items);
  const html = injectThemeCss(fallbackHtml);

  return {
    toolType,
    title,
    description,
    chatResponse:
      plan?.chatResponse ||
      `I've created **${title}** for you! Explore the interactive tool on the canvas, or let me know if you want to quiz yourself or try another format.`,
    render: 'iframe',
    ui,
    items,
    app: { html },
    data: {
      toolType,
      title,
      description,
      chatResponse:
        plan?.chatResponse ||
        `I've created **${title}** for you! Explore the interactive tool on the canvas, or let me know if you want to quiz yourself or try another format.`,
      items,
    },
  };
}
