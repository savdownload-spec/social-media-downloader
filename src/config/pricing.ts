import {
  Film,
  Music,
  Wand2,
  Image,
  Clapperboard,
  MousePointerClick,
  Eye,
  Sparkles,
  Coins,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Every number shown on /pricing lives here.
 *
 * The page used to hard-code its plans inline, which made it impossible to keep
 * the tiers, the credit packs and the FAQ answers in agreement. Anything that
 * quotes a price or a credit amount should import from this file.
 *
 * Prices here are display strings only. What a purchase actually grants lives
 * in `@/lib/billing`, keyed by Stripe price ID, and the amount charged comes
 * from Stripe — the browser never sends a price. Change a number here and you
 * must change the matching Stripe price too.
 */

export type BillingPeriod = 'monthly' | 'yearly';

export type Plan = {
  id: 'free' | 'pro' | 'max';
  name: string;
  tagline: string;
  /** Price shown for each billing period, already formatted. */
  price: Record<BillingPeriod, string>;
  /** Small line under the price, e.g. "per month". */
  period: Record<BillingPeriod, string>;
  /** Only set on paid plans: the effective monthly rate when paying yearly. */
  yearlyNote?: string;
  /**
   * What paying yearly actually saves against twelve monthly payments, and the
   * monthly total it is measured against. Both are real figures derived from
   * the prices above — never a struck-through price we never charged.
   */
  yearlySaving?: { amount: string; monthlyTotal: string };
  credits: string;
  features: string[];
  /** Free plan only: a plain link, since there is nothing to buy. */
  cta?: { label: string; href: string };
  /**
   * Paid plans: the catalogue id in `@/lib/billing` to check out, per billing
   * period. The server resolves it to a Stripe price — the amount is never
   * sent from the browser.
   */
  checkout?: Record<BillingPeriod, { item: string; label: string }>;
  /** The single subtly-highlighted recommendation. */
  highlight: boolean;
};

/** Paying yearly costs the same as ten monthly payments. */
export const YEARLY_SAVING_LABEL = '2 months free';

export const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Everything you need for everyday downloads.',
    price: { monthly: '$0', yearly: '$0' },
    period: { monthly: 'forever', yearly: 'forever' },
    credits: '30 SavCredits / day',
    features: [
      'Every downloader included',
      'Up to 1080p HD',
      'No watermarks',
      'Free account, no card required',
      'Credits refresh every day',
    ],
    cta: { label: 'Start downloading free', href: '/#tools' },
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For creators who download every day.',
    price: { monthly: '$9', yearly: '$90' },
    period: { monthly: 'per month', yearly: 'per year' },
    yearlyNote: '$7.50 / month, billed yearly',
    yearlySaving: { amount: '$18', monthlyTotal: '$108' },
    credits: '1,500 SavCredits / month',
    features: [
      'Everything in Free',
      '4K and highest quality',
      'Priority, fastest speed',
      'Batch downloads',
      'Early access to AI tools',
      'No ads, ever',
    ],
    checkout: {
      monthly: { item: 'pro-monthly', label: 'Get Pro' },
      yearly: { item: 'pro-yearly', label: 'Get Pro' },
    },
    highlight: true,
  },
  {
    id: 'max',
    name: 'Max',
    tagline: 'For heavy users running big jobs.',
    price: { monthly: '$15', yearly: '$150' },
    period: { monthly: 'per month', yearly: 'per year' },
    yearlyNote: '$12.50 / month, billed yearly',
    yearlySaving: { amount: '$30', monthlyTotal: '$180' },
    credits: '3,500 SavCredits / month',
    features: [
      'Everything in Pro',
      'Highest monthly credit allowance',
      'Largest batch sizes',
      'Priority support',
    ],
    checkout: {
      monthly: { item: 'max-monthly', label: 'Get Max' },
      yearly: { item: 'max-yearly', label: 'Get Max' },
    },
    highlight: false,
  },
];

export type CreditPack = {
  id: string;
  /** Catalogue id in `@/lib/billing`. */
  item: string;
  name: string;
  credits: string;
  price: string;
  /** Effective per-credit rate, so the packs are honestly comparable. */
  rate: string;
  bestValue: boolean;
};

export const creditPacks: CreditPack[] = [
  {
    id: 'starter',
    item: 'pack-starter',
    name: 'Starter',
    credits: '1,000',
    price: '$9',
    rate: '$0.0090 per credit',
    bestValue: false,
  },
  {
    id: 'standard',
    item: 'pack-standard',
    name: 'Standard',
    credits: '3,000',
    price: '$19',
    rate: '$0.0063 per credit',
    bestValue: true,
  },
  {
    id: 'bulk',
    item: 'pack-bulk',
    name: 'Bulk',
    credits: '8,000',
    price: '$45',
    rate: '$0.0056 per credit',
    bestValue: false,
  },
];

export const creditPackPerks: string[] = [
  'One-time purchase, no subscription',
  'Credits never expire',
  'Stacks on top of any plan, including Free',
  'Works with every tool on SavDown',
];

export const lifetime = {
  name: 'Lifetime',
  price: '$199',
  period: 'one-time payment',
  credits: '3,500 SavCredits / month, forever',
  tagline: 'Pay once. Keep Max-level access for good.',
  features: [
    '3,500 SavCredits refreshed every month, forever',
    'Every Max feature, including tools we ship later',
    '4K and highest quality downloads',
    'Priority speed and largest batch sizes',
    'No renewal, no subscription, no price increases',
  ],
  fairUse: [
    'Monthly credits reset at the start of each month and do not carry over.',
    'Intended for personal and individual use, not resale or automated bulk pipelines.',
  ],
  checkout: { item: 'lifetime', label: 'Get Lifetime' },
};

export type CreditCost = { icon: LucideIcon; label: string; cost: string };

/**
 * These must stay in step with `JOB_COST` in `@/lib/credits`, which is what the
 * API routes actually charge.
 */
export const creditCosts: CreditCost[] = [
  { icon: Film, label: 'HD / SD video', cost: '1 credit' },
  { icon: Film, label: '4K video', cost: '2 credits' },
  { icon: Music, label: 'MP3 audio', cost: '1 credit' },
  { icon: Image, label: 'Image & PDF tools', cost: '1 credit' },
  { icon: Clapperboard, label: 'Video converting', cost: '2 credits' },
  { icon: Wand2, label: 'AI tools (soon)', cost: '3+ credits' },
];

export type CreditFlowStep = { icon: LucideIcon; title: string; description: string };

export const creditFlow: CreditFlowStep[] = [
  {
    icon: MousePointerClick,
    title: 'Choose a tool',
    description: 'Pick any downloader or utility from the catalog.',
  },
  {
    icon: Eye,
    title: 'See its credit cost',
    description: 'The cost is shown up front, before anything runs.',
  },
  {
    icon: Sparkles,
    title: 'Use the tool',
    description: 'Paste your link and get your file.',
  },
  {
    icon: Coins,
    title: 'Credits are deducted',
    description: 'Only for jobs that finish successfully.',
  },
];

export type TrustPoint = { title: string; description: string };

export const trustPoints: TrustPoint[] = [
  {
    title: 'Secure payments',
    description: 'Handled by a trusted payment provider. We never see your card details.',
  },
  {
    title: 'Clear limits',
    description: 'Every tool shows its credit cost before you run it.',
  },
  {
    title: 'Cancel anytime',
    description: 'Manage or cancel your plan yourself, from your account, in one click.',
  },
  {
    title: 'No hidden fees',
    description: 'The price you see is the price you pay. No setup fees.',
  },
];

export const pricingFaqs = [
  {
    question: 'What are SavCredits?',
    answer:
      'SavCredits are the unit you spend when you run a tool. Most downloads cost 1 credit, 4K costs 2, and the AI tools we are building will cost 3 or more. Every account gets a free daily allowance, so you can use SavDown without paying anything.',
  },
  {
    question: 'Do SavCredits expire?',
    answer:
      'It depends where they came from. Free daily credits reset every 24 hours. Credits included with a Pro or Max plan reset at the start of each billing month. Credits you buy in a one-time pack never expire.',
  },
  {
    question: 'What happens when I reach my limit?',
    answer:
      'Nothing breaks and you are never charged automatically. The tool simply asks you to wait for your next reset, buy a one-time credit pack, or move to a larger plan. Your existing files and account are untouched.',
  },
  {
    question: 'Can I cancel?',
    answer:
      'Yes. Open the billing page in your account to cancel in one click — your plan stays active until the end of the period you already paid for, and you are not charged again. Credit packs and the Lifetime plan are one-time purchases, so there is no subscription to cancel.',
  },
  {
    question: 'Can I buy credits without subscribing?',
    answer:
      'Yes, that is exactly what the credit packs are for. They are a one-time purchase with no recurring charge, they never expire, and they stack on top of whatever plan you are on — including the Free plan.',
  },
  {
    question: 'What is the Lifetime plan?',
    answer:
      'A single payment of $199 that gives you 3,500 SavCredits refreshed every month, for as long as SavDown runs, along with every Max feature. There is no renewal and no subscription. Fair use applies: monthly credits reset rather than stacking, and it is meant for personal use rather than resale or automated bulk pipelines.',
  },
  {
    question: 'What happens to unused credits?',
    answer:
      'Credits from one-time packs carry over indefinitely. Free daily credits and the credits included with a plan reset at the start of each period and do not stack up month to month.',
  },
];
