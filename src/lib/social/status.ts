export const VARIANT_STATUSES = [
  'DRAFT',
  'SCHEDULED',
  'QUEUED',
  'PUBLISHING',
  'PUBLISHED',
  'FAILED',
  'NEEDS_AUTHORIZATION',
  'MANUAL_ACTION_REQUIRED',
  'CANCELLED',
] as const;

export type VariantStatus = (typeof VARIANT_STATUSES)[number];

export const POST_STATUSES = [
  'DRAFT',
  'SCHEDULED',
  'QUEUED',
  'PUBLISHING',
  'PUBLISHED',
  'PARTIAL',
  'FAILED',
  'NEEDS_AUTHORIZATION',
  'MANUAL_ACTION_REQUIRED',
  'CANCELLED',
] as const;

export type PostStatus = (typeof POST_STATUSES)[number];

/** Statuses that still allow the post definition to be rewritten. */
export const EDITABLE_POST_STATUSES: readonly string[] = ['DRAFT', 'SCHEDULED', 'CANCELLED'];

/** Statuses that require operator attention. */
export const ATTENTION_STATUSES: readonly string[] = [
  'FAILED',
  'NEEDS_AUTHORIZATION',
  'MANUAL_ACTION_REQUIRED',
  'PARTIAL',
];

/**
 * Deterministic post status from its variants. Never reports PUBLISHED unless
 * every variant is PUBLISHED — manual or failed variants downgrade the post.
 */
export function derivePostStatus(variantStatuses: readonly string[]): PostStatus {
  const statuses = variantStatuses.filter(Boolean);
  if (statuses.length === 0) return 'DRAFT';

  const set = new Set(statuses);
  const count = (status: string) => statuses.filter((s) => s === status).length;

  if (statuses.every((s) => s === 'PUBLISHED')) return 'PUBLISHED';

  if (set.has('PUBLISHING')) return 'PUBLISHING';
  if (set.has('QUEUED')) return 'QUEUED';

  // Some platforms published, at least one did not.
  if (count('PUBLISHED') > 0) return 'PARTIAL';

  if (set.has('NEEDS_AUTHORIZATION')) return 'NEEDS_AUTHORIZATION';
  if (set.has('MANUAL_ACTION_REQUIRED')) return 'MANUAL_ACTION_REQUIRED';
  if (set.has('FAILED')) return 'FAILED';

  if (statuses.every((s) => s === 'CANCELLED')) return 'CANCELLED';
  if (set.has('SCHEDULED')) return 'SCHEDULED';
  if (set.has('CANCELLED')) return 'CANCELLED';
  return 'DRAFT';
}

/** True when every variant is terminal (nothing is scheduled or in flight). */
export function isSettledPostStatus(status: string): boolean {
  return [
    'PUBLISHED',
    'PARTIAL',
    'FAILED',
    'NEEDS_AUTHORIZATION',
    'MANUAL_ACTION_REQUIRED',
    'CANCELLED',
    'DRAFT',
  ].includes(status);
}

export function statusLabel(status: string): string {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
