# 2D Interlocking Crossword Puzzle Blueprint

## Metadata
- **Type Key**: `crossword`
- **Aliases**: `crossword`, `crossword puzzle`, `2d crossword`, `cross word`
- **UI Category**: `interactive` / `grid`

## Data Schema
```json
{
  "id": "1",
  "word": "MITOCHONDRIA",
  "clue": "Organelle generating cellular ATP energy",
  "direction": "across"
}
```

## Interactive Mechanics
1. **2D Newspaper Crossword Matrix**: Pre-computes intersecting letters, grid coordinates, and numbered across/down clues.
2. **Across & Down Clue Lists**: Synchronized with board cells; clicking any clue highlights its letters on the 2D grid.
3. **Active Keyboard Navigation**: Auto-advances cursor across cells on letter entry; backspace moves to previous cell.
4. **Live Verification**: Instant "Check Puzzle" grading and "Reveal Answers" fallback.
