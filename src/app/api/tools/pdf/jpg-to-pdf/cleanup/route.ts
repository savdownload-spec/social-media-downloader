import { NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  try {
    const body = await req.json() as { urls?: string[] };
    const urls = (body.urls || []).filter((url) => {
      try { return new URL(url).protocol === 'https:' && new URL(url).pathname.includes('/pdf-jobs/'); }
      catch { return false; }
    });
    if (urls.length) await del(urls);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Cleanup failed.' }, { status: 400 });
  }
}
