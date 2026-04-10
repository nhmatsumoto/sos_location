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

const createEmptyUrbanResult = (bbox: number[]): UrbanSimulationResult => ({
  bbox,
  elevationGrid: [],
  urbanFeatures: {
    buildings: [],
    highways: [],
    waterways: [],
    waterAreas: [],
    parks: [],
    naturalAreas: [],
    landUseZones: [],
    amenities: [],
    pedestrianAreas: [],
    parkingLots: [],
    trees: [],
    barriers: [],
    areaScale: 0,
    isSynthetic: true,
    metadata: { source: 'frontend-empty-fallback' },
  },
});

const countUrbanFeatures = (data: UrbanSimulationResult): number => {
  const f = data.urbanFeatures;
  if (!f) return 0;
  return [
    f.buildings, f.highways, f.waterways, f.waterAreas, f.parks,
    f.naturalAreas, f.landUseZones, f.amenities, f.pedestrianAreas,
    f.parkingLots, f.trees, f.barriers,
  ].reduce((sum, items) => sum + (items?.length ?? 0), 0);
};

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
   * The 21/03 renderer contract is:
   * 1. indexUrbanPipeline(bbox) returns the OSM/DEM city payload.
   * 2. CityBlueprintBuilder.build(bbox, osmData) owns satellite capture,
   *    semantic segmentation and blueprint compilation in the browser.
   * 3. The backend scene-data endpoint is a fallback only. It is intentionally
   *    not called in the normal path, otherwise a /scenes/data 504 can break
   *    or delay the 21/03-style frontend render.
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

      const bboxTuple = [bbox[0], bbox[1], bbox[2], bbox[3]] as [number, number, number, number];

      // Keep the 21/03 path primary: OSM/DEM first, frontend blueprint builder next.
      const [osmDataRaw, hotspots] = await Promise.all([
        simulationsApi.indexUrbanPipeline({
          minLat: bbox[0], minLon: bbox[1],
          maxLat: bbox[2], maxLon: bbox[3],
        }).catch(err => {
          console.warn('[Blueprint] Indexing pipeline failed, using empty fallback:', err);
          return createEmptyUrbanResult(bbox);
        }),
        gisApi.fetchHotspots(bbox[0], bbox[1], bbox[2], bbox[3])
          .catch(() => [] as HotspotEntry[]),
      ]);

      const baseResult = createEmptyUrbanResult(bbox);
      const normalizedOsmData = osmDataRaw as unknown as UrbanSimulationResult;
      const mergedUrbanFeatures = {
        ...baseResult.urbanFeatures,
        ...(normalizedOsmData.urbanFeatures ?? {}),
      };
      const enrichedOsmData: UrbanSimulationResult = {
        ...baseResult,
        ...normalizedOsmData,
        bbox: normalizedOsmData.bbox ?? bbox,
        urbanFeatures: mergedUrbanFeatures,
        hotspots: (hotspots as HotspotEntry[]).length > 0 ? hotspots as HotspotEntry[] : undefined,
      };
      const finalResultData = enrichedOsmData;
      if (countUrbanFeatures(finalResultData) > 0 && normalizedOsmData.urbanFeatures?.isSynthetic === undefined) {
        finalResultData.urbanFeatures!.isSynthetic = false;
      }
      setResultData(finalResultData);
      onProgress?.({ phase: 'OSM', percent: 25, label: 'DADOS OSM + DEM RECEBIDOS' });

      let bp: CityBlueprint;
      const hasUrbanPayload = countUrbanFeatures(finalResultData) > 0;

      if (hasUrbanPayload) {
        bp = await CityBlueprintBuilder.build(
          bboxTuple,
          finalResultData,
          16,
          onProgress,
        );
      } else {
        const sceneData = await sceneDataApi.fetchSceneData({
          minLat: bbox[0], minLon: bbox[1],
          maxLat: bbox[2], maxLon: bbox[3],
          tileSize: 16,
          demResolution: 64,
        }).catch(err => {
          console.warn('[Blueprint] Backend scene fallback unavailable — using frontend fallback:', err?.message ?? err);
          return null;
        });

        bp = sceneData
          ? await CityBlueprintBuilder.buildFromSceneData(
            bboxTuple,
            sceneData,
            finalResultData,
            onProgress,
          )
          : await CityBlueprintBuilder.build(
            bboxTuple,
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
        const span = 0.012;
        finalBbox = [numericLat - span, numericLng - span, numericLat + span, numericLng + span];
      }
      // Run the physics simulation without replacing the city blueprint payload.
      // The 3D city remains stable; disaster overlays consume simData/config.
      const response = await simulationsApi.runSimulation({
        scenarioType,
        minLat: finalBbox[0], minLon: finalBbox[1],
        maxLat: finalBbox[2], maxLon: finalBbox[3],
        resolution,
        ...config,
      });
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
