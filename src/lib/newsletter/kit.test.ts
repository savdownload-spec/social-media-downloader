import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { KitProvider } from './kit';

const response = (state = 'active', id = 42) => new Response(JSON.stringify({ subscriber: { id, state, email_address: 'reader@example.com' } }), { status: 200 });
beforeEach(() => { vi.stubEnv('KIT_API_KEY', 'test-secret'); vi.stubEnv('KIT_FORM_ID', '123'); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe('Kit provider', () => {
  it('upserts the email before joining the configured form', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(response()).mockResolvedValueOnce(response());
    vi.stubGlobal('fetch', fetcher);
    expect(await new KitProvider().subscribe('reader@example.com')).toEqual({ subscriberId: '42', status: 'active' });
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual(['https://api.kit.com/v4/subscribers', 'https://api.kit.com/v4/forms/123/subscribers']);
    expect(fetcher.mock.calls[0][1].headers['X-Kit-Api-Key']).toBe('test-secret');
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ email_address: 'reader@example.com' });
  });
  it.each(['cancelled', 'bounced', 'complained'])('does not reactivate %s', async (state) => {
    const fetcher = vi.fn().mockResolvedValue(response(state)); vi.stubGlobal('fetch', fetcher);
    const result = await new KitProvider().subscribe('reader@example.com');
    expect(result.status).toBe(state === 'cancelled' ? 'unsubscribed' : state);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('preserves pending confirmation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve(response('inactive'))));
    expect((await new KitProvider().subscribe('reader@example.com')).status).toBe('pending');
  });
  it.each([401, 403, 404, 422, 429, 500, 503])('sanitizes HTTP %s', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('private provider details', { status })));
    await expect(new KitProvider().subscribe('reader@example.com')).rejects.toThrow(`provider_http_${status}`);
  });
  it.each(['not json', '{}', '{"subscriber":{"id":42,"state":"unknown","email_address":"reader@example.com"}}'])('rejects malformed provider data', async (body) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body)));
    await expect(new KitProvider().subscribe('reader@example.com')).rejects.toThrow('provider_response');
  });
  it('sanitizes network errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('test-secret')));
    await expect(new KitProvider().subscribe('reader@example.com')).rejects.toThrow('provider_network');
  });
  it('classifies provider timeouts without leaking fetch details', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(AbortSignal.abort());
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('private network details')));
    await expect(new KitProvider().subscribe('reader@example.com')).rejects.toThrow('provider_timeout');
    timeout.mockRestore();
  });
  it('rejects missing configuration before fetching', () => {
    vi.stubEnv('KIT_API_KEY', ''); expect(() => new KitProvider()).toThrow('configuration');
  });
});
