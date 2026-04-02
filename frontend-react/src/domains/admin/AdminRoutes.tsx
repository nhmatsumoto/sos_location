import { lazy, type ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import { useAuthStore } from '../../store/authStore';
import {
  ADMIN_HOME_ROUTE,
  APP_ROUTE_BY_ID,
  DEFAULT_PRIVATE_ROUTE,
  getFirstAccessibleRoute,
  type AppRouteGroup,
} from '../../lib/appRouteManifest';
import { DomainShellLayout } from '../layouts/DomainShellLayout';

const TacticalAdminPage = lazy(() => import('./pages/TacticalAdminPage.tsx'));
const DataSourceList = lazy(() => import('./pages/DataSourceList.tsx').then((m) => ({ default: m.DataSourceList })));

const ADMIN_NAV_GROUPS: AppRouteGroup[] = ['admin'];

const adminRouteElements: Array<{ routeId: string; element: ReactElement }> = [
  { routeId: 'tactical-approval', element: <TacticalAdminPage /> },
  { routeId: 'admin-sources', element: <DataSourceList /> },
];

function AdminIndexRedirect() {
  const authenticated = useAuthStore((state) => state.authenticated);
  const roles = useAuthStore((state) => state.roles);
  const firstAdminRoute = getFirstAccessibleRoute(authenticated, roles, { groups: [...ADMIN_NAV_GROUPS] });

  return <Navigate to={firstAdminRoute?.path ?? DEFAULT_PRIVATE_ROUTE} replace />;
}

export function AdminRoutes() {
  return (
    <DomainShellLayout
      fallbackText="Carregando centro administrativo..."
      navigationGroups={ADMIN_NAV_GROUPS}
      minimalTopbar
      showStatusStrip={false}
      sidebarSectionLabelKey="nav.admin"
    >
      <Routes>
        <Route
          path={ADMIN_HOME_ROUTE}
          element={
            <ProtectedRoute>
              <AdminIndexRedirect />
            </ProtectedRoute>
          }
        />

        {adminRouteElements.map(({ routeId, element }) => {
          const route = APP_ROUTE_BY_ID[routeId];

          return (
            <Route
              key={route.id}
              path={route.path}
              element={
                <ProtectedRoute
                  requiredRoles={route.requiredRoles}
                  requiredCapabilities={route.requiredCapabilities}
                >
                  {element}
                </ProtectedRoute>
              }
            />
          );
        })}

        <Route
          path="*"
          element={
            <ProtectedRoute>
              <AdminIndexRedirect />
            </ProtectedRoute>
          }
        />
      </Routes>
    </DomainShellLayout>
  );
}
