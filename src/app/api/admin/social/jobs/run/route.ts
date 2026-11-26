import { NextRequest, NextResponse } from 'next/server';
import { requireSocialApi, SOCIAL_NO_STORE_HEADERS } from '@/lib/social/api-auth';
import { processDueJobs } from '@/lib/social/worker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** "Run due now" — the manual recovery trigger next to the scheduled worker. */
export async function POST(request: NextRequest) {
  const auth = await requireSocialApi(request, 'publish');
  if (!auth.ok) return auth.response;

  const results = await processDueJobs(10);
  return NextResponse.json(
    { ok: true, data: { processed: results.length, results } },
    { headers: SOCIAL_NO_STORE_HEADERS },
  );
}
