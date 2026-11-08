import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { catalog, getCatalogTool } from '@/config/catalog';
import { getToolGuide } from '@/config/toolGuides';
import { Section, SectionHeading } from '@/components/layout/Section';
import { getToolPageStatuses, isLiveToolPage } from '@/lib/toolPageAvailability';

/** Resolve availability on the server so recommendations never knowingly
 * advertise a disabled or unimplemented processor as ready to use. */
export async function RelatedToolSection({ slug }: { slug: string }) {
  const tool = getCatalogTool(slug);
  if (!tool) return null;
  const statuses = await getToolPageStatuses();
  const preferred = slug === 'youtube-video-downloader'
    ? ['youtube-shorts-downloader', 'youtube-thumbnail-downloader', 'youtube-to-mp3']
    : getToolGuide(slug)?.related ?? [];
  const candidates = [...preferred, ...catalog.filter((entry) => entry.group === tool.group).map((entry) => entry.slug)];
  const related = [...new Set(candidates)]
    .filter((candidate) => candidate !== slug && isLiveToolPage(candidate, statuses))
    .map((candidate) => getCatalogTool(candidate))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .slice(0, slug === 'youtube-video-downloader' ? 3 : 6);
  if (!related.length) return null;

  return <Section id="related-tools" className="scroll-mt-28" variant="default">
    <SectionHeading
      eyebrow={`More ${tool.group === 'Downloaders' ? 'downloaders' : `${tool.group.toLowerCase()} tools`}`}
      title={<>Try <span className="text-gradient">Another Tool.</span></>}
      description="Continue with a related tool. Review its supported inputs, availability and usage requirements before processing."
    />
    <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {related.map((entry) => {
        const Icon = entry.icon;
        return <Link key={entry.slug} href={`/tools/${entry.slug}`} className="group flex flex-col h-full bg-white dark:bg-card border border-border rounded-2xl p-7 shadow-soft hover:shadow-soft-lg hover:-translate-y-1 hover:border-primary/30 transition-all duration-300">
          <div className="flex items-start justify-between">
            <span className={`w-12 h-12 rounded-xl ${entry.tile} flex items-center justify-center group-hover:scale-105 transition-transform`}><Icon className="w-6 h-6" /></span>
            <ChevronRight className="w-5 h-5 text-text-subtle opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
          </div>
          <h3 className="mt-5 font-bold text-text group-hover:text-primary transition-colors">{entry.name}</h3>
          <p className="mt-2 text-sm text-text-muted leading-relaxed">{getToolGuide(entry.slug)?.description ?? entry.description}</p>
        </Link>;
      })}
    </div>
  </Section>;
}
