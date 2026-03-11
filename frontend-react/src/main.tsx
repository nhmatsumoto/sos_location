import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './AppRoutes';
import { NotificationsProvider } from './context/NotificationsContext';
import { frontendLogger } from './lib/logger';
import './index.css';
import './i18n';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';


// Fix for Leaflet default icon 404s in bundled apps
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

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

import { initKeycloak } from './lib/keycloak';
import { LoadingScreen } from './components/common/LoadingScreen';

const root = createRoot(document.getElementById('root')!);

// Render loading screen immediately
root.render(<LoadingScreen />);

const renderApp = () => {
  root.render(
    <StrictMode>
      <NotificationsProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </NotificationsProvider>
    </StrictMode>,
  );
};

// Start initialization
initKeycloak(renderApp);

if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      frontendLogger.info('ServiceWorker registered', { scope: registration.scope });
    }).catch((err) => {
      // In development, SW often fails due to self-signed certs or non-secure origins like 0.0.0.0
      // We log as debug to avoid cluttering the console while still allowing tracing if needed
      frontendLogger.debug('ServiceWorker registration skipped/failed', { error: err.message });
    });
  });
}
