import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const reviews = [
    { name: 'Maya R.', role: 'Content Editor', company: 'CreativeStudio', platform: 'direct', rating: 5, review: 'I edit short-form for three brands. Grabbing clean, watermark-free clips in seconds saves me hours every single week. SavDown is now in my daily toolkit.', featured: true, photo: 'https://randomuser.me/api/portraits/women/44.jpg' },
    { name: 'Daniel K.', role: 'Video Creator', company: 'DK Media', platform: 'google', rating: 5, review: 'Finally a set of tools that does not bury the button under ten fake ones. Open, click, done. It just works.', featured: true, photo: 'https://randomuser.me/api/portraits/men/32.jpg' },
    { name: 'Priya S.', role: 'Educator', company: 'University of Tech', platform: 'trustpilot', rating: 5, review: 'I archive lecture recordings and reference reels for my class. The quality is identical to the source every time.', featured: true, photo: 'https://randomuser.me/api/portraits/women/68.jpg' },
    { name: 'Tomas L.', role: 'Social Media Manager', company: 'BrandBoost', platform: 'linkedin', rating: 5, review: 'Runs perfectly on my phone with no app to install. I have saved Reels on the bus more times than I can count.', featured: false, photo: 'https://randomuser.me/api/portraits/men/85.jpg' },
  ];

  for (const r of reviews) {
    await prisma.review.upsert({
      where: { id: r.name.replace(/\s/g, '-').toLowerCase() },
      update: { photo: r.photo },
      create: {
        ...r,
        name: r.name,
        approved: true,
      },
    });
  }

  console.log(`Updated ${reviews.length} reviews with photos.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
