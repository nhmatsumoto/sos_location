import { useEffect, useState, Suspense, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { NavigationRail } from './NavigationRail';
import { Topbar } from './Topbar';
import { StatusStrip } from './StatusStrip';
import { ToastStack } from '../feedback/ToastStack';
import { NotificationCenter } from '../feedback/NotificationCenter';
import { useNotifications } from '../../context/NotificationsContext';
import { setApiNotifier } from '../../services/apiClient';
import { Box, Flex, Grid, Spinner, Center, Text } from '@chakra-ui/react';

interface AppShellProps {
  children: ReactNode;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  variant?: 'default' | 'tactical';
}

export function AppShell({ children, theme, onToggleTheme, variant = 'default' }: AppShellProps) {
  const { notices, pushNotice } = useNotifications();
  const [openCenter, setOpenCenter] = useState(false);

  useEffect(() => {
    setApiNotifier((title, message) => pushNotice({ title, message, type: 'error' }));
  }, [pushNotice]);

  // ─── Tactical Mode: War Room layout with NavigationRail ───────────────────
  if (variant === 'tactical') {
    return (
      <Box minH="100vh" bg="sos.dark" color="white" overflow="hidden">
        <Flex h="100vh" w="full" overflow="hidden">
          {/* Compact Navigation Rail — icon-only, expands on hover */}
          <NavigationRail mode="auto" h="full" flexShrink={0} />

          {/* Main Content Area */}
          <Box as="main" flex="1" h="100%" position="relative" overflow="hidden" bg="sos.dark">
            <Suspense fallback={
              <Center h="full" flexDir="column" gap={4}>
                <Spinner size="xl" color="sos.blue.500" thickness="3px" speed="0.8s" emptyColor="rgba(255,255,255,0.06)" />
                <Text fontWeight="700" color="rgba(255,255,255,0.40)" fontFamily="mono" textTransform="uppercase" letterSpacing="widest" fontSize="xs">
                  Inicializando Guardian Network...
                </Text>
              </Center>
            }>
              {children}
            </Suspense>
          </Box>
        </Flex>

        <NotificationCenter open={openCenter} onClose={() => setOpenCenter(false)} />
        <ToastStack />
      </Box>
    );
  }

  // ─── Default Mode: Standard layout with Sidebar + Topbar ─────────────────
  return (
    <Box minH="100vh" bg="sos.dark">
      <Grid
        templateColumns={{ base: '1fr', lg: '280px 1fr' }}
        gap={4}
        p={4}
        maxW="1920px"
        mx="auto"
        minH="100vh"
      >
        <Sidebar
          borderRadius="2xl"
          border="1px solid rgba(255,255,255,0.06)"
          bg="rgba(14,14,22,0.92)"
          backdropFilter="blur(24px)"
        />
        <Box as="main" display="flex" flexDirection="column" gap={4}>
          <Topbar
            theme={theme}
            onToggleTheme={onToggleTheme}
            notificationCount={notices.length}
            onOpenNotifications={() => setOpenCenter(true)}
          />
          <StatusStrip />
          <Box flex="1" position="relative">
            {children}
          </Box>
        </Box>
      </Grid>
      <NotificationCenter open={openCenter} onClose={() => setOpenCenter(false)} />
      <ToastStack />
    </Box>
  );
}
