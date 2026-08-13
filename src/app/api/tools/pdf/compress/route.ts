/**
 * POST /api/tools/pdf/compress
 * Body: multipart/form-data, single "file" field
 * Response: compressed PDF binary
 */
import { NextResponse } from 'next/server';
import { ratelimit, getClientId } from '@/lib/ratelimit';
import { compressPdf } from '@/lib/pdfService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const ip = getClientId(req);
  const rl = await ratelimit(`pdf:${ip}`, { limit: 20, windowSeconds: 60 });
  if (!rl.success) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });

  let formData: FormData;
  try { formData = await req.formData(); }
  catch { return NextResponse.json({ error: 'Expected multipart/form-data.' }, { status: 400 }); }

  const fileEntry = formData.get('file') as File | null;
  if (!fileEntry) return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });

  const buf    = Buffer.from(await fileEntry.arrayBuffer());
  const result = await compressPdf(buf);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 });

  const origName = fileEntry.name.replace(/[/\\?%*:|"<>]/g, '-');
  const outName  = origName.replace(/\.pdf$/i, '-compressed.pdf');

  return new NextResponse(Buffer.from(result.buffers[0]!.buffer), {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${outName}"`,
      'X-Original-Size':     String(buf.length),
      'X-Output-Size':       String(result.buffers[0]!.buffer.length),
      'Cache-Control':       'no-store',
    },
  });
}
