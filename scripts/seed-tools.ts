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
import { toolGuides } from '../src/config/toolGuides';

const prisma = new PrismaClient();

// Map tool slugs to categories
const TOOL_CATEGORIES: Record<string, string> = {
  // Downloader tools
  'youtube-video-downloader': 'Downloader',
  'youtube-shorts-downloader': 'Downloader',
  'youtube-thumbnail-downloader': 'Downloader',
  'youtube-to-mp3': 'Downloader',
  'youtube-playlist-downloader': 'Downloader',
  'tiktok-video-downloader': 'Downloader',
  'tiktok-to-mp3': 'Downloader',
  'tiktok-photo-downloader': 'Downloader',
  'tiktok-thumbnail-downloader': 'Downloader',
  'instagram-reels-downloader': 'Downloader',
  'instagram-video-downloader': 'Downloader',
  'instagram-story-downloader': 'Downloader',
  'instagram-photo-downloader': 'Downloader',
  'instagram-profile-picture-downloader': 'Downloader',
  'facebook-video-downloader': 'Downloader',
  'facebook-reels-downloader': 'Downloader',
  'facebook-photo-downloader': 'Downloader',
  'pinterest-video-downloader': 'Downloader',
  'pinterest-image-downloader': 'Downloader',
  'x-video-downloader': 'Downloader',
  'x-gif-downloader': 'Downloader',
  'x-image-downloader': 'Downloader',
  
  // Image tools
  'image-compressor': 'Image',
  'image-resizer': 'Image',
  'image-converter': 'Image',
  'image-enhancer': 'Image',
  'image-upscaler': 'Image',
  'webp-converter': 'Image',
  'heic-to-jpg': 'Image',
  'jpg-to-png': 'Image',
  'png-to-jpg': 'Image',
  'background-remover': 'Image',
  
  // AI tools
  'ai-image-generator': 'AI',
  'ai-thumbnail-generator': 'AI',
  'ai-image-enhancer': 'AI',
  'ai-background-remover': 'AI',
  'ai-youtube-title-generator': 'AI',
  'ai-description-generator': 'AI',
  'ai-hashtag-generator': 'AI',
  'ai-caption-generator': 'AI',
  
  // Video tools
  'video-compressor': 'Video',
  'video-converter': 'Video',
  'video-to-mp3': 'Video',
  'gif-maker': 'Video',
  'mp4-to-gif': 'Video',
  
  // PDF tools
  'pdf-compressor': 'PDF',
  'compress-pdf': 'PDF',
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
  'qr-code-scanner': 'Utility',
  'color-picker': 'Utility',
  'gradient-generator': 'Utility',
  
  // SEO tools
  'meta-title-generator': 'SEO',
  'meta-description-generator': 'SEO',
  'youtube-tags-generator': 'SEO',
  'keyword-generator': 'SEO',
  'schema-generator': 'SEO',
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
const COMING_SOON_TOOLS = new Set<string>([
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

  // Collect all tool slugs from both downloaders and functional tools
  const downloaderSlugs = tools.map(t => ({ slug: t.slug, name: t.name }));
  const functionalSlugs = Object.keys(toolGuides)
    .filter((slug) => !tools.some(t => t.slug === slug)) // Avoid duplicates
    .map((slug) => {
      // Extract name from slug by converting to title case
      const name = slug
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      return { slug, name };
    });

  const allTools = [...downloaderSlugs, ...functionalSlugs];

  console.log(`📋 Found ${allTools.length} tools to process (${downloaderSlugs.length} downloaders + ${functionalSlugs.length} functional tools)\n`);

  for (const tool of allTools) {
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
  console.log(`   Total tools: ${allTools.length}`);
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
