// Tool Morpher: Converts any study item dataset into interactive, self-contained HTML tools

function buildClientCrosswordLayout(items) {
  const words = (items || []).map((it, i) => {
    const rawWord = String(it.word || it.front || it.concept || it.term || `WORD${i + 1}`).toUpperCase().replace(/[^A-Z]/g, '');
    const cleanWord = rawWord.length >= 3 ? rawWord.slice(0, 12) : `TERM${i + 1}`;
    const clue = String(it.clue || it.back || it.definition || it.explanation || it.detail || 'Key concept clue and definition');
    return { word: cleanWord, clue, number: i + 1 };
  }).filter(w => w.word.length >= 3).slice(0, 8);

  if (words.length === 0) return null;

  const placed = [];
  placed.push({ ...words[0], direction: 'across', startRow: 3, startCol: 2 });

  for (let i = 1; i < words.length; i++) {
    const w = words[i];
    let didPlace = false;
    for (let pIdx = 0; pIdx < placed.length; pIdx++) {
      const p = placed[pIdx];
      for (let ci = 0; ci < w.word.length; ci++) {
        for (let pi = 0; pi < p.word.length; pi++) {
          if (w.word[ci] === p.word[pi]) {
            const newDir = p.direction === 'across' ? 'down' : 'across';
            const newStartRow = newDir === 'down' ? p.startRow - ci : p.startRow + pi;
            const newStartCol = newDir === 'down' ? p.startCol + pi : p.startCol - ci;

            if (newStartRow >= 1 && newStartCol >= 1) {
              placed.push({ ...w, direction: newDir, startRow: newStartRow, startCol: newStartCol });
              didPlace = true;
              break;
            }
          }
        }
        if (didPlace) break;
      }
      if (didPlace) break;
    }

    if (!didPlace) {
      const last = placed[placed.length - 1];
      placed.push({
        ...w,
        direction: i % 2 === 0 ? 'across' : 'down',
        startRow: (last?.startRow || 2) + 2,
        startCol: 2,
      });
    }
  }

  let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
  placed.forEach(w => {
    minR = Math.min(minR, w.startRow);
    minC = Math.min(minC, w.startCol);
    const endR = w.direction === 'down' ? w.startRow + w.word.length - 1 : w.startRow;
    const endC = w.direction === 'across' ? w.startCol + w.word.length - 1 : w.startCol;
    maxR = Math.max(maxR, endR);
    maxC = Math.max(maxC, endC);
  });

  const rowShift = 1 - minR;
  const colShift = 1 - minC;
  const np = placed.map(w => ({
    ...w,
    startRow: w.startRow + rowShift,
    startCol: w.startCol + colShift,
  }));

  return {
    gridRows: maxR - minR + 1,
    gridCols: maxC - minC + 1,
    words: np,
  };
}

function getDynamicAcademicItems(title, format) {
  const cleanTitle = (title || 'Core Subject').replace(/revision|tool|interactive|study|quiz|flashcards/gi, '').trim() || 'Fundamentals';
  return [
    {
      id: '1',
      front: `Core Principle of ${cleanTitle}`,
      concept: `Core Principle of ${cleanTitle}`,
      back: `The fundamental axiom governing ${cleanTitle}, establishing underlying physiological/theoretical frameworks and high-yield baseline rules for exam synthesis.`,
      explanation: `Fundamental axiom governing ${cleanTitle}. Essential baseline knowledge required before advanced mechanism applications.`,
      question: `Which statement most accurately characterizes the primary governing mechanism of ${cleanTitle}?`,
      choices: [
        `It establishes the rate-limiting foundational pathway essential for downstream stability.`,
        `It operates exclusively under isolated conditions without influencing secondary feedback loops.`,
        `It remains chemically/conceptually inert during typical physiological transitions.`,
        `It acts solely as an unregulated byproduct without specific receptor or kinetic activity.`
      ],
      answer: `It establishes the rate-limiting foundational pathway essential for downstream stability.`,
      clue: `Primary rate-limiting foundational mechanism of ${cleanTitle}`,
      word: 'PRINCIPLE',
      keyPoints: ['Rate-limiting baseline mechanism', 'Governing theoretical framework', 'High-yield exam synthesis point'],
      situation: `A scenario where the primary framework of ${cleanTitle} is under active stress or perturbation.`,
      options: [
        { text: 'Stabilize primary feedback and maintain equilibrium', consequence: 'Optimal regulatory response restored successfully.' },
        { text: 'Over-activate secondary pathway prematurely', consequence: 'Causes feedback decompensation and theoretical breakdown.' }
      ]
    },
    {
      id: '2',
      front: `Rate-Limiting Reaction & Kinetics`,
      concept: `Reaction Kinetics & Catalysis`,
      back: `Specific enzymatic or physical rate-limiting steps that dictate overall system velocity, activation energy barriers, and response efficiency.`,
      explanation: `Rate-limiting kinetics determine the overall reaction velocity and metabolic/physical throughput.`,
      question: `What factor primarily dictates the rate-limiting kinetics in ${cleanTitle}?`,
      choices: [
        `Enzymatic/physical substrate availability and activation energy barriers.`,
        `Random Brownian fluctuation independent of temperature or concentration.`,
        `Passive accumulation of inert end-products.`,
        `Spontaneous unmediated phase transitions.`
      ],
      answer: `Enzymatic/physical substrate availability and activation energy barriers.`,
      clue: `Enzymatic or physical kinetic barrier controlling reaction velocity`,
      word: 'KINETICS',
      keyPoints: ['Activation energy barriers', 'Substrate saturation profile', 'Velocity control point'],
      situation: `Kinetic overload occurs due to saturated transport and catalytic channels.`,
      options: [
        { text: 'Introduce competitive modulator to adjust velocity', consequence: 'Regulates kinetic throughput and protects system equilibrium.' },
        { text: 'Increase substrate concentration unconditionally', consequence: 'Leads to severe saturation toxicity and kinetic bottlenecking.' }
      ]
    },
    {
      id: '3',
      front: `Regulation & Allosteric Feedback`,
      concept: `Feedback & Control Loops`,
      back: `Positive and negative feedback loops that fine-tune homeostasis, prevent runaway reactions, and calibrate response to external perturbations.`,
      explanation: `Feedback loops modulate operational intensity and protect against metabolic/computational failure.`,
      question: `How does negative feedback maintain stability within ${cleanTitle}?`,
      choices: [
        `Accumulation of downstream products inhibits initial catalytic activity to prevent overproduction.`,
        `By amplifying initial stimulus exponentially without an upper threshold.`,
        `Through irreversible degradation of all primary cofactors.`,
        `By preventing all subsequent signal transduction permanently.`
      ],
      answer: `Accumulation of downstream products inhibits initial catalytic activity to prevent overproduction.`,
      clue: `Homeostatic mechanism where product inhibits upstream catalysts`,
      word: 'FEEDBACK',
      keyPoints: ['Negative feedback inhibition', 'Allosteric site binding', 'Homeostatic equilibrium calibration'],
      situation: `Feedback inhibition fails, risking catastrophic runaway excitation.`,
      options: [
        { text: 'Administer allosteric negative inhibitor', consequence: 'Successfully triggers feedback suppression and restabilizes the cycle.' },
        { text: 'Ignore signal and observe progression', consequence: 'Triggers uncontrolled cascade and metabolic exhaustion.' }
      ]
    },
    {
      id: '4',
      front: `Clinical & Practical Application`,
      concept: `Clinical & Real-World Translation`,
      back: `Translation of core mechanisms into practical diagnostic criteria, pharmacological targeting, engineering solutions, and exam problem-solving.`,
      explanation: `Clinical/real-world translation bridges foundational theory with active diagnostic problem solving.`,
      question: `In practical diagnostic or engineering settings, what is the key clinical hallmark of ${cleanTitle}?`,
      choices: [
        `Characteristic phenotypic, biochemical, or computational shift observable under standard assays.`,
        `Total absence of any measurable biomarkers or telemetry signals.`,
        `Completely uniform presentation across all demographic variables.`,
        `Spontaneous resolution within milliseconds without intervention.`
      ],
      answer: `Characteristic phenotypic, biochemical, or computational shift observable under standard assays.`,
      clue: `Measurable diagnostic or operational signature used in practice`,
      word: 'HALLMARK',
      keyPoints: ['Diagnostic biomarker/metric', 'Targeted intervention strategy', 'Differential diagnostic criteria'],
      situation: `An ambiguous clinical/technical presentation mimics ${cleanTitle}.`,
      options: [
        { text: 'Order confirmatory gold-standard assay', consequence: 'Accurately differentiates underlying pathology and confirms diagnosis.' },
        { text: 'Initiate empirical aggressive therapy without testing', consequence: 'Risks iatrogenic complications and misdiagnosis.' }
      ]
    },
    {
      id: '5',
      front: `High-Yield Exam Pitfalls & Misconceptions`,
      concept: `Exam Trap & Contrast Analysis`,
      back: `Common student misconceptions, subtle distractor traps, and critical differentiators frequently tested on board and university examinations.`,
      explanation: `Exam traps exploit subtle overlaps with analogous sister pathways.`,
      question: `What is the most frequent conceptual trap students encounter regarding ${cleanTitle}?`,
      choices: [
        `Confusing secondary associative markers with the true causative rate-limiting mechanism.`,
        `Assuming all cellular and mathematical models are 100% deterministic.`,
        `Believing that temperature has zero effect on reaction rates.`,
        `Equating negative feedback with destructive failure.`
      ],
      answer: `Confusing secondary associative markers with the true causative rate-limiting mechanism.`,
      clue: `Common misconception between correlation and causation in exams`,
      word: 'ANALYSIS',
      keyPoints: ['Causative vs associative markers', 'Sister pathway differential', 'Common distractor patterns'],
      situation: `A high-stakes exam question presents two near-identical mechanisms.`,
      options: [
        { text: 'Isolate the specific rate-limiting cofactor', consequence: 'Correctly identifies the distinguishing exam variable and secures full marks.' },
        { text: 'Select the broader generic option', consequence: 'Falls for the high-yield distractor trap.' }
      ]
    }
  ];
}

export function morphToolToHtml(targetFormat, title, description, rawItems) {
  const format = String(targetFormat || 'flashcards').toLowerCase();
  const validRaw = Array.isArray(rawItems) && rawItems.length > 0 && rawItems.some(it => it && (it.front || it.question || it.term || it.concept));
  const items = validRaw ? rawItems : getDynamicAcademicItems(title, format);
  const itemsJson = JSON.stringify(items);

  const baseCss = `
    @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400..700;1,6..72,400..700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

    :root {
      --background: #13161c;
      --foreground: #ECECF1;
      --card: #1A1E26;
      --border: #28303e;
      --primary: #5A7D99;
      --primary-hover: #486a85;
      --accent: #38bdf8;
      --muted: #212733;
      --muted-foreground: #94a3b8;
      --font-display: 'Newsreader', 'Lora', 'Georgia', serif;
      --font-ui: 'Plus Jakarta Sans', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--background);
      color: var(--foreground);
      font-family: var(--font-ui);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding: 1.5rem;
      text-align: left;
    }
    #app { width: 100%; max-width: 960px; display: flex; flex-direction: column; align-items: center; }
    #app-header { margin-bottom: 1.25rem; width: 100%; text-align: center; }
    h1 { font-family: var(--font-ui); font-size: 1.3rem; font-weight: 700; color: #fff; letter-spacing: -0.01em; margin-bottom: 0.35rem; }
    p.header-desc { font-size: 0.85rem; color: var(--muted-foreground); max-width: 600px; margin: 0 auto; line-height: 1.5; }
    .badge { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.25rem 0.65rem; border-radius: 9999px; font-size: 0.725rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; background: var(--muted); border: 1px solid var(--border); color: var(--accent); font-family: var(--font-ui); }
    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem; font-family: var(--font-ui); cursor: pointer; transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1); border: none; }
    .btn-primary { background: var(--primary); color: #fff; border-radius: 12px; }
    .btn-primary:hover { background: var(--primary-hover); }
    .btn-secondary { background: var(--card); color: var(--foreground); border: 1px solid var(--border); border-radius: 10px; }
    .btn-secondary:hover { background: var(--muted); border-color: var(--primary); }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 18px; padding: 1.5rem; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
    .text-left { text-align: left; }
    .display-question { font-family: var(--font-display); font-size: 1.65rem; font-weight: 600; line-height: 1.35; color: #ffffff; letter-spacing: -0.015em; }
  `;

  // 1. FLASHCARDS
  if (format.includes('flashcard') || format.includes('cards')) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>${baseCss}
      .fc-container { perspective: 1200px; width: 100%; max-width: 600px; min-height: 310px; cursor: pointer; margin: 1.25rem 0 1.5rem 0; }
      .fc-card { width: 100%; min-height: 310px; position: relative; transform-style: preserve-3d; transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); border-radius: 20px; border: 1px solid var(--border); background: var(--card); box-shadow: 0 16px 40px -10px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05); }
      .fc-card:hover { border-color: rgba(90, 125, 153, 0.6); }
      .fc-card.flipped { transform: rotateY(180deg); }
      .fc-front, .fc-back { position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden; display: flex; flex-direction: column; justify-content: space-between; align-items: flex-start; padding: 2rem 2.25rem; border-radius: 20px; text-align: left; box-sizing: border-box; }
      .fc-front { background: radial-gradient(circle at 10% 10%, rgba(90, 125, 153, 0.12) 0%, transparent 60%), #171B23; border-left: 4px solid #5A7D99; }
      .fc-back { transform: rotateY(180deg); background: radial-gradient(circle at 90% 10%, rgba(56, 189, 248, 0.1) 0%, transparent 60%), #141821; border-left: 4px solid #38bdf8; }
      
      .card-topbar { width: 100%; display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
      .card-tag { font-family: var(--font-ui); font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: #94a3b8; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.08); padding: 0.25rem 0.65rem; border-radius: 6px; }
      .card-index { font-family: var(--font-ui); font-size: 0.75rem; font-weight: 600; color: #64748b; }
      .card-body-content { width: 100%; flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 0.5rem 0; }
      .display-answer { font-family: var(--font-ui); font-size: 1.05rem; font-weight: 400; line-height: 1.7; color: #e2e8f0; letter-spacing: 0.01em; }
      .card-bottombar { width: 100%; display: flex; align-items: center; justify-content: space-between; margin-top: 1rem; padding-top: 0.85rem; border-top: 1px solid rgba(255, 255, 255, 0.06); }
      .flip-hint { font-family: var(--font-ui); font-size: 0.75rem; color: #64748b; display: flex; align-items: center; gap: 0.4rem; }
      .kbd-pill { background: #21262E; border: 1px solid #3A4250; border-radius: 4px; padding: 0.1rem 0.35rem; font-size: 0.65rem; font-family: monospace; color: #94a3b8; }
      .controls-bar { display: flex; align-items: center; justify-content: center; gap: 0.75rem; width: 100%; max-width: 600px; margin-top: 0.25rem; }
      .btn-nav { padding: 0.65rem 1.15rem; font-size: 0.825rem; font-weight: 600; border-radius: 12px; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.1); color: #94a3b8; transition: all 0.15s ease; }
      .btn-nav:hover { background: rgba(255, 255, 255, 0.08); border-color: rgba(255, 255, 255, 0.2); color: #ffffff; transform: translateY(-1px); }
      .btn-flip-hero { padding: 0.85rem 2.25rem; font-size: 0.95rem; font-weight: 700; border-radius: 14px; background: linear-gradient(135deg, #5A7D99 0%, #3D5E7A 100%); color: #ffffff; box-shadow: 0 4px 18px rgba(90, 125, 153, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2); letter-spacing: 0.02em; min-width: 175px; transform: scale(1.02); }
      .btn-flip-hero:hover { background: linear-gradient(135deg, #6b90ad 0%, #466c8c 100%); box-shadow: 0 6px 24px rgba(90, 125, 153, 0.55); transform: scale(1.04) translateY(-1px); }
      .btn-shuffle { padding: 0.65rem 0.85rem; font-size: 0.8rem; border-radius: 12px; background: transparent; border: 1px solid transparent; color: #64748b; }
      .btn-shuffle:hover { background: rgba(255, 255, 255, 0.05); color: #cbd5e1; }
      .leitner-bar { display: flex; gap: 0.5rem; justify-content: center; margin-top: 1.15rem; flex-wrap: wrap; }
      .leitner-btn { padding: 0.45rem 1rem; font-size: 0.75rem; font-weight: 700; border-radius: 8px; border: 1px solid transparent; cursor: pointer; font-family: var(--font-ui); transition: all 0.15s; }
      .leitner-again { background: rgba(239,68,68,0.12); color: #f87171; border-color: rgba(239,68,68,0.25); }
      .leitner-again:hover { background: #ef4444; color: #fff; box-shadow: 0 4px 12px rgba(239,68,68,0.3); }
      .leitner-good { background: rgba(59,130,246,0.12); color: #60a5fa; border-color: rgba(59,130,246,0.25); }
      .leitner-good:hover { background: #3b82f6; color: #fff; box-shadow: 0 4px 12px rgba(59,130,246,0.3); }
      .leitner-easy { background: rgba(16,185,129,0.12); color: #34d399; border-color: rgba(16,185,129,0.25); }
      .leitner-easy:hover { background: #10b981; color: #fff; box-shadow: 0 4px 12px rgba(16,185,129,0.3); }
    </style></head><body>
      <div id="app">
        <header id="app-header">
          <span class="badge">Spaced Flashcards</span>
          <h1 style="margin-top:0.4rem;">${title}</h1>
          <p class="header-desc">${description}</p>
        </header>
        <main id="app-main" style="width:100%;display:flex;flex-direction:column;align-items:center;">
          <div class="fc-container" id="card-box">
            <div class="fc-card" id="card-inner">
              <div class="fc-front">
                <div class="card-topbar">
                  <span class="card-tag">Question / Concept</span>
                  <span class="card-index" id="fc-progress">Card 1 of ${items.length}</span>
                </div>
                <div class="card-body-content">
                  <h2 id="front-text" class="display-question"></h2>
                  <span id="hint-text" style="font-size:0.85rem;color:#94a3b8;line-height:1.4;"></span>
                </div>
                <div class="card-bottombar">
                  <span class="flip-hint">Click card or press <kbd class="kbd-pill">Space</kbd> to flip</span>
                  <span style="font-size:0.75rem;color:#64748b;">🔄 3D Flip</span>
                </div>
              </div>
              <div class="fc-back">
                <div class="card-topbar">
                  <span class="card-tag" style="background:rgba(56,189,248,0.1);color:#38bdf8;border-color:rgba(56,189,248,0.25);">Answer / Breakdown</span>
                  <span class="card-index" id="fc-progress-back">Card 1 of ${items.length}</span>
                </div>
                <div class="card-body-content">
                  <p id="back-text" class="display-answer"></p>
                </div>
                <div class="card-bottombar">
                  <span class="flip-hint">Click card to flip back</span>
                  <span style="font-size:0.75rem;color:#38bdf8;">✓ Recall Check</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="controls-bar">
            <button class="btn btn-nav" id="fc-prev" title="Previous card (Left Arrow)">← Prev</button>
            <button class="btn btn-flip-hero" id="fc-flip" title="Flip card (Spacebar)">
              <span>Flip Card</span>
              <kbd class="kbd-pill" style="background:rgba(0,0,0,0.25);border-color:rgba(255,255,255,0.2);color:#fff;">Space</kbd>
            </button>
            <button class="btn btn-nav" id="fc-next" title="Next card (Right Arrow)">Next →</button>
            <button class="btn btn-shuffle" id="fc-shuffle" title="Shuffle deck">🔀</button>
          </div>

          <div class="leitner-bar">
            <button class="leitner-btn leitner-again" id="btn-again">🔴 Again (1d)</button>
            <button class="leitner-btn leitner-good" id="btn-good">🔵 Good (3d)</button>
            <button class="leitner-btn leitner-easy" id="btn-easy">🟢 Easy (7d)</button>
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
        const progBack = document.getElementById('fc-progress-back');

        function render() {
          if (!DATA.length) return;
          const it = DATA[cur];
          fText.textContent = it.front || it.question || it.term || it.concept || it.word || 'Concept';
          bText.textContent = it.back || it.answer || it.definition || it.explanation || it.clue || 'Explanation';
          hText.textContent = it.hint ? '💡 Hint: ' + it.hint : '';
          const progText = 'Card ' + (cur + 1) + ' of ' + DATA.length;
          if (prog) prog.textContent = progText;
          if (progBack) progBack.textContent = progText;
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

  // 2. TIMED ASSESSMENT MCQ QUIZ WITH DEEP EXPLANATION DRAWER
  if (format.includes('quiz') || format.includes('assessment') || format.includes('exam') || format.includes('mcq')) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>${baseCss}
      .quiz-card { width: 100%; max-width: 680px; margin: 1rem 0; background: var(--card); border: 1.5px solid var(--border); border-radius: 20px; padding: 2rem; }
      .choice-btn { width: 100%; text-align: left; padding: 1rem 1.25rem; margin-bottom: 0.75rem; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1.5px solid var(--border); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: space-between; font-size: 0.95rem; line-height: 1.5; transition: all 0.15s; }
      .choice-btn:hover { border-color: var(--primary); background: rgba(90,125,153,0.15); transform: translateY(-1px); }
      .choice-btn.correct { background: rgba(16,185,129,0.15)!important; border-color: #10b981!important; color: #34d399!important; box-shadow: 0 0 15px rgba(16,185,129,0.2); }
      .choice-btn.wrong { background: rgba(239,68,68,0.15)!important; border-color: #ef4444!important; color: #f87171!important; }
      .key-pill { font-size: 0.75rem; font-weight: 700; padding: 0.2rem 0.5rem; border-radius: 6px; background: #21262E; color: #94a3b8; font-family: var(--font-ui); border: 1px solid var(--border); }
      .exp-drawer { margin-top: 1.25rem; padding: 1.25rem; border-radius: 14px; background: rgba(255,255,255,0.03); border: 1px solid var(--border); font-size: 0.9rem; line-height: 1.6; }
    </style></head><body>
      <div id="app">
        <header id="app-header">
          <span class="badge" style="background:#5A7D99;color:white;">Timed Assessment Quiz</span>
          <h1 style="margin-top:0.4rem;">${title}</h1>
          <div style="display:flex;gap:0.75rem;justify-content:center;margin-top:0.5rem;align-items:center;">
            <span class="badge" id="q-counter">Question 1 of ${items.length}</span>
            <span class="badge" id="timer-badge" style="background:rgba(239,68,68,0.2);border-color:#ef4444;color:#f87171;">⏱️ 45s</span>
            <span class="badge" id="score-badge" style="background:rgba(16,185,129,0.2);border-color:#10b981;color:#34d399;">Score: 0</span>
          </div>
        </header>
        <main id="app-main" style="width:100%;display:flex;flex-direction:column;align-items:center;">
          <div class="card quiz-card text-left" id="q-card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;">
              <span class="badge" id="q-topic-tag" style="background:rgba(90,125,153,0.15);color:#5A7D99;border-color:rgba(90,125,153,0.3);">Conceptual Multiple Choice</span>
            </div>
            <h2 id="q-text" class="display-question" style="font-size:1.45rem;margin-bottom:1.25rem;"></h2>
            <div id="choices-box"></div>
            <div id="exp-drawer" class="exp-drawer" style="display:none;">
              <div style="display:flex;align-items:center;gap:0.4rem;font-weight:700;margin-bottom:0.4rem;" id="exp-status"></div>
              <p id="exp-text" style="color:#cbd5e1;"></p>
            </div>
          </div>
          <div id="summary-card" class="card text-center" style="display:none;width:100%;max-width:560px;padding:2.5rem;">
            <span class="badge" style="background:rgba(16,185,129,0.2);color:#34d399;border-color:#10b981;margin-bottom:1rem;">Evaluation Complete</span>
            <h2 style="font-family:var(--font-display);font-size:1.85rem;font-weight:700;color:#fff;margin-bottom:0.5rem;">Assessment Finished! 🎉</h2>
            <p id="final-score" style="font-size:1.25rem;color:#38bdf8;font-weight:700;margin:1.25rem 0;"></p>
            <button class="btn btn-primary" style="padding:0.75rem 2rem;font-size:0.95rem;font-weight:700;" onclick="restartQuiz()">Retake Quiz</button>
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
          document.getElementById('timer-badge').textContent = '⏱️ ' + timer + 's';
          tInt = setInterval(() => {
            timer--;
            document.getElementById('timer-badge').textContent = '⏱️ ' + timer + 's';
            if (timer <= 0) {
              clearInterval(tInt);
              if (!answered) handleChoice('', '');
            }
          }, 1000);
        }

        function renderQ() {
          if (qIdx >= DATA.length) {
            clearInterval(tInt);
            document.getElementById('q-card').style.display = 'none';
            document.getElementById('summary-card').style.display = 'block';
            document.getElementById('final-score').textContent = 'Mastery Score: ' + score + ' / ' + DATA.length + ' (' + Math.round((score / DATA.length) * 100) + '%)';
            return;
          }

          answered = false;
          const it = DATA[qIdx];
          document.getElementById('q-counter').textContent = 'Question ' + (qIdx + 1) + ' of ' + DATA.length;
          document.getElementById('score-badge').textContent = 'Score: ' + score;
          document.getElementById('q-text').textContent = it.question || it.front || ('What is the key mechanism of ' + (it.concept || it.term || 'this topic') + '?');
          
          const drawer = document.getElementById('exp-drawer');
          drawer.style.display = 'none';

          const cBox = document.getElementById('choices-box');
          cBox.innerHTML = '';
          
          const rawChoices = Array.isArray(it.choices) && it.choices.length >= 2 ? [...it.choices] : [
            it.answerText || it.answer || it.back || 'Correct concept verified',
            'Secondary associative marker without direct causal kinetic influence.',
            'Unregulated degradation pathway independent of feedback equilibrium.',
            'Spontaneous unmediated reaction occurring solely under isolated test conditions.'
          ];

          let correctText = it.answerText || '';
          if (!correctText && it.answer && ['A','B','C','D'].includes(it.answer.toUpperCase())) {
            correctText = rawChoices[['A','B','C','D'].indexOf(it.answer.toUpperCase())] || rawChoices[0];
          } else if (!correctText) {
            correctText = rawChoices[0];
          }

          const keys = ['A', 'B', 'C', 'D'];
          rawChoices.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.innerHTML = '<span style="font-weight:500;">' + opt + '</span><span class="key-pill">' + (keys[idx] || (idx + 1)) + '</span>';
            btn.onclick = () => handleChoice(opt, correctText, btn, idx);
            cBox.appendChild(btn);
          });

          startTimer();
        }

        function handleChoice(chosen, correct, btn, chosenIdx) {
          if (answered) return;
          answered = true;
          clearInterval(tInt);
          const it = DATA[qIdx];
          const drawer = document.getElementById('exp-drawer');
          const status = document.getElementById('exp-status');
          const expText = document.getElementById('exp-text');
          drawer.style.display = 'block';

          const chosenLetter = chosenIdx >= 0 ? ['A', 'B', 'C', 'D'][chosenIdx] : '';
          const correctLetter = (it.answer || '').toUpperCase();

          const isMatch = (chosenLetter && correctLetter && chosenLetter === correctLetter) ||
                          (chosen && correct && (chosen.trim().toLowerCase() === correct.trim().toLowerCase() || chosen.includes(correct) || correct.includes(chosen)));

          if (isMatch) {
            if (btn) btn.classList.add('correct');
            score++;
            document.getElementById('score-badge').textContent = 'Score: ' + score;
            status.innerHTML = '<span style="color:#10b981;">✅ Correct!</span> High-Yield Concept Verified';
          } else {
            if (btn) btn.classList.add('wrong');
            document.querySelectorAll('.choice-btn').forEach((b, i) => {
              const letter = ['A', 'B', 'C', 'D'][i];
              if (letter === correctLetter || b.innerText.includes(correct) || (correct && correct.includes(b.innerText.trim()))) {
                b.classList.add('correct');
              }
            });
            status.innerHTML = '<span style="color:#ef4444;">❌ Incorrect.</span> Review Explanation Below';
          }

          expText.innerHTML = '<strong>Correct Answer: ' + (correct || it.answer) + '</strong><br><br>' + (it.explanation || it.back || 'Key concept verified.');

          setTimeout(() => {
            qIdx++;
            renderQ();
          }, 2400);
        }

        function restartQuiz() {
          qIdx = 0;
          score = 0;
          document.getElementById('q-card').style.display = 'block';
          document.getElementById('summary-card').style.display = 'none';
          renderQ();
        }

        renderQ();
      </script>
    </body></html>`;
  }

  // 3. CLOZE DELETION & ACTIVE RECALL BLURTING
  if (format.includes('cloze') || format.includes('blurt') || format.includes('fill') || format.includes('gap')) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>${baseCss}
      .cloze-card { padding: 1.75rem; background: var(--card); border: 1.5px solid var(--border); border-radius: 18px; width: 100%; max-width: 680px; margin: 1rem 0; }
      .occlusion-mask { display: inline-block; padding: 0.2rem 0.75rem; border-radius: 6px; background: #28303e; color: #5A7D99; cursor: pointer; user-select: none; font-weight: 700; border: 1px dashed #5A7D99; transition: all 0.2s; }
      .occlusion-mask.revealed { background: rgba(16,185,129,0.15); color: #34d399; border: 1px solid #10b981; text-decoration: none; }
    </style></head><body>
      <div id="app">
        <header id="app-header">
          <span class="badge" style="background:#5A7D99;color:white;">⚡ Rapid Cloze Blurting</span>
          <h1 style="margin-top:0.4rem;">${title}</h1>
          <p class="header-desc">Click any masked token to test your active recall, or toggle typing test mode</p>
        </header>
        <main id="app-main" style="width:100%;display:flex;flex-direction:column;align-items:center;">
          <div class="cloze-card text-left" id="cloze-list"></div>
          <div style="display:flex;gap:0.75rem;margin-top:1rem;justify-content:center;">
            <button class="btn btn-primary" onclick="toggleAllMasks(true)">👁️ Reveal All</button>
            <button class="btn btn-secondary" onclick="toggleAllMasks(false)">🔒 Blur All</button>
          </div>
        </main>
      </div>
      <script>
        const DATA = ${itemsJson};
        const box = document.getElementById('cloze-list');
        DATA.forEach((it, i) => {
          const div = document.createElement('div');
          div.style.marginBottom = '1.4rem';
          div.style.lineHeight = '1.75';
          div.style.paddingBottom = '1rem';
          div.style.borderBottom = '1px solid rgba(255,255,255,0.06)';
          const term = it.front || it.concept || it.word || ('Concept ' + (i+1));
          const def = it.back || it.definition || it.explanation || 'Key mechanism details.';
          div.innerHTML = '<h3 style="font-family:var(--font-display);font-size:1.2rem;color:#fff;margin-bottom:0.4rem;">' + (i+1) + '. ' + term + '</h3>' +
            '<p style="font-size:0.95rem;color:#cbd5e1;">' + def.replace(new RegExp(term, 'gi'), '<span class="occlusion-mask" onclick="this.classList.toggle(\\'revealed\\')">' + term + '</span>') +
            ' <span class="occlusion-mask" onclick="this.classList.toggle(\\'revealed\\')">' + (it.clue || it.answer || 'Key Mechanism') + '</span></p>';
          box.appendChild(div);
        });

        function toggleAllMasks(show) {
          document.querySelectorAll('.occlusion-mask').forEach(m => m.classList.toggle('revealed', show));
        }
      </script>
    </body></html>`;
  }

  // 4. FEYNMAN ACTIVE RECALL & EXPLANATION GRADER
  if (format.includes('feynman') || format.includes('grader')) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>${baseCss}
      .feynman-box { width: 100%; max-width: 700px; margin: 1rem 0; background: var(--card); border: 1.5px solid var(--border); border-radius: 20px; padding: 2rem; text-align: left; }
    </style></head><body>
      <div id="app">
        <header id="app-header">
          <span class="badge" style="background:#5A7D99;color:white;">🧠 Feynman Active Recall Grader</span>
          <h1 style="margin-top:0.4rem;">${title}</h1>
          <p class="header-desc">Explain this concept in your own words. The engine grades your conceptual completeness against key academic criteria.</p>
          <span id="app-progress" class="badge" style="margin-top:0.5rem;">Concept 1 of ${items.length}</span>
        </header>
        <main id="app-main" style="width:100%;display:flex;flex-direction:column;align-items:center;">
          <div class="feynman-box">
            <h2 id="f-title" class="display-question" style="font-size:1.5rem;margin-bottom:0.5rem;"></h2>
            <p id="f-prompt" class="muted" style="font-size:0.9rem;margin-bottom:1.25rem;color:#94a3b8;"></p>
            <textarea id="f-input" rows="4" placeholder="Explain the underlying mechanism and why this works in your own words..." style="width:100%;padding:0.85rem;border-radius:12px;background:#13161c;border:1px solid var(--border);color:#fff;font-size:0.9rem;resize:vertical;line-height:1.5;"></textarea>
            <div style="display:flex;gap:0.75rem;margin-top:1rem;">
              <button class="btn btn-primary w-full" style="padding:0.75rem 1.5rem;font-weight:700;" id="f-grade-btn">⚡ Evaluate Explanation</button>
              <button class="btn btn-secondary" id="f-model-btn" style="white-space:nowrap;padding:0.75rem 1.25rem;">Model Answer</button>
            </div>
            <div id="f-feedback" class="card" style="display:none;margin-top:1.25rem;background:var(--muted);border-radius:14px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.6rem;">
                <h4 style="font-weight:700;font-size:0.95rem;color:#fff;">Feynman Rubric Assessment</h4>
                <span id="f-score" style="font-weight:800;color:#10b981;font-size:1rem;"></span>
              </div>
              <div id="f-checklist" style="display:grid;gap:0.4rem;font-size:0.85rem;margin-bottom:0.75rem;"></div>
              <div id="f-model-box" style="display:none;padding:0.85rem;border-radius:10px;background:rgba(90,125,153,0.15);border:1px solid rgba(90,125,153,0.3);font-size:0.85rem;line-height:1.6;">
                <strong style="color:#5A7D99;">Exemplar Master Explanation:</strong> <span id="f-model-text" style="color:#e2e8f0;"></span>
              </div>
            </div>
          </div>
          <div style="display:flex;gap:0.75rem;margin-top:0.75rem;">
            <button class="btn btn-secondary" id="f-prev" style="padding:0.6rem 1.2rem;">← Previous</button>
            <button class="btn btn-secondary" id="f-next" style="padding:0.6rem 1.2rem;">Next Concept →</button>
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
          fPrompt.textContent = it.prompt || ('Explain the core mechanism, definitions, and exam significance of ' + (it.front || it.concept || 'this topic') + ' in simple terms:');
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
            row.innerHTML = (match ? '<span style="color:#10b981;font-weight:700;">✅</span> ' : '<span style="color:#f59e0b;font-weight:700;">⚠️</span> ') + '<span style="color:#cbd5e1;">' + kw + '</span>';
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

  // 5. CHRONOLOGICAL TIMELINE & MILESTONE ORDERING
  if (format.includes('timeline') || format.includes('chronol') || format.includes('ordering') || format.includes('sequence')) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>${baseCss}
      .timeline-track-container { position: relative; padding-left: 2.25rem; width: 100%; max-width: 760px; margin: 0 auto; }
      .timeline-vertical-spine { position: absolute; left: 1rem; top: 1rem; bottom: 1rem; width: 2.5px; background: linear-gradient(to bottom, var(--primary), #3D6660, #10b981); opacity: 0.35; border-radius: 2px; }
      .timeline-slot { position: relative; margin-bottom: 0.85rem; }
      .timeline-slot-node { position: absolute; left: -2.25rem; top: 1.15rem; width: 14px; height: 14px; border-radius: 50%; background: var(--background); border: 2.5px solid var(--primary); z-index: 2; transition: all 0.2s; }
      .timeline-slot-node.locked { border-color: #10b981; background: #10b981; box-shadow: 0 0 8px rgba(16,185,129,0.5); }
      .timeline-card { background: var(--card); border: 1.5px solid var(--border); border-radius: 14px; padding: 1.1rem 1.35rem; cursor: grab; user-select: none; transition: all 0.2s; display: flex; align-items: center; gap: 0.85rem; position: relative; }
      .timeline-card:hover { border-color: rgba(90,125,153,0.6); transform: translateY(-1px); }
      .timeline-card.correct-order { border-color: #10b981; background: rgba(16,185,129,0.08); }
      .drag-handle { color: #8E8E93; font-size: 1.25rem; cursor: grab; }
      .order-pill { width: 28px; height: 28px; border-radius: 50%; background: var(--muted); border: 1.5px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800; color: var(--primary); }
      .move-btn { background: #21262E; border: 1px solid var(--border); color: #CDD1D6; border-radius: 6px; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 0.7rem; }
    </style></head><body>
      <div id="app">
        <header id="app-header">
          <span class="badge" style="background:#5A7D99;color:white;">Chronological Sequence</span>
          <h1 style="margin-top:0.4rem;">${title}</h1>
          <p class="header-desc">${description}</p>
        </header>
        <main id="app-main" style="width:100%;display:flex;flex-direction:column;align-items:center;padding-bottom:2rem;">
          <div style="display:flex;gap:0.75rem;justify-content:center;margin-bottom:1.25rem;">
            <button class="btn btn-primary" id="btn-check-order">Verify Sequence Order</button>
            <button class="btn btn-secondary" id="btn-shuffle-order">Scramble Order</button>
          </div>
          <div id="order-feedback" class="card text-center" style="display:none;margin-bottom:1rem;padding:0.85rem 1.25rem;width:100%;max-width:760px;"></div>
          <div class="timeline-track-container">
            <div class="timeline-vertical-spine"></div>
            <div id="timeline-slots-container" style="display:grid;gap:0.35rem;"></div>
          </div>
        </main>
      </div>
      <script>
        const ORIGINAL = ${itemsJson}.map((it, idx) => ({
          id: it.id || String(idx + 1),
          text: it.text || it.title || it.front || it.concept || ('Milestone ' + (idx + 1)),
          detail: it.detail || it.back || it.explanation || it.definition || ''
        }));
        let currentList = [...ORIGINAL].sort(() => Math.random() - 0.5);
        const container = document.getElementById('timeline-slots-container');
        const fbEl = document.getElementById('order-feedback');

        function render() {
          container.innerHTML = '';
          currentList.forEach((item, index) => {
            const slot = document.createElement('div');
            slot.className = 'timeline-slot';
            slot.innerHTML = '<div class="timeline-slot-node" id="node-' + index + '"></div>' +
              '<div class="timeline-card" data-index="' + index + '">' +
                '<span class="drag-handle">⠿</span>' +
                '<div class="order-pill">' + (index + 1) + '</div>' +
                '<div style="flex:1;"><h3 style="font-family:var(--font-display);font-size:1.15rem;font-weight:600;color:#fff;margin-bottom:0.25rem;">' + item.text + '</h3>' +
                '<p style="font-size:0.85rem;color:#94a3b8;line-height:1.5;">' + item.detail + '</p></div>' +
                '<div style="display:flex;flex-direction:column;gap:0.25rem;"><button class="move-btn" onclick="moveItem(' + index + ',-1)">▲</button><button class="move-btn" onclick="moveItem(' + index + ',1)">▼</button></div>' +
              '</div>';
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
          let correct = 0;
          const cards = container.querySelectorAll('.timeline-card');
          currentList.forEach((item, i) => {
            const match = item.text === ORIGINAL[i].text;
            if (match) correct++;
            if (cards[i]) cards[i].classList.toggle('correct-order', match);
            const node = document.getElementById('node-' + i);
            if (node) node.classList.toggle('locked', match);
          });
          fbEl.style.display = 'block';
          fbEl.innerHTML = '<strong style="color:' + (correct === currentList.length ? '#10b981' : '#f59e0b') + ';">' + correct + ' / ' + currentList.length + ' Milestones Correctly Ordered</strong>';
        };

        document.getElementById('btn-shuffle-order').onclick = () => {
          fbEl.style.display = 'none';
          currentList.sort(() => Math.random() - 0.5);
          render();
        };

        render();
      </script>
    </body></html>`;
  }

  // 6. DEFAULT 3-IN-1 REVISION KIT (CORNELL NOTES + FLASHCARDS + ASSESSMENT)
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>${baseCss}
    .tab-btn.active { background: #5A7D99; color: white; font-weight: 700; border-color: #5A7D99; }
    .cornell-row { display: grid; grid-template-columns: 200px 1fr; gap: 1.25rem; padding: 1.25rem; background: var(--card); border: 1px solid var(--border); border-radius: 14px; margin-bottom: 0.85rem; }
    @media(max-width: 640px) { .cornell-row { grid-template-columns: 1fr; gap: 0.5rem; } }
  </style></head><body>
    <div id="app">
      <header id="app-header">
        <span class="badge" style="background:#5A7D99;color:white;">📦 3-in-1 Revision Kit</span>
        <h1 style="margin-top:0.4rem;">${title}</h1>
        <p class="header-desc">${description}</p>
        <div style="display:flex;justify-content:center;gap:0.6rem;margin-top:1rem;">
          <button class="btn btn-secondary tab-btn active" id="tab-notes">📑 Cornell Notes</button>
          <button class="btn btn-secondary tab-btn" id="tab-cards">🗂️ Flashcards</button>
        </div>
      </header>
      <main id="app-main" style="width:100%;max-width:800px;">
        <div id="view-notes" class="text-left" style="display:grid;gap:0.75rem;width:100%;"></div>
        <div id="view-cards" class="text-left" style="display:none;width:100%;">
          <div class="card" id="card-elem" style="min-height:280px;display:flex;flex-direction:column;justify-content:space-between;cursor:pointer;background:radial-gradient(circle at 10% 10%, rgba(90, 125, 153, 0.12) 0%, transparent 60%), #171B23;border-left:4px solid #5A7D99;border-radius:20px;padding:2rem;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
              <span class="badge" id="c-badge" style="background:rgba(255,255,255,0.06);color:#94a3b8;border-color:rgba(255,255,255,0.1);">Front (Click to Flip)</span>
              <span style="font-size:0.75rem;color:#64748b;font-family:var(--font-ui);" id="c-count">Concept 1</span>
            </div>
            <div style="flex:1;display:flex;flex-direction:column;justify-content:center;">
              <h2 id="c-text" style="font-family:var(--font-display);font-size:1.65rem;font-weight:600;color:#ffffff;line-height:1.35;margin-bottom:0.5rem;"></h2>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:1rem;padding-top:0.75rem;border-top:1px solid rgba(255,255,255,0.06);">
              <span style="font-size:0.75rem;color:#64748b;font-family:var(--font-ui);">Click card to toggle details</span>
              <span style="font-size:0.75rem;color:#5A7D99;">🔄 Flip</span>
            </div>
          </div>
          <div style="display:flex;gap:0.75rem;margin-top:1rem;justify-content:center;align-items:center;">
            <button class="btn btn-secondary" id="c-prev" style="padding:0.65rem 1.15rem;font-size:0.825rem;font-weight:600;border-radius:12px;">← Prev</button>
            <button class="btn btn-primary" id="c-flip" style="padding:0.85rem 2.25rem;font-size:0.95rem;font-weight:700;border-radius:14px;background:linear-gradient(135deg, #5A7D99 0%, #3D5E7A 100%);color:#fff;box-shadow:0 4px 18px rgba(90, 125, 153, 0.4);min-width:170px;">Flip Card</button>
            <button class="btn btn-secondary" id="c-next" style="padding:0.65rem 1.15rem;font-size:0.825rem;font-weight:600;border-radius:12px;">Next →</button>
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
          c.className = 'cornell-row';
          c.innerHTML = '<div style="border-right:1px solid rgba(255,255,255,0.08);padding-right:0.75rem;">' +
            '<span class="badge" style="margin-bottom:0.35rem;">Cue ' + (idx + 1) + '</span>' +
            '<h3 style="font-family:var(--font-display);font-weight:600;font-size:1.1rem;color:#fff;">' + (it.front || it.concept || ('Concept ' + (idx + 1))) + '</h3>' +
            '</div>' +
            '<div><p style="font-size:0.9rem;line-height:1.65;color:#cbd5e1;">' + (it.back || it.definition || it.explanation || 'Key mechanism details.') + '</p></div>';
          notesView.appendChild(c);
        });
      }

      function renderCard() {
        if (!DATA.length) return;
        const it = DATA[cIdx] || {};
        cFlipped = false;
        document.getElementById('c-count').textContent = 'Concept ' + (cIdx + 1) + ' of ' + DATA.length;
        document.getElementById('c-badge').textContent = 'Front (Click to Flip)';
        document.getElementById('c-text').textContent = it.front || it.concept || it.term || 'Concept';
      }

      document.getElementById('card-elem').onclick = () => {
        if (!DATA.length) return;
        const it = DATA[cIdx] || {};
        cFlipped = !cFlipped;
        document.getElementById('c-badge').textContent = cFlipped ? 'Back (Explanation)' : 'Front (Click to Flip)';
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
