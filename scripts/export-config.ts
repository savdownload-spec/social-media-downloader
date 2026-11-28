/**
 * scripts/export-config.ts
 * 
 * Exports configuration data from the current database.
 * Run: npm run db:export:config
 * 
 * Exports:
 * - ToolConfig (all tool configurations)
 * - AdminSetting (all admin settings)
 * 
 * Does NOT export operational data like:
 * - User, Payment, ContactMessage, Download, etc.
 * 
 * Output: config-export-{timestamp}.json
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function exportConfig() {
  console.log('📤 Exporting configuration data...\n');

  try {
    // Export ToolConfig
    console.log('📋 Exporting ToolConfig records...');
    const toolConfigs = await prisma.toolConfig.findMany({
      orderBy: { slug: 'asc' },
    });
    console.log(`   Found ${toolConfigs.length} tool configurations`);

    // Export AdminSetting
    console.log('📋 Exporting AdminSetting records...');
    const adminSettings = await prisma.adminSetting.findMany({
      orderBy: { key: 'asc' },
    });
    console.log(`   Found ${adminSettings.length} admin settings`);

    // Build export object
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      database: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'unknown',
      tables: {
        ToolConfig: toolConfigs,
        AdminSetting: adminSettings,
      },
      counts: {
        toolConfigs: toolConfigs.length,
        adminSettings: adminSettings.length,
      },
    };

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `config-export-${timestamp}.json`;
    const filepath = path.join(process.cwd(), filename);

    // Write to file
    fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2), 'utf-8');

    console.log(`\n✅ Export complete!`);
    console.log(`   File: ${filename}`);
    console.log(`   Size: ${(fs.statSync(filepath).size / 1024).toFixed(2)} KB`);
    console.log(`\n📊 Exported data:`);
    console.log(`   ToolConfig: ${exportData.counts.toolConfigs} records`);
    console.log(`   AdminSetting: ${exportData.counts.adminSettings} records`);
    console.log(`\n⚠️  Important:`);
    console.log(`   This file contains configuration only, no user/operational data`);
    console.log(`   Safe to commit to git if needed (contains no secrets)`);
    console.log(`   Use 'npm run db:import:config' to import into another environment`);

    return filename;
  } catch (error) {
    console.error('❌ Export failed:', error);
    throw error;
  }
}

async function main() {
  try {
    await exportConfig();
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
