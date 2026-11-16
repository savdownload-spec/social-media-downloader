import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

/** True for loopback, private, link-local, CGNAT, metadata, and reserved ranges. */
export function isPrivateAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const parts = address.split('.').map(Number);
    const [a, b] = parts;
    if (parts.length !== 4 || parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return true;
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 192 && b === 0) ||
      a >= 224
    );
  }
  if (version === 6) {
    const normalized = address.toLowerCase();
    if (normalized === '::' || normalized === '::1') return true;
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
    if (/^fe[89ab]/.test(normalized)) return true;
    if (normalized.startsWith('ff')) return true;
    if (normalized.startsWith('::ffff:')) {
      return isPrivateAddress(normalized.slice('::ffff:'.length));
    }
    return false;
  }
  return true;
}

/** Exact-or-subdomain match against an explicit allowlist. */
export function isAllowedHostname(hostname: string, allowed: readonly string[]): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  return allowed.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

/**
 * Validates scheme, allowlist, and DNS resolution. Returns the parsed URL
 * only when the host is allowlisted and every resolved address is public.
 */
export async function assertPublicAllowedUrl(rawUrl: string, allowed: readonly string[]): Promise<URL | null> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port) return null;
  if (!isAllowedHostname(parsed.hostname, allowed)) return null;

  try {
    const addresses = await lookup(parsed.hostname, { all: true, verbatim: true });
    if (!addresses.length || addresses.some(entry => isPrivateAddress(entry.address))) return null;
  } catch {
    return null;
  }

  return parsed;
}
