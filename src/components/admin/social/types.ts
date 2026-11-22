'use client';

import type { SerializedAsset, SerializedPost } from '@/lib/social/serialize';
import type { PlatformDefinition, PlatformId } from '@/lib/social/platforms';
import type { SocialCapability, SocialRole } from '@/lib/social/permissions';

export type Bootstrap = {
  actor: {
    id: string;
    email: string;
    name: string | null;
    role: SocialRole;
    capabilities: SocialCapability[];
  };
  config: {
    timezone: string;
    defaultHashtags: string;
    defaultPlatforms: string[];
    schedulerNote: string;
  };
  platforms: PlatformDefinition[];
  media: { mode: 'blob' | 'local' | 'unavailable'; maxBytes: number };
  flags: {
    tokenEncryptionReady: boolean;
    blobConfigured: boolean;
    cronConfigured: boolean;
    onVercel: boolean;
  };
  serverTime: string;
};

export type MediaAsset = SerializedAsset & { usageCount?: number };

export type AccountDTO = {
  id: string;
  platform: string;
  externalAccountId: string;
  accountName: string;
  username: string | null;
  avatarUrl: string | null;
  accountType: string;
  status: string;
  tokenExpiresAt: string | null;
  scopes: string | null;
  metadata: unknown;
  lastConnectedAt: string | null;
  lastPublishedAt: string | null;
  lastError: string | null;
  createdAt: string;
};

export type Stats = {
  counts: Record<string, number>;
  publishedRecent: number;
  accounts: { total: number; connected: number };
  upcoming: Array<{
    id: string;
    title: string | null;
    caption: string;
    scheduledAt: string | null;
    status: string;
    platforms: Array<{ platform: string; status: string }>;
  }>;
  recentAttempts: Array<{
    id: string;
    platform: string;
    outcome: string;
    message: string | null;
    startedAt: string;
    accountName: string | null;
    post: { id: string; title: string | null; caption: string } | null;
  }>;
  publishedByPlatform: Array<{ platform: string; count: number }>;
};

export type PostDTO = SerializedPost;

export type CalendarPost = {
  id: string;
  title: string | null;
  caption: string;
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  timezone: string;
  variants: Array<{ platform: string; status: string; publishedUrl: string | null }>;
};

export type LogsData = {
  attempts: Array<{
    id: string;
    platform: string;
    attemptNo: number;
    outcome: string;
    httpStatus: number | null;
    errorCode: string | null;
    message: string | null;
    durationMs: number | null;
    startedAt: string;
    finishedAt: string | null;
    accountName: string | null;
    jobId: string | null;
    post: { id: string; title: string | null; caption: string } | null;
  }>;
  total: number;
  page: number;
  pageSize: number;
  audits: Array<{
    id: string;
    action: string;
    adminEmail: string;
    targetType: string | null;
    targetId: string | null;
    detail: unknown;
    createdAt: string;
  }>;
};

export type SocialSettingsData = {
  config: {
    timezone: string;
    defaultHashtags: string;
    defaultPlatforms: string[];
    schedulerNote: string;
  };
  memberCount: number;
  flags: { cronConfigured: boolean; tokenEncryptionReady: boolean; blobConfigured: boolean };
  scheduler: { endpoint: string; dailyCron: string; note: string };
};

export type MemberDTO = {
  id: string;
  userId: string;
  role: 'EDITOR' | 'PUBLISHER';
  createdAt: string;
  user: { id: string; name: string | null; email: string | null; image: string | null; role: string };
};

export function platformOf(platforms: PlatformDefinition[], id: string): PlatformDefinition | undefined {
  return platforms.find((entry) => entry.id === (id as PlatformId));
}
