import { operationCounts, summarizeLedger, type LedgerRow } from '@/lib/admin-analytics';

export type ReconciliationOperation = { id: string; tool: string; status: string; creditCost: number };
export type ReconciliationTransaction = LedgerRow & { id: string; operationId: string | null };

/** Pure reconciliation used by tests and the read-only audit script semantics. */
export function reconcileAdminRecords(
  operations: ReconciliationOperation[],
  transactions: ReconciliationTransaction[],
) {
  const usage = operationCounts(operations);
  const credits = summarizeLedger(transactions);
  const operationIds = new Set(operations.map((operation) => operation.id));
  const unlinkedToolTransactions = transactions.filter((row) => row.kind === 'spend' && (!row.operationId || !operationIds.has(row.operationId)));
  const refundsByOperation = new Map<string, number>();
  for (const transaction of transactions) {
    if (transaction.kind === 'refund' && transaction.amount > 0 && transaction.operationId) {
      refundsByOperation.set(transaction.operationId, (refundsByOperation.get(transaction.operationId) ?? 0) + 1);
    }
  }
  const duplicateRefundOperationIds = [...refundsByOperation].filter(([, count]) => count > 1).map(([id]) => id);
  const successfulWithRefund = operations.filter((operation) => operation.status === 'success' && refundsByOperation.has(operation.id));
  return { usage, reportsToolUsageTotal: usage.total, credits, unlinkedToolTransactions, duplicateRefundOperationIds, successfulWithRefund };
}
