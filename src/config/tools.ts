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
    headline: 'Save YouTube Videos In Stunning Quality.',
    subheadline: 'Paste any YouTube link. Pick a format. Download in seconds.',
    description:
      'Download YouTube videos in MP4 up to 4K. Fast, private, and free with no watermarks and no signup.',
    keywords: ['youtube video downloader', 'youtube mp4', 'download youtube video', 'yt downloader'],
    placeholder: 'https://youtube.com/watch?v=…',
    urlPattern: /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/i,
    outputKind: 'video',
    supportedFormats: ['MP4 4K', 'MP4 1080p', 'MP4 720p', 'MP3'],
    featured: true,
    trending: true,
    faq: [
      { question: 'Is downloading YouTube videos free?', answer: 'Yes, SavDown is completely free with no signup required.' },
      { question: 'What resolutions are supported?', answer: 'From 360p up to 4K, when available on the source video.' },
      { question: 'Do you store the videos I download?', answer: 'No. We route the stream and never save the file.' },
    ],
    howTo: [
      { title: 'Copy The YouTube URL', body: 'Open the video on YouTube and copy the link from the address bar or Share menu.' },
      { title: 'Paste It Above', body: 'Paste the URL into SavDown. We\'ll detect the video automatically.' },
      { title: 'Choose Your Format', body: 'Pick MP4 up to 4K or extract MP3 audio.' },
      { title: 'Download', body: 'Your file is ready in seconds, direct to your device.' },
    ],
  },
  {
    slug: 'youtube-shorts-downloader',
    platform: 'youtube',
    name: 'YouTube Shorts Downloader',
    shortName: 'YouTube Shorts',
    headline: 'Grab YouTube Shorts, Watermark-Free.',
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
      { question: 'Are Shorts saved vertically?', answer: 'Yes, original 9:16 aspect ratio is preserved.' },
      { question: 'Is there a watermark?', answer: 'No watermark is added by SavDown.' },
    ],
    howTo: [
      { title: 'Open The Short', body: 'Find the YouTube Short you want to save.' },
      { title: 'Copy Its URL', body: 'Tap Share → Copy Link.' },
      { title: 'Paste And Download', body: 'Paste the link into SavDown and hit Download.' },
    ],
  },
  {
    slug: 'youtube-thumbnail-downloader',
    platform: 'youtube',
    name: 'YouTube Thumbnail Downloader',
    shortName: 'YouTube Thumbnails',
    headline: 'Download Any YouTube Thumbnail In Max Resolution.',
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
      { title: 'Paste Any YouTube Video URL', body: 'Full video link, Short link, or youtu.be link, all work.' },
      { title: 'Pick Your Resolution', body: 'MaxRes is best for reference or study.' },
      { title: 'Download', body: 'Save the thumbnail directly to your device.' },
    ],
  },
  {
    slug: 'tiktok-video-downloader',
    platform: 'tiktok',
    name: 'TikTok Video Downloader',
    shortName: 'TikTok Video',
    headline: 'Save TikToks Without The Watermark.',
    subheadline: 'Grab any TikTok in HD, no watermark, no login, no fluff.',
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
      { question: 'Do I need the TikTok app?', answer: 'No, just paste the video URL.' },
      { question: 'Can I download private videos?', answer: 'Only public videos are supported.' },
    ],
    howTo: [
      { title: 'Open The TikTok', body: 'Tap Share → Copy Link on the video you want.' },
      { title: 'Paste Into SavDown', body: 'Drop the URL in the box above.' },
      { title: 'Download HD', body: 'Choose watermark-free or original, then save.' },
    ],
  },
  {
    slug: 'instagram-reels-downloader',
    platform: 'instagram',
    name: 'Instagram Reels Downloader',
    shortName: 'Instagram Reels',
    headline: 'Save Instagram Reels In HD.',
    subheadline: 'Reels, posts, and IGTV, all in one clean tool.',
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
      { title: 'Open The Reel', body: 'Tap the paper airplane icon → Copy Link.' },
      { title: 'Paste It Above', body: 'SavDown detects Reels, posts, and IGTV automatically.' },
      { title: 'Download HD', body: 'Save to your device in seconds.' },
    ],
  },
  {
    slug: 'facebook-video-downloader',
    platform: 'facebook',
    name: 'Facebook Video Downloader',
    shortName: 'Facebook Video',
    headline: 'Download Facebook Videos, HD Or SD.',
    subheadline: 'Public videos, Reels, and Watch, all supported.',
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
      { question: 'Does it work with private videos?', answer: 'No, only publicly viewable videos.' },
      { question: 'Are Reels supported?', answer: 'Yes, Facebook Reels work with this tool.' },
    ],
    howTo: [
      { title: 'Copy The Video URL', body: 'Click the three dots on the video → Copy link.' },
      { title: 'Paste Into SavDown', body: 'Any facebook.com or fb.watch link works.' },
      { title: 'Pick HD Or SD', body: 'Download the quality you need.' },
    ],
  },
  {
    slug: 'pinterest-video-downloader',
    platform: 'pinterest',
    name: 'Pinterest Video Downloader',
    shortName: 'Pinterest Video',
    headline: 'Save Pinterest Videos And Idea Pins.',
    subheadline: 'From aesthetic reels to recipe videos, save what inspires you.',
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
      { question: 'Are Idea Pins supported?', answer: 'Yes, most Idea Pins with video work.' },
      { question: 'Can I save Pin images?', answer: 'This tool focuses on videos.' },
    ],
    howTo: [
      { title: 'Open The Pin', body: 'Tap Share → Copy Link.' },
      { title: 'Paste And Download', body: 'SavDown supports pinterest.com and pin.it links.' },
    ],
  },
  {
    slug: 'x-video-downloader',
    platform: 'x',
    name: 'X Video Downloader',
    shortName: 'X (Twitter) Video',
    headline: 'Save Videos From X.com, Fast.',
    subheadline: 'Formerly Twitter, same tool, same speed.',
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
      { question: 'Does it work with twitter.com links?', answer: 'Yes, both x.com and twitter.com are supported.' },
      { question: 'Are GIFs supported?', answer: 'X GIFs are actually MP4, SavDown converts them back to GIF on request.' },
    ],
    howTo: [
      { title: 'Copy The Tweet URL', body: 'Click the share icon → Copy link.' },
      { title: 'Paste Into SavDown', body: 'x.com and twitter.com both work.' },
      { title: 'Download', body: 'Grab the video in HD, SD, or as a GIF.' },
    ],
  },
  {
    slug: 'youtube-to-mp3',
    platform: 'youtube',
    name: 'YouTube to MP3 Converter',
    shortName: 'YouTube to MP3',
    headline: 'Turn YouTube Videos Into MP3 Audio.',
    subheadline: 'Extract crisp, high-bitrate audio from any YouTube video in seconds.',
    description:
      'Convert YouTube videos to MP3 audio in high quality. Fast, free, and no signup required.',
    keywords: ['youtube to mp3', 'youtube mp3 converter', 'download youtube audio', 'yt to mp3'],
    placeholder: 'https://youtube.com/watch?v=…',
    urlPattern: /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/i,
    outputKind: 'video',
    supportedFormats: ['MP3 320kbps', 'MP3 128kbps', 'M4A'],
    featured: false,
    trending: false,
    faq: [
      { question: 'What audio quality can I get?', answer: 'Up to 320kbps MP3, depending on the source video.' },
      { question: 'Is it free?', answer: 'Yes, converting YouTube to MP3 is completely free with no signup.' },
    ],
    howTo: [
      { title: 'Paste The YouTube Link', body: 'Copy the video URL and drop it into the box above.' },
      { title: 'Pick Your Bitrate', body: 'Choose 320kbps for the best quality or 128kbps to save space.' },
      { title: 'Download The MP3', body: 'Your audio file is ready to save in seconds.' },
    ],
  },
  {
    slug: 'tiktok-to-mp3',
    platform: 'tiktok',
    name: 'TikTok to MP3 Downloader',
    shortName: 'TikTok to MP3',
    headline: 'Save The Sound From Any TikTok.',
    subheadline: 'Grab the original audio or trending sound from a TikTok as a clean MP3.',
    description:
      'Download TikTok audio and trending sounds as MP3. No watermark, no signup, free.',
    keywords: ['tiktok to mp3', 'tiktok audio downloader', 'download tiktok sound', 'tiktok mp3'],
    placeholder: 'https://tiktok.com/@user/video/…',
    urlPattern: /^(https?:\/\/)?(www\.|vm\.|vt\.)?tiktok\.com\/.+/i,
    outputKind: 'video',
    supportedFormats: ['MP3 320kbps', 'MP3 128kbps'],
    featured: false,
    trending: false,
    faq: [
      { question: 'Can I save any sound?', answer: 'You can save the audio from any public TikTok video.' },
      { question: 'Is the audio watermark-free?', answer: 'Yes, the extracted MP3 has no audio watermark.' },
    ],
    howTo: [
      { title: 'Copy The TikTok Link', body: 'Tap Share, then Copy Link on the video.' },
      { title: 'Paste It Above', body: 'Drop the link into SavDown.' },
      { title: 'Download The Audio', body: 'Save the sound as a clean MP3.' },
    ],
  },
  {
    slug: 'tiktok-photo-downloader',
    platform: 'tiktok',
    name: 'TikTok Photo Downloader',
    shortName: 'TikTok Photos',
    headline: 'Download TikTok Photo Slideshows.',
    subheadline: 'Save every image from a TikTok photo post in full resolution.',
    description:
      'Download TikTok photo slideshows and image posts in original quality. Free and fast.',
    keywords: ['tiktok photo downloader', 'tiktok slideshow downloader', 'download tiktok images'],
    placeholder: 'https://tiktok.com/@user/photo/…',
    urlPattern: /^(https?:\/\/)?(www\.|vm\.|vt\.)?tiktok\.com\/.+/i,
    outputKind: 'image',
    supportedFormats: ['JPG', 'ZIP (all images)'],
    featured: false,
    trending: false,
    faq: [
      { question: 'Can I save all images at once?', answer: 'Yes, download the whole slideshow as a ZIP or grab images individually.' },
    ],
    howTo: [
      { title: 'Open The Photo Post', body: 'Tap Share, then Copy Link on the TikTok photo post.' },
      { title: 'Paste And Download', body: 'Save the images in full resolution.' },
    ],
  },
  {
    slug: 'instagram-story-downloader',
    platform: 'instagram',
    name: 'Instagram Story Downloader',
    shortName: 'Instagram Stories',
    headline: 'Save Instagram Stories Before They Vanish.',
    subheadline: 'Download public Instagram Stories as video or images, anonymously.',
    description:
      'Download public Instagram Stories in HD as video or images. No login, no watermark, free.',
    keywords: ['instagram story downloader', 'download instagram stories', 'ig story saver'],
    placeholder: 'https://instagram.com/stories/username/…',
    urlPattern: /^(https?:\/\/)?(www\.)?instagram\.com\/(stories|s)\/.+/i,
    outputKind: 'video',
    supportedFormats: ['MP4 HD', 'JPG'],
    featured: false,
    trending: false,
    faq: [
      { question: 'Will the account know I saved their Story?', answer: 'No, SavDown downloads public Stories without notifying anyone.' },
      { question: 'Do private accounts work?', answer: 'Only public Stories are supported.' },
    ],
    howTo: [
      { title: 'Copy The Profile Or Story Link', body: 'Grab the link to the public profile or Story.' },
      { title: 'Paste It Above', body: 'SavDown finds the active Stories automatically.' },
      { title: 'Download', body: 'Save each Story as video or image.' },
    ],
  },
  {
    slug: 'instagram-photo-downloader',
    platform: 'instagram',
    name: 'Instagram Photo Downloader',
    shortName: 'Instagram Photos',
    headline: 'Download Instagram Photos In Full Resolution.',
    subheadline: 'Save single photos and full carousels from any public post.',
    description:
      'Download Instagram photos and carousels in original quality. No login, no watermark, free.',
    keywords: ['instagram photo downloader', 'download instagram photos', 'ig carousel downloader'],
    placeholder: 'https://instagram.com/p/…',
    urlPattern: /^(https?:\/\/)?(www\.)?instagram\.com\/(p|reel|tv)\/.+/i,
    outputKind: 'image',
    supportedFormats: ['JPG', 'ZIP (carousel)'],
    featured: false,
    trending: false,
    faq: [
      { question: 'Can I download a whole carousel?', answer: 'Yes, save every image in a carousel post at once.' },
    ],
    howTo: [
      { title: 'Copy The Post Link', body: 'Tap the three dots on the post, then Copy Link.' },
      { title: 'Paste And Download', body: 'Save single photos or full carousels in original quality.' },
    ],
  },
  {
    slug: 'instagram-profile-picture-downloader',
    platform: 'instagram',
    name: 'Instagram Profile Picture Downloader',
    shortName: 'Instagram DP',
    headline: 'View And Save Instagram Profile Pictures In HD.',
    subheadline: 'Zoom in and download any public profile photo in full size.',
    description:
      'View and download Instagram profile pictures (DP) in HD. Free, no login, no app.',
    keywords: ['instagram profile picture downloader', 'instagram dp downloader', 'view instagram dp'],
    placeholder: 'https://instagram.com/username',
    urlPattern: /^(https?:\/\/)?(www\.)?instagram\.com\/.+/i,
    outputKind: 'image',
    supportedFormats: ['JPG HD'],
    featured: false,
    trending: false,
    faq: [
      { question: 'Can I see the full-size picture?', answer: 'Yes, SavDown shows the profile photo in full resolution so you can save it.' },
    ],
    howTo: [
      { title: 'Enter The Username Or Profile Link', body: 'Paste the public profile URL or handle.' },
      { title: 'Download The Picture', body: 'Save the profile photo in full HD.' },
    ],
  },
  {
    slug: 'facebook-reels-downloader',
    platform: 'facebook',
    name: 'Facebook Reels Downloader',
    shortName: 'Facebook Reels',
    headline: 'Download Facebook Reels In HD.',
    subheadline: 'Save short-form Facebook Reels without the watermark.',
    description:
      'Download Facebook Reels in HD MP4. No watermark, no signup, works with public Reels.',
    keywords: ['facebook reels downloader', 'download facebook reels', 'fb reels downloader'],
    placeholder: 'https://facebook.com/reel/…',
    urlPattern: /^(https?:\/\/)?(www\.|m\.|web\.)?(facebook\.com|fb\.watch)\/.+/i,
    outputKind: 'video',
    supportedFormats: ['MP4 HD', 'MP4 SD'],
    featured: false,
    trending: false,
    faq: [
      { question: 'Is there a watermark?', answer: 'No watermark is added by SavDown.' },
    ],
    howTo: [
      { title: 'Copy The Reel Link', body: 'Open the Reel, tap Share, then Copy link.' },
      { title: 'Paste And Download', body: 'Save the Reel in HD or SD.' },
    ],
  },
  {
    slug: 'pinterest-image-downloader',
    platform: 'pinterest',
    name: 'Pinterest Image Downloader',
    shortName: 'Pinterest Images',
    headline: 'Save Pinterest Images In Full Size.',
    subheadline: 'Download any pin image in its original, highest resolution.',
    description:
      'Download Pinterest images and pins in original resolution. Free, fast, no signup.',
    keywords: ['pinterest image downloader', 'download pinterest images', 'save pinterest pin'],
    placeholder: 'https://pinterest.com/pin/… or https://pin.it/…',
    urlPattern: /^(https?:\/\/)?(www\.)?(pinterest\.com|pin\.it)\/.+/i,
    outputKind: 'image',
    supportedFormats: ['JPG', 'PNG'],
    featured: false,
    trending: false,
    faq: [
      { question: 'What resolution do I get?', answer: 'The original, highest resolution available on the pin.' },
    ],
    howTo: [
      { title: 'Open The Pin', body: 'Tap Share, then Copy Link on the pin.' },
      { title: 'Paste And Download', body: 'Save the image in full resolution.' },
    ],
  },
  {
    slug: 'x-gif-downloader',
    platform: 'x',
    name: 'X GIF Downloader',
    shortName: 'X (Twitter) GIF',
    headline: 'Download GIFs From X As GIF Or MP4.',
    subheadline: 'Grab any GIF from X (Twitter) and save it as a true GIF or MP4.',
    description:
      'Download GIFs from X (Twitter) as a real GIF or MP4. Free, fast, and no signup.',
    keywords: ['x gif downloader', 'twitter gif downloader', 'download twitter gif'],
    placeholder: 'https://x.com/user/status/…',
    urlPattern: /^(https?:\/\/)?(www\.|mobile\.)?(x\.com|twitter\.com)\/.+/i,
    outputKind: 'video',
    supportedFormats: ['GIF', 'MP4'],
    featured: false,
    trending: false,
    faq: [
      { question: 'Do I get a real GIF file?', answer: 'Yes, SavDown converts the clip into a true GIF, or you can keep it as MP4.' },
    ],
    howTo: [
      { title: 'Copy The Post Link', body: 'Click the share icon on the post, then Copy link.' },
      { title: 'Paste And Download', body: 'Save the GIF as a real GIF or as MP4.' },
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
