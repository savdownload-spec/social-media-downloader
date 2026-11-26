import { toolsBySlug } from '@/config/tools';
import { getFunctionalTool } from '@/config/functionalTools';
import { getToolPolicy } from '@/lib/downloaderPolicy';

/** Registry-level availability: true only when the slug maps to a working
 *  processor. Kept free of the guide content in catalog.ts so client bundles
 *  (ToolStatusProvider) can import it cheaply. */
export function isToolRegistered(slug: string): boolean {
  if (toolsBySlug.has(slug)) return getToolPolicy(slug).downloadPermitted;
  return !!getFunctionalTool(slug);
}
