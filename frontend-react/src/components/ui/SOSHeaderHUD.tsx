import React from 'react';
import { ShieldAlert, Crosshair, MousePointer2, MapPin, Camera, Activity, Users, PackageOpen, CloudRain, Globe, LogOut } from 'lucide-react';
import { Box, Flex, HStack, VStack, IconButton, Divider, Tooltip } from '@chakra-ui/react';
import { CitySearch } from './CitySearch';
import { CountryDropdown } from './CountryDropdown';
import { ToolButton } from './ToolButton';
import { Logo } from '../brand/Logo';
import { useSOSHeaderHUD } from '../../hooks/useSOSHeaderHUD';
import { TacticalButton } from '../atoms/TacticalButton';
import { TacticalText } from '../atoms/TacticalText';
import { TacticalStat } from '../molecules/TacticalStat';
import { GlassPanel } from '../atoms/GlassPanel';

interface SOSHeaderHUDProps {
  country: string;
  setCountry: (val: string) => void;
  onReset: () => void;
  activeTool: string;
  setTool: (tool: any) => void;
  stats?: {
    activeTeams: string | number;
    criticalAlerts: string | number;
    supplies: string | number;
    missingPersons?: string | number;
    climate?: {
      temp: number;
      humidity: number;
      windSpeed: number;
      description: string;
    };
  };
  onSearchSelect?: (lat: number, lon: number, displayName: string) => void;
}

/**
 * SOS Header HUD
 * The primary dashboard control bar. Redesigned with precise atoms and modules
 * for a unified Tactical Design System.
 */
export const SOSHeaderHUD: React.FC<SOSHeaderHUDProps> = ({
  country, setCountry, onReset, activeTool, setTool, stats, onSearchSelect
}) => {
  const { user, handleLogout, goToPublicMap } = useSOSHeaderHUD();

  return (
    <GlassPanel
      position="absolute"
      top={4}
      left={4}
      right={4}
      zIndex={50}
      px={6}
      h="80px"
      borderRadius="full"
      display="flex"
      alignItems="center"
      justifyContent="space-between"
    >
      {/* Brand & Search Section */}
      <HStack spacing={6}>
        <Flex align="center" gap={3}>
          <Box p={2.5} bg="sos.blue.500" borderRadius="xl" boxShadow="lg">
            <Logo w="24px" h="24px" color="white" />
          </Box>
          <Box>
            <TacticalText variant="heading" color="white">
              SOS <Box as="span" color="sos.red.500">GUARDIAN</Box>
            </TacticalText>
            <HStack spacing={1.5} align="center" opacity={0.6}>
              <Box w={1.5} h={1.5} borderRadius="full" bg="sos.green.500" />
              <TacticalText variant="mono">
                {user?.preferredUsername || 'OPERATOR'} // PRO
              </TacticalText>
            </HStack>
          </Box>
        </Flex>

        <Divider orientation="vertical" h="40px" borderColor="whiteAlpha.200" />

        <HStack spacing={3}>
          <CitySearch onSelect={onSearchSelect} />
          <CountryDropdown value={country} onChange={setCountry} />
        </HStack>

        <TacticalButton 
          h="36px" 
          px={4} 
          leftIcon={<Globe size={14} />} 
          onClick={goToPublicMap}
          variant="ghost"
          borderColor="transparent"
          _hover={{ bg: 'sos.blue.500/10', borderColor: 'sos.blue.500/20' }}
        >
          MAPA PÚBLICO
        </TacticalButton>
      </HStack>

      {/* Center Section: KPIs */}
      <HStack 
        spacing={8} 
        px={8} 
        py={2} 
        bg="whiteAlpha.50" 
        borderRadius="2xl" 
        border="1px solid" 
        borderColor="whiteAlpha.100" 
        display={{ base: 'none', '2xl': 'flex' }}
      >
        <TacticalStat label="Equipes" value={stats?.activeTeams || 0} icon={Users} color="sos.blue.400" />
        <TacticalStat label="Alertas" value={stats?.criticalAlerts || 0} icon={Activity} color="sos.red.400" />
        <TacticalStat label="Logística" value={stats?.supplies || 0} icon={PackageOpen} color="sos.green.400" />
        <TacticalStat label="Buscas" value={stats?.missingPersons || 0} icon={MapPin} color="orange.400" />
      </HStack>

      {/* Right Section: Tools & Account */}
      <HStack spacing={4}>
        {/* Climate */}
        <HStack spacing={3} bg="whiteAlpha.50" px={4} py={3} borderRadius="2xl" border="1px solid" borderColor="whiteAlpha.100" display={{ base: 'none', lg: 'flex' }}>
          <CloudRain size={16} color="#4FD1C5" />
          <VStack align="flex-start" spacing={0}>
            <TacticalText variant="caption">AMBIENTE</TacticalText>
            <TacticalText variant="heading" fontSize="xs" letterSpacing="normal">
              {stats?.climate?.temp ?? '24'}°C
            </TacticalText>
          </VStack>
        </HStack>

        <HStack spacing={1.5} p={1.5} bg="whiteAlpha.50" borderRadius="2xl" border="1px solid" borderColor="whiteAlpha.100">
          <ToolButton active={activeTool === 'inspect'} onClick={() => setTool('inspect')} icon={<MousePointer2 size={18} />} label="Inspecionar" hideLabel />
          <ToolButton active={activeTool === 'point'} onClick={() => setTool('point')} icon={<MapPin size={18} />} label="Marcar Ponto" hideLabel />
          <ToolButton active={activeTool === 'area'} onClick={() => setTool('area')} icon={<ShieldAlert size={18} />} label="Área de Risco" hideLabel />
          <ToolButton active={activeTool === 'snapshot'} onClick={() => setTool('snapshot')} icon={<Camera size={18} />} label="Captura" hideLabel />
        </HStack>

        <HStack spacing={2}>
          <Tooltip label="Centralizar Mapa">
            <IconButton
              icon={<Crosshair size={20} />}
              aria-label="Reset Map"
              variant="tactical"
              onClick={onReset}
              borderRadius="xl"
              w="44px"
              h="44px"
            />
          </Tooltip>
          <Tooltip label="Encerrar Sessão">
            <IconButton
              icon={<LogOut size={20} />}
              aria-label="Logout"
              variant="ghost"
              color="sos.red.400"
              onClick={handleLogout}
              borderRadius="xl"
              w="44px"
              h="44px"
              _hover={{ bg: 'sos.red.500/10' }}
            />
          </Tooltip>
        </HStack>
      </HStack>
    </GlassPanel>
  );
};
