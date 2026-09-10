/**
 * ml.engine.js
 *
 * Public API facade for the AI subsystem.
 * Modularized and decomposed into dedicated single-responsibility services:
 * - client/aiClient.js: Groq completions, key rotation, token management, embeddings, RAG.
 * - utils/aiParser.js: Unified JSON and markdown parsing.
 * - tools/normalizer.js: Canonical archetype normalizer and distractor resolution.
 * - tools/layouts/: Crossword and Word Search algorithmic matrices.
 * - tools/templates/templateEngine.js: Interactive glassmorphic HTML apps.
 * - tools/genericAcademicContent.js: Pedagogical structural fallback without hardcoded subject facts.
 * - tools/toolOrchestrator.js: Full lifecycle planner and tool builder.
 */

export {
  DEFAULT_AI_MODEL,
  FALLBACK_AI_MODEL,
  getEmbedding,
  getTopChunks,
  getChatCompletion,
  toolGenAI,
  generateMCQs,
  aiMindmapNode,
  describeImage,
  generateMetacognitiveAnalysis,
} from './client/aiClient.js';

export { safeParse } from './utils/aiParser.js';
export { normalizeToolItems, resolveCanonicalType } from './tools/normalizer.js';
export { generateDynamicAcademicCards, generateItemsWithFallback } from './tools/genericAcademicContent.js';
export { generateDeterministicFallbackHtml, renderDiagramToHtml, injectThemeCss, TOOL_THEME_CSS } from './tools/templates/templateEngine.js';
export { generateLearningTool } from './tools/toolOrchestrator.js';
