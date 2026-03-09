import { create } from 'zustand';

export interface SimulationBox {
  center: [number, number]; // lat, lon
  size: [number, number];   // width in meters (east-west), height in meters (north-south)
}

interface SimulationState {
  box: SimulationBox | null;
  setBox: (box: SimulationBox | null) => void;
  scenarioId: string | null;
  setScenarioId: (id: string | null) => void;
  waterLevel: number;
  setWaterLevel: (level: number) => void;
  hazardType: string;
  setHazardType: (type: string) => void;
  scenarioParameters: Record<string, any>;
  setScenarioParameters: (params: Record<string, any>) => void;
  
  // New State
  isSimulating: boolean;
  setIsSimulating: (active: boolean) => void;
  activeRun: any | null;
  setActiveRun: (run: any | null) => void;
  environment: {
    fog: number;
    rain: number;
    snow: number;
  };
  setEnvironment: (env: Partial<{ fog: number; rain: number; snow: number }>) => void;
  timeOfDay: number;
  setTimeOfDay: (time: number) => void;
  satelliteTextureUrl: string | null;
  setSatelliteTextureUrl: (url: string | null) => void;
  showStreets: boolean;
  setShowStreets: (show: boolean) => void;
  showVegetation: boolean;
  setShowVegetation: (show: boolean) => void;
  dynamicBounds: string | null;
  setDynamicBounds: (bounds: string | null) => void;
  showGEE: boolean;
  setShowGEE: (show: boolean) => void;
  showPhotogrammetry: boolean;
  setShowPhotogrammetry: (show: boolean) => void;
  activeLayers: {
    satellite: boolean;
    map: boolean;
    relief: boolean;
    streets: boolean;
    vegetation: boolean;
    buildings: boolean;
    labels: boolean;
  };
  setLayer: (layer: keyof SimulationState['activeLayers'], active: boolean) => void;
  geeAnalysisType: 'ndvi' | 'moisture' | 'thermal';
  setGeeAnalysisType: (type: 'ndvi' | 'moisture' | 'thermal') => void;
  cameraMode: 'orbit' | 'fly';
  setCameraMode: (mode: 'orbit' | 'fly') => void;
  
  // Advanced Simulation State
  simulationDate: string;
  setSimulationDate: (date: string) => void;
  rainIntensity: number; 
  setRainIntensity: (val: number) => void;
  soilSaturation: number; 
  setSoilSaturation: (val: number) => void;
  soilType: 'clay' | 'sandy' | 'loam' | 'rocky';
  setSoilType: (type: 'clay' | 'sandy' | 'loam' | 'rocky') => void;

  // Camera-Aware Intelligence
  focalPoint: [number, number] | null; // [lat, lon] the camera is looking at
  setFocalPoint: (point: [number, number] | null) => void;
  focalWeather: {
    temp: number;
    humidity: number;
    windSpeed: number;
    description: string;
    loading: boolean;
  };
  setFocalWeather: (weather: Partial<SimulationState['focalWeather']>) => void;

  // SOS Hero / Pegman State
  heroPosition: [number, number]; // [lat, lon]
  setHeroPosition: (pos: [number, number]) => void;
  isPegmanActive: boolean;
  setIsPegmanActive: (active: boolean) => void;
  cameraTarget: 'hero' | 'manual';
  setCameraTarget: (target: 'hero' | 'manual') => void;
  // Camera repositioning action
  setCameraTo: (x: number, y: number, z: number) => void;
}

export const useSimulationStore = create<SimulationState>((set) => ({
  box: null,
  setBox: (box) => set({ box }),
  scenarioId: null,
  setScenarioId: (scenarioId) => set({ scenarioId }),
  waterLevel: 0,
  setWaterLevel: (waterLevel) => set({ waterLevel }),
  hazardType: 'Flood',
  setHazardType: (type) => set({ hazardType: type }),
  scenarioParameters: {},
  setScenarioParameters: (params) => set({ scenarioParameters: params }),
  
  isSimulating: false,
  setIsSimulating: (isSimulating) => set({ isSimulating }),
  activeRun: null,
  setActiveRun: (activeRun) => set({ activeRun }),
  environment: {
    fog: 0,
    rain: 0,
    snow: 0,
  },
  setEnvironment: (env) => set((state) => ({ 
    environment: { ...state.environment, ...env } 
  })),
  timeOfDay: 12,
  setTimeOfDay: (timeOfDay) => set({ timeOfDay }),
  satelliteTextureUrl: null,
  setSatelliteTextureUrl: (url) => set({ satelliteTextureUrl: url }),
  showStreets: true,
  setShowStreets: (showStreets) => set({ showStreets }),
  showVegetation: true,
  setShowVegetation: (showVegetation) => set({ showVegetation }),
  dynamicBounds: null,
  setDynamicBounds: (dynamicBounds) => set({ dynamicBounds }),
  showGEE: false,
  setShowGEE: (showGEE) => set({ showGEE }),
  showPhotogrammetry: false,
  setShowPhotogrammetry: (showPhotogrammetry) => set({ showPhotogrammetry }),
  activeLayers: {
    satellite: true,
    map: false,
    relief: true,
    streets: true,
    vegetation: true,
    buildings: true,
    labels: false,
  },
  setLayer: (layer, active) => set((state) => ({
    activeLayers: { ...state.activeLayers, [layer]: active }
  })),
  geeAnalysisType: 'ndvi',
  setGeeAnalysisType: (geeAnalysisType) => set({ geeAnalysisType }),
  cameraMode: 'orbit',
  setCameraMode: (cameraMode) => set({ cameraMode }),
  
  // Defaults
  simulationDate: new Date().toISOString().split('T')[0],
  setSimulationDate: (simulationDate) => set({ simulationDate }),
  rainIntensity: 0,
  setRainIntensity: (rainIntensity) => set({ rainIntensity }),
  soilSaturation: 10,
  setSoilSaturation: (soilSaturation) => set({ soilSaturation }),
  soilType: 'loam',
  setSoilType: (soilType) => set({ soilType }),

  // Defaults for Camera-Aware Intelligence
  focalPoint: null,
  setFocalPoint: (focalPoint) => set({ focalPoint }),
  focalWeather: {
    temp: 24,
    humidity: 65,
    windSpeed: 12,
    description: 'Cloudy',
    loading: false
  },
  setFocalWeather: (weather) => set((state) => ({
    focalWeather: { ...state.focalWeather, ...weather }
  })),

  // SOS Hero / Pegman Defaults
  heroPosition: [-20.91, -42.98], // Default to Ubá center
  setHeroPosition: (heroPosition) => set({ heroPosition }),
  isPegmanActive: false,
  setIsPegmanActive: (isPegmanActive) => set({ isPegmanActive }),
  cameraTarget: 'manual',
  setCameraTarget: (cameraTarget) => set({ cameraTarget }),
  setCameraTo: (x, y, z) => {
    // This is a placeholder for the actual implementation which might involve 
    // updating a focal point or a specific camera state that the 3D map consumes.
    // For now, we'll log it to ensure it's called and can be expanded.
    console.log(`[SimulationStore] Moving camera to: ${x}, ${y}, ${z}`);
    set({ cameraTarget: 'manual', focalPoint: [x, z] }); // Partial migration
  }
}));
