import { useNavigate } from 'react-router-dom';
import { keycloak, doRegister } from '../lib/keycloak';

/**
 * Hook for LoginPage logic
 * Manages Keycloak redirection, onboarding flags, and registration flow.
 */
export function useLoginPage() {
  const navigate = useNavigate();

  const handleLogin = () => {
    localStorage.setItem('sos_onboarding_visited', 'true');
    if (!localStorage.getItem('sos_login_redirect')) {
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
