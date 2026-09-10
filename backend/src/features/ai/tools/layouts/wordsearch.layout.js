/**
 * wordsearch.layout.js
 *
 * Deterministic word search matrix generator.
 * Places words horizontally or vertically and fills remaining cells
 * with random uppercase alphabetic characters.
 */

export function buildWordSearchLayout(wordItems) {
  const words = (wordItems || [])
    .map(w => String(w.word || w.front || w.title || '').toUpperCase().replace(/[^A-Z]/g, ''))
    .filter(w => w.length >= 3)
    .slice(0, 16);

  if (words.length === 0) return null;

  const SIZE = Math.max(12, Math.ceil(Math.sqrt(words.join('').length * 2.5)));
  const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(''));
  const positions = [];
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  for (const word of words) {
    let placed = false;
    for (let attempt = 0; attempt < 200 && !placed; attempt++) {
      const dir = Math.random() < 0.5 ? 'horizontal' : 'vertical';
      const maxR = dir === 'horizontal' ? SIZE - 1 : SIZE - word.length;
      const maxC = dir === 'vertical' ? SIZE - 1 : SIZE - word.length;
      if (maxR < 0 || maxC < 0) continue;
      const sr = Math.floor(Math.random() * (maxR + 1));
      const sc = Math.floor(Math.random() * (maxC + 1));

      let ok = true;
      for (let i = 0; i < word.length; i++) {
        const r = dir === 'horizontal' ? sr : sr + i;
        const c = dir === 'vertical' ? sc : sc + i;
        if (grid[r][c] && grid[r][c] !== word[i]) {
          ok = false;
          break;
        }
      }
      if (ok) {
        for (let i = 0; i < word.length; i++) {
          const r = dir === 'horizontal' ? sr : sr + i;
          const c = dir === 'vertical' ? sc : sc + i;
          grid[r][c] = word[i];
        }
        positions.push({ word, startRow: sr, startCol: sc, direction: dir });
        placed = true;
      }
    }
    if (!placed) console.warn(`WordSearch: could not place "${word}"`);
  }

  // Fill empty cells with random letters
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!grid[r][c]) grid[r][c] = LETTERS[Math.floor(Math.random() * 26)];
    }
  }

  return { gridRows: SIZE, gridCols: SIZE, grid, wordPositions: positions };
}
