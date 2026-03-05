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
}));
