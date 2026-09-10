/**
 * normalizer.js
 *
 * Normalizes raw LLM-generated JSON items into strictly typed data objects
 * based on the target archetype (quiz, flashcards, matching, crossword, etc.).
 * Replaces fragile substring `.includes()` chains with a canonical typed dispatch table.
 */

export const CANONICAL_ARCHETYPES = {
  // Quiz
  quiz: 'quiz',
  'multiple-choice': 'quiz',
  mcq: 'quiz',
  assessment: 'quiz',
  test: 'quiz',
  // True / False
  'true-false': 'true-false',
  'true/false': 'true-false',
  // Matching
  matching: 'matching',
  match: 'matching',
  // Cloze / Fill in Blank
  'cloze-blurting': 'cloze',
  cloze: 'cloze',
  'fill-in-the-blank': 'cloze',
  'fill-in': 'cloze',
  // Timeline & Ordering
  timeline: 'timeline',
  ordering: 'timeline',
  chronology: 'timeline',
  sequence: 'timeline',
  // Puzzles
  crossword: 'crossword',
  'word-search': 'wordsearch',
  wordsearch: 'wordsearch',
  // Flashcards & Notes
  flashcards: 'flashcards',
  flashcard: 'flashcards',
  cards: 'flashcards',
  'study-notes': 'notes',
  notes: 'notes',
  summary: 'notes',
  'revision-kit': 'revision-kit',
  'feynman-grader': 'feynman',
  'branching-scenario': 'scenario',
  chat: 'chat',
};

/**
 * Resolves any alias to its canonical archetype key.
 */
export function resolveCanonicalType(rawType) {
  const clean = String(rawType || '').toLowerCase().trim();
  if (CANONICAL_ARCHETYPES[clean]) return CANONICAL_ARCHETYPES[clean];

  for (const [key, canonical] of Object.entries(CANONICAL_ARCHETYPES)) {
    if (clean.includes(key)) return canonical;
  }
  return 'flashcards';
}

/**
 * Normalizes tool items for consistent canvas rendering.
 * @param {string} toolType
 * @param {Array<object>} rawItems
 * @returns {Array<object>}
 */
export function normalizeToolItems(toolType, rawItems) {
  if (!Array.isArray(rawItems)) return [];
  const canonical = resolveCanonicalType(toolType);

  const datasetAnswers = rawItems
    .map((it) => {
      if (!it || typeof it !== 'object') return '';
      return String(
        it.answerText ||
          it.answer ||
          it.back ||
          it.definition ||
          it.right ||
          it.explanation ||
          it.term ||
          it.front ||
          ''
      ).trim();
    })
    .filter((a) => a && a.length > 1 && !['A', 'B', 'C', 'D', 'true', 'false'].includes(a.toLowerCase()));

  const cleanItems = rawItems.filter((item) => item && typeof item === 'object');

  return cleanItems.map((item, idx) => {
    const id = String(item.id || idx + 1);

    // ── 1. QUIZ & ASSESSMENT ────────────────────────────────────────────────
    if (canonical === 'quiz') {
      const question = String(
        item.question ||
          item.front ||
          item.prompt ||
          item.title ||
          item.concept ||
          item.text ||
          item.heading ||
          `Question ${idx + 1}`
      ).trim();

      const isSurveyChoice = (str) =>
        /^(i can answer this|i don't know this|not applicable|needs review|i can partially)/i.test(String(str).trim());

      let choices = Array.isArray(item.choices)
        ? item.choices
            .map((c) => (typeof c === 'string' ? c : c.text || c.choice || c.value || String(c)))
            .map((s) => String(s).trim())
            .filter((s) => s && !isSurveyChoice(s))
        : [];

      if (choices.length < 2 && Array.isArray(item.options)) {
        choices = item.options
          .map((o) => (typeof o === 'string' ? o : o.text || o.choice || o.value || String(o)))
          .map((s) => String(s).trim())
          .filter((s) => s && !isSurveyChoice(s));
      }

      const rawAnswer = String(
        item.answer ||
          item.answerText ||
          item.best ||
          item.back ||
          item.definition ||
          item.explanation ||
          ''
      ).trim();

      // Pull unique distractors from other items in the same deck
      if (choices.length < 4) {
        const correctVal =
          rawAnswer || (choices.length > 0 ? choices[0] : item.back || `Core concept ${idx + 1}`);
        if (!choices.includes(correctVal)) {
          choices.unshift(correctVal);
        }

        for (const candidate of datasetAnswers) {
          if (choices.length >= 4) break;
          if (candidate && !choices.some((c) => c.toLowerCase() === candidate.toLowerCase())) {
            choices.push(candidate);
          }
        }

        const fallbackOptions = [
          'None of the above',
          'All of the above',
          'Insufficient data to determine',
          'Alternative mechanism applies under standard conditions',
        ];
        for (const opt of fallbackOptions) {
          if (choices.length >= 4) break;
          if (!choices.includes(opt)) {
            choices.push(opt);
          }
        }
      }

      choices = Array.from(new Set(choices)).slice(0, 4);

      let answer = 'A';
      let correctText = choices[0];

      if (['A', 'B', 'C', 'D'].includes(rawAnswer.toUpperCase())) {
        answer = rawAnswer.toUpperCase();
        correctText = choices[['A', 'B', 'C', 'D'].indexOf(answer)] || choices[0];
      } else if (rawAnswer) {
        const foundIdx = choices.findIndex(
          (c) =>
            c.toLowerCase() === rawAnswer.toLowerCase() ||
            c.toLowerCase().includes(rawAnswer.toLowerCase()) ||
            rawAnswer.toLowerCase().includes(c.toLowerCase())
        );
        if (foundIdx !== -1) {
          answer = ['A', 'B', 'C', 'D'][foundIdx];
          correctText = choices[foundIdx];
        } else {
          choices[0] = rawAnswer;
          answer = 'A';
          correctText = rawAnswer;
        }
      }

      const explanation = String(
        item.explanation || item.reasoning || item.detail || item.back || `The correct answer is: ${correctText}`
      ).trim();

      return {
        id,
        question,
        choices: choices.slice(0, 4),
        answer,
        answerText: correctText,
        explanation,
        front: question,
        back: explanation,
      };
    }

    // ── 2. TRUE / FALSE ─────────────────────────────────────────────────────
    if (canonical === 'true-false') {
      const question = String(
        item.question || item.front || item.prompt || `Statement ${idx + 1}`
      ).trim();
      const rawAnswer = String(item.answer || item.answerText || item.back || '').trim();
      const isTrue =
        /^(true|t|yes|correct|1)$/i.test(rawAnswer) ||
        !/^(false|f|no|incorrect|0)$/i.test(rawAnswer);
      const answer = isTrue ? 'A' : 'B';
      const answerText = isTrue ? 'True' : 'False';
      const explanation = String(
        item.explanation || item.reasoning || item.back || `The statement is ${answerText}.`
      );

      return {
        id,
        question,
        choices: ['True', 'False'],
        answer,
        answerText,
        explanation,
        front: question,
        back: `${answerText}. ${explanation}`,
      };
    }

    // ── 3. MATCHING ─────────────────────────────────────────────────────────
    if (canonical === 'matching') {
      const left = String(
        item.left ||
          item.term ||
          item.front ||
          item.concept ||
          item.word ||
          item.title ||
          `Term ${idx + 1}`
      ).trim();
      const right = String(
        item.right ||
          item.definition ||
          item.back ||
          item.explanation ||
          item.detail ||
          item.answer ||
          `Definition ${idx + 1}`
      ).trim();
      return { id, left, right, front: left, back: right };
    }

    // ── 4. CLOZE / FILL IN THE BLANK ────────────────────────────────────────
    if (canonical === 'cloze') {
      let sentence = String(
        item.sentence || item.question || item.prompt || item.front || item.text || `Concept ${idx + 1}`
      ).trim();
      let answer = String(item.answer || item.target || item.back || '').trim();
      if (!answer && sentence.includes('[')) {
        const match = sentence.match(/\[(.*?)\]/);
        if (match) answer = match[1];
      }
      if (!answer) answer = 'key term';
      const hint = String(item.hint || item.explanation || item.detail || '').trim();
      return {
        id,
        sentence,
        answer,
        hint,
        front: sentence,
        back: answer + (hint ? ` (${hint})` : ''),
      };
    }

    // ── 5. TIMELINE / ORDERING ──────────────────────────────────────────────
    if (canonical === 'timeline') {
      const text = String(
        item.text || item.title || item.event || item.front || item.concept || `Milestone ${idx + 1}`
      ).trim();
      const position = Number(item.position || idx + 1);
      const detail = String(
        item.detail || item.explanation || item.back || item.content || item.date || ''
      ).trim();
      return { id, text, position, detail, front: text, back: detail };
    }

    // ── 6. CROSSWORD & WORD SEARCH ─────────────────────────────────────────
    if (canonical === 'crossword' || canonical === 'wordsearch') {
      const f = String(item.front || item.question || item.title || item.concept || item.left || '').trim();
      const b = String(item.back || item.answerText || item.answer || item.definition || item.explanation || item.right || '').trim();
      const directWord = String(item.word || item.term || '').trim();
      const directClue = String(item.clue || item.hint || '').trim();

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
        wordCandidate = directWord || f || b || `TERM${idx + 1}`;
        clueCandidate = directClue || b || f || `Key concept definition for term ${idx + 1}`;
      }

      let word = wordCandidate.toUpperCase().replace(/[^A-Z]/g, '');
      if (word.length > 12) {
        const firstWordOnly = wordCandidate.split(/[\s\-_]+/)[0]?.toUpperCase().replace(/[^A-Z]/g, '') || '';
        word = firstWordOnly.length >= 3 && firstWordOnly.length <= 12 ? firstWordOnly : word.slice(0, 10);
      }
      if (word.length < 3) {
        word = `ITEM${idx + 1}`;
      }

      let clue = clueCandidate.trim();
      if (!clue || clue.toUpperCase().replace(/[^A-Z]/g, '') === word) {
        clue = `Key concept definition and application for ${word}.`;
      }

      return { id, word, clue, front: word, back: clue };
    }

    // ── 8. FLASHCARDS / STUDY NOTES / REVISION KIT (DEFAULT) ────────────────
    let front = String(
      item.front ||
        item.question ||
        item.term ||
        item.title ||
        item.concept ||
        item.prompt ||
        item.heading ||
        item.name ||
        item.word ||
        item.key ||
        item.topic ||
        ''
    ).trim();
    let back = String(
      item.back ||
        item.answer ||
        item.definition ||
        item.explanation ||
        item.content ||
        item.detail ||
        item.notes ||
        item.description ||
        item.meaning ||
        item.summary ||
        item.text ||
        item.solution ||
        item.info ||
        item.value ||
        ''
    ).trim();

    if (
      front &&
      !back &&
      (front.includes(': ') || front.includes(' - ') || front.includes(' – '))
    ) {
      const sep = front.includes(': ') ? ': ' : front.includes(' – ') ? ' – ' : ' - ';
      const parts = front.split(sep);
      front = parts[0].trim();
      back = parts.slice(1).join(sep).trim();
    }

    if (!front) front = `Key Concept ${idx + 1}`;
    if (!back) back = `Details, exam significance, and key definitions for ${front}.`;

    return {
      id,
      front,
      back,
      left: front,
      right: back,
      word: front.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 10) || `ITEM${idx + 1}`,
      clue: back,
      question: front,
      answerText: back,
      explanation: back,
      choices: [back, 'Alternative perspective', 'Contrast mechanism', 'None of the above'],
      answer: 'A',
      sentence: `${front}: ______`,
      target: back.split(' ')[0] || front,
      text: front,
      position: idx + 1,
      detail: back,
    };
  });
}
