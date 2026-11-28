import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const { generateTextMock } = vi.hoisted(() => ({ generateTextMock: vi.fn() }));
vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ai')>();
  return { ...actual, generateText: generateTextMock };
});

import { detectSupportLanguage, translateSupportMessage } from '@/lib/support-translation';

const originalModel = process.env.AI_GATEWAY_TEXT_MODEL;

beforeEach(() => {
  generateTextMock.mockReset();
  delete process.env.AI_GATEWAY_TEXT_MODEL;
});

afterEach(() => {
  if (originalModel === undefined) delete process.env.AI_GATEWAY_TEXT_MODEL;
  else process.env.AI_GATEWAY_TEXT_MODEL = originalModel;
});

describe('support translation Gateway integration', () => {
  it('does not call a model for English messages', async () => {
    await expect(translateSupportMessage('How can I download the video?')).resolves.toMatchObject({
      detectedLanguage: 'en',
      translationStatus: 'NOT_NEEDED',
    });
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it('uses the real free-model adapter for detected non-English messages', async () => {
    generateTextMock.mockResolvedValue({
      text: 'I cannot download my video.',
      finishReason: 'stop',
      usage: { inputTokens: 20, outputTokens: 8, totalTokens: 28 },
      finalStep: {},
    });
    const input = 'Hola, no puedo descargar mi video, gracias.';
    expect(detectSupportLanguage(input)).toBe('es');
    await expect(translateSupportMessage(input)).resolves.toEqual({
      detectedLanguage: 'es',
      translatedMessage: 'I cannot download my video.',
      translationStatus: 'TRANSLATED',
    });
    expect(generateTextMock).toHaveBeenCalledWith(expect.objectContaining({
      model: 'nvidia/nemotron-3.5-lightning-free',
      maxOutputTokens: 500,
      temperature: 0.15,
      timeout: 12_000,
    }));
  });

  it('preserves the failed fallback without a network call when configuration is invalid', async () => {
    process.env.AI_GATEWAY_TEXT_MODEL = 'openai/gpt-4o-mini';
    const result = await translateSupportMessage('Bonjour, je ne peux pas télécharger une vidéo avec votre outil, merci.', 'fr');
    expect(result).toEqual({
      detectedLanguage: 'fr',
      translatedMessage: null,
      translationStatus: 'FAILED',
    });
    expect(generateTextMock).not.toHaveBeenCalled();
  });
});
