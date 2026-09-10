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
 * Fetches YouTube transcript and metadata using Innertube client APIs and direct timedtext.
 */
async function fetchYouTubeTranscriptAndMetadata(videoId) {
  let title = 'YouTube Lecture';
  let description = '';
  let author = '';
  let rawTranscript = '';

  // 1. Try Innertube Android Client (Highest success rate for closed captions & auto-generated ASR)
  try {
    const innertubeRes = await fetch('https://www.youtube.com/youtubei/v1/player', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip',
      },
      body: JSON.stringify({
        videoId,
        context: {
          client: {
            clientName: 'ANDROID',
            clientVersion: '19.09.37',
            hl: 'en',
            gl: 'US',
          },
        },
      }),
    });

    if (innertubeRes.ok) {
      const playerData = await innertubeRes.json();
      if (playerData.videoDetails) {
        title = playerData.videoDetails.title || title;
        author = playerData.videoDetails.author || '';
        description = playerData.videoDetails.shortDescription || '';
      }

      const captionTracks = playerData.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (Array.isArray(captionTracks) && captionTracks.length > 0) {
        // Prioritize English or auto-generated English track
        const track =
          captionTracks.find((t) => t.languageCode === 'en' || t.vssId?.includes('en')) ||
          captionTracks[0];

        if (track?.baseUrl) {
          try {
            // Attempt JSON3 format first
            const json3Res = await fetch(`${track.baseUrl}&fmt=json3`);
            if (json3Res.ok) {
              const json3Data = await json3Res.json();
              if (Array.isArray(json3Data.events)) {
                const textSegments = [];
                for (const ev of json3Data.events) {
                  if (Array.isArray(ev.segs)) {
                    const line = ev.segs.map((s) => s.utf8 || '').join('').trim();
                    if (line && !textSegments.includes(line)) {
                      textSegments.push(line);
                    }
                  }
                }
                if (textSegments.length > 0) {
                  rawTranscript = textSegments.join(' ');
                }
              }
            }
          } catch {}

          // Fallback to standard XML timedtext
          if (!rawTranscript) {
            try {
              const xmlRes = await fetch(track.baseUrl);
              if (xmlRes.ok) {
                const xmlText = await xmlRes.text();
                const cleaned = xmlText
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
                if (cleaned.length > 30) {
                  rawTranscript = cleaned;
                }
              }
            } catch {}
          }
        }
      }
    }
  } catch (err) {
    console.warn('[MULTIMODAL] Innertube Android fetch warning:', err.message);
  }

  // 2. Fallback: Try Innertube Web Client if transcript not yet found
  if (!rawTranscript) {
    try {
      const webInnertubeRes = await fetch('https://www.youtube.com/youtubei/v1/player', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        body: JSON.stringify({
          videoId,
          context: {
            client: {
              clientName: 'WEB',
              clientVersion: '2.20240313.01.00',
              hl: 'en',
              gl: 'US',
            },
          },
        }),
      });

      if (webInnertubeRes.ok) {
        const webData = await webInnertubeRes.json();
        if (webData.videoDetails && title === 'YouTube Lecture') {
          title = webData.videoDetails.title || title;
          description = webData.videoDetails.shortDescription || description;
        }

        const captionTracks = webData.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        if (Array.isArray(captionTracks) && captionTracks.length > 0) {
          const track = captionTracks.find((t) => t.languageCode === 'en' || t.vssId?.includes('en')) || captionTracks[0];
          if (track?.baseUrl) {
            const trackRes = await fetch(track.baseUrl);
            if (trackRes.ok) {
              const xmlText = await trackRes.text();
              const cleaned = xmlText
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
              if (cleaned.length > 30) {
                rawTranscript = cleaned;
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn('[MULTIMODAL] Innertube Web fetch warning:', err.message);
    }
  }

  // 3. Fallback: oEmbed metadata if title is still generic
  if (title === 'YouTube Lecture') {
    try {
      const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      if (oembedRes.ok) {
        const oembedData = await oembedRes.json();
        if (oembedData?.title) {
          title = oembedData.title;
          author = oembedData.author_name || author;
        }
      }
    } catch (err) {
      console.warn('[MULTIMODAL] YouTube oEmbed fetch error:', err.message);
    }
  }

  // Clean and deduplicate transcript words if present
  let cleanTranscript = '';
  if (rawTranscript) {
    cleanTranscript = rawTranscript
      .replace(/\[Music\]/gi, '')
      .replace(/\[Applause\]/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return {
    videoId,
    title,
    author,
    description: description.slice(0, 4000),
    transcript: cleanTranscript,
  };
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

  const { title, author, description, transcript } = await fetchYouTubeTranscriptAndMetadata(videoId);

  // Build high-yield academic digest with LLM
  let structuredSummary = '';
  try {
    const prompt = transcript
      ? `You are an elite academic curriculum architect. The student has provided a YouTube lecture titled "${title}"${author ? ` by ${author}` : ''}.
Here is the VERBATIM TRANSCRIPT of the lecture:

TRANSCRIPT:
${transcript.slice(0, 24000)}

${description ? `\nVIDEO OUTLINE / DESCRIPTION:\n${description.slice(0, 2000)}\n` : ''}

Your task: Digest this lecture transcript into a comprehensive, high-yield academic study guide and revision knowledge base.

STRUCTURE YOUR OUTPUT EXPLICITLY:
1. Core Topic Overview & Main Thesis (2-3 sentences)
2. Stage-by-Step Mechanisms & Processes (Detail every stage, inputs, outputs, catalysts, and conditions explained in the video)
3. Key Scientific / Academic Terminology (Define every major technical term used by the speaker)
4. High-Yield Exam Facts & Crucial Distinctions (Specific numbers, formulas, equations, or exam points mentioned)
5. Summary of Key Takeaways`
      : `You are an elite academic curriculum architect. The student has provided a YouTube lecture titled "${title}"${author ? ` by ${author}` : ''}.
${description ? `\nVIDEO OUTLINE & TOPICS:\n${description}\n` : ''}

Provide a comprehensive, syllabus-accurate study guide and revision summary for the academic topic covered in "${title}". Include:
1. Core Topic Overview & Governing Principles
2. Stage-by-Stage Mechanisms and Explanations
3. Key Technical Terminology & Definitions
4. High-Yield Exam Takeaways and Formulas`;

    structuredSummary = await toolGenAI(prompt, undefined, 0.2, 2500);
  } catch (err) {
    console.warn('[MULTIMODAL] YouTube LLM summary warning:', err.message);
    structuredSummary = transcript || description || `Study notes for ${title}`;
  }

  const combinedContent = [
    `# ${title}`,
    author ? `**Presenter/Channel:** ${author}` : '',
    structuredSummary,
    transcript ? `\n## Verbatim Lecture Transcript\n${transcript}` : (description ? `\n## Video Outline\n${description}` : ''),
  ].filter(Boolean).join('\n\n');

  return {
    videoId,
    title,
    author,
    extractedText: combinedContent,
    summary: structuredSummary,
    transcript: transcript || '',
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
    const aiTitle = await toolGenAI(titlePrompt, undefined, 0.2, 50);
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
    const aiTitle = await toolGenAI(titlePrompt, undefined, 0.2, 50);
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
