import React from 'react';
import {
  ShieldAlert, Crosshair, MousePointer2, MapPin,
  Camera, Activity, Users, PackageOpen, Bell, BellOff, BarChart2,
  type LucideIcon
} from 'lucide-react';
import {
  Box, HStack, Tooltip, IconButton
} from '@chakra-ui/react';
import { CountryDropdown } from './CountryDropdown';
import { ToolButton } from './ToolButton';
import { Logo } from '../brand/Logo';
import { useSOSHeaderHUD } from '../../hooks/useSOSHeaderHUD';
import { TacticalText } from '../atoms/TacticalText';
import { AnimatedNumber } from '../atoms/AnimatedNumber';
import { useTranslation } from 'react-i18next';
import type { ToolMode } from '../features/map/MapInteractions';

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
  setTool: React.Dispatch<React.SetStateAction<ToolMode>>;
  stats?: Stats;
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
  country, setCountry, onReset, activeTool, setTool, stats,
  alertPanelOpen, onToggleAlerts, gamificationOpen, onToggleMissions
}) => {
  const { user } = useSOSHeaderHUD();
  const { t } = useTranslation();

  return (
    <Box
      position="absolute"
      top={3}
      left={3}
      right={3}
      zIndex={150}
      h="56px"
      bg="#111119"
      border="1px solid rgba(255,255,255,0.08)"
      borderRadius="lg"
      display="flex"
      alignItems="center"
      px={4}
      gap={4}
    >
      {/* Brand identity */}
      <HStack spacing={3} flexShrink={0}>
        <Box p={2} bg="sos.blue.500" borderRadius="md">
          <Logo w="16px" h="16px" color="white" />
        </Box>
        <Box display={{ base: 'none', md: 'block' }}>
          <TacticalText variant="heading" color="white" fontSize="sm" lineHeight={1}>
            SOS Location
          </TacticalText>
          <HStack spacing={1.5} align="center" mt={0.5}>
            <Box w={1.5} h={1.5} borderRadius="full" bg="sos.green.500" className="status-live" />
            <TacticalText variant="mono" fontSize="10px" color="rgba(255,255,255,0.38)">
              {user?.preferredUsername || 'operador'}
            </TacticalText>
          </HStack>
        </Box>
      </HStack>

      <Box h="32px" w="1px" bg="rgba(255,255,255,0.08)" flexShrink={0} />

      {/* Country filter */}
      <CountryDropdown value={country} onChange={setCountry} />

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
        p={1}
        bg="rgba(255,255,255,0.04)"
        borderRadius="md"
        border="1px solid rgba(255,255,255,0.07)"
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
            borderRadius="md"
            w="36px"
            h="36px"
            color={alertPanelOpen ? 'sos.blue.400' : 'rgba(255,255,255,0.45)'}
            bg={alertPanelOpen ? 'rgba(0,122,255,0.08)' : 'transparent'}
            _hover={{ color: 'white', bg: 'rgba(255,255,255,0.07)' }}
          />
        </Tooltip>

        <Tooltip label={gamificationOpen ? 'Ocultar Missões' : 'Ver Missões'}>
          <IconButton
            icon={<BarChart2 size={16} />}
            aria-label="Toggle Missions"
            variant="ghost"
            onClick={onToggleMissions}
            borderRadius="md"
            w="36px"
            h="36px"
            color={gamificationOpen ? 'sos.amber.400' : 'rgba(255,255,255,0.45)'}
            bg={gamificationOpen ? 'rgba(255,149,0,0.08)' : 'transparent'}
            _hover={{ color: 'white', bg: 'rgba(255,255,255,0.07)' }}
          />
        </Tooltip>

        <Box h="20px" w="1px" bg="rgba(255,255,255,0.07)" mx={1} />

        <Tooltip label="Centralizar Mapa">
          <IconButton
            icon={<Crosshair size={16} />}
            aria-label="Reset Map"
            variant="ghost"
            onClick={onReset}
            borderRadius="md"
            w="36px"
            h="36px"
            color="rgba(255,255,255,0.45)"
            _hover={{ color: 'white', bg: 'rgba(255,255,255,0.07)' }}
          />
        </Tooltip>
      </HStack>
    </Box>
  );
};
