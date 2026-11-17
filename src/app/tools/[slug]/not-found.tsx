import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function ToolNotFound() {
  return (
    <div className="mx-auto max-w-lg px-6 py-32 text-center">
      <p className="text-8xl md:text-9xl font-semibold tracking-tighter text-text/10 leading-none">
        404
      </p>
      <h1 className="mt-6 text-3xl md:text-4xl font-semibold tracking-tight">
        This tool doesn&apos;t exist (yet).
      </h1>
      <p className="mt-4 text-text-muted leading-relaxed">
        The tool you&apos;re looking for may have moved, been renamed, or not be available on this deployment.
      </p>
      <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
        <Link
          href="/tools"
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-semibold text-white bg-gradient-brand shadow-glow-lg transition-all active:scale-[0.98]"
        >
          Browse All Tools <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
