import { NextResponse } from 'next/server';
import { ratelimit, getClientId } from '@/lib/ratelimit';
import { requireCredits, JOB_COST } from '@/lib/credits';
import { imagesToPdf } from '@/lib/pdfService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const rl = await ratelimit(`pdf:${getClientId(req)}`, { limit: 20, windowSeconds: 60 });
  if (!rl.success) return NextResponse.json({ error: 'Too many requests. Please wait a minute and try again.' }, { status: 429 });
  const gate = await requireCredits({ cost: JOB_COST.pdfTool });
  if (!gate.ok) return gate.response;
  try {
    const formData = await req.formData();
    const entries = formData.getAll('files').filter((entry): entry is File => entry instanceof File);
    if (!entries.length) return NextResponse.json({ error: 'Choose at least one image.' }, { status: 400 });
    const buffers = await Promise.all(entries.map(async (file) => Buffer.from(await file.arrayBuffer())));
    const result = await imagesToPdf(buffers, entries.map((file) => file.name));
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 });
    if (!(await gate.spend('JPG to PDF'))) return NextResponse.json({ error: 'Your balance changed before this could be charged. Please retry.' }, { status: 402 });
    const output = result.buffers[0]!;
    return new NextResponse(Buffer.from(output.buffer), { headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${output.name}"`,
      'X-Page-Count': String(output.pageCount || 0),
      'Cache-Control': 'no-store',
    }});
  } catch {
    return NextResponse.json({ error: 'One or more images could not be converted. Please check the file types.' }, { status: 400 });
  }
}
