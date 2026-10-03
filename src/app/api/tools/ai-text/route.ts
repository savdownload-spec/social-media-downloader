/**
 * POST /api/tools/ai-text
 *
 * Shared AI text-generation endpoint for the AI writing tools:
 *   ai-youtube-title-generator
 *   ai-description-generator
 *   ai-hashtag-generator
 *   ai-caption-generator
 *
 * Uses Cloudflare Workers AI (llama-3.1-8b-instruct) — included in the same
 * CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN credentials already used by
 * the AI Image Generator. Free tier: 10,000 neurons/day (~100–500 text calls).
 *
 * Security:
 *   - API credentials are server-side only
 *   - Rate limited per user and per IP
 *   - Requires authentication + credits
 */

import { z } from 'zod';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ratelimit, getClientId } from '@/lib/ratelimit';
import { requireCredits, JOB_COST } from '@/lib/credits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TOOL_SLUGS = new Set([
  'ai-youtube-title-generator',
  'ai-description-generator',
  'ai-hashtag-generator',
  'ai-caption-generator',
]);

const BodySchema = z.object({
  slug:    z.string().min(1).max(60),
  topic:   z.string().min(2).max(300).trim(),
  context: z.string().max(300).trim().default(''),
  tone:    z.enum(['professional', 'casual', 'funny', 'inspiring']).default('professional'),
});

/** Build a focused system + user prompt for each tool. */
function buildPrompt(
  slug: string,
  topic: string,
  context: string,
  tone: string,
): { system: string; user: string } {
  const toneNote = tone !== 'professional' ? ` Use a ${tone} tone.` : '';
  const ctxNote = context ? ` Additional context: ${context}.` : '';

  switch (slug) {
    case 'ai-youtube-title-generator':
      return {
        system: 'You are an expert YouTube SEO specialist. Generate 5 compelling, click-worthy YouTube video titles. Return ONLY a JSON array of 5 strings, no explanation, no markdown.',
        user: `Topic: "${topic}".${ctxNote}${toneNote} Generate 5 YouTube titles that maximise clicks and SEO. Return only: ["title1","title2","title3","title4","title5"]`,
      };
    case 'ai-description-generator':
      return {
        system: 'You are an expert copywriter. Generate 3 compelling descriptions for a YouTube video or social media post. Return ONLY a JSON array of 3 strings, no explanation, no markdown.',
        user: `Topic: "${topic}".${ctxNote}${toneNote} Generate 3 descriptions (each 2-4 sentences). Return only: ["desc1","desc2","desc3"]`,
      };
    case 'ai-hashtag-generator':
      return {
        system: 'You are a social media expert. Generate 15 relevant hashtags (without the # symbol). Return ONLY a JSON array of 15 lowercase strings, no explanation, no markdown.',
        user: `Topic: "${topic}".${ctxNote}${toneNote} Generate 15 hashtags mixing broad and niche tags. Return only: ["tag1","tag2",...,"tag15"]`,
      };
    case 'ai-caption-generator':
      return {
        system: 'You are a social media copywriter. Generate 3 engaging social media captions. Return ONLY a JSON array of 3 strings, no explanation, no markdown.',
        user: `Topic: "${topic}".${ctxNote}${toneNote} Generate 3 captions for Instagram/TikTok/LinkedIn. Return only: ["caption1","caption2","caption3"]`,
      };
    default:
      throw new Error('Unknown slug');
  }
}

async function callCloudflareText(system: string, user: string): Promise<string[]> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !token) {
    throw new Error('AI text generation is not configured. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN.');
  }

  // Use llama-3.1-8b-instruct — available on Cloudflare Workers AI free tier
  const model = '@cf/meta/llama-3.1-8b-instruct';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          max_tokens: 600,
          temperature: 0.8,
        }),
        signal: controller.signal,
        cache: 'no-store',
      },
    );

    if (res.status === 429) throw new Error('Rate limit reached. Please try again in a moment.');
    if (!res.ok) throw new Error(`AI provider responded ${res.status}.`);

    const data = await res.json() as {
      success?: boolean;
      result?: { response?: string };
      errors?: { message: string }[];
    };

    if (!data.success || !data.result?.response) {
      const err = data.errors?.[0]?.message || 'No response from AI provider.';
      throw new Error(err);
    }

    const raw = data.result.response.trim();

    // Extract JSON array from the response — the model sometimes adds extra text
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('Unexpected response format from AI provider.');

    const parsed = JSON.parse(match[0]) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('AI provider returned an empty result.');
    }

    return (parsed as unknown[])
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map(item => item.trim());
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(req: Request) {
  const ip = getClientId(req);
  const rl = await ratelimit(`ai-text:${ip}`, { limit: 15, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ ok: false, error: 'Too many requests. Please slow down.' }, { status: 429 });
  }

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'Invalid request.' }, { status: 400 }); }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.errors[0]?.message ?? 'Invalid input.' }, { status: 400 });
  }

  const { slug, topic, context, tone } = parsed.data;

  if (!TOOL_SLUGS.has(slug)) {
    return NextResponse.json({ ok: false, error: 'Unknown tool.' }, { status: 400 });
  }

  // Per-user daily quota: max 10 AI text calls per day
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const dailyRl = await ratelimit(`ai-text:user:${session.user.id}:${today}`, {
      limit: 10,
      windowSeconds: 86400, // 24 hours
    });
    if (!dailyRl.success) {
      return NextResponse.json(
        { ok: false, error: 'Daily AI generation limit reached. Please try again tomorrow.' },
        { status: 429 },
      );
    }
  }

  const gate = await requireCredits({ cost: JOB_COST.qrTool }); // 1 credit per generation
  if (!gate.ok) return gate.response;

  try {
    const { system, user } = buildPrompt(slug, topic, context, tone);
    const results = await callCloudflareText(system, user);

    if (!(await gate.spend(`AI text: ${slug}`))) {
      return NextResponse.json({ ok: false, error: 'Balance changed before charge. Please retry.' }, { status: 402 });
    }

    return NextResponse.json({ ok: true, results });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed. Please try again.';
    // Do not charge if generation failed — gate.spend was never called
    return NextResponse.json({ ok: false, error: message }, { status: 503 });
  }
}
