import { create } from 'zustand';
import { setProjectionReference } from '../utils/projection';

export interface SelectedCity {
  lat: number;
  lng: number;
  name: string;
  /** [minLat, minLon, maxLat, maxLon] — span padrão de ±0.025° se não vier da busca */
  bbox: [number, number, number, number];
}

const DEFAULT_SPAN = 0.025;

function makeBbox(lat: number, lng: number): [number, number, number, number] {
  return [lat - DEFAULT_SPAN, lng - DEFAULT_SPAN, lat + DEFAULT_SPAN, lng + DEFAULT_SPAN];
}

interface CityStore {
  city: SelectedCity | null;
  setCity: (lat: number, lng: number, name?: string, bbox?: [number, number, number, number]) => void;
  clearCity: () => void;
}

export const useCityStore = create<CityStore>((set) => ({
  city: null,

  setCity: (lat, lng, name = '', bbox) => {
    // Keep 3D projection reference centred on the selected city
    setProjectionReference(lat, lng);
    set({
      city: {
        lat,
        lng,
        name,
        bbox: bbox ?? makeBbox(lat, lng),
      },
    });
  },

  clearCity: () => set({ city: null }),
}));
