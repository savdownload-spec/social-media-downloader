import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { validateUpscaleFile } from './input';
import { validateUpscaleDimensions, UPSCALER_MAX_BYTES } from './config';

describe('AI upscaler input safety', () => {
  it.each(['jpeg', 'png', 'webp'] as const)('accepts real %s headers', async format => {
    const bytes = await sharp({ create: { width: 31, height: 17, channels: 4, background: '#12345680' } }).toFormat(format).toBuffer();
    await expect(validateUpscaleFile(new File([bytes], `image.${format}`, { type: `image/${format}` }), 4)).resolves.toEqual({ width: 31, height: 17 });
  });
  it('supports lossless WebP headers', async () => {
    const bytes = await sharp({ create: { width: 19, height: 13, channels: 3, background: '#123456' } }).webp({ lossless: true }).toBuffer();
    await expect(validateUpscaleFile(new File([bytes], 'image.webp', { type: 'image/webp' }), 2)).resolves.toEqual({ width: 19, height: 13 });
  });
  it('rejects incorrect MIME, corrupt headers, oversized files and decompression bombs before decoding', async () => {
    await expect(validateUpscaleFile(new File(['text'], 'image.png', { type: 'image/png' }), 2)).rejects.toThrow('Invalid');
    await expect(validateUpscaleFile(new File(['svg'], 'image.svg', { type: 'image/svg+xml' }), 2)).rejects.toThrow('Only');
    await expect(validateUpscaleFile(new File([new Uint8Array(UPSCALER_MAX_BYTES + 1)], 'image.png', { type: 'image/png' }), 2)).rejects.toThrow('5 MB');
    const bomb = await sharp({ create: { width: 1025, height: 1025, channels: 3, background: '#ffffff' } }).png().toBuffer();
    await expect(validateUpscaleFile(new File([bomb], 'bomb.png', { type: 'image/png' }), 2)).rejects.toThrow('too large');
  });
  it('bounds both scale modes by output pixels, sides and valid dimensions', () => {
    expect(() => validateUpscaleDimensions(1024, 1024, 2)).not.toThrow();
    expect(() => validateUpscaleDimensions(512, 512, 4)).not.toThrow();
    for (const args of [[513, 512, 4], [2049, 1, 2], [0, 10, 2], [1.5, 10, 4], [10, 10, 3]]) expect(() => validateUpscaleDimensions(...args as [number, number, number])).toThrow();
  });
});
