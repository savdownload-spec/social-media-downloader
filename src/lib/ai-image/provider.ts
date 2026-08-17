import { getAiImageConfig } from '@/lib/ai-image-config-server';

export type ImageProviderInput = {
  prompt: string;
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:2';
  quality: 'standard' | 'high';
  numberOfImages: number;
};

export type GeneratedImage = { url: string; revisedPrompt?: string };

export class ImageProviderError extends Error {
  code: 'timeout' | 'rate_limited' | 'unavailable' | 'invalid_request' | 'failed';
  constructor(code: ImageProviderError['code'], message = 'Image generation failed') {
    super(message);
    this.name = 'ImageProviderError';
    this.code = code;
  }
}

export interface ImageProvider {
  generate(input: ImageProviderInput): Promise<GeneratedImage[]>;
}

function envNumber(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function makeMockImage(prompt: string, ratio: ImageProviderInput['aspectRatio'], index: number) {
  const dims: Record<ImageProviderInput['aspectRatio'], { width: number; height: number }> = {
    '1:1': { width: 1024, height: 1024 },
    '16:9': { width: 1344, height: 768 },
    '9:16': { width: 768, height: 1344 },
    '4:3': { width: 1152, height: 896 },
    '3:2': { width: 1216, height: 832 },
  };
  const dimensions = dims[ratio];
  const safePrompt = prompt.replace(/[<>&"']/g, '').slice(0, 110);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${dimensions.width}" height="${dimensions.height}" viewBox="0 0 ${dimensions.width} ${dimensions.height}"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#5b21b6"/><stop offset=".52" stop-color="#9333ea"/><stop offset="1" stop-color="#ec4899"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="${dimensions.width * 0.78}" cy="${dimensions.height * 0.25}" r="${Math.min(dimensions.width, dimensions.height) * 0.18}" fill="#fff" fill-opacity=".14"/><circle cx="${dimensions.width * 0.22}" cy="${dimensions.height * 0.82}" r="${Math.min(dimensions.width, dimensions.height) * 0.3}" fill="#111827" fill-opacity=".16"/><text x="8%" y="70%" fill="white" font-family="Arial, sans-serif" font-size="${Math.max(30, dimensions.width / 22)}" font-weight="700">${safePrompt}</text><text x="8%" y="82%" fill="white" fill-opacity=".75" font-family="Arial, sans-serif" font-size="${Math.max(18, dimensions.width / 45)}">SavDown preview · ${index + 1}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

class MockImageProvider implements ImageProvider {
  async generate(input: ImageProviderInput) {
    await new Promise((resolve) => setTimeout(resolve, envNumber('AI_MOCK_DELAY_MS', 450)));
    return Array.from({ length: input.numberOfImages }, (_, index) => ({ url: makeMockImage(input.prompt, input.aspectRatio, index), revisedPrompt: input.prompt }));
  }
}

/** ~1MP dimensions per ratio, multiples of 64, matching Cloudflare's per-megapixel pricing. */
const CLOUDFLARE_DIMENSIONS: Record<ImageProviderInput['aspectRatio'], { width: number; height: number }> = {
  '1:1': { width: 1024, height: 1024 },
  '16:9': { width: 1344, height: 768 },
  '9:16': { width: 768, height: 1344 },
  '4:3': { width: 1152, height: 896 },
  '3:2': { width: 1216, height: 832 },
};

/**
 * Cloudflare Workers AI — FLUX.2 image models (black-forest-labs).
 * Standard quality uses the distilled, fixed-4-step Klein 9B model for
 * speed/cost; High quality uses the full Dev model with a configurable step
 * count for maximum photorealism. Credentials are read server-side only and
 * never reach the client — the frontend only ever calls our own API route.
 */
class CloudflareImageProvider implements ImageProvider {
  private async generateOne(input: ImageProviderInput, model: string, steps?: number): Promise<GeneratedImage> {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const token = process.env.CLOUDFLARE_API_TOKEN;
    if (!accountId || !token) throw new ImageProviderError('unavailable');

    const { width, height } = CLOUDFLARE_DIMENSIONS[input.aspectRatio];
    const timeoutMs = envNumber('AI_PROVIDER_TIMEOUT_MS', 60000);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const body: Record<string, unknown> = { prompt: input.prompt, width, height };
      if (typeof steps === 'number') body.num_steps = steps;

      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
          cache: 'no-store',
        },
      );

      if (response.status === 429) throw new ImageProviderError('rate_limited');
      if (response.status === 400) throw new ImageProviderError('invalid_request');
      if (!response.ok) throw new ImageProviderError('unavailable');

      const contentType = response.headers.get('content-type') || '';
      let base64: string | null = null;
      if (contentType.includes('application/json')) {
        const data = (await response.json()) as { success?: boolean; result?: { image?: string }; errors?: unknown[] };
        if (!data.success && data.errors?.length) throw new ImageProviderError('unavailable');
        base64 = data.result?.image ?? null;
      }
      if (!base64) {
        // Fallback: some Workers AI routes return the raw image bytes.
        const buffer = await response.arrayBuffer();
        if (buffer.byteLength < 1000) throw new ImageProviderError('failed');
        base64 = Buffer.from(buffer).toString('base64');
      }
      if (!base64) throw new ImageProviderError('failed');
      return { url: `data:image/png;base64,${base64}`, revisedPrompt: input.prompt };
    } catch (error) {
      if (error instanceof ImageProviderError) throw error;
      if (error instanceof Error && error.name === 'AbortError') throw new ImageProviderError('timeout');
      throw new ImageProviderError('failed');
    } finally {
      clearTimeout(timeout);
    }
  }

  async generate(input: ImageProviderInput) {
    const config = await getAiImageConfig();
    const model = input.quality === 'high' ? config.highModel : config.standardModel;
    const steps = input.quality === 'high' ? config.highModelSteps : undefined;
    const jobs = Array.from({ length: input.numberOfImages }, () => this.generateOne(input, model, steps));
    return Promise.all(jobs);
  }
}

export function getImageProvider(): ImageProvider {
  switch ((process.env.AI_PROVIDER || 'cloudflare').toLowerCase()) {
    case 'cloudflare': return new CloudflareImageProvider();
    case 'mock': return new MockImageProvider();
    default: throw new ImageProviderError('unavailable');
  }
}
