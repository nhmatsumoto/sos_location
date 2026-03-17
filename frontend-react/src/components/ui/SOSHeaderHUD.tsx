import React from 'react';
import {
  ShieldAlert, Crosshair, MousePointer2, MapPin,
  Camera, Activity, Users, PackageOpen, Globe, Bell, BellOff, BarChart2,
  type LucideIcon
} from 'lucide-react';
import {
  Box, Flex, HStack, Tooltip, IconButton, Divider
} from '@chakra-ui/react';
import { CitySearch } from './CitySearch';
import { CountryDropdown } from './CountryDropdown';
import { ToolButton } from './ToolButton';
import { Logo } from '../brand/Logo';
import { useSOSHeaderHUD } from '../../hooks/useSOSHeaderHUD';
import { TacticalText } from '../atoms/TacticalText';
import { AnimatedNumber } from '../atoms/AnimatedNumber';
import { useTranslation } from 'react-i18next';

interface Stats {
  activeTeams: string | number;
  criticalAlerts: string | number;
  supplies: string | number;
  missingPersons?: string | number;
}

interface SOSHeaderHUDProps {
  country: string;
  setCountry: (val: string) => void;
  onReset: () => void;
  activeTool: string;
  setTool: (tool: any) => void;
  stats?: Stats;
  onSearchSelect?: (lat: number, lon: number, displayName: string, bbox?: string[]) => void;
  // Panel Toggles
  alertPanelOpen: boolean;
  onToggleAlerts: () => void;
  gamificationOpen: boolean;
  onToggleMissions: () => void;
}

/** Single KPI pill — compact, always visible */
const KpiPill = ({ value, label, icon: Icon, color }: {
  value: string | number;
  label: string;
  icon: LucideIcon;
  color: string;
}) => (
  <HStack
    spacing={2.5}
    px={3}
    py={2}
    borderRadius="xl"
    bg="rgba(255,255,255,0.04)"
    border="1px solid rgba(255,255,255,0.08)"
    transition="all 0.2s"
    _hover={{ bg: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.14)' }}
    cursor="default"
  >
    <Box color={color} flexShrink={0}>
      <Icon size={14} />
    </Box>
    <Box>
      <AnimatedNumber
        value={value}
        variant="heading"
        fontSize="md"
        color="white"
        lineHeight={1}
        display="block"
      />
      <TacticalText
        variant="caption"
        display={{ base: 'none', xl: 'block' }}
        lineHeight={1}
        mt={0.5}
      >
        {label}
      </TacticalText>
    </Box>
  </HStack>
);

/**
 * SOS Header HUD — Guardian Clarity v3
 * Redesigned for clarity: KPIs always visible, cleaner tool bar,
 * compact but information-dense. Apple HIG-inspired balance.
 */
export const SOSHeaderHUD: React.FC<SOSHeaderHUDProps> = ({
  country, setCountry, onReset, activeTool, setTool, stats, onSearchSelect,
  alertPanelOpen, onToggleAlerts, gamificationOpen, onToggleMissions
}) => {
  const { user, handleLogout, goToPublicMap } = useSOSHeaderHUD();
  const { t } = useTranslation();

  return (
    <Box
      position="absolute"
      top={4}
      left={4}
      right={4}
      zIndex={150}
      h="64px"
      bg="rgba(8, 8, 15, 0.85)"
      backdropFilter="blur(24px) saturate(180%)"
      border="1px solid rgba(255,255,255,0.10)"
      borderRadius="2xl"
      boxShadow="0 4px 24px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.05) inset"
      display="flex"
      alignItems="center"
      px={5}
      gap={4}
    >
      {/* Brand identity */}
      <HStack spacing={3} flexShrink={0}>
        <Box p={2} bg="sos.blue.500" borderRadius="xl" boxShadow="0 0 12px rgba(0,122,255,0.3)">
          <Logo w="18px" h="18px" color="white" />
        </Box>
        <Box display={{ base: 'none', md: 'block' }}>
          <TacticalText variant="heading" color="white" fontSize="sm" lineHeight={1}>
            SOS <Box as="span" color="sos.red.400">GUARDIAN</Box>
          </TacticalText>
          <HStack spacing={1.5} align="center" mt={0.5}>
            <Box w={1.5} h={1.5} borderRadius="full" bg="sos.green.500" className="animate-pulse" />
            <TacticalText variant="mono" fontSize="9px" color="rgba(255,255,255,0.40)">
              {user?.preferredUsername || 'OPERATOR'}
            </TacticalText>
          </HStack>
        </Box>
      </HStack>

      <Box h="32px" w="1px" bg="rgba(255,255,255,0.08)" flexShrink={0} />

      {/* Search + Country */}
      <HStack spacing={2} flex={{ base: 1, xl: 'none' }}>
        <CitySearch onSelect={onSearchSelect} />
        <CountryDropdown value={country} onChange={setCountry} />
      </HStack>

      <Box h="32px" w="1px" bg="rgba(255,255,255,0.08)" flexShrink={0} display={{ base: 'none', xl: 'block' }} />

      {/* KPIs — always visible, compact on small screens */}
      <HStack spacing={2} display={{ base: 'none', lg: 'flex' }}>
        <KpiPill
          value={stats?.activeTeams || 0}
          label="Equipes"
          icon={Users}
          color="#007AFF"
        />
        <KpiPill
          value={stats?.criticalAlerts || 0}
          label="Alertas"
          icon={Activity}
          color="#FF3B30"
        />
        <KpiPill
          value={stats?.supplies || 0}
          label="Suprimentos"
          icon={PackageOpen}
          color="#34C759"
        />
        <KpiPill
          value={stats?.missingPersons || 0}
          label="Desaparecidos"
          icon={MapPin}
          color="#FF9500"
        />
      </HStack>

      {/* Spacer */}
      <Box flex={1} display={{ base: 'none', xl: 'block' }} />

      {/* Map Tools */}
      <HStack
        spacing={1}
        p={1.5}
        bg="rgba(255,255,255,0.04)"
        borderRadius="xl"
        border="1px solid rgba(255,255,255,0.08)"
        display={{ base: 'none', md: 'flex' }}
        flexShrink={0}
      >
        <ToolButton
          active={activeTool === 'inspect'}
          onClick={() => setTool('inspect')}
          icon={<MousePointer2 size={16} />}
          label={t('sos.tools.inspect') || 'Inspecionar'}
          hideLabel
        />
        <ToolButton
          active={activeTool === 'point'}
          onClick={() => setTool('point')}
          icon={<MapPin size={16} />}
          label={t('sos.tools.point') || 'Ponto'}
          hideLabel
        />
        <ToolButton
          active={activeTool === 'area'}
          onClick={() => setTool('area')}
          icon={<ShieldAlert size={16} />}
          label={t('sos.tools.area') || 'Área'}
          hideLabel
        />
        <ToolButton
          active={activeTool === 'snapshot'}
          onClick={() => setTool('snapshot')}
          icon={<Camera size={16} />}
          label={t('sos.tools.snapshot') || 'Captura'}
          hideLabel
        />
      </HStack>

      <Box h="32px" w="1px" bg="rgba(255,255,255,0.08)" flexShrink={0} display={{ base: 'none', md: 'block' }} />

      {/* Actions */}
      <HStack spacing={1} flexShrink={0}>
        <Tooltip label={alertPanelOpen ? 'Ocultar Alertas' : 'Ver Alertas'}>
          <IconButton
            icon={alertPanelOpen ? <Bell size={18} /> : <BellOff size={18} />}
            aria-label="Toggle Alerts"
            variant="ghost"
            onClick={onToggleAlerts}
            borderRadius="xl"
            w="40px"
            h="40px"
            color={alertPanelOpen ? 'sos.blue.400' : 'rgba(255,255,255,0.50)'}
            bg={alertPanelOpen ? 'rgba(0,122,255,0.08)' : 'transparent'}
            _hover={{ color: 'white', bg: 'rgba(255,255,255,0.08)' }}
          />
        </Tooltip>

        <Tooltip label={gamificationOpen ? 'Ocultar Missões' : 'Ver Missões'}>
          <IconButton
            icon={<BarChart2 size={18} />}
            aria-label="Toggle Missions"
            variant="ghost"
            onClick={onToggleMissions}
            borderRadius="xl"
            w="40px"
            h="40px"
            color={gamificationOpen ? 'sos.amber.400' : 'rgba(255,255,255,0.50)'}
            bg={gamificationOpen ? 'rgba(255,149,0,0.08)' : 'transparent'}
            _hover={{ color: 'white', bg: 'rgba(255,255,255,0.08)' }}
          />
        </Tooltip>

        <Box h="24px" w="1px" bg="rgba(255,255,255,0.08)" mx={1} />

        <Tooltip label="Ir ao Mapa Público">
          <IconButton
            icon={<Globe size={18} />}
            aria-label="Public Map"
            variant="ghost"
            onClick={goToPublicMap}
            borderRadius="xl"
            w="40px"
            h="40px"
            color="rgba(255,255,255,0.50)"
            _hover={{ color: 'white', bg: 'rgba(255,255,255,0.08)' }}
          />
        </Tooltip>
        <Tooltip label="Centralizar Mapa">
          <IconButton
            icon={<Crosshair size={18} />}
            aria-label="Reset Map"
            variant="ghost"
            onClick={onReset}
            borderRadius="xl"
            w="40px"
            h="40px"
            color="rgba(255,255,255,0.50)"
            _hover={{ color: 'white', bg: 'rgba(255,255,255,0.08)' }}
          />
        </Tooltip>
      </HStack>
    </Box>
  );
};
