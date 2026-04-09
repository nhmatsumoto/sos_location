import { Outlet } from 'react-router-dom';
import { DomainShellLayout, type DomainShellLayoutProps } from '../domains/layouts/DomainShellLayout';

type DomainRouteShellProps = Omit<DomainShellLayoutProps, 'children'>;

export function DomainRouteShell(props: DomainRouteShellProps) {
  return (
    <DomainShellLayout {...props}>
      <Outlet />
    </DomainShellLayout>
  );
}
