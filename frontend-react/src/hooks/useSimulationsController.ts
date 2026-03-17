import { useState, useEffect, useMemo } from 'react';
import { simulationsApi } from '../services/simulationsApi';
import { dataHubApi } from '../services/dataHubApi';

interface StreamStep {
  step: number;
  lat: number;
  lng: number;
  depth: number;
  risk: string;
}

/**
 * Controller Hook for SimulationsPage
 * Manages simulation parameters, SSE stream flows, and weather telemetry.
 */
export function useSimulationsController() {
  const [lat, setLat] = useState('-21.1215');
  const [lng, setLng] = useState('-42.9427');
  const [resultData, setResultData] = useState<any>(null);
  const [streamSteps, setStreamSteps] = useState<StreamStep[]>([]);
  const [rainSummary, setRainSummary] = useState('CALIBRATING WEATHER_STATIONS...');
  const [isSimulating, setIsSimulating] = useState(false);

  const numericLat = useMemo(() => Number(lat), [lat]);
  const numericLng = useMemo(() => Number(lng), [lng]);

  const runSimulation = async (scenarioType: string = 'landslide', resolution: number = 128, bbox?: number[]) => {
    setIsSimulating(true);
    try {
      let finalBbox = bbox;
      if (!finalBbox) {
         // Fallback: Compute a ~2-3km box around the point for local high-res context
         const span = 0.012; 
         finalBbox = [numericLat - span, numericLng - span, numericLat + span, numericLng + span];
      }

      const payload = await simulationsApi.runSimulation({
        scenarioType,
        minLat: finalBbox[0],
        minLon: finalBbox[1],
        maxLat: finalBbox[2],
        maxLon: finalBbox[3],
        resolution
      });
      setResultData(payload);
    } catch (err) {
      console.error("Simulation engine failed to fetch real GIS context.", err);
    } finally {
      setIsSimulating(false);
    }
  };

  const startRealtimeStream = () => {
    setStreamSteps([]);
    const params = new URLSearchParams({ lat: String(numericLat), lng: String(numericLng), steps: '10' });
    const source = new EventSource(`/api/location/flow-simulation/stream?${params.toString()}`);

    source.onmessage = (event) => {
      const payload = JSON.parse(event.data) as { type: string } & Partial<StreamStep>;
      if (payload.type === 'done') {
        source.close();
        return;
      }
      if (payload.type === 'flow-step') {
        setStreamSteps((prev) => [
          ...prev,
          {
            step: payload.step ?? prev.length,
            lat: payload.lat ?? numericLat,
            lng: payload.lng ?? numericLng,
            depth: payload.depth ?? 0,
            risk: payload.risk ?? 'unknown',
          },
        ]);
      }
    };

    source.onerror = () => {
      source.close();
    };
  };

  useEffect(() => {
    void dataHubApi
      .weatherForecast(numericLat, numericLng)
      .then((response) => {
        const precipitation = response.data?.hourly?.precipitation ?? [];
        const peakRain = Array.isArray(precipitation) && precipitation.length > 0 ? Math.max(...precipitation) : 0;
        setRainSummary(`PEAK_PRECIPITATION: ${Number(peakRain).toFixed(1)} MM/H`);
      })
      .catch(() => setRainSummary('ERROR: DATA_OFFLINE')); 
  }, [numericLat, numericLng]);

  return {
    lat, setLat, lng, setLng,
    resultData, streamSteps, rainSummary, isSimulating,
    numericLat, numericLng,
    actions: { runSimulation, startRealtimeStream }
  };
}
