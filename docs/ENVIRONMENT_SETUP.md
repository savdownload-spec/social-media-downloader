# Environment Setup & Configuration Sync

This guide documents how to initialize new environments (development/production) and keep configuration data synchronized across them.

## Table of Contents

- [Overview](#overview)
- [Data Separation](#data-separation)
- [First-Time Environment Setup](#first-time-environment-setup)
- [Configuration Sync Workflow](#configuration-sync-workflow)
- [Deployment Workflow](#deployment-workflow)
- [Backup & Rollback](#backup--rollback)
- [Troubleshooting](#troubleshooting)

## Overview

GetSavDown uses a **dev-first deployment workflow**: changes are developed and tested in the development environment first, then promoted to production. Configuration data (tool settings, admin flags) must stay synchronized, while operational data (users, payments, downloads) remains separate.

### Architecture

- **Development Database**: Neon branch for testing
- **Production Database**: Neon main branch for live traffic
- **Configuration Data**: ToolConfig, AdminSetting (synced)
- **Operational Data**: User, Payment, Download, etc. (NOT synced)

## Data Separation

### Configuration Data (Synced ✅)

These tables contain settings that should be identical in dev and production:

- **ToolConfig**: Tool availability, credit costs, batch limits
- **AdminSetting**: Feature flags, rate limits, credit defaults
- **PricingSetting**: (if exists) Pricing tiers and costs

### Operational Data (Never Synced ❌)

These tables contain live user/business data that MUST stay separate:

- **User**: User accounts and profiles
- **Payment**: Transaction records
- **Subscription**: Active subscriptions
- **Download**: Download history
- **CreditTransaction**: Credit movements
- **Review**: User reviews
- **ContactMessage**: Support messages
- **AuditLog**: Admin action logs
- **BlogComment**: User comments
- All other user-generated or operational tables

### Environment-Specific Settings

Some AdminSettings are environment-specific and should NOT sync:

- `maintenance.enabled` - Local maintenance mode
- `maintenance.message` - Environment-specific message
- `email.notifications_enabled` - Email config per environment
- `backup.automatic_enabled` - Backup settings per environment
- `backup.retention_days` - Retention policy per environment

## First-Time Environment Setup

### Prerequisites

1. Node.js 20+ installed
2. PostgreSQL database URL (Neon recommended)
3. Environment variables configured:
   - `DATABASE_URL` - Pooled connection for queries
   - `DIRECT_URL` - Direct connection for migrations
   - Other service credentials (Stripe, Vercel Blob, Upstash, etc.)

### Step 1: Clone & Install

```bash
git clone <repository-url>
cd social-media-downloader
npm install
```

### Step 2: Configure Environment Variables

Create `.env.local`:

```bash
# Database (use separate databases for dev/prod)
DATABASE_URL="postgresql://user:pass@host-pooler.region.neon.tech/db?sslmode=require"
DIRECT_URL="postgresql://user:pass@host.region.neon.tech/db?sslmode=require"

# Vercel Blob (use separate stores for dev/prod)
BLOB_READ_WRITE_TOKEN="vercel_blob_..."
BLOB_STORE_ID="store_id_dev"

# Upstash Redis (can share or separate)
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."

# Stripe (use test keys in dev, live in prod)
STRIPE_SECRET_KEY="sk_test_..." # or sk_live_...
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..." # or pk_live_...

# NextAuth
NEXTAUTH_SECRET="generate-random-secret-here"
NEXTAUTH_URL="http://localhost:3000" # or production URL

# Email
RESEND_API_KEY="re_..."

# Replicate (AI features)
REPLICATE_API_TOKEN="r8_..."

# Base URL
NEXT_PUBLIC_BASE_URL="http://localhost:3000" # or production URL
```

### Step 3: Initialize Database Schema

```bash
# Run all pending migrations
npm run db:deploy

# Verify schema
npx prisma studio
```

### Step 4: Seed Configuration Data

```bash
# Seed tool configurations (creates ToolConfig for all 59 tools)
npm run db:seed:tools

# Seed admin settings (creates default AdminSetting records)
npm run db:seed:admin

# Or run both at once
npm run db:seed:config
```

### Step 5: Verify Setup

```bash
# Check that code and database are in sync
npm run check:tool-sync

# Should output: "✅ PERFECT SYNC"
```

### Step 6: Seed Sample Data (Dev Only)

```bash
# Seed sample blog authors (optional, dev only)
npm run db:seed:authors

# Run main seed (sample posts, etc.)
npm run db:seed
```

## Configuration Sync Workflow

### When to Sync

Sync configuration when:

1. Tool settings change (credit costs, availability)
2. Feature flags are added/modified
3. New tools are added
4. After production deployment to verify consistency

### Manual Sync Process

#### Export from Source Environment

```bash
# In production (or any source environment)
npm run db:export:config

# Creates: config-export-YYYY-MM-DD.json
```

#### Import to Target Environment

```bash
# In development (or any target environment)

# Dry run first (safe, shows what would change)
npm run db:import:config config-export-2024-01-15.json --dry-run

# If dry run looks good, apply changes
npm run db:import:config config-export-2024-01-15.json
```

### Automated Sync (Recommended)

For continuous dev → prod workflow:

1. Make config changes in development
2. Test thoroughly
3. Export config: `npm run db:export:config`
4. Commit export file: `git add config-export-*.json && git commit -m "chore: export config"`
5. Deploy to production via git push
6. In production, import: `npm run db:import:config config-export-*.json`

## Deployment Workflow

### Development → Production Process

```
┌─────────────────┐
│  Development    │
│  - Make changes │
│  - Test locally │
│  - Seed configs │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Export Config  │
│  npm run        │
│  db:export:     │
│  config         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Commit & Push  │
│  git push       │
│  origin dev     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Code Review    │
│  Pull Request   │
│  to main        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Merge to main  │
│  Deploy to      │
│  production     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Import Config  │
│  (in prod)      │
│  npm run        │
│  db:import:     │
│  config         │
└─────────────────┘
```

### Pre-Deployment Checklist

Before deploying to production:

- [ ] All tests pass locally
- [ ] `npm run check:tool-sync` passes
- [ ] Configuration export created
- [ ] Database migrations tested in dev
- [ ] Environment variables verified
- [ ] Backup of production database taken
- [ ] Rollback plan documented

### Post-Deployment Verification

After deploying to production:

```bash
# 1. Verify database schema is current
npx prisma db pull

# 2. Import configuration
npm run db:import:config config-export-2024-01-15.json

# 3. Verify sync
npm run check:tool-sync

# 4. Test critical paths
# - Tool availability
# - Credit deduction
# - Payment flow
# - Admin dashboard
```

## Backup & Rollback

### Manual Database Backup

```bash
# Using pg_dump (requires PostgreSQL client)
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql

# Or use Neon's web UI to create a point-in-time snapshot
```

### Configuration Rollback

```bash
# 1. Locate previous export
ls -la config-export-*.json

# 2. Import previous config
npm run db:import:config config-export-2024-01-14.json

# 3. Verify
npm run check:tool-sync
```

### Full Database Rollback

For critical failures:

1. Use Neon's point-in-time restore feature (recommended)
2. Or restore from pg_dump backup:

```bash
# WARNING: This will overwrite the database
psql $DATABASE_URL < backup-20240115-120000.sql
```

## Troubleshooting

### "Tool sync check failed" in CI/CD

**Cause**: Code defines tools that don't exist in database

**Fix**:
```bash
# See specific issues
npm run check:tool-sync

# Create missing tools
npm run db:seed:tools

# Verify fix
npm run check:tool-sync
```

### "Missing tools in database"

**Cause**: New tools added to code but not seeded

**Fix**:
```bash
npm run db:seed:tools
```

### "Extra tools in database"

**Cause**: Tools removed from code but still in database

**Fix**: Review extra tools, determine if they should be:
- Re-added to code (if still needed)
- Removed from database (if deprecated)

```sql
-- To remove deprecated tool (careful!)
DELETE FROM "ToolConfig" WHERE slug = 'deprecated-tool-slug';
```

### "Name mismatches"

**Cause**: Tool name changed in code but not updated in database

**Fix**: Either update code to match DB, or run seed to update DB from code

### "Import failed: Protected setting"

**Cause**: Trying to import environment-specific settings

**Fix**: This is expected behavior. Protected settings are intentionally skipped to preserve local configuration.

### "Database connection failed"

**Cause**: Invalid DATABASE_URL or DIRECT_URL

**Fix**:
1. Verify .env.local has correct URLs
2. Check Neon dashboard for correct connection strings
3. Ensure using `-pooler` suffix for DATABASE_URL
4. Ensure using direct endpoint for DIRECT_URL

### "Prisma Client not generated"

**Fix**:
```bash
npx prisma generate
```

### Configuration drift between environments

**Prevention**:
1. Always test in dev first
2. Export config after every change
3. Import config immediately after production deploy
4. Run `check:tool-sync` as part of CI/CD
5. Document manual admin changes

## Best Practices

1. **Never manually edit production database** - Use scripts and migrations
2. **Always dry-run imports first** - `--dry-run` flag is your friend
3. **Keep export files in git** - Track configuration changes over time
4. **Separate credentials per environment** - Never share secrets
5. **Test migrations in dev** - Database changes are hard to undo
6. **Document manual changes** - If you edit via Prisma Studio, document why
7. **Regular sync checks** - Run `check:tool-sync` weekly
8. **Backup before major changes** - 5 minutes of backup saves hours of recovery

## Related Documentation

- [README.md](../README.md) - Quick start guide
- [prisma/schema.prisma](../prisma/schema.prisma) - Database schema
- [src/config/tools.ts](../src/config/tools.ts) - Tool definitions

## Support

For issues with environment setup or configuration sync:

1. Check this documentation first
2. Run `npm run check:tool-sync` for diagnostics
3. Review error messages carefully
4. Check `.env.local` configuration
5. Consult team lead or senior developer
