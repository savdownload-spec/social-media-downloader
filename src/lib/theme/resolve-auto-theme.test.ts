import { describe, it, expect } from 'vitest';
import { resolveDayNight } from './resolve-auto-theme';

describe('resolveDayNight', () => {
  it('resolves light at the start of the day window (06:00)', () => {
    expect(resolveDayNight('UTC', new Date('2026-08-15T06:00:00Z'))).toBe('light');
  });

  it('resolves dark just before the day window (05:59)', () => {
    expect(resolveDayNight('UTC', new Date('2026-08-15T05:59:00Z'))).toBe('dark');
  });

  it('resolves light just before the night window (17:59)', () => {
    expect(resolveDayNight('UTC', new Date('2026-08-15T17:59:00Z'))).toBe('light');
  });

  it('resolves dark at the start of the night window (18:00)', () => {
    expect(resolveDayNight('UTC', new Date('2026-08-15T18:00:00Z'))).toBe('dark');
  });

  it('resolves using the given timezone, not UTC', () => {
    // 2026-08-15T02:00:00Z is 07:00 in Asia/Karachi (UTC+5) -> light
    expect(resolveDayNight('Asia/Karachi', new Date('2026-08-15T02:00:00Z'))).toBe('light');
    // ...and 20:00 in America/Los_Angeles (UTC-7 in August) on the previous day -> dark
    expect(resolveDayNight('America/Los_Angeles', new Date('2026-08-15T03:00:00Z'))).toBe('dark');
  });

  it('falls back to light for an invalid timezone rather than throwing', () => {
    expect(resolveDayNight('Not/ARealZone')).toBe('light');
  });
});
