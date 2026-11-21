import { describe, expect, it } from 'vitest';
import { isAllowedHostname, isPrivateAddress } from './outbound';

describe('outbound address guard', () => {
  it.each([
    '127.0.0.1',
    '10.0.0.5',
    '172.16.0.1',
    '192.168.1.1',
    '169.254.169.254',
    '100.64.0.1',
    '0.0.0.0',
    '224.0.0.1',
    '::1',
    '::',
    'fc00::1',
    'fd12::1',
    'fe80::1',
    'ff02::1',
    '::ffff:127.0.0.1',
    'not-an-ip',
  ])('blocks %s', (address) => {
    expect(isPrivateAddress(address)).toBe(true);
  });

  it.each(['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111'])('allows public %s', (address) => {
    expect(isPrivateAddress(address)).toBe(false);
  });
});

describe('outbound host allowlist', () => {
  const allowed = ['ytimg.com', 'googlevideo.com'];

  it('matches exact hosts and subdomains', () => {
    expect(isAllowedHostname('ytimg.com', allowed)).toBe(true);
    expect(isAllowedHostname('img.youtube.com', allowed)).toBe(false);
    expect(isAllowedHostname('i.ytimg.com', allowed)).toBe(true);
  });

  it('does not match lookalike domains', () => {
    expect(isAllowedHostname('evil-ytimg.com', allowed)).toBe(false);
    expect(isAllowedHostname('ytimg.com.evil.test', allowed)).toBe(false);
  });
});
