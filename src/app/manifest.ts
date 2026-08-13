import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: siteConfig.name,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#FFFFFF',
    theme_color: '#7C3AED',
    categories: ['utilities', 'productivity', 'photo'],
    icons: [
      // 'any' icons keep their transparent background, most launchers
      // place these on their own plate/circle. 'maskable' icons must be a
      // separate, fully opaque asset with the logo kept inside a safe
      // zone, reusing the transparent 'any' icon for 'maskable' left a
      // transparent edge that showed the system's background color
      // (black in dark mode) bleeding through around the logo once the
      // OS applied its mask shape.
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
