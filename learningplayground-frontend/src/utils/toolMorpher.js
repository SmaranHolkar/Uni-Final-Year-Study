// Tool Morpher: Converts any study item dataset into interactive, self-contained HTML tools

function buildClientCrosswordLayout(items) {
  const words = (items || []).map((it, i) => {
    const f = String(it.front || it.question || it.title || it.concept || it.left || '').trim();
    const b = String(it.back || it.answerText || it.answer || it.definition || it.explanation || it.right || '').trim();
    const directWord = String(it.word || it.term || '').trim();
    const directClue = String(it.clue || it.hint || '').trim();

    let wordCandidate = '';
    let clueCandidate = '';

    if (directWord && directWord.replace(/[^A-Za-z]/g, '').length >= 3) {
      wordCandidate = directWord;
      clueCandidate = directClue || b || f;
    } else if (f && b) {
      const fWords = f.split(/\s+/).length;
      const bWords = b.split(/\s+/).length;
      if (fWords <= 2 && f.replace(/[^A-Za-z]/g, '').length <= 12 && bWords > fWords) {
        wordCandidate = f;
        clueCandidate = b;
      } else if (bWords <= 2 && b.replace(/[^A-Za-z]/g, '').length <= 12 && fWords > bWords) {
        wordCandidate = b;
        clueCandidate = f;
      } else if (f.length <= b.length) {
        wordCandidate = f;
        clueCandidate = b;
      } else {
        wordCandidate = b;
        clueCandidate = f;
      }
    } else {
      wordCandidate = directWord || f || b || `TERM${i + 1}`;
      clueCandidate = directClue || b || f || `Key concept definition for term ${i + 1}`;
    }

    let cleanWord = wordCandidate.toUpperCase().replace(/[^A-Z]/g, '');
    if (cleanWord.length > 12) {
      const firstWordOnly = wordCandidate.split(/[\s\-_]+/)[0]?.toUpperCase().replace(/[^A-Z]/g, '') || '';
      cleanWord = firstWordOnly.length >= 3 && firstWordOnly.length <= 12 ? firstWordOnly : cleanWord.slice(0, 10);
    }
    if (cleanWord.length < 3) {
      cleanWord = `TERM${i + 1}`;
    }

    let clue = clueCandidate.trim();
    if (!clue || clue.toUpperCase().replace(/[^A-Z]/g, '') === cleanWord) {
      clue = `Key concept definition and application for ${cleanWord}.`;
    }

    return { word: cleanWord, clue, number: i + 1 };
  }).filter(w => w.word.length >= 3).slice(0, 12);

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

function buildClientWordSearchLayout(items, gridSize = 10) {
  const words = (items || []).map((it, i) => {
    const rawWord = String(it.word || it.front || it.concept || it.term || `WORD${i + 1}`).toUpperCase().replace(/[^A-Z]/g, '');
    const cleanWord = rawWord.length >= 3 ? rawWord.slice(0, gridSize) : `TERM${i + 1}`;
    const clue = String(it.clue || it.back || it.definition || it.explanation || `Find ${cleanWord}`);
    return { word: cleanWord, clue, id: String(i + 1) };
  }).filter(w => w.word.length >= 3).slice(0, 6);

  const grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(''));
  const directions = [
    { dr: 0, dc: 1 },
    { dr: 1, dc: 0 },
    { dr: 1, dc: 1 },
  ];

  const placed = [];
  for (const item of words) {
    let placedWord = false;
    for (let attempts = 0; attempts < 100; attempts++) {
      const dir = directions[Math.floor(Math.random() * directions.length)];
      const startR = Math.floor(Math.random() * (gridSize - (dir.dr ? item.word.length : 0)));
      const startC = Math.floor(Math.random() * (gridSize - (dir.dc ? item.word.length : 0)));

      let fits = true;
      for (let i = 0; i < item.word.length; i++) {
        const r = startR + i * dir.dr;
        const c = startC + i * dir.dc;
        if (grid[r][c] !== '' && grid[r][c] !== item.word[i]) {
          fits = false;
          break;
        }
      }

      if (fits) {
        for (let i = 0; i < item.word.length; i++) {
          grid[startR + i * dir.dr][startC + i * dir.dc] = item.word[i];
        }
        placed.push({ ...item, startRow: startR, startCol: startC, dir });
        placedWord = true;
        break;
      }
    }
    if (!placedWord) {
      placed.push({ ...item, startRow: 0, startCol: 0, dir: directions[0] });
    }
  }

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c] === '') {
        grid[r][c] = alphabet[Math.floor(Math.random() * alphabet.length)];
      }
    }
  }

  return { grid, words: placed };
}

function classifyTopicCategory(topic) {
  const t = String(topic || '').toLowerCase();
  if (/calcul|math|physic|algebra|geomet|chem|equat|formul|quant|statistic|thermodynam/i.test(t)) return 'formula';
  if (/histor|war|revolut|centur|treaty|monarch|presid|politic|law|empir|civil/i.test(t)) return 'timeline';
  if (/french|german|spanish|latin|gramm|vocab|kanji|mandarin|italian|linguist|translat/i.test(t)) return 'language';
  if (/bio|cell|photosynth|mitos|dna|organ|pathol|physiol|ecolog|genet|evolut|climat|river|joint|wood/i.test(t)) return 'process';
  return 'general';
}

function getDynamicAcademicItems(title) {
  const cleanTitle = (title || 'Core Subject').replace(/revision|tool|interactive|study|quiz|flashcards/gi, '').trim() || 'Fundamentals';
  const category = classifyTopicCategory(cleanTitle);

  if (category === 'formula') {
    return [
      {
        id: '1',
        front: `Fundamental Equation of ${cleanTitle}`,
        back: `Defines the core quantitative relationship and governing physical/mathematical law for ${cleanTitle}.`,
        left: `Governing Equation`,
        right: `Fundamental mathematical formulation for ${cleanTitle}`,
        question: `What primary relationship is expressed by the governing formula in ${cleanTitle}?`,
        choices: [
          `Proportional scaling between primary inputs and output rate.`,
          `Constant invariant equilibrium regardless of boundary conditions.`,
          `Inverse non-linear oscillation without direct damping.`,
          `Stochastic divergence under nominal parameters.`
        ],
        answer: 'A',
        answerText: `Proportional scaling between primary inputs and output rate.`,
        explanation: `The primary formula establishes direct proportional scaling between key variables.`,
        word: 'EQUATION',
        clue: `Core formula governing ${cleanTitle}`,
        text: `Define Formula & Variables`,
        position: 1,
        detail: `Identify dependent and independent variables with their standard SI units.`
      },
      {
        id: '2',
        front: `Variable Units & Dimensional Analysis`,
        back: `Standard SI units, conversion factors, and dimensional consistency checks required for calculations.`,
        left: `Units & Dimensions`,
        right: `Standard SI units and dimensional validation`,
        question: `Why is dimensional analysis critical when solving problems in ${cleanTitle}?`,
        choices: [
          `It verifies mathematical consistency and catches algebraic errors before calculation.`,
          `It changes the fundamental values of universal constants.`,
          `It eliminates the need for numeric arithmetic entirely.`,
          `It applies only to non-physical hypothetical quantities.`
        ],
        answer: 'A',
        answerText: `It verifies mathematical consistency and catches algebraic errors before calculation.`,
        explanation: `Dimensional consistency ensures both sides of the equation maintain equivalent physical dimensions.`,
        word: 'DIMENSION',
        clue: `Consistency check for physical units`,
        text: `Derive Boundary Equations`,
        position: 2,
        detail: `Apply boundary conditions to isolate the target variable.`
      },
      {
        id: '3',
        front: `Boundary Limits & Edge Cases`,
        back: `Behavior of ${cleanTitle} as variables approach zero, infinity, or critical transition thresholds.`,
        left: `Boundary Conditions`,
        right: `Critical thresholds and asymptotic behavior`,
        question: `What occurs at the upper boundary condition of ${cleanTitle}?`,
        choices: [
          `The system approaches an asymptotic saturation limit.`,
          `The variables invert signs instantaneously.`,
          `The governing law ceases to apply under any condition.`,
          `The output becomes completely undefined.`
        ],
        answer: 'A',
        answerText: `The system approaches an asymptotic saturation limit.`,
        explanation: `Asymptotic limits prevent unconstrained divergence in physical systems.`,
        word: 'BOUNDARY',
        clue: `Threshold limit for system variables`,
        text: `Evaluate & Verify Solution`,
        position: 3,
        detail: `Check unit consistency and magnitude sanity against known physical limits.`
      }
    ];
  }

  if (category === 'timeline') {
    return [
      {
        id: '1',
        front: `Antecedents & Catalysts of ${cleanTitle}`,
        back: `Underlying socioeconomic, political, and institutional factors that precipitated ${cleanTitle}.`,
        left: `Catalysts & Origins`,
        right: `Initial conditions and driving triggers`,
        question: `Which factor served as the primary catalyst for ${cleanTitle}?`,
        choices: [
          `Systemic tensions and structural shifts leading to a critical turning point.`,
          `An isolated administrative anomaly with no wider historical impact.`,
          `Immediate consensus among all opposing parties.`,
          `A sudden reduction in external economic and political pressures.`
        ],
        answer: 'A',
        answerText: `Systemic tensions and structural shifts leading to a critical turning point.`,
        explanation: `Structural triggers create the preconditions required for major historical transitions.`,
        word: 'CATALYST',
        clue: `Initial trigger or turning point`,
        text: `Origins & Preconditions`,
        position: 1,
        detail: `Underlying structural causes establish the initial impetus.`
      },
      {
        id: '2',
        front: `Pivotal Milestone of ${cleanTitle}`,
        back: `The decisive event, battle, treaty, or legislation that permanently shifted the trajectory of ${cleanTitle}.`,
        left: `Pivotal Milestone`,
        right: `Decisive turning point and structural realignment`,
        question: `What was the defining significance of the pivotal milestone in ${cleanTitle}?`,
        choices: [
          `It fundamentally realigned political authority and altered strategic momentum.`,
          `It restored the pre-existing status quo without modification.`,
          `It was promptly reversed within days with zero long-term impact.`,
          `It occurred in total secrecy without public awareness.`
        ],
        answer: 'A',
        answerText: `It fundamentally realigned political authority and altered strategic momentum.`,
        explanation: `Pivotal milestones alter institutional dynamics and define historical epochs.`,
        word: 'MILESTONE',
        clue: `Decisive turning point in trajectory`,
        text: `Decisive Climax`,
        position: 2,
        detail: `Key actions shift the balance of power and determine outcomes.`
      },
      {
        id: '3',
        front: `Long-Term Consequences & Legacy`,
        back: `Enduring structural transformations, legal precedents, and cultural legacy of ${cleanTitle}.`,
        left: `Historical Legacy`,
        right: `Enduring structural impacts and modern ramifications`,
        question: `What enduring legacy resulted from ${cleanTitle}?`,
        choices: [
          `Permanent institutional reform and foundational legal/social precedents.`,
          `Immediate return to traditional structures within months.`,
          `Complete loss of historical documentation regarding the event.`,
          `Isolated localized effects without broader systemic resonance.`
        ],
        answer: 'A',
        answerText: `Permanent institutional reform and foundational legal/social precedents.`,
        explanation: `Historical transformations establish lasting frameworks that influence subsequent eras.`,
        word: 'LEGACY',
        clue: `Enduring historical consequence`,
        text: `Settlement & Legacy`,
        position: 3,
        detail: `Codification of treaties and new institutional norms.`
      }
    ];
  }

  // Process / General default
  return [
    {
      id: '1',
      front: `Core Principle of ${cleanTitle}`,
      concept: `Core Principle`,
      back: `The foundational rule and primary mechanism governing ${cleanTitle}, establishing baseline concepts for exam synthesis.`,
      explanation: `Fundamental axiom governing ${cleanTitle}. Essential baseline knowledge required before advanced applications.`,
      left: `Core Principle`,
      right: `Foundational axiom and governing mechanism for ${cleanTitle}`,
      question: `Which statement most accurately characterizes the primary mechanism of ${cleanTitle}?`,
      choices: [
        `It establishes the foundational operational framework essential for overall system function.`,
        `It operates exclusively in isolation without interacting with secondary components.`,
        `It remains completely inactive during standard operational conditions.`,
        `It acts solely as an unregulated byproduct without specific function.`
      ],
      answer: 'A',
      answerText: `It establishes the foundational operational framework essential for overall system function.`,
      clue: `Primary foundational mechanism of ${cleanTitle}`,
      word: 'PRINCIPLE',
      text: `Initiation & Baseline`,
      position: 1,
      detail: `Initial activation and foundational setup of ${cleanTitle}.`
    },
    {
      id: '2',
      front: `Key Operational Mechanism`,
      concept: `Operational Mechanism`,
      back: `Specific sequence of actions, intermediate states, and transformations that drive ${cleanTitle}.`,
      explanation: `Step-by-step mechanism determines overall efficiency and output throughput.`,
      left: `Operational Mechanism`,
      right: `Step-by-step transformation sequence driving system behavior`,
      question: `What factor primarily dictates the operational efficiency in ${cleanTitle}?`,
      choices: [
        `Component availability and the specific rate-limiting intermediate step.`,
        `Random unconstrained fluctuations independent of external inputs.`,
        `Passive accumulation of inert end-products.`,
        `Spontaneous unmediated phase transitions.`
      ],
      answer: 'A',
      answerText: `Component availability and the specific rate-limiting intermediate step.`,
      clue: `Step-by-step operational sequence`,
      word: 'MECHANISM',
      text: `Process Execution`,
      position: 2,
      detail: `Execution of core transformations and intermediate state transitions.`
    },
    {
      id: '3',
      front: `Regulation & Control`,
      concept: `Control Loops`,
      back: `Feedback mechanisms and control parameters that maintain balance and prevent runaway failure in ${cleanTitle}.`,
      explanation: `Feedback loops modulate operational intensity and protect against system breakdown.`,
      left: `Regulation & Control`,
      right: `Feedback loops maintaining equilibrium and preventing failure`,
      question: `How does negative feedback maintain stability within ${cleanTitle}?`,
      choices: [
        `Downstream accumulation signals upstream dampening to prevent overproduction or exhaustion.`,
        `By amplifying initial stimulus exponentially without an upper threshold.`,
        `Through irreversible degradation of all primary resources.`,
        `By preventing all subsequent signal communication permanently.`
      ],
      answer: 'A',
      answerText: `Downstream accumulation signals upstream dampening to prevent overproduction or exhaustion.`,
      clue: `Homeostatic mechanism maintaining equilibrium`,
      word: 'REGULATION',
      text: `Feedback & Equilibrium`,
      position: 3,
      detail: `Regulation mechanisms adjust throughput to restore balance.`
    },
    {
      id: '4',
      front: `Practical Application & Problem Solving`,
      concept: `Real-World Application`,
      back: `Translation of core concepts into practical diagnostic methods, design implementations, and exam problem-solving.`,
      explanation: `Practical translation bridges foundational theory with active problem solving.`,
      left: `Practical Application`,
      right: `Diagnostic problem-solving and real-world implementation`,
      question: `In practical problem-solving, what is the most critical analytical step for ${cleanTitle}?`,
      choices: [
        `Identifying the governing variables and isolating the limiting factor.`,
        `Assuming all variables remain completely constant across scenarios.`,
        `Applying generalized intuition without verifying boundary conditions.`,
        `Ignoring secondary interactions completely.`
      ],
      answer: 'A',
      answerText: `Identifying the governing variables and isolating the limiting factor.`,
      clue: `Diagnostic problem-solving method`,
      word: 'APPLICATION',
      text: `Synthesis & Verification`,
      position: 4,
      detail: `Application of principles to novel exam and practical scenarios.`
    }
  ];
}

export function morphToolToHtml(targetFormat, title, description, rawItems) {
  const format = String(targetFormat || 'flashcards').toLowerCase();
  const validRaw = Array.isArray(rawItems) && rawItems.length > 0 && rawItems.some(it => it && (it.front || it.question || it.term || it.concept || it.left || it.word));
  const items = validRaw ? rawItems : getDynamicAcademicItems(title);
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
    .badge { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.25rem 0.65rem; border-radius: 4px; font-size: 0.725rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; background: var(--muted); border: 1px solid var(--border); color: var(--accent); font-family: var(--font-ui); }
    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem; font-family: var(--font-ui); cursor: pointer; transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1); border: none; border-radius: 6px; }
    .btn-primary { background: var(--primary); color: #fff; }
    .btn-primary:hover { background: var(--primary-hover); }
    .btn-secondary { background: var(--card); color: var(--foreground); border: 1px solid var(--border); }
    .btn-secondary:hover { background: var(--muted); border-color: var(--primary); }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 6px; padding: 1.5rem; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
    .text-left { text-align: left; }
    .display-question { font-family: var(--font-display); font-size: 1.65rem; font-weight: 600; line-height: 1.35; color: #ffffff; letter-spacing: -0.015em; }
  `;

  // 1. FLASHCARDS
  if (format.includes('flashcard') || format.includes('cards')) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>${baseCss}
      .fc-container { perspective: 1200px; width: 100%; max-width: 600px; min-height: 310px; cursor: pointer; margin: 1.25rem 0 1.5rem 0; }
      .fc-card { width: 100%; min-height: 310px; position: relative; transform-style: preserve-3d; transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); border-radius: 8px; border: 1px solid var(--border); background: var(--card); box-shadow: 0 16px 40px -10px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05); }
      .fc-card:hover { border-color: rgba(90, 125, 153, 0.6); }
      .fc-card.flipped { transform: rotateY(180deg); }
      .fc-front, .fc-back { position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden; display: flex; flex-direction: column; justify-content: space-between; align-items: flex-start; padding: 2rem 2.25rem; border-radius: 8px; text-align: left; box-sizing: border-box; }
      .fc-front { background: radial-gradient(circle at 10% 10%, rgba(90, 125, 153, 0.12) 0%, transparent 60%), #171B23; border-left: 4px solid #5A7D99; }
      .fc-back { transform: rotateY(180deg); background: radial-gradient(circle at 90% 10%, rgba(56, 189, 248, 0.1) 0%, transparent 60%), #141821; border-left: 4px solid #38bdf8; }
      
      .card-topbar { width: 100%; display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
      .card-tag { font-family: var(--font-ui); font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: #94a3b8; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.08); padding: 0.25rem 0.65rem; border-radius: 4px; }
      .card-index { font-family: var(--font-ui); font-size: 0.75rem; font-weight: 600; color: #64748b; }
      .card-body-content { width: 100%; flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 0.5rem 0; }
      .display-answer { font-family: var(--font-ui); font-size: 1.05rem; font-weight: 400; line-height: 1.7; color: #e2e8f0; letter-spacing: 0.01em; }
      .card-bottombar { width: 100%; display: flex; align-items: center; justify-content: space-between; margin-top: 1rem; padding-top: 0.85rem; border-top: 1px solid rgba(255, 255, 255, 0.06); }
      .flip-hint { font-family: var(--font-ui); font-size: 0.75rem; color: #64748b; display: flex; align-items: center; gap: 0.4rem; }
      .kbd-badge { background: #21262E; border: 1px solid #3A4250; border-radius: 4px; padding: 0.1rem 0.35rem; font-size: 0.65rem; font-family: monospace; color: #94a3b8; }
      .controls-bar { display: flex; align-items: center; justify-content: center; gap: 0.75rem; width: 100%; max-width: 600px; margin-top: 0.25rem; }
      .btn-nav { padding: 0.65rem 1.15rem; font-size: 0.825rem; font-weight: 600; border-radius: 6px; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.1); color: #94a3b8; transition: all 0.15s ease; }
      .btn-nav:hover { background: rgba(255, 255, 255, 0.08); border-color: rgba(255, 255, 255, 0.2); color: #ffffff; }
      .btn-flip-hero { padding: 0.85rem 2.25rem; font-size: 0.95rem; font-weight: 700; border-radius: 6px; background: linear-gradient(135deg, #5A7D99 0%, #3D5E7A 100%); color: #ffffff; box-shadow: 0 4px 18px rgba(90, 125, 153, 0.4); letter-spacing: 0.02em; min-width: 175px; }
      .btn-flip-hero:hover { background: linear-gradient(135deg, #6b90ad 0%, #466c8c 100%); }
      .btn-shuffle { padding: 0.65rem 0.85rem; font-size: 0.8rem; border-radius: 6px; background: transparent; border: 1px solid var(--border); color: #64748b; }
      .btn-shuffle:hover { background: rgba(255, 255, 255, 0.05); color: #cbd5e1; }
      .leitner-bar { display: flex; gap: 0.5rem; justify-content: center; margin-top: 1.15rem; flex-wrap: wrap; }
      .leitner-btn { padding: 0.45rem 1rem; font-size: 0.75rem; font-weight: 700; border-radius: 4px; border: 1px solid transparent; cursor: pointer; font-family: var(--font-ui); transition: all 0.15s; }
      .leitner-again { background: rgba(239,68,68,0.12); color: #f87171; border-color: rgba(239,68,68,0.25); }
      .leitner-again:hover { background: #ef4444; color: #fff; }
      .leitner-good { background: rgba(59,130,246,0.12); color: #60a5fa; border-color: rgba(59,130,246,0.25); }
      .leitner-good:hover { background: #3b82f6; color: #fff; }
      .leitner-easy { background: rgba(16,185,129,0.12); color: #34d399; border-color: rgba(16,185,129,0.25); }
      .leitner-easy:hover { background: #10b981; color: #fff; }
      .citation-btn { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.2rem 0.55rem; border-radius: 4px; font-size: 0.7rem; font-weight: 700; color: #93c5fd; background: rgba(59,130,246,0.15); border: 1px solid rgba(59,130,246,0.3); cursor: pointer; transition: all 0.15s ease; font-family: var(--font-ui); }
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
                  <div style="display:flex;align-items:center;gap:0.5rem;">
                    <button class="citation-btn" id="fc-cite-btn" style="display:none;" onclick="event.stopPropagation(); triggerCitation();">📖 Citation</button>
                    <span class="card-index" id="fc-progress">Card 1 of ${items.length}</span>
                  </div>
                </div>
                <div class="card-body-content">
                  <h2 id="front-text" class="display-question"></h2>
                  <span id="hint-text" style="font-size:0.85rem;color:#94a3b8;line-height:1.4;"></span>
                </div>
                <div class="card-bottombar">
                  <span class="flip-hint">Click card or press <kbd class="kbd-badge">Space</kbd> to flip</span>
                  <span style="font-size:0.75rem;color:#64748b;">🔄 3D Flip</span>
                </div>
              </div>
              <div class="fc-back">
                <div class="card-topbar">
                  <span class="card-tag" style="background:rgba(56,189,248,0.1);color:#38bdf8;border-color:rgba(56,189,248,0.25);">Answer / Breakdown</span>
                  <div style="display:flex;align-items:center;gap:0.5rem;">
                    <button class="citation-btn" id="fc-cite-btn-back" style="display:none;" onclick="event.stopPropagation(); triggerCitation();">📖 Citation</button>
                    <span class="card-index" id="fc-progress-back">Card 1 of ${items.length}</span>
                  </div>
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
            <button class="btn btn-nav" id="fc-prev">← Prev</button>
            <button class="btn btn-flip-hero" id="fc-flip">
              <span>Flip Card</span>
              <kbd class="kbd-badge" style="background:rgba(0,0,0,0.25);border-color:rgba(255,255,255,0.2);color:#fff;">Space</kbd>
            </button>
            <button class="btn btn-nav" id="fc-next">Next →</button>
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

        function triggerCitation() {
          const it = DATA[cur] || {};
          if (it.citation) {
            window.parent?.postMessage({
              type: 'OPEN_CITATION',
              citation: it.citation
            }, '*');
          }
        }

        function render() {
          if (!DATA.length) return;
          const it = DATA[cur];
          fText.textContent = it.front || it.question || it.term || it.concept || it.word || 'Concept';
          bText.textContent = it.back || it.answer || it.definition || it.explanation || it.clue || 'Explanation';
          hText.textContent = it.hint ? '💡 Hint: ' + it.hint : '';
          const progText = 'Card ' + (cur + 1) + ' of ' + DATA.length;
          if (prog) prog.textContent = progText;
          if (progBack) progBack.textContent = progText;
          const cBtn = document.getElementById('fc-cite-btn');
          const cBtnBack = document.getElementById('fc-cite-btn-back');
          const hasCitation = Boolean(it.citation && (it.citation.title || it.citation.excerpt));
          if (cBtn) cBtn.style.display = hasCitation ? 'inline-flex' : 'none';
          if (cBtnBack) cBtnBack.style.display = hasCitation ? 'inline-flex' : 'none';
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
      .quiz-card { width: 100%; max-width: 680px; margin: 1rem 0; background: var(--card); border: 1.5px solid var(--border); border-radius: 8px; padding: 2rem; }
      .choice-btn { width: 100%; text-align: left; padding: 0.95rem 1.25rem; margin-bottom: 0.65rem; border-radius: 6px; background: rgba(255,255,255,0.03); border: 1.5px solid var(--border); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: space-between; font-size: 0.95rem; line-height: 1.5; transition: all 0.15s; }
      .choice-btn:hover { border-color: var(--primary); background: rgba(90,125,153,0.15); }
      .choice-btn.correct { background: rgba(16,185,129,0.15)!important; border-color: #10b981!important; color: #34d399!important; box-shadow: 0 0 15px rgba(16,185,129,0.2); }
      .choice-btn.wrong { background: rgba(239,68,68,0.15)!important; border-color: #ef4444!important; color: #f87171!important; }
      .key-badge { font-size: 0.75rem; font-weight: 700; padding: 0.2rem 0.5rem; border-radius: 4px; background: #21262E; color: #94a3b8; font-family: var(--font-ui); border: 1px solid var(--border); }
      .exp-drawer { margin-top: 1.25rem; padding: 1.25rem; border-radius: 6px; background: rgba(255,255,255,0.03); border: 1px solid var(--border); font-size: 0.9rem; line-height: 1.6; }
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
          <div id="summary-card" class="card text-center" style="display:none;width:100%;max-width:560px;padding:2.5rem;border-radius:8px;">
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
            'Alternative perspective without direct causal kinetic influence.',
            'Unregulated degradation pathway independent of feedback equilibrium.',
            'Spontaneous unmediated reaction occurring solely under isolated conditions.'
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
            btn.innerHTML = '<span style="font-weight:500;">' + opt + '</span><span class="key-badge">' + (keys[idx] || (idx + 1)) + '</span>';
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

  // 3. MATCHING GAME (2-COLUMN INTERACTIVE CONNECTOR)
  if (format.includes('match')) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>${baseCss}
      .matching-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; width: 100%; max-width: 780px; margin: 1.25rem 0; }
      .match-card { background: var(--card); border: 1.5px solid var(--border); border-radius: 6px; padding: 1rem 1.25rem; cursor: pointer; transition: all 0.15s; font-size: 0.9rem; line-height: 1.5; color: #fff; user-select: none; display: flex; align-items: center; justify-content: space-between; min-height: 60px; }
      .match-card:hover { border-color: var(--primary); background: rgba(90,125,153,0.12); }
      .match-card.selected { border-color: #38bdf8; background: rgba(56,189,248,0.15); box-shadow: 0 0 12px rgba(56,189,248,0.3); }
      .match-card.matched { border-color: #10b981; background: rgba(16,185,129,0.15); color: #34d399; cursor: default; opacity: 0.7; pointer-events: none; }
      .match-card.error { border-color: #ef4444; background: rgba(239,68,68,0.15); color: #f87171; }
      @media (max-width: 640px) { .matching-grid { grid-template-columns: 1fr; gap: 1rem; } }
    </style></head><body>
      <div id="app">
        <header id="app-header">
          <span class="badge" style="background:#5A7D99;color:white;">Interactive Matching</span>
          <h1 style="margin-top:0.4rem;">${title}</h1>
          <p class="header-desc">Click a concept on the left, then select its matching definition on the right.</p>
          <div style="display:flex;gap:0.75rem;justify-content:center;margin-top:0.5rem;">
            <span class="badge" id="match-score">Matched: 0 / ${items.length}</span>
            <span class="badge" id="match-attempts">Attempts: 0</span>
          </div>
        </header>
        <main id="app-main" style="width:100%;display:flex;flex-direction:column;align-items:center;">
          <div class="matching-grid">
            <div id="left-col" style="display:grid;gap:0.75rem;"></div>
            <div id="right-col" style="display:grid;gap:0.75rem;"></div>
          </div>
          <div id="match-summary" class="card text-center" style="display:none;width:100%;max-width:520px;padding:2rem;">
            <span class="badge" style="background:rgba(16,185,129,0.2);color:#34d399;border-color:#10b981;margin-bottom:0.75rem;">All Pairs Connected!</span>
            <h2 style="font-family:var(--font-display);font-size:1.6rem;color:#fff;margin-bottom:0.5rem;">Mastery Confirmed 🎉</h2>
            <p id="match-stats" style="color:#94a3b8;font-size:0.9rem;margin-bottom:1.25rem;"></p>
            <button class="btn btn-primary" onclick="initMatching()">Play Again</button>
          </div>
        </main>
      </div>
      <script>
        const RAW = ${itemsJson};
        let PAIRS = RAW.map((it, idx) => ({
          id: it.id || String(idx + 1),
          left: it.left || it.term || it.front || it.concept || ('Term ' + (idx + 1)),
          right: it.right || it.definition || it.back || it.explanation || ('Definition ' + (idx + 1))
        }));

        let selectedLeft = null;
        let selectedRight = null;
        let matchedCount = 0;
        let attempts = 0;

        function initMatching() {
          selectedLeft = null; selectedRight = null; matchedCount = 0; attempts = 0;
          document.getElementById('match-score').textContent = 'Matched: 0 / ' + PAIRS.length;
          document.getElementById('match-attempts').textContent = 'Attempts: 0';
          document.getElementById('match-summary').style.display = 'none';

          const leftItems = [...PAIRS].sort(() => Math.random() - 0.5);
          const rightItems = [...PAIRS].sort(() => Math.random() - 0.5);

          const lCol = document.getElementById('left-col');
          const rCol = document.getElementById('right-col');
          lCol.innerHTML = ''; rCol.innerHTML = '';

          leftItems.forEach(item => {
            const card = document.createElement('div');
            card.className = 'match-card';
            card.dataset.id = item.id;
            card.dataset.side = 'left';
            card.textContent = item.left;
            card.onclick = () => handleSelect('left', item.id, card);
            lCol.appendChild(card);
          });

          rightItems.forEach(item => {
            const card = document.createElement('div');
            card.className = 'match-card';
            card.dataset.id = item.id;
            card.dataset.side = 'right';
            card.textContent = item.right;
            card.onclick = () => handleSelect('right', item.id, card);
            rCol.appendChild(card);
          });
        }

        function handleSelect(side, id, el) {
          if (el.classList.contains('matched')) return;

          if (side === 'left') {
            document.querySelectorAll('[data-side="left"]').forEach(c => c.classList.remove('selected'));
            selectedLeft = { id, el };
            el.classList.add('selected');
          } else {
            document.querySelectorAll('[data-side="right"]').forEach(c => c.classList.remove('selected'));
            selectedRight = { id, el };
            el.classList.add('selected');
          }

          if (selectedLeft && selectedRight) {
            attempts++;
            document.getElementById('match-attempts').textContent = 'Attempts: ' + attempts;
            if (selectedLeft.id === selectedRight.id) {
              selectedLeft.el.classList.remove('selected');
              selectedRight.el.classList.remove('selected');
              selectedLeft.el.classList.add('matched');
              selectedRight.el.classList.add('matched');
              matchedCount++;
              document.getElementById('match-score').textContent = 'Matched: ' + matchedCount + ' / ' + PAIRS.length;
              selectedLeft = null;
              selectedRight = null;

              if (matchedCount >= PAIRS.length) {
                document.getElementById('match-summary').style.display = 'block';
                document.getElementById('match-stats').textContent = 'Completed in ' + attempts + ' attempts with 100% conceptual alignment.';
              }
            } else {
              const lEl = selectedLeft.el;
              const rEl = selectedRight.el;
              lEl.classList.add('error');
              rEl.classList.add('error');
              setTimeout(() => {
                lEl.classList.remove('error', 'selected');
                rEl.classList.remove('error', 'selected');
              }, 600);
              selectedLeft = null;
              selectedRight = null;
            }
          }
        }

        initMatching();
      </script>
    </body></html>`;
  }

  // 4. CROSSWORD PUZZLE
  if (format.includes('crossword')) {
    const layout = buildClientCrosswordLayout(items);
    const layoutJson = JSON.stringify(layout || {});
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>${baseCss}
      .cw-layout { display: flex; gap: 1.5rem; width: 100%; max-width: 900px; margin: 1rem 0; flex-wrap: wrap; justify-content: center; }
      .cw-grid { display: grid; gap: 2px; background: #28303e; padding: 4px; border-radius: 6px; border: 1px solid var(--border); }
      .cw-cell { width: 34px; height: 34px; background: #13161c; position: relative; display: flex; align-items: center; justify-content: center; }
      .cw-cell.empty { background: transparent; }
      .cw-cell input { width: 100%; height: 100%; border: none; background: #1A1E26; text-align: center; color: #fff; font-size: 0.95rem; font-weight: 700; text-transform: uppercase; font-family: monospace; border-radius: 2px; outline: none; }
      .cw-cell input:focus { background: rgba(90,125,153,0.3); border: 1.5px solid #38bdf8; }
      .cw-cell.correct input { background: rgba(16,185,129,0.25); color: #34d399; }
      .cw-num { position: absolute; top: 1px; left: 2px; font-size: 8px; font-weight: 800; color: #94a3b8; pointer-events: none; }
      .cw-clues { flex: 1; min-width: 280px; max-width: 380px; background: var(--card); border: 1px solid var(--border); border-radius: 6px; padding: 1.25rem; font-size: 0.85rem; max-height: 480px; overflow-y: auto; }
      .cw-clue-item { padding: 0.4rem 0.5rem; margin-bottom: 0.4rem; border-radius: 4px; line-height: 1.4; color: #cbd5e1; }
      .cw-clue-item strong { color: #5A7D99; }
    </style></head><body>
      <div id="app">
        <header id="app-header">
          <span class="badge" style="background:#5A7D99;color:white;">Academic Crossword</span>
          <h1 style="margin-top:0.4rem;">${title}</h1>
          <p class="header-desc">Fill in the crossword puzzle using the academic clues below.</p>
        </header>
        <main id="app-main" style="width:100%;display:flex;flex-direction:column;align-items:center;">
          <div class="cw-layout">
            <div id="cw-grid-box" class="cw-grid"></div>
            <div class="cw-clues">
              <h3 style="font-size:0.95rem;font-weight:700;color:#fff;margin-bottom:0.75rem;">Across & Down Clues</h3>
              <div id="clues-list"></div>
            </div>
          </div>
          <div style="display:flex;gap:0.75rem;margin-top:1rem;">
            <button class="btn btn-primary" onclick="checkCrossword()">Check Answers</button>
            <button class="btn btn-secondary" onclick="revealCrossword()">Reveal Letters</button>
          </div>
          <div id="cw-status" style="margin-top:0.75rem;font-weight:700;font-size:0.9rem;"></div>
        </main>
      </div>
      <script>
        const LAYOUT = ${layoutJson};
        const rows = LAYOUT.gridRows || 8;
        const cols = LAYOUT.gridCols || 8;
        const words = LAYOUT.words || [];

        const gridBox = document.getElementById('cw-grid-box');
        gridBox.style.gridTemplateRows = 'repeat(' + rows + ', 34px)';
        gridBox.style.gridTemplateColumns = 'repeat(' + cols + ', 34px)';

        const cellMap = {};
        for (let r = 1; r <= rows; r++) {
          for (let c = 1; c <= cols; c++) {
            cellMap[r + '-' + c] = null;
          }
        }

        words.forEach(w => {
          for (let i = 0; i < w.word.length; i++) {
            const r = w.direction === 'down' ? w.startRow + i : w.startRow;
            const c = w.direction === 'across' ? w.startCol + i : w.startCol;
            const key = r + '-' + c;
            if (!cellMap[key]) {
              cellMap[key] = { char: w.word[i], num: i === 0 ? w.number : null };
            } else if (i === 0 && !cellMap[key].num) {
              cellMap[key].num = w.number;
            }
          }
        });

        for (let r = 1; r <= rows; r++) {
          for (let c = 1; c <= cols; c++) {
            const info = cellMap[r + '-' + c];
            const div = document.createElement('div');
            if (info) {
              div.className = 'cw-cell';
              if (info.num) {
                const numSpan = document.createElement('span');
                numSpan.className = 'cw-num';
                numSpan.textContent = info.num;
                div.appendChild(numSpan);
              }
              const inp = document.createElement('input');
              inp.maxLength = 1;
              inp.dataset.answer = info.char;
              inp.dataset.pos = r + '-' + c;
              div.appendChild(inp);
            } else {
              div.className = 'cw-cell empty';
            }
            gridBox.appendChild(div);
          }
        }

        const cluesBox = document.getElementById('clues-list');
        words.forEach(w => {
          const item = document.createElement('div');
          item.className = 'cw-clue-item';
          item.innerHTML = '<strong>' + w.number + '. ' + w.direction.toUpperCase() + ' (' + w.word.length + ' letters):</strong> ' + w.clue;
          cluesBox.appendChild(item);
        });

        function checkCrossword() {
          let correct = 0;
          let total = 0;
          document.querySelectorAll('.cw-cell input').forEach(inp => {
            total++;
            if (inp.value.toUpperCase() === inp.dataset.answer) {
              correct++;
              inp.parentElement.classList.add('correct');
            } else {
              inp.parentElement.classList.remove('correct');
            }
          });
          const status = document.getElementById('cw-status');
          if (correct === total) {
            status.innerHTML = '<span style="color:#10b981;">🎉 Perfectly Solved! 100% Accuracy!</span>';
          } else {
            status.innerHTML = '<span style="color:#f59e0b;">' + correct + ' / ' + total + ' letters correct. Keep going!</span>';
          }
        }

        function revealCrossword() {
          document.querySelectorAll('.cw-cell input').forEach(inp => {
            inp.value = inp.dataset.answer;
            inp.parentElement.classList.add('correct');
          });
        }
      </script>
    </body></html>`;
  }

  // 5. WORD SEARCH PUZZLE
  if (format.includes('wordsearch') || format.includes('word-search') || format.includes('search')) {
    const wsLayout = buildClientWordSearchLayout(items, 10);
    const wsJson = JSON.stringify(wsLayout);
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>${baseCss}
      .ws-container { display: flex; gap: 1.5rem; width: 100%; max-width: 860px; margin: 1rem 0; flex-wrap: wrap; justify-content: center; }
      .ws-grid { display: grid; grid-template-columns: repeat(10, 32px); grid-template-rows: repeat(10, 32px); gap: 2px; background: #28303e; padding: 4px; border-radius: 6px; border: 1px solid var(--border); user-select: none; }
      .ws-cell { width: 32px; height: 32px; background: #1A1E26; display: flex; align-items: center; justify-content: center; font-family: monospace; font-weight: 700; font-size: 0.95rem; color: #cbd5e1; cursor: pointer; border-radius: 2px; transition: all 0.15s; }
      .ws-cell:hover { background: rgba(90,125,153,0.3); color: #fff; }
      .ws-cell.highlight { background: #5A7D99; color: #fff; }
      .ws-cell.found { background: rgba(16,185,129,0.3); color: #34d399; font-weight: 800; }
      .ws-wordlist { flex: 1; min-width: 240px; background: var(--card); border: 1px solid var(--border); border-radius: 6px; padding: 1.25rem; }
      .ws-word-item { padding: 0.35rem 0.6rem; border-radius: 4px; margin-bottom: 0.35rem; font-size: 0.85rem; color: #cbd5e1; display: flex; justify-content: space-between; align-items: center; }
      .ws-word-item.found { text-decoration: line-through; opacity: 0.5; color: #10b981; }
    </style></head><body>
      <div id="app">
        <header id="app-header">
          <span class="badge" style="background:#5A7D99;color:white;">Academic Word Search</span>
          <h1 style="margin-top:0.4rem;">${title}</h1>
          <p class="header-desc">Find all hidden key terms in the puzzle matrix below.</p>
        </header>
        <main id="app-main" style="width:100%;display:flex;flex-direction:column;align-items:center;">
          <div class="ws-container">
            <div id="ws-grid" class="ws-grid"></div>
            <div class="ws-wordlist">
              <h3 style="font-size:0.95rem;font-weight:700;color:#fff;margin-bottom:0.75rem;">Terms to Find</h3>
              <div id="ws-words"></div>
            </div>
          </div>
        </main>
      </div>
      <script>
        const LAYOUT = ${wsJson};
        const gridEl = document.getElementById('ws-grid');
        const wordsEl = document.getElementById('ws-words');

        LAYOUT.grid.forEach((row, r) => {
          row.forEach((letter, c) => {
            const cell = document.createElement('div');
            cell.className = 'ws-cell';
            cell.textContent = letter;
            cell.dataset.r = r;
            cell.dataset.c = c;
            cell.onclick = () => {
              cell.classList.toggle('found');
            };
            gridEl.appendChild(cell);
          });
        });

        LAYOUT.words.forEach(w => {
          const div = document.createElement('div');
          div.className = 'ws-word-item';
          div.innerHTML = '<strong>' + w.word + '</strong><span style="font-size:0.75rem;color:#94a3b8;">' + w.clue + '</span>';
          wordsEl.appendChild(div);
        });
      </script>
    </body></html>`;
  }

  // 6. CLOZE DELETION & ACTIVE RECALL BLURTING
  if (format.includes('cloze') || format.includes('blurt') || format.includes('fill') || format.includes('gap')) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>${baseCss}
      .cloze-card { padding: 1.75rem; background: var(--card); border: 1.5px solid var(--border); border-radius: 6px; width: 100%; max-width: 680px; margin: 1rem 0; }
      .occlusion-mask { display: inline-block; padding: 0.2rem 0.75rem; border-radius: 4px; background: #28303e; color: #5A7D99; cursor: pointer; user-select: none; font-weight: 700; border: 1px dashed #5A7D99; transition: all 0.2s; }
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

  // 7. FEYNMAN ACTIVE RECALL & EXPLANATION GRADER
  if (format.includes('feynman') || format.includes('grader')) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>${baseCss}
      .feynman-box { width: 100%; max-width: 700px; margin: 1rem 0; background: var(--card); border: 1.5px solid var(--border); border-radius: 6px; padding: 2rem; text-align: left; }
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
            <textarea id="f-input" rows="4" placeholder="Explain the underlying mechanism and why this works in your own words..." style="width:100%;padding:0.85rem;border-radius:6px;background:#13161c;border:1px solid var(--border);color:#fff;font-size:0.9rem;resize:vertical;line-height:1.5;"></textarea>
            <div style="display:flex;gap:0.75rem;margin-top:1rem;">
              <button class="btn btn-primary w-full" style="padding:0.75rem 1.5rem;font-weight:700;" id="f-grade-btn">⚡ Evaluate Explanation</button>
              <button class="btn btn-secondary" id="f-model-btn" style="white-space:nowrap;padding:0.75rem 1.25rem;">Model Answer</button>
            </div>
            <div id="f-feedback" class="card" style="display:none;margin-top:1.25rem;background:var(--muted);border-radius:6px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.6rem;">
                <h4 style="font-weight:700;font-size:0.95rem;color:#fff;">Feynman Rubric Assessment</h4>
                <span id="f-score" style="font-weight:800;color:#10b981;font-size:1rem;"></span>
              </div>
              <div id="f-checklist" style="display:grid;gap:0.4rem;font-size:0.85rem;margin-bottom:0.75rem;"></div>
              <div id="f-model-box" style="display:none;padding:0.85rem;border-radius:6px;background:rgba(90,125,153,0.15);border:1px solid rgba(90,125,153,0.3);font-size:0.85rem;line-height:1.6;">
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

  // 8. CHRONOLOGICAL TIMELINE & MILESTONE ORDERING
  if (format.includes('timeline') || format.includes('chronol') || format.includes('ordering') || format.includes('sequence')) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>${baseCss}
      .timeline-track-container { position: relative; padding-left: 2.25rem; width: 100%; max-width: 760px; margin: 0 auto; }
      .timeline-vertical-spine { position: absolute; left: 1rem; top: 1rem; bottom: 1rem; width: 2.5px; background: linear-gradient(to bottom, var(--primary), #3D6660, #10b981); opacity: 0.35; border-radius: 2px; }
      .timeline-slot { position: relative; margin-bottom: 0.85rem; }
      .timeline-slot-node { position: absolute; left: -2.25rem; top: 1.15rem; width: 14px; height: 14px; border-radius: 4px; background: var(--background); border: 2px solid var(--primary); z-index: 2; transition: all 0.2s; }
      .timeline-slot-node.locked { border-color: #10b981; background: #10b981; }
      .timeline-card { background: var(--card); border: 1.5px solid var(--border); border-radius: 6px; padding: 1.1rem 1.35rem; cursor: grab; user-select: none; transition: all 0.2s; display: flex; align-items: center; gap: 0.85rem; position: relative; }
      .timeline-card:hover { border-color: rgba(90,125,153,0.6); }
      .timeline-card.correct-order { border-color: #10b981; background: rgba(16,185,129,0.08); }
      .drag-handle { color: #8E8E93; font-size: 1.25rem; cursor: grab; }
      .order-badge { width: 26px; height: 26px; border-radius: 4px; background: var(--muted); border: 1.5px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800; color: var(--primary); }
      .move-btn { background: #21262E; border: 1px solid var(--border); color: #CDD1D6; border-radius: 4px; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 0.7rem; }
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
                '<div class="order-badge">' + (index + 1) + '</div>' +
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

  // 9. DEFAULT 3-IN-1 REVISION KIT (CORNELL NOTES + FLASHCARDS)
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>${baseCss}
    .tab-btn.active { background: #5A7D99; color: white; font-weight: 700; border-color: #5A7D99; }
    .cornell-row { display: grid; grid-template-columns: 200px 1fr; gap: 1.25rem; padding: 1.25rem; background: var(--card); border: 1px solid var(--border); border-radius: 6px; margin-bottom: 0.85rem; }
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
          <div class="card" id="card-elem" style="min-height:280px;display:flex;flex-direction:column;justify-content:space-between;cursor:pointer;background:radial-gradient(circle at 10% 10%, rgba(90, 125, 153, 0.12) 0%, transparent 60%), #171B23;border-left:4px solid #5A7D99;border-radius:6px;padding:2rem;">
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
            <button class="btn btn-secondary" id="c-prev" style="padding:0.65rem 1.15rem;font-size:0.825rem;font-weight:600;border-radius:6px;">← Prev</button>
            <button class="btn btn-primary" id="c-flip" style="padding:0.85rem 2.25rem;font-size:0.95rem;font-weight:700;border-radius:6px;background:linear-gradient(135deg, #5A7D99 0%, #3D5E7A 100%);color:#fff;box-shadow:0 4px 18px rgba(90, 125, 153, 0.4);min-width:170px;">Flip Card</button>
            <button class="btn btn-secondary" id="c-next" style="padding:0.65rem 1.15rem;font-size:0.825rem;font-weight:600;border-radius:6px;">Next →</button>
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
