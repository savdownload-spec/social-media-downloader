import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedBlogAuthor() {
  const author = await prisma.blogAuthor.upsert({
    where: { slug: 'savdown-team' },
    update: {},
    create: {
      slug: 'savdown-team',
      name: 'The SavDown Team',
      role: 'Editorial',
      shortBio: 'Practical guides on saving, converting, and working with online media.',
      expertiseJson: JSON.stringify(['YouTube', 'Video Downloading', 'Media Formats', 'Online Tools']),
    },
  });
  console.log(`✓ Seeded blog author: ${author.name} (${author.slug})`);
  return author;
}

// Allow running directly
if (require.main === module) {
  seedBlogAuthor()
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
