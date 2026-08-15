/**
 * Catalog of user fields the admin can export. This file has no server-only
 * imports (no prisma) so it can be shared by both the export drawer (client)
 * and the export API route (server) as the single source of truth for which
 * fields exist and how they're grouped/labeled.
 *
 * Every id here maps to a real column or a straightforward aggregate over
 * real columns — see src/lib/export/data.ts for how each is computed.
 * Deliberately excluded: password, stripeCustomerId, session/verification
 * tokens, and any field not present in prisma/schema.prisma (e.g. there is
 * no `lastLogin`, `country`, `language`, or marketing-consent column on
 * User today).
 */

export type ExportFieldCategory =
  | 'basic' | 'profile' | 'usage' | 'billing' | 'payments' | 'marketing' | 'reviews';

export interface ExportFieldDef {
  id: string;
  label: string;
  category: ExportFieldCategory;
}

export const EXPORT_FIELD_CATEGORIES: { id: ExportFieldCategory; label: string }[] = [
  { id: 'basic',     label: 'Basic' },
  { id: 'profile',   label: 'Profile' },
  { id: 'usage',     label: 'Usage' },
  { id: 'billing',   label: 'Billing' },
  { id: 'payments',  label: 'Payments' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'reviews',   label: 'Reviews' },
];

export const EXPORT_FIELDS: ExportFieldDef[] = [
  // Basic
  { id: 'id',              label: 'User ID',           category: 'basic' },
  { id: 'name',             label: 'Name',              category: 'basic' },
  { id: 'email',            label: 'Email',             category: 'basic' },
  { id: 'createdAt',        label: 'Registration date', category: 'basic' },
  { id: 'accountStatus',    label: 'Account status',    category: 'basic' },

  // Profile
  { id: 'role',             label: 'Role',              category: 'profile' },
  { id: 'jobTitle',         label: 'Job title',         category: 'profile' },
  { id: 'company',          label: 'Company',           category: 'profile' },
  { id: 'bio',              label: 'Bio',                category: 'profile' },

  // Usage
  { id: 'totalDownloads',   label: 'Total downloads',   category: 'usage' },
  { id: 'creditsBalance',   label: 'Credits balance',   category: 'usage' },
  { id: 'creditsUsed',      label: 'Credits used',      category: 'usage' },
  { id: 'lastActivity',     label: 'Last activity',     category: 'usage' },

  // Billing
  { id: 'currentPlan',           label: 'Current plan',              category: 'billing' },
  { id: 'subscriptionStatus',    label: 'Subscription status',       category: 'billing' },
  { id: 'subscriptionStart',     label: 'Subscription start',        category: 'billing' },
  { id: 'subscriptionRenewal',   label: 'Subscription renewal/end',  category: 'billing' },
  { id: 'lifetimePurchase',      label: 'Lifetime purchase status',  category: 'billing' },

  // Payments (derived from the credit-purchase ledger — see report notes:
  // there is no Payment/Order table or stored currency amount in this app)
  { id: 'paymentCount',          label: 'Payment count',             category: 'payments' },
  { id: 'creditsPurchased',      label: 'Total credits purchased',   category: 'payments' },
  { id: 'lastPaymentDate',       label: 'Last payment date',         category: 'payments' },

  // Marketing
  { id: 'newsletterStatus',      label: 'Newsletter status',         category: 'marketing' },
  { id: 'affiliateStatus',       label: 'Affiliate status',          category: 'marketing' },
  { id: 'affiliateCode',         label: 'Affiliate code',            category: 'marketing' },

  // Reviews
  { id: 'reviewCount',           label: 'Review count',              category: 'reviews' },
  { id: 'averageRating',         label: 'Average rating',            category: 'reviews' },
];

export const EXPORT_FIELD_IDS = EXPORT_FIELDS.map((f) => f.id);

export const DEFAULT_EXPORT_FIELD_IDS = [
  'id', 'name', 'email', 'createdAt', 'accountStatus',
  'role', 'currentPlan', 'creditsBalance', 'totalDownloads',
];

export type ExportFormat = 'csv' | 'xlsx' | 'json' | 'pdf' | 'zip';

export const EXPORT_FORMATS: { id: ExportFormat; label: string; blurb: string }[] = [
  { id: 'csv',  label: 'CSV',   blurb: 'Best for spreadsheets and external systems.' },
  { id: 'xlsx', label: 'Excel', blurb: 'Formatted workbook with headers and readable columns.' },
  { id: 'json', label: 'JSON',  blurb: 'Structured user records.' },
  { id: 'pdf',  label: 'PDF',   blurb: 'Clean printable report.' },
  { id: 'zip',  label: 'ZIP',   blurb: 'Bundle every selected format into one download.' },
];

export type DateRangePreset =
  | 'today' | 'yesterday' | 'last7' | 'last30' | 'last90'
  | 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom';

export const DATE_RANGE_PRESETS: { id: DateRangePreset; label: string }[] = [
  { id: 'today',     label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last7',     label: 'Last 7 days' },
  { id: 'last30',    label: 'Last 30 days' },
  { id: 'last90',    label: 'Last 90 days' },
  { id: 'thisMonth', label: 'This month' },
  { id: 'lastMonth', label: 'Last month' },
  { id: 'thisYear',  label: 'This year' },
  { id: 'custom',    label: 'Custom range' },
];

export type ExportDateField = 'createdAt' | 'updatedAt';

export const DATE_FIELD_OPTIONS: { id: ExportDateField; label: string }[] = [
  { id: 'createdAt', label: 'Registered date' },
  { id: 'updatedAt', label: 'Updated date' },
];

/** Resolves a preset (in the server's local time) to a concrete [from, to) range. */
export function resolveDateRangePreset(preset: DateRangePreset, customFrom?: string, customTo?: string): { from: Date | null; to: Date | null } {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  switch (preset) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) };
    case 'yesterday': {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case 'last7': {
      const from = new Date(now); from.setDate(from.getDate() - 6);
      return { from: startOfDay(from), to: endOfDay(now) };
    }
    case 'last30': {
      const from = new Date(now); from.setDate(from.getDate() - 29);
      return { from: startOfDay(from), to: endOfDay(now) };
    }
    case 'last90': {
      const from = new Date(now); from.setDate(from.getDate() - 89);
      return { from: startOfDay(from), to: endOfDay(now) };
    }
    case 'thisMonth':
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now) };
    case 'lastMonth': {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { from, to };
    }
    case 'thisYear':
      return { from: new Date(now.getFullYear(), 0, 1), to: endOfDay(now) };
    case 'custom': {
      const from = customFrom ? startOfDay(new Date(customFrom)) : null;
      const to = customTo ? endOfDay(new Date(customTo)) : null;
      return { from, to };
    }
    default:
      return { from: null, to: null };
  }
}

export function formatDateRangeLabel(preset: DateRangePreset, from: Date | null, to: Date | null): string {
  if (!from && !to) return 'All time';
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  if (from && to) return `${fmt(from)} - ${fmt(to)}`;
  if (from) return `From ${fmt(from)}`;
  return `Until ${fmt(to!)}`;
}

/** Filename-safe date, e.g. 2026-08-15. */
export function fileDateStamp(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function buildExportFilename(base: string, ext: string, from: Date | null, to: Date | null): string {
  if (from && to) {
    const a = fileDateStamp(from), b = fileDateStamp(to);
    if (a === b) return `${base}-${a}.${ext}`;
    return `${base}-${a}-to-${b}.${ext}`;
  }
  return `${base}-${fileDateStamp(new Date())}.${ext}`;
}
