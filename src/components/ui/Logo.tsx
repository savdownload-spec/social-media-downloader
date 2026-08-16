import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const ASPECT_RATIO = 500 / 88;

type LogoProps = {
  /** 'dark' renders on the header's default surface, which itself adapts
   *  with the site theme — so this variant swaps the wordmark (black/white)
   *  via CSS to match, with no theme state needed from the caller.
   *  'light' forces the white wordmark regardless of site theme (e.g. the
   *  footer, whose background is always dark). */
  variant?: 'dark' | 'light';
  height?: number;
  className?: string;
  /** Wrap in a link to home. Set false when the parent already provides one. */
  linked?: boolean;
};

export function Logo({ variant = 'dark', height = 32, className, linked = true }: LogoProps) {
  const width = Math.round(height * ASPECT_RATIO);
  const style = { height, width: 'auto' } as const;

  const img =
    variant === 'light' ? (
      <Image
        src="/logo-white.png"
        alt="SavDown"
        width={width}
        height={height}
        priority
        className={cn('w-auto', className)}
        style={style}
      />
    ) : (
      <span className="inline-flex">
        <Image
          src="/logo-black.png"
          alt="SavDown"
          width={width}
          height={height}
          priority
          className={cn('w-auto block dark:hidden', className)}
          style={style}
        />
        <Image
          src="/logo-white.png"
          alt="SavDown"
          width={width}
          height={height}
          priority
          className={cn('w-auto hidden dark:block', className)}
          style={style}
        />
      </span>
    );

  if (!linked) return img;

  return (
    <Link href="/" className="flex items-center" aria-label="SavDown home">
      {img}
    </Link>
  );
}
