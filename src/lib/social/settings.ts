import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { PLATFORM_IDS } from './platforms';
import { DEFAULT_TIMEZONE, isValidTimeZone } from './timezone';

export const SOCIAL_CONFIG_KEY = 'social_config';

export const socialConfigSchema = z.object({
  timezone: z.string().refine(isValidTimeZone, 'Invalid time zone'),
  defaultHashtags: z.string().max(500),
  defaultPlatforms: z.array(z.enum(PLATFORM_IDS)).max(PLATFORM_IDS.length),
  schedulerNote: z.string().max(300),
});

export type SocialConfig = z.infer<typeof socialConfigSchema>;

export const DEFAULT_SOCIAL_CONFIG: SocialConfig = {
  timezone: DEFAULT_TIMEZONE,
  defaultHashtags: '',
  defaultPlatforms: ['FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'X'],
  schedulerNote: '',
};

export async function getSocialConfig(): Promise<SocialConfig> {
  try {
    const row = await prisma.adminSetting.findUnique({ where: { key: SOCIAL_CONFIG_KEY } });
    if (!row) return DEFAULT_SOCIAL_CONFIG;
    const parsed = socialConfigSchema.partial().safeParse(JSON.parse(row.value));
    if (!parsed.success) return DEFAULT_SOCIAL_CONFIG;
    return { ...DEFAULT_SOCIAL_CONFIG, ...parsed.data };
  } catch {
    return DEFAULT_SOCIAL_CONFIG;
  }
}

export async function saveSocialConfig(input: unknown): Promise<SocialConfig> {
  const parsed = socialConfigSchema.parse(input);
  await prisma.adminSetting.upsert({
    where: { key: SOCIAL_CONFIG_KEY },
    update: { value: JSON.stringify(parsed) },
    create: { key: SOCIAL_CONFIG_KEY, value: JSON.stringify(parsed) },
  });
  return parsed;
}
