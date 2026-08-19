/**
 * svgDiagramPrompt.js
 * Pedagogical AI Spec Architect for HydrusLearn.
 * Implements Pedagogical Intent Classification & Interactive Simulation Spec Generation.
 */

export const PEDAGOGICAL_TAXONOMY = {
  STRUCTURE_LABELER: 'structure-labeler',      // Anatomy, spatial parts, memorization
  PROCESS_SIMULATOR: 'process-simulator',      // Step-by-step algorithms, workflows, cycles
  DECISION_TRAINER: 'decision-trainer',        // Predict next move (e.g., BST insertion comparison)
  COMPARISON_CONTRAST: 'comparison-contrast',  // Side-by-side structure/logic divergence
  FREE_EXPLORER: 'free-explorer',              // Open sandbox exploration after guided sequence
};

/**
 * Builds the AI prompt with mandatory Pedagogical Spec Architecture before drawing.
 */
export function buildSVGDiagramPrompt(userPrompt, contextString = '') {
  return `
You are an expert Educational Architect and Interactive Simulation Designer for HydrusLearn.
Your goal is to transform the user's request into a rich, step-by-step interactive learning tool that EXPLAINS WHAT EACH PART DOES AND WHY.

USER REQUEST: "${userPrompt}"${contextString}

STEP 1: Classify Pedagogical Intent
Determine which taxonomy model best fits the learner's goal:
- "process-simulator": Learner steps through an algorithm, cycle, or flow state (e.g. blood flow, 4-stroke engine, mitosis).
- "structure-labeler": Learner inspects and learns the function of parts of a complex organ, cell, or system.
- "decision-trainer": Learner predicts decisions/movements (e.g. BST comparison logic, sorting decisions, circuit switches).
- "comparison-contrast": Learner compares two diverging structures or states.
- "free-explorer": Interactive sandbox.

FOR PROCESSES AND DIAGRAMS ("how it works", "diagram of X"):
- Focus on EXPLAINING WHAT EACH PART DOES and WHY IT WORKS rather than asking quiz questions.
- Provide a clear, sequential "narrativeFlow" where each step explains:
  1. WHAT happens in this phase/part.
  2. WHY it happens (physiological mechanism, algorithm rule, or physical principle).
  3. WHAT happens next.

Return ONLY valid JSON with NO markdown formatting and NO unescaped backticks:
{
  "pedagogicalIntent": "process-simulator | structure-labeler | decision-trainer | comparison-contrast | free-explorer",
  "title": "Clear pedagogical title of the interactive simulation for ${userPrompt}",
  "description": "Crisp explanation of what the learner will discover and master",
  "viewBox": "0 0 800 650",
  "narrativeFlow": [
    {
      "step": 1,
      "title": "Step 1: [Topic Specific Step Name]",
      "narration": "Detailed explanation of WHAT happens in this stage for ${userPrompt}",
      "why": "Detailed explanation of WHY it operates this way and the scientific/logical mechanism",
      "activeNodeId": "node_1",
      "targetNodeId": "node_2",
      "flowDirection": "Transition direction between components"
    }
  ],
  "causalHooks": {
    "rule": "Core underlying rule or scientific principle",
    "why": "Reason why state transition occurs",
    "consequence": "Effect on the overall system state"
  },
  "nodes": [
    {
      "id": "node_1",
      "label": "[Topic Specific Component/Stage Label]",
      "role": "[Role of this stage in ${userPrompt}]",
      "whatItDoes": "Detailed explanation of what this component or stage does",
      "whyItWorks": "Scientific mechanism explaining why it operates this way",
      "x": 200,
      "y": 250,
      "radius": 44
    }
  ],
  "edges": [
    { "from": "node_1", "to": "node_2", "label": "[Relationship / Flow Label]" }
  ],
  "rawSvg": ""
}

CRITICAL RULES FOR 100% TOPIC ACCURACY:
1. ALL nodes, labels, narrations, and flow directions MUST BE 100% SPECIFIC TO THE USER'S REQUESTED TOPIC ("${userPrompt}"). DO NOT output heart, blood flow, or anatomy terms unless the user explicitly requested cardiovascular topics!
2. Provide a rich narrativeFlow array with detailed "narration" (WHAT it does) and "why" (WHY it works).
3. Ensure nodes contain "whatItDoes" and "whyItWorks" so clicking any part allows the user to inspect its exact function for "${userPrompt}".
`;
}

