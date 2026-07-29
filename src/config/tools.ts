/**
 * Central tool registry.
 * Each tool page pulls its config, SEO, and rendering from here so we don't
 * duplicate 8 nearly-identical files. Add a new tool by adding an entry.
 */

export type Platform =
  | 'youtube'
  | 'tiktok'
  | 'instagram'
  | 'facebook'
  | 'pinterest'
  | 'x';

export type Tool = {
  slug: string;
  platform: Platform;
  name: string;
  shortName: string;
  headline: string;
  subheadline: string;
  description: string;
  keywords: string[];
  placeholder: string;
  urlPattern: RegExp;
  outputKind: 'video' | 'image';
  supportedFormats: string[];
  featured: boolean;
  trending: boolean;
  faq: { question: string; answer: string }[];
  howTo: { title: string; body: string }[];
};

export const tools: Tool[] = [
  {
    slug: 'youtube-video-downloader',
    platform: 'youtube',
    name: 'YouTube Video Downloader',
    shortName: 'YouTube Video',
    headline: 'Save YouTube videos in stunning quality.',
    subheadline: 'Paste any YouTube link. Pick a format. Download in seconds.',
    description:
      'Download YouTube videos in MP4 up to 4K. Fast, private, and free — no watermarks, no signup.',
    keywords: ['youtube video downloader', 'youtube mp4', 'download youtube video', 'yt downloader'],
    placeholder: 'https://youtube.com/watch?v=…',
    urlPattern: /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/i,
    outputKind: 'video',
    supportedFormats: ['MP4 4K', 'MP4 1080p', 'MP4 720p', 'MP3'],
    featured: true,
    trending: true,
    faq: [
      { question: 'Is downloading YouTube videos free?', answer: 'Yes — SavDown is completely free with no signup required.' },
      { question: 'What resolutions are supported?', answer: 'From 360p up to 4K, when available on the source video.' },
      { question: 'Do you store the videos I download?', answer: 'No. We route the stream and never save the file.' },
    ],
    howTo: [
      { title: 'Copy the YouTube URL', body: 'Open the video on YouTube and copy the link from the address bar or Share menu.' },
      { title: 'Paste it above', body: 'Paste the URL into SavDown. We\'ll detect the video automatically.' },
      { title: 'Choose your format', body: 'Pick MP4 up to 4K or extract MP3 audio.' },
      { title: 'Download', body: 'Your file is ready in seconds — direct to your device.' },
    ],
  },
  {
    slug: 'youtube-shorts-downloader',
    platform: 'youtube',
    name: 'YouTube Shorts Downloader',
    shortName: 'YouTube Shorts',
    headline: 'Grab YouTube Shorts, watermark-free.',
    subheadline: 'Save vertical Shorts in original quality for offline viewing or archival.',
    description:
      'Download YouTube Shorts in MP4 with original 1080x1920 resolution. Fast, watermark-free, and private.',
    keywords: ['youtube shorts downloader', 'download youtube shorts', 'shorts mp4'],
    placeholder: 'https://youtube.com/shorts/…',
    urlPattern: /^(https?:\/\/)?(www\.)?(youtube\.com\/shorts\/|youtu\.be\/).+/i,
    outputKind: 'video',
    supportedFormats: ['MP4 1080p', 'MP4 720p'],
    featured: true,
    trending: true,
    faq: [
      { question: 'Are Shorts saved vertically?', answer: 'Yes — original 9:16 aspect ratio is preserved.' },
      { question: 'Is there a watermark?', answer: 'No watermark is added by SavDown.' },
    ],
    howTo: [
      { title: 'Open the Short', body: 'Find the YouTube Short you want to save.' },
      { title: 'Copy its URL', body: 'Tap Share → Copy Link.' },
      { title: 'Paste and download', body: 'Paste the link into SavDown and hit Download.' },
    ],
  },
  {
    slug: 'youtube-thumbnail-downloader',
    platform: 'youtube',
    name: 'YouTube Thumbnail Downloader',
    shortName: 'YouTube Thumbnails',
    headline: 'Download any YouTube thumbnail in max resolution.',
    subheadline: 'Perfect for creators studying design, or just curating inspiration.',
    description:
      'Grab any YouTube thumbnail in Maximum Resolution (Max-Res), HQ, MQ, and SD. Free and fast.',
    keywords: ['youtube thumbnail downloader', 'youtube thumbnail hd', 'download youtube thumbnail'],
    placeholder: 'https://youtube.com/watch?v=…',
    urlPattern: /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/i,
    outputKind: 'image',
    supportedFormats: ['MaxRes JPG', 'HQ JPG', 'MQ JPG', 'SD JPG'],
    featured: true,
    trending: false,
    faq: [
      { question: 'What resolutions are available?', answer: 'MaxRes (1280x720), HQ (480x360), MQ (320x180), SD (120x90).' },
    ],
    howTo: [
      { title: 'Paste any YouTube video URL', body: 'Full video link, Short link, or youtu.be link — all work.' },
      { title: 'Pick your resolution', body: 'MaxRes is best for reference or study.' },
      { title: 'Download', body: 'Save the thumbnail directly to your device.' },
    ],
  },
  {
    slug: 'tiktok-video-downloader',
    platform: 'tiktok',
    name: 'TikTok Video Downloader',
    shortName: 'TikTok Video',
    headline: 'Save TikToks without the watermark.',
    subheadline: 'Grab any TikTok in HD — no watermark, no login, no fluff.',
    description:
      'Download TikTok videos in MP4 without the watermark. HD quality, works with any public TikTok URL.',
    keywords: ['tiktok downloader', 'tiktok no watermark', 'download tiktok', 'save tiktok'],
    placeholder: 'https://tiktok.com/@user/video/…',
    urlPattern: /^(https?:\/\/)?(www\.|vm\.|vt\.)?tiktok\.com\/.+/i,
    outputKind: 'video',
    supportedFormats: ['MP4 HD (no watermark)', 'MP4 HD (with watermark)', 'MP3 audio'],
    featured: true,
    trending: true,
    faq: [
      { question: 'Do I need the TikTok app?', answer: 'No — just paste the video URL.' },
      { question: 'Can I download private videos?', answer: 'Only public videos are supported.' },
    ],
    howTo: [
      { title: 'Open the TikTok', body: 'Tap Share → Copy Link on the video you want.' },
      { title: 'Paste into SavDown', body: 'Drop the URL in the box above.' },
      { title: 'Download HD', body: 'Choose watermark-free or original, then save.' },
    ],
  },
  {
    slug: 'instagram-reels-downloader',
    platform: 'instagram',
    name: 'Instagram Reels Downloader',
    shortName: 'Instagram Reels',
    headline: 'Save Instagram Reels in HD.',
    subheadline: 'Reels, posts, and IGTV — all in one clean tool.',
    description:
      'Download Instagram Reels, video posts, and IGTV in HD MP4. No login, no watermark, no ads.',
    keywords: ['instagram reels downloader', 'download instagram reels', 'ig reel downloader'],
    placeholder: 'https://instagram.com/reel/…',
    urlPattern: /^(https?:\/\/)?(www\.)?instagram\.com\/(reel|reels|p|tv)\/.+/i,
    outputKind: 'video',
    supportedFormats: ['MP4 1080p', 'MP4 720p'],
    featured: true,
    trending: true,
    faq: [
      { question: 'Do I need to log in?', answer: 'No login required for public Reels.' },
      { question: 'Are Stories supported?', answer: 'This tool is for public Reels and video posts only.' },
    ],
    howTo: [
      { title: 'Open the Reel', body: 'Tap the paper airplane icon → Copy Link.' },
      { title: 'Paste it above', body: 'SavDown detects Reels, posts, and IGTV automatically.' },
      { title: 'Download HD', body: 'Save to your device in seconds.' },
    ],
  },
  {
    slug: 'facebook-video-downloader',
    platform: 'facebook',
    name: 'Facebook Video Downloader',
    shortName: 'Facebook Video',
    headline: 'Download Facebook videos, HD or SD.',
    subheadline: 'Public videos, Reels, and Watch — all supported.',
    description:
      'Download Facebook videos in HD or SD. Works with public posts, Reels, Watch, and fb.watch shortlinks.',
    keywords: ['facebook video downloader', 'download facebook video', 'fb video downloader'],
    placeholder: 'https://facebook.com/watch/?v=…',
    urlPattern: /^(https?:\/\/)?(www\.|m\.|web\.)?(facebook\.com|fb\.watch)\/.+/i,
    outputKind: 'video',
    supportedFormats: ['MP4 HD', 'MP4 SD'],
    featured: true,
    trending: false,
    faq: [
      { question: 'Does it work with private videos?', answer: 'No — only publicly viewable videos.' },
      { question: 'Are Reels supported?', answer: 'Yes, Facebook Reels work with this tool.' },
    ],
    howTo: [
      { title: 'Copy the video URL', body: 'Click the three dots on the video → Copy link.' },
      { title: 'Paste into SavDown', body: 'Any facebook.com or fb.watch link works.' },
      { title: 'Pick HD or SD', body: 'Download the quality you need.' },
    ],
  },
  {
    slug: 'pinterest-video-downloader',
    platform: 'pinterest',
    name: 'Pinterest Video Downloader',
    shortName: 'Pinterest Video',
    headline: 'Save Pinterest videos and Idea Pins.',
    subheadline: 'From aesthetic reels to recipe videos — save what inspires you.',
    description:
      'Download Pinterest videos and Idea Pins in HD MP4. Works with any pin.it or pinterest.com URL.',
    keywords: ['pinterest video downloader', 'pinterest downloader', 'idea pin downloader'],
    placeholder: 'https://pinterest.com/pin/… or https://pin.it/…',
    urlPattern: /^(https?:\/\/)?(www\.)?(pinterest\.com|pin\.it)\/.+/i,
    outputKind: 'video',
    supportedFormats: ['MP4 HD', 'MP4 SD'],
    featured: true,
    trending: false,
    faq: [
      { question: 'Are Idea Pins supported?', answer: 'Yes — most Idea Pins with video work.' },
      { question: 'Can I save Pin images?', answer: 'This tool focuses on videos.' },
    ],
    howTo: [
      { title: 'Open the Pin', body: 'Tap Share → Copy Link.' },
      { title: 'Paste and download', body: 'SavDown supports pinterest.com and pin.it links.' },
    ],
  },
  {
    slug: 'x-video-downloader',
    platform: 'x',
    name: 'X Video Downloader',
    shortName: 'X (Twitter) Video',
    headline: 'Save videos from X.com, fast.',
    subheadline: 'Formerly Twitter — same tool, same speed.',
    description:
      'Download videos from X (Twitter) in HD or SD. Works with x.com and twitter.com URLs.',
    keywords: ['x video downloader', 'twitter video downloader', 'download x video'],
    placeholder: 'https://x.com/user/status/…',
    urlPattern: /^(https?:\/\/)?(www\.|mobile\.)?(x\.com|twitter\.com)\/.+/i,
    outputKind: 'video',
    supportedFormats: ['MP4 HD', 'MP4 SD', 'GIF'],
    featured: true,
    trending: true,
    faq: [
      { question: 'Does it work with twitter.com links?', answer: 'Yes — both x.com and twitter.com are supported.' },
      { question: 'Are GIFs supported?', answer: 'X GIFs are actually MP4 — SavDown converts them back to GIF on request.' },
    ],
    howTo: [
      { title: 'Copy the tweet URL', body: 'Click the share icon → Copy link.' },
      { title: 'Paste into SavDown', body: 'x.com and twitter.com both work.' },
      { title: 'Download', body: 'Grab the video in HD, SD, or as a GIF.' },
    ],
  },
];

export const toolsBySlug = new Map(tools.map((t) => [t.slug, t]));
export const toolsByPlatform = tools.reduce<Record<Platform, Tool[]>>(
  (acc, t) => {
    (acc[t.platform] ||= []).push(t);
    return acc;
  },
  {} as Record<Platform, Tool[]>,
);

export const featuredTools = tools.filter((t) => t.featured);
export const trendingTools = tools.filter((t) => t.trending);
