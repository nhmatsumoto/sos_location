import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { doLogout } from '../lib/keycloak';

/**
 * Hook for SOSHeaderHUD logic
 * Handles navigation, authentication, and specialized header actions.
 */
export function useSOSHeaderHUD() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const handleLogout = () => {
    doLogout();
  };

  const goToPublicMap = () => {
    navigate('/map');
  };

  return {
    user,
    handleLogout,
    goToPublicMap
  };
}
