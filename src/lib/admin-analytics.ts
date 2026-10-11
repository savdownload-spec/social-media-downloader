import type { Prisma } from '@prisma/client';

export const ADMIN_RANGE_DAYS = [1, 7, 30, 90, 365] as const;
export const CREDIT_ISSUE_KINDS = ['purchase', 'plan_refill', 'plan_grant'] as const;

export type AdminDateRange = {
  days: number;
  start: Date;
  end: Date;
  timezone: 'UTC';
};

/** UTC calendar ranges with one shared half-open [start, end) policy. */
export function resolveAdminDateRange(value: string | null, now = new Date()): AdminDateRange {
  const parsed = Number.parseInt(value ?? '30', 10);
  const days = ADMIN_RANGE_DAYS.includes(parsed as (typeof ADMIN_RANGE_DAYS)[number]) ? parsed : 30;
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return { days, start, end: now, timezone: 'UTC' };
}

export function dateWhere(range: AdminDateRange) {
  return { gte: range.start, lt: range.end };
}

export function buildOperationWhere(args: {
  range: AdminDateRange;
  search?: string;
  tool?: string;
  platform?: string;
  status?: string;
}): Prisma.DownloadWhereInput {
  const where: Prisma.DownloadWhereInput = { createdAt: dateWhere(args.range) };
  if (args.tool) where.tool = args.tool;
  if (args.platform) where.platform = args.platform;
  if (args.status) where.status = args.status;
  if (args.search) {
    where.OR = [
      { tool: { contains: args.search, mode: 'insensitive' } },
      { platform: { contains: args.search, mode: 'insensitive' } },
    ];
  }
  return where;
}

export function safePage(value: string | null) {
  const parsed = Number.parseInt(value ?? '1', 10);
  return Number.isFinite(parsed) ? Math.max(1, parsed) : 1;
}

export function safePageSize(value: string | null, fallback = 25, maximum = 100) {
  const parsed = Number.parseInt(value ?? String(fallback), 10);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(1, parsed)) : fallback;
}

export function serializeCsv(headers: string[], rows: Record<string, unknown>[]) {
  return [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => JSON.stringify(row[header] ?? '')).join(',')),
  ].join('\n');
}

export type LedgerRow = { amount: number; kind: string };

/** Business definitions used by Credits, Reports, Dashboard, and tests. */
export function summarizeLedger(rows: LedgerRow[]) {
  let totalIssued = 0;
  let totalSpent = 0;
  let totalRefunded = 0;
  let adjustments = 0;
  let expired = 0;
  let netMovement = 0;
  for (const row of rows) {
    netMovement += row.amount;
    if ((CREDIT_ISSUE_KINDS as readonly string[]).includes(row.kind) && row.amount > 0) totalIssued += row.amount;
    else if (row.kind === 'spend' && row.amount < 0) totalSpent += Math.abs(row.amount);
    else if (row.kind === 'refund' && row.amount > 0) totalRefunded += row.amount;
    else if (row.kind === 'adjustment') adjustments += row.amount;
    else if (row.kind === 'expiration' && row.amount < 0) expired += Math.abs(row.amount);
  }
  return { totalIssued, totalSpent, totalRefunded, adjustments, expired, netMovement, transactions: rows.length };
}

export function operationCounts(rows: Array<{ tool: string; status: string }>) {
  const byTool = new Map<string, number>();
  let successful = 0;
  let failed = 0;
  for (const row of rows) {
    byTool.set(row.tool, (byTool.get(row.tool) ?? 0) + 1);
    if (row.status === 'success') successful += 1;
    else if (row.status === 'failed') failed += 1;
  }
  return {
    total: rows.length,
    successful,
    failed,
    byTool: [...byTool].map(([tool, count]) => ({ tool, count })).sort((a, b) => b.count - a.count || a.tool.localeCompare(b.tool)),
  };
}
