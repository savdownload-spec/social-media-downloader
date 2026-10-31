import { describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { IMAGE_MAX_FILE_BYTES } from './imageConfig';
import { processImage } from './imageService';

vi.mock('heic-decode', () => ({
  default: vi.fn(async () => ({
    width: 2,
    height: 1,
    data: new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 255]),
  })),
}));

async function fixture(format: 'jpeg' | 'png' = 'jpeg') {
  const pipeline = sharp({
    create: { width: 12, height: 8, channels: 4, background: { r: 220, g: 20, b: 60, alpha: 0.5 } },
  });
  return format === 'png' ? pipeline.png().toBuffer() : pipeline.jpeg().toBuffer();
}

describe('processImage', () => {
  it('creates a real PNG for JPG-to-PNG', async () => {
    const input = await fixture('jpeg');
    const result = await processImage(input, { op: 'jpg-to-png' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mimeType).toBe('image/png');
    expect(result.extension).toBe('png');
    expect(result.buffer.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(await sharp(result.buffer).metadata()).toMatchObject({ width: 12, height: 8, format: 'png' });
  });

  it('preserves a PNG output and transparency when resizing', async () => {
    const input = await fixture('png');
    const result = await processImage(input, { op: 'resize', width: 6, format: 'png' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mimeType).toBe('image/png');
    expect(await sharp(result.buffer).metadata()).toMatchObject({ width: 6, height: 4, hasAlpha: true });
  });

  it('uses matching MIME and extension for WebP conversion', async () => {
    const result = await processImage(await fixture(), { op: 'convert', format: 'webp' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result).toMatchObject({ mimeType: 'image/webp', extension: 'webp' });
    expect((await sharp(result.buffer).metadata()).format).toBe('webp');
  });

  it('uses the HEIC decoder fallback when libvips cannot advertise HEIC input', async () => {
    const input = Buffer.from([0, 0, 0, 20, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63, 0, 0, 0, 0]);
    const result = await processImage(input, { op: 'heic-to-jpg', quality: 90 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result).toMatchObject({ mimeType: 'image/jpeg', extension: 'jpg', width: 2, height: 1 });
    expect((await sharp(result.buffer).metadata()).format).toBe('jpeg');
  });

  it('rejects unsupported and oversized inputs without output', async () => {
    expect(await processImage(Buffer.from('not an image'), { op: 'enhance' })).toMatchObject({ ok: false });
    expect(await processImage(Buffer.alloc(IMAGE_MAX_FILE_BYTES + 1), { op: 'enhance' })).toMatchObject({ ok: false, error: expect.stringContaining('25 MB') });
  });
});
