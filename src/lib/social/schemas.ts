import { z } from 'zod';
import { PLATFORM_IDS } from './platforms';
import { isValidTimeZone } from './timezone';

export const variantInputSchema = z.object({
  platform: z.enum(PLATFORM_IDS),
  caption: z.string().max(100_000).nullish(),
  title: z.string().max(300).nullish(),
  hashtags: z.string().max(2_000).nullish(),
  linkUrl: z.string().max(2_000).nullish(),
  options: z.record(z.unknown()).nullish(),
});

export const postInputSchema = z.object({
  mode: z.enum(['draft', 'schedule', 'publish']),
  title: z.string().max(300).nullish(),
  caption: z.string().max(100_000).default(''),
  hashtags: z.string().max(2_000).nullish(),
  linkUrl: z.string().max(2_000).nullish(),
  timezone: z.string().refine(isValidTimeZone, 'Invalid time zone'),
  /** ISO-8601 instant (UTC). Required for schedule mode. */
  scheduledAt: z.string().datetime({ offset: true }).nullish(),
  mediaIds: z.array(z.string().min(1)).max(20).default([]),
  variants: z.array(variantInputSchema).min(1).max(PLATFORM_IDS.length),
});

export type PostInput = z.infer<typeof postInputSchema>;
export type VariantInput = z.infer<typeof variantInputSchema>;

export const markPublishedSchema = z.object({
  publishedUrl: z
    .string()
    .url()
    .max(2_000)
    .refine((value) => /^https?:\/\//i.test(value), 'Use an http(s) URL.'),
});

export const mediaRegisterSchema = z.object({
  url: z.string().url().max(2_000),
  pathname: z.string().max(500).optional().nullable(),
  name: z.string().max(200),
  mimeType: z.string().max(100),
  sizeBytes: z.number().int().positive(),
  kind: z.enum(['IMAGE', 'VIDEO']),
  width: z.number().int().positive().nullish(),
  height: z.number().int().positive().nullish(),
  durationSeconds: z.number().positive().nullish(),
  altText: z.string().max(1_000).nullish(),
  provider: z.enum(['BLOB', 'LOCAL']),
});

export const memberInputSchema = z.object({
  email: z.string().email().max(320),
  role: z.enum(['EDITOR', 'PUBLISHER']),
});

export const settingsInputSchema = z.object({
  timezone: z.string().refine(isValidTimeZone, 'Invalid time zone'),
  defaultHashtags: z.string().max(500),
  defaultPlatforms: z.array(z.enum(PLATFORM_IDS)).max(PLATFORM_IDS.length),
  schedulerNote: z.string().max(300),
});

export function firstZodError(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return 'Invalid input.';
  const path = issue.path.join('.');
  return path ? `${path}: ${issue.message}` : issue.message;
}
