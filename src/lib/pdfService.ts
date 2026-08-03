/**
 * PDF processing service using pdf-lib (MIT).
 *
 * Architecture: API Route → pdfService.ts → pdf-lib
 *
 * Supported operations:
 *   - merge:      combine multiple PDFs into one
 *   - split:      extract specific page ranges
 *   - compress:   re-save with optimised settings (reduces some bloat)
 *   - jpg-to-pdf: embed one or more images into a PDF
 *   - pdf-to-jpg: render PDF pages as JPEG images (via sharp / canvas)
 */
import { PDFDocument, PageSizes } from 'pdf-lib';
import sharp from 'sharp';

const MAX_PDF_BYTES  = 50 * 1024 * 1024;  // 50 MB per file
const MAX_TOTAL_BYTES = 150 * 1024 * 1024; // 150 MB combined

/* ─── types ─────────────────────────────────────────────────── */

export type PdfResult =
  | { ok: true;  buffers: { name: string; buffer: Uint8Array }[] }
  | { ok: false; error: string };

/* ─── validate ──────────────────────────────────────────────── */

function validatePdf(buf: Buffer, label: string): string | null {
  if (buf.length > MAX_PDF_BYTES) return `${label} exceeds 50 MB limit.`;
  // Check PDF magic bytes %PDF
  if (buf.slice(0, 4).toString('ascii') !== '%PDF') return `${label} is not a valid PDF file.`;
  return null;
}

/* ─── merge ─────────────────────────────────────────────────── */

export async function mergePdfs(pdfs: Buffer[]): Promise<PdfResult> {
  if (pdfs.length < 2) return { ok: false, error: 'Please upload at least 2 PDF files to merge.' };

  const totalSize = pdfs.reduce((s, b) => s + b.length, 0);
  if (totalSize > MAX_TOTAL_BYTES) return { ok: false, error: 'Combined file size exceeds 150 MB.' };

  for (let i = 0; i < pdfs.length; i++) {
    const err = validatePdf(pdfs[i]!, `File ${i + 1}`);
    if (err) return { ok: false, error: err };
  }

  try {
    const merged = await PDFDocument.create();
    for (const pdfBuf of pdfs) {
      const src = await PDFDocument.load(pdfBuf, { ignoreEncryption: true });
      const pages = await merged.copyPages(src, src.getPageIndices());
      pages.forEach(p => merged.addPage(p));
    }
    const bytes = await merged.save();
    return { ok: true, buffers: [{ name: 'merged.pdf', buffer: bytes }] };
  } catch (err) {
    return { ok: false, error: `Merge failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/* ─── split ─────────────────────────────────────────────────── */

/**
 * Split a PDF by page ranges. ranges is a string like "1-3,5,7-9"
 * If ranges is empty/undefined, each page becomes its own file.
 */
export async function splitPdf(pdf: Buffer, ranges?: string): Promise<PdfResult> {
  const err = validatePdf(pdf, 'PDF');
  if (err) return { ok: false, error: err };

  try {
    const src = await PDFDocument.load(pdf, { ignoreEncryption: true });
    const totalPages = src.getPageCount();

    // Parse ranges string → array of [start, end] (0-indexed)
    let pageGroups: number[][] = [];

    if (ranges?.trim()) {
      for (const part of ranges.split(',').map(s => s.trim()).filter(Boolean)) {
        const [a, b] = part.split('-').map(s => parseInt(s.trim(), 10));
        const start = Math.max(1, a!) - 1;
        const end   = Math.min(totalPages, b ?? a!) - 1;
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          pageGroups.push(range(start, end));
        }
      }
    }

    // No ranges → split every page individually
    if (!pageGroups.length) {
      pageGroups = Array.from({ length: totalPages }, (_, i) => [i]);
    }

    const buffers: { name: string; buffer: Uint8Array }[] = [];
    for (let gi = 0; gi < pageGroups.length; gi++) {
      const doc = await PDFDocument.create();
      const pages = await doc.copyPages(src, pageGroups[gi]!);
      pages.forEach(p => doc.addPage(p));
      const bytes = await doc.save();
      const label = pageGroups.length === totalPages
        ? `page-${pageGroups[gi]![0]! + 1}`
        : `part-${gi + 1}`;
      buffers.push({ name: `${label}.pdf`, buffer: bytes });
    }

    return { ok: true, buffers };
  } catch (err) {
    return { ok: false, error: `Split failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/* ─── compress ──────────────────────────────────────────────── */

/**
 * "Compress" by re-serialising the PDF without object streams.
 * True image re-compression requires a rasteriser; pdf-lib cannot
 * recompress embedded images, but it can strip redundant PDF structures.
 */
export async function compressPdf(pdf: Buffer): Promise<PdfResult> {
  const err = validatePdf(pdf, 'PDF');
  if (err) return { ok: false, error: err };

  try {
    const doc = await PDFDocument.load(pdf, { ignoreEncryption: true });
    // Save with objectsPerTick=50 to reduce overhead in large files
    const bytes = await doc.save({ useObjectStreams: true });
    return { ok: true, buffers: [{ name: 'compressed.pdf', buffer: bytes }] };
  } catch (err) {
    return { ok: false, error: `Compress failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/* ─── jpg-to-pdf ────────────────────────────────────────────── */

export async function imagesToPdf(images: Buffer[]): Promise<PdfResult> {
  if (!images.length) return { ok: false, error: 'Please upload at least one image.' };
  if (images.length > 50) return { ok: false, error: 'Maximum 50 images per conversion.' };

  try {
    const doc = await PDFDocument.create();

    for (const imgBuf of images) {
      // Use sharp to get metadata and normalise to JPEG
      const { width = 800, height = 600 } = await sharp(imgBuf).metadata();

      // Convert to JPEG for maximum pdf-lib compatibility
      const jpegBuf = await sharp(imgBuf).jpeg({ quality: 90 }).toBuffer();
      const pdfImg  = await doc.embedJpg(jpegBuf);

      // A4 in points (595.28 × 841.89); scale image to fit
      const [pageW, pageH] = PageSizes.A4;
      const scale = Math.min(pageW! / (width || 800), pageH! / (height || 600), 1);

      const page = doc.addPage(PageSizes.A4);
      page.drawImage(pdfImg, {
        x: (pageW! - (width || 800) * scale) / 2,
        y: (pageH! - (height || 600) * scale) / 2,
        width:  (width  || 800) * scale,
        height: (height || 600) * scale,
      });
    }

    const bytes = await doc.save();
    return { ok: true, buffers: [{ name: 'document.pdf', buffer: bytes }] };
  } catch (err) {
    return { ok: false, error: `Conversion failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/* ─── pdf-to-jpg ────────────────────────────────────────────── */

/**
 * Convert PDF pages to JPEGs using sharp's PDF input support (requires
 * libvips compiled with poppler). Falls back to a stub if not supported.
 */
export async function pdfToImages(pdf: Buffer, maxPages = 10): Promise<PdfResult> {
  const err = validatePdf(pdf, 'PDF');
  if (err) return { ok: false, error: err };

  try {
    const doc = await PDFDocument.load(pdf, { ignoreEncryption: true });
    const pageCount = Math.min(doc.getPageCount(), maxPages);

    const buffers: { name: string; buffer: Uint8Array }[] = [];

    for (let i = 0; i < pageCount; i++) {
      try {
        // sharp supports PDF with poppler; each page = one input
        const imgBuf = await sharp(pdf, { page: i })
          .resize({ width: 1200 })
          .jpeg({ quality: 90 })
          .toBuffer();
        buffers.push({ name: `page-${i + 1}.jpg`, buffer: imgBuf });
      } catch {
        // If poppler not available, return a helpful error
        return {
          ok: false,
          error:
            'PDF to image conversion requires libvips with poppler support. ' +
            'This feature is available in the Docker deployment.',
        };
      }
    }

    if (!buffers.length) return { ok: false, error: 'Could not render any pages from this PDF.' };
    return { ok: true, buffers };
  } catch (err) {
    return { ok: false, error: `Conversion failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}
