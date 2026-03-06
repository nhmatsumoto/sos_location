import { Suspense, lazy, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { getSessionToken } from './lib/authSession';
import { LoginPage } from './pages/LoginPage';
import { LandingPage } from './pages/LandingPage';
import { PublicMapPage } from './pages/PublicMapPage';

const SOSPage = lazy(() => import('./pages/SOSPage').then((m) => ({ default: m.SOSPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const PublicIncidentDashboardPage = lazy(() => import('./pages/PublicIncidentDashboardPage').then((m) => ({ default: m.PublicIncidentDashboardPage })));
const SplatScenePage = lazy(() => import('./pages/SplatScenePage').then((m) => ({ default: m.SplatScenePage })));
function PrivateLayout() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const location = useLocation();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  if (!getSessionToken()) {
    return <Navigate to="/login" replace />;
  }

  const isSOS = location.pathname === '/app/sos';

  return (
    <AppShell 
      theme={theme} 
      onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
      variant={isSOS ? 'tactical' : 'default'}
    >
      <Suspense fallback={<div style={{ padding: 16 }}>Carregando módulo…</div>}>
        <Routes>
          <Route path="/app/sos" element={<SOSPage />} />
          <Route path="/app/war-room" element={<Navigate to="/app/sos" replace />} />
          <Route path="/app/command-center" element={<Navigate to="/app/sos" replace />} />
          <Route path="/app/global-disasters" element={<Navigate to="/app/sos" replace />} />
          <Route path="/app/operations" element={<Navigate to="/app/sos" replace />} />
          <Route path="/app/settings" element={<SettingsPage />} />
          <Route path="/app/splat-scenes/:id" element={<SplatScenePage />} />
          <Route path="/app/splat-scenes" element={<SplatScenePage />} />
          <Route path="*" element={<Navigate to="/app/sos" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/public/map" element={<PublicMapPage />} />
      <Route path="/public/transparency" element={<PublicIncidentDashboardPage />} />
      <Route path="/app/*" element={<PrivateLayout />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
