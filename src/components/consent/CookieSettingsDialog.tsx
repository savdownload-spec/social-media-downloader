'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useCookieConsent } from '@/contexts/CookieConsentContext';
import {
  COOKIE_CATEGORIES,
  acceptAllPreferences,
  defaultPreferences,
  type ConsentPreferences,
} from '@/lib/cookie-consent';
import { cn } from '@/lib/utils';

export function CookieSettingsDialog() {
  const { consent, settingsOpen, closeSettings, savePreferences } = useCookieConsent();
  const [draft, setDraft] = useState<ConsentPreferences>(defaultPreferences());

  useEffect(() => {
    if (settingsOpen) setDraft(consent ?? defaultPreferences());
  }, [settingsOpen, consent]);

  return (
    <Modal
      open={settingsOpen}
      onClose={closeSettings}
      title="Cookie settings"
      description="Choose which cookies we may use. You can change this at any time from the Cookie Settings link in the footer."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={() => savePreferences(defaultPreferences())}>
            Reject All
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="font-semibold"
            onClick={() => savePreferences(acceptAllPreferences())}
          >
            Accept All
          </Button>
          <Button variant="primary" size="sm" onClick={() => savePreferences(draft)}>
            Save Preferences
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {COOKIE_CATEGORIES.map((category) => {
          const locked = category.id === 'necessary';
          const labelId = `cookie-category-${category.id}`;
          return (
            <div key={category.id} className="flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <p id={labelId} className="text-sm font-semibold text-text">
                  {category.label}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-text-muted">
                  {category.description}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2 pt-0.5">
                {locked && <span className="text-xs text-text-subtle">Always on</span>}
                <ConsentSwitch
                  checked={draft[category.id]}
                  disabled={locked}
                  labelledBy={labelId}
                  onChange={(checked) =>
                    setDraft((previous) => ({ ...previous, [category.id]: checked }))
                  }
                />
              </div>
            </div>
          );
        })}
        <p className="border-t border-border-light pt-4 text-xs text-text-muted">
          Read the{' '}
          <Link
            href="/cookies"
            className="font-medium text-primary underline underline-offset-2 hover:text-primary-hover"
          >
            Cookie Policy
          </Link>{' '}
          for the full list of cookies and how long we keep them.
        </p>
      </div>
    </Modal>
  );
}

function ConsentSwitch({
  checked,
  disabled,
  labelledBy,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  labelledBy: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        checked ? 'bg-primary' : 'bg-border dark:bg-white/25',
        disabled && 'cursor-default opacity-60',
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition-transform',
          checked && 'translate-x-6',
        )}
      />
    </button>
  );
}
