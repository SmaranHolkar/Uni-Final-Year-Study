# Cloze Deletion / Rapid Blurting Generator Blueprint

## Metadata
- **Type Key**: `cloze-blurting`
- **Aliases**: `cloze`, `fill in the blanks`, `occlusion`, `rapid blurting`, `masked notes`
- **UI Category**: `list` / `interactive`

## Data Schema
```json
{
  "id": "1",
  "front": "Topic / Pathway Heading",
  "sentence": "The [mitochondria] produces [ATP] energy through [oxidative phosphorylation].",
  "answer": "mitochondria"
}
```

## Interactive Mechanics
1. **Interactive Occlusion Masks**: Bracketed words `[term]` become clickable pill masks `[ Click to Reveal ]`.
2. **Batch Controls**: `🔒 Blur All` and `👁️ Reveal All` for rapid blurting rounds.
3. **Active Typing Mode**: Switch to prompt-by-prompt test mode with instant typing verification.
