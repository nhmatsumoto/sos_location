import { ProtectedDomainRouteShell } from './ProtectedDomainRouteShell';
import type { AppRouteGroup } from '../lib/appRouteManifest';

const ADMIN_NAV_GROUPS: AppRouteGroup[] = ['admin'];

export function AdminRouteShell() {
  return (
    <ProtectedDomainRouteShell
      fallbackText="Carregando centro administrativo..."
      navigationGroups={ADMIN_NAV_GROUPS}
      minimalTopbar
      showStatusStrip={false}
      sidebarSectionLabelKey="nav.admin"
    />
  );
}
