import { Suspense, lazy, useMemo, type ReactElement } from 'react';
import { Navigate, useRoutes, type RouteObject } from 'react-router-dom';
import { LoadingScreen } from './components/common/LoadingScreen';
import { Prefetcher } from './components/common/Prefetcher';
import { useAuthStore } from './store/authStore';
import {
  DEFAULT_PRIVATE_ROUTE,
  PUBLIC_TRANSPARENCY_ROUTE,
} from './lib/appRouteManifest';
import { getOperationalRouteObject } from './domains/operations/OperationalRoutes';
import { getAdminRouteObject } from './domains/admin/AdminRoutes';
import { getSharedSettingsRouteObject } from './domains/shared/SharedSettingsRoutes';

// Lazy loaded pages
const PublicIncidentDashboardPage = lazy(() => import('./domains/public/pages/PublicIncidentDashboardPage.tsx').then((m) => ({ default: m.PublicIncidentDashboardPage })));
const LandingPage = lazy(() => import('./domains/public/pages/LandingPage.tsx').then((m) => ({ default: m.LandingPage })));
const DocsIndexPage = lazy(() =>
  import('./domains/docs/pages/DocsIndexPage.tsx').then((m) => ({ default: m.DocsIndexPage })),
);
const LoginPage = lazy(() => import('./domains/auth/pages/LoginPage.tsx').then((m) => ({ default: m.LoginPage })));
const ErrorPage = lazy(() => import('./domains/system/pages/ErrorPage.tsx').then((m) => ({ default: m.ErrorPage })));
const PublicIncidentsPage = lazy(() => import('./domains/public/pages/PublicIncidentsPage.tsx').then((m) => ({ default: m.PublicIncidentsPage })));

const withLoading = (element: ReactElement) => (
  <Suspense fallback={<LoadingScreen />}>{element}</Suspense>
);

export default function AppRoutes() {
  const authenticated = useAuthStore((state) => state.authenticated);

  const routes = useMemo<RouteObject[]>(
    () => [
      {
        path: '/',
        element: authenticated
          ? <Navigate to={DEFAULT_PRIVATE_ROUTE} replace />
          : withLoading(<LandingPage />),
      },
      {
        path: '/docs',
        element: withLoading(<DocsIndexPage />),
      },
      {
        path: PUBLIC_TRANSPARENCY_ROUTE,
        element: withLoading(<PublicIncidentsPage />),
      },
      {
        path: `${PUBLIC_TRANSPARENCY_ROUTE}/:id`,
        element: withLoading(<PublicIncidentDashboardPage />),
      },
      {
        path: '/public/incidents',
        element: <Navigate to={PUBLIC_TRANSPARENCY_ROUTE} replace />,
      },
      {
        path: '/public/incidents/:id',
        element: withLoading(<PublicIncidentDashboardPage />),
      },
      {
        path: '/public/transparency',
        element: <Navigate to={PUBLIC_TRANSPARENCY_ROUTE} replace />,
      },
      {
        path: '/login',
        element: authenticated
          ? <Navigate to={DEFAULT_PRIVATE_ROUTE} replace />
          : withLoading(<LoginPage />),
      },
      getOperationalRouteObject(),
      getAdminRouteObject(),
      getSharedSettingsRouteObject(),
      {
        path: '/error',
        element: withLoading(<ErrorPage />),
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
    [authenticated],
  );

  const element = useRoutes(routes);

  return (
    <>
      <Prefetcher />
      {element}
    </>
  );
}
