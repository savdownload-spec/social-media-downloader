/**
 * Server-side tool-status gate helper.
 *
 * Call `requireToolAvailable(slug)` at the top of every processing API route
 * BEFORE doing any work (including requireCredits). It reads the persisted
 * Admin status from the DB and returns a ready-made NextResponse for blocked
 * states, or `{ ok: true }` to continue.
 *
 * Status mapping:
 *   LIVE or unknown/null  → { ok: true }          (fail-open for missing rows)
 *   COMING_SOON           → { ok: false } 503
 *   MAINTENANCE           → { ok: false } 503
 *   DISABLED              → { ok: false } 503
 *
 * The function never throws — a DB error is treated as LIVE so that a
 * transient database hiccup cannot take all tools offline.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export type ToolStatusResult =
  | { ok: true }
  | { ok: false; response: NextResponse };

/** Structured info about a status value — useful for page rendering. */
export interface StatusInfo {
  blocked: boolean;
  httpStatus: number;
  error: string;
  code: string;
}

/**
 * Returns structured metadata for a raw status string.
 * Unknown or null statuses are treated as LIVE (fail-open).
 */
export function statusMessage(status: string | null | undefined): StatusInfo {
  switch (status) {
    case 'COMING_SOON':
      return {
        blocked: true,
        httpStatus: 503,
        error: 'This tool is coming soon. Check back later.',
        code: 'TOOL_COMING_SOON',
      };
    case 'MAINTENANCE':
      return {
        blocked: true,
        httpStatus: 503,
        error: 'This tool is temporarily under maintenance. Please try again later.',
        code: 'TOOL_MAINTENANCE',
      };
    case 'DISABLED':
      return {
        blocked: true,
        httpStatus: 503,
        error: 'This tool is currently unavailable.',
        code: 'TOOL_DISABLED',
      };
    default:
      // LIVE or any unknown/null value → allow
      return { blocked: false, httpStatus: 200, error: '', code: '' };
  }
}

/**
 * Reads the tool's persisted status from the DB and returns:
 *   { ok: true }                    — tool is available (LIVE or unknown)
 *   { ok: false, response }         — tool is blocked (COMING_SOON / MAINTENANCE / DISABLED)
 *
 * A missing config row or a DB error returns { ok: true } (fail-open).
 */
export async function requireToolAvailable(slug: string): Promise<ToolStatusResult> {
  try {
    const config = await prisma.toolConfig.findUnique({
      where: { slug },
      select: { status: true },
    });

    const info = statusMessage(config?.status);
    if (!info.blocked) return { ok: true };

    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: info.error, code: info.code },
        { status: info.httpStatus },
      ),
    };
  } catch {
    // Fail-open: a transient DB error must not take all tools offline.
    return { ok: true };
  }
}
