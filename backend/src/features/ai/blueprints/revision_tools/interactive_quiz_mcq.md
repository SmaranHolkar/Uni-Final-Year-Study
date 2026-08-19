# Interactive MCQ & Exam Simulator Blueprint

## Metadata
- **Type Key**: `quiz`
- **Aliases**: `quiz`, `mcq`, `multiple choice`, `exam simulator`, `practice test`, `assessment`
- **UI Category**: `interactive`

## Data Schema
```json
{
  "id": "1",
  "question": "What is the primary thermodynamic condition for a reaction to be spontaneous at constant temperature and pressure?",
  "choices": [
    "ΔG < 0 (Negative Gibbs Free Energy)",
    "ΔH > 0 (Endothermic enthalpy change)",
    "ΔS < 0 (Decrease in system entropy)",
    "Activation energy equals zero"
  ],
  "answer": "A",
  "explanation": "Spontaneity requires Gibbs free energy change ΔG = ΔH - TΔS to be strictly negative."
}
```

## Interactive Mechanics
1. **Interactive Choice Buttons**: Lettered buttons (A, B, C, D) with hover transitions.
2. **Instant Evaluation**: Immediate green highlight on correct answer, crimson on mistake with correct answer revealed.
3. **Comprehensive Explanation Box**: Pedagogical rationale for why the answer is correct and why common distractors fail.
4. **Final Score Card**: Aggregate performance percentage and review summary with restart capability.
