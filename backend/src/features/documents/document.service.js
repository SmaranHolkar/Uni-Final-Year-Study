import fs from 'fs';
import path from 'path';
import PDFParser from 'pdf2json';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { parseOffice } from 'officeparser';



/**
 * Extracts plain text from any uploaded file (.pptx, .ppt, .docx, .doc, .pdf, .txt, .md, .csv, .json).
 */
export async function extractTextFromFile(filePath, mimetype) {
  const ext = path.extname(filePath).toLowerCase();

  // 1. Text & Code / Markdown files
  if (
    mimetype === 'text/plain' ||
    mimetype === 'text/markdown' ||
    mimetype === 'text/csv' ||
    mimetype === 'application/json' ||
    ['.txt', '.md', '.csv', '.json', '.log'].includes(ext)
  ) {
    return fs.readFileSync(filePath, 'utf-8');
  }

  // 2. Word Documents (.docx) via Mammoth
  if (
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === '.docx'
  ) {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      if (result.value && result.value.trim().length > 20) {
        return result.value;
      }
    } catch (err) {
      console.warn('[DOC SERVICE] Mammoth failed, falling back to officeparser:', err.message);
    }
  }

  // 3. PowerPoint Presentations (.pptx, .ppt), Word (.doc), Excel (.xlsx) via officeparser
  if (
    mimetype.includes('presentation') ||
    mimetype.includes('powerpoint') ||
    mimetype.includes('msword') ||
    ['.pptx', '.ppt', '.docx', '.doc', '.xlsx', '.xls'].includes(ext)
  ) {
    try {
      const extractedText = await parseOffice(filePath);
      const cleanText = String(extractedText || '').trim();
      if (cleanText.length > 20) {
        return cleanText;
      }
    } catch (err) {
      console.warn('[DOC SERVICE] officeparser failed:', err.message);
    }
  }

  // 4. PDF files via PDFParser
  if (mimetype === 'application/pdf' || ext === '.pdf') {
    return new Promise((resolve, reject) => {
      const pdfParser = new PDFParser(null, 1);

      pdfParser.on('pdfParser_dataError', (errData) => {
        console.error('PDF Parser Error:', errData.parserError);
        reject(new Error(errData.parserError));
      });

      pdfParser.on('pdfParser_dataReady', () => {
        const text = pdfParser.getRawTextContent();
        resolve(text);
      });

      try {
        const buffer = fs.readFileSync(filePath);
        pdfParser.parseBuffer(buffer);
      } catch (err) {
        reject(err);
      }
    });
  }

  // 5. Final fallback attempt with officeparser for any binary office format
  try {
    const fallbackText = await parseOffice(filePath);
    if (fallbackText && String(fallbackText).trim().length > 20) {
      return String(fallbackText);
    }
  } catch {
    // ignore fallback error
  }

  // If text file fallback
  try {
    const rawText = fs.readFileSync(filePath, 'utf-8');
    if (rawText && rawText.trim().length > 20) return rawText;
  } catch {
    // ignore
  }

  throw new Error(`Could not extract readable text from file type: ${mimetype} (${ext})`);
}


/**
 * Splits text into overlapping word-based chunks for embedding.
 */
// Handles chunkText logic.
export function chunkText(text, chunkSize = 1000, overlap = 100) {
  const words = text.split(/\s+/);
  const chunks = [];

  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunk = words.slice(i, i + chunkSize).join(' ').trim();
    if (chunk) chunks.push(chunk);
  }

  return chunks;
}

/**
 * Splits document text into paragraph-delimited chunks with exact paragraph indices.
 * Returns array of objects: { text, paragraphIndex, pageNumber }
 */
export function chunkTextWithParagraphs(text, maxWordsPerChunk = 350) {
  if (!text || typeof text !== 'string') return [];

  const rawParagraphs = text
    .split(/(?:\r?\n){2,}/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  if (rawParagraphs.length === 0) {
    const singlePara = text.trim();
    if (!singlePara) return [];
    return [{ text: singlePara, paragraphIndex: 1, pageNumber: 1 }];
  }

  const chunks = [];
  let currentChunkWords = [];
  let currentStartParaIndex = 1;

  rawParagraphs.forEach((para, idx) => {
    const paraNum = idx + 1;
    const words = para.split(/\s+/).filter(Boolean);

    if (words.length === 0) return;

    if (words.length > maxWordsPerChunk) {
      if (currentChunkWords.length > 0) {
        chunks.push({
          text: currentChunkWords.join(' '),
          paragraphIndex: currentStartParaIndex,
          pageNumber: Math.ceil(currentStartParaIndex / 5) || 1
        });
        currentChunkWords = [];
      }
      for (let w = 0; w < words.length; w += maxWordsPerChunk) {
        const subWords = words.slice(w, w + maxWordsPerChunk);
        chunks.push({
          text: subWords.join(' '),
          paragraphIndex: paraNum,
          pageNumber: Math.ceil(paraNum / 5) || 1
        });
      }
      currentStartParaIndex = paraNum + 1;
      return;
    }

    if (currentChunkWords.length + words.length > maxWordsPerChunk) {
      chunks.push({
        text: currentChunkWords.join(' '),
        paragraphIndex: currentStartParaIndex,
        pageNumber: Math.ceil(currentStartParaIndex / 5) || 1
      });
      currentChunkWords = [...words];
      currentStartParaIndex = paraNum;
    } else {
      if (currentChunkWords.length === 0) {
        currentStartParaIndex = paraNum;
      }
      currentChunkWords.push(...words);
    }
  });

  if (currentChunkWords.length > 0) {
    chunks.push({
      text: currentChunkWords.join(' '),
      paragraphIndex: currentStartParaIndex,
      pageNumber: Math.ceil(currentStartParaIndex / 5) || 1
    });
  }

  return chunks;
}


// Maximum number of image-containing pages to send to Vision API per upload.
const MAX_VISION_PAGES = 20;

// Image-drawing operators in the pdfjs-dist operator set.
const IMAGE_OPS = new Set([
  pdfjsLib.OPS.paintImageXObject,
  pdfjsLib.OPS.paintInlineImageXObject,
  pdfjsLib.OPS.paintImageMaskXObject,
]);

/**
 * Phase 1 — Detect which pages in a PDF contain embedded images.
 * Uses pdfjs-dist operator list (parse-only, no canvas rendering).
 * @returns {Promise<Set<number>>} Set of 1-indexed page numbers that have images.
 */
async function detectImagePages(filePath) {
  const imagePageNums = new Set();
  try {
    const data = new Uint8Array(fs.readFileSync(filePath));
    const pdfDoc = await pdfjsLib.getDocument({
      data,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    }).promise;

    const pageLimit = Math.min(pdfDoc.numPages, MAX_VISION_PAGES);
    for (let pageNum = 1; pageNum <= pageLimit; pageNum++) {
      try {
        const page = await pdfDoc.getPage(pageNum);
        const opList = await page.getOperatorList();
        if (opList.fnArray.some(fn => IMAGE_OPS.has(fn))) {
          imagePageNums.add(pageNum);
        }
        page.cleanup();
      } catch (e) {
        console.warn(`[VISION] Detection failed for page ${pageNum}:`, e.message);
      }
    }
    await pdfDoc.destroy();
  } catch (err) {
    console.warn('[VISION] detectImagePages failed:', err.message);
  }
  return imagePageNums;
}

/**
 * Phase 2 — Render specific pages to PNG using pdf-to-img.
 * pdf-to-img is purpose-built for Node.js and handles all DOM/canvas
 * compatibility issues that pdfjs-dist rendering has in non-browser environments.
 * @param {string} filePath
 * @param {Set<number>} pageNumSet - Pages to render
 * @returns {Promise<Array<{pageNum: number, base64: string}>>}
 */
async function renderPages(filePath, pageNumSet) {
  const results = [];
  try {
    // Dynamic import keeps pdf-to-img out of the module graph until needed
    const { pdf } = await import('pdf-to-img');
    const doc = await pdf(filePath, { scale: 1.5 });

    let currentPage = 0;
    for await (const imageData of doc) {
      currentPage++;
      if (!pageNumSet.has(currentPage)) continue;

      const buf = Buffer.isBuffer(imageData) ? imageData : Buffer.from(imageData);

      // Groq Vision base64 limit is 4 MB per image
      if (buf.length > 4 * 1024 * 1024) {
        console.warn(`[VISION] Page ${currentPage} PNG too large (${Math.round(buf.length / 1024)}KB), skipping`);
        continue;
      }

      results.push({ pageNum: currentPage, base64: buf.toString('base64') });

      // Stop early once we've collected all target pages
      if (results.length === pageNumSet.size) break;
    }
  } catch (err) {
    console.warn('[VISION] renderPages failed:', err.message);
  }
  return results;
}

/**
 * Detects and renders image-containing PDF pages to base64 PNGs.
 * Phase 1: pdfjs-dist detects which pages have embedded images (operator list, no rendering).
 * Phase 2: pdf-to-img renders only those pages (Node.js-native canvas, no browser APIs needed).
 *
 * @param {string} filePath - Absolute path to the uploaded PDF
 * @returns {Promise<Array<{pageNum: number, base64: string}>>}
 */
export async function extractPageImages(filePath) {
  // Phase 1: find pages with images
  const imagePageNums = await detectImagePages(filePath);

  if (imagePageNums.size === 0) {
    return [];
  }

  console.log(`[VISION] Image pages detected: [${[...imagePageNums].join(', ')}]`);

  // Phase 2: render only those pages
  return renderPages(filePath, imagePageNums);
}
