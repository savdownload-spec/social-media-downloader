import { getPlatform, manualComposerHref, type PlatformId } from './platforms';

export type ManualContent = {
  title?: string | null;
  caption: string;
  hashtags?: string | null;
  linkUrl?: string | null;
};

export function composeManualText({ caption, hashtags, linkUrl }: ManualContent): string {
  const parts = [caption.trim()];
  const tags = (hashtags ?? '').trim();
  if (tags) parts.push(tags);
  const link = (linkUrl ?? '').trim();
  if (link) parts.push(link);
  return parts.filter(Boolean).join('\n\n');
}

export function toMarkdownPost(content: ManualContent): string {
  const lines: string[] = [];
  if (content.title?.trim()) lines.push(`## ${content.title.trim()}`, '');
  lines.push(content.caption.trim());
  if (content.hashtags?.trim()) lines.push('', content.hashtags.trim());
  if (content.linkUrl?.trim()) lines.push('', `[Read more](${content.linkUrl.trim()})`);
  return lines.join('\n');
}

/** Medium-style article export: title as H1, caption as body paragraphs. */
export function toMarkdownArticle(content: ManualContent): string {
  const lines: string[] = [];
  if (content.title?.trim()) lines.push(`# ${content.title.trim()}`, '');
  lines.push(content.caption.trim());
  if (content.hashtags?.trim()) lines.push('', content.hashtags.trim());
  if (content.linkUrl?.trim()) lines.push('', `[Read more](${content.linkUrl.trim()})`);
  return lines.join('\n');
}

export function buildManualChecklist(platform: PlatformId): string[] {
  const def = getPlatform(platform);
  const steps = [
    'Copy the prepared text (and export Markdown if needed).',
    'Open the official composer below and paste the content.',
    'Attach any media from the media library download links.',
    'Publish in the platform and copy the public post URL.',
    'Return here and confirm the URL — only then is the post marked published.',
  ];
  if (def?.id === 'REDDIT') {
    steps.splice(2, 0, 'Confirm the subreddit rules and flair requirements before posting.');
  }
  if (def?.id === 'QUORA') {
    steps.splice(2, 0, 'Open the specific question you are answering, not the generic composer.');
  }
  return steps;
}

export function manualHref(
  platform: PlatformId,
  content: ManualContent,
): string {
  return manualComposerHref(platform, {
    text: composeManualText(content),
    title: content.title,
    url: content.linkUrl,
  });
}

export function isPublishedUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}
