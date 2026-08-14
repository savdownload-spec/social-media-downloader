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
 * SavDown pricing — the ONE canonical model and all derivation.
 *
 * This file is client-safe (no DB, no server imports): it holds the default
 * model plus pure functions that turn raw numbers into display values. The
 * runtime source of truth is the DB (`adminSetting.pricing_config`), read by
 * `@/lib/pricing-server`; when the DB has no row, or an admin clears a field,
 * these defaults fill in. Every public surface — pricing page, nav dropdown,
 * mobile nav, FAQ, comparison — derives from the same object, so a value can
 * never be stale in one place and current in another.
 *
 * Commercial logic (validated before implementation — see deriveSavings):
 *   Per-credit cost falls only as commitment rises, so there is no arbitrage:
 *     Packs ($12–16.67/1k) > Pro monthly ($9.99/1k) > Pro yearly ($7.42/1k)
 *     > Lifetime ($6.63/1k, but a FINITE bank).
 *   Packs cost MORE per credit than a subscription (they never expire and need
 *   no commitment — that flexibility is the premium). Lifetime is a large but
 *   bounded credit bank, so a heavy ongoing user is still better on Yearly
 *   while a moderate long-term user wins with Lifetime — both have a reason,
 *   and there is no unlimited liability.
 */

export const CURRENCY = 'USD';
export const CURRENCY_SYMBOL = '$';

/** Billing is not live yet; paid CTAs are a waitlist until this is true. */
export const BILLING_LIVE = false;
export const WAITLIST_HREF = '/contact';

export type BillingPeriod = 'monthly' | 'yearly';
export type BadgeKind = 'popular' | 'value' | null;

// ─────────────────────────────────────────────────────────────────────────────
// Raw model (what the admin edits / the DB stores)
// ─────────────────────────────────────────────────────────────────────────────

export type RawPlan = {
  id: string;
  name: string;
  tagline: string;
  /** Dollars. 0 for Free. */
  monthlyPrice: number;
  /** Dollars for a full year. 0 for Free. */
  yearlyPrice: number;
  /** Monthly credit allowance (resets each period). */
  monthlyCredits: number;
  /** Optional override for how the allowance reads, e.g. "10 credits / day". */
  creditsLabel?: string;
  /** Optional secondary allowance note, e.g. "up to 300 / month". */
  creditsNote?: string;
  features: string[];
  /** The single primary-conversion plan. */
  popular?: boolean;
  order: number;
  visible: boolean;
};

export type RawPack = {
  id: string;
  name: string;
  tagline: string;
  credits: number;
  /** Dollars, one-time. */
  price: number;
  /** Optional extra credits granted on top. */
  bonus?: number;
  order: number;
  visible: boolean;
};

export type RawLifetime = {
  name: string;
  /** Dollars, one-time. */
  price: number;
  /** A FINITE lifetime credit bank. Never "unlimited". */
  credits: number;
  tagline: string;
  benefits: string[];
  fairUse: string[];
  visible: boolean;
};

export type PricingConfig = {
  plans: RawPlan[];
  packs: RawPack[];
  lifetime: RawLifetime;
};

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT model (the validated, launch-ready numbers)
// ─────────────────────────────────────────────────────────────────────────────

const PRO_FEATURES = [
  'Everything in Free',
  '4K and highest quality',
  'Priority, fastest processing',
  'Batch downloads',
  'Early access to new AI tools',
  'No ads, ever',
];

export const DEFAULT_PRICING: PricingConfig = {
  plans: [
    {
      id: 'free',
      name: 'Free',
      tagline: 'Try SavDown before you pay.',
      monthlyPrice: 0,
      yearlyPrice: 0,
      monthlyCredits: 300,
      creditsLabel: '10 credits / day',
      creditsNote: 'up to 300 / month',
      features: [
        'Every downloader included',
        'Up to 1080p HD',
        'No watermarks',
        'No card required',
        'Standard processing',
      ],
      popular: false,
      order: 0,
      visible: true,
    },
    {
      id: 'pro',
      name: 'Pro',
      tagline: 'For creators who use SavDown regularly.',
      monthlyPrice: 9.99,
      yearlyPrice: 89,
      monthlyCredits: 1000,
      features: PRO_FEATURES,
      popular: true,
      order: 1,
      visible: true,
    },
  ],
  packs: [
    { id: 'starter', name: 'Starter', tagline: 'For occasional usage', credits: 300, price: 5, order: 0, visible: true },
    { id: 'creator', name: 'Creator', tagline: 'For regular one-off usage', credits: 1000, price: 14, order: 1, visible: true },
    { id: 'power', name: 'Power', tagline: 'For heavy one-off usage', credits: 3000, price: 36, order: 2, visible: true },
  ],
  lifetime: {
    name: 'Lifetime',
    price: 199,
    credits: 30000,
    tagline: 'Pay once. Use your lifetime credits whenever you need them.',
    benefits: [
      'One-time payment, no subscription',
      '30,000 lifetime credits',
      'Credits never expire',
      'Lifetime access to premium features',
      'All future standard feature updates',
      'Priority access to selected new features',
    ],
    fairUse: [
      'A large but fixed lifetime credit balance — not unlimited processing.',
      'Top up any time with a credit pack once your balance runs low.',
      'For personal and individual use, not resale or automated bulk pipelines.',
    ],
    visible: true,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Derivation (pure, client-safe) — the display layer every surface consumes
// ─────────────────────────────────────────────────────────────────────────────

/** Formats dollars: whole numbers drop the decimals, otherwise two places. */
export function formatMoney(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  return Number.isInteger(rounded)
    ? `${CURRENCY_SYMBOL}${rounded}`
    : `${CURRENCY_SYMBOL}${rounded.toFixed(2)}`;
}

export type PlanView = {
  id: string;
  name: string;
  tagline: string;
  free: boolean;
  popular: boolean;
  badge: BadgeKind;
  badgeLabel?: string;
  /** Price shown for the active period. */
  price: string;
  /** e.g. "per month", "per year", "forever". */
  period: string;
  /** Yearly only: the effective monthly rate, e.g. "$7.42 / month, billed yearly". */
  priceNote?: string;
  /** Yearly only: a calculated savings message, e.g. "Save 26% · $30.88 / year". */
  valueMessage?: string;
  credits: string;
  creditsNote?: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
};

/**
 * Turns a raw plan into a display view for the chosen billing period, computing
 * yearly savings from the numbers (never hardcoded).
 */
export function derivePlan(plan: RawPlan, period: BillingPeriod): PlanView {
  const free = plan.monthlyPrice === 0 && plan.yearlyPrice === 0;
  const yearly = period === 'yearly';

  let price: string;
  let periodLabel: string;
  let priceNote: string | undefined;
  let valueMessage: string | undefined;

  if (free) {
    price = formatMoney(0);
    periodLabel = 'forever';
  } else if (yearly) {
    price = formatMoney(plan.yearlyPrice);
    periodLabel = 'per year';
    const perMonth = plan.yearlyPrice / 12;
    priceNote = `${formatMoney(perMonth)} / month, billed yearly`;
    const annualizedMonthly = plan.monthlyPrice * 12;
    const savings = annualizedMonthly - plan.yearlyPrice;
    if (savings > 0) {
      const percent = Math.round((savings / annualizedMonthly) * 100);
      valueMessage = `Save ${percent}% · ${formatMoney(savings)} / year`;
    }
  } else {
    price = formatMoney(plan.monthlyPrice);
    periodLabel = 'per month';
  }

  const badge: BadgeKind = plan.popular ? (yearly ? 'value' : 'popular') : null;
  const badgeLabel = badge === 'popular' ? 'MOST POPULAR' : badge === 'value' ? 'BEST VALUE' : undefined;

  const credits =
    plan.creditsLabel ??
    (free ? `${plan.monthlyCredits.toLocaleString()} credits / month` : `${plan.monthlyCredits.toLocaleString()} credits / month`);
  const creditsNote = yearly && !free ? `${(plan.monthlyCredits * 12).toLocaleString()} credits / year` : plan.creditsNote;

  return {
    id: plan.id,
    name: plan.name,
    tagline: plan.tagline,
    free,
    popular: Boolean(plan.popular),
    badge,
    badgeLabel,
    price,
    period: periodLabel,
    priceNote,
    valueMessage,
    credits,
    creditsNote,
    features: plan.features,
    ctaLabel: free ? 'Get started' : BILLING_LIVE ? `Get ${plan.name}` : 'Join the waitlist',
    ctaHref: free ? '/#tools' : WAITLIST_HREF,
  };
}

export type PackView = {
  id: string;
  name: string;
  tagline: string;
  /** Total credits including any bonus, formatted. */
  credits: string;
  /** Base credits (excluding bonus), formatted; undefined when no bonus. */
  baseCredits?: string;
  bonus?: string;
  price: string;
  perThousand: string;
  /** Percent cheaper per credit than the baseline (smallest) pack; 0 = baseline. */
  savePercent: number;
  badge: BadgeKind;
  badgeLabel?: string;
  ctaLabel: string;
  ctaHref: string;
};

/**
 * Derives pack views with savings calculated against the smallest pack's
 * per-credit rate (the baseline), so "SAVE X%" is always mathematically real.
 * BEST VALUE goes to the pack with the genuinely lowest effective per-credit
 * price; MOST POPULAR to the middle pack.
 */
export function derivePacks(packs: RawPack[]): PackView[] {
  const visible = packs.filter((p) => p.visible).sort((a, b) => a.order - b.order);
  if (visible.length === 0) return [];

  const totalCredits = (p: RawPack) => p.credits + (p.bonus ?? 0);
  const ratePerCredit = (p: RawPack) => p.price / totalCredits(p);

  const baselineRate = Math.max(...visible.map(ratePerCredit)); // the priciest per credit
  const bestRate = Math.min(...visible.map(ratePerCredit));
  const bestId = visible.find((p) => ratePerCredit(p) === bestRate)?.id;
  // "Most popular" = the middle pack by credits, when there are three.
  const midId = visible.length >= 3 ? [...visible].sort((a, b) => a.credits - b.credits)[Math.floor(visible.length / 2)].id : undefined;

  return visible.map((p) => {
    const rate = ratePerCredit(p);
    const savePercent = Math.round((1 - rate / baselineRate) * 100);
    const badge: BadgeKind = p.id === bestId ? 'value' : p.id === midId ? 'popular' : null;
    return {
      id: p.id,
      name: p.name,
      tagline: p.tagline,
      credits: totalCredits(p).toLocaleString(),
      baseCredits: p.bonus ? p.credits.toLocaleString() : undefined,
      bonus: p.bonus ? p.bonus.toLocaleString() : undefined,
      price: formatMoney(p.price),
      perThousand: `${formatMoney(rate * 1000)} / 1,000 credits`,
      savePercent,
      badge,
      badgeLabel: badge === 'value' ? 'BEST VALUE' : badge === 'popular' ? 'MOST POPULAR' : undefined,
      ctaLabel: BILLING_LIVE ? 'Buy credits' : 'Join the waitlist',
      ctaHref: WAITLIST_HREF,
    };
  });
}

export type LifetimeView = {
  name: string;
  price: string;
  period: string;
  credits: string;
  perThousand: string;
  tagline: string;
  benefits: string[];
  fairUse: string[];
  ctaLabel: string;
  ctaHref: string;
};

export function deriveLifetime(lt: RawLifetime): LifetimeView {
  return {
    name: lt.name,
    price: formatMoney(lt.price),
    period: 'one-time payment',
    credits: `${lt.credits.toLocaleString()} lifetime credits`,
    perThousand: `${formatMoney(lt.price / (lt.credits / 1000))} / 1,000 credits`,
    tagline: lt.tagline,
    benefits: lt.benefits,
    fairUse: lt.fairUse,
    ctaLabel: BILLING_LIVE ? 'Get Lifetime' : 'Join the waitlist',
    ctaHref: WAITLIST_HREF,
  };
}

/** A compact, consistent summary for nav dropdowns (monthly framing). */
export type PlanSummary = { id: string; name: string; price: string; period: string; credits: string; href: string };

export function derivePlanSummaries(config: PricingConfig): PlanSummary[] {
  const plans = config.plans
    .filter((p) => p.visible)
    .sort((a, b) => a.order - b.order)
    .map((p) => {
      const v = derivePlan(p, 'monthly');
      return { id: p.id, name: p.name, price: v.price, period: v.free ? 'forever' : '/mo', credits: v.credits, href: v.ctaHref };
    });
  return plans;
}

// ─────────────────────────────────────────────────────────────────────────────
// Static supporting content (not admin-priced): how credits work, trust, FAQ,
// comparison. These reference the model but hold copy, not authoritative prices.
// ─────────────────────────────────────────────────────────────────────────────

export type CreditCost = { icon: LucideIcon; label: string; cost: string };

/** Mirrors JOB_COST in `@/lib/credits`, which is what routes actually charge. */
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

export const creditPackPerks: string[] = [
  'One-time purchase, no subscription',
  'Credits never expire',
  'Stacks on top of any plan, including Free',
  'Works with every tool on SavDown',
];

export type TrustPoint = { title: string; description: string };

export const trustPoints: TrustPoint[] = [
  { title: 'Start free', description: 'Use SavDown today with free daily credits. No card required.' },
  { title: 'Credits never expire', description: 'Credit packs are one-time and stay in your balance for good.' },
  { title: 'Cancel anytime', description: 'When subscriptions launch, cancel yourself in one click. No lock-in.' },
  { title: 'No hidden fees', description: 'The price you see is the price you pay. No setup fees.' },
];

export type ComparisonValue = boolean | string;
export type ComparisonRow = { label: string; free: ComparisonValue; pro: ComparisonValue; lifetime: ComparisonValue };
export const comparisonColumns = ['Free', 'Pro', 'Lifetime'] as const;

/** Built from the model so allowances stay in step with the plans. */
export function buildComparison(config: PricingConfig): ComparisonRow[] {
  const free = config.plans.find((p) => p.id === 'free');
  const pro = config.plans.find((p) => p.id === 'pro');
  return [
    {
      label: 'Credit allowance',
      free: free?.creditsNote ?? `${(free?.monthlyCredits ?? 0).toLocaleString()} / month`,
      pro: `${(pro?.monthlyCredits ?? 0).toLocaleString()} / month`,
      lifetime: `${config.lifetime.credits.toLocaleString()} total`,
    },
    { label: 'Up to 4K quality', free: false, pro: true, lifetime: true },
    { label: 'Priority processing', free: false, pro: true, lifetime: true },
    { label: 'Batch downloads', free: false, pro: true, lifetime: true },
    { label: 'Ads', free: 'Minimal', pro: 'None', lifetime: 'None' },
    { label: 'Credit expiry', free: 'Daily reset', pro: 'Monthly reset', lifetime: 'Never expire' },
    { label: 'Recurring payment', free: 'None', pro: 'Monthly or yearly', lifetime: 'One-time' },
    { label: 'Priority new features', free: false, pro: false, lifetime: true },
  ];
}

/** FAQ, with the annual-saving answer computed from the model. */
export function buildPricingFaqs(config: PricingConfig) {
  const pro = config.plans.find((p) => p.id === 'pro');
  const monthly = pro?.monthlyPrice ?? 0;
  const yearly = pro?.yearlyPrice ?? 0;
  const savings = monthly * 12 - yearly;
  const percent = monthly > 0 ? Math.round((savings / (monthly * 12)) * 100) : 0;
  const perMonth = yearly / 12;

  return [
    {
      question: 'What are SavCredits?',
      answer:
        'SavCredits are the unit you spend when you run a tool. Most downloads cost 1 credit, 4K costs 2, and the AI tools we are building will cost 3 or more. Every account gets a free daily allowance, so you can use SavDown without paying anything.',
    },
    {
      question: 'Are paid plans available yet?',
      answer:
        'Not quite. The Free plan works today with free daily credits. Paid subscriptions, credit packs and Lifetime are launching soon — join the waitlist and we will let you know the moment they go live. Nothing is charged in the meantime.',
    },
    {
      question: 'Why choose yearly over monthly?',
      answer:
        `Pro Yearly costs ${formatMoney(yearly)} — that is ${formatMoney(perMonth)} a month, versus ${formatMoney(monthly)} a month on the monthly plan. You get the same features and credits for about ${percent}% less, saving ${formatMoney(savings)} over the year.`,
    },
    {
      question: 'Do credits expire?',
      answer:
        'Free daily credits reset every 24 hours. Credits included with a Pro plan reset at the start of each billing month. Credits from one-time packs, and your Lifetime balance, never expire.',
    },
    {
      question: 'What is the Lifetime plan?',
      answer:
        `A single payment of ${formatMoney(config.lifetime.price)} for ${config.lifetime.credits.toLocaleString()} lifetime credits that never expire, plus lifetime access to premium features and all future standard updates. It is a large but fixed credit balance rather than unlimited processing — when it runs low you can top up with a credit pack. Best for people who would rather own SavDown than subscribe.`,
    },
    {
      question: 'Can I buy credits without subscribing?',
      answer:
        'Yes, that is what the credit packs are for. They are a one-time purchase with no recurring charge, they never expire, and they stack on top of whatever plan you are on, including the Free plan.',
    },
    {
      question: 'What happens when I run out of credits?',
      answer:
        'Nothing breaks and you are never charged automatically. The tool asks you to wait for your next reset, buy a one-time credit pack, or move to a larger plan. Your existing files and account are untouched.',
    },
  ];
}
