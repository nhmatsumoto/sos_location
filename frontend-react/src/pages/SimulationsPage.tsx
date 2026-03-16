import { 
  Box, 
  VStack, 
  Center,
  Icon,
  HStack,
  Divider,
  Input,
  Flex,
  Progress,
  Tooltip,
  IconButton
} from '@chakra-ui/react';
import { Activity, Wind, Play, RefreshCw, Crosshair, MapPin, AlertTriangle, Layers, Maximize2, Zap } from 'lucide-react';

// Atomic Components
import { CityScaleWebGL } from '../components/ui/CityScaleWebGL';
import { GlassPanel } from '../components/atoms/GlassPanel';
import { TacticalText } from '../components/atoms/TacticalText';
import { TacticalButton } from '../components/atoms/TacticalButton';
import { TacticalStat } from '../components/molecules/TacticalStat';
import { EventTimeline } from '../components/ui/EventTimeline';
import { useSimulationsController } from '../hooks/useSimulationsController';

/**
 * Guardian Simulation Engine v2.0.0 - City Scale Pure WebGL
 * High-fidelity GIS simulation for disaster risk prediction.
 * Uses pure WebGL 2.0 with layered raster/vector data processing.
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
      {/* City-Scale Pure WebGL Visualizer (Background Layer) */}
      <Box position="absolute" inset={0} zIndex={0}>
        <CityScaleWebGL centerLat={numericLat} centerLng={numericLng} />
      </Box>

      {/* --- TOP HUD: MISSION BANNER --- */}
      <Box 
        position="absolute" 
        top={0} 
        left={0} 
        right={0} 
        zIndex={20} 
        px={8} 
        py={4}
        bgGradient="linear(to-b, blackAlpha.800, transparent)"
      >
        <Flex justify="space-between" align="center">
          <HStack spacing={6}>
            <VStack align="start" spacing={0}>
              <TacticalText variant="caption" color="sos.blue.400" letterSpacing="0.3em">MISSION_CONTROL_ID: #SIM-X82</TacticalText>
              <TacticalText variant="heading" fontSize="xl">HYDRA_SIMULATION_ENGINE</TacticalText>
            </VStack>
            <Divider orientation="vertical" h="40px" borderColor="whiteAlpha.300" />
            <HStack spacing={4}>
              <VStack align="start" spacing={0}>
                <TacticalText variant="caption" color="whiteAlpha.400">OPERATIONAL_STATUS</TacticalText>
                <HStack>
                  <Box boxSize="8px" borderRadius="full" bg={isSimulating ? "sos.red.500" : "sos.green.500"} className={isSimulating ? "animate-pulse" : ""} />
                  <TacticalText variant="mono" fontSize="10px">{isSimulating ? "ACTIVE_STREAMING" : "IDLE_STANDBY"}</TacticalText>
                </HStack>
              </VStack>
              <VStack align="start" spacing={0}>
                <TacticalText variant="caption" color="whiteAlpha.400">WEATHER_TELEMETRY</TacticalText>
                <TacticalText variant="mono" fontSize="10px" color="sos.blue.300">{rainSummary}</TacticalText>
              </VStack>
            </HStack>
          </HStack>

          <HStack spacing={4}>
             <Tooltip label="Network Latency">
               <HStack spacing={1} opacity={0.6}>
                 <Icon as={Zap} size={10} color="yellow.400" />
                 <TacticalText variant="mono" fontSize="9px">12ms</TacticalText>
               </HStack>
             </Tooltip>
             <Divider orientation="vertical" h="24px" borderColor="whiteAlpha.200" />
             <IconButton 
               aria-label="Fullscreen" 
               icon={<Maximize2 size={16} />} 
               variant="ghost" 
               color="whiteAlpha.600"
               _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
             />
          </HStack>
        </Flex>
      </Box>

      {/* --- LEFT HUD: SPATIAL CONTROLS --- */}
      <VStack 
        position="absolute" 
        top="80px" 
        left={6} 
        bottom={10} 
        w="340px" 
        zIndex={10} 
        spacing={4} 
        alignItems="stretch"
      >
        <GlassPanel p={5} intensity="high" flexDirection="column">
          <HStack mb={4} justify="space-between">
            <TacticalText variant="subheading" color="sos.blue.400">Targeting Parameters</TacticalText>
            <Icon as={Crosshair} size={14} color="whiteAlpha.300" />
          </HStack>
          
          <VStack spacing={4} align="stretch">
            <Box>
              <TacticalText variant="caption" mb={2}>GEO_LATITUDE</TacticalText>
              <Input 
                value={lat} 
                onChange={(e) => setLat(e.target.value)} 
                variant="filled"
                bg="whiteAlpha.50"
                borderColor="whiteAlpha.100"
                _hover={{ bg: 'whiteAlpha.100' }}
                _focus={{ borderColor: 'sos.blue.500', bg: 'whiteAlpha.100' }}
                fontSize="xs"
                fontFamily="mono"
                color="sos.blue.200"
              />
            </Box>
            <Box>
              <TacticalText variant="caption" mb={2}>GEO_LONGITUDE</TacticalText>
              <Input 
                value={lng} 
                onChange={(e) => setLng(e.target.value)} 
                variant="filled"
                bg="whiteAlpha.50"
                borderColor="whiteAlpha.100"
                _hover={{ bg: 'whiteAlpha.100' }}
                _focus={{ borderColor: 'sos.blue.500', bg: 'whiteAlpha.100' }}
                fontSize="xs"
                fontFamily="mono"
                color="sos.blue.200"
              />
            </Box>
            
            <Divider borderColor="whiteAlpha.100" my={2} />
            
            <VStack align="stretch" spacing={2}>
              <Flex justify="space-between">
                <TacticalText variant="caption">Buffer Precision</TacticalText>
                <TacticalText variant="mono" fontSize="9px">98.4%</TacticalText>
              </Flex>
              <Progress value={98.4} size="xs" colorScheme="blue" borderRadius="full" bg="whiteAlpha.100" />
            </VStack>
          </VStack>
        </GlassPanel>

        <GlassPanel flex={1} p={5} intensity="medium" flexDirection="column" overflow="hidden">
          <HStack mb={4} justify="space-between">
            <TacticalText variant="subheading" color="sos.blue.400">Operational Log</TacticalText>
            <Icon as={Layers} size={14} color="whiteAlpha.300" />
          </HStack>
          <Box flex={1} overflowY="auto" className="custom-scrollbar" pr={2}>
            <EventTimeline steps={streamSteps} />
            {streamSteps.length === 0 && !isSimulating && (
              <Center h="full" flexDirection="column" opacity={0.3}>
                <Icon as={Activity} size={30} mb={3} />
                <TacticalText variant="mono">PENDING_TELEMETRY...</TacticalText>
              </Center>
            )}
          </Box>
        </GlassPanel>
      </VStack>

      {/* --- BOTTOM HUD: COMMAND & RESULTS --- */}
      <Box 
        position="absolute" 
        bottom={6} 
        left="360px" 
        right={6} 
        zIndex={10}
      >
        <GlassPanel p={4} intensity="high" alignItems="center" justifyContent="space-between">
          <HStack spacing={6}>
            <HStack spacing={3}>
              <TacticalButton 
                onClick={actions.runSimulation} 
                glow={isSimulating}
                leftIcon={<Icon as={Play} size={14} />}
                h="54px"
                px={8}
                minW="200px"
              >
                Execute Analysis
              </TacticalButton>
              <TacticalButton 
                onClick={actions.startRealtimeStream} 
                variant="outline"
                leftIcon={<Icon as={RefreshCw} size={14} />}
                h="54px"
                borderColor="whiteAlpha.200"
                _hover={{ bg: 'whiteAlpha.100' }}
              >
                Replay Multi-Stream
              </TacticalButton>
            </HStack>
            
            <Divider orientation="vertical" h="40px" borderColor="whiteAlpha.200" />
            
            {resultData ? (
              <HStack spacing={4}>
                <TacticalStat 
                  label="Area Affected" 
                  value={(resultData?.estimatedAffectedAreaM2 / 1_000).toFixed(1)} 
                  unit="K-M2" 
                  icon={MapPin} 
                  color="sos.blue.300" 
                />
                <TacticalStat 
                  label="Max Depth" 
                  value={resultData?.maxDepth || 0} 
                  unit="METERS" 
                  icon={Wind} 
                  color="orange.300" 
                />
                <TacticalStat 
                  label="Risk Severity" 
                  value="CRITICAL" 
                  icon={AlertTriangle} 
                  color="sos.red.400" 
                />
              </HStack>
            ) : (
              <HStack spacing={8} px={4}>
                <VStack align="start" spacing={0} opacity={0.4}>
                  <TacticalText variant="caption">ENGINE_READY</TacticalText>
                  <TacticalText variant="mono" fontSize="xs">AWAITING_COMMAND_EXECUTION</TacticalText>
                </VStack>
              </HStack>
            )}
          </HStack>
          
          <HStack spacing={4}>
            <Box textAlign="right">
              <TacticalText variant="caption" color="whiteAlpha.400">LATENCY_CORE</TacticalText>
              <TacticalText variant="mono" fontSize="xs">240 TFLOPS</TacticalText>
            </Box>
            <Box p={3} bg="whiteAlpha.100" borderRadius="full" border="1px solid" borderColor="whiteAlpha.200">
               <Icon as={Activity} size={20} color="sos.blue.400" />
            </Box>
          </HStack>
        </GlassPanel>
      </Box>
    </Box>
  );
}
