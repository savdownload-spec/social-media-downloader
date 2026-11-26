/**
 * scripts/seed-tools.ts
 * 
 * Seeds ToolConfig database table from TypeScript tool definitions.
 * Run: npm run db:seed:tools
 * 
 * This script:
 * - Reads all tool definitions from src/config/tools.ts
 * - Creates ToolConfig records for each tool with safe defaults
 * - Is idempotent: safe to run multiple times, skips existing records
 * - Maps tool slugs to correct categories
 * - Preserves any existing admin customizations
 */

import { PrismaClient } from '@prisma/client';
import { tools } from '../src/config/tools';

const prisma = new PrismaClient();

// Map tool slugs to categories
const TOOL_CATEGORIES: Record<string, string> = {
  // Downloader tools
  'youtube-video-downloader': 'Downloader',
  'youtube-shorts-downloader': 'Downloader',
  'youtube-thumbnail-downloader': 'Downloader',
  'youtube-to-mp3': 'Downloader',
  'tiktok-video-downloader': 'Downloader',
  'tiktok-to-mp3': 'Downloader',
  'tiktok-photo-downloader': 'Downloader',
  'tiktok-thumbnail-downloader': 'Downloader',
  'instagram-reels-downloader': 'Downloader',
  'instagram-story-downloader': 'Downloader',
  'instagram-photo-downloader': 'Downloader',
  'facebook-video-downloader': 'Downloader',
  'facebook-photo-downloader': 'Downloader',
  'pinterest-video-downloader': 'Downloader',
  'pinterest-image-downloader': 'Downloader',
  'x-video-downloader': 'Downloader',
  'x-image-downloader': 'Downloader',
  
  // Image tools
  'image-compressor': 'Image',
  'webp-converter': 'Image',
  'heic-to-jpg-converter': 'Image',
  'image-upscaler': 'Image',
  'background-remover': 'Image',
  'ai-image-generator': 'AI',
  
  // Video tools
  'video-compressor': 'Video',
  'gif-to-video-converter': 'Video',
  'video-to-gif-converter': 'Video',
  
  // PDF tools
  'pdf-compressor': 'PDF',
  'merge-pdf': 'PDF',
  'split-pdf': 'PDF',
  'word-to-pdf': 'PDF',
  'excel-to-pdf': 'PDF',
  'ppt-to-pdf': 'PDF',
  'pdf-to-word': 'PDF',
  'pdf-to-excel': 'PDF',
  'pdf-to-ppt': 'PDF',
  'pdf-to-jpg': 'PDF',
  'jpg-to-pdf': 'PDF',
  'protect-pdf': 'PDF',
  'unlock-pdf': 'PDF',
  
  // Utility tools
  'qr-code-generator': 'Utility',
  'qr-code-reader': 'Utility',
  
  // SEO tools
  'meta-tag-generator': 'SEO',
  'robots-txt-generator': 'SEO',
  'sitemap-generator': 'SEO',
  'schema-markup-generator': 'SEO',
  'open-graph-preview': 'SEO',
  'keyword-density-checker': 'SEO',
  'backlink-checker': 'SEO',
  'domain-authority-checker': 'SEO',
  'page-speed-analyzer': 'SEO',
  'ssl-checker': 'SEO',
  'whois-lookup': 'SEO',
  'dns-lookup': 'SEO',
  'redirect-checker': 'SEO',
  'broken-link-checker': 'SEO',
};

// Tools that should start as COMING_SOON
const COMING_SOON_TOOLS = new Set([
  // Add tool slugs here if they should start as COMING_SOON instead of LIVE
]);

// Credit costs for tools (0 = free)
const CREDIT_COSTS: Record<string, number> = {
  // Most tools are free (0 credits)
  // Only specify non-zero costs
  'ai-image-generator': 10, // AI generation costs credits
  'image-upscaler': 5, // Premium feature
  'background-remover': 5, // Premium feature
};

async function seedTools() {
  console.log('🌱 Seeding tool configurations...\n');

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const tool of tools) {
    try {
      const category = TOOL_CATEGORIES[tool.slug] || 'Utility';
      const status = COMING_SOON_TOOLS.has(tool.slug) ? 'COMING_SOON' : 'LIVE';
      const creditCost = CREDIT_COSTS[tool.slug] || 0;

      // Check if already exists
      const existing = await prisma.toolConfig.findUnique({
        where: { slug: tool.slug },
      });

      if (existing) {
        console.log(`⏭️  Skipping ${tool.slug} (already exists)`);
        skipped++;
        continue;
      }

      // Create new ToolConfig
      await prisma.toolConfig.create({
        data: {
          slug: tool.slug,
          name: tool.name,
          category,
          status,
          creditCost,
          freeLimit: 0, // 0 = unlimited for free users (legacy field)
          // Batch limits set to null = use code defaults from batchLimits.ts
          batchLimitFree: null,
          batchLimitPro: null,
          batchLimitMax: null,
          batchLimitLifetime: null,
        },
      });

      console.log(`✅ Created ${tool.slug} (${category}, ${status}, ${creditCost} credits)`);
      created++;
    } catch (error) {
      console.error(`❌ Error creating ${tool.slug}:`, error);
      errors++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Created: ${created}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Total tools: ${tools.length}`);
}

async function main() {
  try {
    await seedTools();
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
