'use client';
/**
 * SEO Tools, 100% client-side, local template/algorithmic generation.
 * One component serves all five SEO-generator slugs; the `slug` prop
 * selects which generator and input layout to render. No backend required.
 */
import { useState, useCallback } from 'react';
import { Copy, Check, Sparkles } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import type { FunctionalToolProps } from '@/config/functionalTools';
import {
  generateMetaTitles,
  generateMetaDescriptions,
  generateYoutubeTags,
  generateKeywords,
  generateSchema,
  SCHEMA_FIELDS,
  type SchemaType,
  type KeywordGroup,
} from '@/lib/seo/seoGenerators';

function CopyRow({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [text]);
  return (
    <button
      onClick={copy}
      className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-surface hover:bg-primary-light/40 border border-border transition-colors text-left"
    >
      <span className="text-sm text-text">{text}</span>
      {copied ? <Check className="w-4 h-4 text-accent shrink-0" /> : <Copy className="w-4 h-4 text-text-muted shrink-0" />}
    </button>
  );
}

function TextInput({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 rounded-xl border border-border bg-white px-4 text-sm text-text placeholder:text-text-subtle focus:border-primary/40 focus:outline-none transition-colors"
      />
    </div>
  );
}

function GenerateButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-brand bg-[length:200%_200%] text-white text-base font-semibold shadow-glow-lg hover:bg-[position:100%_50%] disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
    >
      <Sparkles className="w-4 h-4" /> Generate
    </button>
  );
}

export function SeoTool({ slug }: FunctionalToolProps) {
  const { success } = useToast();

  /* ── Meta Title Generator ── */
  const [titleTopic, setTitleTopic] = useState('');
  const [titleBrand, setTitleBrand] = useState('');
  const [titles, setTitles] = useState<string[]>([]);

  /* ── Meta Description Generator ── */
  const [descTopic, setDescTopic] = useState('');
  const [descCta, setDescCta] = useState('');
  const [descriptions, setDescriptions] = useState<string[]>([]);

  /* ── YouTube Tags Generator ── */
  const [videoTitle, setVideoTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  /* ── Keyword Generator ── */
  const [keywordSeed, setKeywordSeed] = useState('');
  const [keywordGroups, setKeywordGroups] = useState<KeywordGroup[]>([]);

  /* ── Schema Generator ── */
  const [schemaType, setSchemaType] = useState<SchemaType>('Article');
  const [schemaFields, setSchemaFields] = useState<Record<string, string>>({});
  const [schemaJson, setSchemaJson] = useState('');

  if (slug === 'meta-title-generator') {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-6">
        <div className="p-6 rounded-2xl border border-border bg-white shadow-soft space-y-4">
          <TextInput label="Page Topic" placeholder="e.g. sourdough bread recipe" value={titleTopic} onChange={setTitleTopic} />
          <TextInput label="Brand Name (optional)" placeholder="e.g. SavDown" value={titleBrand} onChange={setTitleBrand} />
          <GenerateButton disabled={!titleTopic.trim()} onClick={() => setTitles(generateMetaTitles(titleTopic, titleBrand))} />
        </div>
        {titles.length > 0 && (
          <div className="space-y-2">
            {titles.map((t, i) => <CopyRow key={i} text={t} />)}
          </div>
        )}
      </div>
    );
  }

  if (slug === 'meta-description-generator') {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-6">
        <div className="p-6 rounded-2xl border border-border bg-white shadow-soft space-y-4">
          <TextInput label="Page Topic" placeholder="e.g. sourdough bread recipe" value={descTopic} onChange={setDescTopic} />
          <TextInput label="Call To Action (optional)" placeholder="e.g. Get the recipe now." value={descCta} onChange={setDescCta} />
          <GenerateButton disabled={!descTopic.trim()} onClick={() => setDescriptions(generateMetaDescriptions(descTopic, descCta))} />
        </div>
        {descriptions.length > 0 && (
          <div className="space-y-2">
            {descriptions.map((d, i) => <CopyRow key={i} text={d} />)}
          </div>
        )}
      </div>
    );
  }

  if (slug === 'youtube-tags-generator') {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-6">
        <div className="p-6 rounded-2xl border border-border bg-white shadow-soft space-y-4">
          <TextInput label="Video Title" placeholder="e.g. How To Bake Sourdough Bread" value={videoTitle} onChange={setVideoTitle} />
          <GenerateButton disabled={!videoTitle.trim()} onClick={() => setTags(generateYoutubeTags(videoTitle))} />
        </div>
        {tags.length > 0 && (
          <div className="p-6 rounded-2xl border border-border bg-white shadow-soft">
            <div className="flex flex-wrap gap-2 mb-4">
              {tags.map((t, i) => (
                <span key={i} className="px-3 py-1.5 rounded-full bg-primary-light/40 text-xs font-medium text-text">{t}</span>
              ))}
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(tags.join(', ')); success('Copied!', 'All tags copied to clipboard.'); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-white text-sm font-semibold text-text hover:border-primary/40 transition-colors"
            >
              <Copy className="w-4 h-4" /> Copy All Tags
            </button>
          </div>
        )}
      </div>
    );
  }

  if (slug === 'keyword-generator') {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-6">
        <div className="p-6 rounded-2xl border border-border bg-white shadow-soft space-y-4">
          <TextInput label="Seed Keyword" placeholder="e.g. sourdough bread" value={keywordSeed} onChange={setKeywordSeed} />
          <GenerateButton disabled={!keywordSeed.trim()} onClick={() => setKeywordGroups(generateKeywords(keywordSeed))} />
        </div>
        {keywordGroups.length > 0 && (
          <div className="space-y-4">
            {keywordGroups.map((group) => (
              <div key={group.intent} className="p-5 rounded-2xl border border-border bg-white shadow-soft">
                <p className="text-xs font-semibold text-text-subtle uppercase tracking-wider mb-3">{group.intent}</p>
                <div className="space-y-1.5">
                  {group.keywords.map((k, i) => <CopyRow key={i} text={k} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (slug === 'schema-generator') {
    const fieldDefs = SCHEMA_FIELDS[schemaType];
    return (
      <div className="w-full max-w-2xl mx-auto space-y-6">
        <div className="p-6 rounded-2xl border border-border bg-white shadow-soft space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5">Schema Type</label>
            <select
              value={schemaType}
              onChange={(e) => { setSchemaType(e.target.value as SchemaType); setSchemaFields({}); setSchemaJson(''); }}
              className="w-full h-11 rounded-xl border border-border bg-white px-4 text-sm text-text focus:border-primary/40 focus:outline-none transition-colors"
            >
              {Object.keys(SCHEMA_FIELDS).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {fieldDefs.map((f) => (
            <TextInput
              key={f.key}
              label={f.label}
              placeholder={f.placeholder}
              value={schemaFields[f.key] || ''}
              onChange={(v) => setSchemaFields((prev) => ({ ...prev, [f.key]: v }))}
            />
          ))}
          <GenerateButton disabled={false} onClick={() => setSchemaJson(generateSchema(schemaType, schemaFields))} />
        </div>
        {schemaJson && (
          <div className="p-6 rounded-2xl border border-border bg-white shadow-soft">
            <pre className="text-xs font-mono text-text overflow-x-auto whitespace-pre-wrap mb-4">{schemaJson}</pre>
            <button
              onClick={() => { navigator.clipboard.writeText(schemaJson); success('Copied!', 'Schema JSON-LD copied to clipboard.'); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-white text-sm font-semibold text-text hover:border-primary/40 transition-colors"
            >
              <Copy className="w-4 h-4" /> Copy JSON-LD
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
}
