import { Suspense, lazy, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { LoadingScreen } from './components/common/LoadingScreen';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { useAuthStore } from './store/authStore';

// Lazy loaded pages
const PublicMapPage = lazy(() => import('./pages/PublicMapPage.tsx').then((m) => ({ default: m.PublicMapPage })));
const PublicIncidentDashboardPage = lazy(() => import('./pages/PublicIncidentDashboardPage.tsx').then((m) => ({ default: m.PublicIncidentDashboardPage })));
const SOSPage = lazy(() => import('./pages/SOSPage.tsx').then((m) => ({ default: m.SOSPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage.tsx').then((m) => ({ default: m.SettingsPage })));
const SplatScenePage = lazy(() => import('./pages/SplatScenePage.tsx').then((m) => ({ default: m.SplatScenePage })));
const VolunteerDashboardPage = lazy(() => import('./pages/VolunteerDashboardPage.tsx').then((m) => ({ default: m.VolunteerDashboardPage })));
const LogisticsPage = lazy(() => import('./pages/LogisticsPage.tsx').then((m) => ({ default: m.LogisticsPage })));
const RiskAssessmentPage = lazy(() => import('./pages/RiskAssessmentPage.tsx').then((m) => ({ default: m.RiskAssessmentPage })));
const SupportDashboardPage = lazy(() => import('./pages/SupportDashboardPage.tsx').then((m) => ({ default: m.SupportDashboardPage })));
const LoginPage = lazy(() => import('./pages/LoginPage.tsx').then((m) => ({ default: m.LoginPage })));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage.tsx').then((m) => ({ default: m.OnboardingPage })));
const ErrorPage = lazy(() => import('./pages/ErrorPage.tsx').then((m) => ({ default: m.ErrorPage })));

/**
 * PrivateLayout wraps protected routes with the AppShell.
 */
function PrivateLayout() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const location = useLocation();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const isSOS = location.pathname === '/app/sos';

  return (
    <div className="animate-in fade-in duration-700 ease-out">
      <AppShell 
        theme={theme} 
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        variant={isSOS ? 'tactical' : 'default'}
      >
        <Suspense fallback={<div style={{ padding: 16 }} className="text-slate-500 font-bold animate-pulse text-center">Iniciando painel de comando...</div>}>
          <Routes>
            <Route path="sos" element={<ProtectedRoute requiredRole="admin"><SOSPage /></ProtectedRoute>} />
            <Route path="settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="splat-scenes/:id" element={<ProtectedRoute><SplatScenePage /></ProtectedRoute>} />
             <Route path="splat-scenes" element={<ProtectedRoute><SplatScenePage /></ProtectedRoute>} />
            <Route path="volunteer" element={<ProtectedRoute><VolunteerDashboardPage /></ProtectedRoute>} />
            <Route path="logistics" element={<ProtectedRoute><LogisticsPage /></ProtectedRoute>} />
            <Route path="risk-assessment" element={<ProtectedRoute><RiskAssessmentPage /></ProtectedRoute>} />
            <Route path="support" element={<ProtectedRoute><SupportDashboardPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="sos" replace />} />
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
    <Routes>
      {/* Root Redirection */}
      <Route path="/" element={
        authenticated ? 
        <Navigate to="/app/sos" replace /> : 
        <Suspense fallback={<LoadingScreen />}><OnboardingPage /></Suspense>
      } />

      {/* Public Observation Routes */}
      <Route path="/map" element={<Suspense fallback={<LoadingScreen />}><PublicMapPage /></Suspense>} />
      <Route path="/transparency" element={<Suspense fallback={<LoadingScreen />}><PublicIncidentDashboardPage /></Suspense>} />
      
      {/* Compatibility Aliases */}
      <Route path="/public/map" element={<Navigate to="/map" replace />} />
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
  );
}
