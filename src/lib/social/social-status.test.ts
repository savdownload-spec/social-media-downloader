import { describe, expect, it } from 'vitest';
import { derivePostStatus } from './status';

describe('derivePostStatus', () => {
  it('defaults to DRAFT with no variants', () => {
    expect(derivePostStatus([])).toBe('DRAFT');
  });

  it('is PUBLISHED only when every variant is published', () => {
    expect(derivePostStatus(['PUBLISHED', 'PUBLISHED'])).toBe('PUBLISHED');
  });

  it('downgrades to PARTIAL when some platforms published', () => {
    expect(derivePostStatus(['PUBLISHED', 'FAILED'])).toBe('PARTIAL');
    expect(derivePostStatus(['PUBLISHED', 'NEEDS_AUTHORIZATION'])).toBe('PARTIAL');
    expect(derivePostStatus(['PUBLISHED', 'MANUAL_ACTION_REQUIRED'])).toBe('PARTIAL');
  });

  it('never hides authorization or manual work behind FAILED', () => {
    expect(derivePostStatus(['NEEDS_AUTHORIZATION', 'MANUAL_ACTION_REQUIRED'])).toBe('NEEDS_AUTHORIZATION');
    expect(derivePostStatus(['MANUAL_ACTION_REQUIRED', 'DRAFT'])).toBe('MANUAL_ACTION_REQUIRED');
    expect(derivePostStatus(['FAILED', 'CANCELLED'])).toBe('FAILED');
  });

  it('reports in-flight states', () => {
    expect(derivePostStatus(['PUBLISHING', 'SCHEDULED'])).toBe('PUBLISHING');
    expect(derivePostStatus(['QUEUED', 'SCHEDULED'])).toBe('QUEUED');
    expect(derivePostStatus(['SCHEDULED', 'SCHEDULED'])).toBe('SCHEDULED');
  });

  it('only cancels when everything was cancelled', () => {
    expect(derivePostStatus(['CANCELLED'])).toBe('CANCELLED');
    expect(derivePostStatus(['CANCELLED', 'DRAFT'])).toBe('CANCELLED');
  });
});
