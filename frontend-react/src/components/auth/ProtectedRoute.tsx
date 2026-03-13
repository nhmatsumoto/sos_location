import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { keycloak } from '../../lib/keycloak';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string;
}

/**
 * A wrapper component for routes that requires authentication.
 * It also supports optional role-based authorization.
 */
export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const location = useLocation();

  if (!keycloak.authenticated) {
    // Save the current location to redirect back after successful login
    localStorage.setItem('sos_login_redirect', location.pathname);
    return <Navigate to="/login" replace />;
  }

  if (requiredRole) {
    const hasRole = keycloak.realmAccess?.roles?.includes(requiredRole);
    if (!hasRole) {
      // If user is authenticated but lacks required role, redirect to public map
      // or a "forbidden" page. Here we follow the existing pattern of /map.
      return <Navigate to="/map" replace />;
    }
  }

  return <>{children}</>;
}
