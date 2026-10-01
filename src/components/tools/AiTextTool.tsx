'use client';
/**
 * AI Text Generation Tools — one component, four slugs:
 *   ai-youtube-title-generator
 *   ai-description-generator
 *   ai-hashtag-generator
 *   ai-caption-generator
 *
 * Calls POST /api/tools/ai-text (Cloudflare Workers AI, llama-3.1-8b-instruct).
 * 1 SavCredit per generation. Rate-limited server-side.
 */
import { useState } from 'react';
import { Copy, Check, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import type { FunctionalToolProps } from '@/config/functionalTools';

/* ── Per-slug metadata ────────────────────────────────────────── */

type ToolMeta = {
  name: string;
  topicLabel: string;
  topicPlaceholder: string;
  contextLabel?: string;
  contextPlaceholder?: string;
  showTone?: boolean;
  resultLabel: string;
  resultFormat: 'list' | 'hashtags';
};

const TOOL_META: Record<string, ToolMeta> = {
  'ai-youtube-title-generator': {
    name: 'AI YouTube Title Generator',
    topicLabel: 'Video Topic',
    topicPlaceholder: 'e.g. How to start a YouTube channel in 2025',
    contextLabel: 'Target Audience (optional)',
    contextPlaceholder: 'e.g. beginners, creators, students',
    showTone: true,
    resultLabel: 'Generated Titles',
    resultFormat: 'list',
  },
  'ai-description-generator': {
    name: 'AI Description Generator',
    topicLabel: 'Video / Post Topic',
    topicPlaceholder: 'e.g. A tutorial on making sourdough bread',
    contextLabel: 'Key Points (optional)',
    contextPlaceholder: 'e.g. no experience needed, quick recipe, cost-effective',
    showTone: true,
    resultLabel: 'Generated Descriptions',
    resultFormat: 'list',
  },
  'ai-hashtag-generator': {
    name: 'AI Hashtag Generator',
    topicLabel: 'Topic or Niche',
    topicPlaceholder: 'e.g. fitness motivation gym workout',
    contextLabel: 'Platform (optional)',
    contextPlaceholder: 'e.g. Instagram, TikTok, LinkedIn',
    showTone: false,
    resultLabel: 'Generated Hashtags',
    resultFormat: 'hashtags',
  },
  'ai-caption-generator': {
    name: 'AI Caption Generator',
    topicLabel: 'Post Topic or Description',
    topicPlaceholder: 'e.g. A sunset photo from a mountain hike',
    contextLabel: 'Platform (optional)',
    contextPlaceholder: 'e.g. Instagram, TikTok, LinkedIn',
    showTone: true,
    resultLabel: 'Generated Captions',
    resultFormat: 'list',
  },
};

const TONES = ['professional', 'casual', 'funny', 'inspiring'] as const;
type Tone = typeof TONES[number];

/* ── Shared copy button ────────────────────────────────────────── */

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      aria-label="Copy"
      className="shrink-0 grid h-8 w-8 place-items-center rounded-lg text-text-muted transition-colors hover:bg-primary-light hover:text-primary"
    >
      {copied ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

/* ── Main component ────────────────────────────────────────────── */

export function AiTextTool({ slug }: FunctionalToolProps) {
  const meta = TOOL_META[slug];
  const { error: showError } = useToast();

  const [topic, setTopic] = useState('');
  const [context, setContext] = useState('');
  const [tone, setTone] = useState<Tone>('professional');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  if (!meta) return null;

  async function generate() {
    if (!topic.trim() || loading) return;
    setLoading(true);
    setErrorMsg('');
    setResults([]);
    try {
      const res = await fetch('/api/tools/ai-text', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug, topic: topic.trim(), context: context.trim(), tone }),
      });
      const data = await res.json() as { ok: boolean; results?: string[]; error?: string };
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error ?? 'Generation failed. Please try again.');
        return;
      }
      setResults(data.results ?? []);
    } catch {
      setErrorMsg('Network error. Please check your connection and try again.');
      showError('Generation failed', 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const copyAll = () => {
    const text = meta.resultFormat === 'hashtags'
      ? results.map(t => `#${t}`).join(' ')
      : results.join('\n\n');
    void navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6">
      {/* Input */}
      <div className="rounded-2xl border border-border bg-white dark:bg-card p-6 space-y-4 shadow-soft">
        {/* Topic */}
        <div>
          <label className="block text-sm font-semibold text-text mb-1.5">
            {meta.topicLabel}
          </label>
          <textarea
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder={meta.topicPlaceholder}
            rows={2}
            maxLength={300}
            className="w-full resize-none rounded-xl border border-border bg-white dark:bg-card px-4 py-3 text-sm text-text placeholder:text-text-subtle focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-colors"
          />
        </div>

        {/* Optional context */}
        {meta.contextLabel && (
          <div>
            <label className="block text-sm font-semibold text-text mb-1.5">
              {meta.contextLabel}
            </label>
            <input
              value={context}
              onChange={e => setContext(e.target.value)}
              placeholder={meta.contextPlaceholder}
              maxLength={300}
              className="w-full h-11 rounded-xl border border-border bg-white dark:bg-card px-4 text-sm text-text placeholder:text-text-subtle focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-colors"
            />
          </div>
        )}

        {/* Tone selector */}
        {meta.showTone && (
          <div>
            <label className="block text-sm font-semibold text-text mb-1.5">Tone</label>
            <div className="flex flex-wrap gap-2">
              {TONES.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTone(t)}
                  className={`rounded-xl px-4 py-2 text-sm font-medium capitalize transition-colors ${
                    tone === t
                      ? 'bg-primary text-white shadow-soft'
                      : 'bg-surface border border-border text-text-muted hover:border-primary/30 hover:text-text'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Generate button */}
        <button
          type="button"
          onClick={() => { void generate(); }}
          disabled={!topic.trim() || loading}
          className="inline-flex items-center gap-2 rounded-2xl bg-gradient-brand bg-[length:200%_200%] px-7 py-3.5 text-base font-semibold text-white shadow-glow-lg transition-all hover:bg-[position:100%_50%] disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]"
        >
          {loading
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
            : <><Sparkles className="h-4 w-4" /> Generate</>
          }
        </button>

        <p className="text-[11px] text-text-subtle">1 SavCredit per generation</p>
      </div>

      {/* Error */}
      {errorMsg && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 dark:bg-rose-500/10 dark:border-rose-500/20 p-4">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-rose-600 dark:text-rose-400" />
          <p className="text-sm text-rose-700 dark:text-rose-400">{errorMsg}</p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="rounded-2xl border border-border bg-white dark:bg-card p-6 shadow-soft space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-text">{meta.resultLabel}</h3>
            <button
              type="button"
              onClick={copyAll}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border-light px-3 py-1.5 text-xs font-semibold text-text-muted transition-colors hover:border-primary/30 hover:text-primary"
            >
              <Copy className="h-3.5 w-3.5" /> Copy All
            </button>
          </div>

          {meta.resultFormat === 'hashtags' ? (
            /* Hashtag chips */
            <div className="flex flex-wrap gap-2">
              {results.map((tag, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { void navigator.clipboard.writeText(`#${tag}`); }}
                  title="Click to copy"
                  className="rounded-xl bg-primary-light px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
                >
                  #{tag}
                </button>
              ))}
            </div>
          ) : (
            /* List items */
            <div className="space-y-2">
              {results.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-xl border border-border-light bg-surface/60 px-4 py-3"
                >
                  <span className="mt-0.5 shrink-0 text-xs font-bold text-text-subtle">{i + 1}</span>
                  <p className="flex-1 text-sm text-text leading-relaxed">{item}</p>
                  <CopyBtn text={item} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
