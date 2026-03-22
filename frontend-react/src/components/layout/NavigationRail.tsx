import { memo, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, BarChart3, FileWarning, Layers3,
  LifeBuoy, Radar, Search, Settings, Users, PlugZap, Globe,
  Heart, Truck, ShieldAlert, Coins, Cog, LogOut, ChevronRight,
  Pin, PinOff
} from 'lucide-react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  Box, VStack, Tooltip, IconButton, Divider, Button, Text,
  HStack, type BoxProps
} from '@chakra-ui/react';
import { LogoFull, Logo } from '../brand/Logo';
import { useAuthStore } from '../../store/authStore';
import { doLogout } from '../../lib/keycloak';
import { useTranslation } from 'react-i18next';

const navItems = [
  { to: '/app/sos',              label: 'nav.monitor',    icon: Radar,       group: 'ops' },
  { to: '/app/hotspots',         label: 'nav.hotspots',   icon: AlertTriangle,group: 'ops' },
  { to: '/app/missing-persons',  label: 'nav.missing',    icon: Users,       group: 'ops' },
  { to: '/app/incidents',        label: 'nav.incidents',  icon: Activity,    group: 'ops' },
  { to: '/app/searched-areas',   label: 'nav.searched',   icon: Search,      group: 'ops' },
  { to: '/app/rescue-support',   label: 'nav.rescue',     icon: LifeBuoy,    group: 'ops' },
  { to: '/app/reports',          label: 'nav.reports',    icon: FileWarning, group: 'ops' },
  { to: '/app/simulations',      label: 'nav.simulations',icon: BarChart3,   group: 'intel' },
  { to: '/app/data-hub',         label: 'nav.datahub',    icon: Layers3,     group: 'intel' },
  { to: '/app/integrations',     label: 'nav.integrations',icon: PlugZap,    group: 'intel' },
  { to: '/app/global-disasters', label: 'nav.global',     icon: Globe,       group: 'intel' },
  { to: '/app/logistics',        label: 'nav.logistics',  icon: Truck,       group: 'resources' },
  { to: '/app/volunteer',        label: 'nav.volunteer',  icon: Heart,       group: 'resources' },
  { to: '/app/risk-assessment',  label: 'nav.risk',       icon: ShieldAlert, group: 'resources' },
  { to: '/app/support',          label: 'nav.support',    icon: Coins,       group: 'resources' },
  { to: '/app/tactical-approval',label: 'nav.approval',   icon: ShieldAlert, group: 'admin', admin: true },
  { to: '/app/admin/sources',    label: 'nav.sources',    icon: Cog,         group: 'admin', admin: true },
  { to: '/app/settings',         label: 'nav.settings',   icon: Settings,    group: 'system' },
];

const groupLabels: Record<string, string> = {
  ops:       'Operações',
  intel:     'Inteligência',
  resources: 'Recursos',
  admin:     'Admin',
  system:    'Sistema',
  public:    'Público',
};

interface NavigationRailProps extends BoxProps {
  /** If true, shows icon only. If false, shows icon + label. Default: 'auto' (hover to expand) */
  mode?: 'compact' | 'expanded' | 'auto';
}

/**
 * Navigation Rail — Guardian Clarity v3
 * Apple-inspired compact navigation with icon-first approach.
 * Expands on hover to reveal labels with smooth spring animation.
 */
export const NavigationRail = memo(function NavigationRail({
  mode = 'auto',
  ...props
}: NavigationRailProps) {
  const location = useLocation();
  const { authenticated, roles } = useAuthStore();
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);

  const isAdmin = roles.includes('admin');
  const isExpanded = mode === 'expanded' || pinned || (mode === 'auto' && hovered);

  const visibleItems = useMemo(
    () => navItems.filter(item => !item.admin || isAdmin),
    [isAdmin]
  );

  // Group items by section
  const groups = useMemo(() => {
    const g: Record<string, typeof navItems> = {};
    for (const item of visibleItems) {
      if (!g[item.group]) g[item.group] = [];
      g[item.group].push(item);
    }
    return g;
  }, [visibleItems]);

  const railWidth = isExpanded ? '220px' : '64px';

  return (
    <Box
      as="aside"
      w={railWidth}
      minW={railWidth}
      h="full"
      bg="rgba(8, 8, 15, 0.92)"
      backdropFilter="blur(24px) saturate(180%)"
      borderRight="1px solid rgba(255,255,255,0.06)"
      display="flex"
      flexDirection="column"
      overflow="hidden"
      transition="width 0.25s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.25s cubic-bezier(0.4, 0, 0.2, 1)"
      onMouseEnter={() => mode === 'auto' && setHovered(true)}
      onMouseLeave={() => mode === 'auto' && setHovered(false)}
      {...props}
    >
      {/* Logo */}
      <Box
        px={isExpanded ? 5 : 0}
        py={5}
        display="flex"
        alignItems="center"
        justifyContent={isExpanded ? 'flex-start' : 'center'}
        flexShrink={0}
        transition="padding 0.25s"
      >
        {isExpanded ? (
          <LogoFull />
        ) : (
          <Box p={2} bg="sos.blue.500" borderRadius="xl" flexShrink={0}>
            <Logo w="20px" h="20px" color="white" />
          </Box>
        )}
      </Box>

      <Divider borderColor="rgba(255,255,255,0.06)" />

      {/* Nav Groups */}
      <Box flex={1} overflowY="auto" overflowX="hidden" py={3} className="no-scrollbar">
        {Object.entries(groups).map(([groupKey, items]) => (
          <Box key={groupKey} mb={2}>
            {/* Group label — only in expanded mode */}
            {isExpanded && (
              <Text
                fontSize="9px"
                fontWeight="800"
                color="rgba(255,255,255,0.25)"
                textTransform="uppercase"
                letterSpacing="ultra"
                px={5}
                mb={1}
                mt={2}
              >
                {groupLabels[groupKey] || groupKey}
              </Text>
            )}

            {items.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;

              return (
                <Tooltip
                  key={item.to}
                  label={!isExpanded ? t(item.label) : undefined}
                  placement="right"
                  hasArrow
                >
                  <Box
                    as={RouterLink}
                    to={item.to}
                    display="flex"
                    alignItems="center"
                    gap={isExpanded ? 3 : 0}
                    px={isExpanded ? 4 : 0}
                    justifyContent={isExpanded ? 'flex-start' : 'center'}
                    h="44px"
                    mx={isExpanded ? 2 : 1}
                    borderRadius="xl"
                    transition="all 0.18s cubic-bezier(0.4, 0, 0.2, 1)"
                    position="relative"
                    color={isActive ? 'white' : 'rgba(255,255,255,0.50)'}
                    bg={isActive ? 'rgba(0, 122, 255, 0.15)' : 'transparent'}
                    _hover={{
                      bg: isActive ? 'rgba(0, 122, 255, 0.20)' : 'rgba(255,255,255,0.06)',
                      color: 'white',
                      textDecoration: 'none',
                    }}
                    _before={isActive ? {
                      content: '""',
                      position: 'absolute',
                      left: isExpanded ? '-8px' : '-4px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      h: '20px',
                      w: '3px',
                      bg: 'sos.blue.500',
                      borderRadius: 'full',
                      boxShadow: '0 0 8px rgba(0,122,255,0.6)',
                    } : undefined}
                  >
                    <Box flexShrink={0}>
                      <Icon size={18} />
                    </Box>
                    {isExpanded && (
                      <Text
                        fontSize="sm"
                        fontWeight={isActive ? '700' : '500'}
                        whiteSpace="nowrap"
                        overflow="hidden"
                        opacity={isExpanded ? 1 : 0}
                        transition="opacity 0.2s"
                      >
                        {t(item.label)}
                      </Text>
                    )}
                  </Box>
                </Tooltip>
              );
            })}
          </Box>
        ))}
      </Box>

      <Divider borderColor="rgba(255,255,255,0.06)" />

      {/* Footer */}
      <Box py={3} flexShrink={0}>
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
              h="44px"
              mx={1}
              w={isExpanded ? 'calc(100% - 8px)' : 'calc(100% - 8px)'}
              borderRadius="xl"
              color="rgba(255, 59, 48, 0.70)"
              transition="all 0.18s"
              _hover={{ bg: 'rgba(255,59,48,0.08)', color: 'sos.red.400' }}
              cursor="pointer"
              border="none"
              background="transparent"
            >
              <LogOut size={18} />
              {isExpanded && (
                <Text fontSize="sm" fontWeight="600" whiteSpace="nowrap">
                  {t('nav.logout') || 'Encerrar Sessão'}
                </Text>
              )}
            </Box>
          </Tooltip>
        )}

        {/* Status indicator */}
        {isExpanded ? (
          <Box mx={3} mt={2} p={3} borderRadius="xl" bg="rgba(0,122,255,0.06)" border="1px solid rgba(0,122,255,0.12)">
            <HStack justify="space-between" mb={1}>
              <HStack spacing={2}>
                <Box w={2} h={2} borderRadius="full" bg="sos.green.500" className="animate-pulse" flexShrink={0} />
                <Text fontSize="10px" fontWeight="800" color="rgba(255,255,255,0.40)" textTransform="uppercase" letterSpacing="ultra">
                  Network
                </Text>
              </HStack>
              <IconButton
                size="xs"
                variant="ghost"
                icon={pinned ? <Pin size={10} /> : <PinOff size={10} />}
                onClick={() => setPinned(!pinned)}
                aria-label="Pin sidebar"
                color="whiteAlpha.400"
                _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
              />
            </HStack>
            <Text fontSize="9px" fontFamily="mono" color="rgba(255,255,255,0.30)" lineHeight="1.4">
              GUARDIAN_NET_V3
            </Text>
          </Box>
        ) : (
          <Tooltip label="Network: Online" placement="right" hasArrow>
            <Box display="flex" justifyContent="center" mt={2}>
              <Box w={2} h={2} borderRadius="full" bg="sos.green.500" className="animate-pulse" />
            </Box>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
});
