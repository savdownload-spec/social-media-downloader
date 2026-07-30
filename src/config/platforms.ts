import type { Platform } from '@/config/tools';

/**
 * Brand presentation for each platform, a gradient tile + solid accent, 
 * so tool cards across the site share one consistent, recognizable identity.
 * `tile` renders the app-icon background; `glow` is the matching hover shadow.
 */
export const platformBrand: Record<
  Platform,
  { name: string; tile: string; solid: string; glow: string }
> = {
  youtube: {
    name: 'YouTube',
    tile: 'bg-gradient-to-br from-red-500 to-red-600',
    solid: '#FF0000',
    glow: 'group-hover:shadow-[0_16px_40px_-10px_rgb(239_68_68_/_0.55)]',
  },
  tiktok: {
    name: 'TikTok',
    tile: 'bg-gradient-to-br from-cyan-400 via-slate-900 to-rose-500',
    solid: '#010101',
    glow: 'group-hover:shadow-[0_16px_40px_-10px_rgb(15_23_42_/_0.5)]',
  },
  instagram: {
    name: 'Instagram',
    tile: 'bg-gradient-to-br from-amber-400 via-[#DD2A7B] to-[#8134AF]',
    solid: '#E1306C',
    glow: 'group-hover:shadow-[0_16px_40px_-10px_rgb(221_42_123_/_0.5)]',
  },
  facebook: {
    name: 'Facebook',
    tile: 'bg-gradient-to-br from-[#0866FF] to-[#0a4dd0]',
    solid: '#0866FF',
    glow: 'group-hover:shadow-[0_16px_40px_-10px_rgb(8_102_255_/_0.5)]',
  },
  pinterest: {
    name: 'Pinterest',
    tile: 'bg-gradient-to-br from-[#E60023] to-[#b30019]',
    solid: '#E60023',
    glow: 'group-hover:shadow-[0_16px_40px_-10px_rgb(230_0_35_/_0.5)]',
  },
  x: {
    name: 'X',
    tile: 'bg-gradient-to-br from-slate-700 to-slate-950',
    solid: '#000000',
    glow: 'group-hover:shadow-[0_16px_40px_-10px_rgb(15_23_42_/_0.55)]',
  },
};
