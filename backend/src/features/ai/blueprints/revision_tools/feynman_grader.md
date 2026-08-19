# Feynman Active Recall / Blurting Audio & Text Grader Blueprint

## Metadata
- **Type Key**: `feynman-grader`
- **Aliases**: `feynman`, `blurting`, `active recall grader`, `explain concept`, `voice grader`, `speech grader`
- **UI Category**: `cards` / `interactive`

## Data Schema
```json
{
  "id": "1",
  "concept": "Core Concept Name",
  "prompt": "Explain how this mechanism works in simple terms as if explaining to a beginner:",
  "keyPoints": [
    "Fundamental definition of term",
    "Primary mechanism and biological/logical pathway",
    "Key exam fact or formula"
  ],
  "exemplar": "Model expert explanation clearly synthesizing all key points in plain English."
}
```

## Interactive Mechanics
1. **Concept Deck Navigation**: Step through 4–8 concept cards.
2. **Dual-Mode Input**: Large explanation textarea with in-box `🎙️ Speak Answer` voice recognition streaming.
3. **Rubric Coverage Evaluator**: Calculates keyword and conceptual presence against `keyPoints` with visual checklist (✅ / ⚠️) and overall mastery percentage.
4. **Model Answer Drawer**: Toggleable exemplar explanation comparing student blurting against the expert standard.
