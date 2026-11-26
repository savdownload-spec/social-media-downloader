import type { PlatformId } from './platforms';

export type ProviderMode = 'oauth' | 'credentials' | 'approval';

export type ProviderSetup = {
  mode: ProviderMode;
  /** Server-side environment variables that must be present. */
  env: string[];
  callbackPath?: string;
  label: string;
  instructions: string[];
};

/**
 * Static, client-safe provider metadata. Whether a provider is *configured* is
 * resolved server-side from process.env (never shipped to the browser).
 */
export const PROVIDER_SETUP: Record<PlatformId, ProviderSetup> = {
  FACEBOOK: {
    mode: 'oauth',
    env: ['META_APP_ID', 'META_APP_SECRET'],
    callbackPath: '/api/admin/social/oauth/meta/callback',
    label: 'Meta app',
    instructions: [
      'Create a Meta app at developers.facebook.com and add Facebook Login for Business.',
      'Add the Pages and Instagram permissions, then open the OAuth redirect URI below.',
      'Your own account works in Development mode; other users need App Review.',
    ],
  },
  INSTAGRAM: {
    mode: 'oauth',
    env: ['META_APP_ID', 'META_APP_SECRET'],
    callbackPath: '/api/admin/social/oauth/meta/callback',
    label: 'Meta app',
    instructions: [
      'Instagram publishing uses the same Meta app as Facebook Pages.',
      'The Instagram account must be Professional (Business or Creator) and linked to a Page you administer.',
      'Images must be JPEG; media is fetched from the public Blob URL at publish time.',
    ],
  },
  LINKEDIN: {
    mode: 'oauth',
    env: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET'],
    callbackPath: '/api/admin/social/oauth/linkedin/callback',
    label: 'LinkedIn app',
    instructions: [
      'Create an app at developer.linkedin.com and request the “Share on LinkedIn” product.',
      'Add the OAuth redirect URI below.',
      'Member tokens last about 60 days; reconnect when the account shows Expiring.',
    ],
  },
  PINTEREST: {
    mode: 'oauth',
    env: ['PINTEREST_APP_ID', 'PINTEREST_APP_SECRET'],
    callbackPath: '/api/admin/social/oauth/pinterest/callback',
    label: 'Pinterest app',
    instructions: [
      'Create an app at developers.pinterest.com and add the OAuth redirect URI below.',
      'Trial access can create Pins for your own account; Standard access is needed for public distribution.',
      'A destination board is required for every Pin.',
    ],
  },
  BLUESKY: {
    mode: 'credentials',
    env: [],
    label: 'App password',
    instructions: [
      'Create an App Password in Bluesky Settings → Privacy and security.',
      'Enter your handle and the app password below. The password is used once to obtain a session and is not stored.',
    ],
  },
  MASTODON: {
    mode: 'credentials',
    env: [],
    label: 'Instance token',
    instructions: [
      'In your Mastodon instance, open Preferences → Development and create a new application with write scope.',
      'Enter the instance URL and the access token below.',
      'Character limits depend on the instance (500 default).',
    ],
  },
};

export function isProviderConfigured(
  platform: PlatformId,
  env: Record<string, string | undefined> = process.env,
): boolean {
  const setup = PROVIDER_SETUP[platform];
  return setup.env.every((key) => Boolean(env[key]));
}
