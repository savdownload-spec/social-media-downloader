import { NextResponse } from 'next/server';
import { ratelimit, getClientId } from '@/lib/ratelimit';
import { requireCredits, JOB_COST } from '@/lib/credits';
import { splitPdf, type SplitOptions } from '@/lib/pdfService';
import { PDF_MAX_BATCH_FILES, PDF_MAX_BATCH_BYTES } from '@/lib/pdfConfig';
import { cleanupPdfUploadRefs, readPdfUploadRefs, type PdfUploadRef } from '@/lib/pdfUpload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const rl = await ratelimit(`pdf:${getClientId(req)}`, { limit: 10, windowSeconds: 60 });
  if (!rl.success) return NextResponse.json({ error: 'Too many requests. Please wait a minute and try again.' }, { status: 429 });
  let urls: string[] = [];
  try {
    const body = await req.json() as { files?: PdfUploadRef[]; mode?: SplitOptions['mode']; ranges?: string; separate?: boolean; everyN?: number; targetBytes?: number };
    const files = body.files || [];
    if (!files.length) return NextResponse.json({ error: 'Choose at least one PDF file.' }, { status: 400 });
    if (files.length > PDF_MAX_BATCH_FILES) return NextResponse.json({ error: `You can process up to ${PDF_MAX_BATCH_FILES} PDFs at once.` }, { status: 413 });
    if (files.reduce((sum, file) => sum + (file.size || 0), 0) > PDF_MAX_BATCH_BYTES) return NextResponse.json({ error: 'Combined file size exceeds the 150 MB batch limit.' }, { status: 413 });
    const gate = await requireCredits({ cost: files.length * JOB_COST.pdfTool });
    if (!gate.ok) return gate.response;
    const input = await readPdfUploadRefs(files); urls = input.urls;
    const options: SplitOptions = { mode: body.mode || 'every-page', ranges: body.ranges || '', separate: body.separate, everyN: body.everyN, targetBytes: body.targetBytes };
    const results = [];
    for (let index = 0; index < input.buffers.length; index += 1) {
      const result = await splitPdf(input.buffers[index]!, options, input.names[index]);
      if (!result.ok) { results.push({ sourceName: input.names[index], status: 'failed', error: result.error }); continue; }
      if (!(await gate.spend(`PDF split: ${input.names[index]}`))) { results.push({ sourceName: input.names[index], status: 'failed', error: 'Credit balance changed before this file could be charged. Please retry.' }); continue; }
      results.push({ sourceName: input.names[index], status: 'completed', outputs: result.buffers.map((output) => ({ name: output.name, group: input.names[index], size: output.buffer.length, pageCount: output.pageCount, base64: Buffer.from(output.buffer).toString('base64') })) });
    }
    return NextResponse.json({ ok: true, completed: results.filter((result) => result.status === 'completed').length, total: results.length, files: results });
  } catch { return NextResponse.json({ error: 'Unable to process this PDF batch. Some files may be encrypted or damaged.' }, { status: 422 }); }
  finally { await cleanupPdfUploadRefs(urls); }
}
