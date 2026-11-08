import { imageGuides } from './toolGuidesImage';
import { videoGuides } from './toolGuidesVideo';
import { pdfGuides } from './toolGuidesPdf';
import { aiGuides } from './toolGuidesAi';
import { seoGuides } from './toolGuidesSeo';
import { utilityGuides } from './toolGuidesUtility';
import { downloaderGuides } from './toolGuidesDownloaders';
import type { ToolGuide } from './toolGuide';

export const functionalToolGuides = {
  ...imageGuides,
  ...videoGuides,
  ...pdfGuides,
  ...aiGuides,
  ...seoGuides,
  ...utilityGuides,
};

export const toolGuides = { ...downloaderGuides, ...functionalToolGuides };

/** Adding a catalog page requires its complete editorial entry first. */
export type ToolPageSlug = keyof typeof toolGuides | 'youtube-video-downloader';

export function getToolGuide(slug: string): ToolGuide | undefined {
  return (toolGuides as Partial<Record<string, ToolGuide>>)[slug];
}

export function requireToolGuide(slug: string): ToolGuide {
  const guide = getToolGuide(slug);
  if (!guide) throw new Error(`Complete tool-page content is required for ${slug}.`);
  return guide;
}
