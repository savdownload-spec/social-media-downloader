'use client';

import { CopyButton } from '@/components/ui/CopyButton';

/**
 * Compact "Share this tool" button that copies the tool's URL to clipboard.
 * Placed in tool page headers for easy sharing.
 */
export function ShareButton({ url }: { url: string }) {
  return (
    <CopyButton
      value={url}
      variant="ghost"
      size="sm"
      successMessage="Link copied!"
      successDescription="Share it with anyone."
      showIcon
    >
      Share
    </CopyButton>
  );
}
