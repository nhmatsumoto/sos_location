import { useNavigate } from 'react-router-dom';
import { keycloak, doRegister } from '../lib/keycloak';
import { DEFAULT_PRIVATE_ROUTE, normalizeRedirectPath } from '../lib/appRouteManifest';

/**
 * Hook for LoginPage logic
 * Manages Keycloak redirection, onboarding flags, and registration flow.
 */
export function useLoginPage() {
  const navigate = useNavigate();

  const handleLogin = () => {
    localStorage.setItem('sos_onboarding_visited', 'true');
    const redirectPath = normalizeRedirectPath(localStorage.getItem('sos_login_redirect'));
    if (!redirectPath) {
      localStorage.setItem('sos_login_redirect', DEFAULT_PRIVATE_ROUTE);
    }
    keycloak.login();
  };

  const handleRegister = () => {
    doRegister();
  };

  const goHome = () => {
    navigate('/');
  };

  return {
    handleLogin,
    handleRegister,
    goHome,
  };
}
