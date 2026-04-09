import { lazy } from 'react';
import { Navigate, type RouteObject } from 'react-router-dom';
import {
  SHARED_SETTINGS_ROUTE,
} from '../../lib/appRouteManifest';
import { SettingsRouteShell } from '../../router/SettingsRouteShell';
import {
  buildManagedDomainRoutes,
  type ManagedDomainRouteEntry,
} from '../../router/managedRoutes';

const SettingsPage = lazy(() =>
  import('./pages/SettingsPage.tsx').then((m) => ({ default: m.SettingsPage })),
);

const settingsRouteEntries: ManagedDomainRouteEntry[] = [
  { routeId: 'settings', element: <SettingsPage /> },
];

export function getSharedSettingsRouteObject(): RouteObject {
  return {
    path: SHARED_SETTINGS_ROUTE,
    element: <SettingsRouteShell />,
    children: [
      ...buildManagedDomainRoutes({
        basePath: SHARED_SETTINGS_ROUTE,
        entries: settingsRouteEntries,
      }),
      { path: '*', element: <Navigate to={SHARED_SETTINGS_ROUTE} replace /> },
    ],
  };
}
