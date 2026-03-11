import { Suspense, lazy, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { PublicMapPage } from './pages/PublicMapPage';
import { ErrorPage } from './pages/ErrorPage';
import { keycloak } from './lib/keycloak';
import { LoadingScreen } from './components/common/LoadingScreen';

const SOSPage = lazy(() => import('./pages/SOSPage').then((m) => ({ default: m.SOSPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const PublicIncidentDashboardPage = lazy(() => import('./pages/PublicIncidentDashboardPage').then((m) => ({ default: m.PublicIncidentDashboardPage })));
const SplatScenePage = lazy(() => import('./pages/SplatScenePage').then((m) => ({ default: m.SplatScenePage })));
const VolunteerDashboardPage = lazy(() => import('./pages/VolunteerDashboardPage').then((m) => ({ default: m.VolunteerDashboardPage })));
const LogisticsPage = lazy(() => import('./pages/LogisticsPage.tsx').then((m) => ({ default: m.LogisticsPage })));
const RiskAssessmentPage = lazy(() => import('./pages/RiskAssessmentPage.tsx').then((m) => ({ default: m.RiskAssessmentPage })));
const SupportDashboardPage = lazy(() => import('./pages/SupportDashboardPage.tsx').then((m) => ({ default: m.SupportDashboardPage })));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage').then((m) => ({ default: m.OnboardingPage })));
function PrivateLayout() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const location = useLocation();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const isOnboardingComplete = localStorage.getItem('onboarding_complete') === 'true';

  if (!isOnboardingComplete && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  // Redirection to login if not authenticated
  if (!keycloak.authenticated) {
    keycloak.login();
    return <LoadingScreen message="Redirecionando para o portal de acesso..." />;
  }

  const isSOS = location.pathname === '/app/sos';

  return (
    <div className="animate-in fade-in duration-700 ease-out">
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
          <Route path="/app/volunteer" element={<VolunteerDashboardPage />} />
          <Route path="/app/logistics" element={<LogisticsPage />} />
          <Route path="/app/risk-assessment" element={<RiskAssessmentPage />} />
          <Route path="/app/support" element={<SupportDashboardPage />} />
          <Route path="*" element={<Navigate to="/app/sos" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  </div>
);
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PublicMapPage />} />
      <Route path="/public/map" element={<Navigate to="/" replace />} />
      <Route path="/public/transparency" element={<PublicIncidentDashboardPage />} />
      <Route path="/error" element={<ErrorPage />} />
      <Route path="/onboarding" element={<Suspense fallback={<LoadingScreen />}><OnboardingPage /></Suspense>} />
      <Route path="/app/*" element={<PrivateLayout />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
