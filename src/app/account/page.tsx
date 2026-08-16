import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { Coins } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Container } from '@/components/layout/Container';
import { Section } from '@/components/layout/Section';
import { ProfileForm, type AccountUser } from '@/components/account/ProfileForm';
import { MyReviews, type MyReview } from '@/components/account/MyReviews';
import { DangerZone } from '@/components/account/DangerZone';
import { buildMetadata } from '@/lib/seo';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

export const metadata = buildMetadata({
  title: 'Account',
  description: 'Manage your SavDown account and reviews.',
  path: '/account',
  noIndex: true,
});

export const dynamic = 'force-dynamic';

/** Entry point to the billing page, alongside the other account panels. */
function BillingCard() {
  return (
    <div className="rounded-2xl border border-border bg-white dark:bg-card p-6 shadow-soft">
      <div className="flex items-center gap-2">
        <Coins className="h-4 w-4 flex-shrink-0 text-primary" />
        <h2 className="text-sm font-semibold text-text">Plan &amp; credits</h2>
      </div>
      <p className="mt-2 text-sm text-text-muted">
        See your credit balance, change your plan, or download invoices.
      </p>
      <Link
        href="/account/billing"
        className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-border bg-white dark:bg-card px-5 py-2.5 text-sm font-semibold text-text transition-all hover:border-primary/40 hover:bg-primary-light"
      >
        Open billing
      </Link>
    </div>
  );
}

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login?callbackUrl=/account');

  const [user, reviews] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        jobTitle: true,
        company: true,
        bio: true,
        createdAt: true,
        accounts: { select: { provider: true }, take: 1 },
      },
    }),
    prisma.review.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        rating: true,
        review: true,
        role: true,
        company: true,
        platform: true,
        status: true,
        featured: true,
        createdAt: true,
        updatedAt: true,
        approvedAt: true,
      },
    }),
  ]);

  if (!user) redirect('/login?callbackUrl=/account');

  return (
    <Section variant="default" className="pt-12 md:pt-16">
      <Container>
        <div className="max-w-5xl mx-auto">
          <Breadcrumb
            className="mb-8"
            includeSchema
            items={[
              { label: 'Home', href: '/' },
              { label: 'Account' },
            ]}
          />
          <div className="mb-10">
            <p className="text-sm font-medium text-primary mb-3">Account</p>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Hi, {user.name ?? 'there'} 👋
            </h1>
            <p className="mt-2 text-text-muted text-sm">
              Manage your profile, review your submissions, and control your account.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <ProfileForm user={{ ...user, oauthProvider: user.accounts[0]?.provider ?? null } as AccountUser} />
              <MyReviews reviews={reviews as MyReview[]} />
            </div>
            <div className="space-y-6">
              <BillingCard />
              <DangerZone email={user.email ?? ''} />
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}


