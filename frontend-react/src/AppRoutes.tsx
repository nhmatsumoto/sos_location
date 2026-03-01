import type { ReactElement } from 'react';
import App from './App';
import RescueOpsPage from './RescueOpsPage';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ControlCenterShell } from './components/layout/ControlCenterShell';

const withShell = (component: ReactElement) => <ControlCenterShell>{component}</ControlCenterShell>;

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/rescue" element={withShell(<RescueOpsPage />)} />
      <Route path="/support" element={withShell(<RescueOpsPage />)} />
      <Route path="/volunteers" element={withShell(<RescueOpsPage />)} />

      {/* Map/news experience keeps full-screen tactical layout */}
      <Route path="/hotspots" element={<App />} />
      <Route path="/news" element={<App />} />

      <Route path="/" element={<Navigate to="/rescue" replace />} />
      <Route path="*" element={<Navigate to="/rescue" replace />} />
    </Routes>
  );
}
