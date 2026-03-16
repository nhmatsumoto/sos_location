import { Box, VStack, HStack, Flex, Badge, Icon, Divider, Progress } from '@chakra-ui/react';
import { Crosshair, MapPin, Activity, Users, DollarSign, Clock } from 'lucide-react';
import { DraggablePanel } from '../map/DraggablePanel';
import { TacticalText } from '../atoms/TacticalText';

interface SituationIntelPanelProps {
  event: any;
  onClose: () => void;
}

export function SituationIntelPanel({ event, onClose }: SituationIntelPanelProps) {
  if (!event) return null;

  const severityColor = event.severity >= 4 ? 'sos.red.500' : (event.severity >= 3 ? 'orange.400' : 'sos.blue.400');

  return (
    <DraggablePanel
      title="SITUATION INTEL // OS.GUARDIAN"
      position={{ top: 112, left: 340 }}
      onDragStart={() => {}}
      onToggleDock={onClose}
    >
      <Box p={6} bg="rgba(15, 23, 42, 0.4)" w="420px">
        <VStack align="stretch" spacing={5}>
          {/* Header Telemetry */}
          <HStack justify="space-between" align="flex-start">
            <VStack align="start" spacing={1}>
              <HStack spacing={2}>
                <Icon as={Crosshair} boxSize="12px" color="sos.blue.400" />
                <TacticalText variant="caption" color="sos.blue.400" fontWeight="black">
                  INTEL_STREAM_V4.2
                </TacticalText>
              </HStack>
              <TacticalText variant="heading" fontSize="md" color="white" maxW="280px">
                {event.title || 'UNKNOWN_EVENT'}
              </TacticalText>
            </VStack>
            <Badge 
              variant="outline" 
              borderColor={severityColor} 
              color={severityColor} 
              fontSize="10px" 
              px={2} 
              py={1} 
              borderRadius="lg"
            >
              LEVEL_{event.severity || '??'}
            </Badge>
          </HStack>

          <Divider borderColor="whiteAlpha.100" />

          {/* Abstract / Analysis */}
          <Box position="relative">
            <Box position="absolute" left="-12px" top="0" bottom="0" w="2px" bg={severityColor} opacity={0.6} />
            <TacticalText fontSize="xs" color="whiteAlpha.800" lineHeight="tall" fontWeight="medium">
              {event.description || 'Analytic stream pending. Monitor situational telemetry for further updates.'}
            </TacticalText>
          </Box>

          {/* Detailed Telemetry Grid */}
          <Box bg="whiteAlpha.50" p={4} borderRadius="2xl" border="1px solid" borderColor="whiteAlpha.100">
            <VStack spacing={4} align="stretch">
              <HStack justify="space-between">
                <HStack spacing={3}>
                  <Icon as={MapPin} boxSize="14px" color="whiteAlpha.400" />
                  <TacticalText variant="caption" color="whiteAlpha.500">COORDINATES</TacticalText>
                </HStack>
                <TacticalText variant="mono" fontSize="10px" color="white">
                  {event.lat?.toFixed(4)}, {event.lon?.toFixed(4)}
                </TacticalText>
              </HStack>

              <HStack justify="space-between">
                <HStack spacing={3}>
                  <Icon as={Users} boxSize="14px" color="whiteAlpha.400" />
                  <TacticalText variant="caption" color="whiteAlpha.500">AFFECTED_POP</TacticalText>
                </HStack>
                <TacticalText variant="mono" fontSize="10px" color="white">
                  {event.affectedPopulation?.toLocaleString() || 'CALCULATING...'}
                </TacticalText>
              </HStack>

              <HStack justify="space-between">
                <HStack spacing={3}>
                  <Icon as={Activity} boxSize="14px" color="whiteAlpha.400" />
                  <TacticalText variant="caption" color="whiteAlpha.500">RISK_ASSESSMENT</TacticalText>
                </HStack>
                <TacticalText variant="mono" fontSize="10px" color={severityColor}>
                  {(event.riskScore || (event.severity * 20))}%
                </TacticalText>
              </HStack>

              <Box pt={1}>
                <Progress 
                  value={event.riskScore || (event.severity * 20)} 
                  size="xs" 
                  borderRadius="full" 
                  bg="whiteAlpha.100" 
                  colorScheme={event.severity >= 4 ? 'red' : 'blue'} 
                  h="3px"
                />
              </Box>
            </VStack>
          </Box>

          {/* Operational Overlays */}
          <Flex gap={3}>
            <VStack flex={1} align="stretch" bg="whiteAlpha.50" p={3} borderRadius="xl" border="1px solid" borderColor="whiteAlpha.100">
              <HStack spacing={2} mb={1}>
                <Icon as={DollarSign} boxSize="10px" color="sos.green.400" />
                <TacticalText variant="caption" fontSize="9px" color="whiteAlpha.400">EST_DAMAGE</TacticalText>
              </HStack>
              <TacticalText variant="mono" fontSize="11px" color="sos.green.400">
                {event.estimatedCost || '$1.2M'}
              </TacticalText>
            </VStack>
            <VStack flex={1} align="stretch" bg="whiteAlpha.50" p={3} borderRadius="xl" border="1px solid" borderColor="whiteAlpha.100">
              <HStack spacing={2} mb={1}>
                <Icon as={Clock} boxSize="10px" color="whiteAlpha.400" />
                <TacticalText variant="caption" fontSize="9px" color="whiteAlpha.400">TIME_SINCE</TacticalText>
              </HStack>
              <TacticalText variant="mono" fontSize="11px" color="white">
                2h 14m
              </TacticalText>
            </VStack>
          </Flex>
        </VStack>
      </Box>
    </DraggablePanel>
  );
}
