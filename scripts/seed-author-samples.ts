/**
 * Dev-only sample author profiles for testing the Authors directory.
 *
 * Safety: refuses to run against production and against the production Neon
 * branch, requires an explicit --confirm flag, only touches records with the
 * sample- slug prefix, and never assigns sample authors to real articles.
 *
 *   npm run db:seed:authors -- --confirm
 *   npm run db:seed:authors -- --remove --confirm
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SAMPLE_SLUG_PREFIX = 'sample-';
const PRODUCTION_NEON_ENDPOINT = 'ep-fragrant-frog-ayxufkcd';

type SampleAuthor = {
  name: string;
  slug: string;
  email: string;
  role: string;
  shortBio: string;
  extendedBio: string;
  expertise: string[];
  website?: string;
  socials: Record<string, string>;
  profileImage?: string;
  isSample?: boolean;
};

// Social destinations intentionally point at the homepage until real profiles exist.
const HOME = 'https://getsavdown.com';

const AUTHORS: SampleAuthor[] = [
  {
    name: 'Sarah Johnson',
    slug: 'sample-sarah-johnson',
    email: 'sarah.johnson@example.com',
    role: 'Technology Writer',
    shortBio:
      'Sarah turns complex download, codec, and platform topics into guides anyone can follow, with a focus on video quality and file formats.',
    extendedBio:
      'Sarah Johnson writes practical technology guides for SavDown. She spent several years documenting consumer software and media tools before joining the editorial team, and she still tests every workflow she recommends.\n\nHer work focuses on video quality, codec choices, and the small settings that decide whether a download looks crisp or muddy. When she is not writing, she is usually comparing export presets or helping readers troubleshoot a stubborn file.',
    expertise: ['Video Formats', 'Codecs', 'Platform Tutorials'],
    website: HOME,
    socials: {
      linkedin: HOME,
      x: HOME,
      youtube: HOME,
    },
    profileImage: '/images/authors/sample-sarah-johnson.webp',
  },
  {
    name: 'David Miller',
    slug: 'sample-david-miller',
    email: 'david.miller@example.com',
    role: 'Digital Media Specialist',
    shortBio:
      'David covers media preservation and archiving, helping readers keep personal collections organized without losing quality.',
    extendedBio:
      'David Miller is a digital media specialist with a background in archiving and post-production workflows. He writes about keeping personal media collections usable years after they were downloaded.\n\nHis guides favour simple, repeatable processes: sensible folder structures, consistent formats, and backups that actually get checked.',
    expertise: ['Media Archiving', 'Post-Production', 'Storage'],
    socials: {
      linkedin: HOME,
    },
    profileImage: '/images/authors/sample-david-miller.webp',
  },
  {
    name: 'Emily Carter',
    slug: 'sample-emily-carter',
    email: 'emily.carter@example.com',
    role: 'Content Strategist',
    shortBio:
      'Emily plans the SavDown editorial calendar and makes sure every guide answers a real question readers actually ask.',
    extendedBio:
      'Emily Carter leads content strategy at SavDown. She maps reader questions to guides, reviews drafts for clarity, and keeps the library consistent as new platforms and tools appear.\n\nShe writes about content planning, editorial standards, and the practical details that make a tutorial easy to follow.',
    expertise: ['Editorial Strategy', 'Content Planning', 'UX Writing'],
    website: HOME,
    socials: {},
    profileImage: '/images/authors/sample-emily-carter.webp',
  },
  {
    name: 'Michael Brooks',
    slug: 'sample-michael-brooks',
    email: 'michael.brooks@example.com',
    role: 'Video Technology Expert',
    shortBio:
      'Michael explains the technical side of video: bitrates, containers, HDR, and why the same clip can look different on two devices.',
    extendedBio:
      'Michael Brooks has spent more than a decade working with video pipelines, from capture to delivery. He translates that experience into plain-language explanations for SavDown readers.\n\nHis articles break down the trade-offs behind resolution, bitrate, and encoding so readers can choose settings with confidence instead of guesswork.',
    expertise: ['Encoding', 'HDR', 'Bitrate'],
    socials: {},
    profileImage: '/images/authors/sample-michael-brooks.webp',
  },
  {
    name: 'Olivia Parker',
    slug: 'sample-olivia-parker',
    email: 'olivia.parker@example.com',
    role: 'SEO Content Writer',
    shortBio:
      'Olivia writes search-friendly guides that still read like a person explaining something useful to a friend.',
    extendedBio:
      'Olivia Parker writes and optimises guides for SavDown. She balances search intent with readability, so a page can rank without turning into keyword soup.\n\nShe focuses on tool comparisons, platform changes, and the questions readers ask right before they hit download.',
    expertise: ['SEO Writing', 'Tool Comparisons', 'Search Intent'],
    socials: {
      instagram: HOME,
      x: HOME,
    },
    profileImage: '/images/authors/sample-olivia-parker.webp',
  },
];

// Real editorial identity used by the built-in article catalog. Seeding this
// makes legacy bylines ("The SavDown Team") resolve to a profile page.
const TEAM_AUTHOR: SampleAuthor = {
  name: 'The SavDown Team',
  slug: 'the-savdown-team',
  email: 'team@getsavdown.com',
  role: 'Editorial Team',
  shortBio:
    'The SavDown editorial team writes practical guides about saving, converting, and organizing media, with clear steps and no hype.',
  extendedBio:
    'The SavDown Team produces the guides in the SavDown journal. Every article is reviewed for accuracy, plain language, and respect for creators and copyright.\n\nThe team covers downloader workflows, media formats, and the everyday tools readers use to keep their content organized.',
  expertise: ['Downloader Guides', 'Media Formats', 'Creator Workflows'],
  socials: {},
  isSample: false,
};

const SAMPLE_POSTS = [
  {
    slug: 'sample-choosing-the-right-video-quality',
    title: 'Sample: How to Choose the Right Video Quality Before You Download',
    authorSlug: 'sample-sarah-johnson',
    excerpt:
      'A short walkthrough of resolution, bitrate, and file size trade-offs using a sample SavDown workflow.',
    content:
      '# Sample: How to Choose the Right Video Quality\n\nThis is a sample article created for local development. It is not real editorial content.\n\n## Start with the screen\n\nMatch the download to the device you will watch it on. A 1080p file is usually plenty for a laptop, while 4K makes sense for a large TV.\n\n## Watch the bitrate\n\nTwo files labelled 1080p can look very different. Higher bitrates preserve motion and detail at the cost of file size.\n\n## Keep a copy\n\nStore the original download untouched and make edits from a copy.',
    category: 'Guides',
    readingTimeMinutes: 4,
  },
  {
    slug: 'sample-understanding-audio-bitrates',
    title: 'Sample: Understanding Audio Bitrates for Extracted Tracks',
    authorSlug: 'sample-sarah-johnson',
    excerpt:
      'What actually changes when you move from 128 kbps to 320 kbps, and when it stops mattering.',
    content:
      '# Sample: Understanding Audio Bitrates\n\nThis is a sample article created for local development. It is not real editorial content.\n\n## What the number means\n\nBitrate describes how much data is used per second of audio. Higher values generally mean fewer artefacts.\n\n## Where the limit sits\n\nThe source quality is the ceiling. Re-encoding a low-bitrate track at a higher bitrate does not restore detail.',
    category: 'Guides',
    readingTimeMinutes: 3,
  },
  {
    slug: 'sample-organizing-a-personal-media-archive',
    title: 'Sample: Organizing a Personal Media Archive That Stays Useful',
    authorSlug: 'sample-david-miller',
    excerpt:
      'A simple folder and naming convention for downloaded clips, plus a backup habit that takes five minutes.',
    content:
      '# Sample: Organizing a Personal Media Archive\n\nThis is a sample article created for local development. It is not real editorial content.\n\n## Pick one naming pattern\n\nUse a consistent date-first name so files sort themselves.\n\n## Separate originals from edits\n\nKeep downloaded originals in one folder and working copies in another.',
    category: 'Guides',
    readingTimeMinutes: 5,
  },
];

function fail(message: string): never {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

function assertSafeTarget() {
  const args = new Set(process.argv.slice(2));
  if (!args.has('--confirm')) {
    fail('Refusing to run without --confirm. This script writes sample authors to the database.\n  npm run db:seed:authors -- --confirm');
  }
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    fail('Refusing to run in production. Sample authors are for local development only.');
  }
  const url = process.env.DATABASE_URL ?? '';
  if (!url) fail('DATABASE_URL is not set.');
  if (url.includes(PRODUCTION_NEON_ENDPOINT)) {
    fail('DATABASE_URL points at the production Neon branch. Point it at a development/preview branch first.');
  }
}

async function seed() {
  for (const author of [...AUTHORS, TEAM_AUTHOR]) {
    const existing = await prisma.blogAuthor.findUnique({ where: { slug: author.slug } });
    if (existing && !existing.isSample) {
      if (!author.isSample) {
        console.log(`• "${author.slug}" already exists; leaving it untouched.`);
        continue;
      }
      fail(`An author with slug "${author.slug}" already exists and is not a sample record. Aborting without changes.`);
    }

    const data = {
      name: author.name,
      email: author.email,
      role: author.role,
      profileImage: author.profileImage ?? null,
      shortBio: author.shortBio,
      extendedBio: author.extendedBio,
      expertiseJson: JSON.stringify(author.expertise),
      website: author.website ?? null,
      socialsJson: JSON.stringify(author.socials),
      published: true,
      isSample: author.isSample ?? true,
    };

    await prisma.blogAuthor.upsert({
      where: { slug: author.slug },
      update: data,
      create: { slug: author.slug, ...data },
    });
  }

  const withPosts = process.argv.includes('--with-posts');
  if (withPosts) {
    for (const post of SAMPLE_POSTS) {
      const author = await prisma.blogAuthor.findUnique({ where: { slug: post.authorSlug } });
      if (!author?.isSample) {
        fail(`Sample author ${post.authorSlug} is missing. Aborting before creating sample posts.`);
      }
      await prisma.post.upsert({
        where: { slug: post.slug },
        update: {},
        create: {
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt,
          content: post.content,
          author: author.name,
          authorId: author.id,
          category: post.category,
          readingTimeMinutes: post.readingTimeMinutes,
          published: true,
          publishedAt: new Date(),
          noIndex: true,
        },
      });
    }
  }

  console.log(
    `✓ Seeded ${AUTHORS.length} sample authors, 1 team profile${withPosts ? `, ${SAMPLE_POSTS.length} sample posts` : ''}.`,
  );
  console.log('  Sample profiles are noindexed and excluded from the sitemap. Add --with-posts for demo articles.');
}

async function remove() {
  const sampleAuthors = await prisma.blogAuthor.findMany({
    where: { OR: [{ isSample: true }, { slug: { startsWith: SAMPLE_SLUG_PREFIX } }] },
    select: { id: true, slug: true },
  });

  if (!sampleAuthors.length) {
    console.log('No sample authors found.');
    return;
  }

  for (const author of sampleAuthors) {
    const realPosts = await prisma.post.count({
      where: { authorId: author.id, NOT: { slug: { startsWith: SAMPLE_SLUG_PREFIX } } },
    });
    if (realPosts > 0) {
      fail(`Sample author "${author.slug}" has ${realPosts} non-sample article(s). Reassign them in the admin first.`);
    }
  }

  const ids = sampleAuthors.map((author) => author.id);
  const removedPosts = await prisma.post.deleteMany({
    where: { authorId: { in: ids }, slug: { startsWith: SAMPLE_SLUG_PREFIX } },
  });
  const removedAuthors = await prisma.blogAuthor.deleteMany({ where: { id: { in: ids } } });

  console.log(`✓ Removed ${removedAuthors.count} sample authors and ${removedPosts.count} sample posts.`);
}

(async () => {
  assertSafeTarget();
  if (process.argv.includes('--remove')) {
    await remove();
  } else {
    await seed();
  }
})()
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  })
  .then(async () => {
    await prisma.$disconnect();
  });
