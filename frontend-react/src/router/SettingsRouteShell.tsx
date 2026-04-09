import { ProtectedDomainRouteShell } from './ProtectedDomainRouteShell';
import type { AppRouteGroup } from '../lib/appRouteManifest';

const SETTINGS_NAV_GROUPS: AppRouteGroup[] = ['ops', 'intel', 'resources', 'admin', 'system'];

export function SettingsRouteShell() {
  return (
    <ProtectedDomainRouteShell
      fallbackText="Carregando central de configurações..."
      navigationGroups={SETTINGS_NAV_GROUPS}
    />
  );
}
