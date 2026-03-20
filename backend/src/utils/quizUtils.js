/**
 * Resolves the correct answer text from a quiz question object.
 *
 * Handles three answer formats:
 *   - number index  (e.g. 2)
 *   - string number (e.g. "2")
 *   - letter        (e.g. "B")
 */
export function getCorrectAnswerText(q) {
  if (!q) return 'Unknown';

  // Numeric index → look up the choice
  if (typeof q.answer === 'number' && Array.isArray(q.choices)) {
    return q.choices[q.answer] || q.answer;
  }

  // String containing digits → convert and look up
  if (typeof q.answer === 'string' && /^\d+$/.test(q.answer) && Array.isArray(q.choices)) {
    const idx = Number(q.answer);
    return q.choices[idx] || q.answer;
  }

  // Single letter "A"–"D" → convert to index and look up
  if (
    typeof q.answer === 'string' &&
    q.answer.trim().length === 1 &&
    Array.isArray(q.choices)
  ) {
    const idx = q.answer.trim().toUpperCase().charCodeAt(0) - 65; // A→0, B→1 …
    if (idx >= 0 && idx < q.choices.length) return q.choices[idx];
  }

  return q.answer || 'Unknown';
}
