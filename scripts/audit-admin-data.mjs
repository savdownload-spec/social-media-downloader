import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  const [operations, transactions, balance] = await Promise.all([
    prisma.download.groupBy({ by: ['status'], _count: { status: true } }),
    prisma.creditTransaction.groupBy({ by: ['kind'], _count: { kind: true }, _sum: { amount: true } }),
    prisma.user.aggregate({ _sum: { planCredits: true, purchasedCredits: true } }),
  ]);
  const [unlinkedSpend, duplicateRefunds] = await Promise.all([
    prisma.creditTransaction.count({ where: { kind: 'spend', operationId: null } }),
    prisma.$queryRaw`
      SELECT "operationId", COUNT(*)::int AS count
      FROM "CreditTransaction"
      WHERE "kind" = 'refund' AND "amount" > 0 AND "operationId" IS NOT NULL
      GROUP BY "operationId"
      HAVING COUNT(*) > 1
    `,
  ]);
  console.log(JSON.stringify({
    readOnly: true,
    operations,
    transactions,
    currentBalance: (balance._sum.planCredits ?? 0) + (balance._sum.purchasedCredits ?? 0),
    unlinkedSpend,
    duplicateRefunds,
    note: 'Legacy rows are reported, never guessed or rewritten. Only deterministic bucket attribution is backfilled by the migration.',
  }, (_, value) => typeof value === 'bigint' ? Number(value) : value, 2));
} finally {
  await prisma.$disconnect();
}
