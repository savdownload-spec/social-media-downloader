import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { importArticleHtml, renderContentJsonToHtml } from '@/lib/content-studio/render';
import type { TiptapNode } from '@/lib/content-studio/contentText';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const inputSchema = z.discriminatedUnion('format', [
  z.object({ format: z.literal('html'), content: z.string().max(500_000) }),
  z.object({
    format: z.literal('json'),
    content: z.object({ type: z.literal('doc'), content: z.array(z.unknown()).optional() }).passthrough(),
  }),
]);

// Conversion/preview only: this endpoint never saves or publishes a post.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if ((session?.user as { role?: string } | undefined)?.role !== 'ADMIN') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.text();
  if (body.length > 2_000_000) {
    return NextResponse.json({ ok: false, error: 'Content is too large to preview.' }, { status: 413 });
  }
  let parsed;
  try {
    parsed = inputSchema.safeParse(JSON.parse(body));
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid content.' }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Provide an article document or HTML to import.' }, { status: 400 });
  }

  try {
    const document = parsed.data.format === 'html'
      ? importArticleHtml(parsed.data.content)
      : parsed.data.content as TiptapNode;
    const html = renderContentJsonToHtml(document);
    if (!html) throw new Error('Unrenderable document');
    return NextResponse.json({ ok: true, data: { document, html } }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'Could not render this content. Check the article markup.' }, { status: 400 });
  }
}
