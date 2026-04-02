import { memo, useMemo } from 'react';
import { Activity, AlertTriangle, BarChart3, FileWarning, Layers3, LifeBuoy, Radar, Search, Settings, Users, PlugZap, Globe, Heart, Truck, ShieldAlert, Coins, Cog, LogOut } from 'lucide-react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { Box, VStack, Link, Text, type BoxProps, Divider, Button } from '@chakra-ui/react';
import { LogoFull } from '../brand/Logo';
import { useAuthStore } from '../../store/authStore';
import { doLogout } from '../../lib/keycloak';

const navItems = [
  { to: '/app/sos', label: 'nav.monitor', icon: Radar },
  { to: '/app/operational-map', label: 'nav.op_map', icon: Layers3 },
  { to: '/app/rescue-ops', label: 'nav.rescue_ops', icon: ShieldAlert },
  { to: '/app/hotspots', label: 'nav.hotspots', icon: AlertTriangle },
  { to: '/app/missing-persons', label: 'nav.missing', icon: Users },
  { to: '/app/tactical-approval', label: 'nav.approval', icon: ShieldAlert, admin: true },
  { to: '/app/reports', label: 'nav.reports', icon: FileWarning },
  { to: '/app/searched-areas', label: 'nav.searched', icon: Search },
  { to: '/app/rescue-support', label: 'nav.rescue', icon: LifeBuoy },
  { to: '/app/incidents', label: 'nav.incidents', icon: Activity },
  { to: '/app/simulations', label: 'nav.simulations', icon: BarChart3 },
  { to: '/app/data-hub', label: 'nav.datahub', icon: Layers3 },
  { to: '/app/integrations', label: 'nav.integrations', icon: PlugZap },
  { to: '/app/global-disasters', label: 'nav.global', icon: Globe },
  { to: '/app/volunteer', label: 'nav.volunteer', icon: Heart },
  { to: '/app/logistics', label: 'nav.logistics', icon: Truck },
  { to: '/app/risk-assessment', label: 'nav.risk', icon: ShieldAlert },
  { to: '/app/support', label: 'nav.support', icon: Coins },
  { to: '/app/admin/sources', label: 'nav.sources', icon: Cog, admin: true },
  { to: '/app/settings', label: 'nav.settings', icon: Settings },
];

import { useTranslation } from 'react-i18next';

export const Sidebar = memo(function Sidebar(props: BoxProps) {
  const location = useLocation();
  const authenticated = useAuthStore((state) => state.authenticated);
  const roles = useAuthStore((state) => state.roles);
  const { t } = useTranslation();

  const isAdmin = roles.includes('admin');

  const { internalItems, publicItems } = useMemo(() => {
    const filtered = navItems.filter(item => !item.admin || isAdmin);
    return {
      internalItems: filtered.filter(i => i.to.startsWith('/app')),
      publicItems: filtered.filter(i => !i.to.startsWith('/app'))
    };
  }, [isAdmin]);

  return (
    <Box 
      as="aside" 
      bg="rgba(10, 11, 16, 0.4)" 
      p={4} 
      borderRadius="xl" 
      border="1px solid" 
      borderColor="whiteAlpha.100"
      backdropFilter="blur(24px)"
      boxShadow="2xl"
      overflowY="auto"
      display="flex"
      flexDirection="column"
      {...props}
    >
      <Box mb={6}>
        <LogoFull />
        <Text fontSize="10px" color="sos.blue.400" mt={2} fontWeight="black" textTransform="uppercase" letterSpacing="widest">
          {t('intel.surveillance')}
        </Text>
      </Box>

      <VStack spacing={1} align="stretch" as="nav" flex={1}>
        <Text fontSize="10px" color="whiteAlpha.400" fontWeight="black" mb={1} ml={3} textTransform="uppercase">{t('nav.internal') || 'INTERNO'}</Text>
        {internalItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.to;
          return (
            <Link
              as={RouterLink}
              key={item.to}
              to={item.to}
              display="flex"
              alignItems="center"
              gap={3}
              px={3}
              py={2}
              fontSize="xs"
              borderRadius="md"
              transition="all 0.2s"
              color={active ? "white" : "whiteAlpha.700"}
              bg={active ? "sos.blue.500" : "transparent"}
              _hover={{
                bg: active ? "sos.blue.600" : "whiteAlpha.100",
                textDecoration: 'none'
              }}
              border="1px solid"
              borderColor={active ? "sos.blue.400" : "transparent"}
            >
              <Icon size={14} color={active ? "white" : "sos.blue.500"} />
              <Text fontWeight={active ? "bold" : "medium"}>{t(item.label)}</Text>
            </Link>
          );
        })}

        {publicItems.length > 0 && (
          <>
            <Divider borderColor="whiteAlpha.100" my={2} />
            <Text fontSize="10px" color="whiteAlpha.400" fontWeight="black" mb={1} ml={3} textTransform="uppercase">{t('nav.public') || 'PUBLIC'}</Text>
            {publicItems.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.to;
              return (
                <Link
                  as={RouterLink}
                  key={item.to}
                  to={item.to}
                  display="flex"
                  alignItems="center"
                  gap={3}
                  px={3}
                  py={2}
                  fontSize="xs"
                  borderRadius="md"
                  transition="all 0.2s"
                  color={active ? "white" : "whiteAlpha.600"}
                  _hover={{ bg: "whiteAlpha.200", textDecoration: 'none' }}
                >
                  <Icon size={14} color="whiteAlpha.500" />
                  <Text fontWeight="medium">{t(item.label)}</Text>
                </Link>
              );
            })}
          </>
        )}
      </VStack>

      <VStack spacing={2} align="stretch" mt={4}>
        {authenticated && (
          <Button
            leftIcon={<LogOut size={14} />}
            variant="ghost"
            size="sm"
            justifyContent="flex-start"
            color="sos.red.400"
            _hover={{ bg: 'sos.red.500', color: 'white' }}
            onClick={doLogout}
            fontSize="xs"
          >
            {t('nav.logout') || 'Encerrar Sessão'}
          </Button>
        )}

        <Box p={3} borderRadius="md" bg="blackAlpha.400" border="1px solid" borderColor="whiteAlpha.100">
          <Text fontSize="10px" fontWeight="black" color="sos.blue.400" mb={1} letterSpacing="widest">
            {t('nav.status') || 'OP_STATUS'}
          </Text>
          <Text fontSize="2xs" color="whiteAlpha.600" lineHeight="tight">
            GUARDIAN_NET_V3_CONNECTED_NODE_ALPHA
          </Text>
        </Box>
      </VStack>
    </Box>
  );
});
