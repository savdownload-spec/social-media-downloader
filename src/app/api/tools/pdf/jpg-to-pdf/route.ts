/**
 * POST /api/tools/pdf/jpg-to-pdf
 * Body: multipart/form-data — one or more "files" fields (images)
 * Response: PDF binary
 */
import { NextResponse } from 'next/server';
import { ratelimit, getClientId } from '@/lib/ratelimit';
import { imagesToPdf } from '@/lib/pdfService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const ip = getClientId(req);
  const rl = await ratelimit(`pdf:${ip}`, { limit: 20, windowSeconds: 60 });
  if (!rl.success) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });

  let formData: FormData;
  try { formData = await req.formData(); }
  catch { return NextResponse.json({ error: 'Expected multipart/form-data.' }, { status: 400 }); }

  const fileEntries = formData.getAll('files') as File[];
  if (!fileEntries.length) return NextResponse.json({ error: 'No files uploaded.' }, { status: 400 });

  const buffers = await Promise.all(
    fileEntries.map(async (f) => Buffer.from(await f.arrayBuffer())),
  );

  const result = await imagesToPdf(buffers);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 });

  return new NextResponse(Buffer.from(result.buffers[0]!.buffer), {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': 'attachment; filename="document.pdf"',
      'Cache-Control':       'no-store',
    },
  });
}
