import fetch from 'node-fetch';
import fs from 'fs';
import FormData from 'form-data';
import { toolGenAI } from './ml.engine.js';
import { validateSafeUrl } from '../../shared/utils/ssrfGuard.js';

const GROQ_KEY = process.env.GROQ_API;

/**
 * Validates and extracts a YouTube Video ID safely.
 */
export function extractYouTubeId(url) {
  if (!url || typeof url !== 'string') return null;
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = url.match(regExp);
  return match && match[1] ? match[1] : null;
}

/**
 * Ingest YouTube Video: extracts transcript / caption or metadata, then summarizes into study context.
 */
export async function ingestYouTubeVideo(youtubeUrl) {
  const ssrfCheck = validateSafeUrl(youtubeUrl, ['youtube.com', 'youtu.be', 'www.youtube.com', 'm.youtube.com']);
  if (!ssrfCheck.isValid) {
    throw new Error(`SSRF Security Guard: ${ssrfCheck.error}`);
  }

  const videoId = extractYouTubeId(youtubeUrl);
  if (!videoId) {
    throw new Error('Invalid YouTube URL. Please provide a standard YouTube video link (e.g., https://www.youtube.com/watch?v=... or https://youtu.be/...)');
  }


  let videoTitle = 'YouTube Lecture';
  let rawTranscript = '';

  // 1. Fetch video metadata via oEmbed (safe, no API key needed)
  try {
    const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    if (oembedRes.ok) {
      const oembedData = await oembedRes.json();
      if (oembedData?.title) {
        videoTitle = oembedData.title;
      }
    }
  } catch (err) {
    console.warn('[MULTIMODAL] YouTube oEmbed fetch error:', err.message);
  }

  // 2. Fetch transcript via public timedtext or fallback page scrape
  try {
    const videoPageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    const pageHtml = await videoPageRes.text();

    // Look for captionTracks JSON in ytInitialPlayerResponse
    const playerResponseMatch = pageHtml.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
    if (playerResponseMatch && playerResponseMatch[1]) {
      const playerResponse = JSON.parse(playerResponseMatch[1]);
      const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (Array.isArray(captionTracks) && captionTracks.length > 0) {
        const englishTrack = captionTracks.find(t => t.languageCode === 'en' || t.vssId?.includes('en')) || captionTracks[0];
        if (englishTrack?.baseUrl) {
          const trackRes = await fetch(englishTrack.baseUrl);
          const xmlText = await trackRes.text();
          // Extract text from XML nodes <text ...>content</text>
          const cleanText = xmlText
            .replace(/<text[^>]*>/g, ' ')
            .replace(/<\/text>/g, '\n')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&#39;/g, "'")
            .replace(/&quot;/g, '"')
            .replace(/<[^>]+>/g, '')
            .replace(/\s+/g, ' ')
            .trim();

          if (cleanText.length > 50) {
            rawTranscript = cleanText;
          }
        }
      }
    }
  } catch (tErr) {
    console.warn('[MULTIMODAL] Transcript extraction fallback:', tErr.message);
  }

  // 3. Process with LLM to build a comprehensive study summary
  const prompt = rawTranscript
    ? `You are an expert academic educator. Transform the following transcript from the YouTube lecture "${videoTitle}" into a thorough, comprehensive study guide.\n\nTRANSCRIPT:\n${rawTranscript.slice(0, 20000)}\n\nInclude:\n1. Core Topic & Key Takeaways\n2. Key Definitions & Terminology\n3. Step-by-Step Concepts and Explanations\n4. Critical Exam Facts & Formulas`
    : `You are an expert academic educator. Provide a comprehensive, in-depth academic study guide and revision summary for the YouTube lecture topic: "${videoTitle}". Include core definitions, step-by-step principles, and key exam concepts.`;

  const structuredSummary = await toolGenAI(prompt, undefined, 0.2, 2200);

  return {
    videoId,
    title: videoTitle,
    extractedText: structuredSummary || rawTranscript || videoTitle,
    summary: structuredSummary,
    source: 'youtube',
  };
}

/**
 * Ingest Audio File: transcribes audio using Groq Whisper API (whisper-large-v3).
 */
export async function transcribeAudioFile(filePath, originalFilename = 'lecture_audio.mp3') {
  if (!GROQ_KEY) {
    throw new Error('GROQ_API key is not configured on server.');
  }

  if (!fs.existsSync(filePath)) {
    throw new Error('Audio file not found on server.');
  }

  const formData = new FormData();
  formData.append('file', fs.createReadStream(filePath), {
    filename: originalFilename,
  });
  formData.append('model', 'whisper-large-v3-turbo');
  formData.append('response_format', 'verbose_json');
  formData.append('temperature', '0.0');

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_KEY}`,
      ...formData.getHeaders(),
    },
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq Whisper transcription failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const transcriptionText = data.text || '';

  if (!transcriptionText.trim()) {
    throw new Error('Could not transcribe audio. Audio may be silent or in an unsupported format.');
  }

  // Derive a smart title from the transcription
  const titlePrompt = `Generate a concise 3-6 word academic title for this lecture transcription:\n\n"${transcriptionText.slice(0, 1000)}"\n\nReturn ONLY the title string.`;
  let title = 'Lecture Audio Recording';
  try {
    const aiTitle = await toolGenAI(titlePrompt, 'llama-3.1-8b-instant', 0.2, 50);
    if (aiTitle && aiTitle.trim()) {
      title = aiTitle.replace(/["\n]/g, '').trim();
    }
  } catch {
    // fallback
  }

  return {
    title,
    transcriptionText,
    extractedText: transcriptionText,
    duration: data.duration || 0,
    source: 'audio',
  };
}

/**
 * Ingest Image / Handwritten Notes: OCR using Groq Vision API.
 */
export async function extractTextFromImage(filePath, originalFilename = 'notes.jpg') {
  if (!GROQ_KEY) {
    throw new Error('GROQ_API key is not configured on server.');
  }

  if (!fs.existsSync(filePath)) {
    throw new Error('Image file not found on server.');
  }

  const imageBuffer = fs.readFileSync(filePath);
  const base64Image = imageBuffer.toString('base64');
  const mimeType = originalFilename.endsWith('.png') ? 'image/png' : 'image/jpeg';
  const dataUri = `data:${mimeType};base64,${base64Image}`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.2-11b-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'You are an expert OCR transcription engine. Extract ALL handwritten notes, formulas, equations, text, and diagrams from this image verbatim into clean, structured Markdown. Do not summarize — transcribe completely.',
            },
            {
              type: 'image_url',
              image_url: { url: dataUri },
            },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 3000,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq Vision OCR error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const extractedText = data.choices?.[0]?.message?.content || '';

  if (!extractedText.trim()) {
    throw new Error('No text or notes could be recognized from the image.');
  }

  // Derive academic title
  const titlePrompt = `Generate a concise 3-6 word academic title for this handwritten notes transcription:\n\n"${extractedText.slice(0, 1000)}"\n\nReturn ONLY the title string.`;
  let title = 'Scanned Study Notes';
  try {
    const aiTitle = await toolGenAI(titlePrompt, 'llama-3.1-8b-instant', 0.2, 50);
    if (aiTitle && aiTitle.trim()) {
      title = aiTitle.replace(/["\n]/g, '').trim();
    }
  } catch {
    // fallback
  }

  return {
    title,
    extractedText,
    source: 'ocr_image',
  };
}
