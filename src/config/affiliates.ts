import {
  UserPlus,
  Share2,
  Coins,
  Sparkles,
  Link2,
  ShieldCheck,
  LineChart,
  Palette,
  Youtube,
  PenSquare,
  Users,
  Globe,
  Search,
  Building2,
  Mail,
  Gift,
  CreditCard,
  Infinity as InfinityIcon,
  Briefcase,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AccordionItem } from '@/components/ui/Accordion';

/**
 * SavDown Affiliate Program — static marketing content for /affiliates.
 *
 * The backend (Prisma `Affiliate` model, admin approval queue) already
 * exists. The current reward is a fixed amount of SavCredits; cash payouts
 * are not part of the program.
 */

export type Step = {
  number: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

export const steps: Step[] = [
  {
    number: '01',
    title: 'Join',
    description: 'Apply with your SavDown account in a couple of clicks. No fees, nothing to buy.',
    icon: UserPlus,
  },
  {
    number: '02',
    title: 'Share',
    description: 'Get your unique referral link and share SavDown with your audience.',
    icon: Share2,
  },
  {
    number: '03',
    title: 'Get rewarded',
    description: 'Earn 20 SavCredits for each qualifying new user you refer. Reward credits expire after one month.',
    icon: Coins,
  },
  {
    number: '04',
    title: 'Track rewards',
    description: 'See attributed sign-ups, qualifying referrals, and reward expiry dates in your workspace.',
    icon: ShieldCheck,
  },
];

export type Benefit = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export const benefits: Benefit[] = [
  {
    title: 'Promote tools people actually use',
    description: 'SavDown is a free daily-use video downloader — an easy, honest product to recommend.',
    icon: Sparkles,
  },
  {
    title: 'Earn referral SavCredits',
    description: 'Receive 20 SavCredits when a new user signs up through your link and meets the program criteria.',
    icon: Coins,
  },
  {
    title: 'Simple referral links',
    description: 'One unique link per affiliate. Drop it in a video, post, or article — no setup required.',
    icon: Link2,
  },
  {
    title: 'Transparent tracking',
    description: 'See your clicks, signups, and referrals as they happen from your affiliate dashboard.',
    icon: LineChart,
  },
  {
    title: 'Marketing resources',
    description: 'Logos, banners, and screenshots to help you promote SavDown properly and consistently.',
    icon: Palette,
  },
  {
    title: 'A growing product ecosystem',
    description: 'New tools ship regularly, giving your audience more reasons to stick around.',
    icon: ShieldCheck,
  },
];

export type Audience = {
  label: string;
  icon: LucideIcon;
  href: string;
};

export const audiences: Audience[] = [
  { label: 'YouTubers', icon: Youtube, href: '/tools/youtube-video-downloader' },
  { label: 'Bloggers', icon: PenSquare, href: '/blog' },
  { label: 'Creators', icon: Users, href: '/tools' },
  { label: 'Website Owners', icon: Globe, href: '/tools' },
  { label: 'SEO Professionals', icon: Search, href: '/tools#seo' },
  { label: 'Tech Communities', icon: Users, href: '/blog' },
  { label: 'Agencies', icon: Building2, href: '/contact' },
  { label: 'Newsletter Creators', icon: Mail, href: '/blog' },
];

export type Promotable = {
  label: string;
  icon: LucideIcon;
  href: string;
};

export const promotables: Promotable[] = [
  { label: 'SavDown Tools', icon: Sparkles, href: '/tools' },
  { label: 'Subscriptions', icon: CreditCard, href: '/pricing' },
  { label: 'SavCredits', icon: Coins, href: '/pricing' },
  { label: 'Credit Packs', icon: Gift, href: '/pricing' },
  { label: 'Lifetime Offers', icon: InfinityIcon, href: '/pricing' },
  { label: 'Business Products', icon: Briefcase, href: '/pricing' },
];

export type ResourceKind = {
  label: string;
  description: string;
  icon: LucideIcon;
};

export const resources: ResourceKind[] = [
  { label: 'Logos & Brand Assets', description: 'SavDown wordmarks and icons in a few common formats.', icon: Palette },
  { label: 'Banners', description: 'Ready-made banner sizes for blogs and sidebars.', icon: Sparkles },
  { label: 'Product Screenshots', description: 'Clean screenshots of the tools you promote.', icon: Globe },
  { label: 'Social Graphics', description: 'Square and story-sized graphics for social posts.', icon: Share2 },
  { label: 'Promotional Copy', description: 'Starter copy you can adapt to your own voice.', icon: PenSquare },
  { label: 'Content Ideas', description: 'YouTube and blog content ideas built around SavDown.', icon: Youtube },
];

export function buildAffiliatesFaqs(): AccordionItem[] {
  return [
    {
      question: 'Who can join the SavDown Affiliate Program?',
      answer:
        'Anyone with an audience they can honestly share SavDown with — YouTubers, bloggers, creators, website owners, SEO professionals, agencies, and newsletter writers are all welcome to apply.',
    },
    {
      question: 'How do referrals work?',
      answer:
        'Once approved, share your unique link. A genuinely new user who registers through it becomes a qualifying referral. Existing users logging in do not count.',
    },
    {
      question: 'How do I get my referral link?',
      answer:
        'Apply to the program from this page while signed in to your SavDown account. Once approved, your referral link and dashboard become available in your account.',
    },
    {
      question: 'What is the referral reward?',
      answer:
        'You receive 20 SavCredits for each qualifying new user. Reward credits expire one month after they are granted and can be used in SavDown.',
    },
    {
      question: 'Can I withdraw or receive cash?',
      answer:
        'No. The current program rewards SavCredits only. It does not offer cash earnings, withdrawals, or payouts.',
    },
    {
      question: 'What products can I promote?',
      answer:
        'You can promote SavDown tools, subscriptions, SavCredits, credit packs, and lifetime offers — plus business products as they become available.',
    },
    {
      question: 'Can I promote SavDown on YouTube, blogs, or social media?',
      answer:
        'Yes. Most affiliates promote SavDown through YouTube videos, blog posts, and social content. We just ask that you represent SavDown honestly and avoid misleading claims.',
    },
  ];
}
