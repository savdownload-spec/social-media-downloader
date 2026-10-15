import 'server-only';
import { prisma } from '@/lib/prisma';
import { KitProvider } from './kit';
import { NewsletterError, type NewsletterProvider } from './provider';

export async function subscribeNewsletter(email: string, provider: NewsletterProvider = new KitProvider()) {
  // Postgres serializes the same email across server instances and releases the
  // lock even if the process dies. Hash collisions only cause a harmless retry.
  return prisma.$transaction(async (tx) => {
    const [lock] = await tx.$queryRaw<{ locked: boolean }[]>`
      SELECT pg_try_advisory_xact_lock(73421, hashtext(${email})) AS locked
    `;
    if (!lock?.locked) throw new NewsletterError('subscription_busy');
    const existing = await tx.newsletterSubscriber.findUnique({ where: { email } });
    if (existing && ['unsubscribed', 'bounced', 'complained'].includes(existing.status)) return;
    if (existing?.provider === provider.name && existing.providerListId === provider.listId
      && existing.providerSubscriberId) return;
    const result = await provider.subscribe(email);
    const data = {
      active: result.status === 'active', status: result.status,
      provider: provider.name, providerListId: provider.listId,
      providerSubscriberId: result.subscriberId,
      subscribedAt: result.status === 'active' ? (existing?.subscribedAt ?? new Date()) : null,
    };
    await tx.newsletterSubscriber.upsert({
      where: { email }, update: data,
      create: { email, source: 'homepage-monthly-update', ...data },
    });
    // Failed commits safely retry Kit's email upsert and form membership.
  }, { timeout: 20000, maxWait: 3000 });
}
