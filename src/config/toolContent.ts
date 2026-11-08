import { toolGuides } from './toolGuides';

/**
 * Long-form SEO content for every tool detail page.
 *
 * The approved YouTube master stays here. Other pages import independently
 * authored capability guides through the same public content inventory.
 */
export type ToolLongContent = {
  introduction: string;
  whatItDoes: string;
  keyFeatures: { title: string; description: string }[];
  benefits: { title: string; description: string }[];
  bestPractices: string[];
  supportedPlatforms: string[];
  commonUseCases: { title: string; description: string }[];
  tipsAndTricks: string[];
  whyChoose: string;
  conclusion: string;
  resources?: {
    introduction: string;
    guides: { label: string; href: string; description: string }[];
    officialReferences: { label: string; href: string; description: string }[];
    disclosure: string;
  };
};

const masterContent: Record<string, ToolLongContent> = {
  /* ── 1. YouTube Video Downloader ─────────────────────────────── */
  'youtube-video-downloader': {
    introduction:
      "YouTube hosts tutorials, lectures, music, interviews, and other videos people may need to revisit offline or preserve for work they are authorized to do. The SavDown YouTube Video Downloader provides a focused workflow for eligible videos: copy the URL, choose an available quality, and save the file without a SavDown watermark or browser extension. Use it for videos you uploaded, content you have permission to download, or material your local law otherwise allows you to save.",
    whatItDoes:
      "The YouTube Video Downloader resolves eligible public or unlisted video links and presents available MP4 qualities up to 4K (2160p), with 1080p and 720p choices for smaller files. Available resolution depends on the original upload: if a video tops out at 1080p on YouTube, this tool cannot create genuine 4K detail. Private videos and content that requires an authenticated YouTube session are not supported.",
    keyFeatures: [
      { title: 'Up to 4K (2160p)', description: 'Save videos in the same resolution the uploader supplied, up to true 4K when available on the source.' },
      { title: 'MP4 quality choices', description: 'Pick an available MP4 resolution up to 4K; audio-only conversion is available in the separate YouTube to MP3 tool.' },
      { title: 'Zero watermarks', description: 'We never stamp your file with a logo, channel ID, or "downloaded from X" overlay.' },
      { title: 'Account-based credits', description: 'Sign in to use free daily credits and keep charges tied to completed deliveries.' },
      { title: 'Original file, not a re-encode', description: 'The stream is routed directly, so the saved video is the same quality as the source.' },
      { title: 'Works on any device', description: 'Modern browser on phone, tablet, laptop, or desktop, no app, no extension, no install.' },
    ],
    benefits: [
      { title: 'Offline viewing, anywhere', description: 'Save a video once and watch it on a flight, a commute, or anywhere your connection is unreliable.' },
      { title: 'Personal archival', description: 'Build a private library of lectures, tutorials, and performances you want to revisit forever.' },
      { title: 'Reference for creators', description: 'Collect footage for editing breakdowns, color studies, or cinematography analysis.' },
      { title: 'Educational use', description: 'Distribute course material, training videos, and demonstrations in places without reliable internet.' },
      { title: 'Useful quality choices', description: 'Choose an available MP4 resolution based on your device, storage, and intended use.' },
      { title: 'Clear usage records', description: 'SavDown records tool usage and credit activity needed to operate accounts and prevent duplicate charges.' },
    ],
    bestPractices: [
      'Always respect copyright. Only download videos you own, have explicit permission to save, or that are licensed for your intended use.',
      'Pick the lowest resolution that still looks good, 720p is usually enough for phone screens and saves a lot of space.',
      'For authorised audio-only use, switch to the dedicated YouTube to MP3 tool.',
      'Save the original YouTube URL alongside the file so you can re-fetch a higher quality version later if needed.',
      'If the source video has captions, download the captions separately for accessibility and translation workflows.',
      'For batch workflows, save multiple videos in one session before closing the tab, the tool is fastest when warmed up.',
    ],
    supportedPlatforms: [
      'youtube.com (web)',
      'youtu.be short links',
      'YouTube mobile app share links',
      'Embedded YouTube player links',
      'YouTube Music video URLs',
      'YouTube Kids video URLs (where compatible)',
      'Public and unlisted videos',
    ],
    commonUseCases: [
      { title: 'Content creators collecting reference', description: 'Save 4K masters from competitors and adjacent creators for study, mood boards, and editing breakdowns, without burning a watermark into your library.' },
      { title: 'Students archiving lecture series', description: 'Pull an entire course into MP4 for offline study on a tablet, then re-watch sections at 1.25x without buffering.' },
      { title: 'Journalists and researchers', description: 'Archive footage for source verification, fact-checking, and editorial reference before publication.' },
      { title: 'Musicians saving their own work', description: 'Keep high-bitrate local copies of your channel for distribution to DSPs, sync agents, and label partners.' },
      { title: 'Parents preparing road-trip content', description: 'Batch-save kids\' videos before a long drive where streaming is patchy or expensive.' },
    ],
    tipsAndTricks: [
      'Append " &t=" to the URL to start the download from a specific timestamp, useful for cutting a long video to a single scene.',
      'If 4K is missing, the original uploader did not supply it. Try the creator\'s other uploads or wait for them to re-upload in higher quality.',
      'For very long videos, prefer MP4 1080p, the 4K version can be 5–10x larger with no visible difference on a phone screen.',
      'Use the dedicated audio tool when you only need audio and have permission to save it.',
      'Bookmark the tool in your browser bar for one-click access next time you need to save something quickly.',
      'For a YouTube Short, use the dedicated Shorts downloader to preserve the vertical format and keep that workflow focused.',
    ],
    whyChoose:
      "SavDown keeps the workflow focused: paste a supported link, review the formats available from the source, and choose the file that fits your device or project. There is no browser extension to install and SavDown does not add its own watermark to the output. The same straightforward interface is used across SavDown's YouTube tools, so moving between video, audio, Shorts, and thumbnail workflows remains familiar.",
    conclusion:
      "The SavDown YouTube Video Downloader gives you a straightforward way to save eligible videos in an available MP4 quality. Confirm that you own the content, have permission, or are otherwise allowed to download it, then paste the link and choose the quality that fits your needs.",
    resources: {
      introduction: 'Use these guides to choose a format and understand permissions before downloading. For platform rules and official download options, consult YouTube directly.',
      guides: [
        { label: 'How to Download YouTube Videos in HD', href: '/blog/how-to-download-youtube-videos-in-hd-quality', description: 'Compare 720p, 1080p, and source-quality limits before choosing a file.' },
        { label: 'How to Download YouTube Videos in 4K', href: '/blog/how-to-download-youtube-videos-4k', description: 'Review 4K availability, device compatibility, and storage considerations.' },
        { label: 'Legal Considerations for Downloaded Videos', href: '/blog/is-it-legal-to-download-social-media-videos', description: 'A practical overview of ownership, permission, platform terms, and reuse.' },
      ],
      officialReferences: [
        { label: 'YouTube Terms of Service', href: 'https://www.youtube.com/t/terms', description: 'YouTube explains when accessing, downloading, and using content is permitted.' },
        { label: 'YouTube Offline Video FAQs', href: 'https://support.google.com/youtube/answer/7381437?hl=en', description: 'Official guidance on Premium downloads and offline viewing availability.' },
        { label: 'Download Videos You Uploaded', href: 'https://support.google.com/youtube/answer/56100', description: 'Official steps and limitations for downloading your own uploads.' },
      ],
      disclosure: 'SavDown is an independent service and is not affiliated with, sponsored by, or endorsed by YouTube or Google.',
    },
  },

};

// The approved master above is preserved; all other routes use audited guides.
export const toolContent: Record<string, ToolLongContent> = { ...masterContent, ...toolGuides };
