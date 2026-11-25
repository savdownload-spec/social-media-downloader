import { Zap, Lock, Sparkles } from 'lucide-react';

/** The 3 generic value props shown for every downloader tool — shared
 *  by the public ToolPageView hero and the Workspace tool page's Key Features.
 *  Keep these aligned with what the delivery routes actually do: media is
 *  streamed from temp files that are deleted, while account operation records
 *  are retained (see each page's "Processing and privacy" section). */
export const downloaderPerks = [
  { icon: Zap, title: 'Blazing Fast', body: 'Fast link analysis and delivery.' },
  { icon: Lock, title: 'Private by Design', body: 'Your files are delivered transiently and never shared.' },
  { icon: Sparkles, title: 'No Watermarks', body: 'Clean, original media output.' },
];
