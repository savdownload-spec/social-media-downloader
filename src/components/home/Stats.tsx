import { Container } from '@/components/layout/Container';
import { Star } from 'lucide-react';

const stats = [
  { value: '2M+', label: 'Downloads served' },
  { value: '6', label: 'Platforms supported' },
  { value: '8', label: 'Specialized tools' },
  { value: '100%', label: 'Free, no signup' },
];

export function Stats() {
  return (
    <section className="pb-4">
      <Container>
        <div className="rounded-3xl border border-border bg-white shadow-soft-lg px-6 py-8 md:px-10 md:py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold tracking-tight text-gradient">
                  {s.value}
                </div>
                <div className="mt-1.5 text-sm text-text-muted">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-8 pt-6 border-t border-border-light flex flex-col sm:flex-row items-center justify-center gap-3 text-sm text-text-muted">
            <div className="flex items-center gap-0.5 text-amber-400">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-current" />
              ))}
            </div>
            <span>
              Rated <span className="font-semibold text-text">4.9 / 5</span> by creators who value clean, fast tools.
            </span>
          </div>
        </div>
      </Container>
    </section>
  );
}
