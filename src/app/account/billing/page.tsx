import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { Coins, CheckCircle2, ArrowLeft } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Container } from '@/components/layout/Container';
import { Section } from '@/components/layout/Section';
import { ManageBillingButton } from '@/components/account/ManageBillingButton';
import { getBillingSummary, TIER_ALLOWANCE } from '@/lib/billing';
import { buildMetadata } from '@/lib/seo';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

export const metadata = buildMetadata({
  title: 'Billing',
  description: 'Your SavDown plan and credit balance.',
  path: '/account/billing',
  noIndex: true,
});

export const dynamic = 'force-dynamic';

const PLAN_LABEL: Record<string, string> = {
  FREE: 'Free',
  PRO: 'Pro',
  MAX: 'Max',
  LIFETIME: 'Lifetime',
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: { checkout?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login?callbackUrl=/account/billing');

  const [summary, subscription, ledger] = await Promise.all([
    getBillingSummary(session.user.id),
    prisma.subscription.findFirst({
      where: { userId: session.user.id, status: { in: ['active', 'trialing', 'past_due'] } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.creditTransaction.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  if (!summary) redirect('/login?callbackUrl=/account/billing');

  const allowance = TIER_ALLOWANCE[summary.plan];
  const justPaid = searchParams.checkout === 'success';

  return (
    <Section variant="default" className="pt-12 md:pt-16">
      <Container>
        <div className="max-w-3xl mx-auto">
          <Breadcrumb
            className="mb-8"
            includeSchema
            items={[
              { label: 'Home', href: '/' },
              { label: 'Account', href: '/account' },
              { label: 'Billing' },
            ]}
          />
          <Link
            href="/account"
            className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to account
          </Link>

          <h1 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight">Billing</h1>
          <p className="mt-2 text-sm text-text-muted">
            Your plan, your credit balance, and where they came from.
          </p>

          {justPaid && (
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-accent/20 bg-accent-light p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-accent-hover" />
              <div>
                <p className="text-sm font-semibold text-text">Payment received. Thank you.</p>
                <p className="mt-1 text-sm text-text-muted">
                  Credits usually appear within a few seconds. Refresh this page if the balance
                  below still looks unchanged.
                </p>
              </div>
            </div>
          )}

          {/* Plan */}
          <div className="mt-8 rounded-2xl border border-border bg-white dark:bg-card p-6 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                  Current plan
                </p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-text">
                  {PLAN_LABEL[summary.plan] ?? summary.plan}
                </p>
                <p className="mt-1 text-sm text-text-muted">
                  {summary.plan === 'LIFETIME'
                    ? `${allowance.credits.toLocaleString()} lifetime credits (never expire)`
                    : summary.plan === 'FREE'
                      ? `${allowance.credits.toLocaleString()} credits per ${allowance.period}`
                      : `${allowance.credits.toLocaleString()} credits per month`}
                </p>
              </div>

              <div className="flex flex-col items-start gap-2">
                {subscription ? (
                  <ManageBillingButton />
                ) : (
                  <Link
                    href="/pricing"
                    className="inline-flex items-center justify-center rounded-2xl bg-gradient-brand bg-[length:200%_200%] px-5 py-2.5 text-sm font-semibold text-white shadow-glow-lg transition-all hover:bg-[position:100%_50%]"
                  >
                    {summary.plan === 'FREE' ? 'Upgrade' : 'Buy more credits'}
                  </Link>
                )}
              </div>
            </div>

            {subscription && (
              <p className="mt-4 border-t border-border-light pt-4 text-sm text-text-muted">
                {subscription.cancelAtPeriodEnd
                  ? 'Your plan is set to cancel'
                  : 'Renews'}{' '}
                {subscription.currentPeriodEnd
                  ? `on ${subscription.currentPeriodEnd.toLocaleDateString()}`
                  : 'at the end of the current period'}
                {subscription.status === 'past_due' && '. Your last payment failed.'}
              </p>
            )}
          </div>

          {/* Balance */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <BalanceTile
              label="Total credits"
              value={summary.totalCredits}
              emphasis
              note="Everything available to spend"
            />
            <BalanceTile
              label="Plan allowance"
              value={summary.planCredits}
              note={
                summary.planCreditsResetAt
                  ? `Resets ${summary.planCreditsResetAt.toLocaleDateString()}`
                  : 'Refills each period'
              }
            />
            <BalanceTile
              label="Purchased"
              value={summary.purchasedCredits}
              note="Never expires"
            />
          </div>

          {/* History */}
          <div className="mt-6 rounded-2xl border border-border bg-white dark:bg-card p-6 shadow-soft">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
              Recent activity
            </p>
            {ledger.length === 0 ? (
              <p className="mt-4 text-sm text-text-muted">
                Nothing yet. Your free daily credits do not appear here, only purchases and
                plan refills do.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-border-light">
                {ledger.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text">
                        {entry.description ?? entry.kind}
                      </p>
                      <p className="text-xs text-text-subtle">
                        {entry.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`flex-shrink-0 text-sm font-semibold ${
                        entry.amount >= 0 ? 'text-accent-hover' : 'text-text-muted'
                      }`}
                    >
                      {entry.amount >= 0 ? '+' : ''}
                      {entry.amount.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Container>
    </Section>
  );
}

function BalanceTile({
  label,
  value,
  note,
  emphasis = false,
}: {
  label: string;
  value: number;
  note: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        emphasis ? 'border-primary/20 bg-primary-light' : 'border-border bg-white dark:bg-card'
      }`}
    >
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.13em] text-text-muted">
        <Coins className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
        {label}
      </p>
      <p className="mt-2 font-display text-2xl font-bold tracking-tight text-text">
        {value.toLocaleString()}
      </p>
      <p className="mt-1 text-xs text-text-subtle">{note}</p>
    </div>
  );
}


