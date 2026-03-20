import fs from 'fs';
import PDFParser from 'pdf2json';

/**
 * Extracts plain text from an uploaded file.
 * Supports: .txt, .pdf
 */
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
export function chunkText(text, chunkSize = 1000, overlap = 100) {
  const words = text.split(/\s+/);
  const chunks = [];

  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunk = words.slice(i, i + chunkSize).join(' ').trim();
    if (chunk) chunks.push(chunk);
  }

  return chunks;
}
