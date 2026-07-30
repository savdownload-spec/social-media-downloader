export const siteConfig = {
  name: 'SavDown',
  tagline: 'The Free Video Downloader',
  description:
    'SavDown is a fast, free video downloader for YouTube, TikTok, Instagram, Facebook, Pinterest, and X. No watermarks, no signup, with AI-powered tools on the way.',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  ogImage: '/og-default.svg',
  twitterHandle: '@savdown',
  footerDescription:
    'SavDown is the fast, private way to save videos, reels, and thumbnails from the platforms you use every day. No watermarks, no signup, no clutter.',
  social: [
    { label: 'X', href: 'https://x.com/savdown', icon: 'x' },
    { label: 'GitHub', href: 'https://github.com/savdown', icon: 'github' },
    { label: 'YouTube', href: 'https://youtube.com/@savdown', icon: 'youtube' },
    { label: 'Email', href: 'mailto:hello@savdown.com', icon: 'mail' },
  ],
  keywords: [
    'social media downloader',
    'video downloader',
    'youtube downloader',
    'tiktok downloader',
    'instagram reels downloader',
    'facebook video downloader',
    'pinterest video downloader',
    'x video downloader',
  ],
  navigation: [
    { label: 'Tools', href: '/#tools' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Blog', href: '/blog' },
    { label: 'FAQ', href: '/faq' },
    { label: 'About', href: '/about' },
  ],
  footerLinks: {
    Product: [
      { label: 'All tools', href: '/#tools' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Blog', href: '/blog' },
      { label: 'FAQ', href: '/faq' },
    ],
    Company: [
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
    ],
    Legal: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
      { label: 'Cookies', href: '/cookies' },
      { label: 'DMCA', href: '/dmca' },
    ],
  },
} as const;
