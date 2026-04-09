import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { DomainRouteShell } from './DomainRouteShell';
import type { DomainShellLayoutProps } from '../domains/layouts/DomainShellLayout';

type ProtectedDomainRouteShellProps = Omit<DomainShellLayoutProps, 'children'>;

export function ProtectedDomainRouteShell(props: ProtectedDomainRouteShellProps) {
  return (
    <ProtectedRoute>
      <DomainRouteShell {...props} />
    </ProtectedRoute>
  );
}
