'use client';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Clipboard, Download, Link2 } from 'lucide-react';
import { tools, toolsBySlug } from '@/config/tools';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const priority = ['youtube-shorts-downloader','youtube-video-downloader','tiktok-photo-downloader','tiktok-video-downloader','instagram-reels-downloader','instagram-story-downloader','instagram-photo-downloader','facebook-reels-downloader','facebook-video-downloader','pinterest-image-downloader','pinterest-video-downloader','x-gif-downloader','x-video-downloader','youtube-thumbnail-downloader','tiktok-thumbnail-downloader','youtube-to-mp3','tiktok-to-mp3'];
function matches(slug: string, value: string) { const tool = toolsBySlug.get(slug); if (!tool) return false; return new RegExp(tool.urlPattern.source, tool.urlPattern.flags.replace('g','')).test(value); }
function resolveTool(value: string) {
  let url: URL; try { url = new URL(value); } catch { return undefined; }
  const host = url.hostname.toLowerCase().replace(/^www\./,''); const path = url.pathname.toLowerCase();
  const explicit = host === 'youtube.com' && path.includes('/shorts/') ? 'youtube-shorts-downloader' : host === 'instagram.com' && (path.includes('/reel/') || path.includes('/reels/')) ? 'instagram-reels-downloader' : host === 'instagram.com' && path.includes('/stories/') ? 'instagram-story-downloader' : host === 'tiktok.com' && path.includes('/photo/') ? 'tiktok-photo-downloader' : host === 'facebook.com' && path.includes('/reel') ? 'facebook-reels-downloader' : host === 'x.com' || host === 'twitter.com' ? 'x-video-downloader' : undefined;
  if (explicit && matches(explicit,value)) return toolsBySlug.get(explicit);
  return priority.map((slug) => toolsBySlug.get(slug)).find((tool) => tool && matches(tool.slug,value)) ?? tools.find((tool) => matches(tool.slug,value));
}
export function UniversalUrlInput() {
  const router = useRouter(); const [value,setValue] = useState(''); const [error,setError] = useState(''); const [pasting,setPasting] = useState(false);
  const submit = (event?: FormEvent) => { event?.preventDefault(); const valueToRoute=value.trim(); if (!valueToRoute) return setError('Paste a link to get started.'); const tool=resolveTool(valueToRoute); if (!tool) return setError('That link is not supported yet. Try a public video, image, audio, reel, or thumbnail URL.'); setError(''); router.push(`/tools/${tool.slug}?url=${encodeURIComponent(valueToRoute)}`); };
  const paste = async () => { if (!navigator.clipboard) return; setPasting(true); try { setValue(await navigator.clipboard.readText()); setError(''); } catch { setError('Clipboard access was blocked. Paste your link into the field instead.'); } finally { setPasting(false); } };
  return <div className="mt-8 w-full max-w-3xl mx-auto text-left"><form onSubmit={submit} className="gradient-ring rounded-[26px] shadow-soft-xl"><div className="p-2 bg-white rounded-[25px] flex flex-col sm:flex-row gap-2"><div className="relative flex-1 min-w-0"><Link2 className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-subtle" aria-hidden="true"/><Input value={value} onChange={(event)=>{setValue(event.target.value);setError('');}} placeholder="Paste any video, image, audio, or social media link..." aria-label="Universal media URL" className="h-14 border-0 pl-12 pr-20 text-base shadow-none focus:border-0 focus:shadow-none"/><button type="button" onClick={paste} disabled={pasting} className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-text-muted transition-colors hover:bg-primary-light hover:text-primary disabled:opacity-50" aria-label="Paste from clipboard"><Clipboard className="h-4 w-4"/><span className="hidden md:inline">Paste</span></button></div><Button type="submit" size="lg" className="h-14 shrink-0 px-6 sm:min-w-[138px]">Go <Download className="h-4 w-4"/></Button></div></form>{error&&<p role="alert" className="mt-3 flex items-center gap-2 px-2 text-sm font-medium text-red-600"><AlertCircle className="h-4 w-4 shrink-0"/>{error}</p>}</div>;
}
