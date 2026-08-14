'use client';

import { useMemo, useRef, useState } from 'react';
import { Container } from '@/components/layout/Container';
import { PlanCard } from '@/components/pricing/PlanCard';
import { CreditPackCard } from '@/components/pricing/CreditPackCard';
import { LifetimeCard } from '@/components/pricing/LifetimeCard';
import { usePricing } from '@/components/pricing/PricingProvider';
import {
  derivePlan,
  derivePacks,
  deriveLifetime,
  creditPackPerks,
  type BillingPeriod,
} from '@/config/pricing';

type TabId = 'subscriptions' | 'credits' | 'lifetime';

const TABS: { id: TabId; label: string }[] = [
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'credits', label: 'Credit Packs' },
  { id: 'lifetime', label: 'Lifetime' },
];

/**
 * The pricing switcher. Subscriptions use ONE Pro card with a Monthly/Yearly
 * toggle (no duplicate cards); the toggle recomputes price, credits, billing
 * frequency and the calculated saving from the model. All panels stay mounted
 * (inactive ones hidden) so every plan is in the served HTML for crawlers.
 */
export function PricingTabs() {
  const config = usePricing();
  const [tab, setTab] = useState<TabId>('subscriptions');
  const [period, setPeriod] = useState<BillingPeriod>('monthly');
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const plans = useMemo(
    () =>
      config.plans
        .filter((p) => p.visible)
        .sort((a, b) => a.order - b.order)
        .map((p) => derivePlan(p, period)),
    [config.plans, period],
  );
  const packs = useMemo(() => derivePacks(config.packs), [config.packs]);
  const lifetime = useMemo(() => deriveLifetime(config.lifetime), [config.lifetime]);

  function onTabKey(e: React.KeyboardEvent, index: number) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next =
      e.key === 'ArrowRight' ? (index + 1) % TABS.length : (index - 1 + TABS.length) % TABS.length;
    setTab(TABS[next].id);
    tabRefs.current[next]?.focus();
  }

  return (
    <Container className="pb-4">
      {/* Tabs */}
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
                onKeyDown={(e) => onTabKey(e, i)}
                className={`rounded-full px-3 py-2.5 text-sm font-semibold transition-all duration-200 sm:px-7 ${
                  active ? 'bg-gradient-brand bg-[length:200%_200%] text-white shadow-glow' : 'text-text-muted hover:text-text'
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
        {/* Monthly / Yearly toggle */}
        <div className="mt-8 flex flex-col items-center gap-2.5">
          <div className="inline-flex gap-1 rounded-full border border-border bg-white p-1 shadow-soft">
            {(['monthly', 'yearly'] as BillingPeriod[]).map((p) => {
              const active = period === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  aria-pressed={active}
                  className={`rounded-full px-5 py-2 text-sm font-semibold capitalize transition-all duration-200 ${
                    active ? 'bg-text text-white shadow-soft-md' : 'text-text-muted hover:text-text'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>
          {period === 'yearly' && plans.find((p) => p.valueMessage) && (
            <p className="text-xs font-bold text-accent-hover">{plans.find((p) => p.valueMessage)?.valueMessage}</p>
          )}
        </div>

        <div className="mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-6 px-1 pt-8 sm:grid-cols-2 sm:gap-5">
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

        <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-6 px-1 pt-8 md:grid-cols-3 md:gap-5">
          {packs.map((pack) => (
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

        <div className="mt-10 px-1 pt-8">
          <LifetimeCard lifetime={lifetime} />
        </div>
      </div>
    </Container>
  );
}
