import fs from 'fs';
import PDFParser from 'pdf2json';
// pdfjs-dist: used for operator list detection ONLY (no rendering — avoids DOM dependency issues)
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

/**
 * Extracts plain text from an uploaded file.
 * Supports: .txt, .pdf
 */
// Handles extractTextFromFile logic.
export async function extractTextFromFile(filePath, mimetype) {
  if (mimetype === 'text/plain') {
    return fs.readFileSync(filePath, 'utf-8');
  }

  if (mimetype === 'application/pdf') {
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

  if (mimetype === 'application/msword') {
    throw new Error('DOC files are not supported. Please upload DOCX instead.');
  }

  throw new Error(`Unsupported file type: ${mimetype}`);
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
