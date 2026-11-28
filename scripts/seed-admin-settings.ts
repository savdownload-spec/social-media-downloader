/**
 * scripts/seed-admin-settings.ts
 * 
 * Seeds AdminSetting database table with default configuration values.
 * Run: npm run db:seed:admin
 * 
 * This script:
 * - Initializes default AdminSetting records
 * - Sets up feature flags, maintenance mode toggles, etc.
 * - Is idempotent: safe to run multiple times, skips existing records
 * - Documents which settings should sync between environments
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Default admin settings.
 * key: unique setting identifier
 * value: default value (all stored as strings)
 * description: what this setting controls (for documentation)
 * shouldSync: whether this should sync dev → production
 */
const DEFAULT_SETTINGS: Array<{
  key: string;
  value: string;
  description: string;
  shouldSync: boolean;
}> = [
  // Feature flags (should sync)
  {
    key: 'feature.ai_image_generator',
    value: 'true',
    description: 'Enable/disable AI Image Generator tool',
    shouldSync: true,
  },
  {
    key: 'feature.batch_downloads',
    value: 'true',
    description: 'Enable/disable batch download functionality',
    shouldSync: true,
  },
  {
    key: 'feature.referral_program',
    value: 'true',
    description: 'Enable/disable referral rewards program',
    shouldSync: true,
  },
  {
    key: 'feature.credit_packs',
    value: 'true',
    description: 'Enable/disable credit pack purchases',
    shouldSync: true,
  },

  // Maintenance mode (should NOT sync - environment-specific)
  {
    key: 'maintenance.enabled',
    value: 'false',
    description: 'Global maintenance mode toggle',
    shouldSync: false,
  },
  {
    key: 'maintenance.message',
    value: 'We are performing scheduled maintenance. Please check back soon.',
    description: 'Message shown during maintenance mode',
    shouldSync: false,
  },

  // Rate limiting (should sync)
  {
    key: 'ratelimit.anonymous_per_hour',
    value: '10',
    description: 'Anonymous user rate limit per hour',
    shouldSync: true,
  },
  {
    key: 'ratelimit.free_user_per_hour',
    value: '50',
    description: 'Free user rate limit per hour',
    shouldSync: true,
  },
  {
    key: 'ratelimit.pro_user_per_hour',
    value: '200',
    description: 'Pro user rate limit per hour',
    shouldSync: true,
  },

  // Credit system defaults (should sync)
  {
    key: 'credits.daily_free_allowance',
    value: '20',
    description: 'Daily credit allowance for free users',
    shouldSync: true,
  },
  {
    key: 'credits.referral_reward',
    value: '20',
    description: 'Credits awarded for successful referral',
    shouldSync: true,
  },
  {
    key: 'credits.referral_expiry_days',
    value: '30',
    description: 'Days until referral credits expire',
    shouldSync: true,
  },

  // Email notifications (should NOT sync - environment-specific)
  {
    key: 'email.notifications_enabled',
    value: 'true',
    description: 'Enable/disable email notifications globally',
    shouldSync: false,
  },
  {
    key: 'email.support_address',
    value: 'support@getsavdown.com',
    description: 'Support email address',
    shouldSync: true,
  },

  // Backup settings (should NOT sync - environment-specific)
  {
    key: 'backup.automatic_enabled',
    value: 'true',
    description: 'Enable automatic daily backups',
    shouldSync: false,
  },
  {
    key: 'backup.retention_days',
    value: '30',
    description: 'Days to retain automatic backups',
    shouldSync: false,
  },

  // Admin alerts (should sync)
  {
    key: 'alerts.payment_failure_threshold',
    value: '3',
    description: 'Failed payment attempts before admin alert',
    shouldSync: true,
  },
  {
    key: 'alerts.high_credit_usage_threshold',
    value: '1000',
    description: 'Single user credit spend threshold for alert',
    shouldSync: true,
  },

  // Content moderation (should sync)
  {
    key: 'moderation.auto_approve_reviews',
    value: 'false',
    description: 'Auto-approve user reviews without moderation',
    shouldSync: true,
  },
  {
    key: 'moderation.auto_approve_comments',
    value: 'false',
    description: 'Auto-approve blog comments without moderation',
    shouldSync: true,
  },

  // SEO & Analytics (should sync)
  {
    key: 'seo.sitemap_enabled',
    value: 'true',
    description: 'Enable dynamic sitemap generation',
    shouldSync: true,
  },
  {
    key: 'analytics.track_anonymous_users',
    value: 'true',
    description: 'Track analytics for anonymous users',
    shouldSync: true,
  },
];

async function seedAdminSettings() {
  console.log('🌱 Seeding admin settings...\n');

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const setting of DEFAULT_SETTINGS) {
    try {
      // Check if already exists
      const existing = await prisma.adminSetting.findUnique({
        where: { key: setting.key },
      });

      if (existing) {
        console.log(`⏭️  Skipping ${setting.key} (already exists: "${existing.value}")`);
        skipped++;
        continue;
      }

      // Create new AdminSetting
      await prisma.adminSetting.create({
        data: {
          key: setting.key,
          value: setting.value,
        },
      });

      const syncLabel = setting.shouldSync ? '🔄 SYNC' : '🔒 LOCAL';
      console.log(`✅ Created ${setting.key} = "${setting.value}" ${syncLabel}`);
      console.log(`   ${setting.description}`);
      created++;
    } catch (error) {
      console.error(`❌ Error creating ${setting.key}:`, error);
      errors++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Created: ${created}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Total settings: ${DEFAULT_SETTINGS.length}`);
  
  console.log(`\n📝 Note:`);
  console.log(`   🔄 SYNC settings should be synchronized between dev and production`);
  console.log(`   🔒 LOCAL settings are environment-specific and should NOT be synced`);
}

async function main() {
  try {
    await seedAdminSettings();
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
