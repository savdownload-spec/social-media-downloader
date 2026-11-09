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

/**
 * Media classification — documents which storage paths are permanent (backup-eligible)
 * vs temporary (excluded from backup) and why.
 *
 * Permanent (included when `media` category or via DB reference scan):
 *   - Vercel Blob `blog/YYYY/MM/*.webp`   — blog cover and body images referenced in Post
 *   - Vercel Blob `avatars/*.webp`         — user profile photos referenced in User.image
 *   - `public/images/blog/uploads/`        — local dev blog media (dev environment only)
 *   - `public/images/avatars/`             — local dev avatars (dev environment only)
 *   - DB Bytes `SupportAttachment.data`    — support attachments stored inline in the DB
 *
 * Temporary (excluded — not backed up):
 *   - Vercel Blob `pdf-jobs/`              — PDF tool upload staging (2-hour stale threshold,
 *                                            cleaned by `cleanupPdfUploadRefs()` on route exit
 *                                            and by the `/api/tools/pdf/cleanup` daily cron)
 *   - OS tmpdir `savdown-ffmpeg-*`         — FFmpeg video processing (cleaned in finally blocks
 *                                            in `videoService.ts`)
 *   - OS tmpdir (TikTok yt-dlp stream)     — yt-dlp download pipe (cleaned in finally blocks
 *                                            in the TikTok stream route)
 *   - Sharp in-memory buffers              — all image processing in `imageService.ts` is
 *                                            buffer-only; no disk writes occur
 *   - Browser worker WASM (ESRGAN)         — upscaling runs client-side; no server storage
 *   - Vercel Blob `exports/`               — user data export ZIPs managed by `export/storage.ts`
 *                                            (separate user-facing feature, not a backup target)
 *
 * Security — fields excluded from DB export (enforced in `archive.ts` collectData() selects
 * and nulled/redacted values; also enforced by ALLOWED_FIELDS in `restore.ts`):
 *   - User: password, passwordChangedAt, stripeCustomerId, safepayCustomerId
 *   - CreditTransaction: externalId, idempotencyKey
 *   - Download: idempotencyKey, ipHash, userAgent
 *   - AnalyticsEvent: metaJson
 *   - Subscription: stripeSubscriptionId (replaced with SHA-256 hash prefix)
 *   - Payment: providerPaymentId (replaced), reference, metadata
 *   - SupportConversation: guestTokenHash
 *   - NewsletterSubscriber: providerSubscriberId, providerListId
 *   - AdminSetting: rows whose key matches /(secret|token|password|api[_-]?key|private[_-]?key)/i
 *
 * Models intentionally excluded from all backups:
 *   - Account, Session, VerificationToken  — OAuth credentials and auth sessions
 *   - ProcessedStripeEvent, ProcessedSafepayEvent — webhook idempotency guards
 *   - AuditLog, AdminNotification, AdminNotificationRead — operational/ephemeral admin state
 *   - UserExportJob — generated export/backup history (not application data)
 */
export const MEDIA_CLASSIFICATION = {
  permanent: ['blog/', 'avatars/', 'public/images/blog/uploads/', 'public/images/avatars/', 'SupportAttachment.data (DB Bytes)'],
  temporary: ['pdf-jobs/', 'os-tmpdir/savdown-ffmpeg-*', 'os-tmpdir/tiktok-yt-dlp', 'sharp-in-memory-buffers', 'browser-wasm-esrgan', 'exports/'],
} as const;
