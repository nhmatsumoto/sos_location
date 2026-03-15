import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

/**
 * Hook for SOSHeaderHUD logic
 * Handles navigation, authentication, and specialized header actions.
 */
export function useSOSHeaderHUD() {
  const navigate = useNavigate();
  const { clearAuth, user } = useAuthStore();

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
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
