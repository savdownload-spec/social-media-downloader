import { NextResponse } from 'next/server';
import { ratelimit, getClientId } from '@/lib/ratelimit';
import { requireCredits, JOB_COST } from '@/lib/credits';
import { compressPdf, type CompressionOptions, MAX_TOTAL_BYTES } from '@/lib/pdfService';
import { PDF_MAX_BATCH_FILES } from '@/lib/pdfConfig';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const rl = await ratelimit(`pdf:${getClientId(req)}`, { limit: 10, windowSeconds: 60 });
  if (!rl.success) return NextResponse.json({ error: 'Too many requests. Please wait a minute and try again.' }, { status: 429 });
  try {
    const formData = await req.formData();
    const entries = formData.getAll('files').filter((entry): entry is File => entry instanceof File);
    if (!entries.length) return NextResponse.json({ error: 'Choose at least one PDF file.' }, { status: 400 });
    if (entries.length > PDF_MAX_BATCH_FILES) return NextResponse.json({ error: `You can process up to ${PDF_MAX_BATCH_FILES} PDFs at once.` }, { status: 413 });
    const total = entries.reduce((sum, file) => sum + file.size, 0);
    if (total > MAX_TOTAL_BYTES) return NextResponse.json({ error: 'Combined file size exceeds the 150 MB batch limit.' }, { status: 413 });
    const gate = await requireCredits({ cost: entries.length * JOB_COST.pdfTool });
    if (!gate.ok) return gate.response;
    const options: CompressionOptions = { level: (formData.get('level') as CompressionOptions['level']) || 'recommended', imageQuality: Number(formData.get('imageQuality') || 0) || undefined, removeMetadata: formData.get('removeMetadata') !== 'false' };
    const results = [];
    for (const file of entries) {
      const input = Buffer.from(await file.arrayBuffer());
      const result = await compressPdf(input, options, file.name);
      if (!result.ok) { results.push({ name: file.name, status: 'failed', error: result.error }); continue; }
      if (!(await gate.spend(`PDF compress: ${file.name}`))) { results.push({ name: file.name, status: 'failed', error: 'Credit balance changed before this file could be charged. Please retry.' }); continue; }
      const output = result.buffers[0]!;
      results.push({ name: output.name, sourceName: file.name, status: 'completed', originalSize: input.length, size: output.buffer.length, pageCount: output.pageCount, base64: Buffer.from(output.buffer).toString('base64') });
    }
    return NextResponse.json({ ok: true, completed: results.filter((result) => result.status === 'completed').length, total: results.length, files: results });
  } catch {
    return NextResponse.json({ error: 'Unable to read the PDF batch. Please try again with valid PDF files.' }, { status: 400 });
  }
}
