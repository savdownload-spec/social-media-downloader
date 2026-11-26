export const SOCIAL_ROLES = ['SUPER_ADMIN', 'PUBLISHER', 'EDITOR'] as const;
export type SocialRole = (typeof SOCIAL_ROLES)[number];

export const SOCIAL_CAPABILITIES = [
  'view',
  'create',
  'edit',
  'publish',
  'media',
  'accounts',
  'settings',
  'members',
] as const;

export type SocialCapability = (typeof SOCIAL_CAPABILITIES)[number];

const ROLE_CAPABILITIES: Record<SocialRole, readonly SocialCapability[]> = {
  SUPER_ADMIN: SOCIAL_CAPABILITIES,
  PUBLISHER: ['view', 'create', 'edit', 'publish', 'media'],
  EDITOR: ['view', 'create', 'edit', 'media'],
};

export function isSocialRole(value: string): value is SocialRole {
  return (SOCIAL_ROLES as readonly string[]).includes(value);
}

export function roleCan(role: SocialRole | null | undefined, capability: SocialCapability): boolean {
  if (!role) return false;
  return ROLE_CAPABILITIES[role].includes(capability);
}

export function capabilitiesFor(role: SocialRole | null | undefined): readonly SocialCapability[] {
  return role ? ROLE_CAPABILITIES[role] : [];
}

/**
 * Editors may propose a schedule; only publishers/admins may actually queue a
 * job. The composer uses this to decide whether "Schedule" queues or proposes.
 */
export function canQueuePublish(role: SocialRole | null | undefined): boolean {
  return roleCan(role, 'publish');
}

export function roleLabel(role: SocialRole): string {
  return role
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
