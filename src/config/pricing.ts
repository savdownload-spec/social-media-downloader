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
 * Every number shown on /pricing lives here — a single source of truth so the
 * plans, credit packs, comparison table and FAQ can never disagree.
 *
 * Commercial shape (see the pricing brief):
 *   • Free is genuinely usable but capped (daily allowance + monthly ceiling).
 *   • Pro Monthly is the "most chosen" option; Pro Yearly is the strongest
 *     price-to-value ratio (a real ~30% saving vs twelve monthly payments).
 *   • Credit packs are a one-time alternative; their savings are DERIVED from a
 *     base per-credit rate, never invented.
 *   • Lifetime is a large but FINITE credit bank (never "unlimited"), so it
 *     stays attractive without cannibalising the subscription model.
 *
 * Billing is not live yet, so paid CTAs are presented as a waitlist. Flip
 * BILLING_LIVE to true (and wire the checkout) when payments launch.
 */

export const BILLING_LIVE = false;

/** The pre-launch CTA every paid plan/pack uses while BILLING_LIVE is false. */
export const WAITLIST_CTA = { label: 'Join the waitlist', href: '/contact' } as const;

const money = (cents: number) =>
  cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;

// ─────────────────────────────────────────────────────────────────────────────
// Subscriptions: Free · Pro Monthly · Pro Yearly
// ─────────────────────────────────────────────────────────────────────────────

export type PlanHighlight = 'none' | 'popular' | 'value';

export type Plan = {
  id: 'free' | 'pro-monthly' | 'pro-yearly';
  name: string;
  tagline: string;
  price: string;
  /** e.g. "per month", "forever". */
  period: string;
  /** Optional secondary price line, e.g. effective monthly rate when yearly. */
  priceNote?: string;
  credits: string;
  /** Optional second credit line, e.g. a monthly ceiling on Free. */
  creditsNote?: string;
  features: string[];
  /** Which premium treatment the card gets. */
  highlight: PlanHighlight;
  /** Badge text for highlighted cards. */
  badge?: string;
  /** A short, punchy value message shown under the badge (yearly savings). */
  valueMessage?: string;
  /** Free plan links straight to the tools; paid plans use the waitlist CTA. */
  cta: { label: string; href: string };
  /** Catalogue id for later checkout wiring (unused while BILLING_LIVE is false). */
  checkoutItem?: string;
};

// Pro monthly anchor and the yearly price, kept as cents so the saving is exact.
const PRO_MONTHLY_CENTS = 999; // $9.99 / month
const PRO_YEARLY_CENTS = 8388; // $83.88 / year = $6.99 x 12
const proYearlyVsMonthly = PRO_MONTHLY_CENTS * 12 - PRO_YEARLY_CENTS; // $36.00 saved
const proYearlyPercent = Math.round((proYearlyVsMonthly / (PRO_MONTHLY_CENTS * 12)) * 100); // 30

const PRO_FEATURES = [
  'Everything in Free',
  '4K and highest quality',
  'Priority, fastest processing',
  'Batch downloads',
  'Early access to new AI tools',
  'No ads, ever',
];

export const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Try SavDown before you pay.',
    price: '$0',
    period: 'forever',
    credits: '30 credits / day',
    creditsNote: 'up to 500 credits / month',
    features: [
      'Every downloader included',
      'Up to 1080p HD',
      'No watermarks',
      'No card required',
      'Standard processing',
    ],
    highlight: 'none',
    cta: { label: 'Get started', href: '/#tools' },
  },
  {
    id: 'pro-monthly',
    name: 'Pro Monthly',
    tagline: 'For creators who download every day.',
    price: money(PRO_MONTHLY_CENTS),
    period: 'per month',
    credits: '1,500 credits / month',
    features: PRO_FEATURES,
    highlight: 'popular',
    badge: 'MOST POPULAR',
    cta: WAITLIST_CTA,
    checkoutItem: 'pro-monthly',
  },
  {
    id: 'pro-yearly',
    name: 'Pro Yearly',
    tagline: 'Best price for consistent users.',
    price: money(PRO_YEARLY_CENTS),
    period: 'per year',
    priceNote: `${money(699)} / month, billed yearly`,
    credits: '1,500 credits / month',
    creditsNote: '18,000 credits / year',
    features: PRO_FEATURES,
    highlight: 'value',
    badge: 'BEST VALUE',
    valueMessage: `Save ${proYearlyPercent}% · ${money(proYearlyVsMonthly)}/year`,
    cta: WAITLIST_CTA,
    checkoutItem: 'pro-yearly',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Credit packs: one-time, never expire. Savings derived from the base rate.
// ─────────────────────────────────────────────────────────────────────────────

type CreditPackRaw = {
  id: string;
  item: string;
  name: string;
  tagline: string;
  credits: number;
  priceCents: number;
  badge?: 'MOST POPULAR' | 'BEST VALUE';
};

const creditPacksRaw: CreditPackRaw[] = [
  {
    id: 'starter',
    item: 'pack-starter',
    name: 'Starter',
    tagline: 'For occasional users',
    credits: 2000,
    priceCents: 999,
  },
  {
    id: 'creator',
    item: 'pack-creator',
    name: 'Creator',
    tagline: 'For regular one-off usage',
    credits: 5000,
    priceCents: 1999,
    badge: 'MOST POPULAR',
  },
  {
    id: 'power',
    item: 'pack-power',
    name: 'Power',
    tagline: 'For heavy one-time usage',
    credits: 12000,
    priceCents: 3999,
    badge: 'BEST VALUE',
  },
];

/** The smallest pack sets the baseline per-credit price; larger packs save against it. */
const BASE_RATE_PER_CREDIT = creditPacksRaw[0].priceCents / creditPacksRaw[0].credits;

export type CreditPack = {
  id: string;
  item: string;
  name: string;
  tagline: string;
  /** "2,000" */
  credits: string;
  /** "$9.99" */
  price: string;
  /** "$5.00 / 1,000 credits" */
  perThousand: string;
  /** Whole-number percent saved vs the base rate; 0 for the base pack. */
  savePercent: number;
  badge?: 'MOST POPULAR' | 'BEST VALUE';
  highlight: PlanHighlight;
};

export const creditPacks: CreditPack[] = creditPacksRaw.map((p) => {
  const rate = p.priceCents / p.credits; // cents per credit
  const dollarsPerThousand = (rate * 1000) / 100; // cents/credit → $/1,000 credits
  return {
    id: p.id,
    item: p.item,
    name: p.name,
    tagline: p.tagline,
    credits: p.credits.toLocaleString(),
    price: money(p.priceCents),
    perThousand: `$${dollarsPerThousand.toFixed(2)} / 1,000 credits`,
    savePercent: Math.round((1 - rate / BASE_RATE_PER_CREDIT) * 100),
    badge: p.badge,
    highlight: p.badge === 'MOST POPULAR' ? 'popular' : p.badge === 'BEST VALUE' ? 'value' : 'none',
  };
});

export const creditPackPerks: string[] = [
  'One-time purchase, no subscription',
  'Credits never expire',
  'Stacks on top of any plan, including Free',
  'Works with every tool on SavDown',
];

// ─────────────────────────────────────────────────────────────────────────────
// Lifetime: a large but finite credit bank. Deliberately NOT unlimited.
// ─────────────────────────────────────────────────────────────────────────────

export const lifetime = {
  name: 'Lifetime',
  price: '$199',
  period: 'one-time payment',
  creditsValue: '15,000',
  creditsLabel: '15,000 lifetime credits',
  tagline: 'Pay once. Use your lifetime credits whenever you need them.',
  item: 'lifetime',
  benefits: [
    'One-time payment, no subscription',
    '15,000 lifetime credits',
    'Credits never expire',
    'Lifetime access to premium features',
    'All future standard feature updates',
    'Priority access to selected new features',
  ],
  fairUse: [
    'A fixed lifetime credit balance — not unlimited processing.',
    'Top up any time with a credit pack once your balance runs low.',
    'For personal and individual use, not resale or automated bulk pipelines.',
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Comparison matrix (kept short and mobile-friendly)
// ─────────────────────────────────────────────────────────────────────────────

export type ComparisonValue = boolean | string;
export type ComparisonRow = { label: string; free: ComparisonValue; pro: ComparisonValue; lifetime: ComparisonValue };

export const comparisonColumns = ['Free', 'Pro', 'Lifetime'] as const;

export const comparisonRows: ComparisonRow[] = [
  { label: 'Daily credits', free: '30 / day', pro: 'From monthly pool', lifetime: 'From lifetime pool' },
  { label: 'Credit allowance', free: '500 / month', pro: '1,500 / month', lifetime: '15,000 total' },
  { label: 'Up to 4K quality', free: false, pro: true, lifetime: true },
  { label: 'Priority processing', free: false, pro: true, lifetime: true },
  { label: 'Batch downloads', free: false, pro: true, lifetime: true },
  { label: 'Ads', free: 'Minimal', pro: 'None', lifetime: 'None' },
  { label: 'Credit expiry', free: 'Daily reset', pro: 'Monthly reset', lifetime: 'Never expire' },
  { label: 'Recurring payment', free: 'None', pro: 'Monthly or yearly', lifetime: 'One-time' },
  { label: 'Priority new features', free: false, pro: false, lifetime: true },
];

// ─────────────────────────────────────────────────────────────────────────────
// How credits work
// ─────────────────────────────────────────────────────────────────────────────

export type CreditCost = { icon: LucideIcon; label: string; cost: string };

/** Kept in step with JOB_COST in `@/lib/credits`, which is what routes charge. */
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
  { icon: MousePointerClick, title: 'Choose a tool', description: 'Pick any downloader or utility from the catalog.' },
  { icon: Eye, title: 'See its credit cost', description: 'The cost is shown up front, before anything runs.' },
  { icon: Sparkles, title: 'Use the tool', description: 'Paste your link and get your file.' },
  { icon: Coins, title: 'Credits are deducted', description: 'Only for jobs that finish successfully.' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Trust row (only claims that are actually true today)
// ─────────────────────────────────────────────────────────────────────────────

export type TrustPoint = { title: string; description: string };

export const trustPoints: TrustPoint[] = [
  { title: 'Start free', description: 'Use SavDown today with free daily credits. No card required.' },
  { title: 'Credits never expire', description: 'Credit packs are one-time and stay in your balance for good.' },
  { title: 'Cancel anytime', description: 'When subscriptions launch, cancel yourself in one click. No lock-in.' },
  { title: 'No hidden fees', description: 'The price you see is the price you pay. No setup fees.' },
];

// ─────────────────────────────────────────────────────────────────────────────
// FAQ
// ─────────────────────────────────────────────────────────────────────────────

export const pricingFaqs = [
  {
    question: 'What are SavCredits?',
    answer:
      'SavCredits are the unit you spend when you run a tool. Most downloads cost 1 credit, 4K costs 2, and the AI tools we are building will cost 3 or more. Every account gets a free daily allowance, so you can use SavDown without paying anything.',
  },
  {
    question: 'Are paid plans available yet?',
    answer:
      'Not quite. The Free plan works today with free daily credits. Paid subscriptions and credit packs are launching soon — join the waitlist and we will let you know the moment they go live. Nothing is charged in the meantime.',
  },
  {
    question: 'Do credits expire?',
    answer:
      'It depends where they came from. Free daily credits reset every 24 hours. Credits included with a Pro plan reset at the start of each billing month. Credits you buy in a one-time pack, and your Lifetime credit balance, never expire.',
  },
  {
    question: 'Why choose yearly over monthly?',
    answer:
      `Pro Yearly costs ${money(PRO_YEARLY_CENTS)} — that is ${money(699)} a month, versus ${money(PRO_MONTHLY_CENTS)} a month on the monthly plan. You get the same features and credits for about ${proYearlyPercent}% less, saving ${money(proYearlyVsMonthly)} over the year.`,
  },
  {
    question: 'What is the Lifetime plan?',
    answer:
      'A single payment of $199 that gives you 15,000 lifetime credits which never expire, lifetime access to premium features, and all future standard updates. It is a large but fixed credit balance rather than unlimited processing — when it runs low you can top up with a credit pack. Best for people who would rather own SavDown than subscribe.',
  },
  {
    question: 'Can I buy credits without subscribing?',
    answer:
      'Yes, that is exactly what the credit packs are for. They are a one-time purchase with no recurring charge, they never expire, and they stack on top of whatever plan you are on, including the Free plan.',
  },
  {
    question: 'What happens when I run out of credits?',
    answer:
      'Nothing breaks and you are never charged automatically. The tool asks you to wait for your next reset, buy a one-time credit pack, or move to a larger plan. Your existing files and account are untouched.',
  },
];
