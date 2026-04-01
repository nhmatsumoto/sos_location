import { useAuthStore } from '../store/authStore';
import { doLogout } from '../lib/keycloak';

/**
 * Hook for SOSHeaderHUD logic
 * Handles authentication and specialized header actions.
 */
export function useSOSHeaderHUD() {
  const { user } = useAuthStore();

  const handleLogout = () => {
    doLogout();
  };

  return {
    user,
    handleLogout,
  };
}
