import Keycloak from 'keycloak-js';
import { frontendLogger } from './logger';
import { useAuthStore } from '../store/authStore';

// --- KEYCLOAK INITIALIZATION ---
const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_URL || 'https://localhost:8080',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'sos-location',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'sos-location-frontend'
};

export const keycloak = new Keycloak(keycloakConfig);

export const getRoles = () => {
  return keycloak.realmAccess?.roles || [];
};

export const getUserInfo = () => {
  return {
    name: keycloak.tokenParsed?.name,
    email: keycloak.tokenParsed?.email,
    preferredUsername: keycloak.tokenParsed?.preferred_username,
  };
};

const syncAuthStore = () => {
  const { setAuth } = useAuthStore.getState();
  if (keycloak.authenticated) {
    setAuth(true, getUserInfo(), getRoles(), keycloak.token || null);
  } else {
    setAuth(false, null, [], null);
  }
};

export const initKeycloak = async (onAuthenticatedCallback: () => void) => {
  try {
    const authenticated = await keycloak.init({
      onLoad: 'check-sso',
      checkLoginIframe: false,
      pkceMethod: 'S256',
      silentCheckSsoRedirectUri: import.meta.env.VITE_KEYCLOAK_SILENT_CHECK_SSO_REDIRECT_URI || (window.location.origin + '/silent-check-sso.html'),
    });

    frontendLogger.info('Keycloak initialized', { authenticated });
    
    syncAuthStore();

    if (authenticated) {
      frontendLogger.info('Keycloak authenticated successfully', { roles: getRoles() });
      
      // Store token for legacy/existing apiClient uses
      if (keycloak.token) {
        localStorage.setItem('sos_location_token', keycloak.token);
      }
      
      // Handle post-login redirect
      const redirectPath = localStorage.getItem('sos_login_redirect');
      if (redirectPath) {
        localStorage.removeItem('sos_login_redirect');
        window.history.replaceState({}, '', redirectPath);
      }
      
      // Token refresh logic
      keycloak.onTokenExpired = () => {
        keycloak.updateToken(30).then((refreshed) => {
          if (refreshed) {
            frontendLogger.info('Token refreshed successfully');
            localStorage.setItem('sos_location_token', keycloak.token!);
            syncAuthStore();
          }
        }).catch(() => {
          frontendLogger.error('Failed to refresh token');
          localStorage.setItem('sos_login_redirect', window.location.pathname);
          useAuthStore.getState().clearAuth();
          keycloak.login();
        });
      };
    } else {
      frontendLogger.info('Keycloak: not authenticated (public access)');
    }

    onAuthenticatedCallback();
  } catch (error) {
    if (!window.isSecureContext) {
      frontendLogger.error('Keycloak requires a Secure Context (HTTPS, localhost, or 127.0.0.1) to use the Web Crypto API.');
    }
    frontendLogger.error('Failed to initialize Keycloak', { error });
    // Still render app so public routes work
    onAuthenticatedCallback();
  }
};

export const doLogout = () => {
  localStorage.removeItem('sos_location_token');
  keycloak.logout();
};

export const doRegister = () => {
  keycloak.register();
};
