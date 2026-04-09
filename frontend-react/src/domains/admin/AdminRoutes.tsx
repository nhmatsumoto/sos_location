import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import {
  type AppRouteGroup,
} from '../../lib/appRouteManifest';
import { ProtectedDomainRouteShell } from '../../router/ProtectedDomainRouteShell';
import {
  buildManagedDomainRoutes,
  type ManagedDomainRouteEntry,
} from '../../router/managedRoutes';
import { AdminIndexRedirect } from './components/AdminIndexRedirect';

const TacticalAdminPage = lazy(() => import('./pages/TacticalAdminPage.tsx'));
const DataSourceList = lazy(() =>
  import('./pages/DataSourceList.tsx').then((m) => ({ default: m.DataSourceList })),
);

const ADMIN_NAV_GROUPS: AppRouteGroup[] = ['admin'];

const adminRouteEntries: ManagedDomainRouteEntry[] = [
  { routeId: 'tactical-approval', element: <TacticalAdminPage /> },
  { routeId: 'admin-sources', element: <DataSourceList /> },
];

export function getAdminRouteObject(): RouteObject {
  return {
    path: '/admin',
    element: (
      <ProtectedDomainRouteShell
        fallbackText="Carregando centro administrativo..."
        navigationGroups={ADMIN_NAV_GROUPS}
        minimalTopbar
        showStatusStrip={false}
        sidebarSectionLabelKey="nav.admin"
      />
    ),
    children: [
      { index: true, element: <AdminIndexRedirect /> },
      ...buildManagedDomainRoutes({
        basePath: '/admin',
        entries: adminRouteEntries,
      }),
      { path: '*', element: <AdminIndexRedirect /> },
    ],
  };
}
