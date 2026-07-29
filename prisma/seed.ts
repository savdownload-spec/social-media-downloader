import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const posts = [
    {
      slug: 'how-to-download-youtube-videos-safely',
      title: 'How to Download YouTube Videos Safely in 2025',
      excerpt: 'A guide to downloading YouTube videos legally and safely — with tips on quality, formats, and offline viewing.',
      content: `# How to Download YouTube Videos Safely\n\nDownloading videos for personal, offline use is a common need — for travel, education, and archival purposes. In this guide we cover legal considerations, best formats, and how to preserve quality.\n\n## Choose the right format\n\nFor most cases, MP4 (H.264) at 1080p is the sweet spot between quality and file size. If you're archiving lectures or tutorials, consider MP4 at 720p to save space.\n\n## Respect copyright\n\nOnly download content you own, have permission to download, or that's licensed under Creative Commons. Never redistribute copyrighted material.\n\n## Use a reputable tool\n\nStay away from sketchy sites bundled with malware. Look for HTTPS, no forced installs, and transparent privacy policies.`,
      tags: ['youtube', 'guide', 'downloader'],
      published: true,
      publishedAt: new Date(),
    },
    {
      slug: 'best-formats-for-instagram-reels',
      title: 'The Best Formats for Saving Instagram Reels',
      excerpt: 'Everything you need to know about aspect ratios, bitrate, and resolution when saving Instagram Reels.',
      content: `# Best Formats for Instagram Reels\n\nReels are shot vertically at 9:16. Preserving that aspect ratio is critical if you plan to re-share or reference them later.\n\n## Resolution\n\n1080x1920 is native; anything higher is upscaled.\n\n## Bitrate\n\nAim for 5–10 Mbps for crisp motion without huge files.`,
      tags: ['instagram', 'reels', 'guide'],
      published: true,
      publishedAt: new Date(),
    },
    {
      slug: 'tiktok-watermark-explained',
      title: 'TikTok Watermarks Explained (and How Downloaders Handle Them)',
      excerpt: 'Why TikTok adds watermarks, when they matter, and how downloader tools deal with them.',
      content: `# TikTok Watermarks Explained\n\nTikTok watermarks include the creator's handle and the TikTok logo. They're there for attribution and platform recognition.\n\n## When to keep them\n\nAlways keep watermarks when re-sharing to give credit to the original creator.\n\n## When they can be removed\n\nFor personal archival of your own content, some tools offer watermark-free downloads.`,
      tags: ['tiktok', 'guide'],
      published: true,
      publishedAt: new Date(),
    },
  ];

  for (const post of posts) {
    await prisma.post.upsert({
      where: { slug: post.slug },
      update: {},
      create: post,
    });
  }

  console.log(`✓ Seeded ${posts.length} posts`);
}

main()
  .then(async () => await prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
