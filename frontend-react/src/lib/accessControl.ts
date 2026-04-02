export type Capability =
  | 'incident.read'
  | 'incident.write'
  | 'map.operate'
  | 'resource.manage'
  | 'simulation.run'
  | 'integration.read'
  | 'integration.write'
  | 'admin.audit'
  | 'admin.approval';

export type AppRole = 'public' | 'volunteer' | 'coordinator' | 'admin';

export interface AccessRequirement {
  requiresAuth?: boolean;
  requiredRoles?: string[];
  requiredCapabilities?: Capability[];
}

const ROLE_CAPABILITIES: Record<AppRole, Capability[]> = {
  public: [],
  volunteer: ['incident.read', 'map.operate'],
  coordinator: [
    'incident.read',
    'incident.write',
    'map.operate',
    'resource.manage',
    'simulation.run',
    'integration.read',
  ],
  admin: [
    'incident.read',
    'incident.write',
    'map.operate',
    'resource.manage',
    'simulation.run',
    'integration.read',
    'integration.write',
    'admin.audit',
    'admin.approval',
  ],
};

const KNOWN_ROLE_SET = new Set<AppRole>(['public', 'volunteer', 'coordinator', 'admin']);

export const normalizeRoles = (roles: string[]) =>
  Array.from(new Set(roles.filter((role): role is AppRole => KNOWN_ROLE_SET.has(role as AppRole))));

export const getCapabilitiesForRoles = (roles: string[]) => {
  const capabilities = new Set<Capability>();

  for (const role of normalizeRoles(roles)) {
    for (const capability of ROLE_CAPABILITIES[role]) {
      capabilities.add(capability);
    }
  }

  return Array.from(capabilities);
};

export const hasRequiredRoles = (roles: string[], requiredRoles?: string[]) => {
  if (!requiredRoles || requiredRoles.length === 0) {
    return true;
  }

  return requiredRoles.some((role) => roles.includes(role));
};

export const hasRequiredCapabilities = (roles: string[], requiredCapabilities?: Capability[]) => {
  if (!requiredCapabilities || requiredCapabilities.length === 0) {
    return true;
  }

  const granted = new Set(getCapabilitiesForRoles(roles));
  return requiredCapabilities.every((capability) => granted.has(capability));
};

export const canAccess = ({
  authenticated,
  roles,
  requirement,
}: {
  authenticated: boolean;
  roles: string[];
  requirement?: AccessRequirement;
}) => {
  const access = requirement ?? {};
  const requiresAuth = access.requiresAuth ?? true;

  if (requiresAuth && !authenticated) {
    return false;
  }

  if (!hasRequiredRoles(roles, access.requiredRoles)) {
    return false;
  }

  if (!hasRequiredCapabilities(roles, access.requiredCapabilities)) {
    return false;
  }

  return true;
};
