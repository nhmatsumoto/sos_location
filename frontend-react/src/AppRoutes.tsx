import { Suspense, lazy, useEffect, useState, type ReactElement } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { LoadingScreen } from './components/common/LoadingScreen';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Prefetcher } from './components/common/Prefetcher';
import { useAuthStore } from './store/authStore';
import {
  ADMIN_APPROVALS_ROUTE,
  ADMIN_HOME_ROUTE,
  APP_ROUTE_BY_ID,
  APP_ROUTE_MANIFEST,
  DEFAULT_PRIVATE_ROUTE,
  PUBLIC_TRANSPARENCY_ROUTE,
  getFirstAccessibleRoute,
  isTacticalRoutePath,
} from './lib/appRouteManifest';
import type { AppRouteGroup } from './lib/appRouteManifest';

// Lazy loaded pages
const PublicIncidentDashboardPage = lazy(() => import('./pages/PublicIncidentDashboardPage.tsx').then((m) => ({ default: m.PublicIncidentDashboardPage })));
const LandingPage = lazy(() => import('./pages/LandingPage.tsx').then((m) => ({ default: m.LandingPage })));
const DocsIndexPage = lazy(() => import('./pages/DocsIndexPage.tsx').then((m) => ({ default: m.DocsIndexPage })));
const SOSPage = lazy(() => import('./pages/SOSPage.tsx').then((m) => ({ default: m.SOSPage })));
// SOSPage remains the operational overview while /app/sos stays as a legacy alias.
const SettingsPage = lazy(() => import('./pages/SettingsPage.tsx').then((m) => ({ default: m.SettingsPage })));
const VolunteerDashboardPage = lazy(() => import('./pages/VolunteerDashboardPage.tsx').then((m) => ({ default: m.VolunteerDashboardPage })));
const LogisticsPage = lazy(() => import('./pages/LogisticsPage.tsx').then((m) => ({ default: m.LogisticsPage })));
const RiskAssessmentPage = lazy(() => import('./pages/RiskAssessmentPage.tsx').then((m) => ({ default: m.RiskAssessmentPage })));
const SupportDashboardPage = lazy(() => import('./pages/SupportDashboardPage.tsx').then((m) => ({ default: m.SupportDashboardPage })));
const LoginPage = lazy(() => import('./pages/LoginPage.tsx').then((m) => ({ default: m.LoginPage })));
const ErrorPage = lazy(() => import('./pages/ErrorPage.tsx').then((m) => ({ default: m.ErrorPage })));
const DataSourceList = lazy(() => import('./pages/admin/DataSourceList.tsx').then((m) => ({ default: m.DataSourceList })));
const HotspotsPage = lazy(() => import('./pages/HotspotsPage.tsx').then((m) => ({ default: m.HotspotsPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage.tsx').then((m) => ({ default: m.ReportsPage })));
const SearchedAreasPage = lazy(() => import('./pages/SearchedAreasPage.tsx').then((m) => ({ default: m.SearchedAreasPage })));
const RescueSupportPage = lazy(() => import('./pages/RescueSupportPage.tsx').then((m) => ({ default: m.RescueSupportPage })));
const IncidentsPage = lazy(() => import('./pages/IncidentsPage.tsx').then((m) => ({ default: m.IncidentsPage })));
const SimulationsPage = lazy(() => import('./pages/SimulationsPage.tsx').then((m) => ({ default: m.SimulationsPage })));
const DataHubPage = lazy(() => import('./pages/DataHubPage.tsx').then((m) => ({ default: m.DataHubPage })));
const IntegrationsPage = lazy(() => import('./pages/IntegrationsPage.tsx').then((m) => ({ default: m.IntegrationsPage })));
const MissingPersonsPage = lazy(() => import('./pages/MissingPersonsPage.tsx').then((m) => ({ default: m.MissingPersonsPage })));
const GlobalDisastersPage = lazy(() => import('./pages/GlobalDisastersPage.tsx').then((m) => ({ default: m.GlobalDisastersPage })));
const RescueOpsPage = lazy(() => import('./pages/RescueOpsPage.tsx').then((m) => ({ default: m.RescueOpsPage })));
const OperationalMapPage = lazy(() => import('./pages/OperationalMapPage.tsx').then((m) => ({ default: m.default })));
const PublicIncidentsPage = lazy(() => import('./pages/PublicIncidentsPage.tsx').then((m) => ({ default: m.PublicIncidentsPage })));

const TacticalAdminPage = lazy(() => import('./pages/TacticalAdminPage.tsx'));

const OPERATIONAL_NAV_GROUPS: AppRouteGroup[] = ['ops', 'intel', 'resources', 'system'];
const ADMIN_NAV_GROUPS: AppRouteGroup[] = ['admin'];

const privateRouteElements: Array<{ routeId: string; element: ReactElement }> = [
  { routeId: 'overview', element: <SOSPage /> },
  { routeId: 'settings', element: <SettingsPage /> },
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

function OperationalLayout() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const location = useLocation();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const isTactical = isTacticalRoutePath(location.pathname);
  const navigationMode = 'expanded';

  return (
    <div className="animate-in fade-in duration-700 ease-out">
      <AppShell
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        variant={isTactical ? 'tactical' : 'default'}
        navigationMode={navigationMode}
        navigationGroups={[...OPERATIONAL_NAV_GROUPS]}
      >
        <Suspense fallback={<div style={{ padding: 16 }} className="text-slate-500 font-bold animate-pulse text-center">Iniciando painel de comando...</div>}>
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
        </Suspense>
      </AppShell>
    </div>
  );
}

function AdminLayout() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <div className="animate-in fade-in duration-700 ease-out">
      <AppShell
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        variant="default"
        navigationGroups={[...ADMIN_NAV_GROUPS]}
        minimalTopbar
        showStatusStrip={false}
        sidebarSectionLabelKey="nav.admin"
      >
        <Suspense fallback={<div style={{ padding: 16 }} className="text-slate-500 font-bold animate-pulse text-center">Carregando centro administrativo...</div>}>
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

            <Route path="*" element={<Navigate to={ADMIN_APPROVALS_ROUTE} replace />} />
          </Routes>
        </Suspense>
      </AppShell>
    </div>
  );
}

/**
 * Global application routing configuration.
 */
export default function AppRoutes() {
  const authenticated = useAuthStore((state) => state.authenticated);

  return (
    <>
      <Prefetcher />
      <Routes>
        {/* Landing Page — entry point for all unauthenticated users */}
        <Route path="/" element={
          authenticated ?
            <Navigate to={DEFAULT_PRIVATE_ROUTE} replace /> :
            <Suspense fallback={<LoadingScreen />}><LandingPage /></Suspense>
        } />

        {/* Documentation */}
        <Route path="/docs" element={<Suspense fallback={<LoadingScreen />}><DocsIndexPage /></Suspense>} />

        {/* Public Observation Routes */}
        <Route path={PUBLIC_TRANSPARENCY_ROUTE} element={<Suspense fallback={<LoadingScreen />}><PublicIncidentsPage /></Suspense>} />
        <Route path={`${PUBLIC_TRANSPARENCY_ROUTE}/:id`} element={<Suspense fallback={<LoadingScreen />}><PublicIncidentDashboardPage /></Suspense>} />
        <Route path="/public/incidents" element={<Navigate to={PUBLIC_TRANSPARENCY_ROUTE} replace />} />
        <Route path="/public/incidents/:id" element={<Suspense fallback={<LoadingScreen />}><PublicIncidentDashboardPage /></Suspense>} />

        {/* Compatibility Aliases */}
        <Route path="/public/transparency" element={<Navigate to={PUBLIC_TRANSPARENCY_ROUTE} replace />} />

        {/* Auth Routes */}
        <Route path="/login" element={
          authenticated ?
            <Navigate to={DEFAULT_PRIVATE_ROUTE} replace /> :
            <Suspense fallback={<LoadingScreen />}><LoginPage /></Suspense>
        } />

        {/* Operational Domain (Protected) */}
        <Route path="/app/*" element={<OperationalLayout />} />

        {/* Administrative Domain (Protected) */}
        <Route path="/admin/*" element={<AdminLayout />} />

        {/* System Routes */}
        <Route path="/error" element={<Suspense fallback={<LoadingScreen />}><ErrorPage /></Suspense>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
