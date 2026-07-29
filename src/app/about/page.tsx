import { Container } from '@/components/layout/Container';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'About SavDown',
  description: 'SavDown is a calm, ad-light social media downloader built by a small team who care about design.',
  path: '/about',
});

export default function AboutPage() {
  return (
    <Container className="py-24 max-w-3xl">
      <p className="text-sm font-medium text-primary mb-3">About</p>
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.05]">
        Tools Should Feel Calm.
      </h1>
      <div className="prose-elegant mt-10">
        <p>
          SavDown started with a simple observation: every downloader we tried was
          plastered with ads, dark patterns, and shady popups. We wanted the
          opposite — a tool that felt like Apple's calmest apps: fewer surfaces,
          more clarity, no drama.
        </p>
        <h2>What we believe</h2>
        <p>
          Software should respect your attention. That means no aggressive ads,
          no tracking beyond what's essential, and no cognitive tax. SavDown runs
          fully in your browser session, stores nothing, and never asks for a
          signup to do its job.
        </p>
        <h2>What we support</h2>
        <p>
          YouTube (videos, Shorts, thumbnails), TikTok, Instagram Reels,
          Facebook, Pinterest, and X. We add new platforms only when we can do
          them well — never for the sake of a longer list.
        </p>
        <h2>Who's behind it</h2>
        <p>
          A small independent team of designers and engineers who love clean
          tools. We fund SavDown through the occasional Pro upgrade (coming
          soon) — never through selling your data.
        </p>
      </div>
    </Container>
  );
}
