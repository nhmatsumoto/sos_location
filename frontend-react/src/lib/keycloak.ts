import Keycloak from 'keycloak-js';
import { frontendLogger } from './logger';
import { useAuthStore } from '../store/authStore';
import { clearSessionToken, setSessionToken } from './authSession';
import { DEFAULT_PRIVATE_ROUTE, normalizeRedirectPath } from './appRouteManifest';

// --- KEYCLOAK INITIALIZATION ---
const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'sos-location',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'sos-location-frontend'
};

export const keycloak = new Keycloak(keycloakConfig);

export const getRoles = () => {
  const realmRoles = keycloak.realmAccess?.roles || [];
  const clientRoles = keycloak.resourceAccess?.[keycloakConfig.clientId]?.roles || [];
  return Array.from(new Set([...realmRoles, ...clientRoles]));
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

let refreshInFlight: Promise<boolean> | null = null;

export const refreshSessionToken = async (minimumValidity = 30) => {
  if (!keycloak.authenticated) {
    return false;
  }

  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = keycloak
    .updateToken(minimumValidity)
    .then((refreshed) => {
      if (keycloak.token) {
        setSessionToken(keycloak.token);
      }

      syncAuthStore();
      return refreshed;
    })
    .catch((error) => {
      frontendLogger.error('Failed to refresh token', { error });
      const currentPath = normalizeRedirectPath(window.location.pathname) ?? DEFAULT_PRIVATE_ROUTE;
      localStorage.setItem('sos_login_redirect', currentPath);
      keycloak.clearToken();
      useAuthStore.getState().clearAuth();
      clearSessionToken();
      return false;
    })
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
};

export const getActiveSessionToken = () => keycloak.token ?? null;

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

      if (keycloak.token) {
        setSessionToken(keycloak.token);
      }

      await refreshSessionToken(60);

      if (!keycloak.authenticated) {
        frontendLogger.info('Keycloak session became invalid during bootstrap');
        onAuthenticatedCallback();
        return;
      }

      const redirectPath = normalizeRedirectPath(localStorage.getItem('sos_login_redirect'));
      if (redirectPath && window.location.pathname !== redirectPath) {
        localStorage.removeItem('sos_login_redirect');
        window.location.replace(redirectPath);
        return; // Stop execution — page will reload to the new path
      } else {
        localStorage.removeItem('sos_login_redirect');
      }
      
      // Token refresh logic
      keycloak.onTokenExpired = () => {
        void refreshSessionToken(30).then((refreshed) => {
          if (refreshed) {
            frontendLogger.info('Token refreshed successfully');
          }
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
  keycloak.clearToken();
  clearSessionToken();
  keycloak.logout();
};

export const doRegister = () => {
  keycloak.register();
};
