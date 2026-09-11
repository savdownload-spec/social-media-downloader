import { NextResponse } from 'next/server';
import { ratelimit, getClientId } from '@/lib/ratelimit';
import { requireCredits, JOB_COST } from '@/lib/credits';
import { pdfToImages, MAX_TOTAL_BYTES, sanitizeFilename } from '@/lib/pdfService';
import { PDF_MAX_BATCH_FILES } from '@/lib/pdfConfig';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const rl = await ratelimit(`pdf:${getClientId(req)}`, { limit: 5, windowSeconds: 60 });
  if (!rl.success) return NextResponse.json({ error: 'Too many requests. Please wait a minute and try again.' }, { status: 429 });
  try {
    const formData = await req.formData();
    const entries = formData.getAll('files').filter((entry): entry is File => entry instanceof File);
    if (!entries.length) return NextResponse.json({ error: 'Choose at least one PDF file.' }, { status: 400 });
    if (entries.length > PDF_MAX_BATCH_FILES) return NextResponse.json({ error: `You can process up to ${PDF_MAX_BATCH_FILES} PDFs at once.` }, { status: 413 });
    if (entries.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_BYTES) return NextResponse.json({ error: 'Combined file size exceeds the 150 MB batch limit.' }, { status: 413 });
    const gate = await requireCredits({ cost: entries.length * JOB_COST.pdfTool });
    if (!gate.ok) return gate.response;
    const maxPages = Math.min(50, Math.max(1, Number(formData.get('maxPages') || 10)));
    const results = [];
    for (const file of entries) {
      const result = await pdfToImages(Buffer.from(await file.arrayBuffer()), maxPages, file.name);
      if (!result.ok) { results.push({ sourceName: file.name, status: 'failed', error: result.error }); continue; }
      if (!(await gate.spend(`PDF to JPG: ${file.name}`))) { results.push({ sourceName: file.name, status: 'failed', error: 'Credit balance changed before this file could be charged. Please retry.' }); continue; }
      const group = sanitizeFilename(file.name);
      results.push({ sourceName: file.name, status: 'completed', outputs: result.buffers.map((output) => ({ name: output.name, group, size: output.buffer.length, base64: Buffer.from(output.buffer).toString('base64') })) });
    }
    return NextResponse.json({ ok: true, completed: results.filter((result) => result.status === 'completed').length, total: results.length, files: results });
  } catch {
    return NextResponse.json({ error: 'Could not render this PDF batch. Some files may be encrypted or damaged.' }, { status: 422 });
  }
}
