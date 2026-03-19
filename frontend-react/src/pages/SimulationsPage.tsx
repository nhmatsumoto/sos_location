import { 
  Box, 
  VStack, 
  Center,
  Icon,
  HStack,
  Divider,
  Input,
  Flex,
  Grid,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Switch,
  SimpleGrid,
  Select,
  Badge
} from '@chakra-ui/react';
import { 
  Activity, 
  Wind, 
  Play, 
  RefreshCw, 
  ChevronRight,
  Thermometer,
  Waves
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

// Atomic Components
import { CityScaleWebGL } from '../components/ui/CityScaleWebGL';
import { GlassPanel } from '../components/atoms/GlassPanel';
import { TacticalText } from '../components/atoms/TacticalText';
import { TacticalButton } from '../components/atoms/TacticalButton';
import { TacticalStat } from '../components/molecules/TacticalStat';
import { EventTimeline } from '../components/ui/EventTimeline';
import { useSimulationsController } from '../hooks/useSimulationsController';
import { CitySearch } from '../components/ui/CitySearch';
import { MiniMapPicker } from '../components/ui/MiniMapPicker';

type SimStep = 'LOCATION' | 'INDEXING' | 'SCENARIO' | 'SIMULATION';

/**
 * Guardian Simulation Engine v4.0.0 — "HYDRA WIZARD"
 * Implementação linear do fluxo de simulação GIS.
 */
export function SimulationsPage() {
  const [activeStep, setActiveStep] = useState<SimStep>('LOCATION');
  const [disasterType, setDisasterType] = useState('FLOOD');
  const [missionIndexLoading, setMissionIndexLoading] = useState(false);
  
  // Advanced Simulation State
  const [config, setConfig] = useState({
    pressure: 1013,
    precipitation: 45,
    windSpeed: 120,
    windDirection: 45, // New: Wind angle in degrees
    waterLevel: 5,
    eventWindow: 24,
    geologyIndex: 2.5,
    intensity: 75,
    duration: 120,
    resolution: 120, // New: Mesh resolution (polygon count)
    urbanDensity: 0.65, // New: Amount of buildings to generate
  });

  // Layer Visibility State
  const [layers, setLayers] = useState({
    particles: true,
    streets: true,
    buildings: true,
    topography: true,
    vegetation: true,
    terrain: true,
    satellite: false,
    aiStructural: true,
    polygons: true,
  });

  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState('');

  const [bbox, setBbox] = useState<number[] | undefined>(undefined);

  const {
    lat, setLat, lng, setLng,
    resultData, streamSteps, isSimulating,
    numericLat, numericLng,
    actions
  } = useSimulationsController();
  const handleIndexMission = async () => {
    setActiveStep('INDEXING');
    setAnalysisProgress(0);
    setAnalysisStatus('INITIALIZING_HYDRA_INDEXER...');
    
    const span = 0.025; 
    const finalBbox = bbox || [numericLat - span, numericLng - span, numericLat + span, numericLng + span];

    // Visual progress stimulation
    const interval = setInterval(() => {
      setAnalysisProgress(prev => Math.min(prev + Math.random() * 15, 85));
    }, 500);

    try {
      await actions.indexGisMission(finalBbox);
      clearInterval(interval);
      setAnalysisProgress(100);
      setAnalysisStatus('MISSION_CONTEXT_LOCKED');
      
      setTimeout(() => {
        setActiveStep('SCENARIO');
      }, 800);
    } catch (err) {
      clearInterval(interval);
      setAnalysisStatus('ERROR: GIS_INDEXING_FAILED');
      setTimeout(() => setActiveStep('LOCATION'), 2000);
    }
  };

  const handleStartSimulation = async () => {
    setActiveStep('SIMULATION');
    const span = 0.025; 
    const finalBbox = bbox || [numericLat - span, numericLng - span, numericLat + span, numericLng + span];
    await actions.runSimulation(disasterType, config.resolution, finalBbox, config);
  };

  const handleCitySelect = (la: number, lo: number, name: string, b?: string[]) => {
    setLat(String(la)); 
    setLng(String(lo)); 
    if (b) {
      const nb = [parseFloat(b[0]), parseFloat(b[2]), parseFloat(b[1]), parseFloat(b[3])];
      setBbox(nb);
    } else {
      setBbox(undefined);
    }
  };

  // Influence atmospheric parameters based on Disaster Type
  useEffect(() => {
    const profiles: Record<string, any> = {
      'TORNADO': { pressure: 965, windSpeed: 210, precipitation: 80, waterLevel: 0 },
      'HURRICANE': { pressure: 950, windSpeed: 250, precipitation: 150, waterLevel: 4 },
      'FLOOD': { pressure: 1010, windSpeed: 45, precipitation: 120, waterLevel: 8.5 },
      'TSUNAMI': { pressure: 1013, windSpeed: 30, precipitation: 10, waterLevel: 15 },
      'EARTHQUAKE': { pressure: 1013, windSpeed: 10, precipitation: 0, waterLevel: 0, geologyIndex: 8.5 },
      'MUDSLIDE': { pressure: 1005, windSpeed: 60, precipitation: 180, waterLevel: 2, geologyIndex: 4.5 },
      'WILDFIRE': { pressure: 1015, windSpeed: 80, precipitation: 0, waterLevel: 0, temp: 45 },
    };

    if (profiles[disasterType]) {
      setConfig(prev => ({
        ...prev,
        ...profiles[disasterType]
      }));
    }
  }, [disasterType]);

  const toggleLayer = (key: keyof typeof layers) => {
    setLayers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Box h="100vh" w="full" position="relative" overflow="hidden" bg="black" color="white">

      {/* --- WEBGL ENGINE LAYER --- */}
      {activeStep === 'SIMULATION' && (
        <Box position="absolute" inset={0} zIndex={5}>
          <CityScaleWebGL
            lat={numericLat}
            lng={numericLng}
            resolution={config.resolution}
            disasterType={disasterType}
            intensity={config.intensity}
            isSimulating={isSimulating}
            missionData={resultData}
          />
        </Box>
      )}

      {/* --- HUD: HEADER & WIZARD PROGRESS --- */}
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        zIndex={100}
        px={{ base: 4, md: 6, xl: 8 }}
        py={{ base: 3, md: 4 }}
        bgGradient="linear(to-b, blackAlpha.800, transparent)"
      >
        <Flex justify="space-between" align="center">
          <HStack spacing={{ base: 3, md: 6 }} align="flex-start">
            <VStack align="start" spacing={0}>
              <TacticalText variant="caption" color="sos.blue.400" letterSpacing="0.3em">CORE_ENGINE: HYDRA_V4</TacticalText>
              <HStack>
                 <TacticalText variant="heading" fontSize="xl">Mission Control Wizard</TacticalText>
                 <Badge variant="solid" bg="sos.blue.500" fontSize="9px">STEP: {activeStep}</Badge>
              </HStack>
            </VStack>
            <Divider orientation="vertical" h="40px" borderColor="whiteAlpha.300" />
            <HStack spacing={{ base: 3, md: 6, xl: 8 }} ml={{ base: 0, md: 4 }} flexWrap="wrap">
              <WizardStep name="GEOGRAFIA" active={activeStep === 'LOCATION'} done={['INDEXING', 'SCENARIO', 'SIMULATION'].includes(activeStep)} />
              <WizardStep name="INDEXAÇÃO" active={activeStep === 'INDEXING'} done={['SCENARIO', 'SIMULATION'].includes(activeStep)} />
              <WizardStep name="CENÁRIO" active={activeStep === 'SCENARIO'} done={['SIMULATION'].includes(activeStep)} />
              <WizardStep name="SIMULAÇÃO" active={activeStep === 'SIMULATION'} done={false} />
            </HStack>
          </HStack>

          <HStack spacing={4} flexWrap="wrap">
             {activeStep === 'SIMULATION' && (
               <TacticalButton
                 variant="ghost"
                 leftIcon={<RefreshCw size={16} />}
                 onClick={() => setActiveStep('LOCATION')}
               >
                 NOVA MISSÃO
               </TacticalButton>
             )}
             <HStack spacing={2} px={3} py={1} bg="whiteAlpha.50" borderRadius="full">
                <Box boxSize="8px" bg="sos.green.500" borderRadius="full" className="animate-pulse" />
                <TacticalText variant="mono" fontSize="10px">SYSTEM_READY</TacticalText>
             </HStack>
          </HStack>
        </Flex>
      </Box>

      {/* --- STEP 1: LOCATION SELECTION --- */}
      {activeStep === 'LOCATION' && (
        <Center h="full" w="full" zIndex={110} px={{ base: 4, md: 6 }}>
          <Box w="full" maxW="1200px" maxH={{ base: 'calc(100vh - 120px)', md: '80vh' }}>
            <GlassPanel p={10} depth="raised" flexDirection="column">
              <VStack spacing={8} align="stretch">
                 <Box>
                    <TacticalText variant="heading" fontSize="2xl">1. Localização Operacional</TacticalText>
                    <TacticalText variant="caption" mt={2} color="whiteAlpha.600">Selecione ou busque a área de interesse para a missão de desastre.</TacticalText>
                 </Box>

                 <Grid templateColumns={{ base: '1fr', xl: 'minmax(0, 1.35fr) minmax(320px, 420px)' }} gap={{ base: 6, xl: 8 }} alignItems="stretch">
                    <VStack align="stretch" spacing={6}>
                       <Box>
                          <TacticalText variant="subheading" mb={4}>BUSCA HIERÁRQUICA / FILTROS</TacticalText>
                          <CitySearch onSelect={handleCitySelect} />
                          <HStack mt={4} spacing={3} flexWrap="wrap">
                             <Select placeholder="País" variant="filled" bg="whiteAlpha.100" size="sm" borderRadius="md"><option>Brasil</option></Select>
                             <Select placeholder="Estado" variant="filled" bg="whiteAlpha.100" size="sm" borderRadius="md"><option>São Paulo</option></Select>
                             <Select placeholder="Cidade" variant="filled" bg="whiteAlpha.100" size="sm" borderRadius="md"><option>São Paulo</option></Select>
                             <Select placeholder="Bairro" variant="filled" bg="whiteAlpha.100" size="sm" borderRadius="md"><option>Centro</option></Select>
                          </HStack>
                       </Box>

                       <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                          <TacticalStat label="LATITUDE" value={numericLat.toFixed(6)} unit="°" />
                          <TacticalStat label="LONGITUDE" value={numericLng.toFixed(6)} unit="°" />
                       </SimpleGrid>

                       <Box flex={1} />

                       <TacticalButton
                         h="60px"
                         bg="sos.blue.500"
                         glow
                         rightIcon={<ChevronRight size={18} />}
                         onClick={handleIndexMission}
                       >
                         AVANÇAR PARA INDEXAÇÃO DE DADOS
                       </TacticalButton>
                    </VStack>

                    <VStack align="stretch" spacing={4}>
                       <TacticalText variant="subheading">DEMARCAÇÃO VISUAL (MAPA 2D)</TacticalText>
                       <Box h={{ base: '300px', md: '360px', xl: '100%' }} minH={{ xl: '420px' }} borderRadius="2xl" overflow="hidden" border="1px solid" borderColor="whiteAlpha.200">
                          <MiniMapPicker
                            lat={numericLat}
                            lng={numericLng}
                            onChange={(la, lo) => {
                              setLat(la.toFixed(6));
                              setLng(lo.toFixed(6));
                              const span = 0.025;
                              setBbox([la - span, lo - span, la + span, lo + span]);
                            }}
                          />
                       </Box>
                       <TacticalText variant="mono" fontSize="10px" color="whiteAlpha.400" textAlign="center">
                          AREA_ESTIMADA: 25.00 km² // RES_LEVEL: HIGH
                       </TacticalText>
                    </VStack>
                 </Grid>
              </VStack>
            </GlassPanel>
          </Box>
        </Center>
      )}

      {/* --- STEP 3: SCENARIO CONFIGURATION --- */}
      {activeStep === 'SCENARIO' && (
        <Center h="full" w="full" zIndex={110} px={{ base: 4, md: 6 }}>
          <Box w="full" maxW="720px">
            <GlassPanel p={8} depth="raised" flexDirection="column">
              <VStack spacing={6} align="stretch">
                 <Box>
                    <TacticalText variant="heading" fontSize="xl">3. Configuração do Cenário</TacticalText>
                    <TacticalText variant="caption" mt={1}>Defina o evento catastrófico e variáveis ambientais</TacticalText>
                 </Box>

                 <VStack spacing={4} align="stretch" p={4} bg="whiteAlpha.50" borderRadius="2xl" border="1px solid" borderColor="whiteAlpha.100">
                    <Box>
                      <TacticalText variant="subheading" mb={3}>TIPO DE DESASTRE</TacticalText>
                      <Select
                        value={disasterType}
                        onChange={(e) => setDisasterType(e.target.value)}
                        bg="whiteAlpha.100"
                        borderColor="whiteAlpha.100"
                        h="52px"
                        borderRadius="xl"
                      >
                        <option value="FLOOD">Inundação / Enchente</option>
                        <option value="TSUNAMI">Tsunami / Massa d'Água</option>
                        <option value="EARTHQUAKE">Terremoto / Sismo</option>
                        <option value="WILDFIRE">Incêndio Florestal</option>
                        <option value="MUDSLIDE">Deslizamento de Terra</option>
                        <option value="HURRICANE">Furacão / Ciclone</option>
                        <option value="HAIL">Tempestade de Granizo</option>
                        <option value="FROST">Geada Severa</option>
                      </Select>
                    </Box>

                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                       <ConfigSlider label="Intensidade" value={config.intensity} unit="%" min={0} max={100} onChange={(v) => setConfig(c => ({...c, intensity: v}))} />
                       <ConfigSlider label="Duração" value={config.duration} unit="min" min={10} max={300} onChange={(v) => setConfig(c => ({...c, duration: v}))} />
                    </SimpleGrid>
                 </VStack>

                 <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    <ConfigSlider label="Nível da Água" value={config.waterLevel} unit="m" min={0} max={20} onChange={(v) => setConfig(c => ({...c, waterLevel: v}))} />
                    <ConfigSlider label="Velocidade Vento" value={config.windSpeed} unit="km/h" min={0} max={250} onChange={(v) => setConfig(c => ({...c, windSpeed: v}))} />
                 </SimpleGrid>

                 <TacticalButton
                   h="60px"
                   bg="sos.green.500"
                   glow
                   leftIcon={<Play size={18} />}
                   onClick={handleStartSimulation}
                 >
                   CONSOLIDAR E EXECUTAR SIMULAÇÃO
                 </TacticalButton>
              </VStack>
            </GlassPanel>
          </Box>
        </Center>
      )}

      {/* --- STEP 2: INDEXING VIEW (RENAMED FROM ANALYSIS) --- */}
      {activeStep === 'INDEXING' && (
        <Box
          position="absolute"
          inset={0}
          zIndex={150}
          bg="blackAlpha.900"
          backdropFilter="blur(20px)"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <VStack spacing={8} w="full" maxW="600px">
            <Box position="relative" w="full" h="350px" borderRadius="2xl" overflow="hidden" border="1px solid" borderColor="whiteAlpha.300" bg="whiteAlpha.100">
               <Box position="absolute" top={0} left={0} right={0} h="2px" bg="sos.blue.400" boxShadow="0 0 20px #007AFF" zIndex={2} style={{ animation: 'scanning 3s linear infinite' }} />
               <Flex direction="column" h="full" p={8} justify="space-between">
                  <HStack justify="space-between">
                     <TacticalText variant="mono" fontSize="2xs" color="sos.blue.400">[HYDRA_INDEXER_RUNNING]</TacticalText>
                     <TacticalText variant="mono" fontSize="2xs" color="whiteAlpha.400">THREADS: 16 // BUFFER: OK</TacticalText>
                  </HStack>
                  <VStack spacing={2}>
                     <TacticalText variant="heading" fontSize="2xl" textAlign="center" letterSpacing="0.4em">INDEXAÇÃO_DE_DADOS</TacticalText>
                     <TacticalText variant="caption" textAlign="center" opacity={0.6}>{analysisStatus}</TacticalText>
                  </VStack>
                  <Box>
                    <Flex justify="space-between" mb={2}>
                       <TacticalText variant="mono" fontSize="10px">ESTRUTURANDO_CONTEXTO_URBANO</TacticalText>
                       <TacticalText variant="mono" fontSize="10px">{analysisProgress}%</TacticalText>
                    </Flex>
                    <Box h="2px" w="full" bg="whiteAlpha.100" borderRadius="full">
                       <Box h="full" w={`${analysisProgress}%`} bg="sos.blue.400" transition="width 0.3s ease-out" boxShadow="0 0 15px #007AFF" />
                    </Box>
                  </Box>
               </Flex>
            </Box>
            <SimpleGrid columns={3} spacing={4} w="full">
               <AnalysisStat label="SATÉLITE" value="RGB_CAPTURED" active={analysisProgress > 20} />
               <AnalysisStat label="TOPOLOGIA" value="DEM_FLOAT" active={analysisProgress > 50} />
               <AnalysisStat label="INFRA" value="VECC_LAYERS" active={analysisProgress > 80} />
            </SimpleGrid>
          </VStack>
          <style>{`@keyframes scanning { 0% { top: 0%; } 100% { top: 100%; } }`}</style>
        </Box>
      )}

      {/* --- STEP 4: SIMULATION VIEW (RENAMED FROM ENGINE) --- */}
      {activeStep === 'SIMULATION' && (
        <Box
          position="absolute"
          right={{ base: 4, md: 6 }}
          top={{ base: '88px', md: '100px' }}
          bottom={{ base: 4, md: 6 }}
          w={{ base: 'calc(100% - 32px)', sm: '360px', xl: '380px' }}
          maxW="380px"
          zIndex={100}
        >
          <VStack h="full" spacing={6} align="stretch">
             <GlassPanel p={6} depth="raised" flexDirection="column">
                <HStack mb={6} justify="space-between">
                   <TacticalText variant="heading" fontSize="xs">TELEMETRIA_ATIVA</TacticalText>
                   <Box boxSize="8px" bg="sos.red.500" borderRadius="full" className="animate-pulse" />
                </HStack>
                <SimpleGrid columns={2} spacing={4}>
                   <TelemetryItem label="VENTO" value={`${config.windSpeed}km/h`} />
                   <TelemetryItem label="PRESSÃO" value={`${config.pressure}hPa`} />
                   <TelemetryItem label="EVENTO" value={disasterType} />
                   <TelemetryItem label="STATUS" value="LIVE" />
                </SimpleGrid>
             </GlassPanel>

             <GlassPanel flex={1} p={6} depth="base" flexDirection="column" overflow="hidden">
               <TacticalText variant="subheading" mb={4} color="sos.blue.400">Eventos de Missão</TacticalText>
               <Box flex={1} overflowY="auto" className="custom-scrollbar" pr={2}>
                 <EventTimeline steps={streamSteps} />
               </Box>
             </GlassPanel>
          </VStack>
        </Box>
      )}

      {/* Background Stats HUD */}
      {(activeStep === 'SIMULATION' || activeStep === 'SCENARIO') && (
        <Box position="absolute" bottom={8} left={8} zIndex={100}>
          <HStack spacing={4} flexWrap="wrap">
            <GlassPanel px={4} py={3} depth="base" align="center">
               <Icon as={Wind} color="sos.blue.400" mr={2} size={14} />
               <TacticalText variant="mono" fontSize="xs">{config.windSpeed} km/h</TacticalText>
            </GlassPanel>
            <GlassPanel px={4} py={3} depth="base" align="center">
               <Icon as={Thermometer} color="orange.400" mr={2} size={14} />
               <TacticalText variant="mono" fontSize="xs">{config.pressure} hPa</TacticalText>
            </GlassPanel>
            <GlassPanel px={4} py={3} depth="base" align="center">
               <Icon as={Waves} color="cyan.400" mr={2} size={14} />
               <TacticalText variant="mono" fontSize="xs">WATER_LEVEL: +{config.waterLevel}m</TacticalText>
            </GlassPanel>
          </HStack>
        </Box>
      )}
    </Box>
  );
}

// Internal Helper Components
const WizardStep = ({ name, active, done }: { name: string, active: boolean, done: boolean }) => (
  <HStack spacing={2} opacity={active || done ? 1 : 0.3} transition="all 0.3s">
    <Center 
      boxSize="20px" 
      borderRadius="full" 
      bg={done ? "sos.green.500" : (active ? "sos.blue.500" : "whiteAlpha.200")}
      border="1px solid"
      borderColor="whiteAlpha.300"
    >
      <TacticalText variant="mono" fontSize="9px" color="white">{done ? "✓" : ""}</TacticalText>
    </Center>
    <TacticalText 
      variant="caption" 
      fontSize="10px" 
      color={active ? "sos.blue.400" : "whiteAlpha.600"}
      fontWeight={active ? "bold" : "normal"}
    >
      {name}
    </TacticalText>
  </HStack>
);

interface ConfigSliderProps {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  onChange: (v: number) => void;
}

const ConfigSlider = ({ label, value, unit, min, max, onChange }: ConfigSliderProps) => (
  <Box>
    <Flex justify="space-between" mb={2}>
      <TacticalText variant="caption">{label}</TacticalText>
      <TacticalText variant="mono" color="sos.blue.400">{value} {unit}</TacticalText>
    </Flex>
    <Slider min={min} max={max} value={value} onChange={onChange}>
      <SliderTrack bg="whiteAlpha.100"><SliderFilledTrack bg="sos.blue.500" /></SliderTrack>
      <SliderThumb boxSize={3} bg="white" />
    </Slider>
  </Box>
);

interface TelemetryItemProps {
  label: string;
  value: string;
}

const TelemetryItem = ({ label, value }: TelemetryItemProps) => (
  <VStack align="start" spacing={0} p={3} bg="whiteAlpha.50" borderRadius="xl" border="1px solid" borderColor="whiteAlpha.100">
     <TacticalText variant="caption" fontSize="9px" opacity={0.4}>{label}</TacticalText>
     <TacticalText variant="mono" fontSize="md" color="white">{value}</TacticalText>
  </VStack>
);

const AnalysisStat = ({ label, value, active }: { label: string, value: string, active: boolean }) => (
  <VStack 
    p={4} 
    border="1px solid" 
    borderColor={active ? "sos.blue.500" : "whiteAlpha.100"} 
    bg={active ? "blue.900" : "transparent"} 
    borderRadius="xl"
    transition="all 0.3s"
    opacity={active ? 1 : 0.4}
  >
    <TacticalText variant="mono" fontSize="9px" color={active ? "sos.blue.400" : "whiteAlpha.400"}>{label}</TacticalText>
    <TacticalText variant="heading" fontSize="xs">{value}</TacticalText>
    {active && <Icon as={Zap} size={10} color="sos.blue.400" mt={1} />}
  </VStack>
);
