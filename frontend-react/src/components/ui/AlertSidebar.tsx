import React from 'react';
import { Bell, Info } from 'lucide-react';
import { Box, Flex, VStack, Center, HStack, SimpleGrid, Badge } from '@chakra-ui/react';
import { AlertCard } from './AlertCard';
import { useAlertSidebar } from '../../hooks/useAlertSidebar';
import { GlassPanel } from '../atoms/GlassPanel';
import { TacticalText } from '../atoms/TacticalText';

interface Alert {
  id: string;
  title: string;
  description: string;
  severity: number | string;
  source: string;
  timestamp?: string;
  lat?: number;
  lon?: number;
  affectedPopulation?: number;
  sourceUrl?: string;
}

interface AlertSidebarProps {
  alerts: Alert[];
  onAlertClick?: (alert: Alert) => void;
  open?: boolean;
  kpis?: {
    criticalAlerts: number;
    activeTeams: number;
    missingPersons: number;
  };
}

/**
 * Alert Sidebar (Command Feed)
 * Displays a live encrypted stream of tactical alerts.
 * Refactored with Atomic Design and extracted logic.
 */
export const AlertSidebar: React.FC<AlertSidebarProps> = ({ alerts, onAlertClick, open = true, kpis }) => {
  const { determineSeverity, formatTimestamp } = useAlertSidebar();

  if (!open) return null;

  return (
    <GlassPanel
      position="absolute"
      top="120px"
      left={6}
      bottom={6}
      w="340px"
      zIndex={40}
      display="flex"
      flexDirection="column"
      overflow="hidden"
      className="animate-panel"
    >
      {/* Header */}
      <Box px={6} py={5} borderBottom="1px solid" borderColor="whiteAlpha.100" bg="whiteAlpha.50">
        <Flex align="center" justify="space-between">
          <HStack spacing={3}>
            <Box p={2} bg="sos.blue.500" borderRadius="xl">
              <Bell size={18} color="white" />
            </Box>
            <Box>
              <TacticalText variant="heading">Command Feed</TacticalText>
              <TacticalText variant="mono">ENCRYPTED // LIVE</TacticalText>
            </Box>
          </HStack>
          <Badge bg="sos.red.500" color="white" borderRadius="full" px={2} fontSize="10px">
            {alerts.length} ALERTS
          </Badge>
        </Flex>
      </Box>

      {/* KPI Quick Look */}
      {kpis && (
        <SimpleGrid columns={3} spacing={3} p={4} borderBottom="1px solid" borderColor="whiteAlpha.100">
          {[
            { val: kpis.criticalAlerts, label: 'Crítico', color: 'sos.red.400' },
            { val: kpis.activeTeams, label: 'Equipes', color: 'sos.blue.400' },
            { val: kpis.missingPersons, label: 'Buscas', color: 'orange.400' }
          ].map((kpiItem, idx) => (
            <VStack key={idx} spacing={0.5} p={3} bg="whiteAlpha.50" borderRadius="2xl" border="1px solid" borderColor="whiteAlpha.100" transition="all 0.2s" _hover={{ bg: 'whiteAlpha.100' }}>
              <TacticalText variant="heading" fontSize="md" color={kpiItem.color}>{kpiItem.val}</TacticalText>
              <TacticalText variant="caption">{kpiItem.label}</TacticalText>
            </VStack>
          ))}
        </SimpleGrid>
      )}

      {/* Alert List */}
      <Box flex="1" overflowY="auto" p={4} className="custom-scrollbar">
        {alerts.length === 0 ? (
          <Center h="full" flexDir="column" opacity={0.3}>
            <Info size={32} color="white" />
            <TacticalText variant="heading" mt={4}>Silence Protocol</TacticalText>
          </Center>
        ) : (
          <VStack spacing={4} align="stretch" className="animate-stagger-1">
            {alerts.map((alert) => (
              <AlertCard
                key={alert.id}
                title={alert.title}
                description={alert.description}
                severity={determineSeverity(alert.severity)}
                timestamp={formatTimestamp(alert.timestamp)}
                onClick={() => onAlertClick?.(alert)}
                cursor="pointer"
              />
            ))}
          </VStack>
        )}
      </Box>

      {/* Footer / Telemetry */}
      <Box p={4} bg="whiteAlpha.50" borderTop="1px solid" borderColor="whiteAlpha.100">
        <HStack justify="space-between" mb={2}>
          <TacticalText variant="caption">Telemetry Status</TacticalText>
          <TacticalText variant="mono" color="sos.green.400">SECURE_LINK</TacticalText>
        </HStack>
        <Box h="4px" w="full" bg="whiteAlpha.100" borderRadius="full" overflow="hidden">
          <Box h="full" w="92%" bg="sos.blue.500" borderRadius="full" className="animate-pulse" />
        </Box>
      </Box>
    </GlassPanel>
  );
};
