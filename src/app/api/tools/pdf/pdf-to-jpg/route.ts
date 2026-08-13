/**
 * POST /api/tools/pdf/pdf-to-jpg
 * Body: multipart/form-data
 *   file      – PDF file
 *   maxPages  – max pages to render (default 10)
 *
 * Response:
 *   Single page  → JPEG binary
 *   Multi pages  → JSON { ok, files: [{ name, base64 }] }
 */
import { NextResponse } from 'next/server';
import { ratelimit, getClientId } from '@/lib/ratelimit';
import { requireCredits, JOB_COST } from '@/lib/credits';
import { pdfToImages } from '@/lib/pdfService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const ip = getClientId(req);
  const rl = await ratelimit(`pdf:${ip}`, { limit: 10, windowSeconds: 60 });
  if (!rl.success) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });


  // Credits are spent only once the job below succeeds.
  const gate = await requireCredits({ cost: JOB_COST.pdfTool });
  if (!gate.ok) return gate.response;
  let formData: FormData;
  try { formData = await req.formData(); }
  catch { return NextResponse.json({ error: 'Expected multipart/form-data.' }, { status: 400 }); }

  const fileEntry = formData.get('file') as File | null;
  if (!fileEntry) return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });

  const maxPages = parseInt(formData.get('maxPages') as string || '10', 10);
  const buf      = Buffer.from(await fileEntry.arrayBuffer());
  const result   = await pdfToImages(buf, maxPages);

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 });

  // The conversion succeeded, so both response shapes below are billable.
  await gate.spend('PDF to JPG');

  if (result.buffers.length === 1) {
    return new NextResponse(Buffer.from(result.buffers[0]!.buffer), {
      headers: {
        'Content-Type':        'image/jpeg',
        'Content-Disposition': `attachment; filename="${result.buffers[0]!.name}"`,
        'Cache-Control':       'no-store',
      },
    });
  }

  const files = result.buffers.map((b) => ({
    name:   b.name,
    size:   b.buffer.length,
    base64: Buffer.from(b.buffer).toString('base64'),
  }));
  return NextResponse.json({ ok: true, files });
}
