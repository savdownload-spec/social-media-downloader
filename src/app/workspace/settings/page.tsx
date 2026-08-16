import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ProfileForm, type AccountUser } from '@/components/account/ProfileForm';
import { MyReviews, type MyReview } from '@/components/account/MyReviews';
import { DangerZone } from '@/components/account/DangerZone';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { LanguageSelector } from '@/components/ui/LanguageSelector';

export const metadata = { title: 'Profile & Settings — SavDown Workspace' };
export const dynamic = 'force-dynamic';

export default async function WorkspaceSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login?callbackUrl=/workspace/settings');

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

  if (!user) redirect('/login?callbackUrl=/workspace/settings');

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8 md:py-10 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text">Profile & Settings</h1>
        <p className="text-sm text-text-muted mt-1">Manage your profile, preferences, and account.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ProfileForm user={{ ...user, oauthProvider: user.accounts[0]?.provider ?? null } as AccountUser} />
          <MyReviews reviews={reviews as MyReview[]} />
        </div>
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-white dark:bg-card p-6 shadow-soft space-y-4">
            <h2 className="text-sm font-semibold text-text">Preferences</h2>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-muted">Theme</span>
              <ThemeToggle variant="header" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-muted">Language</span>
              <LanguageSelector />
            </div>
          </div>
          <DangerZone email={user.email ?? ''} />
        </div>
      </div>
    </div>
  );
}
