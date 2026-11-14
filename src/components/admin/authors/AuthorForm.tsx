'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, ExternalLink, Loader2, Plus, Save, X } from 'lucide-react';
import { AuthorImageField } from '@/components/admin/authors/AuthorImageField';
import { SocialLinksEditor } from '@/components/admin/authors/SocialLinksEditor';
import { useToast } from '@/components/ui/Toast';
import {
  AUTHOR_SLUG_PATTERN,
  normalizeHttpUrl,
  slugifyAuthorName,
  validateSocialLinks,
  type AuthorSocialLink,
} from '@/lib/author-profile';
import type { AdminAuthorPayload } from '@/lib/author-admin';
import { cn } from '@/lib/utils';

const INPUT_CLASS =
  'w-full rounded-xl border border-border-light bg-white px-3.5 py-2.5 text-sm text-text placeholder:text-text-subtle transition-colors focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20';

type FormState = {
  name: string;
  slug: string;
  email: string;
  role: string;
  shortBio: string;
  extendedBio: string;
  profileImage: string | null;
  website: string;
  expertise: string[];
  socials: AuthorSocialLink[];
  published: boolean;
};

function stateFromPayload(author?: AdminAuthorPayload): FormState {
  return {
    name: author?.name ?? '',
    slug: author?.slug ?? '',
    email: author?.email ?? '',
    role: author?.role ?? 'Author',
    shortBio: author?.shortBio ?? '',
    extendedBio: author?.extendedBio ?? '',
    profileImage: author?.profileImage ?? null,
    website: author?.website ?? '',
    expertise: author?.expertise ?? [],
    socials: author?.socials ?? [],
    published: author?.published ?? true,
  };
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-[11px] font-medium text-rose-600">
      {message}
    </p>
  );
}

export function AuthorForm({
  mode,
  initial,
}: {
  mode: 'create' | 'edit';
  initial?: AdminAuthorPayload;
}) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState<FormState>(() => stateFromPayload(initial));
  const [slugTouched, setSlugTouched] = useState(mode === 'edit');
  const [originalSlug, setOriginalSlug] = useState(initial?.slug ?? '');
  const [expertiseDraft, setExpertiseDraft] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const handleNameChange = (value: string) => {
    setForm((previous) => ({
      ...previous,
      name: value,
      slug: slugTouched ? previous.slug : slugifyAuthorName(value),
    }));
  };

  const addExpertise = () => {
    const value = expertiseDraft.replace(/\s+/g, ' ').trim().slice(0, 60);
    if (!value) return;
    if (form.expertise.some((item) => item.toLowerCase() === value.toLowerCase())) {
      setExpertiseDraft('');
      return;
    }
    if (form.expertise.length >= 12) {
      setErrors((previous) => ({ ...previous, expertise: 'Add at most 12 expertise labels.' }));
      return;
    }
    setForm((previous) => ({ ...previous, expertise: [...previous.expertise, value] }));
    setExpertiseDraft('');
    setErrors((previous) => ({ ...previous, expertise: '' }));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = 'Enter at least 2 characters.';
    if (!form.slug.trim()) next.slug = 'Slug is required.';
    else if (!AUTHOR_SLUG_PATTERN.test(form.slug.trim())) {
      next.slug = 'Use lowercase letters, numbers, and single hyphens.';
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = 'Enter a valid email address.';
    }
    if (form.website.trim() && !normalizeHttpUrl(form.website)) {
      next.website = 'Enter a valid http(s) URL.';
    }
    const socialCheck = validateSocialLinks(form.socials);
    if (socialCheck.errors.length) next.socials = socialCheck.errors[0];
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaveError('');
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        email: form.email.trim() || null,
        role: form.role.trim() || 'Author',
        shortBio: form.shortBio.trim() || null,
        extendedBio: form.extendedBio.trim() || null,
        profileImage: form.profileImage,
        website: form.website.trim() || null,
        expertise: form.expertise,
        socials: form.socials,
        published: form.published,
      };

      const response = await fetch(
        mode === 'edit' ? `/api/admin/authors/${initial!.id}` : '/api/admin/authors',
        {
          method: mode === 'edit' ? 'PATCH' : 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) throw new Error(data?.error || 'Could not save the author profile.');

      const saved = data.data as AdminAuthorPayload;
      toast.success(
        mode === 'edit' ? 'Author updated' : 'Author created',
        mode === 'edit' ? 'Your changes are live on the public profile.' : `${saved.name} was added to the authors list.`,
      );

      if (mode === 'create') {
        router.push('/admin/authors');
        router.refresh();
      } else {
        setForm(stateFromPayload({ ...initial!, ...saved }));
        setOriginalSlug(saved.slug);
        setSaveError('');
        router.refresh();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save the author profile.';
      setSaveError(message);
      toast.error('Could not save author', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {saveError && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] font-medium text-rose-700">
          {saveError}
        </div>
      )}

      {initial?.isSample && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] leading-5 text-amber-800">
          <span className="font-semibold">Sample profile.</span> This fictional demo author is excluded from search engines and the sitemap.
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-border-light bg-white">
        <div className="border-b border-border-light px-5 py-3.5">
          <h2 className="text-sm font-semibold text-text">Profile details</h2>
          <p className="mt-0.5 text-[11px] text-text-muted">The identity shown across the authors directory, profile pages, and articles.</p>
        </div>
        <div className="space-y-5 px-5 py-5 md:px-6">
          <AuthorImageField
            value={form.profileImage}
            name={form.name}
            onChange={(url) => setField('profileImage', url)}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="author-name" className="mb-1.5 block text-xs font-medium text-text-muted">
                Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="author-name"
                type="text"
                value={form.name}
                onChange={(event) => handleNameChange(event.target.value)}
                maxLength={80}
                placeholder="e.g. Sarah Johnson"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? 'author-name-error' : undefined}
                className={cn(INPUT_CLASS, errors.name && 'border-rose-300 focus:border-rose-400 focus:ring-rose-100')}
              />
              <FieldError id="author-name-error" message={errors.name} />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label htmlFor="author-slug" className="block text-xs font-medium text-text-muted">
                  Slug <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setField('slug', slugifyAuthorName(form.name));
                    setSlugTouched(false);
                  }}
                  className="text-[11px] font-medium text-primary hover:text-primary-hover"
                >
                  Use name
                </button>
              </div>
              <input
                id="author-slug"
                type="text"
                value={form.slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  setField('slug', event.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-'));
                }}
                maxLength={80}
                placeholder="sarah-johnson"
                aria-invalid={Boolean(errors.slug)}
                aria-describedby={errors.slug ? 'author-slug-error' : 'author-slug-hint'}
                className={cn(INPUT_CLASS, 'font-mono', errors.slug && 'border-rose-300 focus:border-rose-400 focus:ring-rose-100')}
              />
              <FieldError id="author-slug-error" message={errors.slug} />
              {!errors.slug && (
                <p id="author-slug-hint" className="mt-1 text-[11px] text-text-subtle">
                  Public URL: <span className="font-mono">/authors/{form.slug || '…'}</span>
                </p>
              )}
              {mode === 'edit' && originalSlug && form.slug !== originalSlug && (
                <p className="mt-1 text-[11px] text-amber-700">
                  A permanent redirect from <span className="font-mono">/authors/{originalSlug}</span> will be created.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="author-email" className="mb-1.5 block text-xs font-medium text-text-muted">
                Email <span className="font-normal text-text-subtle">(admin only)</span>
              </label>
              <input
                id="author-email"
                type="email"
                value={form.email}
                onChange={(event) => setField('email', event.target.value)}
                maxLength={200}
                placeholder="name@example.com"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'author-email-error' : 'author-email-hint'}
                className={cn(INPUT_CLASS, errors.email && 'border-rose-300 focus:border-rose-400 focus:ring-rose-100')}
              />
              <FieldError id="author-email-error" message={errors.email} />
              {!errors.email && (
                <p id="author-email-hint" className="mt-1 text-[11px] text-text-subtle">
                  Never shown publicly or included in public API responses.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="author-role" className="mb-1.5 block text-xs font-medium text-text-muted">
                Title / role
              </label>
              <input
                id="author-role"
                type="text"
                value={form.role}
                onChange={(event) => setField('role', event.target.value)}
                maxLength={80}
                placeholder="e.g. Content Strategist"
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label htmlFor="author-short-bio" className="block text-xs font-medium text-text-muted">
                Short bio
              </label>
              <span className="text-[10px] text-text-subtle">{form.shortBio.length}/300</span>
            </div>
            <textarea
              id="author-short-bio"
              value={form.shortBio}
              onChange={(event) => setField('shortBio', event.target.value)}
              maxLength={300}
              rows={3}
              placeholder="One or two sentences shown on author cards and article bylines."
              className={cn(INPUT_CLASS, 'resize-y leading-6')}
            />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border-light bg-white">
        <div className="border-b border-border-light px-5 py-3.5">
          <h2 className="text-sm font-semibold text-text">Biography</h2>
          <p className="mt-0.5 text-[11px] text-text-muted">Full introduction shown in the About section of the public profile.</p>
        </div>
        <div className="px-5 py-5 md:px-6">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label htmlFor="author-extended-bio" className="block text-xs font-medium text-text-muted">
              Extended bio
            </label>
            <span className="text-[10px] text-text-subtle">{form.extendedBio.length}/20,000</span>
          </div>
          <textarea
            id="author-extended-bio"
            value={form.extendedBio}
            onChange={(event) => setField('extendedBio', event.target.value)}
            maxLength={20000}
            rows={9}
            placeholder="Describe the author's background, experience, and the topics they cover. Separate paragraphs with a blank line."
            className={cn(INPUT_CLASS, 'resize-y leading-6')}
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border-light bg-white">
        <div className="border-b border-border-light px-5 py-3.5">
          <h2 className="text-sm font-semibold text-text">Expertise</h2>
          <p className="mt-0.5 text-[11px] text-text-muted">Short labels used for the directory filter and profile chips.</p>
        </div>
        <div className="px-5 py-5 md:px-6">
          {form.expertise.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {form.expertise.map((item) => (
                <li
                  key={item}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border-light bg-surface px-3 py-1.5 text-[12px] font-medium text-text"
                >
                  {item}
                  <button
                    type="button"
                    onClick={() => setField('expertise', form.expertise.filter((entry) => entry !== item))}
                    aria-label={`Remove ${item}`}
                    className="text-text-subtle transition-colors hover:text-rose-600"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex gap-2">
            <label className="sr-only" htmlFor="author-expertise-input">
              Add an expertise label
            </label>
            <input
              id="author-expertise-input"
              type="text"
              value={expertiseDraft}
              onChange={(event) => setExpertiseDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ',') {
                  event.preventDefault();
                  addExpertise();
                }
              }}
              maxLength={60}
              placeholder="e.g. Video technology"
              aria-describedby="author-expertise-hint"
              className={cn(INPUT_CLASS, 'flex-1')}
            />
            <button
              type="button"
              onClick={addExpertise}
              disabled={!expertiseDraft.trim() || form.expertise.length >= 12}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border-light bg-white px-4 text-sm font-medium text-text transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add
            </button>
          </div>
          <p id="author-expertise-hint" className="mt-2 text-[11px] text-text-subtle">
            Press Enter to add. Up to 12 labels, 60 characters each.
          </p>
          <FieldError id="author-expertise-error" message={errors.expertise} />
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border-light bg-white">
        <div className="border-b border-border-light px-5 py-3.5">
          <h2 className="text-sm font-semibold text-text">Web and social</h2>
          <p className="mt-0.5 text-[11px] text-text-muted">Every link is optional. Empty or invalid links are never rendered publicly.</p>
        </div>
        <div className="space-y-5 px-5 py-5 md:px-6">
          <div>
            <label htmlFor="author-website" className="mb-1.5 block text-xs font-medium text-text-muted">
              Website
            </label>
            <input
              id="author-website"
              type="url"
              value={form.website}
              onChange={(event) => setField('website', event.target.value)}
              maxLength={2048}
              placeholder="https://example.com"
              aria-invalid={Boolean(errors.website)}
              aria-describedby={errors.website ? 'author-website-error' : 'author-website-hint'}
              className={cn(INPUT_CLASS, errors.website && 'border-rose-300 focus:border-rose-400 focus:ring-rose-100')}
            />
            <FieldError id="author-website-error" message={errors.website} />
            {!errors.website && (
              <p id="author-website-hint" className="mt-1 text-[11px] text-text-subtle">
                Optional personal or portfolio site. Must start with http:// or https://.
              </p>
            )}
          </div>

          <div className="border-t border-border-light pt-5">
            <SocialLinksEditor value={form.socials} onChange={(links) => setField('socials', links)} />
            <FieldError id="author-socials-error" message={errors.socials} />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border-light bg-white">
        <div className="border-b border-border-light px-5 py-3.5">
          <h2 className="text-sm font-semibold text-text">Visibility</h2>
          <p className="mt-0.5 text-[11px] text-text-muted">Drafts are hidden from the directory, profile pages, article bylines, and the sitemap.</p>
        </div>
        <div className="px-5 py-5 md:px-6">
          <fieldset>
            <legend className="sr-only">Author status</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                {
                  value: true,
                  title: 'Published',
                  description: 'Visible in the authors directory, on profile pages, and in search results.',
                },
                {
                  value: false,
                  title: 'Draft',
                  description: 'Hidden from the public site while you prepare the profile.',
                },
              ].map((option) => (
                <label
                  key={option.title}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors focus-within:ring-2 focus-within:ring-primary/30',
                    form.published === option.value
                      ? 'border-primary/40 bg-primary/[0.04]'
                      : 'border-border-light hover:bg-surface/70',
                  )}
                >
                  <input
                    type="radio"
                    name="author-status"
                    checked={form.published === option.value}
                    onChange={() => setField('published', option.value)}
                    className="mt-0.5 h-4 w-4 shrink-0"
                  />
                  <span>
                    <span className="flex items-center gap-1.5 text-[13px] font-semibold text-text">
                      {option.title}
                      {form.published === option.value && <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-5 text-text-muted">{option.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </section>

      <div className="flex flex-col gap-3 rounded-xl border border-border-light bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] leading-5 text-text-muted">
          {mode === 'edit'
            ? 'Slug changes create permanent redirects. Published changes appear on the site immediately.'
            : 'Create the profile as a draft if you are not ready to publish it.'}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {mode === 'edit' && form.published && (
            <Link
              href={`/authors/${form.slug || originalSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[12px] font-medium text-text-muted transition-colors hover:bg-surface hover:text-text"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              View profile
            </Link>
          )}
          <Link
            href="/admin/authors"
            className="inline-flex h-9 items-center rounded-lg border border-border-light px-4 text-[12px] font-medium text-text transition-colors hover:bg-surface"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Save className="h-3.5 w-3.5" aria-hidden="true" />}
            {saving ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Create author'}
          </button>
        </div>
      </div>
    </form>
  );
}
