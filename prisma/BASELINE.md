# Prisma migration baseline

The production Neon database was originally created and evolved with
`prisma db push`, so the old incremental SQL files did not include creation of
the core schema and were never recorded in `_prisma_migrations`. They are kept
in `prisma/migrations-legacy-db-push` for audit history, but are intentionally
outside Prisma's active migration directory.

`migrations/0_init` is the baseline generated from the Prisma schema immediately
before the newsletter-provider change, adjusted to match the three auth/session
indexes that were absent in production. `20261014_session_account_indexes`
adds those indexes safely, and `20261015_newsletter_provider` follows it.

`npm run db:deploy` handles both supported cases:

- An empty database applies `0_init` and every later migration normally.
- A legacy non-empty database without `_prisma_migrations` is compared with the
  baseline's modeled columns, indexes, and constraints. Only an exact modeled
  schema match is recorded with `prisma migrate resolve --applied 0_init`.
  Forward migrations then run normally.

If verification fails, deployment stops without changing migration history.
Never use `migrate reset` against production and never resolve migrations by
hand without first comparing the target schema.
