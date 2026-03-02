import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './AppRoutes';
import { frontendLogger } from './lib/logger';
import './index.css';
import 'leaflet/dist/leaflet.css';

window.addEventListener('error', (event) => {
  frontendLogger.error('Unhandled window error', {
    message: event.message,
    filename: event.filename,
    line: event.lineno,
    column: event.colno,
  });
});

window.addEventListener('unhandledrejection', (event) => {
  frontendLogger.error('Unhandled promise rejection', {
    reason: String(event.reason),
  });
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </StrictMode>,
);
