import { NextResponse } from 'next/server';
import { ratelimit, getClientId } from '@/lib/ratelimit';
import { requireCredits, JOB_COST } from '@/lib/credits';
import { imagesToPdf } from '@/lib/pdfService';
import { PDF_MAX_BATCH_BYTES } from '@/lib/pdfConfig';
import { cleanupPdfUploadRefs, readPdfUploadRefs, type PdfUploadRef } from '@/lib/pdfUpload';
import { checkBatchLimit } from '@/lib/batchLimitGate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const rl = await ratelimit(`pdf:jpg-to-pdf:${getClientId(req)}`, { limit: 20, windowSeconds: 60 });
  if (!rl.success) return NextResponse.json({ error: 'Too many requests. Please wait a minute and try again.' }, { status: 429 });
  let urls: string[] = [];
  try {
    const body = await req.json() as { files?: PdfUploadRef[] };
    const files = body.files || [];
    if (!files.length) return NextResponse.json({ error: 'Upload at least one image.' }, { status: 400 });

    const limitViolation = await checkBatchLimit('jpg-to-pdf', files.length);
    if (limitViolation) return limitViolation;

    if (files.reduce((sum, file) => sum + (file.size || 0), 0) > PDF_MAX_BATCH_BYTES) {
      return NextResponse.json({ error: 'Combined image size exceeds the 150 MB batch limit.' }, { status: 413 });
    }

    const gate = await requireCredits({ cost: JOB_COST.pdfTool });
    if (!gate.ok) return gate.response;

    // Use readPdfUploadRefs — applies the same isTrustedBlobUrl SSRF guard as all other PDF routes.
    // The previous direct get() call accepted any https:// URL without hostname validation.
    const input = await readPdfUploadRefs(files);
    urls = input.urls;

    const result = await imagesToPdf(input.buffers, input.names);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 });

    if (!(await gate.spend('JPG to PDF'))) {
      return NextResponse.json({ error: 'Your balance changed before this could be charged. Please retry.' }, { status: 402 });
    }

    const output = result.buffers[0]!;
    return new NextResponse(Buffer.from(output.buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${output.name}"`,
        'X-Page-Count': String(output.pageCount || 0),
        'X-Output-Size': String(output.buffer.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json({ error: 'One or more images could not be read. Check the file type and retry.' }, { status: 422 });
  } finally {
    // cleanupPdfUploadRefs filters to /pdf-jobs/ path prefix — prevents accidental deletion of other blobs
    await cleanupPdfUploadRefs(urls);
  }
}
