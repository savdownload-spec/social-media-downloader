/**
 * POST /api/tools/pdf/merge
 * Body: multipart/form-data — multiple fields named "files"
 * Response: merged PDF
 */
import { NextResponse } from 'next/server';
import { ratelimit, getClientId } from '@/lib/ratelimit';
import { mergePdfs } from '@/lib/pdfService';

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
  if (fileEntries.length < 2) {
    return NextResponse.json({ error: 'Upload at least 2 PDF files.' }, { status: 400 });
  }

  const buffers = await Promise.all(
    fileEntries.map(async (f) => Buffer.from(await f.arrayBuffer())),
  );

  const result = await mergePdfs(buffers);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 });

  return new NextResponse(Buffer.from(result.buffers[0]!.buffer), {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': 'attachment; filename="merged.pdf"',
      'Cache-Control':       'no-store',
    },
  });
}
