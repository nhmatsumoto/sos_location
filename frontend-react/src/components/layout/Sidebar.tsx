import { memo, useMemo } from 'react';
import { LogOut } from 'lucide-react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { Box, VStack, Link, Text, type BoxProps, Button } from '@chakra-ui/react';
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
        <Text fontSize="10px" color="whiteAlpha.400" fontWeight="black" mb={1} ml={3} textTransform="uppercase">{t(sectionLabelKey) || 'INTERNO'}</Text>
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
              <Text fontWeight={active ? "bold" : "medium"}>{t(item.labelKey)}</Text>
            </Link>
          );
        })}
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
