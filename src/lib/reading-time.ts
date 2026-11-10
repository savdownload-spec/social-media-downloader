/**
 * Canonical reading-time calculation shared by both the public renderer and
 * the admin editor stats panel. Using a single source ensures the number
 * displayed while writing matches what gets persisted in readingTimeMinutes.
 */

/** Average adult silent reading speed in words per minute. */
export const READING_SPEED_WPM = 225;

/**
 * Estimates reading time for a string that may contain HTML or Markdown.
 *
 * - Strips HTML tags before counting words
 * - Adds ~12 seconds per image (`<img` tags)
 * - Adds ~15 seconds per code block (`<pre` or fenced ``` blocks)
 * - Returns minutes, ceiled, minimum 1
 */
export function calculateReadingTime(content: string): number {
  if (!content) return 1;

  // Count images and code blocks before stripping HTML
  const imgCount = (content.match(/<img[\s>]/gi) ?? []).length;
  const preCount = (content.match(/<pre[\s>]/gi) ?? []).length;
  // Also count fenced code blocks in markdown
  const fenceCount = (content.match(/^```/gm) ?? []).length;
  // Each fence pair = one block; unpaired fences count as half (round down)
  const mdCodeBlocks = Math.floor(fenceCount / 2);

  // Strip HTML tags
  const plainText = content
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

  const words = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;

  const readingSeconds = (words / READING_SPEED_WPM) * 60;
  const imageSeconds = imgCount * 12;
  const codeSeconds = (preCount + mdCodeBlocks) * 15;

  const totalMinutes = (readingSeconds + imageSeconds + codeSeconds) / 60;
  return Math.max(1, Math.ceil(totalMinutes));
}

/**
 * Returns `{ minutes, label }` — a convenience wrapper used by the admin
 * stats bar and the public normalizeDbPost() fallback.
 */
export function estimateReadingTime(
  text: string,
  options?: { images?: number; codeBlocks?: number },
): { minutes: number; label: string } {
  if (!text && !options) return { minutes: 1, label: '1 min read' };

  // If caller provides explicit counts (admin live stats path), skip regex
  if (options) {
    const words = text
      ? text.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length
      : 0;
    const readingSeconds = (words / READING_SPEED_WPM) * 60;
    const imageSeconds = (options.images ?? 0) * 12;
    const codeSeconds = (options.codeBlocks ?? 0) * 15;
    const minutes = Math.max(1, Math.ceil((readingSeconds + imageSeconds + codeSeconds) / 60));
    return { minutes, label: `${minutes} min read` };
  }

  const minutes = calculateReadingTime(text);
  return { minutes, label: `${minutes} min read` };
}
