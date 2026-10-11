import { describe, expect, it } from 'vitest';
import {
  buildOperationWhere,
  operationCounts,
  resolveAdminDateRange,
  safePage,
  safePageSize,
  serializeCsv,
  summarizeLedger,
} from './admin-analytics';

describe('admin analytics shared semantics', () => {
  it('uses UTC, half-open calendar boundaries for Today and 7d', () => {
    const now = new Date('2026-10-11T23:59:59.500Z');
    expect(resolveAdminDateRange('1', now)).toMatchObject({ start: new Date('2026-10-11T00:00:00.000Z'), end: now, timezone: 'UTC' });
    expect(resolveAdminDateRange('7', now).start.toISOString()).toBe('2026-10-05T00:00:00.000Z');
    expect(resolveAdminDateRange('999', now).days).toBe(30);
  });

  it('bounds pagination and creates one filter shared by totals and rows', () => {
    expect(safePage('-4')).toBe(1);
    expect(safePageSize('500', 25, 100)).toBe(100);
    const range = resolveAdminDateRange('30', new Date('2026-10-11T12:00:00Z'));
    expect(buildOperationWhere({ range, search: 'pdf', tool: 'compress-pdf', platform: 'pdf', status: 'success' })).toEqual({
      createdAt: { gte: range.start, lt: range.end },
      tool: 'compress-pdf', platform: 'pdf', status: 'success',
      OR: [
        { tool: { contains: 'pdf', mode: 'insensitive' } },
        { platform: { contains: 'pdf', mode: 'insensitive' } },
      ],
    });
  });

  it('defines issued, spent, refunds, purchases, adjustments and expiration without double counting', () => {
    expect(summarizeLedger([
      { kind: 'plan_grant', amount: 100 },
      { kind: 'purchase', amount: 50 },
      { kind: 'spend', amount: -12 },
      { kind: 'refund', amount: 4 },
      { kind: 'refund', amount: -10 },
      { kind: 'adjustment', amount: 3 },
      { kind: 'expiration', amount: -8 },
    ])).toEqual({ totalIssued: 150, totalSpent: 12, totalRefunded: 4, adjustments: 3, expired: 8, netMovement: 127, transactions: 7 });
  });

  it('groups the exact same operation rows for Usage and Reports', () => {
    const summary = operationCounts([
      { tool: 'compress-pdf', status: 'success' },
      { tool: 'compress-pdf', status: 'failed' },
      { tool: 'ai-image-generator', status: 'success' },
    ]);
    expect(summary).toMatchObject({ total: 3, successful: 2, failed: 1 });
    expect(summary.byTool).toEqual([{ tool: 'compress-pdf', count: 2 }, { tool: 'ai-image-generator', count: 1 }]);
  });

  it('exports exactly the provided filtered rows with RFC-compatible escaping', () => {
    const csv = serializeCsv(['tool', 'description'], [{ tool: 'merge-pdf', description: 'one, "two"' }]);
    expect(csv.split('\n')).toHaveLength(2);
    expect(csv).toContain('"one, \\"two\\""');
  });
});
