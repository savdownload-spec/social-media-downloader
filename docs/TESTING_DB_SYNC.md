# Testing Database Synchronization Implementation

This guide provides step-by-step instructions for testing the database synchronization implementation in development before using it in production.

## Prerequisites

- Development environment configured with `.env.local`
- Database connection working (`DATABASE_URL` and `DIRECT_URL` set)
- Node.js 20+ and npm installed
- Prisma Client generated (`npm install` runs this automatically)

## Quick Test

Run the automated test workflow:

```bash
npm run test:sync-workflow
```

This will:
1. ✅ Verify database connection
2. 📊 Count existing configuration
3. 🌱 Test seed operations
4. 🔍 Verify code/DB synchronization
5. 📤 Test configuration export
6. 📥 Validate import capability

Expected output:
```
🎉 All tests passed! Database sync workflow is ready to use.
```

## Manual Testing Steps

### 1. Initial Setup (Fresh Database)

If starting with a clean database:

```bash
# Apply schema
npm run db:deploy

# Test: Check database is empty
npx prisma studio
# Should show empty ToolConfig and AdminSetting tables
```

### 2. Test Tool Seeding

```bash
# Run tool seed script
npm run db:seed:tools
```

Expected output:
```
🌱 Seeding tool configurations...

✅ Created youtube-video-downloader (Downloader, LIVE, 0 credits)
✅ Created youtube-shorts-downloader (Downloader, LIVE, 0 credits)
...
✅ Created x-gif-downloader (Downloader, LIVE, 0 credits)

📊 Summary:
   Created: 18 (or more)
   Skipped: 0
   Errors: 0
   Total tools: 18 (or more)
```

Verify:
```bash
# Should show 18+ tools
npx prisma studio
# Or query directly
npx prisma db execute --stdin <<< "SELECT slug, name, category, status FROM \"ToolConfig\" ORDER BY slug;"
```

### 3. Test Idempotency

Run seed again to verify it's safe to re-run:

```bash
# Should skip all existing tools
npm run db:seed:tools
```

Expected output:
```
⏭️  Skipping youtube-video-downloader (already exists)
⏭️  Skipping youtube-shorts-downloader (already exists)
...

📊 Summary:
   Created: 0
   Skipped: 18 (or more)
   Errors: 0
```

### 4. Test Admin Settings Seed

```bash
# Seed admin settings
npm run db:seed:admin
```

Expected output:
```
🌱 Seeding admin settings...

✅ Created feature.ai_image_generator = "true" 🔄 SYNC
   Enable/disable AI Image Generator tool
✅ Created feature.batch_downloads = "true" 🔄 SYNC
...

📊 Summary:
   Created: 20+ (depends on defaults)
   Skipped: 0
   Errors: 0
```

Verify settings are created:
```bash
npx prisma studio
# Check AdminSetting table has ~20+ records
```

### 5. Test Combined Seed

```bash
# Run both seeds at once
npm run db:seed:config
```

Should run both scripts and show combined output.

### 6. Test Sync Check

```bash
# Verify code and database are synchronized
npm run check:tool-sync
```

Expected output:
```
🔍 Checking tool synchronization...

📊 Tool counts:
   TypeScript definitions: 18
   Database ToolConfig: 18

🔎 Checking for missing tools in database...
   ✅ All code tools exist in database

🔎 Checking for extra tools in database...
   ✅ No extra tools in database

🔎 Checking for name mismatches...
   ✅ All tool names match

============================================================
✅ PERFECT SYNC - Code and database are in sync!
============================================================
```

Exit code should be 0:
```bash
echo $?  # Linux/Mac
echo $LASTEXITCODE  # Windows PowerShell
# Should print: 0
```

### 7. Test Configuration Backup

```bash
# Create a backup before making changes
npm run db:backup
```

Expected output:
```
💾 Creating database backup...

✅ Backup created successfully!
   File: backups/backup-2024-01-15T10-30-45.json
   Size: 25.34 KB

📊 Backed up:
   ToolConfig: 18 records
   AdminSetting: 23 records

📝 To restore this backup:
   npm run db:import:config backups/backup-2024-01-15T10-30-45.json
```

Verify backup file exists:
```bash
ls backups/
# Should show backup-*.json file
```

### 8. Test Configuration Export

```bash
# Export current configuration
npm run db:export:config
```

Expected output:
```
📤 Exporting configuration data...

📋 Exporting ToolConfig records...
   Found 18 tool configurations
📋 Exporting AdminSetting records...
   Found 23 admin settings

✅ Export complete!
   File: config-export-2024-01-15.json
   Size: 28.45 KB

📊 Exported data:
   ToolConfig: 18 records
   AdminSetting: 23 records
```

Inspect export file:
```bash
cat config-export-2024-01-15.json | head -20
```

Should show JSON structure:
```json
{
  "version": "1.0",
  "exportedAt": "2024-01-15T10:30:45.123Z",
  "database": "your-host",
  "tables": {
    "ToolConfig": [ ... ],
    "AdminSetting": [ ... ]
  },
  "counts": { ... }
}
```

### 9. Test Import (Dry Run)

```bash
# Test import without making changes
npm run db:import:config config-export-2024-01-15.json --dry-run
```

Expected output:
```
📥 Importing configuration data...

🔍 DRY RUN MODE - No changes will be made

📄 Reading config-export-2024-01-15.json...
   Exported from: your-host
   Exported at: 2024-01-15T10:30:45.123Z

📋 Importing 18 ToolConfig records...
✏️  Would update youtube-video-downloader
✏️  Would update youtube-shorts-downloader
...

📋 Importing 23 AdminSetting records...
✏️  Would update feature.ai_image_generator = "true"
🔒 Skipping protected setting: maintenance.enabled
...

📊 Summary:
   ToolConfig:
     Created: 0
     Updated: 18
     Skipped: 0

   AdminSetting:
     Created: 0
     Updated: 20
     Skipped: 3 (3 protected)

🔍 This was a DRY RUN - no changes were made
   Run without --dry-run to apply changes
```

### 10. Test Actual Import

```bash
# Apply import (should be no-op since data matches)
npm run db:import:config config-export-2024-01-15.json
```

Should show similar output but without "Would" prefixes and with confirmation:
```
✅ Import complete!
```

### 11. Test Protected Settings

Modify a protected setting and verify it's not imported:

```bash
# Modify maintenance mode in database
npx prisma studio
# Change maintenance.enabled to "true"

# Export this change
npm run db:export:config  # Creates new export with maintenance=true

# Import should skip protected settings
npm run db:import:config config-export-2024-01-15.json

# Output should show:
# 🔒 Skipping protected setting: maintenance.enabled

# Verify maintenance.enabled is still "true" (not reverted)
npx prisma studio
```

### 12. Test Sync Failure Detection

Temporarily break sync and verify detection:

```bash
# Delete a tool from database
npx prisma studio
# Delete one ToolConfig record

# Check sync - should fail
npm run check:tool-sync
```

Expected output:
```
❌ SYNC ISSUES DETECTED
...
📋 Issues found:
   Missing in DB: 1
   ...

🔧 How to fix:
   - Run 'npm run db:seed:tools' to create missing tools
```

Exit code should be 1:
```bash
echo $?  # Should print: 1
```

Fix the sync:
```bash
# Re-seed to fix
npm run db:seed:tools

# Verify fixed
npm run check:tool-sync
# Should show: ✅ PERFECT SYNC
```

## Integration Testing

### Test Full Workflow

Simulate a complete dev → production sync:

```bash
# 1. Make a change in development
# Edit a tool's credit cost in Prisma Studio
# Change youtube-video-downloader creditCost to 5

# 2. Verify change
npm run check:tool-sync  # Should still pass (name didn't change)

# 3. Export configuration
npm run db:export:config  # Creates export with new cost

# 4. Simulate production import (dry-run first)
npm run db:import:config config-export-2024-01-15.json --dry-run
# Should show: Would update youtube-video-downloader

# 5. Apply import
npm run db:import:config config-export-2024-01-15.json
# Should show: Updated youtube-video-downloader

# 6. Verify sync
npm run check:tool-sync  # Should pass
```

## CI/CD Testing

### Test GitHub Actions Workflow

If you have CI/CD set up:

```bash
# Push a change to trigger workflow
git add .
git commit -m "test: trigger sync check"
git push origin feature/test-sync

# Create PR to main or dev
# GitHub Actions should run check-tool-sync.yml

# Verify workflow passes
# Check GitHub Actions tab
```

### Test Failure Case

```bash
# Create a sync failure
# Add a new tool to tools.ts but don't seed

# Commit and push
git add src/config/tools.ts
git commit -m "test: add new tool"
git push

# CI should fail with:
# ❌ SYNC ISSUES DETECTED
# Missing in DB: 1
```

## Troubleshooting Tests

### Database Connection Fails

```bash
# Check environment variables
echo $DATABASE_URL
echo $DIRECT_URL

# Test connection
npx prisma db pull
```

### Prisma Client Not Generated

```bash
# Regenerate Prisma Client
npx prisma generate
```

### Scripts Can't Find Tools

```bash
# Verify TypeScript compiles
npx tsc --noEmit

# Check tools export
node -e "const { tools } = require('./src/config/tools'); console.log(tools.length);"
```

### Import/Export Fails

```bash
# Check file permissions
ls -la config-export-*.json
ls -la backups/

# Verify JSON is valid
cat config-export-*.json | jq .
```

## Performance Testing

### Measure Script Performance

```bash
# Time each operation
time npm run db:seed:tools
time npm run db:seed:admin
time npm run check:tool-sync
time npm run db:export:config
time npm run db:import:config config-export-*.json
```

Expected times:
- Seed tools: < 2 seconds
- Seed admin: < 1 second
- Sync check: < 1 second
- Export: < 1 second
- Import: < 2 seconds

### Stress Test

```bash
# Run seeds multiple times
for i in {1..10}; do npm run db:seed:config; done

# Should complete without errors
# Time should not degrade significantly
```

## Success Criteria

All tests pass if:
- ✅ All seed scripts complete without errors
- ✅ Idempotency verified (safe to re-run)
- ✅ Sync check passes after seeding
- ✅ Export creates valid JSON file
- ✅ Import applies changes correctly
- ✅ Dry-run shows changes without applying
- ✅ Protected settings are preserved
- ✅ Sync failures are detected
- ✅ CI/CD workflow integrates correctly
- ✅ All scripts complete in < 5 seconds each

## Post-Testing Checklist

After successful testing:

- [ ] All scripts work correctly
- [ ] Documentation is accurate
- [ ] CI/CD workflow is configured
- [ ] Environment variables are documented
- [ ] Backup/restore tested
- [ ] Edge cases handled
- [ ] Error messages are clear
- [ ] Ready for production use

## Production Testing

Before using in production:

1. **Test in staging first** (if available)
2. **Create full database backup**
3. **Run test workflow**: `npm run test:sync-workflow`
4. **Verify with dry-run**: `npm run db:import:config <file> --dry-run`
5. **Monitor first production run carefully**
6. **Keep rollback plan ready**

## Support

If tests fail:
1. Review error messages carefully
2. Check this testing guide
3. Consult `docs/ENVIRONMENT_SETUP.md`
4. Run `npm run test:sync-workflow` for diagnostics
5. Check database connection and permissions
6. Verify Prisma Client is generated
7. Escalate to team lead if needed

## Conclusion

These tests verify the complete database synchronization implementation works correctly and is ready for production use. All scripts are idempotent, safe to run, and properly documented.
