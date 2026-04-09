import { ProtectedDomainRouteShell } from './ProtectedDomainRouteShell';
import type { AppRouteGroup } from '../lib/appRouteManifest';

const OPERATIONAL_NAV_GROUPS: AppRouteGroup[] = ['ops', 'intel', 'resources', 'system'];

export function OperationsRouteShell() {
  return (
    <ProtectedDomainRouteShell
      fallbackText="Iniciando painel de comando..."
      navigationGroups={OPERATIONAL_NAV_GROUPS}
      navigationMode="expanded"
      tacticalAware
    />
  );
}
