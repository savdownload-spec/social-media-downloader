export const BACKUP_FORMAT_VERSION = 1;

export const BACKUP_CATEGORIES = [
  {
    id: 'content',
    label: 'Blogs & SEO',
    description: 'Posts, revisions, embedded categories and tags, SEO metadata, and referenced blog media.',
  },
  {
    id: 'media',
    label: 'Media & uploads',
    description: 'All SavDown-managed blog images and profile uploads available in configured storage.',
  },
  {
    id: 'users',
    label: 'Users & profiles',
    description: 'Profile and role data. Passwords, auth accounts, sessions, provider IDs, and tokens are excluded.',
  },
  {
    id: 'pricing',
    label: 'Pricing & offers',
    description: 'Subscription plans, credit packs, and lifetime offers stored in pricing configuration.',
  },
  {
    id: 'credits_usage',
    label: 'Credits & usage',
    description: 'Credit balances and ledger, downloads, AI generation history, and aggregate analytics events.',
  },
  {
    id: 'billing',
    label: 'Orders & subscriptions',
    description: 'Payments, subscriptions, and entitlements with payment-provider identifiers and metadata removed.',
  },
  {
    id: 'feedback',
    label: 'Reviews & comments',
    description: 'Customer reviews and moderated blog comments.',
  },
  {
    id: 'settings',
    label: 'Site & tool settings',
    description: 'Database-backed, non-secret site configuration and tool availability settings.',
  },
  {
    id: 'support',
    label: 'Support & contact',
    description: 'Contact submissions, support conversations, messages, and their stored attachments.',
  },
  {
    id: 'audience',
    label: 'Newsletter & affiliates',
    description: 'Newsletter subscribers, affiliates, referral attribution and reward records, excluding provider-side identifiers.',
  },
] as const;

export type BackupCategory = (typeof BACKUP_CATEGORIES)[number]['id'];

export const ALL_BACKUP_CATEGORIES = BACKUP_CATEGORIES.map((category) => category.id) as BackupCategory[];

export function isBackupCategory(value: unknown): value is BackupCategory {
  return typeof value === 'string' && ALL_BACKUP_CATEGORIES.includes(value as BackupCategory);
}

export const BACKUP_EXCLUSIONS = [
  'Passwords and password-change authentication state',
  'OAuth access, refresh and ID tokens; authentication accounts and sessions',
  'Email verification and session tokens',
  'Stripe/Safepay customer, payment, and subscription identifiers; payment metadata and references',
  'Webhook replay/idempotency records and transaction idempotency keys',
  'Support guest access token hashes',
  'Environment files, API keys, deployment secrets, and runtime environment variables',
  'Admin audit/notification state and generated export/backup history',
  'Remote third-party media outside SavDown-managed storage (the original URL remains in exported data)',
  'Pages, navigation, and redirects (no database-backed models exist in this application)',
];
