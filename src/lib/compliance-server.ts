import 'server-only';
import { revalidateTag, unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import {
  BUSINESS_SETTING_KEYS,
  DEFAULT_BUSINESS,
  DEFAULT_POLICY_CONTENT,
  POLICY_SETTING_KEYS,
  type BusinessDetails,
  type PolicyKind,
} from '@/config/compliance';

export const COMPLIANCE_CACHE_TAG = 'compliance-settings';

const settingKeys = [
  ...Object.values(BUSINESS_SETTING_KEYS),
  ...Object.values(POLICY_SETTING_KEYS),
];

export type ComplianceSettings = {
  business: BusinessDetails;
  policies: Record<PolicyKind, string>;
};

async function readComplianceSettings(): Promise<ComplianceSettings> {
  try {
    const rows = await prisma.adminSetting.findMany({
      where: { key: { in: settingKeys } },
      select: { key: true, value: true },
    });
    const stored = new Map(rows.map((row) => [row.key, row.value]));
    const value = (key: string, fallback: string) => {
      const candidate = stored.get(key)?.trim();
      return candidate || fallback;
    };

    return {
      business: {
        name: value(BUSINESS_SETTING_KEYS.name, DEFAULT_BUSINESS.name),
        address: value(BUSINESS_SETTING_KEYS.address, DEFAULT_BUSINESS.address),
        phone: value(BUSINESS_SETTING_KEYS.phone, DEFAULT_BUSINESS.phone),
        whatsapp: value(BUSINESS_SETTING_KEYS.whatsapp, DEFAULT_BUSINESS.whatsapp),
        email: DEFAULT_BUSINESS.email,
        website: DEFAULT_BUSINESS.website,
      },
      policies: {
        privacy: value(POLICY_SETTING_KEYS.privacy, DEFAULT_POLICY_CONTENT.privacy),
        terms: value(POLICY_SETTING_KEYS.terms, DEFAULT_POLICY_CONTENT.terms),
        refund: value(POLICY_SETTING_KEYS.refund, DEFAULT_POLICY_CONTENT.refund),
        service: value(POLICY_SETTING_KEYS.service, DEFAULT_POLICY_CONTENT.service),
      },
    };
  } catch {
    return {
      business: { ...DEFAULT_BUSINESS },
      policies: { ...DEFAULT_POLICY_CONTENT },
    };
  }
}

const getCachedComplianceSettings = unstable_cache(readComplianceSettings, ['compliance-settings'], {
  tags: [COMPLIANCE_CACHE_TAG],
  revalidate: 300,
});

export async function getComplianceSettings(): Promise<ComplianceSettings> {
  return getCachedComplianceSettings();
}

export function revalidateComplianceSettings(): void {
  revalidateTag(COMPLIANCE_CACHE_TAG);
}
