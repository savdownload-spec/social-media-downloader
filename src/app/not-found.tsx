import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { ArrowRight, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <Container className="py-32 text-center">
      <div className="max-w-lg mx-auto">
        <p className="text-8xl md:text-9xl font-semibold tracking-tighter text-text/10 leading-none">
          404
        </p>
        <h1 className="mt-6 text-3xl md:text-4xl font-semibold tracking-tight">
          This page slipped away.
        </h1>
        <p className="mt-4 text-text-muted leading-relaxed">
          The link you followed may be broken, or the page has moved. Let's get you
          back to something useful.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
          <Link href="/">
            <Button size="lg">
              Back home <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/search">
            <Button size="lg" variant="outline">
              <Search className="w-4 h-4" /> Search
            </Button>
          </Link>
        </div>
      </div>
    </Container>
  );
}
