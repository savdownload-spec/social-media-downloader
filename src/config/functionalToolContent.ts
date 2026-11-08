import { functionalToolGuides } from './toolGuides';

export type FunctionalToolContent = {
  howTo: { title: string; body: string }[];
  faq: { question: string; answer: string }[];
};

/** Workspace summaries and search use the same audited workflow and FAQs
 * as public pages, preventing a second, contradictory content inventory. */
export const functionalToolContent: Record<string, FunctionalToolContent> = Object.fromEntries(
  Object.entries(functionalToolGuides).map(([slug, guide]) => [slug, { howTo: guide.howTo, faq: guide.faq }]),
);
