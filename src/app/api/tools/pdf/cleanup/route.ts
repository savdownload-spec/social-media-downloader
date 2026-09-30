/**
 * GET /api/tools/pdf/cleanup
 *
 * Deletes abandoned PDF upload blobs that were uploaded but never processed
 * (e.g. user closed the tab after uploading). Files older than STALE_THRESHOLD_MS
 * that still sit in the pdf-jobs/ prefix are removed.
 *
 * This endpoint is intended to be called by a scheduled job (Vercel cron,
 * GitHub Actions, or any external scheduler). It is protected by a shared
 * secret token so it cannot be triggered by arbitrary users.
 *
 * Vercel cron config (vercel.json):
 *   "crons": [{ "path": "/api/tools/pdf/cleanup", "schedule": "0 3 * * *" }]
 *
 * Security:
 *   - Requires Authorization: Bearer <CRON_SECRET> header
 *   - Only deletes blobs in the pdf-jobs/ pathname prefix
 *   - Does not expose blob contents or list all blobs in the response
 */

import { NextResponse } from 'next/server';
import { list, del } from '@vercel/blob';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Files older than 2 hours are considered abandoned — processing should
// complete in under 5 minutes for even the largest allowed batch.
const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000;

export async function GET(request: Request) {
  // Gate behind CRON_SECRET to prevent arbitrary callers from triggering
  // storage deletions. Set this in Vercel environment variables.
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');

  if (!secret) {
    // In development (no secret configured), only allow calls from localhost
    const host = request.headers.get('host') ?? '';
    if (!host.startsWith('localhost') && !host.startsWith('127.0.0.1')) {
      return NextResponse.json({ ok: false, error: 'CRON_SECRET not configured.' }, { status: 503 });
    }
  } else if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }

  // Skip if Blob storage isn't configured (e.g. local dev without Blob)
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID && !process.env.VERCEL) {
    return NextResponse.json({ ok: true, deleted: 0, message: 'Blob storage not configured — skipped.' });
  }

  const cutoff = new Date(Date.now() - STALE_THRESHOLD_MS);
  const staleUrls: string[] = [];
  let cursor: string | undefined;

  try {
    // Page through the pdf-jobs/ prefix looking for stale blobs
    do {
      const page = await list({ prefix: 'pdf-jobs/', cursor, limit: 100 });
      for (const blob of page.blobs) {
        if (new Date(blob.uploadedAt) < cutoff) {
          staleUrls.push(blob.url);
        }
      }
      cursor = page.cursor;
    } while (cursor);

    if (staleUrls.length > 0) {
      // Delete in batches of 100 (Vercel Blob API limit)
      for (let i = 0; i < staleUrls.length; i += 100) {
        await del(staleUrls.slice(i, i + 100));
      }
    }

    return NextResponse.json({ ok: true, deleted: staleUrls.length });
  } catch (error) {
    console.error('[pdf-cleanup] Failed to clean up stale blobs:', error);
    return NextResponse.json(
      { ok: false, error: 'Cleanup failed. Check server logs.' },
      { status: 500 },
    );
  }
}
