import { Navigate, Route, Routes } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { CommandCenterPage } from './pages/CommandCenterPage';
import { HotspotsPage } from './pages/HotspotsPage';
import { MissingPersonsPage } from './pages/MissingPersonsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SearchedAreasPage } from './pages/SearchedAreasPage';
import { RescueSupportPage } from './pages/RescueSupportPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { IncidentDetailPage } from './pages/IncidentDetailPage';
import { SupportSimplePage } from './pages/SupportSimplePage';
import { RescueSearchAreasPage } from './pages/RescueSearchAreasPage';
import { RescueAssignmentsPage } from './pages/RescueAssignmentsPage';
import { PublicIncidentsPage } from './pages/PublicIncidentsPage';
import { PublicIncidentDashboardPage } from './pages/PublicIncidentDashboardPage';
import { SimulationsPage } from './pages/SimulationsPage';
import { DataHubPage } from './pages/DataHubPage';
import { SettingsPage } from './pages/SettingsPage';
import { IntegrationsPage } from './pages/IntegrationsPage';
import { GlobalDisastersPage } from './pages/GlobalDisastersPage';

export default function AppRoutes() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <AppShell theme={theme} onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}>
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
    </AppShell>
  );
}
