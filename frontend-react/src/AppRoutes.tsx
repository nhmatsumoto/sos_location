import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { LoadingScreen } from './components/common/LoadingScreen';
import { Prefetcher } from './components/common/Prefetcher';
import { useAuthStore } from './store/authStore';
import {
  DEFAULT_PRIVATE_ROUTE,
  PUBLIC_TRANSPARENCY_ROUTE,
} from './lib/appRouteManifest';
import { OperationalRoutes } from './domains/operations/OperationalRoutes';
import { AdminRoutes } from './domains/admin/AdminRoutes';
import { SharedSettingsRoutes } from './domains/shared/SharedSettingsRoutes';

// Lazy loaded pages
const PublicIncidentDashboardPage = lazy(() => import('./domains/public/pages/PublicIncidentDashboardPage.tsx').then((m) => ({ default: m.PublicIncidentDashboardPage })));
const LandingPage = lazy(() => import('./domains/public/pages/LandingPage.tsx').then((m) => ({ default: m.LandingPage })));
const DocsIndexPage = lazy(() =>
  import('./domains/docs/pages/DocsIndexPage.tsx').then((m) => ({ default: m.DocsIndexPage })),
);
const LoginPage = lazy(() => import('./domains/auth/pages/LoginPage.tsx').then((m) => ({ default: m.LoginPage })));
const ErrorPage = lazy(() => import('./domains/system/pages/ErrorPage.tsx').then((m) => ({ default: m.ErrorPage })));
const PublicIncidentsPage = lazy(() => import('./domains/public/pages/PublicIncidentsPage.tsx').then((m) => ({ default: m.PublicIncidentsPage })));

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
        <Route path="/app/*" element={<OperationalRoutes />} />

        {/* Administrative Domain (Protected) */}
        <Route path="/admin/*" element={<AdminRoutes />} />

        {/* Shared Settings Domain (Protected) */}
        <Route path="/settings" element={<SharedSettingsRoutes />} />

        {/* System Routes */}
        <Route path="/error" element={<Suspense fallback={<LoadingScreen />}><ErrorPage /></Suspense>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
