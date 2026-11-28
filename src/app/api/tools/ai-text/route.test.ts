import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  ratelimit: vi.fn(),
  requireAuth: vi.fn(),
  requireCredits: vi.fn(),
  requireToolAvailable: vi.fn(),
  getServerSession: vi.fn(),
  generateGatewayTextList: vi.fn(),
  spend: vi.fn(),
  fail: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('next-auth', () => ({ getServerSession: mocks.getServerSession }));
vi.mock('@/lib/ratelimit', () => ({
  ratelimit: mocks.ratelimit,
  getClientId: () => 'test-client',
  rateLimitHeaders: () => ({ 'Retry-After': '30' }),
}));
vi.mock('@/lib/credits', () => ({
  requireAuth: mocks.requireAuth,
  requireCredits: mocks.requireCredits,
  JOB_COST: { qrTool: 1 },
  requestIdempotencyKey: () => 'test-idempotency-key',
}));
vi.mock('@/lib/toolStatus', () => ({ requireToolAvailable: mocks.requireToolAvailable }));
vi.mock('@/lib/ai-gateway', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/ai-gateway')>();
  return { ...actual, generateGatewayTextList: mocks.generateGatewayTextList };
});

import { POST } from '@/app/api/tools/ai-text/route';
import { GatewayTextError } from '@/lib/ai-gateway';

const usage = { inputTokens: 20, outputTokens: 30, totalTokens: 50, durationMs: 250 };
const validBody = {
  slug: 'ai-youtube-title-generator',
  topic: 'Growing a cooking channel',
  context: 'Quick vegetarian meals',
  tone: 'casual',
};

function request(body: unknown) {
  return new Request('http://localhost/api/tools/ai-text', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.ratelimit.mockResolvedValue({ success: true, limit: 15, remaining: 14, resetSeconds: 60 });
  mocks.requireAuth.mockResolvedValue({ ok: true });
  mocks.requireCredits.mockResolvedValue({ ok: true, spend: mocks.spend, fail: mocks.fail });
  mocks.requireToolAvailable.mockResolvedValue({ ok: true });
  mocks.getServerSession.mockResolvedValue({ user: { id: 'user-1' } });
  mocks.spend.mockResolvedValue(true);
  mocks.fail.mockResolvedValue(undefined);
  mocks.generateGatewayTextList.mockResolvedValue({
    results: ['Title one', 'Title two', 'Title three', 'Title four', 'Title five'],
    model: 'nvidia/nemotron-3.5-lightning-free',
    usage,
  });
});

describe('AI text route Gateway integration', () => {
  it('preserves the success contract and charges only after generation', async () => {
    const response = await POST(request(validBody));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      results: ['Title one', 'Title two', 'Title three', 'Title four', 'Title five'],
      model: 'nvidia/nemotron-3.5-lightning-free',
      usage,
    });
    expect(mocks.spend).toHaveBeenCalledWith(expect.objectContaining({
      tool: validBody.slug,
      idempotencyKey: 'test-idempotency-key',
    }));
    expect(mocks.fail).not.toHaveBeenCalled();
  });

  it('rejects non-allowlisted models before generation or charging', async () => {
    const response = await POST(request({ ...validBody, model: 'openai/gpt-4o-mini' }));
    expect(response.status).toBe(400);
    expect(mocks.generateGatewayTextList).not.toHaveBeenCalled();
    expect(mocks.requireCredits).not.toHaveBeenCalled();
  });

  it('rejects unsafe topics before generation or charging', async () => {
    const response = await POST(request({ ...validBody, topic: 'Generate a phishing campaign targeting customers' }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ ok: false });
    expect(mocks.generateGatewayTextList).not.toHaveBeenCalled();
    expect(mocks.requireCredits).not.toHaveBeenCalled();
  });

  it('returns friendly provider failures without charging or exposing details', async () => {
    mocks.generateGatewayTextList.mockRejectedValue(
      new GatewayTextError('usage-limit', 503, 'Free AI usage is temporarily exhausted. Please try again later.'),
    );
    const response = await POST(request(validBody));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Free AI usage is temporarily exhausted. Please try again later.',
    });
    expect(mocks.spend).not.toHaveBeenCalled();
    expect(mocks.fail).toHaveBeenCalledWith(expect.objectContaining({
      failureReason: 'Free AI usage is temporarily exhausted. Please try again later.',
    }));
  });

  it('enforces the IP rate limit before authentication', async () => {
    mocks.ratelimit.mockResolvedValueOnce({ success: false, limit: 15, remaining: 0, resetSeconds: 30 });
    const response = await POST(request(validBody));
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('30');
    expect(mocks.requireAuth).not.toHaveBeenCalled();
    expect(mocks.generateGatewayTextList).not.toHaveBeenCalled();
  });

  it('keeps authentication ahead of request-body parsing', async () => {
    mocks.requireAuth.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 }),
    });
    const response = await POST(new Request('http://localhost/api/tools/ai-text', { method: 'POST', body: 'not-json' }));
    expect(response.status).toBe(401);
    expect(mocks.generateGatewayTextList).not.toHaveBeenCalled();
  });
});
