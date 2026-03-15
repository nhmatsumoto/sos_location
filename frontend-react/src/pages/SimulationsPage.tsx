import LandslideSimulation from '../LandslideSimulation';
import { 
  Box, 
  VStack, 
  SimpleGrid, 
  Badge,
  Center,
  Icon,
  HStack,
  Divider
} from '@chakra-ui/react';
import { Activity, Wind } from 'lucide-react';
import { StatBoard } from '../components/ui/StatBoard';

// Atomic Components
import { SimControlUnit } from '../components/ui/SimControlUnit';
import { WeatherTelemetry } from '../components/ui/WeatherTelemetry';
import { EventTimeline } from '../components/ui/EventTimeline';
import { GlassPanel } from '../components/atoms/GlassPanel';
import { TacticalText } from '../components/atoms/TacticalText';
import { useSimulationsController } from '../hooks/useSimulationsController';

/**
 * Predictive Simulation Engine
 * High-fidelity GIS simulation for landslide and flood risk prediction.
 * Refactored with the Guardian Design System.
 */
export function SimulationsPage() {
  const {
    lat, setLat, lng, setLng,
    resultData, streamSteps, rainSummary, isSimulating,
    numericLat, numericLng,
    actions
  } = useSimulationsController();

  return (
    <Box h="100vh" w="100vw" position="relative" overflow="hidden" bg="sos.dark">
      {/* Background GIS Visualizer */}
      <Box position="absolute" inset={0} zIndex={0}>
        <LandslideSimulation sourceLat={numericLat} sourceLng={numericLng} />
      </Box>

      {/* Floating HUD Command Unit */}
      <VStack 
        position="absolute" 
        top={6} 
        left={6} 
        bottom={6} 
        w="380px" 
        zIndex={10} 
        spacing={6} 
        alignItems="stretch"
        display={{ base: 'none', lg: 'flex' }}
        className="animate-panel"
      >
        <SimControlUnit 
          lat={lat} setLat={setLat}
          lng={lng} setLng={setLng}
          isSimulating={isSimulating}
          onRun={actions.runSimulation}
          onRealtime={actions.startRealtimeStream}
        />

        <WeatherTelemetry summary={rainSummary} />

        {/* Results Visualizer */}
        <GlassPanel flex={1} p={6} display="flex" flexDirection="column" overflow="hidden">
          <HStack justify="space-between" mb={4}>
            <TacticalText variant="subheading" color="sos.blue.400">Simulation Output</TacticalText>
            <Icon as={Wind} size={14} color="whiteAlpha.300" />
          </HStack>
          
          <Divider borderColor="whiteAlpha.100" mb={6} />

          {resultData ? (
            <VStack spacing={6} alignItems="stretch" mb={6}>
              <SimpleGrid columns={3} spacing={4}>
                <StatBoard label="Affected Area" value={`${(resultData?.estimatedAffectedAreaM2 / 1_000_000 || 0).toFixed(2)}`} unit="KM²" />
                <StatBoard label="Max Depth" value={`${resultData?.maxDepth || 0}`} unit="METERS" />
                <StatBoard label="Active Cells" value={`${resultData?.floodedCells?.length || 0}`} unit="PX" />
              </SimpleGrid>
              
              <Box p={4} bg="whiteAlpha.50" borderRadius="xl" border="1px solid" borderColor="whiteAlpha.100">
                <TacticalText variant="caption" mb={2}>ESTA ESTIMATIVAÉ BASEADA EM DADOS TOPOGRÁFICOS ATUAIS</TacticalText>
              </Box>
            </VStack>
          ) : (
            <Center flex={1} flexDirection="column" opacity={0.3}>
              <Icon as={Activity} size={40} className="animate-pulse" />
              <TacticalText mt={4} variant="mono">TERMINAL_AWAITING_INPUT...</TacticalText>
            </Center>
          )}

          <Box flex={1} overflowY="auto" className="custom-scrollbar">
            <EventTimeline steps={streamSteps} />
          </Box>
        </GlassPanel>
      </VStack>

      {/* Live HUD Status */}
      <Box position="absolute" top={6} right={6} zIndex={10}>
         <Badge 
           bg="sos.red.500" 
           color="white" 
           borderRadius="full" 
           px={4} 
           py={1}
           fontSize="10px"
           letterSpacing="0.2em"
           boxShadow="0 0 20px rgba(255, 59, 48, 0.3)"
         >
           LIVE_CALCULATION
         </Badge>
      </Box>
    </Box>
  );
}
