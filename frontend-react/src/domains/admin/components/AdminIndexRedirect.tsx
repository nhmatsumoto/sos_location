import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import {
  DEFAULT_PRIVATE_ROUTE,
  getFirstAccessibleRoute,
  type AppRouteGroup,
} from '../../../lib/appRouteManifest';

const ADMIN_NAV_GROUPS: AppRouteGroup[] = ['admin'];

export function AdminIndexRedirect() {
  const authenticated = useAuthStore((state) => state.authenticated);
  const roles = useAuthStore((state) => state.roles);
  const firstAdminRoute = getFirstAccessibleRoute(authenticated, roles, { groups: [...ADMIN_NAV_GROUPS] });

  return <Navigate to={firstAdminRoute?.path ?? DEFAULT_PRIVATE_ROUTE} replace />;
}
