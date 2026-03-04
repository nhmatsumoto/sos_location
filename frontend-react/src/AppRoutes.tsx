import { Suspense, lazy, useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';

const CommandCenterPage = lazy(() => import('./pages/CommandCenterPage').then((m) => ({ default: m.CommandCenterPage })));
const HotspotsPage = lazy(() => import('./pages/HotspotsPage').then((m) => ({ default: m.HotspotsPage })));
const MissingPersonsPage = lazy(() => import('./pages/MissingPersonsPage').then((m) => ({ default: m.MissingPersonsPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const SearchedAreasPage = lazy(() => import('./pages/SearchedAreasPage').then((m) => ({ default: m.SearchedAreasPage })));
const RescueSupportPage = lazy(() => import('./pages/RescueSupportPage').then((m) => ({ default: m.RescueSupportPage })));
const IncidentsPage = lazy(() => import('./pages/IncidentsPage').then((m) => ({ default: m.IncidentsPage })));
const IncidentDetailPage = lazy(() => import('./pages/IncidentDetailPage').then((m) => ({ default: m.IncidentDetailPage })));
const SupportSimplePage = lazy(() => import('./pages/SupportSimplePage').then((m) => ({ default: m.SupportSimplePage })));
const RescueSearchAreasPage = lazy(() => import('./pages/RescueSearchAreasPage').then((m) => ({ default: m.RescueSearchAreasPage })));
const RescueAssignmentsPage = lazy(() => import('./pages/RescueAssignmentsPage').then((m) => ({ default: m.RescueAssignmentsPage })));
const PublicIncidentsPage = lazy(() => import('./pages/PublicIncidentsPage').then((m) => ({ default: m.PublicIncidentsPage })));
const PublicIncidentDashboardPage = lazy(() => import('./pages/PublicIncidentDashboardPage').then((m) => ({ default: m.PublicIncidentDashboardPage })));
const SimulationsPage = lazy(() => import('./pages/SimulationsPage').then((m) => ({ default: m.SimulationsPage })));
const DataHubPage = lazy(() => import('./pages/DataHubPage').then((m) => ({ default: m.DataHubPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const IntegrationsPage = lazy(() => import('./pages/IntegrationsPage').then((m) => ({ default: m.IntegrationsPage })));
const GlobalDisastersPage = lazy(() => import('./pages/GlobalDisastersPage').then((m) => ({ default: m.GlobalDisastersPage })));

export default function AppRoutes() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <AppShell theme={theme} onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}>
      <Suspense fallback={<div style={{ padding: 16 }}>Carregando módulo…</div>}>
        <Routes>
          <Route path="/command-center" element={<CommandCenterPage />} />
          <Route path="/hotspots" element={<HotspotsPage />} />
          <Route path="/missing-persons" element={<MissingPersonsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/searched-areas" element={<SearchedAreasPage />} />
          <Route path="/rescue-support" element={<RescueSupportPage />} />
          <Route path="/incidents" element={<IncidentsPage />} />
          <Route path="/incidents/:id" element={<IncidentDetailPage />} />
          <Route path="/incidents/:id/support/campaigns" element={<SupportSimplePage kind="campaigns" />} />
          <Route path="/incidents/:id/support/donations" element={<SupportSimplePage kind="donations" />} />
          <Route path="/incidents/:id/support/expenses" element={<SupportSimplePage kind="expenses" />} />
          <Route path="/incidents/:id/rescue/search-areas" element={<RescueSearchAreasPage />} />
          <Route path="/incidents/:id/rescue/assignments" element={<RescueAssignmentsPage />} />
          <Route path="/public" element={<PublicIncidentsPage />} />
          <Route path="/public/incidents/:id" element={<PublicIncidentDashboardPage />} />
          <Route path="/simulations" element={<SimulationsPage />} />
          <Route path="/data-hub" element={<DataHubPage />} />
          <Route path="/integrations" element={<IntegrationsPage />} />
          <Route path="/global-disasters" element={<GlobalDisastersPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/" element={<Navigate to="/command-center" replace />} />
          <Route path="*" element={<Navigate to="/command-center" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}
