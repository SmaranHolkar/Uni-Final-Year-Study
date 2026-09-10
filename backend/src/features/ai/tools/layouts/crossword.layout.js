/**
 * crossword.layout.js
 *
 * Deterministic crossword 2D grid placement algorithm.
 * Computes word intersections, grid bounds, across/down directions,
 * and standard reading-order clue numbering.
 */

export function buildCrosswordLayout(wordItems) {
  const entries = (wordItems || [])
    .map(w => ({
      word: String(w.word || w.front || w.term || w.title || w.concept || '').toUpperCase().replace(/[^A-Z]/g, ''),
      clue: String(w.clue || w.back || w.definition || w.explanation || w.detail || w.hint || w.content || ''),
    }))
    .filter(w => w.word.length >= 3)
    .sort((a, b) => b.word.length - a.word.length)
    .slice(0, 16);

  if (entries.length === 0) return null;

  const ORIGIN = 30;
  const grid = new Map(); // "r,c" → letter
  const placed = [];      // { word, clue, direction, startRow, startCol }

  const getCell = (r, c) => grid.get(`${r},${c}`) ?? null;
  const setCell = (r, c, ch) => grid.set(`${r},${c}`, ch);

  const canPlace = (word, dir, sr, sc) => {
    const dr = dir === 'down' ? 1 : 0;
    const dc = dir === 'across' ? 1 : 0;
    // Cell immediately before start must be empty
    if (getCell(sr - dr, sc - dc) !== null) return false;
    // Cell immediately after end must be empty
    if (getCell(sr + dr * word.length, sc + dc * word.length) !== null) return false;

    for (let i = 0; i < word.length; i++) {
      const r = sr + dr * i;
      const c = sc + dc * i;
      const existing = getCell(r, c);
      if (existing !== null) {
        if (existing !== word[i]) return false; // letter conflict
      } else {
        // Check adjacent perpendicular cells to prevent side-by-side collisions
        if (dir === 'across') {
          if (getCell(r - 1, c) !== null || getCell(r + 1, c) !== null) return false;
        } else {
          if (getCell(r, c - 1) !== null || getCell(r, c + 1) !== null) return false;
        }
      }
    }
    return true;
  };

  const doPlace = (word, dir, sr, sc) => {
    const dr = dir === 'down' ? 1 : 0;
    const dc = dir === 'across' ? 1 : 0;
    for (let i = 0; i < word.length; i++) setCell(sr + dr * i, sc + dc * i, word[i]);
  };

  // Place first word horizontally at center
  doPlace(entries[0].word, 'across', ORIGIN, ORIGIN);
  placed.push({ ...entries[0], direction: 'across', startRow: ORIGIN, startCol: ORIGIN });

  // Pass 1: Try to intersect remaining words
  const unplaced = [];
  for (let ei = 1; ei < entries.length; ei++) {
    const entry = entries[ei];
    let placed_ = false;

    for (const p of placed) {
      if (placed_) break;
      const newDir = p.direction === 'across' ? 'down' : 'across';

      for (let ni = 0; ni < entry.word.length && !placed_; ni++) {
        for (let pi = 0; pi < p.word.length && !placed_; pi++) {
          if (entry.word[ni] !== p.word[pi]) continue;
          const finalSr = newDir === 'down' ? p.startRow - ni : p.startRow + pi;
          const finalSc = newDir === 'across' ? p.startCol - ni : p.startCol + pi;
          if (canPlace(entry.word, newDir, finalSr, finalSc)) {
            doPlace(entry.word, newDir, finalSr, finalSc);
            placed.push({ ...entry, direction: newDir, startRow: finalSr, startCol: finalSc });
            placed_ = true;
          }
        }
      }
    }
    if (!placed_) unplaced.push(entry);
  }

  // Pass 2: Place any remaining words in clean adjacent parallel rows
  for (const entry of unplaced) {
    const currentMaxR = Math.max(...placed.map(p => p.direction === 'down' ? p.startRow + p.word.length - 1 : p.startRow));
    const currentMinC = Math.min(...placed.map(p => p.startCol));
    const targetR = currentMaxR + 2;
    const targetC = currentMinC;
    doPlace(entry.word, 'across', targetR, targetC);
    placed.push({ ...entry, direction: 'across', startRow: targetR, startCol: targetC });
  }

  if (placed.length === 0) return null;

  // Normalise so min row/col = 1
  const allR = placed.flatMap(p => [p.startRow, p.direction === 'down' ? p.startRow + p.word.length - 1 : p.startRow]);
  const allC = placed.flatMap(p => [p.startCol, p.direction === 'across' ? p.startCol + p.word.length - 1 : p.startCol]);
  const minR = Math.min(...allR);
  const minC = Math.min(...allC);
  const maxR = Math.max(...allR);
  const maxC = Math.max(...allC);

  const np = placed.map(p => ({ ...p, startRow: p.startRow - minR + 1, startCol: p.startCol - minC + 1 }));

  // Assign clue numbers in standard reading order
  const cellNum = new Map();
  [...np].sort((a, b) => a.startRow !== b.startRow ? a.startRow - b.startRow : a.startCol - b.startCol)
    .forEach(p => {
      const k = `${p.startRow},${p.startCol}`;
      if (!cellNum.has(k)) cellNum.set(k, cellNum.size + 1);
      p.number = cellNum.get(k);
    });

  return {
    gridRows: maxR - minR + 1,
    gridCols: maxC - minC + 1,
    words: np,
  };
}
