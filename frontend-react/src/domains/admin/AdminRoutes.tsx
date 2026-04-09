import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { AdminRouteShell } from '../../router/AdminRouteShell';
import {
  buildManagedDomainRoutes,
  type ManagedDomainRouteEntry,
} from '../../router/managedRoutes';
import { AdminIndexRedirect } from './components/AdminIndexRedirect';

const TacticalAdminPage = lazy(() => import('./pages/TacticalAdminPage.tsx'));
const DataSourceList = lazy(() =>
  import('./pages/DataSourceList.tsx').then((m) => ({ default: m.DataSourceList })),
);

const adminRouteEntries: ManagedDomainRouteEntry[] = [
  { routeId: 'tactical-approval', element: <TacticalAdminPage /> },
  { routeId: 'admin-sources', element: <DataSourceList /> },
];

export function getAdminRouteObject(): RouteObject {
  return {
    path: '/admin',
    element: <AdminRouteShell />,
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
