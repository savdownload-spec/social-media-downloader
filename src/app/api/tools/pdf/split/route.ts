/**
 * POST /api/tools/pdf/split
 * Body: multipart/form-data
 *   file   – PDF file
 *   ranges – optional page ranges string e.g. "1-3,5,7-9"
 *
 * Response: JSON { files: [{ name, url }] } pointing to /api/proxy
 * (For simplicity, returns the first split file directly when only one result,
 *  or a JSON manifest when multiple.)
 */
import { NextResponse } from 'next/server';
import { ratelimit, getClientId } from '@/lib/ratelimit';
import { requireCredits, JOB_COST } from '@/lib/credits';
import { splitPdf } from '@/lib/pdfService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const ip = getClientId(req);
  const rl = await ratelimit(`pdf:${ip}`, { limit: 20, windowSeconds: 60 });
  if (!rl.success) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });


  // Credits are spent only once the job below succeeds.
  const gate = await requireCredits({ cost: JOB_COST.pdfTool });
  if (!gate.ok) return gate.response;
  let formData: FormData;
  try { formData = await req.formData(); }
  catch { return NextResponse.json({ error: 'Expected multipart/form-data.' }, { status: 400 }); }

  const fileEntry = formData.get('file') as File | null;
  if (!fileEntry) return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });

  const ranges = (formData.get('ranges') as string | null) || undefined;
  const buf    = Buffer.from(await fileEntry.arrayBuffer());
  const result = await splitPdf(buf, ranges);

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 });

  // The split succeeded, so both response shapes below are billable.
  if (!(await gate.spend('PDF split'))) {
    return NextResponse.json(
      { error: 'Your balance changed before this could be charged. Please retry.' },
      { status: 402 },
    );
  }

  // Single result → return binary directly
  if (result.buffers.length === 1) {
    return new NextResponse(Buffer.from(result.buffers[0]!.buffer), {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="${result.buffers[0]!.name}"`,
        'Cache-Control':       'no-store',
      },
    });
  }

  // Multiple → return each as base64 JSON (frontend renders download buttons)
  const files = result.buffers.map((b) => ({
    name:   b.name,
    size:   b.buffer.length,
    base64: Buffer.from(b.buffer).toString('base64'),
  }));

  return NextResponse.json({ ok: true, files });
}
