import { describe, expect, it } from 'vitest';
import { canAccess, getCapabilitiesForRoles } from './accessControl';
import {
  ADMIN_APPROVALS_ROUTE,
  DEFAULT_PRIVATE_ROUTE,
  SHARED_SETTINGS_ROUTE,
  getFirstAccessibleRoute,
  getVisibleNavigationRoutes,
  normalizeRedirectPath,
} from './appRouteManifest';

describe('accessControl', () => {
  it('derives capabilities from the current roles without duplicates', () => {
    const capabilities = getCapabilitiesForRoles(['coordinator', 'admin', 'admin']);

    expect(capabilities).toContain('incident.read');
    expect(capabilities).toContain('resource.manage');
    expect(capabilities).toContain('admin.approval');
    expect(capabilities.filter((capability) => capability === 'incident.read')).toHaveLength(1);
  });

  it('blocks authenticated routes when the user is not logged in', () => {
    expect(
      canAccess({
        authenticated: false,
        roles: ['admin'],
        requirement: { requiredCapabilities: ['admin.approval'] },
      }),
    ).toBe(false);
  });

  it('grants access only when all required capabilities are present', () => {
    expect(
      canAccess({
        authenticated: true,
        roles: ['volunteer'],
        requirement: { requiredCapabilities: ['map.operate'] },
      }),
    ).toBe(true);

    expect(
      canAccess({
        authenticated: true,
        roles: ['volunteer'],
        requirement: { requiredCapabilities: ['integration.read'] },
      }),
    ).toBe(false);
  });
});

describe('appRouteManifest', () => {
  it('normalizes legacy aliases to canonical routes', () => {
    expect(normalizeRedirectPath('/app/sos')).toBe(DEFAULT_PRIVATE_ROUTE);
    expect(normalizeRedirectPath('/app/settings')).toBe(SHARED_SETTINGS_ROUTE);
    expect(normalizeRedirectPath('/app/tactical-approval')).toBe(ADMIN_APPROVALS_ROUTE);
  });

  it('rejects unsafe redirect targets', () => {
    expect(normalizeRedirectPath('https://malicious.example')).toBeNull();
    expect(normalizeRedirectPath('/login')).toBeNull();
    expect(normalizeRedirectPath('/?loggedOut=true')).toBeNull();
  });

  it('filters navigation by access and group', () => {
    const volunteerRoutes = getVisibleNavigationRoutes(true, ['volunteer']);
    const adminRoutes = getVisibleNavigationRoutes(true, ['admin'], { groups: ['admin'] });

    expect(volunteerRoutes.some((route) => route.id === 'integrations')).toBe(false);
    expect(volunteerRoutes.some((route) => route.id === 'settings')).toBe(true);
    expect(adminRoutes.map((route) => route.id)).toEqual(['tactical-approval', 'admin-sources']);
  });

  it('returns the first accessible admin route for admin users', () => {
    const firstAdminRoute = getFirstAccessibleRoute(true, ['admin'], { groups: ['admin'] });
    expect(firstAdminRoute?.path).toBe(ADMIN_APPROVALS_ROUTE);
  });
});
