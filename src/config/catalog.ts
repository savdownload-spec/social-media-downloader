import type { ComponentType } from 'react';
import {
  MonitorPlay, Film, ListVideo, Image, Images, Music, Video, Music2, Clapperboard,
  Camera, UserRound, Tv, ImageDown, Repeat,
  Eraser, Maximize2, Wand2, Minimize2, Scaling, RefreshCw, FileImage,
  FileVideo, Files, Scissors, FileArchive, FileText, FileType,
  Sparkles, Type, Hash, MessageSquareText,
  AlignLeft, Tags, Search, Braces,
  QrCode, ScanLine, Pipette, Blend, Download,
} from 'lucide-react';
import { toolsBySlug } from '@/config/tools';
import { getFunctionalTool } from '@/config/functionalTools';

export type ToolGroup = 'Downloaders' | 'Image' | 'Video' | 'PDF' | 'AI' | 'SEO' | 'Utility';

export type CatalogTool = {
  slug: string;
  name: string;
  group: ToolGroup;
  description: string;
  icon: ComponentType<{ className?: string }>;
  tile: string;
};

/** Soft-tinted icon tile classes. Kept as literals so Tailwind includes them. */
const TILE = {
  red: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400',
  orange: 'bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-warning',
  lime: 'bg-lime-50 text-lime-600 dark:bg-lime-500/15 dark:text-lime-400',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
  teal: 'bg-teal-50 text-teal-600 dark:bg-teal-500/15 dark:text-teal-400',
  cyan: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-400',
  sky: 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400',
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',
  indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400',
  violet: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400',
  purple: 'bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400',
  fuchsia: 'bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-500/15 dark:text-fuchsia-400',
  pink: 'bg-pink-50 text-pink-600 dark:bg-pink-500/15 dark:text-pink-400',
  rose: 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400',
  slate: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300',
};

const downloaders: CatalogTool[] = [
  { slug: 'youtube-video-downloader', name: 'YouTube Video Downloader', group: 'Downloaders', description: 'Save YouTube videos in up to 4K, watermark-free.', icon: MonitorPlay, tile: TILE.red },
  { slug: 'youtube-shorts-downloader', name: 'YouTube Shorts Downloader', group: 'Downloaders', description: 'Grab vertical YouTube Shorts in original quality.', icon: Film, tile: TILE.orange },
  { slug: 'youtube-playlist-downloader', name: 'YouTube Playlist Downloader', group: 'Downloaders', description: 'Download an entire YouTube playlist in one go.', icon: ListVideo, tile: TILE.red },
  { slug: 'youtube-thumbnail-downloader', name: 'YouTube Thumbnail Downloader', group: 'Downloaders', description: 'Grab any YouTube thumbnail in full resolution.', icon: Image, tile: TILE.amber },
  { slug: 'youtube-to-mp3', name: 'YouTube MP3 Downloader', group: 'Downloaders', description: 'Convert YouTube videos into high-quality MP3 audio.', icon: Music, tile: TILE.lime },
  { slug: 'tiktok-video-downloader', name: 'TikTok Video Downloader', group: 'Downloaders', description: 'Save TikToks in HD without the watermark.', icon: Video, tile: TILE.slate },
  { slug: 'tiktok-to-mp3', name: 'TikTok MP3 Downloader', group: 'Downloaders', description: 'Extract the sound from any TikTok as MP3.', icon: Music2, tile: TILE.cyan },
  { slug: 'tiktok-thumbnail-downloader', name: 'TikTok Thumbnail Downloader', group: 'Downloaders', description: 'Download the cover thumbnail of any TikTok.', icon: Image, tile: TILE.teal },
  { slug: 'tiktok-photo-downloader', name: 'TikTok Photo Downloader', group: 'Downloaders', description: 'Save TikTok photo slideshows in full resolution.', icon: Images, tile: TILE.teal },
  { slug: 'instagram-reels-downloader', name: 'Instagram Reels Downloader', group: 'Downloaders', description: 'Save Instagram Reels in crisp HD.', icon: Clapperboard, tile: TILE.fuchsia },
  { slug: 'instagram-video-downloader', name: 'Instagram Video Downloader', group: 'Downloaders', description: 'Download any public Instagram video post.', icon: Video, tile: TILE.pink },
  { slug: 'instagram-photo-downloader', name: 'Instagram Photo Downloader', group: 'Downloaders', description: 'Save Instagram photos and carousels in full resolution.', icon: Image, tile: TILE.rose },
  { slug: 'instagram-story-downloader', name: 'Instagram Story Downloader', group: 'Downloaders', description: 'Download public Instagram Stories before they disappear.', icon: Camera, tile: TILE.purple },
  { slug: 'instagram-profile-picture-downloader', name: 'Instagram Profile Picture Downloader', group: 'Downloaders', description: 'View and save Instagram profile pictures in HD.', icon: UserRound, tile: TILE.violet },
  { slug: 'facebook-video-downloader', name: 'Facebook Video Downloader', group: 'Downloaders', description: 'Download Facebook videos in HD or SD.', icon: Tv, tile: TILE.blue },
  { slug: 'facebook-reels-downloader', name: 'Facebook Reels Downloader', group: 'Downloaders', description: 'Save Facebook Reels without the watermark.', icon: Film, tile: TILE.indigo },
  { slug: 'x-video-downloader', name: 'X (Twitter) Video Downloader', group: 'Downloaders', description: 'Download videos from X (Twitter) in HD.', icon: MonitorPlay, tile: TILE.slate },
  { slug: 'x-gif-downloader', name: 'X (Twitter) GIF Downloader', group: 'Downloaders', description: 'Save GIFs from X as MP4 or a real animated GIF.', icon: Repeat, tile: TILE.slate },
  { slug: 'pinterest-video-downloader', name: 'Pinterest Video Downloader', group: 'Downloaders', description: 'Save Pinterest videos and Idea Pins in HD.', icon: Video, tile: TILE.red },
  { slug: 'pinterest-image-downloader', name: 'Pinterest Image Downloader', group: 'Downloaders', description: 'Download Pinterest images in original resolution.', icon: ImageDown, tile: TILE.rose },
];

const imageTools: CatalogTool[] = [
  { slug: 'background-remover', name: 'Background Remover', group: 'Image', description: 'Remove the background from any image in one click.', icon: Eraser, tile: TILE.violet },
  { slug: 'image-upscaler', name: 'Image Upscaler', group: 'Image', description: 'Upscale images to higher resolution without losing detail.', icon: Maximize2, tile: TILE.sky },
  { slug: 'image-enhancer', name: 'Image Enhancer', group: 'Image', description: 'Sharpen, brighten, and enhance photos automatically.', icon: Wand2, tile: TILE.fuchsia },
  { slug: 'image-compressor', name: 'Image Compressor', group: 'Image', description: 'Shrink image file size while keeping quality.', icon: Minimize2, tile: TILE.emerald },
  { slug: 'image-resizer', name: 'Image Resizer', group: 'Image', description: 'Resize images to any dimension in seconds.', icon: Scaling, tile: TILE.blue },
  { slug: 'image-converter', name: 'Image Converter', group: 'Image', description: 'Convert images between formats effortlessly.', icon: RefreshCw, tile: TILE.amber },
  { slug: 'jpg-to-png', name: 'JPG to PNG', group: 'Image', description: 'Convert JPG images to lossless PNG.', icon: FileImage, tile: TILE.indigo },
  { slug: 'png-to-jpg', name: 'PNG to JPG', group: 'Image', description: 'Convert PNG images to lightweight JPG.', icon: FileImage, tile: TILE.orange },
  { slug: 'webp-converter', name: 'WEBP Converter', group: 'Image', description: 'Convert images to and from modern WEBP.', icon: FileImage, tile: TILE.teal },
  { slug: 'heic-to-jpg', name: 'HEIC to JPG', group: 'Image', description: 'Turn iPhone HEIC photos into universal JPG.', icon: FileImage, tile: TILE.rose },
];

const videoTools: CatalogTool[] = [
  { slug: 'video-converter', name: 'Video Converter', group: 'Video', description: 'Convert videos between popular formats.', icon: FileVideo, tile: TILE.blue },
  { slug: 'video-compressor', name: 'Video Compressor', group: 'Video', description: 'Compress videos to a smaller size without losing quality.', icon: Minimize2, tile: TILE.emerald },
  { slug: 'video-to-mp3', name: 'Video to MP3', group: 'Video', description: 'Extract audio from any video as MP3.', icon: Music, tile: TILE.lime },
  { slug: 'gif-maker', name: 'GIF Maker', group: 'Video', description: 'Turn clips and images into shareable GIFs.', icon: Film, tile: TILE.fuchsia },
  { slug: 'mp4-to-gif', name: 'MP4 to GIF', group: 'Video', description: 'Convert MP4 videos into looping GIFs.', icon: Film, tile: TILE.orange },
];

const pdfTools: CatalogTool[] = [
  { slug: 'merge-pdf', name: 'Merge PDF', group: 'PDF', description: 'Combine multiple PDFs into a single file.', icon: Files, tile: TILE.red },
  { slug: 'split-pdf', name: 'Split PDF', group: 'PDF', description: 'Split a PDF into separate pages or files.', icon: Scissors, tile: TILE.orange },
  { slug: 'compress-pdf', name: 'Compress PDF', group: 'PDF', description: 'Reduce PDF file size while keeping quality.', icon: FileArchive, tile: TILE.emerald },
  { slug: 'pdf-to-word', name: 'PDF to Word', group: 'PDF', description: 'Convert PDF documents into editable Word files.', icon: FileText, tile: TILE.blue },
  { slug: 'word-to-pdf', name: 'Word to PDF', group: 'PDF', description: 'Turn Word documents into polished PDFs.', icon: FileType, tile: TILE.indigo },
  { slug: 'jpg-to-pdf', name: 'JPG to PDF', group: 'PDF', description: 'Combine images into a single PDF.', icon: FileImage, tile: TILE.amber },
  { slug: 'pdf-to-jpg', name: 'PDF to JPG', group: 'PDF', description: 'Convert each PDF page into a JPG image.', icon: FileImage, tile: TILE.rose },
];

const aiTools: CatalogTool[] = [
  { slug: 'ai-thumbnail-generator', name: 'AI Thumbnail Generator', group: 'AI', description: 'Generate scroll-stopping thumbnails with AI.', icon: Sparkles, tile: TILE.fuchsia },
  { slug: 'ai-background-remover', name: 'AI Background Remover', group: 'AI', description: 'Cut out backgrounds instantly with AI precision.', icon: Wand2, tile: TILE.violet },
  { slug: 'ai-image-enhancer', name: 'AI Image Enhancer', group: 'AI', description: 'Enhance and restore images with AI.', icon: Sparkles, tile: TILE.sky },
  { slug: 'ai-youtube-title-generator', name: 'AI YouTube Title Generator', group: 'AI', description: 'Generate catchy, clickable YouTube titles.', icon: Type, tile: TILE.red },
  { slug: 'ai-description-generator', name: 'AI Description Generator', group: 'AI', description: 'Write compelling descriptions in seconds.', icon: FileText, tile: TILE.blue },
  { slug: 'ai-hashtag-generator', name: 'AI Hashtag Generator', group: 'AI', description: 'Get relevant, trending hashtags with AI.', icon: Hash, tile: TILE.purple },
  { slug: 'ai-caption-generator', name: 'AI Caption Generator', group: 'AI', description: 'Generate captions for any post with AI.', icon: MessageSquareText, tile: TILE.teal },
];

const seoTools: CatalogTool[] = [
  { slug: 'meta-title-generator', name: 'Meta Title Generator', group: 'SEO', description: 'Craft optimized meta titles that rank.', icon: Type, tile: TILE.blue },
  { slug: 'meta-description-generator', name: 'Meta Description Generator', group: 'SEO', description: 'Write click-worthy meta descriptions.', icon: AlignLeft, tile: TILE.indigo },
  { slug: 'youtube-tags-generator', name: 'YouTube Tags Generator', group: 'SEO', description: 'Generate high-impact tags for your videos.', icon: Tags, tile: TILE.red },
  { slug: 'keyword-generator', name: 'Keyword Generator', group: 'SEO', description: 'Discover keywords your audience is searching.', icon: Search, tile: TILE.emerald },
  { slug: 'schema-generator', name: 'Schema Generator', group: 'SEO', description: 'Create structured data schema markup.', icon: Braces, tile: TILE.violet },
];

const utilityTools: CatalogTool[] = [
  { slug: 'qr-code-generator', name: 'QR Code Generator', group: 'Utility', description: 'Create custom QR codes for anything.', icon: QrCode, tile: TILE.slate },
  { slug: 'qr-code-scanner', name: 'QR Code Scanner', group: 'Utility', description: 'Scan and decode QR codes instantly.', icon: ScanLine, tile: TILE.cyan },
  { slug: 'color-picker', name: 'Color Picker', group: 'Utility', description: 'Pick and copy colors from any image.', icon: Pipette, tile: TILE.pink },
  { slug: 'gradient-generator', name: 'Gradient Generator', group: 'Utility', description: 'Design beautiful CSS gradients in seconds.', icon: Blend, tile: TILE.fuchsia },
];

/**
 * Master catalog. Order matters: the homepage shows the first N tools, where N
 * depends on viewport, so earlier entries should be the ones most worth seeing
 * first on a small screen.
 */
export const catalog: CatalogTool[] = [
  ...downloaders,
  ...imageTools,
  ...videoTools,
  ...pdfTools,
  ...aiTools,
  ...seoTools,
  ...utilityTools,
];

export const HOMEPAGE_DESKTOP_LIMIT = 32;
export const HOMEPAGE_MOBILE_LIMIT = 10;

export const toolGroups: ToolGroup[] = ['Downloaders', 'Image', 'Video', 'PDF', 'AI', 'SEO', 'Utility'];

/** URL segment for a tool group, e.g. 'Downloaders' -> 'downloaders'. */
export function groupSlug(group: ToolGroup): string {
  return group.toLowerCase();
}

/** Reverse of groupSlug(); undefined for an unknown segment. */
export function groupFromSlug(slug: string): ToolGroup | undefined {
  return toolGroups.find((g) => g.toLowerCase() === slug.toLowerCase());
}

export const catalogBySlug = new Map(catalog.map((t) => [t.slug, t]));

export function getCatalogTool(slug: string): CatalogTool | undefined {
  return catalogBySlug.get(slug);
}

/**
 * A tool is live (has a working page) when either a downloader config
 * exists for it (tools.ts) or a functional-tool component is registered
 * for it (functionalTools.ts), checking only one registry marked every
 * non-downloader tool (image/video/PDF/QR/SEO/utility) as "Coming Soon"
 * even though its page worked fine.
 */
export function isToolAvailable(slug: string): boolean {
  return toolsBySlug.has(slug) || !!getFunctionalTool(slug);
}

export const fallbackIcon = Download;
