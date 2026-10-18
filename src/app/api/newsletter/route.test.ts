import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ limit: vi.fn(), subscribe: vi.fn() }));
vi.mock('@/lib/ratelimit', () => ({ ratelimit: mocks.limit, getClientId: () => 'test' }));
vi.mock('@/lib/newsletter/service', () => ({ subscribeNewsletter: mocks.subscribe }));
import { POST } from './route';
const request = (body: unknown) => new Request('http://localhost/api/newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost' }, body: JSON.stringify(body) });
beforeEach(() => { vi.clearAllMocks(); mocks.limit.mockResolvedValue({ success: true, resetSeconds: 60 }); mocks.subscribe.mockResolvedValue(undefined); });
describe('public newsletter endpoint', () => {
  it('fails safely when rate-limit infrastructure is unavailable', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.limit.mockResolvedValue({ success: false, unavailable: true });
    expect((await POST(request({ email: 'reader@example.com' }))).status).toBe(503);
    expect(mocks.subscribe).not.toHaveBeenCalled(); log.mockRestore();
  });
  it('normalizes and accepts without a session; ignores untrusted state', async () => {
    const res = await POST(request({ email: ' Reader@Example.com ', consent: true, status: 'active', providerSubscriberId: 'evil' }));
    expect(res.status).toBe(200); expect(await res.json()).toEqual({ ok: true });
    expect(mocks.subscribe).toHaveBeenCalledWith('reader@example.com');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });
  it('rejects submission without consent', async () => {
    const res = await POST(request({ email: 'reader@example.com' }));
    expect(res.status).toBe(400); expect(mocks.subscribe).not.toHaveBeenCalled();
  });
  it('rejects submission with consent: false', async () => {
    const res = await POST(request({ email: 'reader@example.com', consent: false }));
    expect(res.status).toBe(400); expect(mocks.subscribe).not.toHaveBeenCalled();
  });
  it.each(['', 'bad', 'a@', 'x'.repeat(255) + '@example.com'])('rejects invalid email', async (email) => {
    expect((await POST(request({ email }))).status).toBe(400); expect(mocks.subscribe).not.toHaveBeenCalled();
  });
  it('rejects malformed JSON', async () => {
    expect((await POST(new Request('http://localhost/api/newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' }))).status).toBe(400);
  });
  it('rejects oversized bodies', async () => { expect((await POST(request({ email: 'reader@example.com', extra: 'x'.repeat(2100) }))).status).toBe(413); });
  it('rejects cross-site requests', async () => {
    const req = request({ email: 'reader@example.com' }); req.headers.set('origin', 'https://other.example');
    expect((await POST(req)).status).toBe(403); expect(mocks.subscribe).not.toHaveBeenCalled();
  });
  it('rejects non-JSON requests', async () => {
    const req = request({ email: 'reader@example.com' }); req.headers.set('content-type', 'text/plain');
    expect((await POST(req)).status).toBe(415);
  });
  it('rate limits before calling the provider', async () => {
    mocks.limit.mockResolvedValue({ success: false, resetSeconds: 40 });
    const res = await POST(request({ email: 'reader@example.com' }));
    expect(res.status).toBe(429); expect(res.headers.get('Retry-After')).toBe('40'); expect(mocks.subscribe).not.toHaveBeenCalled();
  });
  it('silently discards the honeypot', async () => {
    expect((await POST(request({ email: 'reader@example.com', website: 'spam' }))).status).toBe(200);
    expect(mocks.subscribe).not.toHaveBeenCalled();
  });
  it('does not leak internal errors', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.subscribe.mockRejectedValue(new Error('secret reader@example.com'));
    const res = await POST(request({ email: 'reader@example.com', consent: true }));
    expect(res.status).toBe(503); expect(await res.text()).not.toMatch(/secret|reader@example/);
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/secret|reader@example/); log.mockRestore();
  });
});
