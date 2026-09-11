import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import { compressPdf, imagesToPdf, mergePdfs, pdfToImages, splitPdf } from './pdfService';

async function samplePdf(pageCount = 4): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i += 1) doc.addPage(i % 2 ? [842, 595] : [595, 842]);
  return Buffer.from(await doc.save());
}

describe('PDF toolkit service', () => {
  it('merges mixed page sizes and preserves the total page count', async () => {
    const first = await samplePdf(2);
    const second = await samplePdf(3);
    const result = await mergePdfs([first, second], ['first.pdf', 'second.pdf']);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.buffers[0]?.pageCount).toBe(5);
  });

  it('extracts selected pages, splits every N pages, and rejects invalid ranges', async () => {
    const source = await samplePdf(5);
    const extracted = await splitPdf(source, { mode: 'extract', ranges: '1, 3-4' }, 'source.pdf');
    expect(extracted.ok).toBe(true);
    if (extracted.ok) expect(extracted.buffers[0]?.pageCount).toBe(3);
    const grouped = await splitPdf(source, { mode: 'every-n', everyN: 2 }, 'source.pdf');
    expect(grouped.ok).toBe(true);
    if (grouped.ok) expect(grouped.buffers.map((file) => file.pageCount)).toEqual([2, 2, 1]);
    const invalid = await splitPdf(source, { mode: 'ranges', ranges: '2-9' });
    expect(invalid).toEqual({ ok: false, error: 'Page range “2-9” is outside 1-5.' });
  });

  it('only reports success when the optimized output is valid', async () => {
    const source = await samplePdf(2);
    const result = await compressPdf(source, { level: 'recommended' }, 'source.pdf');
    if (result.ok) expect(result.buffers[0]!.buffer.length).toBeLessThan(source.length);
    else expect(result.error).toContain('already optimized');
  });

  it('converts multiple image inputs to a multi-page PDF', async () => {
    const image = await sharp({ create: { width: 120, height: 80, channels: 3, background: '#3b82f6' } }).png().toBuffer();
    const result = await imagesToPdf([image, image], ['one.png', 'two.png']);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.buffers[0]?.pageCount).toBe(2);
  });

  it('renders a PDF page to JPG using the installed renderer', async () => {
    const result = await pdfToImages(await samplePdf(2), 1, 'source.pdf');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.buffers[0]?.name).toBe('source-page-01.jpg');
  });

  it('processes five independent PDF sources without combining them', async () => {
    const sources = await Promise.all(Array.from({ length: 5 }, () => samplePdf(2)));
    const outputs = [];
    for (let index = 0; index < sources.length; index += 1) {
      const result = await splitPdf(sources[index]!, { mode: 'every-n', everyN: 2 }, `source-${index + 1}.pdf`);
      expect(result.ok).toBe(true);
      if (result.ok) outputs.push(result.buffers[0]?.name);
    }
    expect(outputs).toEqual([
      'source-1-part-1-1-2.pdf',
      'source-2-part-1-1-2.pdf',
      'source-3-part-1-1-2.pdf',
      'source-4-part-1-1-2.pdf',
      'source-5-part-1-1-2.pdf',
    ]);
  });
});
