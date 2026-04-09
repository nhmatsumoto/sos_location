import { lazy } from 'react';
import { Navigate, type RouteObject } from 'react-router-dom';
import {
  SHARED_SETTINGS_ROUTE,
  type AppRouteGroup,
} from '../../lib/appRouteManifest';
import { ProtectedDomainRouteShell } from '../../router/ProtectedDomainRouteShell';
import {
  buildManagedDomainRoutes,
  type ManagedDomainRouteEntry,
} from '../../router/managedRoutes';

const SettingsPage = lazy(() =>
  import('./pages/SettingsPage.tsx').then((m) => ({ default: m.SettingsPage })),
);

const SETTINGS_NAV_GROUPS: AppRouteGroup[] = ['ops', 'intel', 'resources', 'admin', 'system'];

const settingsRouteEntries: ManagedDomainRouteEntry[] = [
  { routeId: 'settings', element: <SettingsPage /> },
];

export function getSharedSettingsRouteObject(): RouteObject {
  return {
    path: SHARED_SETTINGS_ROUTE,
    element: (
      <ProtectedDomainRouteShell
        fallbackText="Carregando central de configurações..."
        navigationGroups={SETTINGS_NAV_GROUPS}
      />
    ),
    children: [
      ...buildManagedDomainRoutes({
        basePath: SHARED_SETTINGS_ROUTE,
        entries: settingsRouteEntries,
      }),
      { path: '*', element: <Navigate to={SHARED_SETTINGS_ROUTE} replace /> },
    ],
  };
}
