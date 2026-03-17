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
  SliderThumb,
  Switch,
  SimpleGrid,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Select,
  Badge
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
  Database,
  Search,
  Thermometer,
  Waves,
  Mountain,
  Eye,
  EyeOff,
  CloudLightning,
  Boxes,
  type LucideIcon
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

type SimStep = 'CONFIG' | 'ENGINE';

/**
 * Guardian Simulation Engine v3.0.0 — "HYDRA CORE"
 * Fully controllable macro-scale GIS disaster simulation.
 */
export function SimulationsPage() {
  const [activeStep, setActiveStep] = useState<SimStep>('CONFIG');
  const [disasterType, setDisasterType] = useState('FLOOD');
  
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
  });

  const [bbox, setBbox] = useState<number[] | undefined>(undefined);

  const {
    lat, setLat, lng, setLng,
    resultData, streamSteps, isSimulating,
    numericLat, numericLng,
    actions
  } = useSimulationsController();

  const handleStartSimulation = () => {
    setActiveStep('ENGINE');
    actions.runSimulation(disasterType.toLowerCase(), config.resolution, bbox);
  };

  const handleCitySelect = (la: number, lo: number, name: string, b?: string[]) => {
    setLat(String(la)); 
    setLng(String(lo)); 
    if (b) {
      // Nominatim format is [miny, maxy, minx, maxx] -> [minLat, maxLat, minLon, maxLon]
      // Wait, Nominatim returns: ["40.477399", "40.917577", "-74.25909", "-73.7001809"]
      // Actually it is [south, north, west, east]
      const nb = [parseFloat(b[0]), parseFloat(b[2]), parseFloat(b[1]), parseFloat(b[3])];
      setBbox(nb);
    } else {
      setBbox(undefined);
    }
  };

  useEffect(() => {
    if (bbox) {
       handleStartSimulation();
    }
  }, [bbox]);

  const toggleLayer = (key: keyof typeof layers) => {
    setLayers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Box h="100%" w="100%" position="relative" overflow="hidden" bg="sos.dark">
      {/* Simulation Renderer (Background) */}
      <Box position="absolute" inset={0} zIndex={0}>
        <CityScaleWebGL 
          centerLat={numericLat} 
          centerLng={numericLng} 
          layers={layers}
          simData={{ type: disasterType, ...config }}
          resultData={resultData}
        />
      </Box>

      {/* --- COMMAND HUD: TOP BANNER --- */}
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
              <TacticalText variant="caption" color="sos.blue.400" letterSpacing="0.3em">CORE_ENGINE: HYDRA_V3</TacticalText>
              <HStack>
                 <TacticalText variant="heading" fontSize="xl">Módulo de Simulação</TacticalText>
                 <Badge variant="solid" bg="sos.blue.500" fontSize="9px">PRO_VERSION</Badge>
              </HStack>
            </VStack>
            <Divider orientation="vertical" h="40px" borderColor="whiteAlpha.300" />
            <HStack spacing={3}>
               <VStack align="start" spacing={1}>
                  <TacticalText variant="caption" color="whiteAlpha.400">COORDENADAS_OPERACIONAIS</TacticalText>
                  <TacticalText variant="mono" fontSize="xs">LAT: {numericLat.toFixed(4)} // LNG: {numericLng.toFixed(4)}</TacticalText>
               </VStack>
            </HStack>
          </HStack>

          <HStack spacing={4}>
             <TacticalButton 
               variant="ghost" 
               leftIcon={<Settings size={16} />} 
               onClick={() => setActiveStep('CONFIG')}
               color={activeStep === 'CONFIG' ? 'sos.blue.400' : 'whiteAlpha.600'}
             >
               CONFIGURAÇÕES
             </TacticalButton>
             <Divider orientation="vertical" h="24px" borderColor="whiteAlpha.200" />
             <HStack spacing={2} px={3} py={1} bg="whiteAlpha.50" borderRadius="full">
                <Box boxSize="8px" bg="sos.green.500" borderRadius="full" className="animate-pulse" />
                <TacticalText variant="mono" fontSize="10px">SYSTEM_ONLINE</TacticalText>
             </HStack>
          </HStack>
        </Flex>
      </Box>

      {/* --- PANEL: CONFIGURATION (LEFT DRAWER STYLE) --- */}
      {activeStep === 'CONFIG' && (
        <Box 
          position="absolute" 
          left={6} 
          top="100px" 
          bottom={6} 
          w="400px" 
          zIndex={100}
        >
          <GlassPanel h="full" p={0} depth="raised" flexDirection="column" overflow="hidden">
             <Box p={4} borderBottom="1px solid" borderColor="whiteAlpha.100" bg="whiteAlpha.50">
               <TacticalText variant="heading" fontSize="md">Setup de Simulação</TacticalText>
               <TacticalText variant="caption" mt={1}>Calibre as variáveis ambientais e urbanas</TacticalText>
             </Box>

             <Tabs variant="unstyled" flex={1} display="flex" flexDirection="column">
               <TabList px={4} bg="whiteAlpha.50" borderBottom="1px solid" borderColor="whiteAlpha.100">
                 <ConfigTab icon={MapPin} label="Geografia" />
                 <ConfigTab icon={CloudLightning} label="Ambiente" />
                 <ConfigTab icon={Layers} label="Camadas" />
               </TabList>

               <TabPanels flex={1} overflowY="auto" className="custom-scrollbar">
                 {/* Page 1: Geography */}
                 <TabPanel p={6}>
                    <VStack spacing={6} align="stretch">
                       <Box>
                         <TacticalText variant="subheading" mb={4}>BUSCAR LOCALIZAÇÃO</TacticalText>
                         <CitySearch onSelect={handleCitySelect} />
                       </Box>
                       
                       <Box>
                         <TacticalText variant="subheading" mb={4}>SELEÇÃO VISUAL (MAPA 2D)</TacticalText>
                         <MiniMapPicker 
                           lat={numericLat} 
                           lng={numericLng} 
                           onChange={(la, lo) => { setLat(la.toFixed(6)); setLng(lo.toFixed(6)); }} 
                         />
                         <HStack justify="space-between" mt={4}>
                            <VStack align="start" spacing={0}>
                               <TacticalText variant="caption">LATITUDE_RAW</TacticalText>
                               <TacticalText variant="mono" color="sos.blue.400">{numericLat}</TacticalText>
                            </VStack>
                            <VStack align="end" spacing={0}>
                               <TacticalText variant="caption">LONGITUDE_RAW</TacticalText>
                               <TacticalText variant="mono" color="sos.blue.400">{numericLng}</TacticalText>
                            </VStack>
                         </HStack>
                       </Box>
                    </VStack>
                 </TabPanel>

                 {/* Page 2: Environment */}
                 <TabPanel p={6}>
                    <VStack spacing={6} align="stretch">
                       <Box>
                         <TacticalText variant="subheading" mb={4}>TIPO DE EVENTO</TacticalText>
                         <Select 
                           value={disasterType} 
                           onChange={(e) => setDisasterType(e.target.value)}
                           bg="whiteAlpha.50"
                           borderColor="whiteAlpha.100"
                           fontSize="xs"
                           h="52px"
                           borderRadius="xl"
                         >
                           <option value="FLOOD">Inundação / Enchente</option>
                           <option value="TORNADO">Evento Ciclônico (Tornado)</option>
                           <option value="MUDSLIDE">Deslizamento de Terra</option>
                         </Select>
                       </Box>

                       <ConfigSlider 
                         label="Pressão Atmosférica" 
                         value={config.pressure} 
                         unit="hPa" 
                         min={950} max={1050} 
                         onChange={(v: number) => setConfig(c => ({...c, pressure: v}))} 
                       />
                       <ConfigSlider 
                         label="Precipitação (Chuva)" 
                         value={config.precipitation} 
                         unit="mm/h" 
                         min={0} max={200} 
                         onChange={(v: number) => setConfig(c => ({...c, precipitation: v}))} 
                       />
                       <ConfigSlider 
                         label="Velocidade do Vento" 
                         value={config.windSpeed} 
                         unit="km/h" 
                         min={0} max={250} 
                         onChange={(v: number) => setConfig(c => ({...c, windSpeed: v}))} 
                       />
                       <ConfigSlider 
                         label="Direção do Vento" 
                         value={config.windDirection} 
                         unit="°" 
                         min={0} max={360} 
                         onChange={(v: number) => setConfig(c => ({...c, windDirection: v}))} 
                       />
                       <ConfigSlider 
                         label="Nível da Água / Volume" 
                         value={config.waterLevel} 
                         unit="m" 
                         min={0} max={20} 
                         onChange={(v: number) => setConfig(c => ({...c, waterLevel: v}))} 
                       />
                       <ConfigSlider 
                          label="Janela de Evento" 
                          value={config.eventWindow} 
                          unit="h" 
                          min={1} max={72} 
                          onChange={(v: number) => setConfig(c => ({...c, eventWindow: v}))} 
                        />

                        <Divider borderColor="whiteAlpha.100" />
                        <TacticalText variant="subheading" color="sos.blue.400">QUALIDADE DA MALHA (GPU)</TacticalText>
                        
                        <ConfigSlider 
                          label="Resolução da Topografia" 
                          value={config.resolution} 
                          unit="vtx" 
                          min={20} max={1024} 
                          onChange={(v: number) => setConfig(c => ({...c, resolution: v}))} 
                        />
                        <ConfigSlider 
                          label="Densidade de Edificações" 
                          value={config.urbanDensity} 
                          unit="%" 
                          min={0} max={100} 
                          onChange={(v: number) => setConfig(c => ({...c, urbanDensity: v}))} 
                        />
                    </VStack>
                 </TabPanel>

                 {/* Page 3: Rendering Layers */}
                 <TabPanel p={6}>
                   <VStack spacing={4} align="stretch">
                      <LayerToggle label="Simulação de Partículas" active={layers.particles} onToggle={() => toggleLayer('particles')} />
                      <LayerToggle label="Rede de Ruas" active={layers.streets} onToggle={() => toggleLayer('streets')} />
                      <LayerToggle label="Massas Urbanas (Prédios)" active={layers.buildings} onToggle={() => toggleLayer('buildings')} />
                      <LayerToggle label="Topografia e Relevo" active={layers.topography} onToggle={() => toggleLayer('topography')} />
                      <LayerToggle label="Zonas de Mata / Floresta" active={layers.vegetation} onToggle={() => toggleLayer('vegetation')} />
                      <LayerToggle label="Replicador Estrutural IA" active={layers.aiStructural} onToggle={() => toggleLayer('aiStructural')} />
                      <LayerToggle label="Imagens de Satélite" active={layers.satellite} onToggle={() => toggleLayer('satellite')} />
                   </VStack>
                 </TabPanel>
               </TabPanels>

               <Box p={6} borderTop="1px solid" borderColor="whiteAlpha.100">
                  <TacticalButton 
                    w="full" h="64px" bg="sos.blue.500" glow
                    leftIcon={<Icon as={Play} size={18} />}
                    onClick={handleStartSimulation}
                  >
                    INICIALIZAR MOTOR HYDRA
                  </TacticalButton>
               </Box>
             </Tabs>
          </GlassPanel>
        </Box>
      )}

      {/* --- ENGINE VIEW: RESULTS & TELEMETRY --- */}
      {activeStep === 'ENGINE' && (
        <Box 
          position="absolute" 
          right={6} 
          top="100px" 
          bottom={6} 
          w="380px" 
          zIndex={100}
        >
          <VStack h="full" spacing={6} align="stretch">
             <GlassPanel p={6} depth="raised" flexDirection="column">
                <HStack mb={6} justify="space-between">
                   <TacticalText variant="heading" fontSize="xs">TELEMETRIA_EM_TEMPO_REAL</TacticalText>
                   <Box boxSize="8px" bg="sos.red.500" borderRadius="full" className="animate-pulse" />
                </HStack>
                
                <SimpleGrid columns={2} spacing={4}>
                   <TelemetryItem label="VENTO_ATM" value={`${config.windSpeed}km/h`} />
                   <TelemetryItem label="PRESSÃO_HPA" value={`${config.pressure}`} />
                   <TelemetryItem label="MALHA_GPU" value={`${config.resolution} vtx`} />
                   <TelemetryItem label="DENSIDADE" value={`${(config.urbanDensity * 100).toFixed(0)}%`} />
                </SimpleGrid>

                <Box mt={8}>
                   <TacticalText variant="caption" mb={2}>PROGRESSO DA SIMULAÇÃO</TacticalText>
                   <Box h="4px" w="full" bg="whiteAlpha.100" borderRadius="full" overflow="hidden">
                      <Box h="full" w="45%" bg="sos.blue.500" boxShadow="0 0 10px #007AFF" />
                   </Box>
                </Box>
             </GlassPanel>

             <GlassPanel flex={1} p={6} depth="base" flexDirection="column" overflow="hidden">
               <TacticalText variant="subheading" mb={4} color="sos.blue.400">Log de Processamento</TacticalText>
               <Box flex={1} overflowY="auto" className="custom-scrollbar" pr={2}>
                 <EventTimeline steps={streamSteps} />
               </Box>
             </GlassPanel>

             <TacticalButton variant="outline" borderColor="whiteAlpha.200" onClick={() => setActiveStep('CONFIG')}>
                RECONFIGURAR ENGINE
             </TacticalButton>
          </VStack>
        </Box>
      )}

      {/* Background Stats HUD */}
      <Box position="absolute" bottom={8} left={8} zIndex={10}>
         <HStack spacing={4}>
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
    </Box>
  );
}

// Internal Helper Components
interface ConfigTabProps {
  icon: LucideIcon;
  label: string;
}

const ConfigTab = ({ icon: Icon, label }: ConfigTabProps) => (
  <Tab 
    _selected={{ color: 'sos.blue.400', borderBottomColor: 'sos.blue.400' }} 
    py={4} px={6} fontSize="xs" fontWeight="bold" letterSpacing="0.1em"
  >
    <HStack spacing={2}>
       <Icon size={14} />
       <TacticalText variant="caption" color="inherit">{label}</TacticalText>
    </HStack>
  </Tab>
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

interface LayerToggleProps {
  label: string;
  active: boolean;
  onToggle: () => void;
}

const LayerToggle = ({ label, active, onToggle }: LayerToggleProps) => (
  <Flex justify="space-between" align="center" p={3} bg="whiteAlpha.50" borderRadius="xl">
    <HStack spacing={3}>
       <Icon as={active ? Eye : EyeOff} size={14} color={active ? "sos.blue.400" : "whiteAlpha.300"} />
       <TacticalText variant="caption">{label}</TacticalText>
    </HStack>
    <Switch isChecked={active} onChange={onToggle} colorScheme="blue" size="sm" />
  </Flex>
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
