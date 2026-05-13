/**
 * Smoke-test for the two-phase PDF image pipeline.
 * Run: node test-vision.mjs path/to/test.pdf
 */
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { pdf as pdfToImg } from 'pdf-to-img';
import fs from 'fs';
import path from 'path';

const pdfPath = process.argv[2];
if (!pdfPath) { console.error('Usage: node test-vision.mjs <pdf>'); process.exit(1); }

const IMAGE_OPS = new Set([
  pdfjsLib.OPS.paintImageXObject,
  pdfjsLib.OPS.paintInlineImageXObject,
  pdfjsLib.OPS.paintImageMaskXObject,
]);

// Phase 1 — detect
console.log('\n─── Phase 1: Detection ───');
const data = new Uint8Array(fs.readFileSync(path.resolve(pdfPath)));
const pdfDoc = await pdfjsLib.getDocument({ data, useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true }).promise;
console.log(`PDF has ${pdfDoc.numPages} pages`);

const imagePages = new Set();
for (let p = 1; p <= Math.min(pdfDoc.numPages, 20); p++) {
  const page = await pdfDoc.getPage(p);
  const ops = await page.getOperatorList();
  if (ops.fnArray.some(fn => IMAGE_OPS.has(fn))) { imagePages.add(p); process.stdout.write(`  Page ${p}: HAS IMAGES\n`); }
  else process.stdout.write(`  Page ${p}: text-only\n`);
  page.cleanup();
}
await pdfDoc.destroy();
console.log(`\nDetected ${imagePages.size} image page(s): [${[...imagePages].join(', ')}]`);

if (imagePages.size === 0) { console.log('No images found — done.'); process.exit(0); }

// Phase 2 — render
console.log('\n─── Phase 2: Rendering ───');
const doc = await pdfToImg(path.resolve(pdfPath), { scale: 1.5 });
let currentPage = 0;
let rendered = 0;
for await (const imgData of doc) {
  currentPage++;
  if (!imagePages.has(currentPage)) continue;
  const buf = Buffer.isBuffer(imgData) ? imgData : Buffer.from(imgData);
  console.log(`  Page ${currentPage}: rendered PNG ${Math.round(buf.length / 1024)}KB`);
  rendered++;
  if (rendered === imagePages.size) break;
}

console.log(`\n✅ Done — ${rendered} page(s) rendered successfully`);
