import { describe, expect, it } from 'vitest';
import { isMaintenanceBypassPath } from './maintenance';

describe('maintenance route access', () => {
  it.each([
    '/admin',
    '/admin/settings',
    '/api/auth/session',
    '/api/admin/settings',
    '/login',
    '/reset-password',
    '/maintenance',
  ])('keeps required route available: %s', (pathname) => {
    expect(isMaintenanceBypassPath(pathname)).toBe(true);
  });

  it.each([
    '/',
    '/about',
    '/tools/youtube-video-downloader',
    '/blog/example',
    '/workspace',
    '/account',
    '/administrator',
    '/apian',
  ])('gates public route: %s', (pathname) => {
    expect(isMaintenanceBypassPath(pathname)).toBe(false);
  });
});
