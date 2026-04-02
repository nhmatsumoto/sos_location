import { lazy, type ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import {
  APP_ROUTE_BY_ID,
  APP_ROUTE_MANIFEST,
  DEFAULT_PRIVATE_ROUTE,
  type AppRouteGroup,
} from '../../lib/appRouteManifest';
import { DomainShellLayout } from '../layouts/DomainShellLayout';

const SOSPage = lazy(() => import('./pages/SOSPage.tsx').then((m) => ({ default: m.SOSPage })));
const VolunteerDashboardPage = lazy(() => import('../../pages/VolunteerDashboardPage.tsx').then((m) => ({ default: m.VolunteerDashboardPage })));
const LogisticsPage = lazy(() => import('../../pages/LogisticsPage.tsx').then((m) => ({ default: m.LogisticsPage })));
const RiskAssessmentPage = lazy(() => import('../../pages/RiskAssessmentPage.tsx').then((m) => ({ default: m.RiskAssessmentPage })));
const SupportDashboardPage = lazy(() => import('../../pages/SupportDashboardPage.tsx').then((m) => ({ default: m.SupportDashboardPage })));
const HotspotsPage = lazy(() => import('../../pages/HotspotsPage.tsx').then((m) => ({ default: m.HotspotsPage })));
const ReportsPage = lazy(() => import('../../pages/ReportsPage.tsx').then((m) => ({ default: m.ReportsPage })));
const SearchedAreasPage = lazy(() => import('../../pages/SearchedAreasPage.tsx').then((m) => ({ default: m.SearchedAreasPage })));
const RescueSupportPage = lazy(() => import('../../pages/RescueSupportPage.tsx').then((m) => ({ default: m.RescueSupportPage })));
const IncidentsPage = lazy(() => import('../../pages/IncidentsPage.tsx').then((m) => ({ default: m.IncidentsPage })));
const SimulationsPage = lazy(() => import('../../pages/SimulationsPage.tsx').then((m) => ({ default: m.SimulationsPage })));
const DataHubPage = lazy(() => import('../../pages/DataHubPage.tsx').then((m) => ({ default: m.DataHubPage })));
const IntegrationsPage = lazy(() => import('../../pages/IntegrationsPage.tsx').then((m) => ({ default: m.IntegrationsPage })));
const MissingPersonsPage = lazy(() => import('../../pages/MissingPersonsPage.tsx').then((m) => ({ default: m.MissingPersonsPage })));
const GlobalDisastersPage = lazy(() => import('../../pages/GlobalDisastersPage.tsx').then((m) => ({ default: m.GlobalDisastersPage })));
const RescueOpsPage = lazy(() => import('../../pages/RescueOpsPage.tsx').then((m) => ({ default: m.RescueOpsPage })));
const OperationalMapPage = lazy(() => import('../../pages/OperationalMapPage.tsx').then((m) => ({ default: m.default })));

const OPERATIONAL_NAV_GROUPS: AppRouteGroup[] = ['ops', 'intel', 'resources', 'system'];

const privateRouteElements: Array<{ routeId: string; element: ReactElement }> = [
  { routeId: 'overview', element: <SOSPage /> },
  { routeId: 'volunteer', element: <VolunteerDashboardPage /> },
  { routeId: 'logistics', element: <LogisticsPage /> },
  { routeId: 'risk-assessment', element: <RiskAssessmentPage /> },
  { routeId: 'support', element: <SupportDashboardPage /> },
  { routeId: 'hotspots', element: <HotspotsPage /> },
  { routeId: 'reports', element: <ReportsPage /> },
  { routeId: 'searched-areas', element: <SearchedAreasPage /> },
  { routeId: 'rescue-support', element: <RescueSupportPage /> },
  { routeId: 'incidents', element: <IncidentsPage /> },
  { routeId: 'simulations', element: <SimulationsPage /> },
  { routeId: 'data-hub', element: <DataHubPage /> },
  { routeId: 'integrations', element: <IntegrationsPage /> },
  { routeId: 'missing-persons', element: <MissingPersonsPage /> },
  { routeId: 'global-disasters', element: <GlobalDisastersPage /> },
  { routeId: 'rescue-ops', element: <RescueOpsPage /> },
  { routeId: 'operational-map', element: <OperationalMapPage /> },
];

export function OperationalRoutes() {
  return (
    <DomainShellLayout
      fallbackText="Iniciando painel de comando..."
      navigationGroups={OPERATIONAL_NAV_GROUPS}
      navigationMode="expanded"
      tacticalAware
    >
      <Routes>
        {privateRouteElements.map(({ routeId, element }) => {
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

        {APP_ROUTE_MANIFEST.flatMap((route) =>
          (route.aliases ?? [])
            .filter((alias) => alias.startsWith('/app/'))
            .map((alias) => (
              <Route
                key={`${route.id}:${alias}`}
                path={alias}
                element={
                  <ProtectedRoute
                    requiredRoles={route.requiredRoles}
                    requiredCapabilities={route.requiredCapabilities}
                  >
                    <Navigate to={route.path} replace />
                  </ProtectedRoute>
                }
              />
            )),
        )}

        <Route path="*" element={<Navigate to={DEFAULT_PRIVATE_ROUTE} replace />} />
      </Routes>
    </DomainShellLayout>
  );
}
