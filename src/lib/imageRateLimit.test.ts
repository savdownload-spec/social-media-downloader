import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./redis', () => ({ getRedis: () => null }));

import { checkImageIpLimit } from './imageRateLimit';
import { resetMemoryRateLimitsForTests } from './ratelimit';

describe('image processing rate-limit fallback', () => {
  beforeEach(() => resetMemoryRateLimitsForTests());

  it('allows normal processing without Redis and still enforces the local limit', async () => {
    const request = new Request('https://savdown.test/api/tools/image', {
      headers: { 'x-forwarded-for': '203.0.113.25' },
    });
    expect(await checkImageIpLimit(request, 'compress-batch', { limit: 1, windowSeconds: 60 })).toBeNull();

    const rejected = await checkImageIpLimit(request, 'compress-batch', { limit: 1, windowSeconds: 60 });
    expect(rejected?.status).toBe(429);
    expect(rejected?.headers.get('Retry-After')).toBe('60');
    await expect(rejected?.json()).resolves.toMatchObject({ code: 'RATE_LIMITED' });
  });
});
