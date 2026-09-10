/**
 * aiParser.js
 * 
 * Unified, resilient JSON & structured text parser for LLM responses.
 * Handles markdown code fences, thinking tags, unclosed arrays, truncated streams,
 * and balanced JSON object salvage.
 */

/**
 * Safely parses any AI response text into a JavaScript object or array.
 * @param {string} text - Raw text from LLM response
 * @returns {any | null} Parsed JSON structure or null
 */
export function safeParse(text) {
  if (!text || typeof text !== 'string') return null;

  // 1. Strip thinking tags and outer fences
  const cleaned = text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, '$1')
    .trim();

  // 2. Direct JSON parse of cleaned text
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {}

  // 3. Try extracting JSON array from cleaned text
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    const arrayStr = cleaned.slice(firstBracket, lastBracket + 1);
    try { return JSON.parse(arrayStr); } catch {}
    try {
      const fixed = arrayStr.replace(/,\s*]/g, ']').replace(/,\s*}/g, '}');
      return JSON.parse(fixed);
    } catch {}
  }

  // 4. Try extracting JSON object from cleaned text
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const objStr = cleaned.slice(firstBrace, lastBrace + 1);
    try { return JSON.parse(objStr); } catch {}
    try {
      const fixed = objStr.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
      return JSON.parse(fixed);
    } catch {}
  }

  // 5. Try parsing JSON markdown code blocks from RAW text
  const jsonBlockMatches = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/gi);
  if (jsonBlockMatches) {
    for (const block of jsonBlockMatches) {
      const inner = block.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
      try {
        const parsed = JSON.parse(inner);
        if (parsed && (Array.isArray(parsed) || typeof parsed === 'object')) return parsed;
      } catch {}
    }
  }

  // 6. Try extracting any JSON object from the raw text
  const rawFirstBrace = text.indexOf('{');
  const rawLastBrace = text.lastIndexOf('}');
  if (rawFirstBrace !== -1 && rawLastBrace > rawFirstBrace) {
    const rawObjStr = text.slice(rawFirstBrace, rawLastBrace + 1);
    try {
      const parsed = JSON.parse(rawObjStr);
      if (parsed && (Array.isArray(parsed) || typeof parsed === 'object')) return parsed;
    } catch {}
  }

  // 7. Auto-balance truncated JSON stream
  const targetCandidate = firstBrace !== -1 ? cleaned.slice(firstBrace) : (rawFirstBrace !== -1 ? text.slice(rawFirstBrace) : '');
  if (targetCandidate) {
    let candidate = targetCandidate.replace(/,\s*$/, '');
    const openBraces = (candidate.match(/{/g) || []).length;
    const closeBraces = (candidate.match(/}/g) || []).length;
    const openBrackets = (candidate.match(/\[/g) || []).length;
    const closeBrackets = (candidate.match(/\]/g) || []).length;
    if (openBrackets > closeBrackets) candidate += ']'.repeat(openBrackets - closeBrackets);
    if (openBraces > closeBraces) candidate += '}'.repeat(openBraces - closeBraces);
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {}
  }

  // 8. Salvage all balanced JSON item objects from unclosed items arrays
  const salvagedItems = [];
  let innerStart = -1;
  let innerDepth = 0;
  const itemsPos = text.indexOf('"items"');
  const scanStart = itemsPos !== -1 ? itemsPos : 0;

  for (let i = scanStart; i < text.length; i++) {
    if (text[i] === '{') {
      if (innerDepth === 0) innerStart = i;
      innerDepth++;
    } else if (text[i] === '}' && innerStart !== -1) {
      innerDepth--;
      if (innerDepth === 0) {
        const candidate = text.slice(innerStart, i + 1);
        try {
          const obj = JSON.parse(candidate);
          if (obj && typeof obj === 'object' && (obj.question || obj.front || obj.term || obj.left || obj.title || obj.word)) {
            salvagedItems.push(obj);
          }
        } catch {}
        innerStart = -1;
      }
    }
  }

  // 9. Structured text fallback recovery (question blocks)
  const structuredItems = [...salvagedItems];
  const qBlocks = text.split(/(?:\*Question\s*\d+:|Question\s*\d+:|\*Item\s*\d+:|Item\s*\d+:)/i).slice(1);
  if (qBlocks.length > 0 && structuredItems.length === 0) {
    for (let i = 0; i < qBlocks.length; i++) {
      const block = qBlocks[i];
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      const qText = lines[0]?.replace(/^[\*\-\:\s]+/, '');

      let choices = [];
      let answer = '';
      let explanation = '';

      for (const l of lines) {
        if (/^(?:-\s*)?(?:Options|Choices):\s*/i.test(l)) {
          const rawOpts = l.replace(/^(?:-\s*)?(?:Options|Choices):\s*/i, '').replace(/[\[\]"]/g, '');
          choices = rawOpts.split(/,\s*/).map(s => s.trim()).filter(Boolean);
        } else if (/^(?:-\s*)?Answer:\s*/i.test(l)) {
          answer = l.replace(/^(?:-\s*)?Answer:\s*/i, '').replace(/[\[\]"]/g, '').trim();
        } else if (/^(?:-\s*)?Explanation:\s*/i.test(l)) {
          explanation = l.replace(/^(?:-\s*)?Explanation:\s*/i, '').trim();
        }
      }

      if (qText) {
        structuredItems.push({
          id: String(i + 1),
          question: qText,
          choices: choices.length >= 2 ? choices : ['Option A', 'Option B', 'Option C', 'Option D'],
          answer: answer || choices[0] || 'Option A',
          explanation: explanation || 'Key exam concept verified.',
          front: qText,
          back: (answer ? `Answer: ${answer}. ` : '') + (explanation || '')
        });
      }
    }
  }

  const toolTypeMatch = text.match(/"toolType"\s*:\s*"([^"]+)"/);
  const titleMatch = text.match(/"title"\s*:\s*"([^"]+)"/);
  const descMatch = text.match(/"description"\s*:\s*"([^"]+)"/);
  const chatMatch = text.match(/"chatResponse"\s*:\s*"([^"]+)"/);

  if (structuredItems.length > 0 || toolTypeMatch) {
    return {
      toolType: toolTypeMatch ? toolTypeMatch[1] : (text.toLowerCase().includes('quiz') ? 'quiz' : 'flashcards'),
      title: titleMatch ? titleMatch[1] : 'Interactive Revision Tool',
      description: descMatch ? descMatch[1] : 'Customized study revision tool',
      chatResponse: chatMatch ? chatMatch[1] : 'Here is your customized interactive study tool!',
      items: structuredItems
    };
  }

  return null;
}
