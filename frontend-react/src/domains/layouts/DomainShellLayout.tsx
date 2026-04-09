import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Box, Center, Text } from '@chakra-ui/react';
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
    <Box animation="fade-in 0.2s ease-out">
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
        <Suspense
          fallback={(
            <Center py={8}>
              <Text
                color="text.secondary"
                fontWeight="700"
                textAlign="center"
                animation="status-pulse 2s ease-in-out infinite"
              >
                {fallbackText}
              </Text>
            </Center>
          )}
        >
          {children}
        </Suspense>
      </AppShell>
    </Box>
  );
}
