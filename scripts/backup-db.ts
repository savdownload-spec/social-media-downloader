/**
 * scripts/backup-db.ts
 * 
 * Creates a backup of configuration tables before making changes.
 * Run: npm run db:backup
 * 
 * This creates a JSON backup of:
 * - ToolConfig
 * - AdminSetting
 * 
 * Does NOT backup operational data (Users, Payments, etc.)
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function backupDatabase() {
  console.log('💾 Creating database backup...\n');

  try {
    // Read current configuration
    const toolConfigs = await prisma.toolConfig.findMany({
      orderBy: { slug: 'asc' },
    });

    const adminSettings = await prisma.adminSetting.findMany({
      orderBy: { key: 'asc' },
    });

    // Create backup object
    const backup = {
      version: '1.0',
      createdAt: new Date().toISOString(),
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
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `backup-${timestamp}.json`;
    const filepath = path.join(process.cwd(), 'backups', filename);

    // Ensure backups directory exists
    const backupsDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    // Write backup file
    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2), 'utf-8');

    console.log(`✅ Backup created successfully!`);
    console.log(`   File: backups/${filename}`);
    console.log(`   Size: ${(fs.statSync(filepath).size / 1024).toFixed(2)} KB`);
    console.log(`\n📊 Backed up:`);
    console.log(`   ToolConfig: ${backup.counts.toolConfigs} records`);
    console.log(`   AdminSetting: ${backup.counts.adminSettings} records`);
    console.log(`\n📝 To restore this backup:`);
    console.log(`   npm run db:import:config backups/${filename}`);

    return filename;
  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  }
}

async function main() {
  try {
    await backupDatabase();
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
