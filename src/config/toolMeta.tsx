import type { ComponentType } from 'react';
import {
  Download,
  MonitorPlay, Film, Image, Music, Video, Music2, Images,
  Clapperboard, Camera, UserRound, Tv, ImageDown,
} from 'lucide-react';

export type ToolCategory = 'Video' | 'Photo' | 'Thumbnail' | 'Audio';

export type ToolMeta = {
  icon: ComponentType<{ className?: string }>;
  /** Soft-tinted tile classes: background + glyph colour. */
  tile: string;
  category: ToolCategory;
};

/**
 * Per-tool presentation shared by the homepage toolkit hero and the tools grid.
 * Each tool gets a distinct, functional icon and a soft-tinted tile colour so
 * the product reads like a full, varied toolkit rather than one repeated logo.
 */
export const toolMeta: Record<string, ToolMeta> = {
  'youtube-video-downloader': { icon: MonitorPlay, tile: 'bg-red-50 text-red-600', category: 'Video' },
  'youtube-shorts-downloader': { icon: Film, tile: 'bg-orange-50 text-orange-600', category: 'Video' },
  'youtube-thumbnail-downloader': { icon: Image, tile: 'bg-amber-50 text-amber-600', category: 'Thumbnail' },
  'youtube-to-mp3': { icon: Music, tile: 'bg-lime-50 text-lime-600', category: 'Audio' },
  'tiktok-video-downloader': { icon: Video, tile: 'bg-slate-100 text-slate-700', category: 'Video' },
  'tiktok-to-mp3': { icon: Music2, tile: 'bg-cyan-50 text-cyan-600', category: 'Audio' },
  'tiktok-photo-downloader': { icon: Images, tile: 'bg-teal-50 text-teal-600', category: 'Photo' },
  'instagram-reels-downloader': { icon: Clapperboard, tile: 'bg-fuchsia-50 text-fuchsia-600', category: 'Video' },
  'instagram-story-downloader': { icon: Camera, tile: 'bg-pink-50 text-pink-600', category: 'Video' },
  'instagram-photo-downloader': { icon: Image, tile: 'bg-rose-50 text-rose-600', category: 'Photo' },
  'instagram-profile-picture-downloader': { icon: UserRound, tile: 'bg-purple-50 text-purple-600', category: 'Photo' },
  'facebook-video-downloader': { icon: Tv, tile: 'bg-blue-50 text-blue-600', category: 'Video' },
  'facebook-reels-downloader': { icon: Film, tile: 'bg-indigo-50 text-indigo-600', category: 'Video' },
  'pinterest-video-downloader': { icon: Video, tile: 'bg-red-50 text-red-600', category: 'Video' },
  'pinterest-image-downloader': { icon: ImageDown, tile: 'bg-rose-50 text-rose-600', category: 'Photo' },
  'x-video-downloader': { icon: MonitorPlay, tile: 'bg-slate-100 text-slate-700', category: 'Video' },
  'x-gif-downloader': { icon: Images, tile: 'bg-zinc-100 text-zinc-700', category: 'Video' },
};

export const toolMetaFallback: ToolMeta = {
  icon: Download,
  tile: 'bg-slate-100 text-slate-700',
  category: 'Video',
};

export function getToolMeta(slug: string): ToolMeta {
  return toolMeta[slug] ?? toolMetaFallback;
}
