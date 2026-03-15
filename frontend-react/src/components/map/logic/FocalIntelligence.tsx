import React, { useRef, useEffect } from 'react';
import { useSimulationStore } from '../../../store/useSimulationStore';
import { getCurrentWeather, weatherCodeToText } from '../../../services/openMeteo';

export const FocalIntelligence: React.FC = () => {
  const focalPoint = useSimulationStore(state => state.focalPoint);
  const setFocalWeather = useSimulationStore(state => state.setFocalWeather);
  const lastUpdate = useRef(0);

  useEffect(() => {
    if (!focalPoint) return;
    
    const now = Date.now();
    // Cache for 5 minutes (300,000 ms) - reduced API pressure
    if (now - lastUpdate.current < 300000) return;
    lastUpdate.current = now;

    const fetchFocalData = async () => {
      setFocalWeather({ loading: true });
      try {
        const [lat, lon] = focalPoint;
        const data = await getCurrentWeather(lat, lon);
        
        setFocalWeather({
          temp: Math.round(data.temp * 10) / 10,
          humidity: Math.round(data.humidity),
          windSpeed: Math.round(data.windSpeed),
          description: weatherCodeToText(data.code),
          loading: false
        });
      } catch (error) {
        console.error('Failed to fetch focal weather', error);
        setFocalWeather({ loading: false });
      }
    };

    void fetchFocalData();
  }, [focalPoint, setFocalWeather]);

  return null;
};
