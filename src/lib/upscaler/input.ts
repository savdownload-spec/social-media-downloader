import { UPSCALER_MAX_BYTES, validateUpscaleDimensions, type UpscaleFactor } from './config';

/** Inspect compressed headers before asking the browser to allocate decoded pixels. */
export async function validateUpscaleFile(file: File, scale: UpscaleFactor) {
  if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) throw new Error('Only JPG, PNG, and WebP images are supported.');
  if (!file.size || file.size > UPSCALER_MAX_BYTES) throw new Error('Choose an image up to 5 MB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(bytes.buffer);
  const text = (from: number, length: number) => String.fromCharCode(...bytes.subarray(from, from + length));
  let width = 0, height = 0;
  if (file.type === 'image/png' && bytes.length >= 24 && view.getUint32(0) === 0x89504e47 && view.getUint32(4) === 0x0d0a1a0a && text(12, 4) === 'IHDR') {
    width = view.getUint32(16); height = view.getUint32(20);
  } else if (file.type === 'image/webp' && bytes.length >= 30 && text(0, 4) === 'RIFF' && text(8, 4) === 'WEBP') {
    const chunk = text(12, 4);
    if (chunk === 'VP8X') {
      if (bytes[20] & 2) throw new Error('Animated WebP is not supported. Choose a still image.');
      width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
      height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
    } else if (chunk === 'VP8 ' && bytes[23] === 0x9d && bytes[24] === 1 && bytes[25] === 0x2a) {
      width = view.getUint16(26, true) & 0x3fff; height = view.getUint16(28, true) & 0x3fff;
    } else if (chunk === 'VP8L' && bytes[20] === 0x2f) {
      const bits = view.getUint32(21, true);
      width = 1 + (bits & 0x3fff); height = 1 + ((bits >>> 14) & 0x3fff);
    }
  } else if (file.type === 'image/jpeg' && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 3 < bytes.length) {
      if (bytes[offset++] !== 0xff) break;
      while (bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > bytes.length) break;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) break;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker) && length >= 7) {
        height = view.getUint16(offset + 3); width = view.getUint16(offset + 5); break;
      }
      offset += length;
    }
  }
  if (!width || !height) throw new Error('Invalid or unsupported image data. Choose a valid JPG, PNG, or WebP file.');
  validateUpscaleDimensions(width, height, scale);
  return { width, height };
}
