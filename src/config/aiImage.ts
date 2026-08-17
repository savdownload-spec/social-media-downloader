export type AiImageConfig = {
  /** Free-form note shown to users when generation is unavailable/maintenance. */
  maintenanceMessage: string;
  /** Cloudflare Workers AI model id used for `quality: 'standard'`. */
  standardModel: string;
  /** Cloudflare Workers AI model id used for `quality: 'high'`. */
  highModel: string;
  /** Diffusion steps sent to the high-quality (non-distilled) model. */
  highModelSteps: number;
  /** Base SavCredits cost for one standard-quality image. */
  creditCostStandard: number;
  /** Multiplier applied to the base cost for high-quality generations. */
  highQualityMultiplier: number;
  /** Free-plan cap on successful generations per rolling day. */
  freeDailyLimit: number;
  /** Max images per request for FREE-plan users. */
  maxImagesPerRequestFree: number;
  /** Max images per request for paid-plan users. */
  maxImagesPerRequestPro: number;
  /** Hard cap on prompt length in characters. */
  maxPromptLength: number;
  /** Requests allowed per IP per rolling minute. */
  rateLimitPerIpPerMinute: number;
  /** Soft per-generation timeout in ms (bounded by AI_PROVIDER_TIMEOUT_MS). */
  timeoutMs: number;
  /** Max generations processed concurrently by one server instance. */
  maxConcurrentJobs: number;
  /** Max generations allowed to queue before rejecting new requests. */
  maxQueueSize: number;
};

/** Defaults mirror the previous env-var values and the spec's conservative free-tier limits. */
export const DEFAULT_AI_IMAGE_CONFIG: AiImageConfig = {
  maintenanceMessage: 'AI generation is temporarily unavailable. Please try again later.',
  standardModel: '@cf/black-forest-labs/flux-2-klein-9b',
  highModel: '@cf/black-forest-labs/flux-2-dev',
  highModelSteps: 30,
  creditCostStandard: 5,
  highQualityMultiplier: 1.4,
  freeDailyLimit: 5,
  maxImagesPerRequestFree: 1,
  maxImagesPerRequestPro: 4,
  maxPromptLength: 1200,
  rateLimitPerIpPerMinute: 6,
  timeoutMs: 60000,
  maxConcurrentJobs: 2,
  maxQueueSize: 8,
};
