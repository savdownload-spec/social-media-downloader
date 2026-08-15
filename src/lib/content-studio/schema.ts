import { siteConfig } from '@/config/site';
import { faqSchema } from '@/lib/seo';

export type FaqItem = { question: string; answer: string };
export type HowToStep = { title: string; description: string; image?: string };

function absoluteUrl(value: string) {
  return value.startsWith('http') ? value : `${siteConfig.url}${value}`;
}

/**
 * FAQ/HowTo schema only gets emitted when the writer actually filled in
 * blocks — never generated speculatively, so it never misrepresents content
 * that isn't really an FAQ or a how-to guide.
 */
export function buildFaqSchema(items: FaqItem[]) {
  const valid = items.filter((i) => i.question.trim() && i.answer.trim());
  if (valid.length === 0) return null;
  return faqSchema(valid);
}

export function buildHowToSchema(name: string, steps: HowToStep[]) {
  const valid = steps.filter((s) => s.title.trim());
  if (valid.length === 0) return null;
  return {
    '@type': 'HowTo',
    name,
    step: valid.map((s) => ({
      '@type': 'HowToStep',
      name: s.title,
      text: s.description || undefined,
      image: s.image ? absoluteUrl(s.image) : undefined,
    })),
  };
}
