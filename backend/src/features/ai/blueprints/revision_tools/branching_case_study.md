# Branching Case Study & Decision Tree Blueprint

## Metadata
- **Type Key**: `branching-scenario`
- **Aliases**: `case study`, `scenario`, `decision tree`, `branching`, `clinical scenario`, `ethics dilemma`
- **UI Category**: `interactive`

## Data Schema
```json
{
  "id": "1",
  "title": "Clinical/Executive Dilemma Phase 1",
  "situation": "A 45-year-old patient presents with acute chest pain and elevated ST segments on ECG. History includes hypertension.",
  "options": [
    { "text": "Administer immediate aspirin and activate cardiac catheterization lab", "consequence": "Correct protocol: Rapid reperfusion restores myocardial blood flow." },
    { "text": "Order routine outpatient echocardiogram and discharge", "consequence": "Dangerous: Delayed intervention leads to transmural infarction." }
  ],
  "reasoning": "Standard guidelines require emergency catheterization within 90 minutes."
}
```

## Interactive Mechanics
1. **Scenario Progression**: Multi-stage dilemma where each choice evaluates consequences immediately.
2. **Outcome Feedback**: Color-coded feedback (emerald for correct decision, crimson for suboptimal) with pedagogical debrief.
3. **Resolution Summary**: Reaches a case resolution screen with total clinical/managerial mastery score.
