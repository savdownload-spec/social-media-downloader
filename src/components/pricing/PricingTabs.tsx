'use client';

import { useRef, useState } from 'react';
import { Container } from '@/components/layout/Container';
import { PlanCard } from '@/components/pricing/PlanCard';
import { CreditPackCard } from '@/components/pricing/CreditPackCard';
import { LifetimeCard } from '@/components/pricing/LifetimeCard';
import { plans, creditPacks, creditPackPerks } from '@/config/pricing';

type TabId = 'subscriptions' | 'credits' | 'lifetime';

const TABS: { id: TabId; label: string }[] = [
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'credits', label: 'Credit Packs' },
  { id: 'lifetime', label: 'Lifetime' },
];

/**
 * The pricing switcher. All three panels stay mounted (inactive ones hidden via
 * the `hidden` attribute) so every plan stays in the served HTML for crawlers
 * while the UI shows one category at a time. Arrow keys move between tabs.
 */
export function PricingTabs() {
  const [tab, setTab] = useState<TabId>('subscriptions');
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next =
      e.key === 'ArrowRight' ? (index + 1) % TABS.length : (index - 1 + TABS.length) % TABS.length;
    setTab(TABS[next].id);
    tabRefs.current[next]?.focus();
  }

  return (
    <Container className="pb-4">
      {/* Tab switcher */}
      <div className="flex justify-center">
        <div
          role="tablist"
          aria-label="Pricing categories"
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
                onKeyDown={(e) => onKeyDown(e, i)}
                className={`rounded-full px-3 py-2.5 text-sm font-semibold transition-all duration-200 sm:px-7 ${
                  active
                    ? 'bg-gradient-brand bg-[length:200%_200%] text-white shadow-glow'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Subscriptions */}
      <div
        role="tabpanel"
        id="pricing-panel-subscriptions"
        aria-labelledby="pricing-tab-subscriptions"
        hidden={tab !== 'subscriptions'}
        tabIndex={0}
      >
        {/* pt-4 gives the Most Popular / Best Value badges room above the cards. */}
        <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-6 px-1 pt-4 lg:grid-cols-3 lg:gap-5">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
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
        <div className="mx-auto mt-10 max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-text md:text-3xl">
            Pay once. Use credits whenever you need them.
          </h2>
          <p className="mt-3 leading-relaxed text-text-muted">
            A flexible alternative to a subscription. Top up once and the credits are yours to keep.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-semibold text-text-muted">
            {creditPackPerks.map((perk) => (
              <span key={perk} className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
                {perk}
              </span>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-6 px-1 pt-4 md:grid-cols-3 md:gap-5">
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
        <div className="mx-auto mt-10 max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-text md:text-3xl">
            One payment. <span className="text-gradient">Long-term access.</span>
          </h2>
          <p className="mt-3 leading-relaxed text-text-muted">
            For people who know they will keep using SavDown and would rather own it than subscribe.
          </p>
        </div>

        <div className="mt-10 px-1 pt-4">
          <LifetimeCard />
        </div>
      </div>
    </Container>
  );
}
