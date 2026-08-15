import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveIpGeoFallback } from './ipinfo-fallback';

describe('resolveIpGeoFallback', () => {
  beforeEach(() => {
    delete process.env.IPINFO_TOKEN;
  });

  it('returns null without making any network call when IPINFO_TOKEN is unset', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    const request = new Request('https://example.com', { headers: { 'x-forwarded-for': '1.2.3.4' } });

    const result = await resolveIpGeoFallback(request);

    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
