/**
 * scripts/import-config.ts
 * 
 * Imports configuration data into the current database.
 * Run: npm run db:import:config <filename>
 * 
 * Imports:
 * - ToolConfig (tool configurations)
 * - AdminSetting (admin settings)
 * 
 * Behavior:
 * - Updates existing records
 * - Creates new records
 * - Preserves local environment-specific settings
 * - Provides dry-run option for safety
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Environment-specific settings that should NOT be imported
const PROTECTED_SETTINGS = new Set([
  'maintenance.enabled',
  'maintenance.message',
  'email.notifications_enabled',
  'backup.automatic_enabled',
  'backup.retention_days',
]);

interface ExportData {
  version: string;
  exportedAt: string;
  database: string;
  tables: {
    ToolConfig: any[];
    AdminSetting: any[];
  };
  counts: {
    toolConfigs: number;
    adminSettings: number;
  };
}

async function importConfig(filename: string, dryRun: boolean = false) {
  console.log(`📥 Importing configuration data...\n`);

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  // Read import file
  const filepath = path.isAbsolute(filename) ? filename : path.join(process.cwd(), filename);
  
  if (!fs.existsSync(filepath)) {
    throw new Error(`Import file not found: ${filepath}`);
  }

  console.log(`📄 Reading ${path.basename(filepath)}...`);
  const fileContent = fs.readFileSync(filepath, 'utf-8');
  const importData: ExportData = JSON.parse(fileContent);

  console.log(`   Exported from: ${importData.database}`);
  console.log(`   Exported at: ${importData.exportedAt}`);
  console.log(`   Version: ${importData.version}`);

  let toolsCreated = 0;
  let toolsUpdated = 0;
  let toolsSkipped = 0;
  let settingsCreated = 0;
  let settingsUpdated = 0;
  let settingsSkipped = 0;

  // Import ToolConfig
  console.log(`\n📋 Importing ${importData.tables.ToolConfig.length} ToolConfig records...`);
  for (const tool of importData.tables.ToolConfig) {
    try {
      const existing = await prisma.toolConfig.findUnique({
        where: { slug: tool.slug },
      });

      if (existing) {
        if (!dryRun) {
          await prisma.toolConfig.update({
            where: { slug: tool.slug },
            data: {
              name: tool.name,
              category: tool.category,
              status: tool.status,
              creditCost: tool.creditCost,
              freeLimit: tool.freeLimit,
              batchLimitFree: tool.batchLimitFree,
              batchLimitPro: tool.batchLimitPro,
              batchLimitMax: tool.batchLimitMax,
              batchLimitLifetime: tool.batchLimitLifetime,
            },
          });
        }
        console.log(`✏️  ${dryRun ? 'Would update' : 'Updated'} ${tool.slug}`);
        toolsUpdated++;
      } else {
        if (!dryRun) {
          await prisma.toolConfig.create({
            data: {
              slug: tool.slug,
              name: tool.name,
              category: tool.category,
              status: tool.status,
              creditCost: tool.creditCost,
              freeLimit: tool.freeLimit,
              batchLimitFree: tool.batchLimitFree,
              batchLimitPro: tool.batchLimitPro,
              batchLimitMax: tool.batchLimitMax,
              batchLimitLifetime: tool.batchLimitLifetime,
            },
          });
        }
        console.log(`✅ ${dryRun ? 'Would create' : 'Created'} ${tool.slug}`);
        toolsCreated++;
      }
    } catch (error) {
      console.error(`❌ Error importing ${tool.slug}:`, error);
      toolsSkipped++;
    }
  }

  // Import AdminSetting
  console.log(`\n📋 Importing ${importData.tables.AdminSetting.length} AdminSetting records...`);
  for (const setting of importData.tables.AdminSetting) {
    try {
      // Skip protected settings
      if (PROTECTED_SETTINGS.has(setting.key)) {
        console.log(`🔒 Skipping protected setting: ${setting.key}`);
        settingsSkipped++;
        continue;
      }

      const existing = await prisma.adminSetting.findUnique({
        where: { key: setting.key },
      });

      if (existing) {
        if (!dryRun) {
          await prisma.adminSetting.update({
            where: { key: setting.key },
            data: { value: setting.value },
          });
        }
        console.log(`✏️  ${dryRun ? 'Would update' : 'Updated'} ${setting.key} = "${setting.value}"`);
        settingsUpdated++;
      } else {
        if (!dryRun) {
          await prisma.adminSetting.create({
            data: {
              key: setting.key,
              value: setting.value,
            },
          });
        }
        console.log(`✅ ${dryRun ? 'Would create' : 'Created'} ${setting.key} = "${setting.value}"`);
        settingsCreated++;
      }
    } catch (error) {
      console.error(`❌ Error importing ${setting.key}:`, error);
      settingsSkipped++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`\n   ToolConfig:`);
  console.log(`     Created: ${toolsCreated}`);
  console.log(`     Updated: ${toolsUpdated}`);
  console.log(`     Skipped: ${toolsSkipped}`);
  console.log(`\n   AdminSetting:`);
  console.log(`     Created: ${settingsCreated}`);
  console.log(`     Updated: ${settingsUpdated}`);
  console.log(`     Skipped: ${settingsSkipped} (${settingsSkipped} protected)`);

  if (dryRun) {
    console.log(`\n🔍 This was a DRY RUN - no changes were made`);
    console.log(`   Run without --dry-run to apply changes`);
  } else {
    console.log(`\n✅ Import complete!`);
  }

  console.log(`\n⚠️  Protected settings (not imported):`);
  PROTECTED_SETTINGS.forEach((key) => console.log(`   - ${key}`));
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('❌ Error: No import file specified');
    console.log('\nUsage:');
    console.log('  npm run db:import:config <filename>');
    console.log('  npm run db:import:config <filename> --dry-run');
    console.log('\nExample:');
    console.log('  npm run db:import:config config-export-2024-01-15.json');
    process.exit(1);
  }

  const filename = args[0];
  const dryRun = args.includes('--dry-run');

  try {
    await importConfig(filename, dryRun);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
