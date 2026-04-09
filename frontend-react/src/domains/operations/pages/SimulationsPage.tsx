import {
  Box,
  VStack,
  Center,
  Icon,
  HStack,
  Divider,
  Flex,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Switch,
  SimpleGrid,
  Badge,
  Alert,
  AlertIcon,
  Spinner,
} from '@chakra-ui/react';
import {
  Wind,
  Play,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Thermometer,
  Waves,
  Zap,
  Globe,
  Layers,
  Sun,
  Activity,
  Mountain,
  Flame,
  Snowflake,
  Droplets,
  CloudRain,
  AlertTriangle,
  Gauge,
  Clock,
  BarChart2,
  Building2,
  Trees,
} from 'lucide-react';
import React, { useState, useCallback, useMemo } from 'react';

// Atomic Components
import { CityScaleWebGL } from '../../../components/ui/CityScaleWebGL';
import { GlassPanel } from '../../../components/atoms/GlassPanel';
import { TacticalText } from '../../../components/atoms/TacticalText';
import { TacticalButton } from '../../../components/atoms/TacticalButton';
import { TacticalStat } from '../../../components/molecules/TacticalStat';
import { EventTimeline } from '../../../components/ui/EventTimeline';
import { useSimulationsController } from '../../../hooks/useSimulationsController';
import { MiniMapPicker } from '../../../components/ui/MiniMapPicker';

type SimStep = 'LOCATION' | 'INDEXING' | 'SCENARIO' | 'SIMULATION';
type SimulationConfig = {
  intensity: number;
  duration: number;
  resolution: number;
  urbanDensity: number;
  pressure: number;
  precipitation: number;
  windSpeed: number;
  windDirection: number;
  humidity: number;
  temp: number;
  waterLevel: number;
  floodVelocity: number;
  waveHeight: number;
  waveVelocity: number;
  stormSurge: number;
  magnitude: number;
  geologyIndex: number;
  faultDepth: number;
  slopeInstability: number;
  soilSaturation: number;
  spreadRate: number;
  fireTemp: number;
  snowfall: number;
  snowAccumulation: number;
  frostDepth: number;
  rainfallDeficit: number;
  soilMoisture: number;
};

type SimulationParamKey = keyof SimulationConfig;

const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  intensity: 75,
  duration: 120,
  resolution: 120,
  urbanDensity: 0.65,
  pressure: 1013,
  precipitation: 45,
  windSpeed: 120,
  windDirection: 45,
  humidity: 65,
  temp: 25,
  waterLevel: 5,
  floodVelocity: 2.5,
  waveHeight: 0,
  waveVelocity: 0,
  stormSurge: 0,
  magnitude: 6.0,
  geologyIndex: 2.5,
  faultDepth: 10,
  slopeInstability: 5,
  soilSaturation: 70,
  spreadRate: 500,
  fireTemp: 800,
  snowfall: 0,
  snowAccumulation: 0,
  frostDepth: 0,
  rainfallDeficit: 50,
  soilMoisture: 30,
};

/**
 * Guardian Simulation Engine v4.0.0 — "HYDRA WIZARD"
 * Implementação linear do fluxo de simulação GIS.
 */
export function SimulationsPage() {
  const [activeStep, setActiveStep] = useState<SimStep>('LOCATION');
  const [scenarioSubStep, setScenarioSubStep] = useState<'SELECT' | 'CONFIGURE'>('SELECT');
  const [disasterType, setDisasterType] = useState('FLOOD');

  // Advanced Simulation State — covers all disaster types
  const [config, setConfig] = useState<SimulationConfig>(DEFAULT_SIMULATION_CONFIG);

  const [layers, setLayers] = useState({
    buildings: true,
    streets: true,
    terrain: true,
    satellite: true,
    vegetation: false,
    particles: false,
    aiStructural: false,
    semantic: false,
    polygons: true,
    topography: true,
    bridges: true,
    paving: false,
    residential: true,
    slope: false,
    density: false,
    sunSync: false,
    naturalAreas: true,
    landUseZones: false,
    amenities: false,
  });

  const [mapTileType, setMapTileType] = useState<'dark' | 'satellite' | 'topo'>('dark');
  const [visualAdjustments, setVisualAdjustments] = useState({
    topoScale: 100,
    topoOffset: 0,
    particleIntensity: 1.0,
    lightAngle: 45,
    lightIntensity: 1.0,
    areaScale: 200.0,
    buildingOffsetX: 0,
    buildingOffsetY: 0
  });



  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState('');
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [captureRotation, setCaptureRotation] = useState(0);

  const [bbox, setBbox] = useState<number[] | undefined>(undefined);
  const [activeToolPanel, setActiveToolPanel] = useState<'layers' | 'event' | 'terrain' | 'atmosphere' | 'severity' | 'log' | null>(null);

  const {
    setLat, setLng,
    resultData, blueprint, streamSteps, isSimulating,
    numericLat, numericLng,
    actions
  } = useSimulationsController();
  const handleIndexMission = useCallback(async () => {
    if (isSimulating) return;
    setCaptureError(null);
    setActiveStep('INDEXING');
    setAnalysisProgress(0);
    setAnalysisStatus('INICIALIZANDO PIPELINE DE CAPTURA...');

    const span = 0.025;
    const finalBbox = bbox || [numericLat - span, numericLng - span, numericLat + span, numericLng + span];

    try {
      await actions.captureBlueprint(finalBbox, (p) => {
        setAnalysisProgress(p.percent);
        setAnalysisStatus(p.label);
      });
      setAnalysisProgress(100);
      setAnalysisStatus('BLUEPRINT_COMPILADO — PRONTO');
      setScenarioSubStep('SELECT');
      setTimeout(() => setActiveStep('SCENARIO'), 800);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha na captura do blueprint';
      setCaptureError(msg);
      setAnalysisStatus('ERRO: FALHA NA CAPTURA DO BLUEPRINT');
    }
  }, [actions, bbox, isSimulating, numericLat, numericLng]);


  const handleStartSimulation = () => {
    setActiveStep('SIMULATION');
    setActiveToolPanel(null);
    // No API call needed — disaster config flows via simData props to CityScaleWebGL in real-time
  };


  type SeverityKey = 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
  type ConfigPatch = Partial<SimulationConfig>;

  interface DisasterMeta {
    label: string;
    labelEn: string;
    category: 'HYDRO' | 'GEO' | 'ATMO' | 'THERMO' | 'CRYO';
    color: string;
    bgColor: string;
    icon: React.ElementType;
    description: string;
    params: SimulationParamKey[];
    presets: Record<SeverityKey, ConfigPatch>;
  }

  const disasterCatalog = useMemo((): Record<string, DisasterMeta> => ({
    FLOOD: {
      label: 'Enchente / Inundação', labelEn: 'FLOOD', category: 'HYDRO',
      color: '#0EA5E9', bgColor: 'rgba(14,165,233,0.12)', icon: Droplets,
      description: 'Transbordamento de rios e acúmulo de água em áreas urbanas.',
      params: ['waterLevel', 'precipitation', 'floodVelocity', 'windSpeed', 'duration', 'intensity'],
      presets: {
        LOW:      { waterLevel: 1,  precipitation: 30,  windSpeed: 20,  floodVelocity: 0.5, intensity: 20 },
        MODERATE: { waterLevel: 3,  precipitation: 80,  windSpeed: 45,  floodVelocity: 2,   intensity: 50 },
        HIGH:     { waterLevel: 8,  precipitation: 150, windSpeed: 70,  floodVelocity: 4,   intensity: 75 },
        EXTREME:  { waterLevel: 20, precipitation: 300, windSpeed: 100, floodVelocity: 8,   intensity: 100 },
      },
    },
    TSUNAMI: {
      label: 'Tsunami', labelEn: 'TSUNAMI', category: 'HYDRO',
      color: '#0284C7', bgColor: 'rgba(2,132,199,0.12)', icon: Waves,
      description: 'Ondas gigantes geradas por terremotos submarinos ou deslizamentos.',
      params: ['waveHeight', 'waveVelocity', 'stormSurge', 'waterLevel', 'duration', 'intensity'],
      presets: {
        LOW:      { waveHeight: 2,  waveVelocity: 200, stormSurge: 1,  waterLevel: 2,  intensity: 30 },
        MODERATE: { waveHeight: 8,  waveVelocity: 500, stormSurge: 4,  waterLevel: 8,  intensity: 55 },
        HIGH:     { waveHeight: 20, waveVelocity: 700, stormSurge: 10, waterLevel: 20, intensity: 80 },
        EXTREME:  { waveHeight: 40, waveVelocity: 900, stormSurge: 25, waterLevel: 40, intensity: 100 },
      },
    },
    EARTHQUAKE: {
      label: 'Terremoto / Sismo', labelEn: 'EARTHQUAKE', category: 'GEO',
      color: '#D97706', bgColor: 'rgba(217,119,6,0.12)', icon: Activity,
      description: 'Liberação de energia sísmica com ondas P e S no subsolo.',
      params: ['magnitude', 'faultDepth', 'geologyIndex', 'duration', 'intensity'],
      presets: {
        LOW:      { magnitude: 4.0, faultDepth: 30, geologyIndex: 2,   duration: 10,  intensity: 20 },
        MODERATE: { magnitude: 5.5, faultDepth: 15, geologyIndex: 5,   duration: 30,  intensity: 50 },
        HIGH:     { magnitude: 7.0, faultDepth: 8,  geologyIndex: 7.5, duration: 60,  intensity: 80 },
        EXTREME:  { magnitude: 9.0, faultDepth: 3,  geologyIndex: 10,  duration: 120, intensity: 100 },
      },
    },
    HURRICANE: {
      label: 'Furacão / Ciclone', labelEn: 'HURRICANE', category: 'ATMO',
      color: '#7C3AED', bgColor: 'rgba(124,58,237,0.12)', icon: Wind,
      description: 'Sistema tropical com ventos destrutivos, chuvas e ondas de tempestade.',
      params: ['windSpeed', 'pressure', 'precipitation', 'stormSurge', 'windDirection', 'duration', 'intensity'],
      presets: {
        LOW:      { windSpeed: 65,  pressure: 1000, precipitation: 50,  stormSurge: 1,  intensity: 25 },
        MODERATE: { windSpeed: 130, pressure: 980,  precipitation: 120, stormSurge: 3,  intensity: 55 },
        HIGH:     { windSpeed: 210, pressure: 960,  precipitation: 200, stormSurge: 6,  intensity: 80 },
        EXTREME:  { windSpeed: 320, pressure: 920,  precipitation: 350, stormSurge: 12, intensity: 100 },
      },
    },
    TORNADO: {
      label: 'Tornado', labelEn: 'TORNADO', category: 'ATMO',
      color: '#A21CAF', bgColor: 'rgba(162,28,175,0.12)', icon: Wind,
      description: 'Coluna de ar rotacional com ventos extremamente destrutivos.',
      params: ['windSpeed', 'pressure', 'windDirection', 'duration', 'intensity'],
      presets: {
        LOW:      { windSpeed: 100, pressure: 1000, duration: 5,  intensity: 30 },
        MODERATE: { windSpeed: 180, pressure: 985,  duration: 15, intensity: 55 },
        HIGH:     { windSpeed: 280, pressure: 965,  duration: 30, intensity: 80 },
        EXTREME:  { windSpeed: 450, pressure: 940,  duration: 60, intensity: 100 },
      },
    },
    WILDFIRE: {
      label: 'Incêndio Florestal', labelEn: 'WILDFIRE', category: 'THERMO',
      color: '#EA580C', bgColor: 'rgba(234,88,12,0.12)', icon: Flame,
      description: 'Fogo de alta intensidade em áreas de vegetação densa.',
      params: ['temp', 'windSpeed', 'humidity', 'spreadRate', 'fireTemp', 'duration', 'intensity'],
      presets: {
        LOW:      { temp: 32, windSpeed: 20, humidity: 35, spreadRate: 100,  fireTemp: 400,  intensity: 25 },
        MODERATE: { temp: 40, windSpeed: 45, humidity: 20, spreadRate: 500,  fireTemp: 700,  intensity: 55 },
        HIGH:     { temp: 47, windSpeed: 70, humidity: 10, spreadRate: 1500, fireTemp: 900,  intensity: 80 },
        EXTREME:  { temp: 55, windSpeed: 100,humidity: 5,  spreadRate: 4000, fireTemp: 1200, intensity: 100 },
      },
    },
    MUDSLIDE: {
      label: 'Deslizamento de Terra', labelEn: 'MUDSLIDE', category: 'GEO',
      color: '#92400E', bgColor: 'rgba(146,64,14,0.12)', icon: Mountain,
      description: 'Movimento de massa de solo encharcado em encostas.',
      params: ['precipitation', 'slopeInstability', 'soilSaturation', 'geologyIndex', 'windSpeed', 'duration', 'intensity'],
      presets: {
        LOW:      { precipitation: 60,  slopeInstability: 3,  soilSaturation: 60, geologyIndex: 2,  intensity: 25 },
        MODERATE: { precipitation: 120, slopeInstability: 5,  soilSaturation: 80, geologyIndex: 4,  intensity: 55 },
        HIGH:     { precipitation: 200, slopeInstability: 7,  soilSaturation: 92, geologyIndex: 7,  intensity: 80 },
        EXTREME:  { precipitation: 300, slopeInstability: 10, soilSaturation: 100,geologyIndex: 10, intensity: 100 },
      },
    },
    SNOW: {
      label: 'Nevasca / Neve Intensa', labelEn: 'SNOWSTORM', category: 'CRYO',
      color: '#7DD3FC', bgColor: 'rgba(125,211,252,0.10)', icon: Snowflake,
      description: 'Precipitação intensa de neve com ventos fortes e acúmulo.',
      params: ['snowfall', 'snowAccumulation', 'temp', 'windSpeed', 'humidity', 'duration', 'intensity'],
      presets: {
        LOW:      { snowfall: 5,  snowAccumulation: 15, temp: -3,  windSpeed: 30,  intensity: 25 },
        MODERATE: { snowfall: 15, snowAccumulation: 60, temp: -8,  windSpeed: 60,  intensity: 55 },
        HIGH:     { snowfall: 30, snowAccumulation: 150,temp: -15, windSpeed: 100, intensity: 80 },
        EXTREME:  { snowfall: 60, snowAccumulation: 400,temp: -30, windSpeed: 180, intensity: 100 },
      },
    },
    FROST: {
      label: 'Geada Severa', labelEn: 'FROST', category: 'CRYO',
      color: '#BAE6FD', bgColor: 'rgba(186,230,253,0.08)', icon: Snowflake,
      description: 'Congelamento superficial com queda abrupta de temperatura.',
      params: ['temp', 'frostDepth', 'humidity', 'windSpeed', 'duration', 'intensity'],
      presets: {
        LOW:      { temp: -2,  frostDepth: 2,  humidity: 85, windSpeed: 10, duration: 120, intensity: 25 },
        MODERATE: { temp: -8,  frostDepth: 10, humidity: 75, windSpeed: 25, duration: 360, intensity: 55 },
        HIGH:     { temp: -15, frostDepth: 30, humidity: 65, windSpeed: 50, duration: 720, intensity: 80 },
        EXTREME:  { temp: -28, frostDepth: 60, humidity: 55, windSpeed: 80, duration: 1440,intensity: 100 },
      },
    },
    DROUGHT: {
      label: 'Seca Severa', labelEn: 'DROUGHT', category: 'THERMO',
      color: '#D97706', bgColor: 'rgba(217,119,6,0.10)', icon: Sun,
      description: 'Deficiência hídrica prolongada com altas temperaturas.',
      params: ['temp', 'rainfallDeficit', 'soilMoisture', 'humidity', 'windSpeed', 'intensity'],
      presets: {
        LOW:      { temp: 30, rainfallDeficit: 25, soilMoisture: 40, humidity: 40, intensity: 25 },
        MODERATE: { temp: 38, rainfallDeficit: 55, soilMoisture: 20, humidity: 20, intensity: 55 },
        HIGH:     { temp: 45, rainfallDeficit: 75, soilMoisture: 8,  humidity: 10, intensity: 80 },
        EXTREME:  { temp: 52, rainfallDeficit: 95, soilMoisture: 2,  humidity: 5,  intensity: 100 },
      },
    },
    HAIL: {
      label: 'Tempestade de Granizo', labelEn: 'HAIL', category: 'ATMO',
      color: '#64748B', bgColor: 'rgba(100,116,139,0.12)', icon: CloudRain,
      description: 'Precipitação de gelo com ventos fortes e relâmpagos.',
      params: ['precipitation', 'windSpeed', 'pressure', 'temp', 'duration', 'intensity'],
      presets: {
        LOW:      { precipitation: 20, windSpeed: 50,  pressure: 1005, temp: 5,   intensity: 25 },
        MODERATE: { precipitation: 60, windSpeed: 100, pressure: 990,  temp: 2,   intensity: 55 },
        HIGH:     { precipitation: 120,windSpeed: 150, pressure: 975,  temp: -2,  intensity: 80 },
        EXTREME:  { precipitation: 250,windSpeed: 220, pressure: 955,  temp: -8,  intensity: 100 },
      },
    },
    DEFORESTATION: {
      label: 'Desmatamento', labelEn: 'DEFORESTATION', category: 'GEO',
      color: '#78350F', bgColor: 'rgba(120,53,15,0.12)', icon: Trees,
      description: 'Remoção de cobertura vegetal com degradação do solo e erosão hídrica.',
      params: ['spreadRate', 'temp', 'humidity', 'soilMoisture', 'soilSaturation', 'duration', 'intensity'],
      presets: {
        LOW:      { spreadRate: 50,   temp: 28, humidity: 60, soilMoisture: 45, soilSaturation: 50, intensity: 20 },
        MODERATE: { spreadRate: 200,  temp: 35, humidity: 40, soilMoisture: 25, soilSaturation: 30, intensity: 50 },
        HIGH:     { spreadRate: 700,  temp: 42, humidity: 25, soilMoisture: 12, soilSaturation: 15, intensity: 80 },
        EXTREME:  { spreadRate: 2000, temp: 52, humidity: 10, soilMoisture: 3,  soilSaturation: 5,  intensity: 100 },
      },
    },
  }), []);

  const applySeverityPreset = useCallback((severity: SeverityKey) => {
    const meta = disasterCatalog[disasterType];
    if (meta?.presets[severity]) {
      setConfig(prev => ({ ...prev, ...meta.presets[severity] }));
    }
  }, [disasterCatalog, disasterType]);

  const handleDisasterTypeChange = useCallback((type: string) => {
    setDisasterType(type);
    const meta = disasterCatalog[type];
    if (meta?.presets.MODERATE) {
      setConfig(prev => ({ ...prev, ...meta.presets.MODERATE }));
    }
  }, [disasterCatalog]);

  // Synchronized state update handlers
  const handleMapTileTypeChange = (type: 'dark' | 'satellite' | 'topo') => {
    setMapTileType(type);
    setLayers(prev => ({
      ...prev,
      satellite: type === 'satellite',
      topography: type === 'topo'
    }));
  };

  const [activePreset, setActivePreset] = useState<string | null>(null);

  const toggleLayer = (key: keyof typeof layers) => {
    setActivePreset(null); // custom — deselect preset
    setLayers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const applyPreset = (presetId: string) => {
    const preset = VIEW_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    setLayers(preset.layers);
    setActivePreset(presetId);
  };

  // Prefer backend-computed area scale (calibrated from bbox meters), then fallback
  const effectiveAreaScale =
    resultData?.urbanFeatures?.areaScale ??
    resultData?.area_scale ??
    visualAdjustments.areaScale;

  // Memoize simData so CityScaleWebGL only sees a new object reference when
  // the actual values change — prevents spurious prop-change notifications.
  const simData = useMemo(() => ({
    type: disasterType,
    waterLevel: config.waterLevel,
    intensity: config.intensity,
    duration: config.duration,
    pressure: config.pressure,
    precipitation: config.precipitation,
    resolution: config.resolution,
    urbanDensity: config.urbanDensity,
    windSpeed: config.windSpeed,
    windDirection: config.windDirection,
    temp: config.temp,
    humidity: config.humidity,
    snowfall: config.snowfall,
    soilMoisture: config.soilMoisture,
    spreadRate: config.spreadRate,
    magnitude: config.magnitude,
    floodVelocity: config.floodVelocity,
    // Extended disaster parameters (previously omitted — all now forwarded)
    fireTemp: config.fireTemp,
    waveHeight: config.waveHeight,
    waveVelocity: config.waveVelocity,
    stormSurge: config.stormSurge,
    faultDepth: config.faultDepth,
    geologyIndex: config.geologyIndex,
    slopeInstability: config.slopeInstability,
    soilSaturation: config.soilSaturation,
    snowAccumulation: config.snowAccumulation,
    frostDepth: config.frostDepth,
    rainfallDeficit: config.rainfallDeficit,
  }), [disasterType, config]);

  return (
    <Box h="100vh" w="full" position="relative" overflow="hidden" bg="black" color="white" className="v-blueprint-layer">

      {/* --- STEP 1: 3D WORLD VIEW --- */}
      {(activeStep === 'SCENARIO' || activeStep === 'SIMULATION') && (
        <Box position="absolute" inset={0} zIndex={10}>
          <CityScaleWebGL
            centerLat={numericLat}
            centerLng={numericLng}
            bbox={(bbox as [number, number, number, number] | undefined) ?? [numericLat - 0.025, numericLng - 0.025, numericLat + 0.025, numericLng + 0.025]}
            blueprint={blueprint}
            simData={simData}
            topoScale={visualAdjustments.topoScale}
            topoOffset={visualAdjustments.topoOffset}
            lightAngle={visualAdjustments.lightAngle}
            lightIntensity={visualAdjustments.lightIntensity}
            particleIntensity={visualAdjustments.particleIntensity}
            areaScale={effectiveAreaScale}
            buildingOffsetX={visualAdjustments.buildingOffsetX}
            buildingOffsetY={visualAdjustments.buildingOffsetY}
            resultData={resultData}
            layers={layers}
          />
        </Box>
      )}

      {/* --- AVISO: DADOS SINTÉTICOS (OSM INDISPONÍVEL) --- */}
      {resultData?.urbanFeatures?.isSynthetic && (
        <Box position="absolute" bottom={4} left="50%" transform="translateX(-50%)" zIndex={200}>
            <Alert status="warning" borderRadius="md" py={2} px={4} bg="orange.900" border="1px solid" borderColor="orange.500" maxW="420px">
              <AlertIcon color="orange.300" />
              <TacticalText variant="caption" color="orange.200" letterSpacing="0.15em">
              DADOS SINTÉTICOS — serviço OSM externo indisponível, usando fallback operacional
              </TacticalText>
            </Alert>
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
              <TacticalText variant="caption" color="sos.blue.400" letterSpacing="0.3em">CLIMATE_ENGINE v1 (EVO)</TacticalText>
              <HStack>
                {activeStep !== 'SIMULATION' && (
                  <TacticalText variant="heading" fontSize="xl">Strategic Environment Architect</TacticalText>
                )}
                {activeStep !== 'SIMULATION' && (
                  <Badge variant="solid" bg="sos.blue.500" fontSize="9px">STEP: {activeStep}</Badge>
                )}
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
        <Box position="absolute" inset={0} zIndex={110}>
          {/* Full-screen map */}
          <Box position="absolute" inset={0}>
            <MiniMapPicker
              lat={numericLat}
              lng={numericLng}
              rotation={captureRotation}
              tileType={mapTileType}
              onTileTypeChange={handleMapTileTypeChange}
              onChange={(la, lo) => {
                if (typeof la === 'number' && typeof lo === 'number') {
                  setLat(la.toFixed(6));
                  setLng(lo.toFixed(6));
                  const span = 0.025;
                  setBbox([la - span, lo - span, la + span, lo + span]);
                }
              }}
            />
          </Box>

          {/* Hidden geometry persistence */}
          <Box display="none">
            <ConfigSlider label="ESCALA ÁREA" value={visualAdjustments.areaScale} unit="x" min={1} max={500} onChange={(v) => setVisualAdjustments(prev => ({ ...prev, areaScale: v }))} />
            <ConfigSlider label="OFFSET X" value={visualAdjustments.buildingOffsetX} min={-100} max={100} step={0.1} onChange={(v) => setVisualAdjustments(prev => ({ ...prev, buildingOffsetX: v }))} />
            <ConfigSlider label="OFFSET Y" value={visualAdjustments.buildingOffsetY} min={-100} max={100} step={0.1} onChange={(v) => setVisualAdjustments(prev => ({ ...prev, buildingOffsetY: v }))} />
          </Box>

          {/* Bottom center floating controls */}
          <Box
            position="absolute"
            bottom={{ base: 6, md: 8 }}
            left="50%"
            transform="translateX(-50%)"
            zIndex={10}
            w={{ base: 'calc(100% - 32px)', sm: '480px', md: '560px' }}
          >
            <GlassPanel p={{ base: 4, md: 5 }} depth="raised" flexDirection="column">
              <VStack spacing={4} align="stretch">
                {/* Coords row */}
                <SimpleGrid columns={2} spacing={3}>
                  <TacticalStat label="LATITUDE"  value={numericLat?.toFixed(6) ?? '0.000000'} unit="°" icon={Globe} />
                  <TacticalStat label="LONGITUDE" value={numericLng?.toFixed(6) ?? '0.000000'} unit="°" icon={Globe} />
                </SimpleGrid>

                {/* Heading slider */}
                <ConfigSlider
                  label="ORIENTAÇÃO (HEADING)"
                  value={captureRotation}
                  unit="°"
                  min={0} max={360}
                  onChange={setCaptureRotation}
                />

                {/* CTA */}
                <TacticalButton
                  h="52px"
                  bg="sos.blue.500"
                  glow
                  rightIcon={<ChevronRight size={18} />}
                  onClick={handleIndexMission}
                  isDisabled={isSimulating}
                >
                  INICIAR CAPTURA DE DADOS (BLUEPRINT)
                </TacticalButton>
              </VStack>
            </GlassPanel>
          </Box>
        </Box>
      )}

      {/* --- STEP 3a: SCENARIO — SELECT DISASTER TYPE --- */}
      {activeStep === 'SCENARIO' && scenarioSubStep === 'SELECT' && (
        <Box
          position="absolute" inset={0} zIndex={110}
          bg="blackAlpha.850" 
          overflowY="auto" className="custom-scrollbar"
        >
          <VStack spacing={0} py={{ base: 20, md: 24 }} px={{ base: 4, md: 8 }} align="center">
            <VStack spacing={2} mb={10} textAlign="center">
              <TacticalText variant="caption" color="sos.blue.400" letterSpacing="0.3em">
                HYDRA ENGINE // ETAPA 3 — CONFIGURAÇÃO DO CENÁRIO
              </TacticalText>
              <TacticalText variant="heading" fontSize={{ base: '2xl', md: '3xl' }}>
                SELECIONE O TIPO DE DESASTRE
              </TacticalText>
              <TacticalText variant="caption" color="whiteAlpha.500" maxW="520px">
                Escolha o evento para configurar os parâmetros ambientais específicos e executar a simulação 3D
              </TacticalText>
            </VStack>

            <SimpleGrid columns={{ base: 2, md: 3, xl: 4 }} spacing={{ base: 3, md: 4 }} w="full" maxW="1200px">
              {Object.entries(disasterCatalog).map(([key, meta]) => (
                <Box
                  key={key} as="button"
                  onClick={() => { handleDisasterTypeChange(key); setScenarioSubStep('CONFIGURE'); }}
                  p={{ base: 4, md: 6 }} borderRadius="2xl"
                  border="2px solid" borderColor={`${meta.color}30`}
                  bg="rgba(2,8,20,0.75)"
                  transition="all 0.25s"
                  _hover={{
                    borderColor: meta.color,
                    bg: meta.bgColor,
                    transform: 'translateY(-4px)',
                    boxShadow: `0 16px 48px ${meta.color}28`,
                  }}
                  textAlign="center"
                >
                  <VStack spacing={{ base: 2, md: 3 }}>
                    <Center
                      w={{ base: '44px', md: '56px' }} h={{ base: '44px', md: '56px' }}
                      borderRadius="xl" bg={meta.bgColor}
                      border="1px solid" borderColor={`${meta.color}50`}
                    >
                      <Icon as={meta.icon} color={meta.color} boxSize={{ base: 5, md: 7 }} />
                    </Center>
                    <VStack spacing={1}>
                      <TacticalText variant="heading" fontSize={{ base: 'xs', md: 'sm' }} color="white">
                        {meta.label}
                      </TacticalText>
                      <Badge
                        fontSize="8px" letterSpacing="0.12em"
                        bg={`${meta.color}20`} color={meta.color}
                        border="1px solid" borderColor={`${meta.color}40`}
                        borderRadius="full" px={2}
                      >
                        {meta.category}
                      </Badge>
                    </VStack>
                    <TacticalText
                      variant="caption" fontSize={{ base: '9px', md: 'xs' }} color="whiteAlpha.500"
                      display={{ base: 'none', md: 'block' }}
                      overflow="hidden"
                      style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
                    >
                      {meta.description}
                    </TacticalText>
                  </VStack>
                </Box>
              ))}
            </SimpleGrid>
          </VStack>
        </Box>
      )}

      {/* --- STEP 3b: SCENARIO — CONFIGURE PARAMETERS --- */}
      {activeStep === 'SCENARIO' && scenarioSubStep === 'CONFIGURE' && disasterCatalog[disasterType] && (
        <>
          {/* Gradient backdrop: opaque on sides, transparent in center so 3D world is visible */}
          <Box
            position="absolute" inset={0} zIndex={108}
            bgGradient="linear(to-r, blackAlpha.800 28%, transparent 50%, blackAlpha.800 72%)"
            pointerEvents="none"
          />

          {/* LEFT PANEL */}
          <Box
            position="absolute"
            left={{ base: 3, md: 6 }}
            top={{ base: '80px', md: '90px' }}
            bottom={{ base: 3, md: 6 }}
            w={{ base: 'calc(50% - 20px)', md: '290px', xl: '320px' }}
            zIndex={110}
            overflowY="auto"
            className="custom-scrollbar"
          >
            <VStack spacing={3} align="stretch" pb={6}>
              {/* Back to selection */}
              <Box
                as="button"
                onClick={() => setScenarioSubStep('SELECT')}
                display="flex" alignItems="center" gap={1}
                color="whiteAlpha.500" _hover={{ color: 'white' }}
                transition="color 0.2s" w="fit-content"
              >
                <Icon as={ChevronLeft} boxSize={4} />
                <TacticalText variant="mono" fontSize="9px">VOLTAR À SELEÇÃO</TacticalText>
              </Box>

              {/* Disaster identity card */}
              <GlassPanel p={4} depth="raised" flexDirection="column">
                <HStack mb={3} spacing={3}>
                  <Center
                    w="38px" h="38px" borderRadius="lg" flexShrink={0}
                    bg={disasterCatalog[disasterType].bgColor}
                    border="1px solid" borderColor={`${disasterCatalog[disasterType].color}50`}
                  >
                    <Icon as={disasterCatalog[disasterType].icon} color={disasterCatalog[disasterType].color} boxSize={5} />
                  </Center>
                  <VStack align="start" spacing={0.5}>
                    <TacticalText variant="heading" fontSize="sm" color={disasterCatalog[disasterType].color}>
                      {disasterCatalog[disasterType].label.toUpperCase()}
                    </TacticalText>
                    <Badge
                      fontSize="8px" bg={`${disasterCatalog[disasterType].color}20`}
                      color={disasterCatalog[disasterType].color}
                      border="1px solid" borderColor={`${disasterCatalog[disasterType].color}40`}
                      borderRadius="full" px={2}
                    >
                      {disasterCatalog[disasterType].category}
                    </Badge>
                  </VStack>
                </HStack>
                <TacticalText variant="caption" fontSize="xs" color="whiteAlpha.600">
                  {disasterCatalog[disasterType].description}
                </TacticalText>
              </GlassPanel>

              {/* Severity presets */}
              <GlassPanel p={4} depth="base" flexDirection="column">
                <TacticalText variant="subheading" fontSize="9px" mb={2}>NÍVEL DE SEVERIDADE</TacticalText>
                <SimpleGrid columns={4} spacing={1.5}>
                  {(['LOW', 'MODERATE', 'HIGH', 'EXTREME'] as SeverityKey[]).map((sev) => {
                    const sc: Record<SeverityKey, string> = {
                      LOW: '#22C55E', MODERATE: '#EAB308', HIGH: '#F97316', EXTREME: '#EF4444'
                    };
                    const sl: Record<SeverityKey, string> = {
                      LOW: 'BAIXO', MODERATE: 'MÉDIO', HIGH: 'ALTO', EXTREME: 'EXT'
                    };
                    return (
                      <Box
                        key={sev} as="button" onClick={() => applySeverityPreset(sev)}
                        p={2} borderRadius="md" border="1px solid"
                        borderColor={`${sc[sev]}40`} bg={`${sc[sev]}15`}
                        _hover={{ bg: `${sc[sev]}35`, borderColor: sc[sev] }}
                        transition="all 0.2s"
                      >
                        <TacticalText variant="mono" fontSize="8px" color={sc[sev]} display="block" textAlign="center">
                          {sl[sev]}
                        </TacticalText>
                      </Box>
                    );
                  })}
                </SimpleGrid>
              </GlassPanel>

              {/* General params */}
              <GlassPanel p={4} depth="base" flexDirection="column">
                <TacticalText variant="subheading" fontSize="9px" mb={3}>PARÂMETROS GERAIS</TacticalText>
                <VStack spacing={3} align="stretch">
                  <DisasterParamSlider param="intensity" config={config} setConfig={setConfig} compact />
                  <DisasterParamSlider param="duration" config={config} setConfig={setConfig} compact />
                </VStack>
              </GlassPanel>

              {/* Impact summary */}
              <GlassPanel p={4} depth="base" flexDirection="column">
                <TacticalText variant="subheading" fontSize="9px" mb={3}>IMPACTO ESTIMADO</TacticalText>
                <VStack spacing={2} align="stretch">
                  {[
                    {
                      label: 'RISCO GERAL',
                      value: config.intensity >= 80 ? 'EXTREMO' : config.intensity >= 55 ? 'ALTO' : config.intensity >= 30 ? 'MÉDIO' : 'BAIXO',
                      color: config.intensity >= 80 ? '#EF4444' : config.intensity >= 55 ? '#F97316' : config.intensity >= 30 ? '#EAB308' : '#22C55E',
                    },
                    {
                      label: 'ÁREA AFETADA',
                      value: `~${(Math.round((config.intensity / 100) * Math.abs((blueprint?.worldSpanX ?? 5000) * (blueprint?.worldSpanZ ?? 5000)) / 100_000) / 10).toFixed(1)} km²`,
                      color: disasterCatalog[disasterType].color,
                    },
                    {
                      label: 'EDIFÍCIOS EM RISCO',
                      value: `${Math.round((config.intensity / 100) * (blueprint?.osm.buildings.length ?? 0))}`,
                      color: '#F97316',
                    },
                  ].map(stat => (
                    <Flex key={stat.label} justify="space-between" align="center">
                      <TacticalText variant="mono" fontSize="9px" color="whiteAlpha.500">{stat.label}</TacticalText>
                      <TacticalText variant="mono" fontSize="10px" color={stat.color} fontWeight="bold">{stat.value}</TacticalText>
                    </Flex>
                  ))}
                </VStack>
              </GlassPanel>
            </VStack>
          </Box>

          {/* RIGHT PANEL */}
          <Box
            position="absolute"
            right={{ base: 3, md: 6 }}
            top={{ base: '80px', md: '90px' }}
            bottom={{ base: 3, md: 6 }}
            w={{ base: 'calc(50% - 20px)', md: '290px', xl: '360px' }}
            zIndex={110}
            overflowY="auto"
            className="custom-scrollbar"
          >
            <VStack spacing={3} align="stretch" pb={6}>
              <TacticalText variant="subheading" fontSize="9px">PARÂMETROS DO EVENTO</TacticalText>

              {PARAM_GROUPS.map(group => {
                const relevantKeys = group.keys.filter(
                  k => disasterCatalog[disasterType].params.includes(k) && k !== 'intensity' && k !== 'duration'
                );
                if (relevantKeys.length === 0) return null;
                return (
                  <GlassPanel key={group.label} p={4} depth="base" flexDirection="column">
                    <HStack mb={3} spacing={2}>
                      <Icon as={group.icon} color="whiteAlpha.500" boxSize={3.5} />
                      <TacticalText variant="subheading" fontSize="9px">{group.label}</TacticalText>
                    </HStack>
                    <VStack spacing={3} align="stretch">
                      {relevantKeys.map(k => (
                        <DisasterParamSlider key={k} param={k} config={config} setConfig={setConfig} compact />
                      ))}
                    </VStack>
                  </GlassPanel>
                );
              })}

              {/* CTA */}
              <TacticalButton
                h="56px" bg="sos.green.500" glow
                leftIcon={<Play size={18} />}
                onClick={handleStartSimulation}
                isDisabled={isSimulating}
              >
                EXECUTAR SIMULAÇÃO 3D
              </TacticalButton>
            </VStack>
          </Box>
        </>
      )}

      {/* --- STEP 2: INDEXING VIEW (RENAMED FROM ANALYSIS) --- */}
      {activeStep === 'INDEXING' && (
        <Box
          position="absolute"
          inset={0}
          zIndex={150}
          bg="blackAlpha.900"
          
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <VStack spacing={8} w="full" maxW="600px">
            <Box position="relative" w="full" h="350px" borderRadius="2xl" overflow="hidden" border="1px solid" borderColor={captureError ? 'red.500' : 'whiteAlpha.300'} bg="whiteAlpha.100">
              <Flex direction="column" h="full" p={8} justify="space-between">
                <HStack justify="space-between">
                  <TacticalText variant="mono" fontSize="2xs" color={captureError ? 'red.400' : 'sos.blue.400'}>
                    {captureError ? '[HYDRA_INDEXER_ERROR]' : '[HYDRA_INDEXER_RUNNING]'}
                  </TacticalText>
                  <TacticalText variant="mono" fontSize="2xs" color="whiteAlpha.400">THREADS: 16 // BUFFER: OK</TacticalText>
                </HStack>
                <VStack spacing={4}>
                  {!captureError && (
                    <Spinner
                      size="xl"
                      thickness="4px"
                      speed="0.8s"
                      color="sos.blue.400"
                      emptyColor="whiteAlpha.200"
                    />
                  )}
                  <TacticalText variant="heading" fontSize="2xl" textAlign="center" letterSpacing="0.4em">
                    {captureError ? 'FALHA_NA_CAPTURA' : 'INDEXAÇÃO_DE_DADOS'}
                  </TacticalText>
                  <TacticalText variant="caption" textAlign="center" opacity={0.6}>{analysisStatus}</TacticalText>
                  {captureError && (
                    <TacticalText variant="mono" fontSize="2xs" color="red.300" textAlign="center" mt={1}>
                      {captureError}
                    </TacticalText>
                  )}
                </VStack>
                {captureError ? (
                  <HStack spacing={4} justify="center">
                    <TacticalButton variant="primary" size="sm" onClick={handleIndexMission}>
                      TENTAR NOVAMENTE
                    </TacticalButton>
                    <TacticalButton variant="ghost" size="sm" onClick={() => { setCaptureError(null); setActiveStep('LOCATION'); }}>
                      VOLTAR
                    </TacticalButton>
                  </HStack>
                ) : (
                  <Box>
                    <Flex justify="space-between" mb={2}>
                      <TacticalText variant="mono" fontSize="10px">ESTRUTURANDO_CONTEXTO_URBANO</TacticalText>
                      <TacticalText variant="mono" fontSize="10px">{analysisProgress}%</TacticalText>
                    </Flex>
                    <Box h="2px" w="full" bg="whiteAlpha.100" borderRadius="full">
                      <Box h="full" w={`${analysisProgress}%`} bg="sos.blue.400" transition="width 0.3s ease-out" boxShadow="0 0 15px #007AFF" />
                    </Box>
                  </Box>
                )}
              </Flex>
            </Box>
            <SimpleGrid columns={3} spacing={4} w="full">
              <AnalysisStat label="SATÉLITE" value={analysisProgress >= 40 ? 'RGB_OK' : 'AGUARDANDO'} active={analysisProgress >= 40} />
              <AnalysisStat label="OSM+DEM" value={analysisProgress >= 20 ? 'VECTOR_OK' : 'AGUARDANDO'} active={analysisProgress >= 20} />
              <AnalysisStat label="BLUEPRINT" value={blueprint ? `${blueprint.metadata.buildingPct}% EDIF` : 'COMPILANDO'} active={analysisProgress >= 100} />
            </SimpleGrid>
          </VStack>
        </Box>
      )}

      {/* --- STEP 4: SIMULATION VIEW --- */}
      {activeStep === 'SIMULATION' && (
        <>
          {/* Click-outside: closes panel when clicking the 3D world */}
          {activeToolPanel && (
            <Box position="absolute" inset={0} zIndex={185} onClick={() => setActiveToolPanel(null)} />
          )}

          {/* ── Top Toolbar ── */}
          <Box
            position="absolute"
            top={{ base: '70px', md: '78px' }}
            left="50%"
            transform="translateX(-50%)"
            zIndex={200}
          >
            <GlassPanel px={2} py={1.5} depth="raised" align="center">
              <HStack spacing={0}>
                {/* Tool buttons */}
                <HStack spacing={1} mr={2}>
                  {([
                    { id: 'layers',     icon: Layers,    label: 'CAMADAS',   color: '#007AFF' },
                    { id: 'event',      icon: disasterCatalog[disasterType]?.icon ?? AlertTriangle, label: 'EVENTO', color: disasterCatalog[disasterType]?.color ?? '#007AFF' },
                    { id: 'terrain',    icon: Mountain,  label: 'TERRENO',   color: '#34C759' },
                    { id: 'atmosphere', icon: CloudRain, label: 'ATMOSFERA', color: '#FF9500' },
                    { id: 'severity',   icon: BarChart2, label: 'NÍVEL',     color: '#FF3B30' },
                    { id: 'log',        icon: Activity,  label: 'LOG',       color: '#8E8E93' },
                  ] as const).map((tool) => {
                    const isActive = activeToolPanel === tool.id;
                    return (
                      <Box
                        key={tool.id}
                        as="button"
                        onClick={() => setActiveToolPanel(p => p === tool.id ? null : tool.id)}
                        px={3} py={1.5}
                        borderRadius="md"
                        border="1px solid"
                        borderColor={isActive ? tool.color : 'transparent'}
                        bg={isActive ? 'rgba(0,30,60,0.6)' : 'transparent'}
                        _hover={{ borderColor: tool.color, bg: 'rgba(0,20,48,0.5)' }}
                        transition="all 0.15s"
                        title={tool.label}
                      >
                        <VStack spacing={0.5} align="center" minW="34px">
                          <Icon as={tool.icon} color={isActive ? tool.color : 'whiteAlpha.500'} boxSize={3.5} />
                          <TacticalText variant="mono" fontSize="7px" color={isActive ? tool.color : 'whiteAlpha.400'}>
                            {tool.label}
                          </TacticalText>
                        </VStack>
                      </Box>
                    );
                  })}
                </HStack>

                {/* Divider */}
                <Box w="1px" h="36px" bg="whiteAlpha.150" flexShrink={0} />

                {/* Status strip — hidden on mobile */}
                <HStack spacing={3} pl={2} display={{ base: 'none', md: 'flex' }}>
                  {disasterCatalog[disasterType] && (
                    <HStack spacing={1}>
                      <Icon as={disasterCatalog[disasterType].icon} color={disasterCatalog[disasterType].color} boxSize={3} />
                      <TacticalText variant="mono" fontSize="8px" color={disasterCatalog[disasterType].color}>
                        {disasterCatalog[disasterType].labelEn}
                      </TacticalText>
                    </HStack>
                  )}
                  <HStack spacing={1}>
                    <Icon as={Wind} color="sos.blue.400" boxSize={3} />
                    <TacticalText variant="mono" fontSize="8px">{config.windSpeed}km/h</TacticalText>
                  </HStack>
                  <HStack spacing={1}>
                    <Icon as={Gauge} color="orange.400" boxSize={3} />
                    <TacticalText variant="mono" fontSize="8px">{config.pressure}hPa</TacticalText>
                  </HStack>
                  {config.temp !== 25 && (
                    <HStack spacing={1}>
                      <Icon as={Thermometer} color={config.temp > 35 ? 'red.400' : 'blue.300'} boxSize={3} />
                      <TacticalText variant="mono" fontSize="8px">{config.temp}°C</TacticalText>
                    </HStack>
                  )}
                  <HStack spacing={1}>
                    <Icon as={Clock} color="whiteAlpha.500" boxSize={3} />
                    <TacticalText variant="mono" fontSize="8px">{config.duration}m</TacticalText>
                  </HStack>
                </HStack>
              </HStack>
            </GlassPanel>
          </Box>

          {/* ── Tool Panel Overlay ── */}
          {activeToolPanel && (
            <Box
              position="absolute"
              top={{ base: '126px', md: '134px' }}
              left="50%"
              transform="translateX(-50%)"
              w={{ base: 'calc(100% - 32px)', sm: '380px' }}
              maxH="calc(100vh - 200px)"
              overflowY="auto"
              className="custom-scrollbar"
              zIndex={190}
              onClick={e => e.stopPropagation()}
            >
              {/* LAYERS panel */}
              {activeToolPanel === 'layers' && (
                <GlassPanel p={4} depth="raised" flexDirection="column">
                  <HStack mb={3}>
                    <Icon as={Layers} boxSize={3.5} color="sos.blue.400" />
                    <TacticalText variant="heading" fontSize="xs">CAMADAS_3D</TacticalText>
                  </HStack>
                  <TacticalText variant="mono" fontSize="8px" color="whiteAlpha.400" mb={2}>PRESET_VIEWS</TacticalText>
                  <SimpleGrid columns={2} spacing={2} mb={3}>
                    {VIEW_PRESETS.map(preset => (
                      <Box key={preset.id} as="button" onClick={() => applyPreset(preset.id)}
                        py={2} px={2} borderRadius="md" border="1px solid" textAlign="center"
                        borderColor={activePreset === preset.id ? 'sos.blue.400' : 'whiteAlpha.150'}
                        bg={activePreset === preset.id ? 'rgba(0,122,255,0.15)' : 'rgba(255,255,255,0.03)'}
                        _hover={{ borderColor: 'sos.blue.400' }} transition="all 0.15s"
                      >
                        <VStack spacing={1} align="center">
                          <Icon as={preset.icon} boxSize={3} color={activePreset === preset.id ? 'sos.blue.400' : 'whiteAlpha.500'} />
                          <TacticalText variant="mono" fontSize="8px" color={activePreset === preset.id ? 'sos.blue.400' : 'whiteAlpha.600'}>
                            {preset.label}
                          </TacticalText>
                        </VStack>
                      </Box>
                    ))}
                  </SimpleGrid>
                  <Box h="1px" bg="whiteAlpha.100" mb={3} />
                  <VStack spacing={3} align="stretch">
                    {LAYER_GROUPS.map(group => (
                      <Box key={group.label}>
                        <HStack mb={1} spacing={1}>
                          <Icon as={group.icon} boxSize={3} color="whiteAlpha.350" />
                          <TacticalText variant="mono" fontSize="8px" color="whiteAlpha.350">{group.label}</TacticalText>
                        </HStack>
                        <SimpleGrid columns={2} spacing={1} pl={3}>
                          {group.items.map(item => (
                            <LayerToggle key={item.key} label={item.label}
                              active={layers[item.key as keyof typeof layers] as boolean}
                              onChange={() => toggleLayer(item.key as keyof typeof layers)} />
                          ))}
                        </SimpleGrid>
                      </Box>
                    ))}
                  </VStack>
                </GlassPanel>
              )}

              {/* EVENT panel */}
              {activeToolPanel === 'event' && (
                <GlassPanel p={4} depth="raised" flexDirection="column">
                  <HStack mb={3} justify="space-between">
                    <HStack>
                      {disasterCatalog[disasterType] && (
                        <Icon as={disasterCatalog[disasterType].icon} color={disasterCatalog[disasterType].color} boxSize={4} />
                      )}
                      <TacticalText variant="heading" fontSize="xs">
                        {disasterCatalog[disasterType]?.labelEn ?? 'EVENTO_ATIVO'}
                      </TacticalText>
                    </HStack>
                    <Badge fontSize="8px" px={2} py={0.5}
                      bg={disasterCatalog[disasterType]?.bgColor}
                      color={disasterCatalog[disasterType]?.color}
                      borderRadius="full">LIVE</Badge>
                  </HStack>
                  <VStack align="stretch" spacing={3}>
                    <ConfigSlider label="INTENSIDADE" value={config.intensity} unit="%" min={0} max={100}
                      onChange={(v) => setConfig(p => ({ ...p, intensity: v }))} />
                    {(disasterCatalog[disasterType]?.params ?? [])
                      .filter(p => p !== 'intensity' && p !== 'duration' && p !== 'resolution')
                      .slice(0, 6)
                      .map(param => (
                        <DisasterParamSlider key={param} param={param} config={config} setConfig={setConfig} compact />
                      ))
                    }
                  </VStack>
                </GlassPanel>
              )}

              {/* TERRAIN panel */}
              {activeToolPanel === 'terrain' && (
                <GlassPanel p={4} depth="raised" flexDirection="column">
                  <HStack mb={3}>
                    <Icon as={Mountain} boxSize={3.5} color="sos.green.400" />
                    <TacticalText variant="heading" fontSize="xs">GEOMORFOLOGIA_E_MALHA</TacticalText>
                  </HStack>
                  <VStack align="stretch" spacing={4}>
                    <ConfigSlider label="EXAGERO VERTICAL (100%=REAL)" value={visualAdjustments.topoScale} unit="%" min={10} max={400} step={10}
                      onChange={(v) => setVisualAdjustments(prev => ({ ...prev, topoScale: v }))} />
                    <ConfigSlider label="OFFSET ALTIMETRIA" value={visualAdjustments.topoOffset} unit="m" min={-50} max={50}
                      onChange={(v) => setVisualAdjustments(prev => ({ ...prev, topoOffset: v }))} />
                    <ConfigSlider label="RESOLUÇÃO MESH" value={config.resolution} unit="v" min={64} max={512}
                      onChange={(v) => setConfig(prev => ({ ...prev, resolution: v }))} />
                    <ConfigSlider label="DENSIDADE URBANA" value={Math.round(config.urbanDensity * 100)} unit="%" min={0} max={100}
                      onChange={(v) => setConfig(prev => ({ ...prev, urbanDensity: v / 100 }))} />
                  </VStack>
                </GlassPanel>
              )}

              {/* ATMOSPHERE panel */}
              {activeToolPanel === 'atmosphere' && (
                <GlassPanel p={4} depth="raised" flexDirection="column">
                  <HStack mb={3}>
                    <Icon as={CloudRain} boxSize={3.5} color="orange.400" />
                    <TacticalText variant="heading" fontSize="xs">ATMOSFERA_E_LUZ</TacticalText>
                  </HStack>
                  <VStack align="stretch" spacing={4}>
                    <ConfigSlider label="ÂNGULO SOLAR" value={visualAdjustments.lightAngle} unit="°" min={0} max={360}
                      onChange={(v) => setVisualAdjustments(prev => ({ ...prev, lightAngle: v }))} />
                    <ConfigSlider label="BRILHO DO CENÁRIO" value={Math.round(visualAdjustments.lightIntensity * 100)} unit="%" min={0} max={200}
                      onChange={(v) => setVisualAdjustments(prev => ({ ...prev, lightIntensity: v / 100 }))} />
                    <ConfigSlider label="DENSIDADE PARTÍCULAS" value={Math.round(visualAdjustments.particleIntensity * 100)} unit="%" min={0} max={100}
                      onChange={(v) => setVisualAdjustments(prev => ({ ...prev, particleIntensity: v / 100 }))} />
                  </VStack>
                </GlassPanel>
              )}

              {/* SEVERITY panel */}
              {activeToolPanel === 'severity' && (
                <GlassPanel p={4} depth="raised" flexDirection="column">
                  <HStack mb={3}>
                    <Icon as={BarChart2} boxSize={3.5} color="sos.red.400" />
                    <TacticalText variant="heading" fontSize="xs">SEVERIDADE_RÁPIDA</TacticalText>
                  </HStack>
                  <SimpleGrid columns={4} spacing={2}>
                    {(['LOW','MODERATE','HIGH','EXTREME'] as SeverityKey[]).map(sev => {
                      const sc: Record<SeverityKey,string> = { LOW:'#22C55E', MODERATE:'#EAB308', HIGH:'#F97316', EXTREME:'#EF4444' };
                      const sl: Record<SeverityKey,string> = { LOW:'BAIXO', MODERATE:'MÉDIO', HIGH:'ALTO', EXTREME:'EXT' };
                      return (
                        <Box key={sev} as="button" onClick={() => applySeverityPreset(sev)}
                          p={3} borderRadius="lg" border="1px solid" borderColor={`${sc[sev]}40`}
                          bg={`${sc[sev]}15`} _hover={{ bg:`${sc[sev]}30` }} transition="all 0.2s">
                          <TacticalText variant="mono" fontSize="9px" color={sc[sev]} display="block" textAlign="center">
                            {sl[sev]}
                          </TacticalText>
                        </Box>
                      );
                    })}
                  </SimpleGrid>
                </GlassPanel>
              )}

              {/* LOG panel */}
              {activeToolPanel === 'log' && (
                <GlassPanel p={4} depth="raised" flexDirection="column" h="360px">
                  <HStack mb={3} justify="space-between">
                    <HStack>
                      <Icon as={Activity} boxSize={3.5} color="sos.red.400" />
                      <TacticalText variant="heading" fontSize="xs">LOG_ENGINE</TacticalText>
                    </HStack>
                    {analysisProgress > 0 && analysisProgress < 100 && (
                      <Badge fontSize="7px" px={2} colorScheme="blue" borderRadius="full">
                        {analysisProgress}%
                      </Badge>
                    )}
                  </HStack>
                  <Box flex={1} overflowY="auto" className="custom-scrollbar" pr={1}>
                    {streamSteps.length > 0 ? (
                      <EventTimeline steps={streamSteps} />
                    ) : (
                      <VStack spacing={2} align="stretch">
                        {/* Blueprint capture progress */}
                        {analysisStatus && (
                          <Flex align="center" bg="whiteAlpha.50" px={3} py={2}
                            borderRadius="md" border="1px solid" borderColor="whiteAlpha.100">
                            <Box boxSize="6px" borderRadius="full" mr={2} flexShrink={0}
                              bg={captureError ? 'red.400' : analysisProgress >= 100 ? 'green.400' : 'sos.blue.400'} />
                            <TacticalText variant="mono" fontSize="9px" color="whiteAlpha.700">
                              {analysisStatus}
                            </TacticalText>
                          </Flex>
                        )}
                        {/* Active disaster summary */}
                        {activeStep === 'SIMULATION' && disasterCatalog[disasterType] && (
                          <Flex align="center" bg="whiteAlpha.50" px={3} py={2}
                            borderRadius="md" border="1px solid" borderColor="whiteAlpha.100">
                            <Box boxSize="6px" borderRadius="full" mr={2} flexShrink={0}
                              bg={disasterCatalog[disasterType].color} />
                            <TacticalText variant="mono" fontSize="9px" color="whiteAlpha.700">
                              {disasterCatalog[disasterType].labelEn} · INT:{config.intensity}% · DUR:{config.duration}min
                            </TacticalText>
                          </Flex>
                        )}
                        {!analysisStatus && activeStep !== 'SIMULATION' && (
                          <TacticalText variant="mono" fontSize="9px" color="whiteAlpha.300" textAlign="center" mt={4}>
                            SEM EVENTOS — INICIE UMA SIMULAÇÃO
                          </TacticalText>
                        )}
                      </VStack>
                    )}
                  </Box>
                </GlassPanel>
              )}
            </Box>
          )}
        </>
      )}

      {/* Bottom HUD — disaster-specific key metrics (SCENARIO step only; SIMULATION uses toolbar) */}
      {activeStep === 'SCENARIO' && (
        <Box position="absolute" bottom={6} left={6} zIndex={100}>
          <HStack spacing={3} flexWrap="wrap">
            {disasterCatalog[disasterType] && (
              <GlassPanel px={3} py={2} depth="base" align="center">
                <Icon as={disasterCatalog[disasterType].icon}
                  color={disasterCatalog[disasterType].color} mr={2} boxSize={3.5} />
                <TacticalText variant="mono" fontSize="xs"
                  color={disasterCatalog[disasterType].color}>
                  {disasterCatalog[disasterType].labelEn}
                </TacticalText>
              </GlassPanel>
            )}
            <GlassPanel px={3} py={2} depth="base" align="center">
              <Icon as={Wind} color="sos.blue.400" mr={2} boxSize={3.5} />
              <TacticalText variant="mono" fontSize="xs">{config.windSpeed} km/h</TacticalText>
            </GlassPanel>
            <GlassPanel px={3} py={2} depth="base" align="center">
              <Icon as={Gauge} color="orange.400" mr={2} boxSize={3.5} />
              <TacticalText variant="mono" fontSize="xs">{config.pressure} hPa</TacticalText>
            </GlassPanel>
            {config.waterLevel > 0 && (
              <GlassPanel px={3} py={2} depth="base" align="center">
                <Icon as={Waves} color="cyan.400" mr={2} boxSize={3.5} />
                <TacticalText variant="mono" fontSize="xs">+{config.waterLevel}m</TacticalText>
              </GlassPanel>
            )}
            {config.temp !== 25 && (
              <GlassPanel px={3} py={2} depth="base" align="center">
                <Icon as={Thermometer} color={config.temp > 35 ? 'red.400' : 'blue.300'} mr={2} boxSize={3.5} />
                <TacticalText variant="mono" fontSize="xs">{config.temp}°C</TacticalText>
              </GlassPanel>
            )}
            <GlassPanel px={3} py={2} depth="base" align="center">
              <Icon as={Clock} color="whiteAlpha.600" mr={2} boxSize={3.5} />
              <TacticalText variant="mono" fontSize="xs">{config.duration}min</TacticalText>
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
  unit?: string;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}

const ConfigSlider = ({ label, value, unit, min, max, step = 1, onChange }: ConfigSliderProps) => (
  <Box>
    <Flex justify="space-between" mb={2}>
      <TacticalText variant="caption">{label}</TacticalText>
      <TacticalText variant="mono" color="sos.blue.400">{value} {unit}</TacticalText>
    </Flex>
    <Slider min={min} max={max} step={step} value={value} onChange={onChange}>
      <SliderTrack bg="whiteAlpha.100"><SliderFilledTrack bg="sos.blue.500" /></SliderTrack>
      <SliderThumb boxSize={3} bg="white" />
    </Slider>
  </Box>
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

const LayerToggle = ({ label, active, onChange }: { label: string, active: boolean, onChange: () => void }) => (
  <Flex justify="space-between" align="center">
    <TacticalText variant="mono" fontSize="10px" color={active ? "white" : "whiteAlpha.400"}>{label}</TacticalText>
    <Switch size="sm" isChecked={active} onChange={onChange} colorScheme="blue" />
  </Flex>
);

// ─── Visualização 3D — Presets & Layer Groups ────────────────────────────────

type LayersState = {
  buildings: boolean; streets: boolean; terrain: boolean; satellite: boolean;
  vegetation: boolean; particles: boolean; aiStructural: boolean; semantic: boolean;
  polygons: boolean; topography: boolean; bridges: boolean; paving: boolean;
  residential: boolean; slope: boolean; density: boolean; sunSync: boolean;
  naturalAreas: boolean; landUseZones: boolean; amenities: boolean;
};

const VIEW_PRESETS: {
  id: string; label: string; icon: React.ElementType; layers: LayersState;
}[] = [
  {
    id: 'cidade_limpa',
    label: 'CIDADE LIMPA',
    icon: Building2,
    layers: {
      terrain: true, topography: true, paving: true, satellite: false,
      buildings: true, residential: true, bridges: true, streets: true,
      vegetation: false, polygons: true,
      semantic: false, particles: false, aiStructural: false,
      slope: false, density: false, sunSync: false,
      naturalAreas: true, landUseZones: false, amenities: false,
    },
  },
  {
    id: 'satelite',
    label: 'SATÉLITE',
    icon: Globe,
    layers: {
      terrain: true, topography: false, satellite: true, paving: false,
      buildings: true, residential: true, bridges: true, streets: true,
      vegetation: false, polygons: false,
      semantic: false, particles: false, aiStructural: false,
      slope: false, density: false, sunSync: false,
      naturalAreas: false, landUseZones: false, amenities: false,
    },
  },
  {
    id: 'analise_gis',
    label: 'ANÁLISE GIS',
    icon: BarChart2,
    layers: {
      terrain: true, topography: true, satellite: false, paving: false,
      buildings: false, residential: false, bridges: false, streets: false,
      vegetation: false, polygons: true,
      semantic: true, particles: false, aiStructural: true,
      slope: true, density: true, sunSync: true,
      naturalAreas: true, landUseZones: true, amenities: true,
    },
  },
  {
    id: 'desastre',
    label: 'DESASTRE',
    icon: Zap,
    layers: {
      terrain: true, topography: true, satellite: false, paving: false,
      buildings: true, residential: true, bridges: true, streets: true,
      vegetation: false, polygons: true,
      semantic: false, particles: true, aiStructural: true,
      slope: true, density: false, sunSync: false,
      naturalAreas: true, landUseZones: false, amenities: true,
    },
  },
];

const LAYER_GROUPS: {
  label: string; icon: React.ElementType;
  items: { key: keyof LayersState; label: string }[];
}[] = [
  {
    label: 'TERRENO & RELEVO',
    icon: Mountain,
    items: [
      { key: 'terrain',    label: 'Topografia (DEM)' },
      { key: 'topography', label: 'Mapa Topográfico' },
      { key: 'satellite',  label: 'Imagem de Satélite' },
      { key: 'sunSync',    label: 'Sol Real (NOAA)' },
    ],
  },
  {
    label: 'EDIFICAÇÕES & INFRA',
    icon: Building2,
    items: [
      { key: 'buildings',   label: 'Edifícios e Prédios' },
      { key: 'residential', label: 'Casas Residenciais' },
      { key: 'streets',     label: 'Ruas e Rodovias' },
      { key: 'bridges',     label: 'Pontes e Viadutos' },
    ],
  },
  {
    label: 'NATUREZA & ÁGUA',
    icon: Trees,
    items: [
      { key: 'polygons',     label: 'Rios e Lagos' },
      { key: 'naturalAreas', label: 'Áreas Naturais (OSM)' },
      { key: 'paving',       label: 'Praças e Estacionamentos' },
    ],
  },
  {
    label: 'ZONAS & EQUIPAMENTOS',
    icon: Globe,
    items: [
      { key: 'landUseZones', label: 'Zonas Urbanas (OSM)' },
      { key: 'amenities',    label: 'Equipamentos Urbanos' },
    ],
  },
  {
    label: 'ANÁLISE & IA',
    icon: Activity,
    items: [
      { key: 'semantic',     label: 'Semântica 3D (IA)' },
      { key: 'slope',        label: 'Declividade (Horn)' },
      { key: 'density',      label: 'Densidade Populacional' },
      { key: 'aiStructural', label: 'Estruturas Críticas (IA)' },
    ],
  },
  {
    label: 'CLIMA & EFEITOS',
    icon: CloudRain,
    items: [
      { key: 'particles', label: 'Chuva / Vento / Partículas' },
    ],
  },
];

// Maps config param keys to human-readable label, unit, min, max, step
const PARAM_META: Record<SimulationParamKey, { label: string; unit: string; min: number; max: number; step?: number }> = {
  waterLevel:       { label: 'Nível da Água',        unit: 'm',     min: 0,    max: 50,   step: 0.5 },
  precipitation:    { label: 'Precipitação',          unit: 'mm/h',  min: 0,    max: 400,  step: 5 },
  floodVelocity:    { label: 'Velocidade do Fluxo',   unit: 'm/s',   min: 0,    max: 15,   step: 0.5 },
  waveHeight:       { label: 'Altura da Onda',         unit: 'm',     min: 0,    max: 80,   step: 1 },
  waveVelocity:     { label: 'Velocidade da Onda',    unit: 'km/h',  min: 0,    max: 1000, step: 10 },
  stormSurge:       { label: 'Maré de Tempestade',    unit: 'm',     min: 0,    max: 30,   step: 0.5 },
  windSpeed:        { label: 'Velocidade do Vento',   unit: 'km/h',  min: 0,    max: 500,  step: 5 },
  windDirection:    { label: 'Direção do Vento',      unit: '°',     min: 0,    max: 360,  step: 5 },
  pressure:         { label: 'Pressão Atmosférica',   unit: 'hPa',   min: 870,  max: 1030, step: 1 },
  humidity:         { label: 'Umidade Relativa',      unit: '%',     min: 0,    max: 100,  step: 1 },
  temp:             { label: 'Temperatura',           unit: '°C',    min: -35,  max: 60,   step: 1 },
  magnitude:        { label: 'Magnitude Richter',     unit: 'M',     min: 1,    max: 10,   step: 0.1 },
  faultDepth:       { label: 'Profundidade da Falha', unit: 'km',    min: 0,    max: 100,  step: 1 },
  geologyIndex:     { label: 'Índice Geológico',      unit: '/10',   min: 0,    max: 10,   step: 0.5 },
  slopeInstability: { label: 'Instab. de Encosta',    unit: '/10',   min: 0,    max: 10,   step: 0.5 },
  soilSaturation:   { label: 'Saturação do Solo',     unit: '%',     min: 0,    max: 100,  step: 1 },
  spreadRate:       { label: 'Taxa de Propagação',    unit: 'm/h',   min: 0,    max: 5000, step: 50 },
  fireTemp:         { label: 'Temp. do Fogo',         unit: '°C',    min: 200,  max: 1500, step: 50 },
  snowfall:         { label: 'Queda de Neve',         unit: 'cm/h',  min: 0,    max: 80,   step: 1 },
  snowAccumulation: { label: 'Acúmulo de Neve',       unit: 'cm',    min: 0,    max: 500,  step: 5 },
  frostDepth:       { label: 'Prof. da Geada',        unit: 'cm',    min: 0,    max: 80,   step: 1 },
  rainfallDeficit:  { label: 'Déficit de Chuva',      unit: '%',     min: 0,    max: 100,  step: 1 },
  soilMoisture:     { label: 'Umidade do Solo',       unit: '%',     min: 0,    max: 100,  step: 1 },
  intensity:        { label: 'Intensidade',           unit: '%',     min: 0,    max: 100,  step: 1 },
  duration:         { label: 'Duração',               unit: 'min',   min: 5,    max: 1440, step: 5 },
  resolution:       { label: 'Resolução 3D',          unit: 'v',     min: 64,   max: 512,  step: 32 },
  urbanDensity:     { label: 'Densidade Urbana',      unit: '%',     min: 0,    max: 100,  step: 1 },
};

const PARAM_GROUPS: { label: string; icon: React.ElementType; keys: SimulationParamKey[] }[] = [
  {
    label: 'METEOROLOGIA',
    icon: CloudRain,
    keys: ['precipitation', 'temp', 'humidity', 'windSpeed', 'windDirection', 'pressure'],
  },
  {
    label: 'HIDROLOGIA',
    icon: Waves,
    keys: ['waterLevel', 'floodVelocity', 'waveHeight', 'waveVelocity', 'stormSurge'],
  },
  {
    label: 'GEOLOGIA & SOLO',
    icon: Mountain,
    keys: ['magnitude', 'faultDepth', 'geologyIndex', 'slopeInstability', 'soilSaturation', 'soilMoisture'],
  },
  {
    label: 'FENÔMENO ESPECÍFICO',
    icon: Zap,
    keys: ['spreadRate', 'fireTemp', 'snowfall', 'snowAccumulation', 'frostDepth', 'rainfallDeficit'],
  },
];

const DisasterParamSlider = ({
  param, config, setConfig, compact = false
}: {
  param: SimulationParamKey;
  config: SimulationConfig;
  setConfig: React.Dispatch<React.SetStateAction<SimulationConfig>>;
  compact?: boolean;
}) => {
  const meta = PARAM_META[param];
  if (!meta || config[param] === undefined) return null;
  const val = config[param];
  return (
    <Box>
      <Flex justify="space-between" mb={compact ? 1 : 2}>
        <TacticalText variant="caption" fontSize={compact ? '9px' : 'xs'}>{meta.label}</TacticalText>
        <TacticalText variant="mono" color="sos.blue.400" fontSize={compact ? '9px' : 'xs'}>
          {Number.isInteger(meta.step ?? 1) ? val : val.toFixed(1)} {meta.unit}
        </TacticalText>
      </Flex>
      <Slider min={meta.min} max={meta.max} step={meta.step ?? 1} value={val}
        onChange={(v) => setConfig((prev) => ({ ...prev, [param]: v }))}>
        <SliderTrack bg="whiteAlpha.100"><SliderFilledTrack bg="sos.blue.500" /></SliderTrack>
        <SliderThumb boxSize={compact ? 2.5 : 3} bg="white" />
      </Slider>
    </Box>
  );
};
