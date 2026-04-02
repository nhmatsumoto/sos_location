import { useNavigate } from 'react-router-dom';
import { keycloak, doRegister } from '../lib/keycloak';

const normalizeRedirectPath = (value: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith('/')) return null;
  if (trimmed === '/' || trimmed === '/login') return null;
  if (trimmed.includes('?') || trimmed.includes('#') || trimmed.includes('loggedOut')) return null;
  return trimmed;
};

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
      localStorage.setItem('sos_login_redirect', '/app/sos');
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
