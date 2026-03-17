import { useState, useEffect } from 'react';

export interface GlobalEvent {
  id: string;
  title: string;
  type: 'Earthquake' | 'Flood' | 'Cyclone' | 'Wildfire' | 'Volcano';
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  location: string;
  countryCode: string;
  timestamp: string;
  lat: number;
  lon: number;
  description: string;
}

const MOCK_EVENTS: GlobalEvent[] = [
  {
    id: 'gdacs-1',
    title: 'Tropical Cyclone ILSA-23',
    type: 'Cyclone',
    severity: 'High',
    location: 'Western Australia',
    countryCode: 'AU',
    timestamp: new Date().toISOString(),
    lat: -20.3,
    lon: 118.6,
    description: 'Cyclone reaching Category 4. Storm surge risk in Port Hedland.'
  },
  {
    id: 'gdacs-2',
    title: 'M 6.8 Earthquake - Hindu Kush',
    type: 'Earthquake',
    severity: 'Critical',
    location: 'Afghanistan / Pakistan border',
    countryCode: 'AF',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    lat: 36.5,
    lon: 70.9,
    description: 'Deep earthquake (180km). Massive shaking felt in Kabul and Islamabad.'
  },
  {
    id: 'gdacs-3',
    title: 'Po River Flood Crisis',
    type: 'Flood',
    severity: 'Medium',
    location: 'Emilia-Romagna',
    countryCode: 'IT',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    lat: 44.4,
    lon: 12.2,
    description: 'Unprecedented rainfall causing 23 rivers to overflow. Evacuations in progress.'
  },
  {
    id: 'gdacs-4',
    title: 'Mount Etna Eruption',
    type: 'Volcano',
    severity: 'Low',
    location: 'Sicily',
    countryCode: 'IT',
    timestamp: new Date(Date.now() - 14400000).toISOString(),
    lat: 37.7,
    lon: 15.0,
    description: 'Ash plume detected. Flights redirected from Catania airport.'
  }
];

export function useGlobalDisasters() {
  const [events, setEvents] = useState<GlobalEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API fetch delay
    const timer = setTimeout(() => {
      setEvents(MOCK_EVENTS);
      setLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  return { events, loading };
}
