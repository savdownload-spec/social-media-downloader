import { PDFDocument, PageSizes } from 'pdf-lib';
import sharp from 'sharp';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { PDF_MAX_BATCH_BYTES, PDF_MAX_FILE_BYTES, PDF_MAX_PAGES } from './pdfConfig';

const execFileAsync = promisify(execFile);
export const MAX_PDF_BYTES = PDF_MAX_FILE_BYTES;
export const MAX_TOTAL_BYTES = PDF_MAX_BATCH_BYTES;
export const MAX_PAGES = PDF_MAX_PAGES;

export type PdfOutput = { name: string; buffer: Uint8Array; pageCount?: number };
export type PdfResult = { ok: true; buffers: PdfOutput[]; pageCount?: number; inputSize?: number } | { ok: false; error: string };

export type SplitOptions = {
  mode?: 'extract' | 'ranges' | 'every-n' | 'every-page' | 'size';
  ranges?: string;
  separate?: boolean;
  everyN?: number;
  targetBytes?: number;
};

export type CompressionOptions = {
  level?: 'extreme' | 'recommended' | 'balanced' | 'high' | 'custom';
  imageQuality?: number;
  removeMetadata?: boolean;
};

function friendlyError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/encrypt|password|crypt/i.test(message)) return 'This PDF is encrypted or password-protected. Please unlock it before processing.';
  if (/damaged|invalid|parse|trailer|xref|header/i.test(message)) return 'Unable to process this PDF. It may be encrypted or damaged.';
  return fallback;
}

export function validatePdf(buf: Buffer, label = 'PDF'): string | null {
  if (buf.length === 0) return `${label} is empty.`;
  if (buf.length > MAX_PDF_BYTES) return `${label} exceeds the 50 MB per-file limit.`;
  if (buf.subarray(0, 5).toString('ascii') !== '%PDF-') return `${label} is not a valid PDF file.`;
  return null;
}

export function sanitizeFilename(name: string, fallback = 'document'): string {
  const base = name.replace(/[/\\?%*:|"<>\u0000-\u001f]/g, '-').replace(/\.pdf$/i, '').trim();
  return (base || fallback).slice(0, 100);
}

async function loadPdf(buf: Buffer, label = 'PDF'): Promise<{ doc: PDFDocument } | { error: string }> {
  const validation = validatePdf(buf, label);
  if (validation) return { error: validation };
  try {
    const doc = await PDFDocument.load(buf, { updateMetadata: false, throwOnInvalidObject: false });
    if (doc.getPageCount() < 1) return { error: `${label} does not contain any pages.` };
    if (doc.getPageCount() > MAX_PAGES) return { error: `${label} exceeds the ${MAX_PAGES}-page limit.` };
    return { doc };
  } catch (error) {
    return { error: friendlyError(error, 'Unable to process this PDF. It may be encrypted or damaged.') };
  }
}

function parsePageList(input: string, pageCount: number): number[] | { error: string } {
  const pages: number[] = [];
  for (const token of input.split(',').map((part) => part.trim()).filter(Boolean)) {
    const match = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(token);
    if (!match) return { error: `Invalid page range “${token}”. Use values such as 1, 3-5, 8.` };
    const start = Number(match[1]);
    const end = Number(match[2] || match[1]);
    if (start < 1 || end < start || end > pageCount) return { error: `Page range “${token}” is outside 1-${pageCount}.` };
    for (let page = start; page <= end; page += 1) pages.push(page - 1);
  }
  if (!pages.length) return { error: 'Choose at least one page.' };
  return pages;
}

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}

async function createPdfFromPages(source: PDFDocument, pages: number[], name: string): Promise<PdfOutput> {
  const doc = await PDFDocument.create();
  const copied = await doc.copyPages(source, pages);
  copied.forEach((page) => doc.addPage(page));
  const buffer = await doc.save({ useObjectStreams: true, addDefaultPage: false });
  return { name, buffer, pageCount: pages.length };
}

export async function mergePdfs(pdfs: Buffer[], names: string[] = []): Promise<PdfResult> {
  if (pdfs.length < 2) return { ok: false, error: 'Upload at least 2 PDF files to merge.' };
  if (pdfs.reduce((sum, file) => sum + file.length, 0) > MAX_TOTAL_BYTES) return { ok: false, error: 'Combined file size exceeds the 150 MB limit.' };
  try {
    const merged = await PDFDocument.create();
    let totalPages = 0;
    for (let i = 0; i < pdfs.length; i += 1) {
      const loaded = await loadPdf(pdfs[i]!, `File ${i + 1}`);
      if ('error' in loaded) return { ok: false, error: loaded.error };
      const pages = await merged.copyPages(loaded.doc, loaded.doc.getPageIndices());
      pages.forEach((page) => merged.addPage(page));
      totalPages += pages.length;
    }
    const buffer = await merged.save({ useObjectStreams: true, addDefaultPage: false });
    return { ok: true, buffers: [{ name: 'merged-document.pdf', buffer, pageCount: totalPages }], pageCount: totalPages, inputSize: pdfs.reduce((sum, file) => sum + file.length, 0) };
  } catch (error) {
    return { ok: false, error: friendlyError(error, 'The PDFs could not be merged.') };
  }
}

export async function splitPdf(pdf: Buffer, options: SplitOptions = {}, sourceName = 'document'): Promise<PdfResult> {
  const loaded = await loadPdf(pdf);
  if ('error' in loaded) return { ok: false, error: loaded.error };
  const total = loaded.doc.getPageCount();
  const mode = options.mode || (options.ranges ? 'ranges' : 'every-page');
  let groups: number[][];
  if (mode === 'extract') {
    const parsed = parsePageList(options.ranges || '', total);
    if ('error' in parsed) return { ok: false, error: parsed.error };
    groups = options.separate ? parsed.map((page) => [page]) : [parsed];
  } else if (mode === 'ranges') {
    const ranges = (options.ranges || '').split(',').map((part) => part.trim()).filter(Boolean);
    if (!ranges.length) return { ok: false, error: 'Add at least one range, such as 1-3, 5, 8-10.' };
    const parsedGroups: number[][] = [];
    for (const range of ranges) {
      const parsed = parsePageList(range, total);
      if ('error' in parsed) return { ok: false, error: parsed.error };
      parsedGroups.push(parsed);
    }
    groups = parsedGroups;
  } else if (mode === 'every-n') {
    const n = Math.floor(options.everyN || 0);
    if (n < 1 || n > total) return { ok: false, error: `Enter a page interval from 1 to ${total}.` };
    groups = chunks(Array.from({ length: total }, (_, index) => index), n);
  } else if (mode === 'size') {
    const target = Math.floor(options.targetBytes || 0);
    if (target < 64 * 1024) return { ok: false, error: 'Choose a target size of at least 64 KB.' };
    groups = [];
    let current: number[] = [];
    for (let page = 0; page < total; page += 1) {
      current.push(page);
      const probe = await createPdfFromPages(loaded.doc, current, 'probe.pdf');
      if (current.length > 1 && probe.buffer.length > target) {
        current.pop();
        groups.push(current);
        current = [page];
      }
    }
    if (current.length) groups.push(current);
  } else {
    groups = Array.from({ length: total }, (_, index) => [index]);
  }
  try {
    const base = sanitizeFilename(sourceName);
    const outputs: PdfOutput[] = [];
    for (let index = 0; index < groups.length; index += 1) {
      const group = groups[index]!;
      const first = group[0]! + 1;
      const last = group[group.length - 1]! + 1;
      const name = groups.length === total && group.length === 1 ? `${base}-page-${String(first).padStart(2, '0')}.pdf` : `${base}-part-${index + 1}-${first}-${last}.pdf`;
      outputs.push(await createPdfFromPages(loaded.doc, group, name));
    }
    return { ok: true, buffers: outputs, pageCount: total, inputSize: pdf.length };
  } catch (error) {
    return { ok: false, error: friendlyError(error, 'The PDF could not be split.') };
  }
}

export async function compressPdf(pdf: Buffer, options: CompressionOptions = {}, sourceName = 'document'): Promise<PdfResult> {
  const loaded = await loadPdf(pdf);
  if ('error' in loaded) return { ok: false, error: loaded.error };
  try {
    const level = options.level || 'recommended';
    const removeMetadata = options.removeMetadata ?? (level === 'extreme' || level === 'recommended');
    if (removeMetadata) {
      loaded.doc.setTitle('');
      loaded.doc.setAuthor('');
      loaded.doc.setSubject('');
      loaded.doc.setKeywords([]);
      loaded.doc.setProducer('SavDown PDF Tools');
      loaded.doc.setCreator('SavDown PDF Tools');
    }
    const buffer = await loaded.doc.save({ useObjectStreams: level !== 'high', addDefaultPage: false, objectsPerTick: level === 'extreme' ? 100 : 50 });
    if (buffer.length >= pdf.length && level !== 'custom') {
      return { ok: false, error: 'This PDF is already optimized; no smaller safe result was produced.' };
    }
    return { ok: true, buffers: [{ name: `${sanitizeFilename(sourceName)}-compressed.pdf`, buffer, pageCount: loaded.doc.getPageCount() }], pageCount: loaded.doc.getPageCount(), inputSize: pdf.length };
  } catch (error) {
    return { ok: false, error: friendlyError(error, 'This PDF could not be safely optimized.') };
  }
}

export async function imagesToPdf(images: Buffer[], names: string[] = []): Promise<PdfResult> {
  if (!images.length) return { ok: false, error: 'Please upload at least one image.' };
  if (images.length > 50) return { ok: false, error: 'Maximum 50 images per conversion.' };
  if (images.reduce((sum, image) => sum + image.length, 0) > MAX_TOTAL_BYTES) return { ok: false, error: 'Combined image size exceeds the 150 MB limit.' };
  try {
    const doc = await PDFDocument.create();
    for (const image of images) {
      const metadata = await sharp(image).metadata();
      const width = metadata.width || 800;
      const height = metadata.height || 600;
      const jpeg = await sharp(image).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
      const embedded = await doc.embedJpg(jpeg);
      const [pageW, pageH] = PageSizes.A4;
      const scale = Math.min(pageW / width, pageH / height, 1);
      const page = doc.addPage(PageSizes.A4);
      page.drawImage(embedded, { x: (pageW - width * scale) / 2, y: (pageH - height * scale) / 2, width: width * scale, height: height * scale });
    }
    const buffer = await doc.save({ useObjectStreams: true, addDefaultPage: false });
    return { ok: true, buffers: [{ name: 'images-to-pdf.pdf', buffer, pageCount: images.length }], pageCount: images.length };
  } catch (error) {
    return { ok: false, error: friendlyError(error, 'One or more images could not be converted.') };
  }
}

export async function pdfToImages(pdf: Buffer, maxPages = 10, sourceName = 'document'): Promise<PdfResult> {
  const loaded = await loadPdf(pdf);
  if ('error' in loaded) return { ok: false, error: loaded.error };
  const pageLimit = Math.min(Math.max(1, Math.floor(maxPages)), loaded.doc.getPageCount(), 50);
  const workDir = await mkdtemp(join(tmpdir(), 'savdown-pdf-'));
  const input = join(workDir, 'input.pdf');
  const prefix = join(workDir, 'page');
  try {
    await writeFile(input, pdf, { mode: 0o600 });
    await execFileAsync('pdftoppm', ['-jpeg', '-r', '144', '-f', '1', '-l', String(pageLimit), '-singlefile', input, prefix]);
    const outputs: PdfOutput[] = [];
    const single = await readFile(`${prefix}.jpg`);
    outputs.push({ name: `${sanitizeFilename(sourceName)}-page-01.jpg`, buffer: single });
    // pdftoppm -singlefile is intentionally used for a one-page conversion; render the remainder individually.
    for (let page = 2; page <= pageLimit; page += 1) {
      const pagePrefix = join(workDir, `page-${page}`);
      await execFileAsync('pdftoppm', ['-jpeg', '-r', '144', '-f', String(page), '-l', String(page), '-singlefile', input, pagePrefix]);
      outputs.push({ name: `${sanitizeFilename(sourceName)}-page-${String(page).padStart(2, '0')}.jpg`, buffer: await readFile(`${pagePrefix}.jpg`) });
    }
    return { ok: true, buffers: outputs, pageCount: loaded.doc.getPageCount(), inputSize: pdf.length };
  } catch (error) {
    return { ok: false, error: friendlyError(error, 'Could not render this PDF as images.') };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
