/**
 * Image processing service using Sharp (Apache-2.0).
 * Sharp is a high-performance Node.js image library backed by libvips.
 *
 * Architecture: API Route → imageService.ts → sharp
 */
import sharp, { type FitEnum } from 'sharp';

export type ImageOperation =
  | { op: 'compress';  quality?: number; format?: OutputFormat }
  | { op: 'resize';    width?: number; height?: number; fit?: keyof FitEnum }
  | { op: 'convert';   format: OutputFormat }
  | { op: 'enhance' }
  | { op: 'jpg-to-png' }
  | { op: 'png-to-jpg'; quality?: number }
  | { op: 'to-webp';   quality?: number }
  | { op: 'heic-to-jpg'; quality?: number };

export type OutputFormat = 'jpeg' | 'png' | 'webp' | 'gif' | 'avif';

export type ImageResult = {
  ok: true;
  buffer: Buffer;
  mimeType: string;
  extension: string;
  originalSize: number;
  outputSize: number;
  compressionRatio?: string;
};

export type ImageError = { ok: false; error: string };

const MAX_INPUT_BYTES = 25 * 1024 * 1024; // 25 MB

function mimeFor(fmt: string): string {
  const map: Record<string, string> = {
    jpeg: 'image/jpeg', jpg: 'image/jpeg', png: 'image/png',
    webp: 'image/webp', gif: 'image/gif', avif: 'image/avif',
  };
  return map[fmt] || 'image/jpeg';
}

function extFor(fmt: string): string {
  return fmt === 'jpeg' ? 'jpg' : fmt;
}

/**
 * Process an image buffer through the requested operation.
 */
export async function processImage(
  input: Buffer,
  operation: ImageOperation,
): Promise<ImageResult | ImageError> {
  if (input.length > MAX_INPUT_BYTES) {
    return { ok: false, error: `File too large. Maximum input size is 25 MB.` };
  }

  try {
    let pipeline = sharp(input, { failOn: 'none' });

    // Auto-rotate based on EXIF orientation
    pipeline = pipeline.rotate();

    let outputFormat: string = 'jpeg';
    let outputBuffer: Buffer;

    switch (operation.op) {
      case 'compress': {
        const fmt = operation.format ?? 'jpeg';
        const q = operation.quality ?? (fmt === 'png' ? undefined : 75);
        outputFormat = fmt;
        outputBuffer = await pipeline
          .toFormat(fmt as OutputFormat, q !== undefined ? { quality: q } : {})
          .toBuffer();
        break;
      }

      case 'resize': {
        const { width, height, fit = 'inside' } = operation;
        outputFormat = 'jpeg';
        outputBuffer = await pipeline
          .resize({
            width: width || undefined,
            height: height || undefined,
            fit: fit as keyof FitEnum,
            withoutEnlargement: true,
          })
          .jpeg({ quality: 85 })
          .toBuffer();
        break;
      }

      case 'convert': {
        outputFormat = operation.format;
        const q = ['jpeg', 'webp', 'avif'].includes(outputFormat) ? { quality: 85 } : {};
        outputBuffer = await pipeline
          .toFormat(outputFormat as OutputFormat, q)
          .toBuffer();
        break;
      }

      case 'enhance': {
        outputFormat = 'jpeg';
        outputBuffer = await pipeline
          .modulate({ brightness: 1.05, saturation: 1.1 })
          .sharpen({ sigma: 0.8 })
          .jpeg({ quality: 90 })
          .toBuffer();
        break;
      }

      case 'jpg-to-png': {
        outputFormat = 'png';
        outputBuffer = await pipeline.png({ compressionLevel: 8 }).toBuffer();
        break;
      }

      case 'png-to-jpg': {
        outputFormat = 'jpeg';
        outputBuffer = await pipeline
          .flatten({ background: '#ffffff' })
          .jpeg({ quality: operation.quality ?? 85 })
          .toBuffer();
        break;
      }

      case 'to-webp': {
        outputFormat = 'webp';
        outputBuffer = await pipeline
          .webp({ quality: operation.quality ?? 80 })
          .toBuffer();
        break;
      }

      case 'heic-to-jpg': {
        // sharp supports HEIC input natively via libvips on most platforms
        outputFormat = 'jpeg';
        outputBuffer = await pipeline
          .jpeg({ quality: operation.quality ?? 90 })
          .toBuffer();
        break;
      }

      default: {
        const _: never = operation;
        return { ok: false, error: 'Unknown operation.' };
      }
    }

    const ratio = input.length > 0
      ? `${(((input.length - outputBuffer.length) / input.length) * 100).toFixed(1)}%`
      : undefined;

    return {
      ok: true,
      buffer: outputBuffer,
      mimeType: mimeFor(outputFormat),
      extension: extFor(outputFormat),
      originalSize: input.length,
      outputSize: outputBuffer.length,
      compressionRatio: ratio,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Input buffer contains unsupported image format')) {
      return { ok: false, error: 'Unsupported image format. Please upload a JPG, PNG, WEBP, GIF, or HEIC file.' };
    }
    return { ok: false, error: `Image processing failed: ${msg.slice(0, 200)}` };
  }
}

/**
 * Parse the Content-Type or filename extension to a sharp-compatible format.
 */
export function detectInputFormat(contentType: string, filename?: string): string {
  const ct = contentType.toLowerCase();
  if (ct.includes('jpeg') || ct.includes('jpg')) return 'jpeg';
  if (ct.includes('png')) return 'png';
  if (ct.includes('webp')) return 'webp';
  if (ct.includes('gif')) return 'gif';
  if (ct.includes('heic') || ct.includes('heif')) return 'heic';
  if (ct.includes('avif')) return 'avif';
  if (filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext) return ext === 'jpg' ? 'jpeg' : ext;
  }
  return 'jpeg';
}
