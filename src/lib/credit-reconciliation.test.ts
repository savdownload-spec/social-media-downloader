import { describe, expect, it } from 'vitest';
import { allocateCreditDebit } from './credit-semantics';
import { reconcileAdminRecords } from './reconciliation';

describe('credit and operation reconciliation', () => {
  it('spends plan credits first and never permits concurrent-style overdraft', () => {
    expect(allocateCreditDebit(3, 5, 6)).toEqual({ fromPlan: 3, fromPurchased: 3, nextPlan: 0, nextPurchased: 2 });
    expect(allocateCreditDebit(0, 1, 2)).toBeNull();
    expect(allocateCreditDebit(-1, 5, 1)).toBeNull();
  });

  it('reconciles one successful operation, spend, and ledger totals', () => {
    const result = reconcileAdminRecords(
      [{ id: 'op-1', tool: 'image-compressor', status: 'success', creditCost: 1 }],
      [{ id: 'tx-1', operationId: 'op-1', kind: 'spend', amount: -1 }],
    );
    expect(result.usage.total).toBe(result.reportsToolUsageTotal);
    expect(result.credits.totalSpent).toBe(1);
    expect(result.unlinkedToolTransactions).toEqual([]);
  });

  it('reconciles reservation failure with exactly one idempotent refund', () => {
    const result = reconcileAdminRecords(
      [{ id: 'op-ai', tool: 'ai-image-generator', status: 'failed', creditCost: 5 }],
      [
        { id: 'reserve', operationId: 'op-ai', kind: 'spend', amount: -5 },
        { id: 'refund', operationId: 'op-ai', kind: 'refund', amount: 5 },
      ],
    );
    expect(result.credits.totalSpent).toBe(5);
    expect(result.credits.totalRefunded).toBe(5);
    expect(result.credits.netMovement).toBe(0);
    expect(result.duplicateRefundOperationIds).toEqual([]);
  });

  it('detects a double refund and an accidental refund of a successful job', () => {
    const result = reconcileAdminRecords(
      [{ id: 'op-1', tool: 'ai-image-generator', status: 'success', creditCost: 5 }],
      [
        { id: 'spend', operationId: 'op-1', kind: 'spend', amount: -5 },
        { id: 'refund-1', operationId: 'op-1', kind: 'refund', amount: 5 },
        { id: 'refund-2', operationId: 'op-1', kind: 'refund', amount: 5 },
      ],
    );
    expect(result.duplicateRefundOperationIds).toEqual(['op-1']);
    expect(result.successfulWithRefund).toHaveLength(1);
  });

  it('models partial batch success as five jobs and exactly three spends', () => {
    const operations = Array.from({ length: 5 }, (_, index) => ({
      id: `op-${index}`,
      tool: 'compress-pdf',
      status: index < 3 ? 'success' : 'failed',
      creditCost: index < 3 ? 1 : 0,
    }));
    const transactions = operations.slice(0, 3).map((operation, index) => ({ id: `spend-${index}`, operationId: operation.id, kind: 'spend', amount: -1 }));
    const result = reconcileAdminRecords(operations, transactions);
    expect(result.usage).toMatchObject({ total: 5, successful: 3, failed: 2 });
    expect(result.credits).toMatchObject({ totalSpent: 3, totalRefunded: 0, transactions: 3 });
  });

  it('represents grants, purchases, adjustments and retry deduplication once', () => {
    const transactions = [
      { id: 'grant', operationId: null, kind: 'plan_grant', amount: 100 },
      { id: 'purchase', operationId: null, kind: 'purchase', amount: 50 },
      { id: 'adjust', operationId: null, kind: 'adjustment', amount: -5 },
      // A database uniqueness key means a retried request contributes one row.
      { id: 'retry-key', operationId: 'op-1', kind: 'spend', amount: -1 },
    ];
    const result = reconcileAdminRecords([{ id: 'op-1', tool: 'qr-code-generator', status: 'success', creditCost: 1 }], transactions);
    expect(result.credits).toMatchObject({ totalIssued: 150, totalSpent: 1, adjustments: -5, transactions: 4 });
  });
});
