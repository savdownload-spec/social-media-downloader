import { prisma } from '@/lib/prisma';
import type { ExportDateField } from './fields';

export interface UsersExportFilter {
  search?: string;
  plan?: string;
  status?: string;
}

export type ExportScope = 'all' | 'filtered' | 'selected';

export interface BuildWhereOptions {
  scope: ExportScope;
  filter?: UsersExportFilter;
  selectedIds?: string[];
  dateField?: ExportDateField;
  dateFrom?: Date | null;
  dateTo?: Date | null;
}

/** Mirrors the where-clause logic in GET /api/admin/users so exports always match what the admin sees on screen. */
export function buildUsersWhere(opts: BuildWhereOptions): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  if (opts.scope === 'selected') {
    where.id = { in: opts.selectedIds && opts.selectedIds.length > 0 ? opts.selectedIds : ['__none__'] };
  } else if (opts.scope === 'filtered' && opts.filter) {
    const { search, plan, status } = opts.filter;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (plan && plan !== 'ALL') where.plan = plan;
    if (status === 'SUSPENDED') where.role = 'SUSPENDED';
  }

  // Date range never narrows an explicit "selected users" list — the admin
  // already hand-picked those rows, so silently dropping some because they
  // fall outside a date window would contradict the selection they made.
  if (opts.scope !== 'selected' && (opts.dateFrom || opts.dateTo)) {
    const field = opts.dateField ?? 'createdAt';
    where[field] = {
      ...(opts.dateFrom ? { gte: opts.dateFrom } : {}),
      ...(opts.dateTo ? { lte: opts.dateTo } : {}),
    };
  }

  return where;
}

export async function countUsersForExport(where: Record<string, unknown>): Promise<number> {
  return prisma.user.count({ where });
}

export interface ExportRow {
  id: string;
  name: string | null;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
  accountStatus: string;
  role: string;
  jobTitle: string | null;
  company: string | null;
  bio: string | null;
  totalDownloads: number;
  creditsBalance: number;
  creditsUsed: number;
  lastActivity: Date | null;
  currentPlan: string;
  subscriptionStatus: string | null;
  subscriptionStart: Date | null;
  subscriptionRenewal: Date | null;
  lifetimePurchase: string;
  paymentCount: number;
  creditsPurchased: number;
  lastPaymentDate: Date | null;
  newsletterStatus: string;
  affiliateStatus: string | null;
  affiliateCode: string | null;
  reviewCount: number;
  averageRating: number | null;
}

const BATCH_SIZE = 500;

/**
 * Fetches every user matching `where` plus all the joined aggregates
 * (credit ledger, subscriptions, reviews, affiliate, newsletter) needed to
 * populate every field in the export catalog. Batches the base user query
 * to avoid loading an unbounded result set into memory at once; the
 * aggregate queries are batched by id/email chunk for the same reason.
 */
export async function fetchExportRows(
  where: Record<string, unknown>,
  onProgress?: (fetched: number, total: number) => void,
): Promise<ExportRow[]> {
  const total = await prisma.user.count({ where });
  const rows: ExportRow[] = [];

  const baseUsers: Array<{
    id: string; name: string | null; email: string | null; role: string;
    plan: string; planCredits: number; purchasedCredits: number;
    jobTitle: string | null; company: string | null; bio: string | null;
    createdAt: Date; updatedAt: Date;
    _count: { downloads: number; reviews: number };
    subscriptions: { status: string; createdAt: Date; currentPeriodEnd: Date | null }[];
    downloads: { createdAt: Date }[];
  }> = [];

  for (let skip = 0; skip < total; skip += BATCH_SIZE) {
    const batch = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: BATCH_SIZE,
      select: {
        id: true, name: true, email: true, role: true, plan: true,
        planCredits: true, purchasedCredits: true,
        jobTitle: true, company: true, bio: true,
        createdAt: true, updatedAt: true,
        _count: { select: { downloads: true, reviews: true } },
        subscriptions: { orderBy: { createdAt: 'desc' }, take: 1, select: { status: true, createdAt: true, currentPeriodEnd: true } },
        downloads: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } },
      },
    });
    baseUsers.push(...batch);
    onProgress?.(baseUsers.length, total);
  }

  if (baseUsers.length === 0) return rows;

  const ids = baseUsers.map((u) => u.id);
  const emails = baseUsers.map((u) => u.email).filter((e): e is string => !!e);

  const [spendAgg, purchaseAgg, reviewAgg, affiliates, newsletters] = await Promise.all([
    prisma.creditTransaction.groupBy({
      by: ['userId'], where: { userId: { in: ids }, kind: 'spend' }, _sum: { amount: true },
    }),
    prisma.creditTransaction.groupBy({
      by: ['userId'], where: { userId: { in: ids }, kind: 'purchase' }, _sum: { amount: true }, _count: { _all: true }, _max: { createdAt: true },
    }),
    prisma.review.groupBy({
      by: ['userId'], where: { userId: { in: ids } }, _avg: { rating: true }, _count: { _all: true },
    }),
    prisma.affiliate.findMany({ where: { userId: { in: ids } } }),
    emails.length > 0 ? prisma.newsletterSubscriber.findMany({ where: { email: { in: emails } } }) : Promise.resolve([]),
  ]);

  const spendByUser = new Map(spendAgg.map((r) => [r.userId, Math.abs(r._sum.amount ?? 0)]));
  const purchaseByUser = new Map(purchaseAgg.map((r) => [r.userId, { sum: r._sum.amount ?? 0, count: r._count._all, last: r._max.createdAt }]));
  const reviewByUser = new Map(reviewAgg.map((r) => [r.userId, { avg: r._avg.rating, count: r._count._all }]));
  const affiliateByUser = new Map(affiliates.map((a) => [a.userId, a]));
  const newsletterByEmail = new Map(newsletters.map((n) => [n.email.toLowerCase(), n]));

  for (const u of baseUsers) {
    const purchase = purchaseByUser.get(u.id);
    const review = reviewByUser.get(u.id);
    const affiliate = affiliateByUser.get(u.id);
    const newsletter = u.email ? newsletterByEmail.get(u.email.toLowerCase()) : undefined;
    const sub = u.subscriptions[0];

    rows.push({
      id: u.id,
      name: u.name,
      email: u.email,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      accountStatus: u.role === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE',
      role: u.role,
      jobTitle: u.jobTitle,
      company: u.company,
      bio: u.bio,
      totalDownloads: u._count.downloads,
      creditsBalance: u.planCredits + u.purchasedCredits,
      creditsUsed: spendByUser.get(u.id) ?? 0,
      lastActivity: u.downloads[0]?.createdAt ?? null,
      currentPlan: u.plan,
      subscriptionStatus: sub?.status ?? null,
      subscriptionStart: sub?.createdAt ?? null,
      subscriptionRenewal: sub?.currentPeriodEnd ?? null,
      lifetimePurchase: u.plan === 'LIFETIME' ? 'Yes' : 'No',
      paymentCount: purchase?.count ?? 0,
      creditsPurchased: purchase?.sum ?? 0,
      lastPaymentDate: purchase?.last ?? null,
      newsletterStatus: newsletter ? (newsletter.active ? 'Subscribed' : 'Unsubscribed') : 'Not subscribed',
      affiliateStatus: affiliate?.status ?? null,
      affiliateCode: affiliate?.code ?? null,
      reviewCount: review?.count ?? 0,
      averageRating: review?.avg != null ? Math.round(review.avg * 100) / 100 : null,
    });
  }

  return rows;
}

/** Renders a single field's value as a display string/number for CSV/XLSX/PDF cells. */
export function formatFieldValue(row: ExportRow, fieldId: string): string | number {
  const v = (row as unknown as Record<string, unknown>)[fieldId];
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString();
  return v as string | number;
}
