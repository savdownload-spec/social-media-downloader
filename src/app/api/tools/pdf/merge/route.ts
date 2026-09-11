import { NextResponse } from 'next/server';
import { ratelimit, getClientId } from '@/lib/ratelimit';
import { requireCredits, JOB_COST } from '@/lib/credits';
import { mergePdfs } from '@/lib/pdfService';
import { PDF_MAX_BATCH_BYTES } from '@/lib/pdfConfig';
import { cleanupPdfUploadRefs, readPdfUploadRefs, type PdfUploadRef } from '@/lib/pdfUpload';
import { checkBatchLimit } from '@/lib/batchLimitGate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const rl = await ratelimit(`pdf:${getClientId(req)}`, { limit: 20, windowSeconds: 60 });
  if (!rl.success) return NextResponse.json({ error: 'Too many requests. Please wait a minute and try again.' }, { status: 429 });
  let urls: string[] = [];
  try {
    const body = await req.json() as { files?: PdfUploadRef[] };
    const files = body.files || [];
    if (files.length < 2) return NextResponse.json({ error: 'Upload at least 2 PDF files to merge.' }, { status: 400 });

    // Plan-aware batch limit — enforced server-side; returns 403 with structured
    // error body ({ code: 'BATCH_LIMIT_EXCEEDED', allowedCount, upgradeEligible })
    // when the user's plan does not cover this file count.
    const limitViolation = await checkBatchLimit('merge-pdf', files.length);
    if (limitViolation) return limitViolation;

    if (files.reduce((sum, file) => sum + (file.size || 0), 0) > PDF_MAX_BATCH_BYTES) return NextResponse.json({ error: 'Combined file size exceeds the 150 MB batch limit.' }, { status: 413 });
    const gate = await requireCredits({ cost: JOB_COST.pdfTool });
    if (!gate.ok) return gate.response;
    const input = await readPdfUploadRefs(files); urls = input.urls;
    const result = await mergePdfs(input.buffers, input.names);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 });
    if (!(await gate.spend('PDF merge'))) return NextResponse.json({ error: 'Your balance changed before this could be charged. Please retry.' }, { status: 402 });
    const output = result.buffers[0]!;
    return new NextResponse(Buffer.from(output.buffer), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${output.name}"`, 'X-Original-Size': String(result.inputSize || 0), 'X-Output-Size': String(output.buffer.length), 'X-Page-Count': String(output.pageCount || result.pageCount || 0), 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'The PDF files could not be read. Check for encrypted or damaged files.' }, { status: 422 }); }
  finally { await cleanupPdfUploadRefs(urls); }
}
