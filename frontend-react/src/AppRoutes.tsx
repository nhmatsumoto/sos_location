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
import { SimulationsPage } from './pages/SimulationsPage';
import { DataHubPage } from './pages/DataHubPage';
import { SettingsPage } from './pages/SettingsPage';

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
        <Route path="/simulations" element={<SimulationsPage />} />
        <Route path="/data-hub" element={<DataHubPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/" element={<Navigate to="/command-center" replace />} />
        <Route path="*" element={<Navigate to="/command-center" replace />} />
      </Routes>
    </AppShell>
  );
}
