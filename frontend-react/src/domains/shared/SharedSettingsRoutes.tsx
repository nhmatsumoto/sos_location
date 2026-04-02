import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import { SHARED_SETTINGS_ROUTE, type AppRouteGroup } from '../../lib/appRouteManifest';
import { DomainShellLayout } from '../layouts/DomainShellLayout';

const SettingsPage = lazy(() => import('./pages/SettingsPage.tsx').then((m) => ({ default: m.SettingsPage })));

const SETTINGS_NAV_GROUPS: AppRouteGroup[] = ['ops', 'intel', 'resources', 'admin', 'system'];

export function SharedSettingsRoutes() {
  return (
    <DomainShellLayout
      fallbackText="Carregando central de configurações..."
      navigationGroups={SETTINGS_NAV_GROUPS}
    >
      <Routes>
        <Route
          path={SHARED_SETTINGS_ROUTE}
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </DomainShellLayout>
  );
}
