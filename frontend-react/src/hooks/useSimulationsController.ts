import { useState, useEffect, useMemo, useRef } from 'react';
import { simulationsApi } from '../services/simulationsApi';
import { dataHubApi } from '../services/dataHubApi';
import { CityBlueprintBuilder } from '../lib/blueprint/CityBlueprintBuilder';
import type { UrbanSimulationResult } from '../types';
import type { CityBlueprint, BlueprintProgress } from '../lib/blueprint/CityBlueprintTypes';

interface StreamStep {
  step: number;
  lat: number;
  lng: number;
  depth: number;
  risk: string;
}

export function useSimulationsController() {
  const [lat, setLat] = useState('-21.1215');
  const [lng, setLng] = useState('-42.9427');
  const [resultData, setResultData] = useState<UrbanSimulationResult | null>(null);
  const [blueprint, setBlueprint] = useState<CityBlueprint | null>(null);
  const [streamSteps, setStreamSteps] = useState<StreamStep[]>([]);
  const [rainSummary, setRainSummary] = useState('CALIBRATING WEATHER_STATIONS...');
  const [isSimulating, setIsSimulating] = useState(false);

  const numericLat = useMemo(() => Number(lat), [lat]);
  const numericLng = useMemo(() => Number(lng), [lng]);

  const isCapturingRef = useRef(false);

  /**
   * Full blueprint capture pipeline:
   * 1. Fetch OSM + DEM from backend
   * 2. Load satellite tiles + segment → semantic grid
   * 3. Build unified CityBlueprint
   */
  const captureBlueprint = async (
    bbox: number[],
    onProgress?: (p: BlueprintProgress) => void,
  ) => {
    if (isCapturingRef.current) {
      console.warn('[Blueprint] Capture already in progress, ignoring duplicate call');
      return;
    }
    isCapturingRef.current = true;
    setIsSimulating(true);
    try {
      // Step 1: fetch backend data (OSM + DEM)
      onProgress?.({ phase: 'OSM', percent: 5, label: 'CONECTANDO AO SERVIDOR GIS...' });
      const osmData = await simulationsApi.indexUrbanPipeline({
        minLat: bbox[0], minLon: bbox[1],
        maxLat: bbox[2], maxLon: bbox[3],
      });
      setResultData(osmData as unknown as UrbanSimulationResult);
      onProgress?.({ phase: 'OSM', percent: 20, label: 'DADOS OSM + DEM RECEBIDOS' });

      // Step 2: satellite + segmentation + compile
      const bp = await CityBlueprintBuilder.build(
        [bbox[0], bbox[1], bbox[2], bbox[3]] as [number, number, number, number],
        osmData as unknown as UrbanSimulationResult,
        16,
        onProgress,
      );
      setBlueprint(bp);
      return bp;
    } catch (err) {
      console.error('Blueprint capture failed:', err);
      throw err;
    } finally {
      isCapturingRef.current = false;
      setIsSimulating(false);
    }
  };

  const runSimulation = async (
    scenarioType: string = 'landslide',
    resolution: number = 128,
    bbox?: number[],
    config?: Record<string, unknown>,
  ) => {
    setIsSimulating(true);
    try {
      let finalBbox = bbox;
      if (!finalBbox) {
        const span = 0.012;
        finalBbox = [numericLat - span, numericLng - span, numericLat + span, numericLng + span];
      }
      // Run physics simulation — do NOT overwrite blueprint
      await simulationsApi.runSimulation({
        scenarioType,
        minLat: finalBbox[0], minLon: finalBbox[1],
        maxLat: finalBbox[2], maxLon: finalBbox[3],
        resolution,
        ...config,
      });
      // Note: we intentionally don't overwrite resultData/blueprint here
      // The 3D city stays as-is; only disaster overlay parameters change via simData
    } catch (err) {
      console.error('Simulation engine failed:', err);
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
      if (payload.type === 'done') { source.close(); return; }
      if (payload.type === 'flow-step') {
        setStreamSteps(prev => [...prev, {
          step: payload.step ?? prev.length,
          lat: payload.lat ?? numericLat,
          lng: payload.lng ?? numericLng,
          depth: payload.depth ?? 0,
          risk: payload.risk ?? 'unknown',
        }]);
      }
    };
    source.onerror = () => source.close();
  };

  useEffect(() => {
    void dataHubApi.weatherForecast(numericLat, numericLng)
      .then(response => {
        const precipitation = response.data?.hourly?.precipitation ?? [];
        const peakRain = Array.isArray(precipitation) && precipitation.length > 0 ? Math.max(...precipitation) : 0;
        setRainSummary(`PEAK_PRECIPITATION: ${Number(peakRain).toFixed(1)} MM/H`);
      })
      .catch(() => setRainSummary('ERROR: DATA_OFFLINE'));
  }, [numericLat, numericLng]);

  return {
    lat, setLat, lng, setLng,
    resultData, blueprint, streamSteps, rainSummary, isSimulating,
    numericLat, numericLng,
    actions: { captureBlueprint, runSimulation, startRealtimeStream },
  };
}
