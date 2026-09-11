import { NextResponse } from 'next/server';
import { ratelimit, getClientId } from '@/lib/ratelimit';
import { requireCredits, JOB_COST } from '@/lib/credits';
import { splitPdf, type SplitOptions } from '@/lib/pdfService';

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
    const options: SplitOptions = {
      mode: (formData.get('mode') as SplitOptions['mode']) || 'every-page',
      ranges: String(formData.get('ranges') || ''),
      separate: formData.get('separate') === 'true',
      everyN: Number(formData.get('everyN') || 0),
      targetBytes: Number(formData.get('targetBytes') || 0),
    };
    const result = await splitPdf(Buffer.from(await file.arrayBuffer()), options, file.name);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 });
    if (!(await gate.spend('PDF split'))) return NextResponse.json({ error: 'Your balance changed before this could be charged. Please retry.' }, { status: 402 });
    if (result.buffers.length === 1) {
      const output = result.buffers[0]!;
      return new NextResponse(Buffer.from(output.buffer), { headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${output.name}"`,
        'X-Page-Count': String(output.pageCount || 0),
        'Cache-Control': 'no-store',
      }});
    }
    return NextResponse.json({ ok: true, pageCount: result.pageCount, files: result.buffers.map((output) => ({ name: output.name, size: output.buffer.length, pageCount: output.pageCount, base64: Buffer.from(output.buffer).toString('base64') })) });
  } catch {
    return NextResponse.json({ error: 'Unable to process this PDF. It may be encrypted or damaged.' }, { status: 400 });
  }
}
