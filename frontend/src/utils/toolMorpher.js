// Client-side zero-latency tool morpher and crossword builder
// Allows instant conversion between Flashcards, Crossword, Quiz, Cloze, Feynman Grader, and 3-in-1 Revision Kit

export function buildClientCrosswordLayout(items) {
  const entries = (items || [])
    .map(w => ({
      word: String(w.word || w.front || w.term || w.title || w.concept || '').toUpperCase().replace(/[^A-Z]/g, ''),
      clue: String(w.clue || w.back || w.definition || w.explanation || w.detail || w.hint || w.content || ''),
    }))
    .filter(w => w.word.length >= 3)
    .sort((a, b) => b.word.length - a.word.length)
    .slice(0, 16);

  if (entries.length === 0) return null;

  const ORIGIN = 30;
  const grid = new Map();
  const placed = [];

  const getCell = (r, c) => grid.get(`${r},${c}`) ?? null;
  const setCell = (r, c, ch) => grid.set(`${r},${c}`, ch);

  const canPlace = (word, dir, sr, sc) => {
    const dr = dir === 'down' ? 1 : 0;
    const dc = dir === 'across' ? 1 : 0;
    if (getCell(sr - dr, sc - dc) !== null) return false;
    if (getCell(sr + dr * word.length, sc + dc * word.length) !== null) return false;

    for (let i = 0; i < word.length; i++) {
      const r = sr + dr * i;
      const c = sc + dc * i;
      const existing = getCell(r, c);
      if (existing !== null) {
        if (existing !== word[i]) return false;
      } else {
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

  doPlace(entries[0].word, 'across', ORIGIN, ORIGIN);
  placed.push({ ...entries[0], direction: 'across', startRow: ORIGIN, startCol: ORIGIN });

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

  for (const entry of unplaced) {
    const currentMaxR = Math.max(...placed.map(p => p.direction === 'down' ? p.startRow + p.word.length - 1 : p.startRow));
    const currentMinC = Math.min(...placed.map(p => p.startCol));
    const targetR = currentMaxR + 2;
    const targetC = currentMinC;
    doPlace(entry.word, 'across', targetR, targetC);
    placed.push({ ...entry, direction: 'across', startRow: targetR, startCol: targetC });
  }

  if (placed.length === 0) return null;

  const allR = placed.flatMap(p => [p.startRow, p.direction === 'down' ? p.startRow + p.word.length - 1 : p.startRow]);
  const allC = placed.flatMap(p => [p.startCol, p.direction === 'across' ? p.startCol + p.word.length - 1 : p.startCol]);
  const minR = Math.min(...allR);
  const minC = Math.min(...allC);
  const maxR = Math.max(...allR);
  const maxC = Math.max(...allC);

  const np = placed.map(p => ({ ...p, startRow: p.startRow - minR + 1, startCol: p.startCol - minC + 1 }));

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

export function morphToolToHtml(targetFormat, title, description, rawItems) {
  const format = String(targetFormat || 'flashcards').toLowerCase();
  const items = Array.isArray(rawItems) && rawItems.length > 0 ? rawItems : [
    { front: 'Concept 1', back: 'Core definition and explanation.', clue: 'Core definition and explanation.', word: 'CONCEPT' },
    { front: 'Mechanism', back: 'Detailed step-by-step function.', clue: 'Detailed step-by-step function.', word: 'FUNCTION' }
  ];
  const itemsJson = JSON.stringify(items);

  const baseCss = `
    :root {
      --background: #171A1F;
      --foreground: #ECECF1;
      --card: #1A1E24;
      --border: #282E38;
      --primary: #5A7D99;
      --primary-hover: #3D5E7A;
      --accent: #3D6660;
      --muted: #21262E;
      --muted-foreground: #8E8E93;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    *, *::before, *::after { border-radius: 0 !important; }
    body {
      background: var(--background);
      color: var(--foreground);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding: 1.5rem;
      text-align: center;
    }
    #app { width: 100%; max-width: 1000px; display: flex; flex-direction: column; align-items: center; }
    #app-header { margin-bottom: 1.25rem; width: 100%; }
    h1 { font-size: 1.35rem; font-weight: 700; color: #fff; margin-bottom: 0.35rem; }
    p { font-size: 0.85rem; color: var(--muted-foreground); max-width: 600px; margin: 0 auto; line-height: 1.5; }
    .badge { display: inline-flex; align-items: center; padding: 0.2rem 0.6rem; border-radius: 0; font-size: 0.75rem; font-weight: 700; background: var(--muted); border: 1px solid var(--border); color: var(--primary); }
    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; padding: 0.55rem 1.15rem; font-size: 0.825rem; font-weight: 600; border-radius: 0; cursor: pointer; transition: all 0.15s; border: none; }
    .btn-primary { background: var(--primary); color: #fff; }
    .btn-primary:hover { background: var(--primary-hover); }
    .btn-secondary { background: var(--card); color: var(--foreground); border: 1px solid var(--border); }
    .btn-secondary:hover { background: var(--muted); border-color: var(--primary); }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 0; padding: 1.25rem; box-shadow: 0 4px 20px rgba(0,0,0,0.25); }
    .text-left { text-align: left; }
  `;

  // 1. FLASHCARDS with Leitner Spaced Repetition Buttons & Keyboard Flip
  if (format.includes('flashcard') || format.includes('cards')) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>${baseCss}
      .fc-container { perspective: 1000px; width: 100%; max-width: 580px; min-height: 280px; cursor: pointer; margin: 1rem 0; }
      .fc-card { width: 100%; min-height: 280px; position: relative; transform-style: preserve-3d; transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1); border-radius: 1rem; border: 1px solid var(--border); background: var(--card); display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 2rem; box-shadow: 0 8px 30px rgba(0,0,0,0.3); }
      .fc-card.flipped { transform: rotateY(180deg); }
      .fc-front, .fc-back { position: absolute; inset: 0; backface-visibility: hidden; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 2rem; border-radius: 1rem; }
      .fc-back { transform: rotateY(180deg); background: #1C222B; border: 1px solid #3D5E7A; }
      .leitner-bar { display: flex; gap: 0.5rem; justify-content: center; margin-top: 0.75rem; flex-wrap: wrap; }
      .leitner-btn { padding: 0.45rem 0.85rem; font-size: 0.75rem; font-weight: 700; border-radius: 0.5rem; border: 1px solid transparent; cursor: pointer; transition: all 0.15s; }
      .leitner-again { background: rgba(239,68,68,0.15); color: #f87171; border-color: rgba(239,68,68,0.3); }
      .leitner-again:hover { background: #ef4444; color: #fff; }
      .leitner-good { background: rgba(59,130,246,0.15); color: #60a5fa; border-color: rgba(59,130,246,0.3); }
      .leitner-good:hover { background: #3b82f6; color: #fff; }
      .leitner-easy { background: rgba(16,185,129,0.15); color: #34d399; border-color: rgba(16,185,129,0.3); }
      .leitner-easy:hover { background: #10b981; color: #fff; }
    </style></head><body>
      <div id="app">
        <header id="app-header">
          <span class="badge">Spaced Flashcards</span>
          <h1 style="margin-top:0.35rem;">${title}</h1>
          <p>${description}</p>
          <div style="display:flex;gap:0.5rem;align-items:center;justify-content:center;margin-top:0.75rem;">
            <span class="badge" id="fc-progress">Card 1 of ${items.length}</span>
            <span class="badge" style="background:#131519;color:#8E8E93;">Space: Flip | ← →: Prev/Next</span>
          </div>
        </header>
        <main id="app-main" style="width:100%;display:flex;flex-direction:column;align-items:center;">
          <div class="fc-container" id="card-box">
            <div class="fc-card" id="card-inner">
              <div class="fc-front">
                <span class="badge" style="margin-bottom:1rem;">Question / Concept (Click to Flip)</span>
                <h2 id="front-text" style="font-size:1.3rem;font-weight:700;line-height:1.4;color:#fff;"></h2>
                <span id="hint-text" style="font-size:0.8rem;color:#8E8E93;margin-top:0.75rem;"></span>
              </div>
              <div class="fc-back">
                <span class="badge" style="margin-bottom:1rem;background:rgba(16,185,129,0.15);color:#34d399;border-color:rgba(16,185,129,0.3);">Answer / Explanation</span>
                <p id="back-text" style="font-size:1rem;color:#ECECF1;line-height:1.6;"></p>
              </div>
            </div>
          </div>
          <div style="display:flex;gap:0.5rem;align-items:center;justify-content:center;margin-top:0.5rem;">
            <button class="btn btn-secondary" id="fc-prev">← Previous</button>
            <button class="btn btn-primary" id="fc-flip">Flip (Space)</button>
            <button class="btn btn-secondary" id="fc-next">Next →</button>
            <button class="btn btn-secondary" id="fc-shuffle" title="Shuffle Cards">Shuffle</button>
          </div>
          <div class="leitner-bar">
            <button class="leitner-btn leitner-again" id="btn-again">Again (1d)</button>
            <button class="leitner-btn leitner-good" id="btn-good">Good (3d)</button>
            <button class="leitner-btn leitner-easy" id="btn-easy">Easy (7d)</button>
          </div>
        </main>
      </div>
      <script>
        let DATA = ${itemsJson};
        let cur = 0;
        let isFlipped = false;
        const inner = document.getElementById('card-inner');
        const fText = document.getElementById('front-text');
        const bText = document.getElementById('back-text');
        const hText = document.getElementById('hint-text');
        const prog = document.getElementById('fc-progress');

        function render() {
          if (!DATA.length) return;
          const it = DATA[cur];
          fText.textContent = it.front || it.question || it.term || it.concept || it.word || 'Concept';
          bText.textContent = it.back || it.answer || it.definition || it.explanation || it.clue || 'Explanation';
          hText.textContent = it.hint ? 'Hint: ' + it.hint : '';
          prog.textContent = 'Card ' + (cur + 1) + ' of ' + DATA.length;
          isFlipped = false;
          inner.classList.remove('flipped');
        }

        function toggleFlip() {
          isFlipped = !isFlipped;
          inner.classList.toggle('flipped', isFlipped);
        }

        document.getElementById('card-box').onclick = toggleFlip;
        document.getElementById('fc-flip').onclick = toggleFlip;
        document.getElementById('fc-prev').onclick = () => { cur = (cur - 1 + DATA.length) % DATA.length; render(); };
        document.getElementById('fc-next').onclick = () => { cur = (cur + 1) % DATA.length; render(); };
        document.getElementById('fc-shuffle').onclick = () => { DATA = [...DATA].sort(() => Math.random() - 0.5); cur = 0; render(); };

        document.getElementById('btn-again').onclick = (e) => { e.stopPropagation(); cur = (cur + 1) % DATA.length; render(); };
        document.getElementById('btn-good').onclick = (e) => { e.stopPropagation(); cur = (cur + 1) % DATA.length; render(); };
        document.getElementById('btn-easy').onclick = (e) => { e.stopPropagation(); cur = (cur + 1) % DATA.length; render(); };

        window.addEventListener('keydown', (e) => {
          if (e.code === 'Space') { e.preventDefault(); toggleFlip(); }
          if (e.code === 'ArrowLeft') { cur = (cur - 1 + DATA.length) % DATA.length; render(); }
          if (e.code === 'ArrowRight') { cur = (cur + 1) % DATA.length; render(); }
        });

        render();
      </script>
    </body></html>`;
  }

  // 2. 2D CROSSWORD
  if (format.includes('crossword')) {
    const layout = buildClientCrosswordLayout(items) || {
      gridRows: 10,
      gridCols: 10,
      words: items.map((it, i) => ({
        word: String(it.word || it.front || it.concept || 'WORD').toUpperCase().replace(/[^A-Z]/g, ''),
        clue: String(it.clue || it.back || it.detail || 'Clue definition'),
        direction: i % 2 === 0 ? 'across' : 'down',
        startRow: (i * 2) % 8 + 1,
        startCol: 1,
        number: i + 1,
      }))
    };
    const layoutJson = JSON.stringify(layout);

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>${baseCss}
      .cw-container{display:flex;flex-direction:row;gap:1.5rem;width:100%;max-width:1100px;align-items:flex-start;justify-content:center;flex-wrap:wrap;}
      .cw-board-wrapper{flex:1 1 500px;min-width:320px;display:flex;flex-direction:column;align-items:center;}
      .cw-board{display:inline-grid;grid-template-columns:repeat(${layout.gridCols},38px);grid-template-rows:repeat(${layout.gridRows},38px);gap:2px;background:transparent;padding:6px;border-radius:0.75rem;margin:0 auto;}
      .cw-cell{position:relative;width:38px;height:38px;display:flex;align-items:center;justify-content:center;user-select:none;box-sizing:border-box;}
      .cw-cell.empty-cell{visibility:hidden;pointer-events:none;background:transparent;}
      .cw-cell.active-cell{background:#ffffff;border:1.5px solid #cbd5e1;border-radius:4px;box-shadow:0 1px 3px rgba(0,0,0,0.12);transition:all 0.15s;}
      .cw-cell.active-cell.highlight{background:#e0e7ff;border-color:#6366f1;box-shadow:0 0 0 2px rgba(99,102,241,0.4);}
      .cw-cell-num{position:absolute;top:1px;left:3px;font-size:10px;font-weight:800;color:#64748b;line-height:1;pointer-events:none;}
      .cw-cell input{width:100%;height:100%;text-align:center;font-size:18px;font-weight:800;text-transform:uppercase;background:transparent;border:none;outline:none;color:#0f172a;caret-color:#6366f1;padding:0;cursor:pointer;}
      .cw-cell.correct{background:#d1fae5!important;border-color:#10b981!important;}
      .cw-cell.correct input{color:#065f46!important;}
      .cw-cell.wrong{background:#fee2e2!important;border-color:#ef4444!important;}
      .cw-cell.wrong input{color:#991b1b!important;}
      .cw-sidebar{flex:1 1 340px;min-width:280px;max-width:440px;display:flex;flex-direction:column;gap:1rem;}
      .clue-scroll{max-height:360px;overflow-y:auto;display:grid;gap:0.4rem;padding-right:0.35rem;}
      .clue-item{padding:0.6rem 0.85rem;border-radius:0.5rem;background:var(--background);border:1px solid var(--border);cursor:pointer;font-size:0.85rem;line-height:1.45;transition:all 0.15s;text-align:left;}
      .clue-item:hover,.clue-item.active{border-color:#6366f1;background:rgba(99,102,241,0.12);}
    </style></head><body>
      <div id="app">
        <header id="app-header">
          <span class="badge" style="background:#6366f1;color:white;">2D Crossword Grid</span>
          <h1 style="margin-top:0.25rem;">${title}</h1>
          <p>${description}</p>
          <span id="app-progress" class="badge" style="margin-top:0.5rem;">0 / ${layout.words.length} Solved</span>
        </header>
        <main id="app-main">
          <div class="cw-container">
            <div class="card cw-board-wrapper">
              <div style="width:100%;overflow-x:auto;display:flex;justify-content:center;padding:0.5rem 0;">
                <div class="cw-board" id="board"></div>
              </div>
              <div style="display:flex;gap:0.75rem;margin-top:1.25rem;width:100%;justify-content:center;">
                <button class="btn btn-primary" id="check-btn">Check Puzzle</button>
                <button class="btn btn-secondary" id="reveal-btn">Reveal Answers</button>
              </div>
            </div>
            <div class="cw-sidebar">
              <div class="card text-left" style="padding:1rem;">
                <div id="active-clue-banner" style="background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.3);padding:0.75rem;border-radius:0.5rem;font-size:0.875rem;line-height:1.4;margin-bottom:0.75rem;">
                  <strong id="banner-label" style="color:#818cf8;">Select a clue to begin:</strong> <span id="banner-text">Click any clue below or tap a grid square to type your answer.</span>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
                  <div>
                    <h4 style="font-weight:700;font-size:0.9rem;color:#818cf8;border-bottom:1px solid var(--border);padding-bottom:0.35rem;margin-bottom:0.4rem;">Across</h4>
                    <div class="clue-scroll" id="across-clues"></div>
                  </div>
                  <div>
                    <h4 style="font-weight:700;font-size:0.9rem;color:#818cf8;border-bottom:1px solid var(--border);padding-bottom:0.35rem;margin-bottom:0.4rem;">Down</h4>
                    <div class="clue-scroll" id="down-clues"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
      <script>
        const SPEC = ${layoutJson};
        const board = document.getElementById('board');
        const acrossBox = document.getElementById('across-clues');
        const downBox = document.getElementById('down-clues');
        const bannerLabel = document.getElementById('banner-label');
        const bannerText = document.getElementById('banner-text');
        const progress = document.getElementById('app-progress');
        const cellMap = new Map();

        SPEC.words.forEach(w => {
          const dr = w.direction === 'down' ? 1 : 0;
          const dc = w.direction === 'across' ? 1 : 0;
          for (let i = 0; i < w.word.length; i++) {
            const r = w.startRow + dr * i;
            const c = w.startCol + dc * i;
            const k = r + ',' + c;
            if (!cellMap.has(k)) cellMap.set(k, { r, c, letter: w.word[i], num: i === 0 ? w.number : null, words: [] });
            cellMap.get(k).words.push(w);
            if (i === 0) cellMap.get(k).num = w.number;
          }
        });

        for (let r = 1; r <= SPEC.gridRows; r++) {
          for (let c = 1; c <= SPEC.gridCols; c++) {
            const k = r + ',' + c;
            const div = document.createElement('div');
            div.className = 'cw-cell';
            if (cellMap.has(k)) {
              const info = cellMap.get(k);
              div.className = 'cw-cell active-cell';
              div.id = 'cell-' + r + '-' + c;
              if (info.num) {
                const numSpan = document.createElement('span');
                numSpan.className = 'cw-cell-num';
                numSpan.textContent = info.num;
                div.appendChild(numSpan);
              }
              const input = document.createElement('input');
              input.maxLength = 1;
              input.dataset.r = r;
              input.dataset.c = c;
              input.dataset.ans = info.letter;
              input.oninput = (e) => {
                e.target.value = e.target.value.toUpperCase();
                if (e.target.value) moveToNext(r, c);
              };
              input.onkeydown = (e) => {
                if (e.key === 'Backspace' && !input.value) moveToPrev(r, c);
                if (e.key === 'ArrowRight') moveTo(r, c + 1);
                if (e.key === 'ArrowLeft') moveTo(r, c - 1);
                if (e.key === 'ArrowDown') moveTo(r + 1, c);
                if (e.key === 'ArrowUp') moveTo(r - 1, c);
              };
              input.onfocus = () => { highlightWordForCell(info.words[0]); };
              div.appendChild(input);
            } else {
              div.className = 'cw-cell empty-cell';
            }
            board.appendChild(div);
          }
        }

        function renderClues() {
          SPEC.words.forEach(w => {
            const el = document.createElement('div');
            el.className = 'clue-item';
            el.id = 'clue-' + w.number + '-' + w.direction;
            el.innerHTML = '<strong>' + w.number + '.</strong> ' + w.clue + ' <span style="color:#94a3b8;font-size:0.75rem;font-weight:700;">(' + w.word.length + ')</span>';
            el.onclick = () => focusWord(w);
            if (w.direction === 'across') acrossBox.appendChild(el);
            else downBox.appendChild(el);
          });
        }

        function focusWord(w) {
          document.querySelectorAll('.clue-item').forEach(c => c.classList.remove('active'));
          const clueEl = document.getElementById('clue-' + w.number + '-' + w.direction);
          if (clueEl) clueEl.classList.add('active');
          bannerLabel.textContent = w.number + ' ' + w.direction.toUpperCase() + ' (' + w.word.length + ' letters):';
          bannerText.textContent = w.clue;
          highlightWord(w);
          moveTo(w.startRow, w.startCol);
        }

        let currentActiveWord = null;
        function highlightWord(w) {
          currentActiveWord = w;
          document.querySelectorAll('.cw-cell').forEach(c => c.classList.remove('highlight'));
          const dr = w.direction === 'down' ? 1 : 0;
          const dc = w.direction === 'across' ? 1 : 0;
          for (let i = 0; i < w.word.length; i++) {
            const cell = document.getElementById('cell-' + (w.startRow + dr * i) + '-' + (w.startCol + dc * i));
            if (cell) cell.classList.add('highlight');
          }
        }

        function highlightWordForCell(w) { if (w) highlightWord(w); }
        function moveTo(r, c) {
          const nextInput = document.querySelector('input[data-r="' + r + '"][data-c="' + c + '"]');
          if (nextInput) nextInput.focus();
        }
        function moveToNext(r, c) {
          if (!currentActiveWord) return;
          const dr = currentActiveWord.direction === 'down' ? 1 : 0;
          const dc = currentActiveWord.direction === 'across' ? 1 : 0;
          moveTo(r + dr, c + dc);
        }
        function moveToPrev(r, c) {
          if (!currentActiveWord) return;
          const dr = currentActiveWord.direction === 'down' ? 1 : 0;
          const dc = currentActiveWord.direction === 'across' ? 1 : 0;
          moveTo(r - dr, c - dc);
        }

        document.getElementById('check-btn').onclick = () => {
          let solvedWords = 0;
          SPEC.words.forEach(w => {
            const dr = w.direction === 'down' ? 1 : 0;
            const dc = w.direction === 'across' ? 1 : 0;
            let wordCorrect = true;
            for (let i = 0; i < w.word.length; i++) {
              const r = w.startRow + dr * i;
              const c = w.startCol + dc * i;
              const inp = document.querySelector('input[data-r="' + r + '"][data-c="' + c + '"]');
              const cell = document.getElementById('cell-' + r + '-' + c);
              if (inp) {
                if (inp.value.toUpperCase() === w.word[i]) {
                  cell.classList.add('correct'); cell.classList.remove('wrong');
                } else {
                  cell.classList.add('wrong'); cell.classList.remove('correct'); wordCorrect = false;
                }
              }
            }
            if (wordCorrect) solvedWords++;
          });
          progress.textContent = solvedWords + ' / ' + SPEC.words.length + ' Solved';
        };

        document.getElementById('reveal-btn').onclick = () => {
          SPEC.words.forEach(w => {
            const dr = w.direction === 'down' ? 1 : 0;
            const dc = w.direction === 'across' ? 1 : 0;
            for (let i = 0; i < w.word.length; i++) {
              const inp = document.querySelector('input[data-r="' + (w.startRow + dr * i) + '"][data-c="' + (w.startCol + dc * i) + '"]');
              const cell = document.getElementById('cell-' + (w.startRow + dr * i) + '-' + (w.startCol + dc * i));
              if (inp) {
                inp.value = w.word[i];
                if (cell) { cell.classList.add('correct'); cell.classList.remove('wrong'); }
              }
            }
          });
          progress.textContent = SPEC.words.length + ' / ' + SPEC.words.length + ' Solved';
        };

        renderClues();
        if (SPEC.words[0]) focusWord(SPEC.words[0]);
      </script>
    </body></html>`;
  }

  // 3. TIMED MCQ QUIZ
  if (format.includes('quiz') || format.includes('assessment') || format.includes('exam')) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>${baseCss}
      .quiz-card { width: 100%; max-width: 640px; margin: 1rem 0; }
      .choice-btn { width: 100%; text-align: left; padding: 0.85rem 1.15rem; margin-bottom: 0.6rem; border-radius: 0.75rem; background: var(--card); border: 1.5px solid var(--border); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: space-between; font-size: 0.9rem; transition: all 0.15s; }
      .choice-btn:hover { border-color: var(--primary); background: rgba(90,125,153,0.15); }
      .choice-btn.correct { background: rgba(16,185,129,0.2)!important; border-color: #10b981!important; color: #34d399!important; }
      .choice-btn.wrong { background: rgba(239,68,68,0.2)!important; border-color: #ef4444!important; color: #f87171!important; }
      .key-pill { font-size: 0.7rem; padding: 0.15rem 0.45rem; border-radius: 0.35rem; background: #21262E; color: #8E8E93; font-mono; }
    </style></head><body>
      <div id="app">
        <header id="app-header">
          <span class="badge" style="background:#5A7D99;color:white;">Timed Assessment Quiz</span>
          <h1 style="margin-top:0.25rem;">${title}</h1>
          <div style="display:flex;gap:0.75rem;justify-content:center;margin-top:0.5rem;">
            <span class="badge" id="q-counter">Question 1 of ${items.length}</span>
            <span class="badge" id="timer-badge" style="background:#ef4444;color:white;">45s</span>
            <span class="badge" id="score-badge" style="background:#10b981;color:white;">Score: 0</span>
          </div>
        </header>
        <main id="app-main" style="width:100%;display:flex;flex-direction:column;align-items:center;">
          <div class="card quiz-card text-left" id="q-card">
            <h3 id="q-text" style="font-size:1.15rem;font-weight:700;color:#fff;margin-bottom:1rem;line-height:1.4;"></h3>
            <div id="choices-box"></div>
            <div id="exp-box" style="display:none;margin-top:1rem;padding:0.75rem;border-radius:0.5rem;background:#131519;border:1px solid #282E38;font-size:0.85rem;color:#8E8E93;line-height:1.5;"></div>
          </div>
          <div id="summary-card" class="card text-center" style="display:none;width:100%;max-width:540px;padding:2rem;">
            <h2 style="font-size:1.5rem;font-weight:800;color:#10b981;margin-bottom:0.5rem;">Assessment Complete!</h2>
            <p id="final-score" style="font-size:1.1rem;color:#fff;margin-bottom:1.5rem;"></p>
            <button class="btn btn-primary" onclick="restartQuiz()">Retake Quiz</button>
          </div>
        </main>
      </div>
      <script>
        const DATA = ${itemsJson};
        let qIdx = 0;
        let score = 0;
        let timer = 45;
        let tInt = null;
        let answered = false;

        function startTimer() {
          clearInterval(tInt);
          timer = 45;
          document.getElementById('timer-badge').textContent = timer + 's';
          tInt = setInterval(() => {
            timer--;
            document.getElementById('timer-badge').textContent = timer + 's';
            if (timer <= 0) {
              clearInterval(tInt);
              if (!answered) handleChoice('');
            }
          }, 1000);
        }

        function renderQ() {
          if (qIdx >= DATA.length) {
            clearInterval(tInt);
            document.getElementById('q-card').style.display = 'none';
            document.getElementById('summary-card').style.display = 'block';
            document.getElementById('final-score').textContent = 'Your Final Score: ' + score + ' / ' + DATA.length + ' (' + Math.round((score / DATA.length) * 100) + '%)';
            return;
          }

          answered = false;
          const it = DATA[qIdx];
          document.getElementById('q-counter').textContent = 'Question ' + (qIdx + 1) + ' of ' + DATA.length;
          document.getElementById('score-badge').textContent = 'Score: ' + score;
          document.getElementById('q-text').textContent = it.question || it.front || ('What is the key mechanism of ' + (it.concept || it.term || 'this topic') + '?');
          
          const exp = document.getElementById('exp-box');
          exp.style.display = 'none';
          exp.textContent = 'Key Concept: ' + (it.explanation || it.back || 'Correct concept verified.');

          const cBox = document.getElementById('choices-box');
          cBox.innerHTML = '';
          const correct = it.back || it.answer || it.definition || 'Correct concept';
          const distractors = ['Alternative mechanism X', 'Opposing process Y', 'Unrelated distractor Z'];
          const options = [correct, ...distractors].sort(() => Math.random() - 0.5);

          options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.innerHTML = '<span>' + opt + '</span><span class="key-pill">Key ' + (idx + 1) + '</span>';
            btn.onclick = () => handleChoice(opt, correct, btn);
            cBox.appendChild(btn);
          });

          startTimer();
        }

        function handleChoice(chosen, correct, btn) {
          if (answered) return;
          answered = true;
          clearInterval(tInt);
          document.getElementById('exp-box').style.display = 'block';

          if (chosen === correct) {
            if (btn) btn.classList.add('correct');
            score++;
            document.getElementById('score-badge').textContent = 'Score: ' + score;
          } else {
            if (btn) btn.classList.add('wrong');
            document.querySelectorAll('.choice-btn').forEach(b => {
              if (b.innerText.includes(correct)) b.classList.add('correct');
            });
          }

          setTimeout(() => {
            qIdx++;
            renderQ();
          }, 1400);
        }

        function restartQuiz() {
          qIdx = 0;
          score = 0;
          document.getElementById('q-card').style.display = 'block';
          document.getElementById('summary-card').style.display = 'none';
          renderQ();
        }

        window.addEventListener('keydown', (e) => {
          if (['1','2','3','4'].includes(e.key)) {
            const btns = document.querySelectorAll('.choice-btn');
            const idx = parseInt(e.key, 10) - 1;
            if (btns[idx]) btns[idx].click();
          }
        });

        renderQ();
      </script>
    </body></html>`;
  }

  // 4. CLOZE DELETION / ACTIVE RECALL BLURTING
  if (format.includes('cloze') || format.includes('blurt') || format.includes('fill') || format.includes('gap')) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>${baseCss}
      .cloze-box { padding: 1.5rem; background: var(--card); border: 1px solid var(--border); border-radius: 1rem; width: 100%; max-width: 600px; margin: 1rem 0; }
      .occlusion-mask { display: inline-block; padding: 0.2rem 0.75rem; border-radius: 0.35rem; background: #5A7D99; color: transparent; cursor: pointer; user-select: none; font-weight: 700; transition: all 0.2s; }
      .occlusion-mask.revealed { background: rgba(16,185,129,0.2); color: #34d399; border: 1px solid #10b981; }
    </style></head><body>
      <div id="app">
        <header id="app-header">
          <span class="badge" style="background:#5A7D99;color:white;">Cloze Deletion Blurter</span>
          <h1 style="margin-top:0.25rem;">${title}</h1>
          <p>Click any hidden blurting mask to test your active recall</p>
        </header>
        <main id="app-main" style="width:100%;display:flex;flex-direction:column;align-items:center;">
          <div class="cloze-box text-left" id="cloze-list"></div>
          <div style="display:flex;gap:0.5rem;margin-top:1rem;">
            <button class="btn btn-primary" onclick="toggleAllMasks(true)">Reveal All</button>
            <button class="btn btn-secondary" onclick="toggleAllMasks(false)">Hide All</button>
          </div>
        </main>
      </div>
      <script>
        const DATA = ${itemsJson};
        const box = document.getElementById('cloze-list');
        DATA.forEach((it, i) => {
          const div = document.createElement('div');
          div.style.marginBottom = '1.25rem';
          div.style.lineHeight = '1.7';
          const term = it.front || it.concept || it.word || ('Term ' + (i+1));
          const def = it.back || it.definition || it.explanation || 'Key definition details.';
          div.innerHTML = '<strong style="color:#5A7D99;">' + (i+1) + '. ' + term + ':</strong> ' +
            def.replace(new RegExp(term, 'gi'), '<span class="occlusion-mask" onclick="this.classList.toggle(\\'revealed\\')">' + term + '</span>') +
            ' <span class="occlusion-mask" onclick="this.classList.toggle(\\'revealed\\')">' + (it.clue || 'Key Mechanism') + '</span>';
          box.appendChild(div);
        });

        function toggleAllMasks(show) {
          document.querySelectorAll('.occlusion-mask').forEach(m => m.classList.toggle('revealed', show));
        }
      </script>
    </body></html>`;
  }

  // 5. SPATIAL MEMORY PALACE & MNEMONIC LOCI JOURNEY
  if (format.includes('memory') || format.includes('palace') || format.includes('loci') || format.includes('mnemonic')) {
    const LOCI_ROOMS = [
      { name: 'Grand Foyer & Entrance', icon: '', color: '#6366f1' },
      { name: 'The Master Library', icon: '', color: '#38bdf8' },
      { name: 'Sunlit Botany Atrium', icon: '', color: '#10b981' },
      { name: 'Central Chemistry Lab', icon: '', color: '#f59e0b' },
      { name: 'High Observation Tower', icon: '', color: '#ec4899' },
      { name: 'Vault of Deep Memory', icon: '', color: '#8b5cf6' }
    ];

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>${baseCss}
      .mp-station-card { width: 100%; max-width: 680px; margin: 1rem 0; background: var(--card); border: 1.5px solid var(--border); border-radius: 1.25rem; padding: 1.75rem; text-align: left; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
      .loci-badge { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.3rem 0.75rem; border-radius: 9999px; font-size: 0.8rem; font-weight: 700; background: rgba(99,102,241,0.15); color: #818cf8; border: 1px solid rgba(99,102,241,0.3); margin-bottom: 1rem; }
      .anchor-object { font-size: 1.3rem; font-weight: 800; color: #fff; margin-bottom: 0.5rem; line-height: 1.4; }
      .mnemonic-scene { background: rgba(255,255,255,0.03); border: 1px dashed var(--border); border-radius: 0.75rem; padding: 1.25rem; margin: 1rem 0; font-size: 0.95rem; line-height: 1.7; color: #e2e8f0; }
      .concept-box { background: var(--muted); border-radius: 0.75rem; padding: 1rem; margin-top: 1rem; font-size: 0.875rem; line-height: 1.6; }
      .station-nav { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; margin-bottom: 1.25rem; }
      .station-pill { padding: 0.4rem 0.8rem; border-radius: 0.5rem; background: var(--card); border: 1px solid var(--border); color: var(--muted-foreground); cursor: pointer; font-size: 0.75rem; font-weight: 600; transition: all 0.15s; }
      .station-pill.active { background: #5A7D99; color: #fff; border-color: #5A7D99; }
    </style></head><body>
      <div id="app">
        <header id="app-header">
          <span class="badge" style="background:#6366f1;color:white;">Spatial Memory Palace</span>
          <h1 style="margin-top:0.35rem;">${title}</h1>
          <p>Walk through your cognitive palace and anchor key exam mechanisms to spatial memory loci</p>
        </header>
        <main id="app-main" style="width:100%;display:flex;flex-direction:column;align-items:center;">
          <div class="station-nav" id="station-pills"></div>
          <div class="mp-station-card" id="station-content"></div>
          <div style="display:flex;gap:0.75rem;margin-top:1rem;">
            <button class="btn btn-secondary" id="mp-prev">← Previous Locus</button>
            <button class="btn btn-primary" id="mp-test-toggle">Active Recall Walk</button>
            <button class="btn btn-secondary" id="mp-next">Next Locus →</button>
          </div>
        </main>
      </div>
      <script>
        const DATA = ${itemsJson};
        const ROOMS = ${JSON.stringify(LOCI_ROOMS)};
        let stIdx = 0;
        let testMode = false;

        function render() {
          if (!DATA.length) return;
          const pills = document.getElementById('station-pills');
          pills.innerHTML = '';
          DATA.forEach((_, i) => {
            const btn = document.createElement('button');
            btn.className = 'station-pill' + (i === stIdx ? ' active' : '');
            btn.textContent = 'Room ' + (i + 1);
            btn.onclick = () => { stIdx = i; render(); };
            pills.appendChild(btn);
          });

          const it = DATA[stIdx] || {};
          const room = ROOMS[stIdx % ROOMS.length];
          const concept = it.front || it.concept || it.term || it.title || ('Station ' + (stIdx + 1));
          const def = it.back || it.definition || it.explanation || it.detail || 'Master explanation.';
          const box = document.getElementById('station-content');

          if (testMode) {
            box.innerHTML =
              '<div class="loci-badge">' + room.name + '</div>' +
              '<h2 class="anchor-object">Locus Station ' + (stIdx + 1) + ': What concept lives here?</h2>' +
              '<p class="muted" style="margin-bottom:1rem;">Visualize this room and test your active spatial recall:</p>' +
              '<div style="margin-bottom:1rem;"><input id="test-inp" placeholder="Type your answer here..." style="width:100%;padding:0.75rem;border-radius:0.5rem;background:#131519;border:1px solid var(--border);color:#fff;font-size:0.9rem;" /></div>' +
              '<button class="btn btn-primary w-full" onclick="checkTestAnswer()">Check Answer</button>' +
              '<div id="test-fb" style="display:none;margin-top:1rem;padding:0.75rem;border-radius:0.5rem;background:var(--muted);font-size:0.875rem;"></div>';
          } else {
            box.innerHTML =
              '<div class="loci-badge">' + room.name + '</div>' +
              '<h2 class="anchor-object">' + concept + '</h2>' +
              '<div class="mnemonic-scene">' +
                '<strong style="color:#38bdf8;">Mnemonic Visualization:</strong><br>' +
                'Imagine stepping into <strong>' + room.name + '</strong>. Anchored in the center is a dramatic, unforgettable visual metaphor for <em>' + concept + '</em>. Observe its distinctive shape, moving parts, and energetic flow.' +
              '</div>' +
              '<div class="concept-box">' +
                '<strong style="color:#5A7D99;">Core Academic Mechanism:</strong><br>' + def +
              '</div>';
          }
        }

        window.checkTestAnswer = function() {
          const it = DATA[stIdx] || {};
          const ans = (it.front || it.concept || '').toLowerCase();
          const inp = (document.getElementById('test-inp').value || '').toLowerCase().trim();
          const fb = document.getElementById('test-fb');
          fb.style.display = 'block';
          if (inp && (ans.includes(inp) || inp.includes(ans))) {
            fb.innerHTML = '<strong style="color:#10b981;">Correct:</strong> You accurately recalled: <em>' + (it.front || it.concept) + '</em><br><br>' + (it.back || it.explanation);
          } else {
            fb.innerHTML = '<strong style="color:#f59e0b;">Solution:</strong> <em>' + (it.front || it.concept) + '</em><br><br>' + (it.back || it.explanation);
          }
        };

        document.getElementById('mp-prev').onclick = () => { stIdx = (stIdx - 1 + DATA.length) % DATA.length; render(); };
        document.getElementById('mp-next').onclick = () => { stIdx = (stIdx + 1) % DATA.length; render(); };
        document.getElementById('mp-test-toggle').onclick = () => {
          testMode = !testMode;
          document.getElementById('mp-test-toggle').textContent = testMode ? 'Palace Walk' : 'Active Recall Walk';
          render();
        };

        render();
      </script>
    </body></html>`;
  }

  // 6. FEYNMAN ACTIVE RECALL & EXPLANATION GRADER
  if (format.includes('feynman') || format.includes('grader')) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>${baseCss}
      .feynman-box { width: 100%; max-width: 680px; margin: 1rem 0; background: var(--card); border: 1px solid var(--border); border-radius: 1rem; padding: 1.5rem; text-align: left; }
    </style></head><body>
      <div id="app">
        <header id="app-header">
          <span class="badge" style="background:#5A7D99;color:white;">Feynman Active Recall Grader</span>
          <h1 style="margin-top:0.35rem;">${title}</h1>
          <p>Explain the concept in your own words. The engine grades your conceptual completeness.</p>
          <span id="app-progress" class="badge" style="margin-top:0.5rem;">Concept 1 of ${items.length}</span>
        </header>
        <main id="app-main" style="width:100%;display:flex;flex-direction:column;align-items:center;">
          <div class="feynman-box">
            <h2 id="f-title" style="font-size:1.2rem;font-weight:700;margin-bottom:0.5rem;color:#fff;"></h2>
            <p id="f-prompt" class="muted" style="font-size:0.875rem;margin-bottom:1rem;"></p>
            <textarea id="f-input" rows="4" placeholder="Type or dictate your explanation in simple terms..." style="width:100%;padding:0.75rem;border-radius:0.5rem;background:#131519;border:1px solid var(--border);color:#fff;font-size:0.875rem;resize:vertical;"></textarea>
            <div style="display:flex;gap:0.5rem;margin-top:0.75rem;">
              <button class="btn btn-primary w-full" id="f-grade-btn">Evaluate Explanation</button>
              <button class="btn btn-secondary" id="f-model-btn" style="white-space:nowrap;">Model Answer</button>
            </div>
            <div id="f-feedback" class="card" style="display:none;margin-top:1rem;background:var(--muted);">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
                <h4 style="font-weight:700;font-size:0.95rem;color:#fff;">Assessment</h4>
                <span id="f-score" style="font-weight:800;color:#10b981;"></span>
              </div>
              <div id="f-checklist" style="display:grid;gap:0.35rem;font-size:0.82rem;margin-bottom:0.75rem;"></div>
              <div id="f-model-box" style="display:none;padding:0.65rem;border-radius:0.5rem;background:rgba(90,125,153,0.15);border:1px solid rgba(90,125,153,0.3);font-size:0.82rem;">
                <strong style="color:#5A7D99;">Exemplar Explanation:</strong> <span id="f-model-text"></span>
              </div>
            </div>
          </div>
          <div style="display:flex;gap:0.5rem;margin-top:0.75rem;">
            <button class="btn btn-secondary" id="f-prev">← Previous</button>
            <button class="btn btn-secondary" id="f-next">Next Concept →</button>
          </div>
        </main>
      </div>
      <script>
        const DATA = ${itemsJson};
        let fIdx = 0;
        const fTitle = document.getElementById('f-title');
        const fPrompt = document.getElementById('f-prompt');
        const fInput = document.getElementById('f-input');
        const fFeedback = document.getElementById('f-feedback');
        const fScore = document.getElementById('f-score');
        const fChecklist = document.getElementById('f-checklist');
        const fModelBox = document.getElementById('f-model-box');
        const fModelText = document.getElementById('f-model-text');
        const progress = document.getElementById('app-progress');

        function render() {
          if (!DATA.length) return;
          const it = DATA[fIdx] || {};
          progress.textContent = 'Concept ' + (fIdx + 1) + ' of ' + DATA.length;
          fTitle.textContent = it.front || it.concept || it.term || ('Concept ' + (fIdx + 1));
          fPrompt.textContent = it.prompt || ('Explain the core mechanism, function, and exam significance of ' + (it.front || it.concept || 'this topic') + ':');
          fInput.value = '';
          fFeedback.style.display = 'none';
          fModelBox.style.display = 'none';
        }

        document.getElementById('f-grade-btn').onclick = () => {
          const it = DATA[fIdx] || {};
          const text = fInput.value.trim().toLowerCase();
          if (!text) { alert('Please type an explanation first!'); return; }
          const def = it.back || it.definition || it.explanation || '';
          const keyWords = (it.keyPoints || def.split('.')).map(s => String(s).trim()).filter(s => s.length > 5);
          let hits = 0;
          fChecklist.innerHTML = '';
          keyWords.forEach(kw => {
            const match = kw.toLowerCase().split(/\\s+/).some(w => w.length > 3 && text.includes(w));
            if (match) hits++;
            const row = document.createElement('div');
            row.innerHTML = (match ? '<span style="color:#10b981;font-weight:700;">✓</span> ' : '<span style="color:#f59e0b;font-weight:700;">•</span> ') + kw;
            fChecklist.appendChild(row);
          });
          const pct = Math.round((hits / Math.max(keyWords.length, 1)) * 100);
          fScore.textContent = pct + '% Mastery';
          fModelText.textContent = def;
          fFeedback.style.display = 'block';
        };

        document.getElementById('f-model-btn').onclick = () => {
          fModelBox.style.display = fModelBox.style.display === 'none' ? 'block' : 'none';
        };

        document.getElementById('f-prev').onclick = () => { fIdx = (fIdx - 1 + DATA.length) % DATA.length; render(); };
        document.getElementById('f-next').onclick = () => { fIdx = (fIdx + 1) % DATA.length; render(); };

        render();
      </script>
    </body></html>`;
  }

  // 7. CHRONOLOGICAL TIMELINE & DRAG-AND-DROP SEQUENCE ORDERING
  if (format.includes('timeline') || format.includes('chronol') || format.includes('ordering') || format.includes('sequence') || format.includes('drag')) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>${baseCss}
      .timeline-track-container { position: relative; padding-left: 2.25rem; width: 100%; max-width: 760px; margin: 0 auto; }
      .timeline-vertical-spine { position: absolute; left: 1rem; top: 1rem; bottom: 1rem; width: 2.5px; background: linear-gradient(to bottom, var(--primary), #3D6660, #10b981); opacity: 0.35; border-radius: 2px; }
      .timeline-slot { position: relative; margin-bottom: 0.85rem; }
      .timeline-slot-node { position: absolute; left: -2.25rem; top: 1.15rem; width: 14px; height: 14px; border-radius: 50%; background: var(--background); border: 2.5px solid var(--primary); z-index: 2; transition: all 0.2s; }
      .timeline-slot-node.locked { border-color: #10b981; background: #10b981; box-shadow: 0 0 8px rgba(16,185,129,0.5); }
      .timeline-card { background: var(--card); border: 1.5px solid var(--border); border-radius: 0.85rem; padding: 0.95rem 1.15rem; cursor: grab; user-select: none; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); display: flex; align-items: center; gap: 0.85rem; position: relative; box-shadow: 0 2px 6px rgba(0,0,0,0.15); }
      .timeline-card:hover { border-color: rgba(90,125,153,0.6); transform: translateY(-1px); }
      .timeline-card:active { cursor: grabbing; border-color: var(--primary); }
      .timeline-card.dragging { opacity: 0.35; border: 2px dashed var(--primary); transform: scale(0.98); }
      .timeline-card.correct-order { border-color: #10b981; background: rgba(16,185,129,0.08); box-shadow: 0 0 12px rgba(16,185,129,0.15); }
      .timeline-card.wrong-order { border-color: #ef4444; background: rgba(239,68,68,0.08); }
      .drag-handle { color: #8E8E93; font-size: 1.25rem; cursor: grab; padding: 0 0.2rem; flex-shrink: 0; }
      .order-pill { width: 28px; height: 28px; border-radius: 50%; background: var(--muted); border: 1.5px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800; color: var(--primary); flex-shrink: 0; }
      .move-btn { background: #21262E; border: 1px solid var(--border); color: #CDD1D6; border-radius: 0.35rem; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 0.7rem; transition: all 0.15s; }
      .move-btn:hover { background: var(--primary); color: #fff; border-color: var(--primary); }
      .progress-bar-wrap { width: 100%; max-width: 680px; margin: 0.5rem auto 0 auto; }
      .progress-track { height: 6px; width: 100%; background: rgba(255,255,255,0.08); border-radius: 999px; overflow: hidden; }
      .progress-fill { height: 100%; width: 0%; background: linear-gradient(90deg, #5A7D99, #10b981); transition: width 0.4s ease; border-radius: 999px; }
    </style></head><body>
      <div id="app">
        <header id="app-header">
          <div style="display:flex;align-items:center;gap:0.5rem;justify-content:center;">
            <span class="badge" style="background:#5A7D99;color:white;">Chronological Timeline Challenge</span>
          </div>
          <h1 style="margin-top:0.35rem;">${title}</h1>
          <p>${description}</p>
          
          <div class="progress-bar-wrap">
            <div class="progress-track">
              <div id="prog-fill" class="progress-fill"></div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.75rem;color:#8E8E93;margin-top:0.4rem;font-weight:600;">
              <span id="prog-count">0 / ${Math.max(items.length, 5)} Events Correct</span>
              <span id="prog-pct" style="color:var(--primary);">0% Accuracy</span>
            </div>
          </div>
        </header>

        <main id="app-main" style="width:100%;display:flex;flex-direction:column;align-items:center;padding-bottom:2rem;">
          <div style="display:flex;gap:0.5rem;justify-content:center;margin-bottom:1.25rem;flex-wrap:wrap;">
            <button class="btn btn-primary" id="btn-check-order">Verify Chronological Order</button>
            <button class="btn btn-secondary" id="btn-shuffle-order">Scramble Sequence</button>
            <button class="btn btn-secondary" id="btn-reveal-timeline">Chronological Story View</button>
          </div>

          <div id="order-feedback" class="card text-center" style="display:none;margin-bottom:1.25rem;padding:0.85rem 1.25rem;width:100%;max-width:760px;border-radius:0.75rem;"></div>

          <div class="timeline-track-container">
            <div class="timeline-vertical-spine"></div>
            <div id="timeline-slots-container" style="display:grid;gap:0.25rem;"></div>
          </div>
        </main>
      </div>

      <script>
        const RAW_DATA = ${itemsJson};
        const ORIGINAL = (RAW_DATA.length > 0 ? RAW_DATA : [
          { text: 'Founding of the Roman Republic', position: 1, detail: 'Overthrow of the Roman Kingdom and establishment of the senatorial republic (509 BC).' },
          { text: 'Julius Caesar Crosses the Rubicon', position: 2, detail: 'Defiance of the Senate ignites the Great Roman Civil War (49 BC).' },
          { text: 'Pax Romana Established by Augustus', position: 3, detail: 'First Roman Emperor ushers in 200 years of imperial peace and stability (27 BC).' },
          { text: 'Edict of Milan by Constantine', position: 4, detail: 'Legalization and state toleration of Christianity across the Empire (313 AD).' },
          { text: 'Fall of the Western Roman Empire', position: 5, detail: 'Deposition of Emperor Romulus Augustulus by Odoacer (476 AD).' }
        ]).map((it, idx) => ({
          id: it.id || String(idx + 1),
          text: it.text || it.title || it.front || it.concept || ('Event ' + (idx + 1)),
          detail: it.detail || it.back || it.explanation || it.definition || '',
          correctPosition: it.position || (idx + 1)
        }));

        let currentList = [...ORIGINAL].sort(() => Math.random() - 0.5);
        let isChronologicalView = false;
        const container = document.getElementById('timeline-slots-container');
        const fbEl = document.getElementById('order-feedback');
        const progFill = document.getElementById('prog-fill');
        const progCount = document.getElementById('prog-count');
        const progPct = document.getElementById('prog-pct');

        function updateProgress(correctCount) {
          const total = currentList.length;
          const pct = Math.round((correctCount / total) * 100);
          progFill.style.width = pct + '%';
          progCount.textContent = correctCount + ' / ' + total + ' Events Placed Correctly';
          progPct.textContent = pct + '% Accuracy';
        }

        function render() {
          container.innerHTML = '';
          currentList.forEach((item, index) => {
            const slot = document.createElement('div');
            slot.className = 'timeline-slot';

            const node = document.createElement('div');
            node.className = 'timeline-slot-node';
            node.id = 'node-' + index;

            const card = document.createElement('div');
            card.className = 'timeline-card';
            card.draggable = !isChronologicalView;
            card.dataset.index = index;

            card.innerHTML = 
              '<span class="drag-handle" title="Drag to rearrange">⠿</span>' +
              '<div class="order-pill">' + (index + 1) + '</div>' +
              '<div style="flex:1;min-width:0;">' +
                '<h3 style="font-weight:700;font-size:0.95rem;color:var(--foreground);margin-bottom:0.25rem;line-height:1.4;">' + item.text + '</h3>' +
                '<p class="muted" style="font-size:0.825rem;line-height:1.5;margin:0;">' + item.detail + '</p>' +
              '</div>' +
              (!isChronologicalView ? (
                '<div style="display:flex;flex-direction:column;gap:0.25rem;flex-shrink:0;">' +
                  '<button class="move-btn" onclick="moveItem(' + index + ', -1)" title="Move earlier in timeline">▲</button>' +
                  '<button class="move-btn" onclick="moveItem(' + index + ', 1)" title="Move later in timeline">▼</button>' +
                '</div>'
              ) : '');

            card.addEventListener('dragstart', (e) => {
              card.classList.add('dragging');
              e.dataTransfer.setData('text/plain', index);
            });
            card.addEventListener('dragend', () => card.classList.remove('dragging'));
            card.addEventListener('dragover', (e) => {
              e.preventDefault();
              const dragging = document.querySelector('.dragging');
              if (dragging && dragging !== card) {
                const targetIdx = parseInt(card.dataset.index, 10);
                const dragIdx = parseInt(dragging.dataset.index, 10);
                if (targetIdx !== dragIdx) {
                  const moved = currentList.splice(dragIdx, 1)[0];
                  currentList.splice(targetIdx, 0, moved);
                  render();
                }
              }
            });

            slot.appendChild(node);
            slot.appendChild(card);
            container.appendChild(slot);
          });
        }

        window.moveItem = function(fromIdx, dir) {
          const toIdx = fromIdx + dir;
          if (toIdx < 0 || toIdx >= currentList.length) return;
          const temp = currentList[fromIdx];
          currentList[fromIdx] = currentList[toIdx];
          currentList[toIdx] = temp;
          fbEl.style.display = 'none';
          render();
        };

        document.getElementById('btn-check-order').onclick = () => {
          let correctCount = 0;
          const cards = container.querySelectorAll('.timeline-card');
          currentList.forEach((item, i) => {
            const expected = ORIGINAL[i];
            const isMatch = item.text === expected.text;
            if (isMatch) correctCount++;
            if (cards[i]) {
              cards[i].classList.remove('correct-order', 'wrong-order');
              cards[i].classList.add(isMatch ? 'correct-order' : 'wrong-order');
            }
            const node = document.getElementById('node-' + i);
            if (node) {
              node.classList.toggle('locked', isMatch);
            }
          });

          updateProgress(correctCount);
          fbEl.style.display = 'block';
          if (correctCount === currentList.length) {
            fbEl.innerHTML = '<strong style="color:#10b981;font-size:1.05rem;">Flawless Sequence! (100%)</strong><br><span class="muted text-xs">All milestones are positioned in true chronological sequence from earliest to latest.</span>';
          } else {
            fbEl.innerHTML = '<strong style="color:#f59e0b;font-size:0.95rem;">' + correctCount + ' / ' + currentList.length + ' Milestones in Correct Chronological Order</strong><br><span class="muted text-xs">Review highlighted cards and adjust their sequence along the timeline spine.</span>';
          }
        };

        document.getElementById('btn-shuffle-order').onclick = () => {
          isChronologicalView = false;
          fbEl.style.display = 'none';
          currentList.sort(() => Math.random() - 0.5);
          updateProgress(0);
          render();
        };

        document.getElementById('btn-reveal-timeline').onclick = () => {
          isChronologicalView = true;
          fbEl.style.display = 'none';
          currentList = [...ORIGINAL];
          updateProgress(ORIGINAL.length);
          render();
          const cards = container.querySelectorAll('.timeline-card');
          cards.forEach(c => c.classList.add('correct-order'));
          document.querySelectorAll('.timeline-slot-node').forEach(n => n.classList.add('locked'));
        };

        render();
        updateProgress(0);
      </script>
    </body></html>`;
  }

  // 8. 3-IN-1 REVISION KIT DEFAULT
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>${baseCss}
    .tab-btn.active { background: #5A7D99; color: white; font-weight: 700; }
  </style></head><body>
    <div id="app">
      <header id="app-header">
        <span class="badge" style="background:#5A7D99;color:white;">3-in-1 Revision Kit</span>
        <h1 style="margin-top:0.25rem;">${title}</h1>
        <p>${description}</p>
        <div style="display:flex;justify-content:center;gap:0.5rem;margin-top:0.75rem;">
          <button class="btn btn-secondary tab-btn active" id="tab-notes">Cornell Notes</button>
          <button class="btn btn-secondary tab-btn" id="tab-cards">Flashcards</button>
        </div>
      </header>
      <main id="app-main" style="width:100%;max-width:700px;">
        <div id="view-notes" class="text-left" style="display:grid;gap:0.75rem;"></div>
        <div id="view-cards" class="text-center" style="display:none;">
          <div class="card" id="card-elem" style="min-height:220px;display:flex;flex-direction:column;justify-content:center;cursor:pointer;">
            <span class="badge" id="c-badge" style="margin:0 auto 0.5rem auto;">Front</span>
            <h2 id="c-text" style="font-size:1.15rem;font-weight:700;color:var(--foreground);"></h2>
          </div>
          <div style="display:flex;gap:0.5rem;margin-top:0.75rem;justify-content:center;">
            <button class="btn btn-secondary" id="c-prev">Prev</button>
            <button class="btn btn-primary" id="c-flip">Flip</button>
            <button class="btn btn-secondary" id="c-next">Next</button>
          </div>
        </div>
      </main>
    </div>
    <script>
      const DATA = ${itemsJson};
      let cIdx = 0;
      let cFlipped = false;
      const notesView = document.getElementById('view-notes');
      const cardsView = document.getElementById('view-cards');

      function showTab(t) {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        notesView.style.display = 'none'; cardsView.style.display = 'none';
        if (t === 'notes') {
          notesView.style.display = 'grid';
          document.getElementById('tab-notes').classList.add('active');
        } else {
          cardsView.style.display = 'block';
          document.getElementById('tab-cards').classList.add('active');
          renderCard();
        }
      }

      function renderNotes() {
        notesView.innerHTML = '';
        DATA.forEach((it, idx) => {
          const c = document.createElement('div');
          c.className = 'card';
          c.style.padding = '0.9rem 1.15rem';
          c.innerHTML = '<h3 style="font-weight:700;font-size:0.95rem;color:var(--foreground);margin-bottom:0.25rem;">' + (it.front || it.concept || ('Concept ' + (idx + 1))) + '</h3>' +
            '<p class="muted" style="font-size:0.85rem;line-height:1.5;margin:0;">' + (it.back || it.definition || it.explanation || 'Key notes and mechanism details.') + '</p>';
          notesView.appendChild(c);
        });
      }

      function renderCard() {
        if (!DATA.length) return;
        const it = DATA[cIdx] || {};
        cFlipped = false;
        document.getElementById('c-badge').textContent = 'Concept ' + (cIdx + 1) + ' of ' + DATA.length;
        document.getElementById('c-text').textContent = it.front || it.concept || it.term || 'Concept';
      }

      document.getElementById('card-elem').onclick = () => {
        if (!DATA.length) return;
        const it = DATA[cIdx] || {};
        cFlipped = !cFlipped;
        document.getElementById('c-text').textContent = cFlipped 
          ? (it.back || it.definition || it.explanation || 'Explanation')
          : (it.front || it.concept || it.term || 'Concept');
      };

      document.getElementById('c-flip').onclick = () => document.getElementById('card-elem').click();
      document.getElementById('c-prev').onclick = () => { cIdx = (cIdx - 1 + DATA.length) % DATA.length; renderCard(); };
      document.getElementById('c-next').onclick = () => { cIdx = (cIdx + 1) % DATA.length; renderCard(); };
      document.getElementById('tab-notes').onclick = () => showTab('notes');
      document.getElementById('tab-cards').onclick = () => showTab('cards');

      renderNotes();
      renderCard();
    </script>
  </body></html>`;
}
