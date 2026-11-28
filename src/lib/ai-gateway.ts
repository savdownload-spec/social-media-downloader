import 'server-only';

import { generateText, Output, type ModelMessage } from 'ai';
import { z } from 'zod';

export type FreeTextModel = 'nvidia/nemotron-3.5-lightning-free' | 'reflection/beam-free';
export const FREE_TEXT_MODELS: [FreeTextModel, FreeTextModel] = [
  'nvidia/nemotron-3.5-lightning-free',
  'reflection/beam-free',
];
export const DEFAULT_FREE_TEXT_MODEL: FreeTextModel = FREE_TEXT_MODELS[0];

export type GatewayUsage = {
  inputTokens: number | undefined;
  outputTokens: number | undefined;
  totalTokens: number | undefined;
  durationMs: number;
  generationId?: string;
};

export type GatewayTextResult = {
  text: string;
  model: FreeTextModel;
  usage: GatewayUsage;
};

export type GatewayTextListResult = {
  results: string[];
  model: FreeTextModel;
  usage: GatewayUsage;
};

type GatewayRequest = {
  messages: ModelMessage[];
  model?: string;
  maxOutputTokens: number;
  temperature: number;
  timeoutMs: number;
};

export type GatewayErrorCode = 'configuration' | 'content-filter' | 'invalid-output' | 'rate-limit' | 'timeout' | 'unavailable' | 'usage-limit';

export class GatewayTextError extends Error {
  constructor(
    readonly code: GatewayErrorCode,
    readonly statusCode: number,
    readonly publicMessage: string,
  ) {
    super(publicMessage);
    this.name = 'GatewayTextError';
  }
}

export function resolveFreeTextModel(requested?: string): FreeTextModel {
  const candidate = requested?.trim() || process.env.AI_GATEWAY_TEXT_MODEL?.trim() || DEFAULT_FREE_TEXT_MODEL;
  if ((FREE_TEXT_MODELS as string[]).includes(candidate)) return candidate as FreeTextModel;
  throw new GatewayTextError('configuration', 503, 'AI generation is temporarily unavailable. Please try again later.');
}

function generationId(metadata: unknown): string | undefined {
  if (!metadata || typeof metadata !== 'object') return undefined;
  const gateway = (metadata as Record<string, unknown>).gateway;
  if (!gateway || typeof gateway !== 'object') return undefined;
  const value = (gateway as Record<string, unknown>).generationId;
  return typeof value === 'string' ? value.slice(0, 200) : undefined;
}

function usageMetadata(
  result: {
    usage: { inputTokens: number | undefined; outputTokens: number | undefined; totalTokens: number | undefined };
    finalStep?: { providerMetadata?: unknown };
  },
  startedAt: number,
): GatewayUsage {
  const id = generationId(result.finalStep?.providerMetadata);
  return {
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
    totalTokens: result.usage.totalTokens,
    durationMs: Math.max(0, Date.now() - startedAt),
    ...(id ? { generationId: id } : {}),
  };
}

function errorField(error: unknown, field: string): unknown {
  return error && typeof error === 'object' ? (error as Record<string, unknown>)[field] : undefined;
}

function friendlyGatewayError(error: unknown): GatewayTextError {
  if (error instanceof GatewayTextError) return error;

  const statusCode = Number(errorField(error, 'statusCode')) || 0;
  const errorType = String(errorField(error, 'type') ?? '').toLowerCase();
  const errorName = String(errorField(error, 'name') ?? '').toLowerCase();

  if (statusCode === 429) {
    return new GatewayTextError('rate-limit', 429, 'The free AI model is busy right now. Please wait a moment and try again.');
  }
  if (statusCode === 402 || errorType.includes('quota') || errorType.includes('insufficient')) {
    return new GatewayTextError('usage-limit', 503, 'Free AI usage is temporarily exhausted. Please try again later.');
  }
  if (statusCode === 408 || errorName.includes('timeout') || errorName.includes('abort')) {
    return new GatewayTextError('timeout', 503, 'The AI took too long to respond. Please try again.');
  }
  if (errorType.includes('content_filter') || errorType.includes('content-filter')) {
    return new GatewayTextError('content-filter', 400, 'This topic cannot be used for generated content. Please try a different topic.');
  }
  if (errorName.includes('noobjectgenerated') || errorName.includes('nooutputgenerated') || errorName.includes('typevalidation')) {
    return new GatewayTextError('invalid-output', 503, 'The AI returned an unusable response. Please try again.');
  }
  return new GatewayTextError('unavailable', 503, 'AI generation is temporarily unavailable. Please try again in a moment.');
}

function validateFinishReason(finishReason: string) {
  if (finishReason === 'content-filter') {
    throw new GatewayTextError('content-filter', 400, 'This topic cannot be used for generated content. Please try a different topic.');
  }
  if (finishReason === 'length') {
    throw new GatewayTextError('invalid-output', 503, 'The AI response was incomplete. Please try again.');
  }
}

export async function generateGatewayText(options: GatewayRequest): Promise<GatewayTextResult> {
  const model = resolveFreeTextModel(options.model);
  const startedAt = Date.now();
  try {
    const result = await generateText({
      model,
      messages: options.messages,
      maxOutputTokens: options.maxOutputTokens,
      temperature: options.temperature,
      maxRetries: 0,
      timeout: options.timeoutMs,
    });
    validateFinishReason(result.finishReason);
    const text = result.text.trim();
    if (!text) throw new GatewayTextError('invalid-output', 503, 'The AI returned an empty response. Please try again.');
    return { text, model, usage: usageMetadata(result, startedAt) };
  } catch (error) {
    throw friendlyGatewayError(error);
  }
}

export async function generateGatewayTextList(
  options: GatewayRequest & { count: number; maxItemLength?: number },
): Promise<GatewayTextListResult> {
  const model = resolveFreeTextModel(options.model);
  const startedAt = Date.now();
  try {
    const result = await generateText({
      model,
      messages: options.messages,
      maxOutputTokens: options.maxOutputTokens,
      temperature: options.temperature,
      maxRetries: 0,
      timeout: options.timeoutMs,
      output: Output.array({
        element: z.string().trim().min(1).max(options.maxItemLength ?? 600),
        minItems: options.count,
        maxItems: options.count,
      }),
    });
    validateFinishReason(result.finishReason);
    const results = result.output.map(item => item.trim());
    if (results.length !== options.count || results.some(item => !item)) {
      throw new GatewayTextError('invalid-output', 503, 'The AI returned an incomplete response. Please try again.');
    }
    return { results, model, usage: usageMetadata(result, startedAt) };
  } catch (error) {
    throw friendlyGatewayError(error);
  }
}
