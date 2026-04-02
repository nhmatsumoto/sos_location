import { useState, useEffect, useMemo, useRef } from 'react';
import { simulationsApi } from '../services/simulationsApi';
import { dataHubApi } from '../services/dataHubApi';
import { gisApi } from '../services/gisApi';
import { sceneDataApi } from '../services/sceneDataApi';
import { CityBlueprintBuilder } from '../lib/blueprint/CityBlueprintBuilder';
import type { UrbanSimulationResult, HotspotEntry } from '../types';
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
  const blueprintCacheRef = useRef<Map<string, { bp: CityBlueprint, res: UrbanSimulationResult }>>(new Map());

  /**
   * Full blueprint capture pipeline:
   *
   * The ORIGINAL pipeline (simulationsApi.indexUrbanPipeline + CityBlueprintBuilder.build)
   * always runs and is the guaranteed path.
   *
   * The NEW backend scene data pipeline (sceneDataApi.fetchSceneData) runs in PARALLEL
   * as an optional enhancement.  If it succeeds, `buildFromSceneData` is used to
   * incorporate precomputed slope analysis and backend-normalised elevation.
   * If it fails (timeout, rate-limit, etc.), the original pipeline result is used — silently.
   *
   * This dual-path architecture means the rendering is never blocked by backend
   * external API failures (Overpass timeout, DEM 429, etc.).
   */
  const captureBlueprint = async (
    bbox: number[],
    onProgress?: (p: BlueprintProgress) => void,
  ): Promise<CityBlueprint | undefined> => {
    if (isCapturingRef.current) {
      console.warn('[Blueprint] Capture already in progress, ignoring duplicate call');
      return;
    }

    // Check cache first (bbox coordinates rounded to 6 decimals to handle float jitter)
    const bboxKey = bbox.map(c => c.toFixed(6)).join(',');
    const cached = blueprintCacheRef.current.get(bboxKey);
    if (cached) {
      onProgress?.({ phase: 'COMPILE', percent: 100, label: 'LENDO DO CACHE...' });
      setResultData(cached.res);
      setBlueprint(cached.bp);
      return cached.bp;
    }

    isCapturingRef.current = true;
    setIsSimulating(true);

    try {
      onProgress?.({ phase: 'OSM', percent: 5, label: 'CONECTANDO AO SERVIDOR GIS...' });

      // ── Run all fetches in parallel ──────────────────────────────────────
      // sceneDataApi is non-blocking: resolves to null on any error
      const [osmData, hotspots, sceneData] = await Promise.all([
        simulationsApi.indexUrbanPipeline({
          minLat: bbox[0], minLon: bbox[1],
          maxLat: bbox[2], maxLon: bbox[3],
        }).catch(err => {
          console.warn('[Blueprint] Indexing pipeline failed, using empty fallback:', err);
          return { urbanFeatures: { buildings: [], roads: [], water: [], forests: [] } };
        }),
        gisApi.fetchHotspots(bbox[0], bbox[1], bbox[2], bbox[3])
          .catch(() => [] as HotspotEntry[]),
        sceneDataApi.fetchSceneData({
          minLat: bbox[0], minLon: bbox[1],
          maxLat: bbox[2], maxLon: bbox[3],
          tileSize: 16,
          demResolution: 64,
        }).catch(err => {
          console.warn('[Blueprint] Backend scene pipeline unavailable — using frontend pipeline:', err?.message ?? err);
          return null;
        }),
      ]);

      const enrichedOsmData = {
        ...osmData,
        hotspots: (hotspots as HotspotEntry[]).length > 0 ? hotspots as HotspotEntry[] : undefined,
      };
      const finalResultData = enrichedOsmData as unknown as UrbanSimulationResult;
      setResultData(finalResultData);
      onProgress?.({ phase: 'OSM', percent: 25, label: 'DADOS OSM + DEM RECEBIDOS' });

      // ── Choose pipeline based on backend availability ────────────────────
      let bp: CityBlueprint;

      if (sceneData) {
        // Backend data available — use precomputed elevation + slope + OSM
        onProgress?.({ phase: 'SEGMENTATION', percent: 40, label: 'DADOS BACKEND RECEBIDOS — MONTANDO CENA...' });
        bp = await CityBlueprintBuilder.buildFromSceneData(
          [bbox[0], bbox[1], bbox[2], bbox[3]] as [number, number, number, number],
          sceneData,
          finalResultData,
          onProgress,
        );
      } else {
        // Fallback: full frontend pipeline (always reliable)
        bp = await CityBlueprintBuilder.build(
          [bbox[0], bbox[1], bbox[2], bbox[3]] as [number, number, number, number],
          finalResultData,
          16,
          onProgress,
        );
      }

      // Update cache
      blueprintCacheRef.current.set(bboxKey, { bp, res: finalResultData });

      setBlueprint(bp);
      return bp;

    } catch (err) {
      console.error('[Blueprint] Pipeline failed:', err);
      throw err;
    } finally {
      // finally runs ONLY after the entire async body completes (no dangling fallbacks)
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
        const span = 0.025;
        finalBbox = [numericLat - span, numericLng - span, numericLat + span, numericLng + span];
      }
      const response = await simulationsApi.runSimulation({
        scenarioType,
        minLat: finalBbox[0], minLon: finalBbox[1],
        maxLat: finalBbox[2], maxLon: finalBbox[3],
        resolution,
        ...config,
      });
      setResultData(response as unknown as UrbanSimulationResult);
      return response;
    } catch (err) {
      console.error('Simulation engine failed:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const startRealtimeStream = () => {
    setStreamSteps([]);
    const steps = Array.from({ length: 10 }, (_, index) => ({
      step: index,
      lat: numericLat - (index * 0.00085),
      lng: numericLng + (index * 0.00055),
      depth: Number((0.15 + index * 0.12).toFixed(2)),
      risk: index < 3 ? 'watch' : index < 7 ? 'elevated' : 'critical',
    }));
    setStreamSteps(steps);
  };

  useEffect(() => {
    void dataHubApi.weatherForecast(numericLat, numericLng)
      .then(response => {
        const precipitation = response.data?.hourly?.precipitation ?? [];
        const peakRain = Array.isArray(precipitation) && precipitation.length > 0
          ? Math.max(...precipitation) : 0;
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
