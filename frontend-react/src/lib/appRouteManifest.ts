import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Cog,
  Coins,
  FileWarning,
  Globe,
  Heart,
  Layers3,
  LifeBuoy,
  PlugZap,
  Radar,
  Search,
  Settings,
  ShieldAlert,
  Truck,
  Users,
} from 'lucide-react';
import { canAccess, type AccessRequirement } from './accessControl';

export const DEFAULT_PRIVATE_ROUTE = '/app/overview';
export const LEGACY_OVERVIEW_ROUTE = '/app/sos';
export const PUBLIC_TRANSPARENCY_ROUTE = '/transparency';
export const SHARED_SETTINGS_ROUTE = '/settings';
export const ADMIN_HOME_ROUTE = '/admin';
export const ADMIN_APPROVALS_ROUTE = '/admin/approvals';
export const ADMIN_DATA_SOURCES_ROUTE = '/admin/data-sources';

export type AppRouteGroup = 'ops' | 'intel' | 'resources' | 'admin' | 'system';
export type AppRouteLayout = 'default' | 'tactical';

export interface AppRouteDefinition extends AccessRequirement {
  id: string;
  path: string;
  aliases?: string[];
  labelKey: string;
  icon: LucideIcon;
  group: AppRouteGroup;
  layout: AppRouteLayout;
  showInNavigation?: boolean;
}

export const APP_ROUTE_MANIFEST: AppRouteDefinition[] = [
  {
    id: 'overview',
    path: DEFAULT_PRIVATE_ROUTE,
    aliases: [LEGACY_OVERVIEW_ROUTE],
    labelKey: 'nav.monitor',
    icon: Radar,
    group: 'ops',
    layout: 'tactical',
  },
  {
    id: 'operational-map',
    path: '/app/operational-map',
    labelKey: 'nav.op_map',
    icon: Layers3,
    group: 'ops',
    layout: 'tactical',
  },
  {
    id: 'rescue-ops',
    path: '/app/rescue-ops',
    labelKey: 'nav.rescue_ops',
    icon: ShieldAlert,
    group: 'ops',
    layout: 'tactical',
  },
  {
    id: 'hotspots',
    path: '/app/hotspots',
    labelKey: 'nav.hotspots',
    icon: AlertTriangle,
    group: 'ops',
    layout: 'tactical',
  },
  {
    id: 'missing-persons',
    path: '/app/missing-persons',
    labelKey: 'nav.missing',
    icon: Users,
    group: 'ops',
    layout: 'tactical',
  },
  {
    id: 'incidents',
    path: '/app/incidents',
    labelKey: 'nav.incidents',
    icon: Activity,
    group: 'ops',
    layout: 'tactical',
  },
  {
    id: 'searched-areas',
    path: '/app/searched-areas',
    labelKey: 'nav.searched',
    icon: Search,
    group: 'ops',
    layout: 'tactical',
  },
  {
    id: 'rescue-support',
    path: '/app/rescue-support',
    labelKey: 'nav.rescue',
    icon: LifeBuoy,
    group: 'ops',
    layout: 'tactical',
  },
  {
    id: 'reports',
    path: '/app/reports',
    labelKey: 'nav.reports',
    icon: FileWarning,
    group: 'ops',
    layout: 'tactical',
  },
  {
    id: 'simulations',
    path: '/app/simulations',
    labelKey: 'nav.simulations',
    icon: BarChart3,
    group: 'intel',
    layout: 'tactical',
  },
  {
    id: 'data-hub',
    path: '/app/data-hub',
    labelKey: 'nav.datahub',
    icon: Layers3,
    group: 'intel',
    layout: 'tactical',
  },
  {
    id: 'integrations',
    path: '/app/integrations',
    labelKey: 'nav.integrations',
    icon: PlugZap,
    group: 'intel',
    layout: 'tactical',
    requiredCapabilities: ['integration.read'],
  },
  {
    id: 'global-disasters',
    path: '/app/global-disasters',
    labelKey: 'nav.global',
    icon: Globe,
    group: 'intel',
    layout: 'tactical',
  },
  {
    id: 'logistics',
    path: '/app/logistics',
    labelKey: 'nav.logistics',
    icon: Truck,
    group: 'resources',
    layout: 'tactical',
  },
  {
    id: 'volunteer',
    path: '/app/volunteer',
    labelKey: 'nav.volunteer',
    icon: Heart,
    group: 'resources',
    layout: 'tactical',
  },
  {
    id: 'risk-assessment',
    path: '/app/risk-assessment',
    labelKey: 'nav.risk',
    icon: ShieldAlert,
    group: 'resources',
    layout: 'tactical',
  },
  {
    id: 'support',
    path: '/app/support',
    labelKey: 'nav.support',
    icon: Coins,
    group: 'resources',
    layout: 'default',
  },
  {
    id: 'tactical-approval',
    path: ADMIN_APPROVALS_ROUTE,
    aliases: ['/app/tactical-approval'],
    labelKey: 'nav.approval',
    icon: ShieldAlert,
    group: 'admin',
    layout: 'default',
    requiredCapabilities: ['admin.approval'],
  },
  {
    id: 'admin-sources',
    path: ADMIN_DATA_SOURCES_ROUTE,
    aliases: ['/app/admin/sources'],
    labelKey: 'nav.sources',
    icon: Cog,
    group: 'admin',
    layout: 'default',
    requiredCapabilities: ['integration.write'],
  },
  {
    id: 'settings',
    path: SHARED_SETTINGS_ROUTE,
    aliases: ['/app/settings'],
    labelKey: 'nav.settings',
    icon: Settings,
    group: 'system',
    layout: 'default',
  },
];

export const APP_ROUTE_BY_ID = Object.fromEntries(
  APP_ROUTE_MANIFEST.map((route) => [route.id, route]),
) as Record<string, AppRouteDefinition>;

export const matchesAppRoute = (route: AppRouteDefinition, pathname: string) =>
  [route.path, ...(route.aliases ?? [])].includes(pathname);

export const findAppRouteByPath = (pathname: string) =>
  APP_ROUTE_MANIFEST.find((route) => matchesAppRoute(route, pathname)) ?? null;

export const isTacticalRoutePath = (pathname: string) =>
  findAppRouteByPath(pathname)?.layout === 'tactical';

export const toCanonicalAppPath = (pathname: string) =>
  findAppRouteByPath(pathname)?.path ?? pathname;

export const normalizeRedirectPath = (value: string | null) => {
  if (!value) return null;

  const trimmed = value.trim();

  if (!trimmed.startsWith('/')) return null;
  if (trimmed === '/' || trimmed === '/login') return null;
  if (trimmed === '/app' || trimmed === '/app/') return DEFAULT_PRIVATE_ROUTE;
  if (trimmed === ADMIN_HOME_ROUTE || trimmed === `${ADMIN_HOME_ROUTE}/`) return ADMIN_HOME_ROUTE;
  if (trimmed.includes('?') || trimmed.includes('#') || trimmed.includes('loggedOut')) return null;

  return toCanonicalAppPath(trimmed);
};

export const getVisibleNavigationRoutes = (
  authenticated: boolean,
  roles: string[],
  options?: { groups?: AppRouteGroup[] },
) =>
  APP_ROUTE_MANIFEST.filter((route) => {
    if (route.showInNavigation === false) {
      return false;
    }

    if (options?.groups && !options.groups.includes(route.group)) {
      return false;
    }

    return canAccess({
      authenticated,
      roles,
      requirement: route,
    });
  });

export const getFirstAccessibleRoute = (
  authenticated: boolean,
  roles: string[],
  options?: { groups?: AppRouteGroup[] },
) => getVisibleNavigationRoutes(authenticated, roles, options)[0] ?? null;
