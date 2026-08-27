import pool from '../../shared/config/dbPool.js';
import fetch from 'node-fetch';
import { getEmbedding, getChatCompletion } from './ml.engine.js';
import { chunkTextWithParagraphs } from '../documents/document.service.js';

/**
 * Perform web search via DuckDuckGo HTML scraping / API endpoint to gather live web context.
 */
async function searchWebContext(query) {
  try {
    const encodedQuery = encodeURIComponent(query);
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (!response.ok) return [];

    const html = await response.text();
    const results = [];

    // Parse snippet matches from DuckDuckGo HTML
    const snippetRegex = /<a class="result__url"[^>]*href="([^"]+)"[^>]*>[\s\S]*?<a class="result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    let count = 0;

    while ((match = snippetRegex.exec(html)) !== null && count < 4) {
      const rawUrl = match[1];
      const rawSnippet = match[2].replace(/<[^>]+>/g, '').trim();

      // Clean up URL
      const actualUrlMatch = rawUrl.match(/uddg=([^&]+)/);
      const cleanUrl = actualUrlMatch ? decodeURIComponent(actualUrlMatch[1]) : rawUrl;

      if (rawSnippet && cleanUrl.startsWith('http')) {
        results.push({
          title: `Source: ${cleanUrl.split('/')[2] || 'Web'}`,
          url: cleanUrl,
          snippet: rawSnippet
        });
        count++;
      }
    }

    return results;
  } catch (err) {
    console.warn(`Web search failed for "${query}":`, err.message);
    return [];
  }
}

/**
 * Executes multi-stage Deep Research on a topic and ingests the synthesized report into w_embeddings.
 */
export async function executeDeepResearch({
  topic,
  depth = 'deep',
  autoIngest = true,
  userId
}) {
  if (!topic || typeof topic !== 'string') {
    throw new Error('Research topic is required');
  }
  if (!userId) {
    throw new Error('User authentication required');
  }

  const cleanTopic = topic.trim();
  const documentTitle = `[Deep Research] ${cleanTopic}`;

  // STAGE 1: Gap Analysis & Sub-query formulation
  const planPrompt = `You are a Lead AI Research Scientist.
A user needs a deep academic research report on the topic: "${cleanTopic}".
Formulate 3 specific, targeted web search queries to investigate this topic thoroughly.
Return ONLY valid JSON (no markdown formatting):
{
  "queries": ["query 1", "query 2", "query 3"]
}
`;

  let subQueries = [cleanTopic, `${cleanTopic} overview explanation`, `${cleanTopic} key concepts research`];
  try {
    const rawPlan = await getChatCompletion(planPrompt, 'llama-3.1-8b-instant', 0.2, 300, { forceJson: true });
    const parsedPlan = JSON.parse(rawPlan.replace(/```json|```/g, '').trim());
    if (Array.isArray(parsedPlan.queries) && parsedPlan.queries.length) {
      subQueries = parsedPlan.queries.slice(0, 4);
    }
  } catch (err) {
    console.warn('Query formulation fallback used:', err.message);
  }

  // STAGE 2: Web Crawl / Search Execution
  const webSources = [];
  for (const query of subQueries) {
    const searchHits = await searchWebContext(query);
    webSources.push(...searchHits);
  }

  // Deduplicate web sources by URL
  const uniqueSourcesMap = new Map();
  webSources.forEach(s => {
    if (!uniqueSourcesMap.has(s.url)) {
      uniqueSourcesMap.set(s.url, s);
    }
  });
  const uniqueSources = Array.from(uniqueSourcesMap.values()).slice(0, 8);

  // Format web findings context block
  const webContextText = uniqueSources.length > 0
    ? uniqueSources.map((s, idx) => `[Source ${idx + 1}] (${s.url}): ${s.snippet}`).join('\n\n')
    : `Topic Overview: ${cleanTopic}. Gathered academic background across fundamental principles, mechanics, real-world applications, and advancements.`;

  // STAGE 3 & 4: Deep Research Report Generation
  const reportPrompt = `You are an expert academic research assistant writing a comprehensive, publication-grade Deep Research Report.

TOPIC TO RESEARCH:
"${cleanTopic}"

GATHERED LIVE WEB SOURCES & EVIDENCE:
${webContextText}

INSTRUCTIONS:
Generate a thorough, structured Markdown research report with the following sections:
# Executive Summary
# Core Theoretical Principles
# In-Depth Analysis & Key Discoveries
# Comparative Evaluation & Tradeoffs
# Practical Applications & Future Outlook
# Key Terminology & Glossary
# References & Web Links

Write in clear, authoritative, highly informative academic tone. Ensure paragraphs are detailed and comprehensive so they can be chunked for vector semantic search.

Begin directly with "# Executive Summary":
`;

  const reportMarkdown = await getChatCompletion(reportPrompt, 'llama-3.3-70b-versatile', 0.3, 2000);

  // STAGE 5: Ingest into User Knowledge Base (w_embeddings)
  let ingestedChunks = 0;
  if (autoIngest) {
    const client = await pool.connect();
    try {
      // Clean up previous report with same title
      await client.query(
        'DELETE FROM public.w_embeddings WHERE title = $1 AND user_id = $2',
        [documentTitle, userId]
      );

      const structuredChunks = chunkTextWithParagraphs(reportMarkdown, 350);

      await client.query('BEGIN');
      for (let i = 0; i < structuredChunks.length; i++) {
        const chunkObj = structuredChunks[i];
        const embedding = await getEmbedding(chunkObj.text);

        if (Array.isArray(embedding)) {
          await client.query(
            `
            INSERT INTO public.w_embeddings
            (title, chunk_text, embedding, user_id, paragraph_index, page_number, created_at)
            VALUES ($1, $2, $3::vector, $4, $5, $6, NOW())
            `,
            [
              documentTitle,
              chunkObj.text,
              `[${embedding.join(',')}]`,
              userId,
              chunkObj.paragraphIndex || (i + 1),
              1
            ]
          );
          ingestedChunks++;
        }
      }
      await client.query('COMMIT');
    } catch (dbErr) {
      await client.query('ROLLBACK');
      console.error('Failed to ingest Deep Research report:', dbErr.message);
    } finally {
      client.release();
    }
  }

  return {
    success: true,
    documentTitle,
    topic: cleanTopic,
    reportMarkdown,
    sources: uniqueSources,
    stats: {
      subQueriesCount: subQueries.length,
      sourcesCrawled: uniqueSources.length,
      ingestedChunks
    }
  };
}
