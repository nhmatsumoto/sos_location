import { 
  Box, 
  VStack, 
  Center,
  Icon,
  HStack,
  Divider,
  Input,
  Flex,
  Tooltip,
  IconButton,
  Grid,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb
} from '@chakra-ui/react';
import { 
  Activity, 
  Wind, 
  Play, 
  RefreshCw, 
  MapPin, 
  AlertTriangle, 
  Layers, 
  Zap,
  Settings,
  CloudRain,
  Timer,
  ChevronRight,
  Database
} from 'lucide-react';
import { useState } from 'react';

// Atomic Components
import { CityScaleWebGL } from '../components/ui/CityScaleWebGL';
import { GlassPanel } from '../components/atoms/GlassPanel';
import { TacticalText } from '../components/atoms/TacticalText';
import { TacticalButton } from '../components/atoms/TacticalButton';
import { TacticalStat } from '../components/molecules/TacticalStat';
import { EventTimeline } from '../components/ui/EventTimeline';
import { useSimulationsController } from '../hooks/useSimulationsController';

type SimStep = 'CONFIG' | 'ENGINE';

/**
 * Guardian Simulation Engine v2.0.0 - City Scale Pure WebGL
 * High-fidelity GIS simulation for disaster risk prediction.
 * Uses pure WebGL 2.0 with layered raster/vector data processing.
 */
export function SimulationsPage() {
  const [activeStep, setActiveStep] = useState<SimStep>('CONFIG');
  const [config, setConfig] = useState({
    intensity: 75,
    duration: 120,
    engineMode: 'HYBRID_SOLVER'
  });

  const {
    lat, setLat, lng, setLng,
    resultData, streamSteps, isSimulating,
    numericLat, numericLng,
    actions
  } = useSimulationsController();

  const handleStartSimulation = () => {
    setActiveStep('ENGINE');
    actions.runSimulation();
  };

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
              <HStack>
                 <TacticalText variant="heading" fontSize="xl">HYDRA_ENGINE</TacticalText>
                 <Box px={2} py={0.5} bg="whiteAlpha.100" borderRadius="md" border="1px solid" borderColor="whiteAlpha.200">
                    <TacticalText variant="mono" fontSize="9px" color="whiteAlpha.600">v2.0.{activeStep === 'CONFIG' ? '0-SETUP' : 'PRO'}</TacticalText>
                 </Box>
              </HStack>
            </VStack>
            <Divider orientation="vertical" h="40px" borderColor="whiteAlpha.300" />
            <HStack spacing={8}>
              <VStack align="start" spacing={1}>
                <TacticalText variant="caption" color="whiteAlpha.400">WORKFLOW_SEQUENCE</TacticalText>
                <HStack spacing={2}>
                   <Box boxSize="6px" borderRadius="full" bg={activeStep === 'CONFIG' ? 'sos.blue.500' : 'whiteAlpha.400'} />
                   <TacticalText fontSize="9px" color={activeStep === 'CONFIG' ? 'white' : 'whiteAlpha.400'} fontWeight="bold">01 CONFIG</TacticalText>
                   <Icon as={ChevronRight} size={10} color="whiteAlpha.200" />
                   <Box boxSize="6px" borderRadius="full" bg={activeStep === 'ENGINE' ? 'sos.blue.500' : 'whiteAlpha.400'} />
                   <TacticalText fontSize="9px" color={activeStep === 'ENGINE' ? 'white' : 'whiteAlpha.400'} fontWeight="bold">02 ENGINE</TacticalText>
                </HStack>
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
               aria-label="Toggle Config" 
               icon={<Settings size={16} />} 
               variant="ghost" 
               color={activeStep === 'CONFIG' ? 'sos.blue.400' : 'whiteAlpha.600'}
               onClick={() => setActiveStep('CONFIG')}
             />
          </HStack>
        </Flex>
      </Box>

      {/* --- STEP 1: CONFIGURATION PANEL --- */}
      {activeStep === 'CONFIG' && (
        <Center position="absolute" inset={0} zIndex={100} bg="blackAlpha.700" backdropFilter="blur(8px)">
          <VStack w="640px" spacing={6}>
             <GlassPanel p={10} flexDirection="column" w="full" intensity="high" border="1px solid" borderColor="sos.blue.500/30">
                <Box mb={8} textAlign="center">
                  <Icon as={Database} size={40} color="sos.blue.400" mb={4} />
                  <TacticalText variant="heading" fontSize="xl" letterSpacing="0.4em" mb={2}>SIMULATION_PARAMETERS</TacticalText>
                  <TacticalText color="whiteAlpha.500">Defina as variáveis para o cálculo de inundação em larga escala</TacticalText>
                </Box>

                <Grid templateColumns="repeat(2, 1fr)" gap={8} w="full">
                  <VStack align="stretch" spacing={5}>
                    <Box>
                      <TacticalText variant="subheading" mb={4} color="sos.blue.400" fontSize="10px">GEO_COORDINATES</TacticalText>
                      <VStack spacing={4}>
                        <Box w="full">
                           <TacticalText variant="caption" mb={2}>LATITUDE</TacticalText>
                           <Input 
                             value={lat} 
                             onChange={(e) => setLat(e.target.value)} 
                             bg="whiteAlpha.50" 
                             borderColor="whiteAlpha.100" 
                             fontSize="xs"
                             fontFamily="mono"
                             color="sos.blue.200"
                           />
                        </Box>
                        <Box w="full">
                           <TacticalText variant="caption" mb={2}>LONGITUDE</TacticalText>
                           <Input 
                             value={lng} 
                             onChange={(e) => setLng(e.target.value)} 
                             bg="whiteAlpha.50" 
                             borderColor="whiteAlpha.100" 
                             fontSize="xs"
                             fontFamily="mono"
                             color="sos.blue.200"
                           />
                        </Box>
                      </VStack>
                    </Box>
                  </VStack>

                  <VStack align="stretch" spacing={5}>
                     <Box>
                        <TacticalText variant="subheading" mb={4} color="sos.blue.400" fontSize="10px">ENGINE_STRENGTH</TacticalText>
                        <VStack spacing={6} align="stretch">
                           <Box>
                              <Flex justify="space-between" mb={2}>
                                 <HStack spacing={2}><Icon as={CloudRain} size={12} color="whiteAlpha.600" /><TacticalText variant="caption">RAIN_INTENSITY</TacticalText></HStack>
                                 <TacticalText variant="mono" color="sos.blue.400">{config.intensity}%</TacticalText>
                              </Flex>
                              <Slider value={config.intensity} onChange={(v) => setConfig(c => ({...c, intensity: v}))}>
                                 <SliderTrack bg="whiteAlpha.100"><SliderFilledTrack bg="sos.blue.500" /></SliderTrack>
                                 <SliderThumb boxSize={3} bg="white" />
                              </Slider>
                           </Box>
                           <Box>
                              <Flex justify="space-between" mb={2}>
                                 <HStack spacing={2}><Icon as={Timer} size={12} color="whiteAlpha.600" /><TacticalText variant="caption">STORM_DURATION</TacticalText></HStack>
                                 <TacticalText variant="mono" color="sos.blue.400">{config.duration} MIN</TacticalText>
                              </Flex>
                              <Slider min={30} max={480} value={config.duration} onChange={(v) => setConfig(c => ({...c, duration: v}))}>
                                 <SliderTrack bg="whiteAlpha.100"><SliderFilledTrack bg="sos.blue.500" /></SliderTrack>
                                 <SliderThumb boxSize={3} bg="white" />
                              </Slider>
                           </Box>
                        </VStack>
                     </Box>
                  </VStack>
                </Grid>

                <Divider borderColor="whiteAlpha.100" my={10} />

                <TacticalButton 
                  w="full" 
                  h="64px" 
                  glow 
                  onClick={handleStartSimulation}
                  leftIcon={<Icon as={Play} size={18} />}
                >
                  INITIALIZE_HYDRA_SOLVER
                </TacticalButton>
             </GlassPanel>
             <TacticalText variant="mono" fontSize="9px" opacity={0.3}>ENCRYPTION_LAYER_6_STATUS_ACTIVE // SECURITY_BYPASS: FALSE</TacticalText>
          </VStack>
        </Center>
      )}

      {/* --- STEP 2: SIMULATION ENGINE HUD --- */}
      {activeStep === 'ENGINE' && (
        <>
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
                <TacticalText variant="subheading" color="sos.blue.400">Visual Feed Calibration</TacticalText>
                <Icon as={Layers} size={14} color="whiteAlpha.300" />
              </HStack>
              
              <VStack spacing={4} align="stretch" px={2} py={2}>
                 <VStack align="stretch" spacing={2} p={3} bg="whiteAlpha.100" borderRadius="xl">
                    <TacticalText variant="mono" fontSize="9px" color="whiteAlpha.400">RENDER_PIPELINE</TacticalText>
                    <TacticalText variant="heading" fontSize="xs" letterSpacing="0.1em">WEBGL_2.0_PURE_CORE</TacticalText>
                    <HStack justify="space-between" mt={2}>
                       <TacticalText fontSize="8px" color="whiteAlpha.500">GPU_LOAD</TacticalText>
                       <TacticalText variant="mono" color="sos.blue.400" fontSize="9px">42.8%</TacticalText>
                    </HStack>
                 </VStack>
              </VStack>
            </GlassPanel>

            <GlassPanel flex={1} p={5} intensity="medium" flexDirection="column" overflow="hidden">
              <HStack mb={4} justify="space-between">
                <TacticalText variant="subheading" color="sos.blue.400">Operational Log</TacticalText>
                <Icon as={Activity} size={14} color="whiteAlpha.300" />
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
                    onClick={() => setActiveStep('CONFIG')} 
                    variant="outline"
                    leftIcon={<Icon as={RefreshCw} size={14} />}
                    h="54px"
                    borderColor="whiteAlpha.200"
                    _hover={{ bg: 'whiteAlpha.100' }}
                  >
                    Reset Configuration
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
                <Box textAlign="right" mr={2}>
                   <TacticalText variant="caption" color="whiteAlpha.400">TELEMETRY_SYNC</TacticalText>
                   <TacticalText variant="mono" fontSize="xs" color="sos.blue.400">OK // RADAR_ACTIVE</TacticalText>
                </Box>
                <Divider orientation="vertical" h="32px" borderColor="whiteAlpha.200" />
                <VStack align="end" spacing={0}>
                  <TacticalText variant="caption" color="whiteAlpha.400">LATENCY_CORE</TacticalText>
                  <TacticalText variant="mono" fontSize="xs">240 TFLOPS</TacticalText>
                </VStack>
                <Box p={3} bg="whiteAlpha.100" borderRadius="full" border="1px solid" borderColor="whiteAlpha.200">
                   <Icon as={Activity} size={20} color="sos.blue.400" />
                </Box>
              </HStack>
            </GlassPanel>
          </Box>
        </>
      )}
    </Box>
  );
}
