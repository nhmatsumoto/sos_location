import { memo, useMemo } from 'react';
import { LogOut } from 'lucide-react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { Box, VStack, Link, Text, type BoxProps, Button, HStack } from '@chakra-ui/react';
import { LogoFull } from '../brand/Logo';
import { useAuthStore } from '../../store/authStore';
import { doLogout } from '../../lib/keycloak';
import { useTranslation } from 'react-i18next';
import { getVisibleNavigationRoutes, matchesAppRoute, type AppRouteGroup } from '../../lib/appRouteManifest';

interface SidebarProps extends BoxProps {
  routeGroups?: AppRouteGroup[];
  sectionLabelKey?: string;
}

export const Sidebar = memo(function Sidebar({
  routeGroups,
  sectionLabelKey = 'nav.internal',
  ...props
}: SidebarProps) {
  const location = useLocation();
  const authenticated = useAuthStore((state) => state.authenticated);
  const roles = useAuthStore((state) => state.roles);
  const { t } = useTranslation();

  const internalItems = useMemo(
    () => getVisibleNavigationRoutes(authenticated, roles, { groups: routeGroups }),
    [authenticated, roles, routeGroups],
  );

  return (
    <Box
      as="aside"
      bg="surface.panel"
      p={3}
      borderRadius="lg"
      border="1px solid"
      borderColor="border.subtle"
      overflowY="auto"
      display="flex"
      flexDirection="column"
      {...props}
    >
      <Box mb={5}>
        <LogoFull />
        <Text fontSize="11px" color="text.secondary" mt={2} fontWeight="500">
          {t('intel.surveillance')}
        </Text>
      </Box>

      <VStack spacing={0.5} align="stretch" as="nav" flex={1}>
        <Text fontSize="10px" color="text.tertiary" fontWeight="600" mb={1} ml={2} textTransform="uppercase" letterSpacing="wider">
          {t(sectionLabelKey) || 'Menu'}
        </Text>
        {internalItems.map((item) => {
          const Icon = item.icon;
          const active = matchesAppRoute(item, location.pathname);
          return (
            <Link
              as={RouterLink}
              key={item.path}
              to={item.path}
              display="flex"
              alignItems="center"
              gap={3}
              px={3}
              py={2}
              fontSize="sm"
              borderRadius="md"
              transition="background 0.15s, color 0.15s"
              color={active ? 'white' : 'text.secondary'}
              bg={active ? 'rgba(0,122,255,0.12)' : 'transparent'}
              borderLeft="2px solid"
              borderLeftColor={active ? 'sos.blue.500' : 'transparent'}
              _hover={{
                bg: active ? 'rgba(0,122,255,0.16)' : 'surface.interactiveHover',
                textDecoration: 'none',
                color: 'white',
              }}
            >
              <Box color={active ? 'sos.blue.400' : 'inherit'} flexShrink={0}>
                <Icon size={15} />
              </Box>
              <Text fontWeight={active ? '600' : '400'}>{t(item.labelKey)}</Text>
            </Link>
          );
        })}
      </VStack>

      <VStack spacing={1} align="stretch" mt={4}>
        {authenticated && (
          <Button
            leftIcon={<LogOut size={14} />}
            variant="ghost"
            size="sm"
            justifyContent="flex-start"
            color="sos.red.400"
            _hover={{ bg: 'rgba(255,59,48,0.08)' }}
            onClick={doLogout}
            fontSize="xs"
          >
            {t('nav.logout') || 'Encerrar Sessão'}
          </Button>
        )}

        <Box p={2.5} borderRadius="md" bg="rgba(255,255,255,0.03)" border="1px solid rgba(255,255,255,0.07)">
          <HStack spacing={2}>
            <Box w={1.5} h={1.5} borderRadius="full" bg="status.live" className="status-live" flexShrink={0} />
            <Text fontSize="11px" fontWeight="500" color="text.secondary">
              Conectado
            </Text>
          </HStack>
        </Box>
      </VStack>
    </Box>
  );
});
