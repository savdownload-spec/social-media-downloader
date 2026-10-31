import { describe, expect, it, vi } from 'vitest';
vi.mock('./redis', () => ({ getRedis: () => null }));
import { getClientId, ratelimit, rateLimitHeaders } from './ratelimit';
describe('rate limiter configuration', () => {
  it('fails closed for newsletter when Redis is absent', async () => {
    expect((await ratelimit('newsletter', { failClosed: true })).success).toBe(false);
  });
  it('preserves default behavior for existing callers', async () => {
    expect((await ratelimit('existing')).success).toBe(true);
  });
  it('emits Retry-After only for rejected requests', () => {
    expect(rateLimitHeaders({ success: false, limit: 8, remaining: 0, resetSeconds: 17 })).toMatchObject({
      'Retry-After': '17',
      'X-RateLimit-Limit': '8',
      'X-RateLimit-Remaining': '0',
    });
    expect(rateLimitHeaders({ success: true, limit: 8, remaining: 7, resetSeconds: 17 })).not.toHaveProperty('Retry-After');
  });
  it('does not collapse headerless callers into one global anonymous bucket', () => {
    const first = getClientId(new Request('https://example.test', { headers: { 'user-agent': 'browser-a' } }));
    const second = getClientId(new Request('https://example.test', { headers: { 'user-agent': 'browser-b' } }));
    expect(first).toMatch(/^anonymous-/);
    expect(first).not.toBe(second);
  });
  it('uses the first forwarded IP', () => {
    expect(getClientId(new Request('https://example.test', { headers: { 'x-forwarded-for': '203.0.113.4, 10.0.0.1' } }))).toBe('203.0.113.4');
  });
});
