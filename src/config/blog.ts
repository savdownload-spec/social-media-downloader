/**
 * Static blog content. Kept in code (not the database) so the blog is always
 * populated and works without a running DB. Content uses a light markdown-ish
 * syntax rendered by the blog post page (#, ##, ###, - lists, paragraphs).
 */
export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  author: string;
  publishedAt: string; // ISO date
  readingTime: string;
  tags: string[];
  cover: string; // image seed for the cover
  content: string;
};

export const blogPosts: BlogPost[] = [
  {
    slug: 'how-to-download-youtube-videos-4k',
    title: 'How to Download YouTube Videos in 4K (2026 Guide)',
    excerpt:
      'A step-by-step walkthrough for saving YouTube videos in crisp 4K — plus how to pick the right format and keep the original quality.',
    author: 'The SavDown Team',
    publishedAt: '2026-07-20',
    readingTime: '4 min read',
    tags: ['YouTube', 'Guides', '4K'],
    cover: 'savdown-blog-youtube',
    content: `YouTube hosts some of the highest-quality video on the web, and a growing share of it is uploaded in 4K. Saving those videos for offline viewing — a flight, a spotty connection, or a personal archive — is simple when you know the steps.

## What you need
- A public YouTube video that is actually available in 4K (2160p).
- The video's URL.
- SavDown open in your browser.

## Step by step
- Open the video on YouTube and copy the link from the address bar or the Share menu.
- Paste the link into the SavDown YouTube Video Downloader.
- Wait a moment while we analyse the link and list every available format.
- Choose **MP4 4K** and the download begins immediately.

## Choosing the right format
Not every video offers 4K — the maximum resolution depends on how the creator uploaded it. If you only see 1080p, that is the source ceiling, not a limitation of the tool. For music or podcasts, extracting **MP3** audio is often the smarter choice and saves a lot of space.

## A note on quality
SavDown streams the original file without re-encoding, so you get exactly what the creator uploaded — no added watermark and no quality loss. That is the whole point: your copy should look as good as the original.

## Stay on the right side of the rules
Only download videos you own, have permission to save, or that are licensed for reuse. Downloading is a tool; using it responsibly is on you.`,
  },
  {
    slug: 'is-it-legal-to-download-social-media-videos',
    title: 'Is It Legal to Download Videos From Social Media?',
    excerpt:
      'The honest answer is "it depends." Here is a clear, non-lawyer breakdown of when downloading is fine and when it is not.',
    author: 'The SavDown Team',
    publishedAt: '2026-07-12',
    readingTime: '5 min read',
    tags: ['Legal', 'Copyright', 'Best Practices'],
    cover: 'savdown-blog-legal',
    content: `It is the most common question we get, so let us answer it plainly. This is general information, not legal advice — but it will help you make good decisions.

## The short version
Downloading a video is a technical act. Whether it is *lawful* depends on **what** you download and **what you do with it**.

## When downloading is generally fine
- The content is **yours** — your own uploads, reels, or clips.
- The creator has **explicitly allowed** downloads or reuse.
- The video is licensed under **Creative Commons** or is in the **public domain**.
- You are relying on **fair use / fair dealing** — for education, commentary, criticism, or research — where your local law permits it.

## When it is not okay
- Re-uploading someone else's video as your own.
- Selling or commercially redistributing content you do not own.
- Bypassing paywalls or DRM-protected content.
- Ignoring a platform's terms where they specifically prohibit it.

## Practical rules of thumb
- Ask: *Would the creator be okay with this?* If unsure, ask them.
- Credit creators when you share.
- Keep personal archives personal.

SavDown never hosts or stores media — it simply helps you save a file you have the right to save. The responsibility for how it is used stays with you.`,
  },
  {
    slug: 'mp4-vs-mp3-vs-gif-which-format',
    title: 'MP4 vs MP3 vs GIF: Which Format Should You Choose?',
    excerpt:
      'Video, audio, or a looping clip? A quick guide to picking the right download format for the job — and the file size trade-offs.',
    author: 'The SavDown Team',
    publishedAt: '2026-07-04',
    readingTime: '3 min read',
    tags: ['Formats', 'Guides'],
    cover: 'savdown-blog-formats',
    content: `When you download a clip, SavDown often gives you a choice of formats. Here is how to pick the right one without overthinking it.

## MP4 — the everyday video
MP4 is the universal video format. It plays on virtually every phone, laptop, and TV, and it balances quality against file size well. Choose a resolution (1080p, 720p, or 4K) based on how you will watch it:
- **4K / 1080p** for big screens and archiving.
- **720p** for quick sharing and saving space.

## MP3 — audio only
Only care about the sound — a song, an interview, a podcast? **MP3** strips out the video and keeps just the audio, which means dramatically smaller files. Perfect for listening on the go.

## GIF — the short, silent loop
GIFs are great for reactions and short, silent loops that autoplay everywhere. The catch: GIFs can be surprisingly large and have limited colours, so keep them short. For anything over a few seconds, an MP4 is usually the better choice.

## Quick cheat sheet
- Want to watch it later → **MP4**
- Want to listen only → **MP3**
- Want a short looping reaction → **GIF**

When in doubt, MP4 is the safe default.`,
  },
  {
    slug: 'download-tiktok-without-watermark',
    title: 'How to Save TikTok Videos Without the Watermark',
    excerpt:
      'Watermarks get in the way when you want a clean copy. Here is how to save TikToks in HD without the bouncing logo.',
    author: 'The SavDown Team',
    publishedAt: '2026-06-25',
    readingTime: '3 min read',
    tags: ['TikTok', 'Guides'],
    cover: 'savdown-blog-tiktok',
    content: `The TikTok watermark — that bouncing username and logo — is fine for sharing inside the app, but distracting when you want a clean copy for editing or archiving.

## How to remove it
- Open the TikTok you want to save and tap **Share → Copy Link**.
- Paste the link into the SavDown TikTok Video Downloader.
- Choose **MP4 HD (no watermark)** from the results.
- Your clean copy downloads in seconds.

## Watermark vs no-watermark
We give you both options on purpose:
- **No watermark** — best for editing, remixing, or a distraction-free archive.
- **With watermark** — keeps the original creator's handle visible, which is the respectful choice if you are resharing.

## Please credit creators
Removing a watermark does not remove the creator's rights. If you repost a video, tag the original creator. A clean file is for your convenience, not for passing someone else's work off as your own.

## Only public videos
This works with public TikToks only. Private or friends-only videos are not accessible, by design.`,
  },
  {
    slug: 'download-instagram-reels-any-device',
    title: 'How to Download Instagram Reels on Any Device',
    excerpt:
      'iPhone, Android, or desktop — saving an Instagram Reel takes the same three steps. Here is the quickest way.',
    author: 'The SavDown Team',
    publishedAt: '2026-06-14',
    readingTime: '3 min read',
    tags: ['Instagram', 'Reels', 'Guides'],
    cover: 'savdown-blog-instagram',
    content: `Instagram does not offer a native "save video" button for other people's Reels, but you can still keep a copy in HD from any device.

## The three steps
- On the Reel, tap the **paper-plane / share icon**, then **Copy Link**.
- Open the SavDown Instagram Reels Downloader and paste the link.
- Pick **MP4 1080p** and download.

## Works everywhere
Because SavDown runs in the browser, the steps are identical on iPhone, Android, and desktop — no app to install. On mobile, the file lands in your Photos or Downloads; on desktop, in your Downloads folder.

## Reels, posts, and IGTV
The same tool handles video **posts** and longer **IGTV** clips, not just Reels. Paste any public Instagram video link and we detect the type automatically.

## A quick reminder
Only public content is supported, and — as always — save responsibly. Reels you download are best kept for personal use or shared with proper credit to the creator.`,
  },
  {
    slug: 'creators-guide-repurposing-video',
    title: "A Creator's Guide to Repurposing Video Content",
    excerpt:
      'One video can become a dozen posts. Here is a practical workflow for turning a single clip into content across every platform.',
    author: 'The SavDown Team',
    publishedAt: '2026-05-30',
    readingTime: '5 min read',
    tags: ['Creators', 'Strategy', 'Workflow'],
    cover: 'savdown-blog-creators',
    content: `The most efficient creators do not make more content — they make their content go further. Repurposing is the skill of turning one strong video into many smaller pieces tuned for each platform.

## Start with a source
Everything begins with a clean, high-quality source file. Save your original upload in the best resolution available so every derivative looks sharp. A watermark-free copy gives you the most editing freedom.

## Slice it into moments
A ten-minute video usually contains three or four self-contained "moments" — a strong hook, a tip, a punchline. Each of those can become:
- A vertical short for TikTok, Reels, or YouTube Shorts.
- A square clip for the feed.
- A GIF for a reply or a newsletter.

## Match the format to the platform
- **TikTok / Reels / Shorts** → 9:16 vertical, MP4, under 60 seconds.
- **Feed posts** → 1:1 square or 4:5, MP4.
- **Thumbnails and stills** → grab a high-res frame.

## Keep an archive
Build a simple folder system — by campaign, by month, whatever works — so past clips are one search away. Future-you will thank present-you when you need a quick post.

## Work smart, credit fairly
Repurpose your own work freely. When you build on someone else's, get permission and credit them. Good creators grow faster by lifting others up.`,
  },
];

export const blogPostsByDate = [...blogPosts].sort(
  (a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt),
);

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}
