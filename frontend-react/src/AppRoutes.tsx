import App from './App';
import RescueOpsPage from './RescueOpsPage';
import { Navigate, Route, Routes } from 'react-router-dom';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/rescue" element={<RescueOpsPage />} />
      <Route path="/hotspots" element={<App />} />
      <Route path="/news" element={<App />} />
      <Route path="/support" element={<RescueOpsPage />} />
      <Route path="/volunteers" element={<RescueOpsPage />} />
      <Route path="/" element={<Navigate to="/rescue" replace />} />
      <Route path="*" element={<Navigate to="/rescue" replace />} />
    </Routes>
  );
}
