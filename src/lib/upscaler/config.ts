export type UpscaleFactor = 2 | 4;
export const UPSCALER_MAX_BYTES = 5 * 1024 * 1024;
export const UPSCALER_MAX_OUTPUT_PIXELS = 4_194_304;
export const UPSCALER_MAX_INPUT_SIDE = 2048;

export function validateUpscaleDimensions(width: number, height: number, scale: number) {
  if (scale !== 2 && scale !== 4) throw new Error('Choose 2× or 4× upscaling.');
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) throw new Error('Could not read image dimensions.');
  if (Math.max(width, height) > UPSCALER_MAX_INPUT_SIDE || width * height * scale * scale > UPSCALER_MAX_OUTPUT_PIXELS) {
    throw new Error(`Image too large for ${scale}× browser AI processing. Use at most ${scale === 2 ? '1 megapixel (1024×1024)' : '0.26 megapixels (512×512)'} and 2048 pixels per input side. Resize the image first or choose 2×.`);
  }
}
