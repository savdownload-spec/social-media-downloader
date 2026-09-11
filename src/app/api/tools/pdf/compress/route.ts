import { NextResponse } from 'next/server';
import { ratelimit, getClientId } from '@/lib/ratelimit';
import { requireCredits, JOB_COST } from '@/lib/credits';
import { compressPdf, type CompressionOptions } from '@/lib/pdfService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const rl = await ratelimit(`pdf:${getClientId(req)}`, { limit: 20, windowSeconds: 60 });
  if (!rl.success) return NextResponse.json({ error: 'Too many requests. Please wait a minute and try again.' }, { status: 429 });
  const gate = await requireCredits({ cost: JOB_COST.pdfTool });
  if (!gate.ok) return gate.response;
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Choose a PDF file first.' }, { status: 400 });
    const options: CompressionOptions = {
      level: (formData.get('level') as CompressionOptions['level']) || 'recommended',
      imageQuality: Number(formData.get('imageQuality') || 0) || undefined,
      removeMetadata: formData.get('removeMetadata') !== 'false',
    };
    const input = Buffer.from(await file.arrayBuffer());
    const result = await compressPdf(input, options, file.name);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 });
    if (!(await gate.spend('PDF compress'))) return NextResponse.json({ error: 'Your balance changed before this could be charged. Please retry.' }, { status: 402 });
    const output = result.buffers[0]!;
    return new NextResponse(Buffer.from(output.buffer), { headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${output.name}"`,
      'X-Original-Size': String(input.length),
      'X-Output-Size': String(output.buffer.length),
      'X-Page-Count': String(output.pageCount || 0),
      'X-Compression-Level': options.level || 'recommended',
      'Cache-Control': 'no-store',
    }});
  } catch {
    return NextResponse.json({ error: 'Unable to optimize this PDF. It may be encrypted or damaged.' }, { status: 400 });
  }
}
