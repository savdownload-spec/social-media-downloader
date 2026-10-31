/**
 * Centralized image-tool limits shared between the batch API route and the
 * frontend component.  Mirrors the same pattern as pdfConfig.ts.
 */

/** Maximum size for a single uploaded image (25 MB — matches imageService MAX_INPUT_BYTES). */
export const IMAGE_MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

/** Maximum combined size of all images in one batch request. */
export const IMAGE_MAX_BATCH_BYTES = 100 * 1024 * 1024; // 100 MB

/** Protect libvips and serverless memory from decompression-bomb dimensions. */
export const IMAGE_MAX_PIXELS = 50_000_000;

export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,image/avif';

/** MIME types accepted by the image compressor. */
export const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'image/avif',
]);

export function isAllowedImageType(type: string): boolean {
  return ALLOWED_IMAGE_TYPES.has(type.toLowerCase());
}
