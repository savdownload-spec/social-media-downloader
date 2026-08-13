'use client';

import { useRef, useState } from 'react';
import { Container } from '@/components/layout/Container';
import { PlanCard } from '@/components/pricing/PlanCard';
import { CreditPackCard } from '@/components/pricing/CreditPackCard';
import { LifetimeCard } from '@/components/pricing/LifetimeCard';
import {
  plans,
  creditPacks,
  creditPackPerks,
  YEARLY_SAVING_LABEL,
  type BillingPeriod,
} from '@/config/pricing';

type TabId = 'plans' | 'credits' | 'lifetime';

const TABS: { id: TabId; label: string }[] = [
  { id: 'plans', label: 'Plans' },
  { id: 'credits', label: 'Credits' },
  { id: 'lifetime', label: 'Lifetime' },
];

const BILLING: { id: BillingPeriod; label: string }[] = [
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
];

/**
 * The pricing switcher: Plans / Credits / Lifetime, plus a monthly-yearly
 * toggle that only applies to the subscription tiers.
 *
 * All three panels stay mounted and inactive ones are hidden with the `hidden`
 * attribute rather than unmounted, so the credit-pack and lifetime copy is
 * still in the served HTML for crawlers while the UI shows one section at a
 * time.
 */
export function PricingTabs() {
  const [tab, setTab] = useState<TabId>('plans');
  const [billing, setBilling] = useState<BillingPeriod>('monthly');
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Roving arrow-key navigation, as expected of a tablist.
  function onTabKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next =
      e.key === 'ArrowRight'
        ? (index + 1) % TABS.length
        : (index - 1 + TABS.length) % TABS.length;
    setTab(TABS[next].id);
    tabRefs.current[next]?.focus();
  }

  return (
    <Container className="pb-4">
      {/* Section switcher. The flex wrapper does the centring: from `sm` the
          tablist is inline-grid so it can shrink to its buttons, and `mx-auto`
          has no effect on an inline box. */}
      <div className="flex justify-center">
        <div
          role="tablist"
          aria-label="Pricing options"
          className="grid w-full max-w-md grid-cols-3 gap-1 rounded-full border border-border bg-white p-1 shadow-soft sm:inline-grid sm:w-auto sm:max-w-none"
        >
          {TABS.map((t, i) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`pricing-tab-${t.id}`}
                aria-selected={active}
                aria-controls={`pricing-panel-${t.id}`}
                tabIndex={active ? 0 : -1}
                onClick={() => setTab(t.id)}
                onKeyDown={(e) => onTabKeyDown(e, i)}
                className={`rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-200 sm:px-8 ${
                  active
                    ? 'bg-text text-white shadow-soft-md'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Plans */}
      <div
        role="tabpanel"
        id="pricing-panel-plans"
        aria-labelledby="pricing-tab-plans"
        hidden={tab !== 'plans'}
        tabIndex={0}
      >
        {/* The hero h1 already carries this message visually; the heading only
            exists so the plan names below it are not an h3 under an h1. */}
        <h2 className="sr-only">Subscription plans</h2>

        <div className="mt-8 flex flex-col items-center gap-3">
          <div className="inline-flex gap-1 rounded-full border border-border bg-white p-1 shadow-soft">
            {BILLING.map((b) => {
              const active = billing === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBilling(b.id)}
                  aria-pressed={active}
                  className={`rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 ${
                    active ? 'bg-text text-white shadow-soft-md' : 'text-text-muted hover:text-text'
                  }`}
                >
                  {b.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs font-semibold text-accent-hover">
            Pay yearly and get {YEARLY_SAVING_LABEL}
          </p>
        </div>

        {/* Three cards into a two-column tablet grid leaves the last one
            orphaned, so at `sm` it spans both columns and centres itself at
            half width. From `lg` the plain three-up grid takes over. */}
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <div
              key={plan.id}
              className={
                i === plans.length - 1
                  ? 'sm:col-span-2 sm:mx-auto sm:w-[calc(50%-0.625rem)] lg:col-span-1 lg:mx-0 lg:w-auto'
                  : undefined
              }
            >
              <PlanCard plan={plan} billing={billing} />
            </div>
          ))}
        </div>
      </div>

      {/* Credit packs */}
      <div
        role="tabpanel"
        id="pricing-panel-credits"
        aria-labelledby="pricing-tab-credits"
        hidden={tab !== 'credits'}
        tabIndex={0}
      >
        <div className="mt-8 max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-text">
            Need more credits without a subscription?
          </h2>
          <p className="mt-3 text-text-muted leading-relaxed">
            Top up once and use the credits whenever you like. No plan required, nothing recurring.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-semibold text-text-muted">
            {creditPackPerks.map((perk) => (
              <span key={perk} className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                {perk}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3 max-w-4xl mx-auto">
          {creditPacks.map((pack) => (
            <CreditPackCard key={pack.id} pack={pack} />
          ))}
        </div>
      </div>

      {/* Lifetime */}
      <div
        role="tabpanel"
        id="pricing-panel-lifetime"
        aria-labelledby="pricing-tab-lifetime"
        hidden={tab !== 'lifetime'}
        tabIndex={0}
      >
        <div className="mt-8 max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-text">
            One payment. <span className="text-gradient">Long-term access.</span>
          </h2>
          <p className="mt-3 text-text-muted leading-relaxed">
            For people who know they will keep using SavDown and would rather not think about
            billing again.
          </p>
        </div>

        <div className="mt-10">
          <LifetimeCard />
        </div>
      </div>
    </Container>
  );
}
