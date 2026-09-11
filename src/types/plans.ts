/**
 * Shared plan-tier type — safe to import on both client and server.
 *
 * This is intentionally a standalone file with zero imports so it can be
 * consumed by client components, hooks, and server-only modules alike
 * without pulling in any server-only dependencies.
 *
 * The canonical runtime value lives on the User model's `plan` column and
 * is enforced by the billing system in src/lib/billing.ts.
 */

export type PlanTier = 'FREE' | 'PRO' | 'MAX' | 'LIFETIME';
