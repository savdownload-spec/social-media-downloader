import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { generateTextMock } = vi.hoisted(() => ({ generateTextMock: vi.fn() }));
vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ai')>();
  return { ...actual, generateText: generateTextMock };
});

import {
  DEFAULT_FREE_TEXT_MODEL,
  GatewayTextError,
  generateGatewayText,
  generateGatewayTextList,
  resolveFreeTextModel,
} from '@/lib/ai-gateway';

const usage = { inputTokens: 12, outputTokens: 8, totalTokens: 20 };
const originalModel = process.env.AI_GATEWAY_TEXT_MODEL;

beforeEach(() => {
  generateTextMock.mockReset();
  delete process.env.AI_GATEWAY_TEXT_MODEL;
});

afterEach(() => {
  if (originalModel === undefined) delete process.env.AI_GATEWAY_TEXT_MODEL;
  else process.env.AI_GATEWAY_TEXT_MODEL = originalModel;
});

describe('free AI Gateway models', () => {
  it('defaults to Nemotron and permits only the two verified free models', () => {
    expect(resolveFreeTextModel()).toBe(DEFAULT_FREE_TEXT_MODEL);
    expect(resolveFreeTextModel('reflection/beam-free')).toBe('reflection/beam-free');
    expect(() => resolveFreeTextModel('openai/gpt-4o-mini')).toThrow(GatewayTextError);
  });

  it('rejects a paid environment default before calling the provider', async () => {
    process.env.AI_GATEWAY_TEXT_MODEL = 'openai/gpt-4o-mini';
    await expect(generateGatewayText({
      messages: [{ role: 'user', content: 'Hello' }],
      maxOutputTokens: 50,
      temperature: 0.2,
      timeoutMs: 1000,
    })).rejects.toMatchObject({ code: 'configuration', statusCode: 503 });
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it('returns trimmed text and non-sensitive usage metadata', async () => {
    generateTextMock.mockResolvedValue({
      text: '  Useful answer  ',
      finishReason: 'stop',
      usage,
      finalStep: { providerMetadata: { gateway: { generationId: 'generation-123' } } },
    });

    const result = await generateGatewayText({
      messages: [{ role: 'user', content: 'Hello' }],
      maxOutputTokens: 50,
      temperature: 0.2,
      timeoutMs: 1000,
    });

    expect(result.text).toBe('Useful answer');
    expect(result.model).toBe(DEFAULT_FREE_TEXT_MODEL);
    expect(result.usage).toMatchObject({ ...usage, generationId: 'generation-123' });
    expect(result.usage.durationMs).toBeGreaterThanOrEqual(0);
    expect(generateTextMock).toHaveBeenCalledWith(expect.objectContaining({
      model: DEFAULT_FREE_TEXT_MODEL,
      maxOutputTokens: 50,
      maxRetries: 0,
      timeout: 1000,
    }));
  });

  it('returns a bounded string list and rejects incomplete output', async () => {
    generateTextMock.mockResolvedValueOnce({
      output: ['One', 'Two'],
      finishReason: 'stop',
      usage,
      finalStep: {},
    });
    const result = await generateGatewayTextList({
      messages: [{ role: 'user', content: '{}' }],
      count: 2,
      maxOutputTokens: 100,
      temperature: 0.8,
      timeoutMs: 1000,
    });
    expect(result.results).toEqual(['One', 'Two']);
    expect(generateTextMock).toHaveBeenCalledWith(expect.objectContaining({ output: expect.any(Object) }));

    generateTextMock.mockResolvedValueOnce({ output: ['Only one'], finishReason: 'stop', usage, finalStep: {} });
    await expect(generateGatewayTextList({
      messages: [{ role: 'user', content: '{}' }],
      count: 2,
      maxOutputTokens: 100,
      temperature: 0.8,
      timeoutMs: 1000,
    })).rejects.toMatchObject({ code: 'invalid-output' });
  });

  it.each([
    [429, 'rate-limit', 429],
    [402, 'usage-limit', 503],
    [403, 'unavailable', 503],
  ])('sanitizes provider status %i', async (providerStatus, code, publicStatus) => {
    generateTextMock.mockRejectedValue(Object.assign(new Error('Sensitive provider response'), { statusCode: providerStatus }));
    await expect(generateGatewayText({
      messages: [{ role: 'user', content: 'Hello' }],
      maxOutputTokens: 50,
      temperature: 0.2,
      timeoutMs: 1000,
    })).rejects.toMatchObject({ code, statusCode: publicStatus });
    await expect(generateGatewayText({
      messages: [{ role: 'user', content: 'Hello' }],
      maxOutputTokens: 50,
      temperature: 0.2,
      timeoutMs: 1000,
    })).rejects.not.toThrow('Sensitive provider response');
  });

  it('turns provider content filters into a friendly client error', async () => {
    generateTextMock.mockResolvedValue({ text: '', finishReason: 'content-filter', usage, finalStep: {} });
    await expect(generateGatewayText({
      messages: [{ role: 'user', content: 'Hello' }],
      maxOutputTokens: 50,
      temperature: 0.2,
      timeoutMs: 1000,
    })).rejects.toMatchObject({ code: 'content-filter', statusCode: 400 });
  });
});
