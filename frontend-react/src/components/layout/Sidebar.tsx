import { memo, useMemo } from 'react';
import { Activity, AlertTriangle, BarChart3, FileWarning, Layers3, LifeBuoy, Radar, Search, Settings, Users, PlugZap, Globe, Heart, Truck, ShieldAlert, Coins, Cog, LogOut } from 'lucide-react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { Box, VStack, Link, Text, type BoxProps, Divider, Button } from '@chakra-ui/react';
import { LogoFull } from '../brand/Logo';
import { useAuthStore } from '../../store/authStore';
import { doLogout } from '../../lib/keycloak';

const navItems = [
  { to: '/app/sos', label: 'Monitor SOS', icon: Radar },
  { to: '/app/hotspots', label: 'Hotspots', icon: AlertTriangle },
  { to: '/app/missing-persons', label: 'Desaparecidos', icon: Users },
  { to: '/app/reports', label: 'Relatos', icon: FileWarning },
  { to: '/app/searched-areas', label: 'Áreas Buscadas', icon: Search },
  { to: '/app/rescue-support', label: 'Suporte ao Resgate', icon: LifeBuoy },
  { to: '/app/incidents', label: 'Ocorrências / Evidências', icon: Activity },
  { to: '/app/simulations', label: 'Simulações', icon: BarChart3 },
  { to: '/app/data-hub', label: 'Data Hub', icon: Layers3 },
  { to: '/app/integrations', label: 'Integrações', icon: PlugZap },
  { to: '/app/global-disasters', label: 'Eventos Globais', icon: Globe },
  { to: '/app/volunteer', label: 'Dashboard Voluntário', icon: Heart },
  { to: '/app/logistics', label: 'Logística', icon: Truck },
  { to: '/app/risk-assessment', label: 'Análise de Risco', icon: ShieldAlert },
  { to: '/app/support', label: 'Apoio Financeiro', icon: Coins },
  { to: '/app/admin/sources', label: 'Gestão de Fontes', icon: Cog },
  { to: '/map', label: 'Mapa Público SOS', icon: Globe },
  { to: '/transparency', label: 'Transparência Pública', icon: Globe },
  { to: '/app/settings', label: 'Configurações', icon: Settings },
];

export const Sidebar = memo(function Sidebar(props: BoxProps) {
  const location = useLocation();
  const { authenticated } = useAuthStore();

  const { internalItems, publicItems } = useMemo(() => ({
    internalItems: navItems.filter(i => i.to.startsWith('/app')),
    publicItems: navItems.filter(i => !i.to.startsWith('/app'))
  }), []);

  return (
    <Box 
      as="aside" 
      bg="whiteAlpha.50" 
      p={4} 
      borderRadius="xl" 
      border="1px solid" 
      borderColor="whiteAlpha.100"
      backdropFilter="blur(16px)"
      boxShadow="2xl"
      overflowY="auto"
      display="flex"
      flexDirection="column"
      {...props}
    >
      <Box mb={6}>
        <LogoFull />
        <Text fontSize="10px" color="whiteAlpha.500" mt={2} fontWeight="bold" textTransform="uppercase" letterSpacing="widest">
          Terminal de Comando
        </Text>
      </Box>

      <VStack spacing={1} align="stretch" as="nav" flex={1}>
        <Text fontSize="10px" color="whiteAlpha.400" fontWeight="black" mb={1} ml={3} textTransform="uppercase">Interno</Text>
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
              <Text fontWeight={active ? "bold" : "medium"}>{item.label}</Text>
            </Link>
          );
        })}

        <Divider borderColor="whiteAlpha.100" my={2} />
        <Text fontSize="10px" color="whiteAlpha.400" fontWeight="black" mb={1} ml={3} textTransform="uppercase">Acesso Público</Text>
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
              _hover={{
                bg: "whiteAlpha.200",
                textDecoration: 'none'
              }}
            >
              <Icon size={14} color="whiteAlpha.500" />
              <Text fontWeight="medium">{item.label}</Text>
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
            Encerrar Sessão
          </Button>
        )}

        <Box p={3} borderRadius="md" bg="blackAlpha.400" border="1px solid" borderColor="whiteAlpha.100">
          <Text fontSize="xs" fontWeight="bold" color="whiteAlpha.800" mb={1}>
            Operação: Ativa
          </Text>
          <Text fontSize="2xs" color="whiteAlpha.600">
            Sistema de gestão de crise operacional.
          </Text>
        </Box>
      </VStack>
    </Box>
  );
});
