import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const ASPECT_RATIO = 500 / 88;

type LogoProps = {
  /** 'dark' renders the black wordmark (for light surfaces, e.g. the header).
   *  'light' renders the white wordmark (for dark surfaces, e.g. the footer). */
  variant?: 'dark' | 'light';
  height?: number;
  className?: string;
  /** Wrap in a link to home. Set false when the parent already provides one. */
  linked?: boolean;
};

export function Logo({ variant = 'dark', height = 32, className, linked = true }: LogoProps) {
  const src = variant === 'light' ? '/logo-white.png' : '/logo-black.png';
  const width = Math.round(height * ASPECT_RATIO);

  const img = (
    <Image
      src={src}
      alt="SavDown"
      width={width}
      height={height}
      priority
      className={cn('w-auto', className)}
      style={{ height, width: 'auto' }}
    />
  );

  if (!linked) return img;

  return (
    <Link href="/" className="flex items-center" aria-label="SavDown home">
      {img}
    </Link>
  );
}
