export type ImageProviderInput = {
  prompt: string;
  aspectRatio: '1:1' | '4:5' | '16:9';
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
  const dimensions = ratio === '16:9' ? { width: 1600, height: 900 } : ratio === '4:5' ? { width: 1000, height: 1250 } : { width: 1200, height: 1200 };
  const safePrompt = prompt.replace(/[<>&\"']/g, '').slice(0, 110);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${dimensions.width}" height="${dimensions.height}" viewBox="0 0 ${dimensions.width} ${dimensions.height}"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#5b21b6"/><stop offset=".52" stop-color="#9333ea"/><stop offset="1" stop-color="#ec4899"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="${dimensions.width * 0.78}" cy="${dimensions.height * 0.25}" r="${Math.min(dimensions.width, dimensions.height) * 0.18}" fill="#fff" fill-opacity=".14"/><circle cx="${dimensions.width * 0.22}" cy="${dimensions.height * 0.82}" r="${Math.min(dimensions.width, dimensions.height) * 0.3}" fill="#111827" fill-opacity=".16"/><text x="8%" y="70%" fill="white" font-family="Arial, sans-serif" font-size="${Math.max(30, dimensions.width / 22)}" font-weight="700">${safePrompt}</text><text x="8%" y="82%" fill="white" fill-opacity=".75" font-family="Arial, sans-serif" font-size="${Math.max(18, dimensions.width / 45)}">SavDown preview · ${index + 1}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

class MockImageProvider implements ImageProvider {
  async generate(input: ImageProviderInput) {
    await new Promise((resolve) => setTimeout(resolve, envNumber('AI_MOCK_DELAY_MS', 450)));
    return Array.from({ length: input.numberOfImages }, (_, index) => ({ url: makeMockImage(input.prompt, input.aspectRatio, index), revisedPrompt: input.prompt }));
  }
}

class OpenAIImageProvider implements ImageProvider {
  async generate(input: ImageProviderInput) {
    const key = process.env.AI_PROVIDER_API_KEY;
    if (!key) throw new ImageProviderError('unavailable');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), envNumber('AI_PROVIDER_TIMEOUT_MS', 60000));
    try {
      const size = input.aspectRatio === '16:9' ? '1792x1024' : input.aspectRatio === '4:5' ? '1024x1792' : '1024x1024';
      const response = await fetch('https://api.openai.com/v1/images/generations', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: process.env.AI_IMAGE_MODEL || 'gpt-image-1', prompt: input.prompt, n: input.numberOfImages, size, quality: input.quality === 'high' ? 'high' : 'medium' }), signal: controller.signal, cache: 'no-store' });
      if (response.status === 429) throw new ImageProviderError('rate_limited');
      if (response.status === 400) throw new ImageProviderError('invalid_request');
      if (!response.ok) throw new ImageProviderError('unavailable');
      const data = await response.json() as { data?: Array<{ url?: string; b64_json?: string; revised_prompt?: string }> };
      if (!data.data?.length) throw new ImageProviderError('failed');
      return data.data.map((image) => ({ url: image.url || (image.b64_json ? `data:image/png;base64,${image.b64_json}` : ''), revisedPrompt: image.revised_prompt })).filter((image) => image.url);
    } catch (error) {
      if (error instanceof ImageProviderError) throw error;
      if (error instanceof Error && error.name === 'AbortError') throw new ImageProviderError('timeout');
      throw new ImageProviderError('failed');
    } finally { clearTimeout(timeout); }
  }
}

export function getImageProvider(): ImageProvider {
  switch ((process.env.AI_PROVIDER || 'mock').toLowerCase()) {
    case 'openai': return new OpenAIImageProvider();
    case 'mock': return new MockImageProvider();
    default: throw new ImageProviderError('unavailable');
  }
}
