import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  const reviews = [
    { name: 'Maya R.', role: 'Content Editor', company: 'CreativeStudio', platform: 'direct', rating: 5, review: 'I edit short-form for three brands. Grabbing clean, watermark-free clips in seconds saves me hours every single week. SavDown is now in my daily toolkit.', featured: true, photo: 'https://randomuser.me/api/portraits/women/44.jpg' },
    { name: 'Daniel K.', role: 'Video Creator', company: 'DK Media', platform: 'google', rating: 5, review: 'Finally a set of tools that does not bury the button under ten fake ones. Open, click, done. It just works.', featured: true, photo: 'https://randomuser.me/api/portraits/men/32.jpg' },
    { name: 'Priya S.', role: 'Educator', company: 'University of Tech', platform: 'trustpilot', rating: 5, review: 'I archive lecture recordings and reference reels for my class. The quality is identical to the source every time.', featured: true, photo: 'https://randomuser.me/api/portraits/women/68.jpg' },
    { name: 'Tomas L.', role: 'Social Media Manager', company: 'BrandBoost', platform: 'linkedin', rating: 5, review: 'Runs perfectly on my phone with no app to install. I have saved Reels on the bus more times than I can count.', featured: true, photo: 'https://randomuser.me/api/portraits/men/85.jpg' },
    { name: 'Elena Vargas', role: 'Freelance Designer', company: null, platform: 'producthunt', rating: 5, review: 'The image upscaler alone is worth bookmarking this site for. I pulled a low-res product photo up to print quality for a client mockup and nobody could tell it was upscaled.', featured: true, photo: 'https://randomuser.me/api/portraits/women/21.jpg' },
    { name: 'Ben Whitfield', role: 'Podcast Producer', company: 'Loudmouth Media', platform: 'x', rating: 4, review: 'Use it mostly for pulling TikTok audio to check trending sounds before we script episodes. Works every time, though I wish it kept ID3 tags on the MP3s.', featured: true, photo: 'https://randomuser.me/api/portraits/men/54.jpg' },
    { name: 'Aisha Muhammad', role: 'Small Business Owner', company: 'Aisha’s Kitchen', platform: 'facebook', rating: 5, review: 'I am not techy at all but this was dead simple. Downloaded my own Facebook Reels to repost on Instagram without the watermark. Took me two minutes total.', featured: true, photo: 'https://randomuser.me/api/portraits/women/12.jpg' },
    { name: 'Marco Bellini', role: 'IT Support Lead', company: null, platform: 'g2', rating: 4, review: 'Solid privacy-first approach, which is the main reason we recommend it internally over the sketchier download sites. PDF merge tool has also come in handy for onboarding docs.', featured: false, photo: 'https://randomuser.me/api/portraits/men/76.jpg' },
    { name: 'Chloe Bennett', role: 'University Student', company: null, platform: 'direct', rating: 5, review: 'Saved a Pinterest board full of reference images for my thesis in one sitting instead of screenshotting each one. Genuinely such a time saver.', featured: true, photo: 'https://randomuser.me/api/portraits/women/33.jpg' },
    { name: 'Ryan O’Connell', role: 'YouTube Creator', company: 'RyanBuilds', platform: 'google', rating: 5, review: 'I use the thumbnail downloader constantly for competitor research. Quick, no popups, no sketchy redirects like the other sites I tried first.', featured: true, photo: 'https://randomuser.me/api/portraits/men/41.jpg' },
    { name: 'Fatima Zahra', role: 'Marketing Coordinator', company: 'NovaReach', platform: 'trustpilot', rating: 5, review: 'We needed a quick way to archive our own X posts before a rebrand wiped the old account. This handled the GIFs and videos both without any hassle.', featured: false, photo: 'https://randomuser.me/api/portraits/women/58.jpg' },
    { name: 'Jonas Berg', role: 'QR Code Vendor', company: 'ScanEasy', platform: 'linkedin', rating: 4, review: 'Started using this for the QR generator specifically, stayed for the downloaders. Would be five stars if the QR tool supported custom colors.', featured: false, photo: 'https://randomuser.me/api/portraits/men/19.jpg' },
    { name: 'Grace Okafor', role: 'Content Archivist', company: 'Heritage Digital', platform: 'direct', rating: 5, review: 'Background remover tool is genuinely better than a couple of paid ones I have used. Clean edges even on hair, which usually trips these tools up.', featured: true, photo: 'https://randomuser.me/api/portraits/women/76.jpg' },
  ];

  for (const r of reviews) {
    const id = r.name.replace(/[^a-zA-Z]/g, '-').toLowerCase();
    await prisma.review.upsert({
      where: { id },
      update: { photo: r.photo, featured: r.featured, status: 'APPROVED', approved: true, approvedAt: now },
      create: {
        id,
        ...r,
        status: 'APPROVED',
        approved: true,
        approvedAt: now,
      },
    });
  }

  console.log(`Seeded/updated ${reviews.length} approved reviews.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
