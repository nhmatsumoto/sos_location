import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { AppShell } from '../../components/layout/AppShell';
import { isTacticalRoutePath, type AppRouteGroup } from '../../lib/appRouteManifest';

export interface DomainShellLayoutProps {
  children: ReactNode;
  fallbackText: string;
  navigationGroups: AppRouteGroup[];
  variant?: 'default' | 'tactical';
  tacticalAware?: boolean;
  navigationMode?: 'compact' | 'expanded' | 'auto';
  showStatusStrip?: boolean;
  minimalTopbar?: boolean;
  sidebarSectionLabelKey?: string;
}

export function DomainShellLayout({
  children,
  fallbackText,
  navigationGroups,
  variant = 'default',
  tacticalAware = false,
  navigationMode = 'auto',
  showStatusStrip = true,
  minimalTopbar = false,
  sidebarSectionLabelKey,
}: DomainShellLayoutProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const location = useLocation();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const resolvedVariant = tacticalAware
    ? (isTacticalRoutePath(location.pathname) ? 'tactical' : 'default')
    : variant;

  return (
    <div className="animate-in fade-in duration-700 ease-out">
      <AppShell
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        variant={resolvedVariant}
        navigationMode={navigationMode}
        navigationGroups={navigationGroups}
        minimalTopbar={minimalTopbar}
        showStatusStrip={showStatusStrip}
        sidebarSectionLabelKey={sidebarSectionLabelKey}
      >
        <Suspense fallback={<div style={{ padding: 16 }} className="text-slate-500 font-bold animate-pulse text-center">{fallbackText}</div>}>
          {children}
        </Suspense>
      </AppShell>
    </div>
  );
}
