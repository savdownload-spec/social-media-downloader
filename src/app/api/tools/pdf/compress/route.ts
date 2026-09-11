import { NextResponse } from 'next/server';
import { ratelimit, getClientId } from '@/lib/ratelimit';
import { requireCredits, JOB_COST } from '@/lib/credits';
import { compressPdf, type CompressionOptions } from '@/lib/pdfService';
import { PDF_MAX_BATCH_BYTES } from '@/lib/pdfConfig';
import { cleanupPdfUploadRefs, readPdfUploadRefs, type PdfUploadRef } from '@/lib/pdfUpload';
import { checkBatchLimit } from '@/lib/batchLimitGate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const rl = await ratelimit(`pdf:${getClientId(req)}`, { limit: 10, windowSeconds: 60 });
  if (!rl.success) return NextResponse.json({ error: 'Too many requests. Please wait a minute and try again.' }, { status: 429 });
  let urls: string[] = [];
  try {
    const body = await req.json() as { files?: PdfUploadRef[]; level?: CompressionOptions['level']; imageQuality?: number; removeMetadata?: boolean };
    const files = body.files || [];
    if (!files.length) return NextResponse.json({ error: 'Choose at least one PDF file.' }, { status: 400 });

    // Plan-aware batch limit check.
    const limitViolation = await checkBatchLimit('compress-pdf', files.length, req);
    if (limitViolation) return limitViolation;

    if (files.reduce((sum, file) => sum + (file.size || 0), 0) > PDF_MAX_BATCH_BYTES) return NextResponse.json({ error: 'Combined file size exceeds the 150 MB batch limit.' }, { status: 413 });
    const gate = await requireCredits({ cost: files.length * JOB_COST.pdfTool });
    if (!gate.ok) return gate.response;
    const input = await readPdfUploadRefs(files); urls = input.urls;
    const options: CompressionOptions = { level: body.level || 'recommended', imageQuality: body.imageQuality, removeMetadata: body.removeMetadata !== false };
    const results = [];
    for (let index = 0; index < input.buffers.length; index += 1) {
      const result = await compressPdf(input.buffers[index]!, options, input.names[index]);
      if (!result.ok) { results.push({ sourceName: input.names[index], status: 'failed', error: result.error }); continue; }
      if (!(await gate.spend(`PDF compress: ${input.names[index]}`))) { results.push({ sourceName: input.names[index], status: 'failed', error: 'Credit balance changed before this file could be charged. Please retry.' }); continue; }
      const output = result.buffers[0]!;
      results.push({ name: output.name, sourceName: input.names[index], status: 'completed', originalSize: input.buffers[index]!.length, size: output.buffer.length, pageCount: output.pageCount, base64: Buffer.from(output.buffer).toString('base64') });
    }
    return NextResponse.json({ ok: true, completed: results.filter((result) => result.status === 'completed').length, total: results.length, files: results });
  } catch { return NextResponse.json({ error: 'Unable to read the PDF batch. Check for encrypted or damaged files.' }, { status: 422 }); }
  finally { await cleanupPdfUploadRefs(urls); }
}
