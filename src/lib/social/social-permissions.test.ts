import { describe, expect, it } from 'vitest';
import { canQueuePublish, capabilitiesFor, roleCan } from './permissions';

describe('social module permissions', () => {
  it('lets editors prepare content but not publish or manage accounts', () => {
    expect(roleCan('EDITOR', 'create')).toBe(true);
    expect(roleCan('EDITOR', 'media')).toBe(true);
    expect(roleCan('EDITOR', 'publish')).toBe(false);
    expect(roleCan('EDITOR', 'accounts')).toBe(false);
    expect(canQueuePublish('EDITOR')).toBe(false);
  });

  it('lets publishers publish and edit but not touch credentials or settings', () => {
    expect(roleCan('PUBLISHER', 'publish')).toBe(true);
    expect(roleCan('PUBLISHER', 'edit')).toBe(true);
    expect(roleCan('PUBLISHER', 'accounts')).toBe(false);
    expect(roleCan('PUBLISHER', 'members')).toBe(false);
    expect(canQueuePublish('PUBLISHER')).toBe(true);
  });

  it('grants super admins every capability', () => {
    expect(capabilitiesFor('SUPER_ADMIN')).toEqual(
      expect.arrayContaining(['view', 'create', 'edit', 'publish', 'media', 'accounts', 'settings', 'members']),
    );
  });

  it('denies everything without a role', () => {
    expect(roleCan(null, 'view')).toBe(false);
    expect(capabilitiesFor(null)).toEqual([]);
  });
});
