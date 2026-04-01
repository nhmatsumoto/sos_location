import { Suspense, lazy, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { LoadingScreen } from './components/common/LoadingScreen';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Prefetcher } from './components/common/Prefetcher';
import { useAuthStore } from './store/authStore';

// Lazy loaded pages
const PublicIncidentDashboardPage = lazy(() => import('./pages/PublicIncidentDashboardPage.tsx').then((m) => ({ default: m.PublicIncidentDashboardPage })));
const LandingPage = lazy(() => import('./pages/LandingPage.tsx').then((m) => ({ default: m.LandingPage })));
const DocsIndexPage = lazy(() => import('./pages/DocsIndexPage.tsx').then((m) => ({ default: m.DocsIndexPage })));
const SOSPage = lazy(() => import('./pages/SOSPage.tsx').then((m) => ({ default: m.SOSPage })));
// SOSPage restored — /app/sos renders the tactical war room
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

const TacticalAdminPage = lazy(() => import('./pages/TacticalAdminPage.tsx'));

/**
 * PrivateLayout wraps protected routes with the AppShell.
 */
function PrivateLayout() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const location = useLocation();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Pages that need full-viewport layout (tactical variant = NavigationRail + no grid padding)
  const TACTICAL_ROUTES = [
    '/app/sos',
    '/app/simulations',
    '/app/volunteer',
    '/app/global-disasters',
    '/app/tactical-approval',
    '/app/logistics',
    '/app/risk-assessment',
    '/app/hotspots',
    '/app/incidents',
    '/app/reports',
    '/app/searched-areas',
    '/app/rescue-support',
    '/app/data-hub',
    '/app/integrations',
    '/app/missing-persons'
  ];
  const isTactical = TACTICAL_ROUTES.includes(location.pathname);
  const navigationMode = 'expanded';

  return (
    <div className="animate-in fade-in duration-700 ease-out">
      <AppShell
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        variant={isTactical ? 'tactical' : 'default'}
        navigationMode={navigationMode}
      >
        <Suspense fallback={<div style={{ padding: 16 }} className="text-slate-500 font-bold animate-pulse text-center">Iniciando painel de comando...</div>}>
          <Routes>
            <Route path="/app/sos" element={<ProtectedRoute><SOSPage /></ProtectedRoute>} />
            <Route path="/app/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="/app/volunteer" element={<ProtectedRoute><VolunteerDashboardPage /></ProtectedRoute>} />
            <Route path="/app/logistics" element={<ProtectedRoute><LogisticsPage /></ProtectedRoute>} />
            <Route path="/app/risk-assessment" element={<ProtectedRoute><RiskAssessmentPage /></ProtectedRoute>} />
            <Route path="/app/support" element={<ProtectedRoute><SupportDashboardPage /></ProtectedRoute>} />
            <Route path="/app/admin/sources" element={<ProtectedRoute requiredRole="admin"><DataSourceList /></ProtectedRoute>} />
            <Route path="/app/hotspots" element={<ProtectedRoute><HotspotsPage /></ProtectedRoute>} />
            <Route path="/app/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
            <Route path="/app/searched-areas" element={<ProtectedRoute><SearchedAreasPage /></ProtectedRoute>} />
            <Route path="/app/rescue-support" element={<ProtectedRoute><RescueSupportPage /></ProtectedRoute>} />
            <Route path="/app/incidents" element={<ProtectedRoute><IncidentsPage /></ProtectedRoute>} />
            <Route path="/app/simulations" element={<ProtectedRoute><SimulationsPage /></ProtectedRoute>} />
            <Route path="/app/data-hub" element={<ProtectedRoute><DataHubPage /></ProtectedRoute>} />
            <Route path="/app/integrations" element={<ProtectedRoute><IntegrationsPage /></ProtectedRoute>} />
            <Route path="/app/missing-persons" element={<ProtectedRoute><MissingPersonsPage /></ProtectedRoute>} />
            <Route path="/app/global-disasters" element={<ProtectedRoute><GlobalDisastersPage /></ProtectedRoute>} />
            <Route path="/app/rescue-ops" element={<ProtectedRoute><RescueOpsPage /></ProtectedRoute>} />
            <Route path="/app/operational-map" element={<ProtectedRoute><OperationalMapPage /></ProtectedRoute>} />
            <Route path="/app/tactical-approval" element={<ProtectedRoute requiredRole="admin"><TacticalAdminPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/app/sos" replace />} />
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
  const { authenticated } = useAuthStore();

  return (
    <>
      <Prefetcher />
      <Routes>
        {/* Landing Page — entry point for all unauthenticated users */}
        <Route path="/" element={
          authenticated ?
            <Navigate to="/app/sos" replace /> :
            <Suspense fallback={<LoadingScreen />}><LandingPage /></Suspense>
        } />

        {/* Documentation */}
        <Route path="/docs" element={<Suspense fallback={<LoadingScreen />}><DocsIndexPage /></Suspense>} />

        {/* Public Observation Routes */}
        <Route path="/transparency" element={<Suspense fallback={<LoadingScreen />}><PublicIncidentDashboardPage /></Suspense>} />

        {/* Compatibility Aliases */}
        <Route path="/public/transparency" element={<Navigate to="/transparency" replace />} />

        {/* Auth Routes */}
        <Route path="/login" element={
          authenticated ?
            <Navigate to="/app/sos" replace /> :
            <Suspense fallback={<LoadingScreen />}><LoginPage /></Suspense>
        } />

        {/* Operational Domain (Protected) */}
        <Route path="/app/*" element={<PrivateLayout />} />

        {/* System Routes */}
        <Route path="/error" element={<Suspense fallback={<LoadingScreen />}><ErrorPage /></Suspense>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
