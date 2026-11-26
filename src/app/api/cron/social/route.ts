import { NextRequest, NextResponse } from 'next/server';
import { processDueJobs } from '@/lib/social/worker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const NO_STORE = { 'Cache-Control': 'private, no-store, max-age=0' };

function rejected(request: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      {
        ok: false,
        error: 'CRON_SECRET is not configured. Add it in Vercel so scheduled social posts can publish.',
      },
      { status: 503, headers: NO_STORE },
    );
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401, headers: NO_STORE });
  }
  return null;
}

/**
 * Durable queue worker endpoint. Called by the daily Vercel cron, a free
 * external scheduler (every few minutes), or the admin “Run due now” button.
 * Concurrent calls are safe: job claiming uses FOR UPDATE SKIP LOCKED.
 */
async function run(request: NextRequest) {
  const denied = rejected(request);
  if (denied) return denied;

  try {
    const results = await processDueJobs(10);
    return NextResponse.json({ ok: true, data: { processed: results.length, results } }, { headers: NO_STORE });
  } catch (error) {
    console.error('Social cron failed', error instanceof Error ? error.name : 'CronError');
    return NextResponse.json(
      { ok: false, error: 'The publishing worker could not complete.' },
      { status: 500, headers: NO_STORE },
    );
  }
}

export async function GET(request: NextRequest) {
  return run(request);
}

export async function POST(request: NextRequest) {
  return run(request);
}
