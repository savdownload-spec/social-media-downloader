/**
 * scripts/check-tool-sync.ts
 * 
 * Verifies that TypeScript tool definitions match database ToolConfig records.
 * Run: npm run check:tool-sync
 * 
 * This script:
 * - Compares ALL_TOOLS from TypeScript vs ToolConfig in database
 * - Reports missing tools, extra tools, and mismatches
 * - Exits with error code if drift detected (useful for CI/CD)
 * - Can be run in any environment
 * 
 * Exit codes:
 * 0 = Perfect sync
 * 1 = Sync issues detected
 * 2 = Fatal error
 */

import { PrismaClient } from '@prisma/client';
import { tools } from '../src/config/tools';

const prisma = new PrismaClient();

interface SyncIssue {
  type: 'missing_in_db' | 'extra_in_db' | 'name_mismatch';
  slug: string;
  details?: string;
}

async function checkToolSync(): Promise<boolean> {
  console.log('🔍 Checking tool synchronization...\n');

  const issues: SyncIssue[] = [];

  // Get all tools from database
  const dbTools = await prisma.toolConfig.findMany({
    select: { slug: true, name: true },
    orderBy: { slug: 'asc' },
  });

  const dbToolsMap = new Map(dbTools.map((t) => [t.slug, t]));
  const codeToolsMap = new Map(tools.map((t) => [t.slug, t]));

  console.log(`📊 Tool counts:`);
  console.log(`   TypeScript definitions: ${tools.length}`);
  console.log(`   Database ToolConfig: ${dbTools.length}\n`);

  // Check for tools in code but not in database
  console.log('🔎 Checking for missing tools in database...');
  let missingCount = 0;
  for (const tool of tools) {
    if (!dbToolsMap.has(tool.slug)) {
      issues.push({
        type: 'missing_in_db',
        slug: tool.slug,
        details: `Tool "${tool.name}" exists in code but not in database`,
      });
      console.log(`   ❌ Missing: ${tool.slug} (${tool.name})`);
      missingCount++;
    }
  }
  if (missingCount === 0) {
    console.log(`   ✅ All code tools exist in database`);
  }

  // Check for tools in database but not in code
  console.log('\n🔎 Checking for extra tools in database...');
  let extraCount = 0;
  for (const dbTool of dbTools) {
    if (!codeToolsMap.has(dbTool.slug)) {
      issues.push({
        type: 'extra_in_db',
        slug: dbTool.slug,
        details: `Tool "${dbTool.name}" exists in database but not in code`,
      });
      console.log(`   ⚠️  Extra: ${dbTool.slug} (${dbTool.name})`);
      extraCount++;
    }
  }
  if (extraCount === 0) {
    console.log(`   ✅ No extra tools in database`);
  }

  // Check for name mismatches
  console.log('\n🔎 Checking for name mismatches...');
  let mismatchCount = 0;
  for (const tool of tools) {
    const dbTool = dbToolsMap.get(tool.slug);
    if (dbTool && dbTool.name !== tool.name) {
      issues.push({
        type: 'name_mismatch',
        slug: tool.slug,
        details: `Name mismatch: DB="${dbTool.name}" vs Code="${tool.name}"`,
      });
      console.log(`   ⚠️  Mismatch: ${tool.slug}`);
      console.log(`      DB: "${dbTool.name}"`);
      console.log(`      Code: "${tool.name}"`);
      mismatchCount++;
    }
  }
  if (mismatchCount === 0) {
    console.log(`   ✅ All tool names match`);
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  if (issues.length === 0) {
    console.log('✅ PERFECT SYNC - Code and database are in sync!');
    console.log(`${'='.repeat(60)}\n`);
    return true;
  } else {
    console.log('❌ SYNC ISSUES DETECTED');
    console.log(`${'='.repeat(60)}\n`);
    console.log(`📋 Issues found:`);
    console.log(`   Missing in DB: ${missingCount}`);
    console.log(`   Extra in DB: ${extraCount}`);
    console.log(`   Name mismatches: ${mismatchCount}`);
    console.log(`   Total issues: ${issues.length}`);

    console.log(`\n🔧 How to fix:`);
    if (missingCount > 0) {
      console.log(`   - Run 'npm run db:seed:tools' to create missing tools`);
    }
    if (extraCount > 0) {
      console.log(`   - Review extra database tools (may be legacy/deprecated)`);
      console.log(`   - Consider removing them or adding them to code`);
    }
    if (mismatchCount > 0) {
      console.log(`   - Update tool names in code or database to match`);
      console.log(`   - Or run seed script to sync names from code to DB`);
    }
    console.log(`\n`);
    return false;
  }
}

async function main() {
  try {
    const isSync = await checkToolSync();
    process.exit(isSync ? 0 : 1);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(2);
  } finally {
    await prisma.$disconnect();
  }
}

main();
