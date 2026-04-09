import { memo, useMemo } from 'react';
import { LogOut } from 'lucide-react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  Box, Tooltip, Divider, Text,
  type BoxProps
} from '@chakra-ui/react';
import { LogoFull, Logo } from '../brand/Logo';
import { useAuthStore } from '../../store/authStore';
import { doLogout } from '../../lib/keycloak';
import { useTranslation } from 'react-i18next';
import {
  APP_ROUTE_GROUP_LABELS,
  getVisibleNavigationRoutes,
  matchesAppRoute,
  type AppRouteGroup,
} from '../../lib/appRouteManifest';
import {
  ShellLiveIndicator,
  ShellSectionEyebrow,
  ShellSurface,
} from './ShellPrimitives';

interface NavigationRailProps extends BoxProps {
  mode?: 'compact' | 'expanded' | 'auto';
  routeGroups?: AppRouteGroup[];
}

export const NavigationRail = memo(function NavigationRail({
  mode = 'auto',
  routeGroups,
  ...props
}: NavigationRailProps) {
  const location = useLocation();
  const authenticated = useAuthStore((state) => state.authenticated);
  const roles = useAuthStore((state) => state.roles);
  const { t } = useTranslation();
  const isExpanded = mode === 'expanded';

  const visibleItems = useMemo(
    () => getVisibleNavigationRoutes(authenticated, roles, { groups: routeGroups }),
    [authenticated, roles, routeGroups]
  );

  const groups = useMemo(() => {
    const g: Record<string, typeof visibleItems> = {};
    for (const item of visibleItems) {
      if (!g[item.group]) g[item.group] = [];
      g[item.group].push(item);
    }
    return g;
  }, [visibleItems]);

  const railWidth = isExpanded ? '220px' : '64px';

  return (
    <ShellSurface
      as="aside"
      w={railWidth}
      minW={railWidth}
      h="full"
      variant="rail"
      display="flex"
      flexDirection="column"
      overflow="hidden"
      {...props}
    >
      {/* Logo */}
      <Box
        px={isExpanded ? 5 : 0}
        py={4}
        display="flex"
        alignItems="center"
        justifyContent={isExpanded ? 'flex-start' : 'center'}
        flexShrink={0}
      >
        {isExpanded ? (
          <LogoFull />
        ) : (
          <Box p={2} bg="sos.blue.500" borderRadius="md" flexShrink={0}>
            <Logo w="20px" h="20px" color="white" />
          </Box>
        )}
      </Box>

      <Divider borderColor="border.subtle" />

      {/* Nav Groups */}
      <Box
        flex={1}
        overflowY="auto"
        overflowX="hidden"
        py={2}
        sx={{
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {Object.entries(groups).map(([groupKey, items]) => (
          <Box key={groupKey} mb={2}>
            {isExpanded && (
              <ShellSectionEyebrow
                px={5}
                mb={1}
                mt={2}
              >
                {APP_ROUTE_GROUP_LABELS[groupKey as AppRouteGroup] || groupKey}
              </ShellSectionEyebrow>
            )}

            {items.map(item => {
              const Icon = item.icon;
              const isActive = matchesAppRoute(item, location.pathname);

              return (
                <Tooltip
                  key={item.path}
                  label={!isExpanded ? t(item.labelKey) : undefined}
                  placement="right"
                  hasArrow
                >
                  <Box
                    as={RouterLink}
                    to={item.path}
                    display="flex"
                    alignItems="center"
                    gap={isExpanded ? 3 : 0}
                    px={isExpanded ? 4 : 0}
                    justifyContent={isExpanded ? 'flex-start' : 'center'}
                    h="40px"
                    mx={isExpanded ? 2 : 1}
                    borderRadius="md"
                    transition="background 0.15s, color 0.15s"
                    position="relative"
                    color={isActive ? 'white' : 'text.secondary'}
                    bg={isActive ? 'rgba(0, 122, 255, 0.14)' : 'transparent'}
                    borderLeft={isActive ? '2px solid' : '2px solid transparent'}
                    borderLeftColor={isActive ? 'sos.blue.500' : 'transparent'}
                    _hover={{
                      bg: isActive ? 'rgba(0, 122, 255, 0.18)' : 'surface.interactiveHover',
                      color: 'white',
                      textDecoration: 'none',
                    }}
                  >
                    <Box flexShrink={0}>
                      <Icon size={17} />
                    </Box>
                    {isExpanded && (
                      <Text
                        fontSize="sm"
                        fontWeight={isActive ? '600' : '400'}
                        whiteSpace="nowrap"
                        overflow="hidden"
                      >
                        {t(item.labelKey)}
                      </Text>
                    )}
                  </Box>
                </Tooltip>
              );
            })}
          </Box>
        ))}
      </Box>

      <Divider borderColor="border.subtle" />

      {/* Footer */}
      <Box py={2} flexShrink={0}>
        {authenticated && (
          <Tooltip label={!isExpanded ? (t('nav.logout') || 'Sair') : undefined} placement="right" hasArrow>
            <Box
              as="button"
              onClick={doLogout}
              display="flex"
              alignItems="center"
              gap={isExpanded ? 3 : 0}
              px={isExpanded ? 4 : 0}
              justifyContent={isExpanded ? 'flex-start' : 'center'}
              h="40px"
              mx={1}
              w={isExpanded ? 'calc(100% - 8px)' : 'calc(100% - 8px)'}
              borderRadius="md"
              color="rgba(255, 59, 48, 0.65)"
              transition="background 0.15s, color 0.15s"
              _hover={{ bg: 'rgba(255,59,48,0.08)', color: 'sos.red.400' }}
              cursor="pointer"
              border="none"
              background="transparent"
            >
              <LogOut size={17} />
              {isExpanded && (
                <Text fontSize="sm" fontWeight="500" whiteSpace="nowrap">
                  {t('nav.logout') || 'Encerrar Sessão'}
                </Text>
              )}
            </Box>
          </Tooltip>
        )}

        {/* Connection status */}
        {isExpanded ? (
          <Box mx={3} mt={2} p={3} borderRadius="md" bg="rgba(0,122,255,0.05)" border="1px solid rgba(0,122,255,0.10)">
            <ShellLiveIndicator label="Conectado" />
          </Box>
        ) : (
          <Tooltip label="Conectado" placement="right" hasArrow>
            <Box display="flex" justifyContent="center" mt={2}>
              <Box w={2} h={2} borderRadius="full" bg="status.live" className="status-live" />
            </Box>
          </Tooltip>
        )}
      </Box>
    </ShellSurface>
  );
});
