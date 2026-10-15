import { describe, expect, it, vi } from 'vitest';
vi.mock('./redis', () => ({ getRedis: () => null }));
import { ratelimit } from './ratelimit';
describe('rate limiter configuration', () => {
  it('fails closed for newsletter when Redis is absent', async () => {
    expect((await ratelimit('newsletter', { failClosed: true })).success).toBe(false);
  });
  it('preserves default behavior for existing callers', async () => {
    expect((await ratelimit('existing')).success).toBe(true);
  });
});
