import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const tx = vi.hoisted(() => ({ $queryRaw: vi.fn(), newsletterSubscriber: { findUnique: vi.fn(), upsert: vi.fn() } }));
vi.mock('@/lib/prisma', () => ({ prisma: { $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) } }));
import { subscribeNewsletter } from './service';
const provider = { name: 'test', listId: 'list', subscribe: vi.fn() };
beforeEach(() => {
  vi.clearAllMocks(); tx.$queryRaw.mockResolvedValue([{ locked: true }]); tx.newsletterSubscriber.findUnique.mockResolvedValue(null);
  tx.newsletterSubscriber.upsert.mockResolvedValue({}); provider.subscribe.mockResolvedValue({ subscriberId: '42', status: 'active' });
});
describe('newsletter persistence', () => {
  it('preserves a legacy local opt-out', async () => {
    tx.newsletterSubscriber.findUnique.mockResolvedValue({ status: 'unsubscribed', active: false });
    await subscribeNewsletter('reader@example.com', provider);
    expect(provider.subscribe).not.toHaveBeenCalled();
  });
  it('writes provider-confirmed metadata', async () => {
    await subscribeNewsletter('reader@example.com', provider);
    expect(tx.newsletterSubscriber.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ email: 'reader@example.com', active: true, provider: 'test', providerSubscriberId: '42' }) }));
  });
  it('skips existing provider memberships', async () => {
    tx.newsletterSubscriber.findUnique.mockResolvedValue({ provider: 'test', providerListId: 'list', providerSubscriberId: '42' });
    await subscribeNewsletter('reader@example.com', provider); expect(provider.subscribe).not.toHaveBeenCalled();
  });
  it('does not save a failed provider result', async () => {
    provider.subscribe.mockRejectedValueOnce(new Error('outage'));
    await expect(subscribeNewsletter('reader@example.com', provider)).rejects.toThrow('outage'); expect(tx.newsletterSubscriber.upsert).not.toHaveBeenCalled();
  });
  it('does not mark pending subscribers active', async () => {
    provider.subscribe.mockResolvedValueOnce({ subscriberId: '42', status: 'pending' });
    await subscribeNewsletter('reader@example.com', provider);
    expect(tx.newsletterSubscriber.upsert.mock.calls[0][0].create).toMatchObject({ active: false, status: 'pending', subscribedAt: null });
  });
  it('rejects concurrent processing before contacting Kit', async () => {
    tx.$queryRaw.mockResolvedValueOnce([{ locked: false }]);
    await expect(subscribeNewsletter('reader@example.com', provider)).rejects.toThrow('subscription_busy'); expect(provider.subscribe).not.toHaveBeenCalled();
  });
  it('allows recovery after a failed database write', async () => {
    tx.newsletterSubscriber.upsert.mockRejectedValueOnce(new Error('write failed'));
    await expect(subscribeNewsletter('reader@example.com', provider)).rejects.toThrow('write failed');
    await subscribeNewsletter('reader@example.com', provider); expect(provider.subscribe).toHaveBeenCalledTimes(2);
  });
});
