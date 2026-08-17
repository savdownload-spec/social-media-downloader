import {
  UserPlus,
  Share2,
  Coins,
  Wallet,
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
 * exists, but the commission economics haven't been finalized publicly, so
 * this file intentionally avoids hardcoding a percentage or payout terms —
 * see the "commission" and "payouts" copy below, which describes the model
 * without a number.
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
    title: 'Earn',
    description: 'Earn commission when people you referred become paying SavDown customers.',
    icon: Coins,
  },
  {
    number: '04',
    title: 'Get Paid',
    description: 'Track everything from your dashboard and get paid out once you qualify.',
    icon: Wallet,
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
    title: 'Earn from qualifying referrals',
    description: 'Get rewarded when the people you send to SavDown become paying customers.',
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
};

export const audiences: Audience[] = [
  { label: 'YouTubers', icon: Youtube },
  { label: 'Bloggers', icon: PenSquare },
  { label: 'Creators', icon: Users },
  { label: 'Website Owners', icon: Globe },
  { label: 'SEO Professionals', icon: Search },
  { label: 'Tech Communities', icon: Users },
  { label: 'Agencies', icon: Building2 },
  { label: 'Newsletter Creators', icon: Mail },
];

export type Promotable = {
  label: string;
  icon: LucideIcon;
};

export const promotables: Promotable[] = [
  { label: 'SavDown Tools', icon: Sparkles },
  { label: 'Subscriptions', icon: CreditCard },
  { label: 'SavCredits', icon: Coins },
  { label: 'Credit Packs', icon: Gift },
  { label: 'Lifetime Offers', icon: InfinityIcon },
  { label: 'Business Products', icon: Briefcase },
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
        'Once you join, you get a unique referral link tied to your account. When someone visits SavDown through your link and later becomes a customer, that referral is attributed to you.',
    },
    {
      question: 'How do I get my referral link?',
      answer:
        'Apply to the program from this page while signed in to your SavDown account. Once approved, your referral link and dashboard become available in your account.',
    },
    {
      question: 'How are commissions calculated?',
      answer:
        'Commission is earned on qualifying referrals — people who sign up through your link and become paying customers. The exact commission model (percentage, fixed, or product-specific) will be shared with you once your application is approved.',
    },
    {
      question: 'When are payouts made?',
      answer:
        'Payout schedule, minimum payout amount, and payout method are confirmed with approved affiliates as part of onboarding, so every partner knows the exact terms before they start promoting.',
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
