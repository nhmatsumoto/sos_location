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
      <Route path="/hotspots" element={withShell(<App />)} />
      <Route path="/news" element={withShell(<App />)} />
      <Route path="/support" element={withShell(<RescueOpsPage />)} />
      <Route path="/volunteers" element={withShell(<RescueOpsPage />)} />
      <Route path="/" element={<Navigate to="/rescue" replace />} />
      <Route path="*" element={<Navigate to="/rescue" replace />} />
    </Routes>
  );
}
