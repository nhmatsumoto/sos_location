import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { Box } from '@chakra-ui/react';
import { WebGLRenderer } from '../../lib/webgl/WebGLRenderer';
import { GISMath } from '../../lib/webgl/GISMath';
import { TileLoader } from '../../lib/webgl/TileLoader';
import {
  CITY_TERRAIN_VS, CITY_TERRAIN_FS,
  INFRASTRUCTURE_VS, INFRASTRUCTURE_FS,
  VEGETATION_VS, VEGETATION_FS,
  WATER_VS, WATER_FS,
  PARTICLE_VS, PARTICLE_FS,
  WATERWAY_VS, WATERWAY_FS,
  ROAD_VS, ROAD_FS,
  WATER_AREA_VS, WATER_AREA_FS,
  CHARACTER_VS, CHARACTER_FS,
  ZONE_VS, ZONE_FS,
  AMENITY_VS, AMENITY_FS,
  FIRE_VS, FIRE_FS,
  GRASS_VS, GRASS_FS,
} from '../../lib/webgl/shaders/cityShaders';
import { SKY_VS, SKY_FS, PRECIP_VS, PRECIP_FS, FOG_VS, FOG_FS } from '../../lib/webgl/shaders/atmosphereShaders';
import { ENGINEERING_SHADERS } from '../../lib/webgl/shaders/engineeringShaders';
import { SEMANTIC_VS, SEMANTIC_FS } from '../../lib/webgl/shaders/semanticShaders';
import { SemanticTileProcessor } from '../../lib/segmentation/SemanticTileProcessor';
import { SemanticClass } from '../../lib/segmentation/SemanticTypes';
import { getCachedCanvas } from '../../lib/blueprint/SatelliteCanvasCache';
import { GeoDataPipeline } from '../../lib/geo/GeoDataPipeline';
import { SlopeAnalyzer } from '../../lib/analysis/SlopeAnalyzer';
import { HydrologicalAnalyzer } from '../../lib/analysis/HydrologicalAnalyzer';

import type {
  UrbanSimulationResult,
  GISBuilding,
  GISHighway,
  GISWaterway,
  GISWaterArea,
  GISNaturalArea,
  GISLandUseZone,
  GISAmenity,
} from '../../types';
import type { CityBlueprint } from '../../lib/blueprint/CityBlueprintTypes';

interface CityScaleWebGLProps {
  centerLat: number;
  centerLng: number;
  heightMapUrl?: string;
  topoMapUrl?: string;
  layers?: {
    particles?: boolean;
    streets?: boolean;
    buildings?: boolean;
    topography?: boolean;
    vegetation?: boolean;
    terrain?: boolean;
    satellite?: boolean;
    aiStructural?: boolean;
    polygons?: boolean;
    bridges?: boolean;
    paving?: boolean;
    residential?: boolean;
    semantic?: boolean;
    slope?: boolean;       // Slope risk analysis overlay
    density?: boolean;     // Population density heatmap
    sunSync?: boolean;     // Real sun position from lat/lon/time
    naturalAreas?: boolean;  // Natural terrain features (scrub, wetland, beach, farmland, etc.)
    landUseZones?: boolean;  // Urban land-use zones (residential, commercial, industrial, etc.)
    amenities?: boolean;     // Point-of-interest amenity markers
  };
  simData?: {
    type: string;
    waterLevel: number;
    intensity: number;
    duration: number;
    pressure: number;
    precipitation: number;
    resolution?: number;
    urbanDensity?: number;
    windSpeed?: number;
    windDirection?: number;
    temp?: number;
    humidity?: number;
    snowfall?: number;
    soilMoisture?: number;
    spreadRate?: number;
    magnitude?: number;
    floodVelocity?: number;
    // Extended disaster parameters
    fireTemp?: number;
    waveHeight?: number;
    waveVelocity?: number;
    stormSurge?: number;
    faultDepth?: number;
    geologyIndex?: number;
    slopeInstability?: number;
    soilSaturation?: number;
    snowAccumulation?: number;
    frostDepth?: number;
    rainfallDeficit?: number;
  };
  topoScale?: number;
  topoOffset?: number;
  lightAngle?: number;
  lightIntensity?: number;
  particleIntensity?: number;
  areaScale?: number;
  buildingOffsetX?: number;
  buildingOffsetY?: number;
  resultData?: UrbanSimulationResult | null;
  blueprint?: CityBlueprint | null;
}

// ── Separable box blur on a 2-D elevation grid ───────────────────────────────
// Reduces false mountains that appear when coarse DEM data (e.g. 32×32) is
// upsampled to a high-resolution mesh (512×512+).
function smoothGrid(grid: number[][], radius: number): number[][] {
  const rows = grid.length;
  if (rows === 0) return grid;
  const cols = grid[0].length;
  // Horizontal pass
  const tmp: number[][] = Array.from({length: rows}, () => new Array(cols).fill(0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let sum = 0, cnt = 0;
      for (let k = -radius; k <= radius; k++) {
        const cc = Math.max(0, Math.min(cols - 1, c + k));
        sum += grid[r][cc]; cnt++;
      }
      tmp[r][c] = sum / cnt;
    }
  }
  // Vertical pass
  const out: number[][] = Array.from({length: rows}, () => new Array(cols).fill(0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let sum = 0, cnt = 0;
      for (let k = -radius; k <= radius; k++) {
        const rr = Math.max(0, Math.min(rows - 1, r + k));
        sum += tmp[rr][c]; cnt++;
      }
      out[r][c] = sum / cnt;
    }
  }
  return out;
}

// ── Atmosphere / Weather helpers ─────────────────────────────────────────────
function getPrecipType(type: string, precip: number, snowfall: number, temp: number): number {
  if (type === 'SNOW')     return snowfall > 30 ? 6 : 5;
  if (type === 'FROST')    return 0;
  if (type === 'WILDFIRE' || type === 'DROUGHT' || type === 'DEFORESTATION') return 0;
  if (type === 'HAIL')     return 4;
  if (temp < 0 && precip > 0) return snowfall > 5 ? 6 : 5;
  if (precip > 150) return 3;
  if (precip > 50)  return 2;
  if (precip > 8)   return 1;
  return 0;
}
function getCloudCover(type: string, precip: number, intensity: number): number {
  if (type === 'WILDFIRE' || type === 'DROUGHT') return 0.05;
  if (type === 'FROST') return Math.min(0.45, intensity / 200);
  return Math.max(0.12, Math.min(1.0, (precip / 200) * 0.85 + (intensity / 100) * 0.15));
}
function getCloudBase(temp: number, humidity: number): number {
  const dewPoint = temp - (100 - Math.min(humidity, 100)) / 5;
  return Math.max(200, Math.min((temp - dewPoint) * 123, 4000));
}
function getFogDensity(humidity: number, precipType: number): number {
  const humFog   = Math.max(0, (humidity - 68) / 32) * 0.38;
  const precipFog = [0, 0.18, 0.28, 0.60, 0.08, 0.38, 0.65][precipType] ?? 0;
  return Math.min(1.0, humFog + precipFog);
}
function getFogColor(precipType: number, temp: number): [number, number, number] {
  if (precipType >= 5)  return [0.84, 0.88, 0.95];
  if (precipType >= 2)  return [0.50, 0.56, 0.68];
  if (precipType === 4) return [0.78, 0.82, 0.90];
  if (temp > 35)        return [0.74, 0.68, 0.54];
  return [0.56, 0.60, 0.70];
}
function getDisasterTypeInt(type: string): number {
  switch (type) {
    case 'FLOOD': case 'TSUNAMI':              return 1;
    case 'EARTHQUAKE':                          return 2;
    case 'HURRICANE': case 'CYCLONE':          return 3;
    case 'TORNADO':                             return 4;
    case 'WILDFIRE':                            return 5;
    case 'SNOW': case 'FROST':                 return 6;
    case 'DROUGHT': case 'DEFORESTATION':      return 7;
    case 'HAIL':                                return 8;
    case 'MUDSLIDE': case 'LANDSLIDE':         return 9;
    default:                                    return 0;
  }
}

// ── Capsule mesh generator (cylinder body + two hemispheres) ─────────────────
// Returns a flat Float32Array of vec3 positions (no indices — raw triangles).
function buildCapsule(radius: number, totalHeight: number, seg = 10): number[] {
  const verts: number[] = [];
  const bodyH = totalHeight - 2 * radius;
  const yBot  = radius;
  const yTop  = radius + bodyH;
  const hSeg  = 6;

  // Cylinder sides
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
    const x0 = Math.cos(a0) * radius, z0 = Math.sin(a0) * radius;
    const x1 = Math.cos(a1) * radius, z1 = Math.sin(a1) * radius;
    verts.push(x0,yBot,z0,  x1,yTop,z1,  x1,yBot,z1);
    verts.push(x0,yBot,z0,  x0,yTop,z0,  x1,yTop,z1);
  }
  // Top hemisphere (phi: 0 → π/2)
  for (let ring = 0; ring < hSeg; ring++) {
    const p0 = (ring/hSeg)*(Math.PI/2), p1 = ((ring+1)/hSeg)*(Math.PI/2);
    const y0 = yTop + Math.sin(p0)*radius, y1 = yTop + Math.sin(p1)*radius;
    const r0 = Math.cos(p0)*radius,        r1 = Math.cos(p1)*radius;
    for (let i = 0; i < seg; i++) {
      const a0=(i/seg)*Math.PI*2, a1=((i+1)/seg)*Math.PI*2;
      verts.push(Math.cos(a0)*r0,y0,Math.sin(a0)*r0,  Math.cos(a1)*r0,y0,Math.sin(a1)*r0,  Math.cos(a1)*r1,y1,Math.sin(a1)*r1);
      verts.push(Math.cos(a0)*r0,y0,Math.sin(a0)*r0,  Math.cos(a1)*r1,y1,Math.sin(a1)*r1,  Math.cos(a0)*r1,y1,Math.sin(a0)*r1);
    }
  }
  // Bottom hemisphere (phi: 0 → π/2 going downward)
  for (let ring = 0; ring < hSeg; ring++) {
    const p0 = (ring/hSeg)*(Math.PI/2), p1 = ((ring+1)/hSeg)*(Math.PI/2);
    const y0 = yBot - Math.sin(p0)*radius, y1 = yBot - Math.sin(p1)*radius;
    const r0 = Math.cos(p0)*radius,        r1 = Math.cos(p1)*radius;
    for (let i = 0; i < seg; i++) {
      const a0=(i/seg)*Math.PI*2, a1=((i+1)/seg)*Math.PI*2;
      verts.push(Math.cos(a0)*r0,y0,Math.sin(a0)*r0,  Math.cos(a1)*r1,y1,Math.sin(a1)*r1,  Math.cos(a1)*r0,y0,Math.sin(a1)*r0);
      verts.push(Math.cos(a0)*r0,y0,Math.sin(a0)*r0,  Math.cos(a0)*r1,y1,Math.sin(a0)*r1,  Math.cos(a1)*r1,y1,Math.sin(a1)*r1);
    }
  }
  return verts;
}

/** 1 world unit = 1 centimetre. All scene distances, heights, spans in cm. */
const CM = 100;

export const CityScaleWebGL: React.FC<CityScaleWebGLProps> = ({
  centerLat,
  centerLng,
  heightMapUrl: propHeightMapUrl,
  topoMapUrl: propTopoMapUrl,
  layers = {
    particles: true, streets: true, buildings: true,
    topography: true, vegetation: true, terrain: true,
    satellite: true, aiStructural: true, polygons: true,
    bridges: true, paving: true, residential: true,
    semantic: false,
  },
  simData = {
    type: 'FLOOD',
    waterLevel: 0,
    intensity: 50,
    duration: 60,
    pressure: 1013,
    precipitation: 0,
    resolution: 128,
    urbanDensity: 50
  },
  topoScale = 100.0,
  topoOffset = 0.0,
  lightAngle = 45.0,
  lightIntensity = 1.0,
  particleIntensity = 1.0,
  areaScale = 200.0,
  buildingOffsetX = 0,
  buildingOffsetY = 0,
  resultData,
  blueprint,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);

  // Resolve bbox from result data or build a default from center coordinates
  const bbox = resultData?.bbox || [
    centerLat - 0.025, centerLng - 0.025,
    centerLat + 0.025, centerLng + 0.025
  ];

  // Centimetre coordinate system: 1 world unit = 1 cm (100× more terrain detail)
  const latMid = (bbox[0] + bbox[2]) / 2;
  const cosLat = Math.cos(latMid * Math.PI / 180);
  const centerLatVal = (bbox[0] + bbox[2]) / 2;
  const centerLngVal = (bbox[1] + bbox[3]) / 2;
  const worldSpanX = (bbox[3] - bbox[1]) * 111139 * cosLat * CM; // cm E-W
  const worldSpanZ = (bbox[2] - bbox[0]) * 111139 * CM;           // cm N-S
  const areaHalfX = worldSpanX / 2;
  const areaHalfZ = worldSpanZ / 2;

  // mapPos returns [x_cm, z_cm] from city centre (world units = centimetres)
  const mapPos = useMemo(() => {
    return (lat: number, lng: number): [number, number] => [
      (lng - centerLngVal) * 111139 * cosLat * CM + (buildingOffsetX || 0),
      (lat - centerLatVal) * 111139 * CM          + (buildingOffsetY || 0)
    ];
  }, [centerLatVal, centerLngVal, cosLat, buildingOffsetX, buildingOffsetY]);

  const dynamicHeightmap = `/api/v1/terrain/heightmap?north=${bbox[2]}&south=${bbox[0]}&east=${bbox[3]}&west=${bbox[1]}`;
  const dynamicSatellite = `/api/v1/terrain/satellite?north=${bbox[2]}&south=${bbox[0]}&east=${bbox[3]}&west=${bbox[1]}`;

  const heightMapUrl = propHeightMapUrl || dynamicHeightmap;
  const topoMapUrl   = propTopoMapUrl   || heightMapUrl;
  const satelliteMapUrl = dynamicSatellite;

  const [buildingCount, setBuildingCount] = React.useState(0);
  const [dataReady, setDataReady] = React.useState(false);
  const [satLoaded, setSatLoaded] = React.useState(false);
  const [semanticReady, setSemanticReady] = React.useState(false);
  const [semanticMeta, setSemanticMeta] = React.useState<{
    vegetationPct: number; waterPct: number; buildingPct: number; urbanDensityScore: number;
  } | null>(null);

  const compassBearingRef = useRef(0);
  const [compassBearing, setCompassBearing] = React.useState(0);
  const [showNavHelp, setShowNavHelp] = React.useState(true);
  const [fpModeDisplay, setFpModeDisplay] = React.useState(false);
  const [godModeDisplay, setGodModeDisplay] = React.useState(false);

  const semTerrainCountRef  = useRef(0);
  const semBuildingCountRef = useRef(0);

  // Character + FP camera state (persists across effect re-runs)
  const charPosRef        = useRef<[number, number, number]>([0, 0, 0]);
  const charYawRef        = useRef(0);
  const fpPitchRef        = useRef(0);
  const fpModeRef         = useRef(false);
  const godModeRef        = useRef(false);
  const normalizedGridRef = useRef<number[][]>([]);

  // Extended building AABB with selection metadata
  type BuildingSelectable = {
    minX: number; maxX: number; minZ: number; maxZ: number;
    height: number; levels: number; buildingUse: string;
    lat: number; lng: number; // centroid geographic coords
  };
  const buildingAABBsRef  = useRef<BuildingSelectable[]>([]);

  // Camera matrices — updated every frame for ray picking
  const lastProjRef = useRef<Float32Array>(new Float32Array(16));
  const lastViewRef = useRef<Float32Array>(new Float32Array(16));

  // Selected building
  const [selectedBuilding, setSelectedBuilding] = React.useState<BuildingSelectable | null>(null);
  const selectedBuildingRef = useRef<BuildingSelectable | null>(null);

  /**
   * Raw elevation range (metres) derived from the available DEM data.
   * For blueprint path: uses the tracked min/max from resampleElevation.
   * For resultData path: scans the raw grid values.
   */
  const rawElevRange = useMemo(() => {
    if (blueprint && blueprint.elevationMax > blueprint.elevationMin) {
      return blueprint.elevationMax - blueprint.elevationMin;
    }
    const grid = resultData?.elevationGrid;
    if (grid && grid.length > 0) {
      let mn = Infinity, mx = -Infinity;
      for (const row of grid) for (const v of row) { if (v < mn) mn = v; if (v > mx) mx = v; }
      if (mx > mn) return mx - mn;
    }
    // Fallback: typical urban terrain range ~80m
    return Math.max(worldSpanX, worldSpanZ) * 0.015;
  }, [blueprint, resultData, worldSpanX, worldSpanZ]);

  /**
   * Effective topo scale in world metres.
   * topoScale slider (10–500) maps to exaggeration percentage: 100 = 1× real scale.
   * effectiveTopoScale = rawElevRange × (topoScale / 100)
   * At 100%: terrain displacement exactly matches real-world elevation differences.
   */
  const effectiveTopoScale = useMemo(() => {
    const exaggeration = Math.max(0.05, topoScale / 100);
    return rawElevRange * CM * exaggeration; // cm
  }, [rawElevRange, topoScale]);

  const lightDir = useMemo(() => {
    if (layers?.sunSync) {
      const now = new Date();
      const [az, el] = GISMath.sunPosition(centerLat, centerLng, now);
      return GISMath.sunToLightDir(az, el);
    }
    const rad = (lightAngle * Math.PI) / 180;
    return [Math.sin(rad), 0.7, Math.cos(rad)] as [number, number, number];
  }, [lightAngle, layers?.sunSync, centerLat, centerLng]);

  const layersKey  = useMemo(() => JSON.stringify(layers),  [layers]);
  // simDataRef keeps simData current without triggering scene rebuilds.
  // The render loop reads simDataRef.current on every frame instead of the closure value.
  const simDataRef = useRef(simData);
  useEffect(() => { simDataRef.current = simData; }, [simData]);

  // Camera distance based on city metric scale
  const camDist = Math.max(worldSpanX, worldSpanZ) * 0.75;

  // Camera state — south side of scene, looking north (standard map orientation)
  // yaw=Math.PI → camera at z=-dist (south), facing +Z (north); east(+X) = right ✓
  const cam = useRef({
    pos: [0, camDist * 0.38, -camDist * 0.65] as [number, number, number],
    target: [0, 0, 0] as [number, number, number],
    distance: camDist,
    yaw: Math.PI,
    pitch: -0.52, // ~30° above horizon
    speed: camDist * 0.002,
    keys: new Set<string>()
  });

  useEffect(() => {
    // Reset camera when bbox/scale changes
    cam.current.pos      = [0, camDist * 0.38, -camDist * 0.65];
    cam.current.yaw      = Math.PI;
    cam.current.target   = [0, 0, 0];
    cam.current.distance = camDist;
    cam.current.speed    = camDist * 0.002;
  }, [camDist]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      cam.current.keys.add(e.code);
      if (e.code === 'NumpadDecimal' || e.code === 'Period') {
        cam.current.target   = [0, 0, 0];
        cam.current.distance = camDist;
        cam.current.yaw      = Math.PI;
        cam.current.pitch    = -0.52;
      }
      // G — toggle god mode (macro overview, free-fly)
      if (e.code === 'KeyG') {
        godModeRef.current = !godModeRef.current;
        setGodModeDisplay(godModeRef.current);
        // Exit FP when entering god mode
        if (godModeRef.current && fpModeRef.current) document.exitPointerLock();
      }
      // F — toggle first-person mode
      if (e.code === 'KeyF') {
        if (godModeRef.current) { godModeRef.current = false; setGodModeDisplay(false); }
        if (!fpModeRef.current) {
          // Enter FP: face current camera direction, request pointer lock
          charYawRef.current = cam.current.yaw;
          fpPitchRef.current = 0;
          canvasRef.current?.requestPointerLock();
        } else {
          document.exitPointerLock();
        }
      }
      // Escape exits FP mode
      if (e.code === 'Escape' && fpModeRef.current) {
        document.exitPointerLock();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => cam.current.keys.delete(e.code);

    // Pointer lock change — drives fpModeRef and UI state
    const handlePointerLockChange = () => {
      fpModeRef.current = document.pointerLockElement === canvasRef.current;
      setFpModeDisplay(fpModeRef.current);
    };

    let isDragging = false;
    let lastX = 0;
    let lastY = 0;

    // Track drag vs click
    let mouseDownX = 0, mouseDownY = 0;

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true; lastX = e.clientX; lastY = e.clientY;
      mouseDownX = e.clientX; mouseDownY = e.clientY;
      if (e.button === 1) e.preventDefault();
    };
    const handleMouseUp = (e: MouseEvent) => {
      isDragging = false;
      // Distinguish click from drag: < 4px movement
      const moved = Math.abs(e.clientX - mouseDownX) + Math.abs(e.clientY - mouseDownY);
      if (moved < 4 && e.button === 0 && canvasRef.current && !fpModeRef.current) {
        const canvas = canvasRef.current;
        const rect   = canvas.getBoundingClientRect();
        const scaleX = canvas.width  / rect.width;
        const scaleY = canvas.height / rect.height;
        const px = (e.clientX - rect.left) * scaleX;
        const py = (e.clientY - rect.top)  * scaleY;
        const ndcX =  (px / canvas.width)  * 2 - 1;
        const ndcY = -(py / canvas.height) * 2 + 1;

        const proj = lastProjRef.current;
        const view = lastViewRef.current;
        if (!proj || !view) return;

        const viewProj = GISMath.multiply(proj, view);
        const invVP    = GISMath.invertMat4(viewProj);

        // Unproject near / far points
        const unproject = (nx: number, ny: number, nz: number): [number,number,number] => {
          const w = invVP[3]*nx + invVP[7]*ny + invVP[11]*nz + invVP[15];
          return [
            (invVP[0]*nx + invVP[4]*ny + invVP[8]*nz  + invVP[12]) / w,
            (invVP[1]*nx + invVP[5]*ny + invVP[9]*nz  + invVP[13]) / w,
            (invVP[2]*nx + invVP[6]*ny + invVP[10]*nz + invVP[14]) / w,
          ];
        };

        const near = unproject(ndcX, ndcY, -1);
        const far  = unproject(ndcX, ndcY,  1);
        const dir  = GISMath.normalize(GISMath.subtract(far, near)) as [number,number,number];
        const ro   = near;

        // Ray-AABB slab test (XYZ)
        let minDist = Infinity;
        let best: (typeof buildingAABBsRef.current)[0] | null = null;

        for (const aabb of buildingAABBsRef.current) {
          const hMax = aabb.height + 20; // generous Y ceiling
          const tX0 = (aabb.minX - ro[0]) / dir[0];
          const tX1 = (aabb.maxX - ro[0]) / dir[0];
          const tY0 = (0         - ro[1]) / dir[1];
          const tY1 = (hMax      - ro[1]) / dir[1];
          const tZ0 = (aabb.minZ - ro[2]) / dir[2];
          const tZ1 = (aabb.maxZ - ro[2]) / dir[2];
          const tMin = Math.max(Math.min(tX0,tX1), Math.min(tY0,tY1), Math.min(tZ0,tZ1));
          const tMax = Math.min(Math.max(tX0,tX1), Math.max(tY0,tY1), Math.max(tZ0,tZ1));
          if (tMax >= 0 && tMin <= tMax && tMin < minDist) {
            minDist = tMin;
            best = aabb;
          }
        }

        if (best) {
          selectedBuildingRef.current = best;
          setSelectedBuilding(best);
        } else {
          selectedBuildingRef.current = null;
          setSelectedBuilding(null);
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      // FP mode: pointer-lock mouse look
      if (fpModeRef.current) {
        charYawRef.current += e.movementX * 0.003;
        fpPitchRef.current  = Math.max(-1.3, Math.min(1.3, fpPitchRef.current - e.movementY * 0.003));
        return;
      }
      if (!isDragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;

      if (e.shiftKey) {
        const fwd   = GISMath.normalize(GISMath.subtract(cam.current.target, cam.current.pos));
        const right = GISMath.normalize(GISMath.cross([0, 1, 0], fwd));
        const up    = GISMath.normalize(GISMath.cross(fwd, right));
        const f     = cam.current.distance * 0.001;
        cam.current.target = GISMath.add(
          cam.current.target,
          GISMath.add(GISMath.scale(right, -dx * f), GISMath.scale(up, dy * f))
        ) as [number, number, number];
      } else {
        cam.current.yaw  -= dx * 0.005;
        cam.current.pitch = Math.max(-1.5, Math.min(1.5, cam.current.pitch - dy * 0.005));
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (fpModeRef.current) return; // disable zoom in FP mode
      cam.current.distance = Math.max(50, Math.min(200000, cam.current.distance + e.deltaY * (cam.current.distance * 0.001)));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp as EventListener);
    window.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('pointerlockchange', handlePointerLockChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp as EventListener);
      window.removeEventListener('wheel', handleWheel);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
    };
  }, [camDist]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const renderer = new WebGLRenderer(canvasRef.current);
    rendererRef.current = renderer;

    const gl = renderer.getContext();
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Shader programs
    const terrainProgram   = renderer.createProgram(CITY_TERRAIN_VS,   CITY_TERRAIN_FS);
    const infraProgram     = renderer.createProgram(INFRASTRUCTURE_VS,  INFRASTRUCTURE_FS);
    const vegProgram       = renderer.createProgram(VEGETATION_VS,      VEGETATION_FS);
    const grassProgram     = renderer.createProgram(GRASS_VS,           GRASS_FS);
    const waterProgram     = renderer.createProgram(WATER_VS,           WATER_FS);
    const particleProgram  = renderer.createProgram(PARTICLE_VS,        PARTICLE_FS);
    const skyProgram       = renderer.createProgram(SKY_VS,             SKY_FS);
    const precipProgram    = renderer.createProgram(PRECIP_VS,          PRECIP_FS);
    const fogProgram       = renderer.createProgram(FOG_VS,             FOG_FS);
    const waterwayProgram  = renderer.createProgram(WATERWAY_VS,        WATERWAY_FS);
    const roadProgram      = renderer.createProgram(ROAD_VS,            ROAD_FS);
    const waterAreaProgram = renderer.createProgram(WATER_AREA_VS,      WATER_AREA_FS);
    const semanticProgram  = renderer.createProgram(SEMANTIC_VS,        SEMANTIC_FS);
    const slopeProgram     = renderer.createProgram(ENGINEERING_SHADERS.SLOPE.VS, ENGINEERING_SHADERS.SLOPE.FS);
    const densityProgram   = renderer.createProgram(ENGINEERING_SHADERS.DENSITY.VS, ENGINEERING_SHADERS.DENSITY.FS);
    const charShaderProg   = renderer.createProgram(CHARACTER_VS, CHARACTER_FS);
    const zoneProgram      = renderer.createProgram(ZONE_VS,      ZONE_FS);
    const amenityProgram   = renderer.createProgram(AMENITY_VS,   AMENITY_FS);
    const fireProgram      = renderer.createProgram(FIRE_VS,      FIRE_FS);

    const identityMatrix = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);

    // ── TERRAIN GEOMETRY (metric coordinates) ────────────────────────────────
    // Grid resolution: 4× DEM resolution for smooth interpolated curves, min 512, max 1024.
    // WebGL2 Uint32Array IBO supports up to 4 billion indices — no practical limit.
    // At 1024×1024: ~2M triangles, ~33MB VBO + ~25MB IBO — fine on any modern GPU.
    const demRows = blueprint?.elevation?.length ?? resultData?.elevationGrid?.length ?? 0;
    const demCols = blueprint?.elevation?.[0]?.length ?? resultData?.elevationGrid?.[0]?.length ?? 0;
    const gridSize = demRows > 0 && demCols > 0
      ? Math.min(2048, Math.max(512, demRows * 4, demCols * 4))
      : 512;
    const terrainVertices: number[] = [];
    const terrainIndices: number[]  = [];

    for (let z = 0; z <= gridSize; z++) {
      for (let x = 0; x <= gridSize; x++) {
        const xPos = (x / gridSize) * worldSpanX - areaHalfX;
        const zPos = (z / gridSize) * worldSpanZ - areaHalfZ;
        terrainVertices.push(xPos, 0, zPos, 0, 1, 0, x / gridSize, z / gridSize);
      }
    }
    for (let z = 0; z < gridSize; z++) {
      for (let x = 0; x < gridSize; x++) {
        const i = z * (gridSize + 1) + x;
        terrainIndices.push(i, i + 1, i + gridSize + 1);
        terrainIndices.push(i + 1, i + gridSize + 2, i + gridSize + 1);
      }
    }

    const terrainVBO = renderer.createBuffer(new Float32Array(terrainVertices));
    // Uint32Array IBO: supports grids up to 65535×65535 (WebGL2 OES_element_index_uint is core)
    const terrainIBO = renderer.createBuffer(new Uint32Array(terrainIndices), gl.ELEMENT_ARRAY_BUFFER);

    // ── ROAD WIDTHS (metres) ─ data-driven from OSM lanes tag ────────────────
    // Default widths used only when OSM half_width_m tag is absent
    const roadWidths: Record<string, number> = {
      motorway: 1400, trunk: 1050, motorway_link: 525, trunk_link: 525,
      primary: 700, primary_link: 350, secondary: 700, secondary_link: 350,
      tertiary: 350, tertiary_link: 262.5, residential: 350, living_street: 350,
      service: 300, unclassified: 350, road: 350, footway: 150, path: 100, cycleway: 150,
    };
    // Helper: uses backend-computed half_width_m tag when available, falls back to type defaults
    function getRoadHalfWidth(highway: GISHighway): number {
      const tag = (highway as any).tags?.half_width_m;
      if (tag) {
        const parsed = parseFloat(tag);
        if (!isNaN(parsed) && parsed > 0) return parsed * CM; // tag is in metres, convert to cm
      }
      const t = (highway as any).type ?? 'road';
      return (roadWidths[t] ?? 350);
    }

    const roadColors: Record<string, [number,number,number]> = {
      motorway: [0.90, 0.60, 0.10], trunk: [0.85, 0.55, 0.10],
      primary: [0.90, 0.80, 0.10], secondary: [0.70, 0.70, 0.10],
      tertiary: [0.55, 0.55, 0.55], residential: [0.50, 0.50, 0.50],
      default: [0.40, 0.40, 0.40],
    };

    function getSurfaceColor(surface: string, baseColor: [number,number,number]): [number,number,number] {
      switch (surface) {
        case 'concrete':       return [0.78, 0.78, 0.76];
        case 'paving_stones':  return [0.72, 0.68, 0.62];
        case 'cobblestone':    return [0.60, 0.56, 0.50];
        case 'gravel':         return [0.62, 0.57, 0.45];
        case 'dirt': case 'ground': return [0.52, 0.40, 0.28];
        case 'grass':          return [0.30, 0.52, 0.20];
        case 'wood':           return [0.55, 0.38, 0.20];
        case 'sand':           return [0.78, 0.72, 0.50];
        default:               return baseColor;
      }
    }

    // Terrain cell size: used to subdivide road segments so they closely follow terrain.
    // Each sub-segment samples the heightmap independently → roads conform to curved slopes.
    // Road subdivision density matches terrain mesh cell size
    const terrainCellSize = Math.min(worldSpanX, worldSpanZ) / gridSize;

    // Expand road centre-line to terrain-conforming polygon quads.
    // Long segments are subdivided into chunks ≤ terrainCellSize so each vertex
    // independently samples the heightmap in the vertex shader, preventing roads
    // from sinking below curved terrain between distant vertices.
    function expandToQuads(coords: [number,number][], halfW: number, elevOffset = 0): number[] {
      const v: number[] = [];
      for (let i = 0; i < coords.length - 1; i++) {
        const [x0, z0] = coords[i], [x1, z1] = coords[i + 1];
        const dx = x1 - x0, dz = z1 - z0;
        const len = Math.sqrt(dx * dx + dz * dz);
        if (len < 0.01) continue;
        const px = (-dz / len) * halfW, pz = (dx / len) * halfW;
        // Subdivide segments longer than one terrain cell
        const nSegs = Math.max(1, Math.ceil(len / terrainCellSize));
        for (let s = 0; s < nSegs; s++) {
          const t0 = s / nSegs, t1 = (s + 1) / nSegs;
          const ax0 = x0 + dx * t0, az0 = z0 + dz * t0;
          const ax1 = x0 + dx * t1, az1 = z0 + dz * t1;
          // y slot stores roadU (0=left/+p edge, 1=right/-p edge) for lane marking shader.
          // Height is computed entirely from the topo texture in the vertex shader.
          v.push(
            ax0 + px, 0.0, az0 + pz,   // left  start
            ax0 - px, 1.0, az0 - pz,   // right start
            ax1 - px, 1.0, az1 - pz,   // right end
            ax0 + px, 0.0, az0 + pz,   // left  start
            ax1 - px, 1.0, az1 - pz,   // right end
            ax1 + px, 0.0, az1 + pz,   // left  end
          );
        }
      }
      return v;
    }

    // Build road vertex buffers grouped by type for colour-coded rendering
    type RoadGroup = { vertices: number[]; color: [number,number,number]; markings: boolean };
    const roadGroups: RoadGroup[] = [];
    const markedRoadTypes = new Set(['motorway','trunk','primary','secondary','tertiary']);

    const osmHighways = blueprint?.osm.highways ?? resultData?.urbanFeatures?.highways;
    const osmBuildings = blueprint?.osm.buildings ?? resultData?.urbanFeatures?.buildings;
    const osmWaterways = blueprint?.osm.waterways ?? resultData?.urbanFeatures?.waterways;
    const osmWaterAreas = blueprint?.osm.waterAreas ?? resultData?.urbanFeatures?.waterAreas;

    if (osmHighways) {
      const byType: Record<string, { vertices: number[]; color: [number,number,number]; markings: boolean }> = {};
      osmHighways.forEach((h: GISHighway & { type?: string }) => {
        const roadType = (h as { type?: string }).type || 'road';
        const halfW = getRoadHalfWidth(h);
        const coords = h.coordinates.map(c => mapPos(c[0], c[1]));
        const verts  = expandToQuads(coords, halfW);
        if (!verts.length) return;
        const surfaceTag    = (h as any).tags?.surface ?? '';
        const baseColor     = roadColors[roadType] || roadColors['default'];
        const appliedColor  = getSurfaceColor(surfaceTag, baseColor);
        const groupKey = surfaceTag && surfaceTag !== 'asphalt' ? `${roadType}:${surfaceTag}` : roadType;
        if (!byType[groupKey]) {
          byType[groupKey] = { vertices: [], color: appliedColor, markings: markedRoadTypes.has(roadType) };
        }
        byType[groupKey].vertices.push(...verts);
      });
      for (const entry of Object.values(byType)) roadGroups.push(entry);
    }

    // Procedural road grid fallback
    const fallbackRoadVertices: number[] = [];
    if (roadGroups.length === 0) {
      const roadGrid = 8;
      for (let i = 0; i <= roadGrid; i++) {
        const pos = (i / roadGrid) * worldSpanX - areaHalfX;
        fallbackRoadVertices.push(...expandToQuads([[pos, -areaHalfZ], [pos, areaHalfZ]], 4 * CM));
        const posZ = (i / roadGrid) * worldSpanZ - areaHalfZ;
        fallbackRoadVertices.push(...expandToQuads([[-areaHalfX, posZ], [areaHalfX, posZ]], 4 * CM));
      }
    }
    const fallbackRoadVBO = renderer.createBuffer(new Float32Array(fallbackRoadVertices.length ? fallbackRoadVertices : [0,0,0]));

    // ── HYDROLOGICAL ANALYSIS (D8 flow accumulation + satellite water cells) ──
    // Run once per scene build; uses blueprint elevation + semantic cells.
    // Falls back gracefully to empty result when data is absent.
    const elevGridForHydro = blueprint?.elevation ?? [];
    const semanticCellsForHydro = blueprint?.semantic?.cells ?? [];
    const hydroResult = HydrologicalAnalyzer.analyze(
      elevGridForHydro,
      semanticCellsForHydro,
      worldSpanX,
      worldSpanZ,
      0.04, // 4% drainage area threshold for stream channels
    );

    // ── WATERWAYS (OSM lines + D8-derived stream channels) ───────────────────
    const waterwayVertices: number[] = [];
    // OSM named waterways (authoritative for real rivers)
    if (osmWaterways) {
      osmWaterways.forEach((w: GISWaterway) => {
        w.coordinates.forEach((c, idx) => {
          const [x, z] = mapPos(c[0], c[1]);
          waterwayVertices.push(x, 0, z);
          if (idx > 0 && idx < w.coordinates.length - 1) waterwayVertices.push(x, 0, z);
        });
      });
    }
    // Topography-derived stream channels (D8 flow accumulation)
    for (const poly of hydroResult.streamPolylines) {
      for (let i = 0; i < poly.length; i++) {
        const [wx, wz] = poly[i];
        waterwayVertices.push(wx, 0, wz);
        // Duplicate interior vertices for line-strip continuity
        if (i > 0 && i < poly.length - 1) waterwayVertices.push(wx, 0, wz);
      }
    }
    const waterwayVBO = renderer.createBuffer(new Float32Array(waterwayVertices.length ? waterwayVertices : [0,0,0]));

    // ── WATER AREAS (polygon triangulation) ──────────────────────────────────
    function triangulateFan(pts: [number,number][]): number[] {
      const v: number[] = [];
      if (pts.length < 3) return v;
      const [x0, z0] = pts[0];
      for (let i = 1; i < pts.length - 1; i++) {
        v.push(x0, 0, z0, pts[i][0], 0, pts[i][1], pts[i + 1][0], 0, pts[i + 1][1]);
      }
      return v;
    }

    const waterAreaVertices: number[] = [];
    // OSM polygon water bodies (lakes, reservoirs, ponds)
    if (osmWaterAreas) {
      for (const w of osmWaterAreas as GISWaterArea[]) {
        const pts = w.coordinates.map(c => mapPos(c[0], c[1]));
        waterAreaVertices.push(...triangulateFan(pts));
      }
    }
    // Satellite-detected water cells (SemanticClass.WATER from image analysis)
    // Each water cell is a quad → 2 triangles added to the same water-area buffer.
    for (const [x0, z0, x1, z1] of hydroResult.waterCellQuads) {
      waterAreaVertices.push(
        x0, 0, z0,  x1, 0, z0,  x1, 0, z1,  // triangle 1
        x0, 0, z0,  x1, 0, z1,  x0, 0, z1,  // triangle 2
      );
    }
    const waterAreaVBO = renderer.createBuffer(new Float32Array(waterAreaVertices.length ? waterAreaVertices : [0,0,0]));

    // ── NATURAL AREAS + LAND-USE ZONES (ZONE shader) ─────────────────────────
    // typeId table — natural features 0-7, land-use 8-14, leisure sports 15
    const NATURAL_TYPE_ID: Record<string, number> = {
      scrub: 0, heath: 1, grassland: 2, wetland: 3,
      sand: 4, beach: 4, bare_rock: 5, cliff: 5,
      farmland: 6, allotments: 6, vineyard: 7, orchard: 7,
    };
    const LANDUSE_TYPE_ID: Record<string, number> = {
      residential: 8, commercial: 9, industrial: 10, retail: 11,
      cemetery: 12, construction: 13, military: 14,
      leisure_sports_centre: 15, leisure_pitch: 15, leisure_stadium: 15,
    };
    const AMENITY_TYPE_ID: Record<string, number> = {
      hospital: 0, clinic: 0, school: 1, university: 1, college: 1,
      fire_station: 2, police: 3, shelter: 4,
      pharmacy: 5, post_office: 6, townhall: 7,
    };

    // Triangulate a polygon with a fixed typeId stored in the vertex y slot
    function triangulateFanZoned(pts: [number, number][], typeId: number): number[] {
      const v: number[] = [];
      if (pts.length < 3) return v;
      const [x0, z0] = pts[0];
      for (let i = 1; i < pts.length - 1; i++) {
        v.push(x0, typeId, z0, pts[i][0], typeId, pts[i][1], pts[i+1][0], typeId, pts[i+1][1]);
      }
      return v;
    }

    const osmNaturalAreas    = ((blueprint?.osm as any)?.naturalAreas    ?? resultData?.urbanFeatures?.naturalAreas)    as GISNaturalArea[] | undefined;
    const osmLandUseZones    = ((blueprint?.osm as any)?.landUseZones    ?? resultData?.urbanFeatures?.landUseZones)    as GISLandUseZone[] | undefined;
    const osmAmenities       = ((blueprint?.osm as any)?.amenities       ?? resultData?.urbanFeatures?.amenities)       as GISAmenity[]     | undefined;
    const osmPedestrianAreas = ((blueprint?.osm as any)?.pedestrianAreas ?? resultData?.urbanFeatures?.pedestrianAreas) as GISNaturalArea[] | undefined;
    const osmParkingLots     = ((blueprint?.osm as any)?.parkingLots     ?? resultData?.urbanFeatures?.parkingLots)     as GISNaturalArea[] | undefined;
    const osmTrees           = ((blueprint?.osm as any)?.trees           ?? resultData?.urbanFeatures?.trees)           as GISAmenity[]     | undefined;
    const osmBarriers        = ((blueprint?.osm as any)?.barriers        ?? resultData?.urbanFeatures?.barriers)        as GISHighway[]     | undefined;

    const zoneVertices: number[] = [];
    if (osmNaturalAreas) {
      for (const na of osmNaturalAreas as GISNaturalArea[]) {
        if (!na.coordinates || na.coordinates.length < 3) continue;
        const pts = na.coordinates.map(c => mapPos(c[0], c[1]));
        const tid = NATURAL_TYPE_ID[na.type] ?? 6;
        zoneVertices.push(...triangulateFanZoned(pts, tid));
      }
    }
    if (osmLandUseZones) {
      for (const lz of osmLandUseZones as GISLandUseZone[]) {
        if (!lz.coordinates || lz.coordinates.length < 3) continue;
        const pts = lz.coordinates.map(c => mapPos(c[0], c[1]));
        const tid = LANDUSE_TYPE_ID[lz.type] ?? 8;
        zoneVertices.push(...triangulateFanZoned(pts, tid));
      }
    }
    // Pedestrian areas (plazas, squares) — typeId 16
    if (osmPedestrianAreas) {
      for (const pa of osmPedestrianAreas as GISNaturalArea[]) {
        if (!pa.coordinates || pa.coordinates.length < 3) continue;
        const pts = pa.coordinates.map(c => mapPos(c[0], c[1]));
        zoneVertices.push(...triangulateFanZoned(pts, 16));
      }
    }
    // Parking lots — typeId 17
    if (osmParkingLots) {
      for (const pk of osmParkingLots as GISNaturalArea[]) {
        if (!pk.coordinates || pk.coordinates.length < 3) continue;
        const pts = pk.coordinates.map(c => mapPos(c[0], c[1]));
        zoneVertices.push(...triangulateFanZoned(pts, 17));
      }
    }
    const zoneVBO = renderer.createBuffer(new Float32Array(zoneVertices.length ? zoneVertices : [0, 0, 0]));
    const zoneVertCount = zoneVertices.length / 3;

    // ── AMENITY POINT SPRITES ──────────────────────────────────────────────────
    // Vertex layout: [worldX, worldZ, typeId]  (worldZ in the y slot)
    const amenityVertices: number[] = [];
    if (osmAmenities) {
      for (const am of osmAmenities as GISAmenity[]) {
        if (!am.coordinates || am.coordinates.length < 1) continue;
        const [x, z] = mapPos(am.coordinates[0][0], am.coordinates[0][1]);
        amenityVertices.push(x, z, AMENITY_TYPE_ID[am.type] ?? 8);
      }
    }
    const amenityVBO = renderer.createBuffer(new Float32Array(amenityVertices.length ? amenityVertices : [0, 0, 0]));
    const amenityVertCount = amenityVertices.length / 3;

    // ── VEGETATION POINTS — satellite-driven placement ────────────────────────
    //
    // Primary source: satellite semantic grid (SemanticClass.VEGETATION cells).
    // Trees are scattered *only* inside cells classified as vegetation by the
    // satellite image analysis, giving realistic coverage tied to real land use.
    //
    // Fallback: when semantic data is absent (empty grid), individual OSM tree
    // nodes and a moderate scatter within OSM natural-area polygons are used.
    //
    // Vertex layout: [x, 0, z, nx, ny, nz, u, v]  (8 floats, VEGETATION shader)
    const osmVegVertices: number[] = [];

    const semCells  = blueprint?.semantic?.cells ?? [];
    const semRows   = blueprint?.semantic?.rows  ?? 0;
    const semCols   = blueprint?.semantic?.cols  ?? 0;
    const hasSemGrid = semRows > 0 && semCols > 0 && semCells.length > 0;

    if (hasSemGrid) {
      // ── Satellite-classified vegetation cells ─────────────────────────────
      // Each VEGETATION cell scatters trees proportional to NDVI intensity.
      // Max 6 trees per cell keeps vertex count manageable across large scenes.
      const cellW = worldSpanX / semCols;
      const cellH = worldSpanZ / semRows;
      const MAX_TREES_PER_CELL = 6;

      for (let r = 0; r < semRows; r++) {
        for (let c = 0; c < semCols; c++) {
          const cell = semCells[r]?.[c];
          if (!cell || cell.class !== SemanticClass.VEGETATION || cell.intensity < 0.12) continue;

          const cx = ((c + 0.5) / semCols - 0.5) * worldSpanX;
          const cz = ((r + 0.5) / semRows - 0.5) * worldSpanZ;

          // Scale count by intensity (sparse scrub → dense forest)
          const nTrees = Math.max(1, Math.round(cell.intensity * MAX_TREES_PER_CELL));
          for (let t = 0; t < nTrees; t++) {
            const px = cx + (Math.random() - 0.5) * cellW * 0.88;
            const pz = cz + (Math.random() - 0.5) * cellH * 0.88;
            const u  = Math.max(0, Math.min(1, (px + areaHalfX) / worldSpanX));
            const v  = Math.max(0, Math.min(1, (pz + areaHalfZ) / worldSpanZ));
            osmVegVertices.push(px, 0, pz, 0, 1, 0, u, v);
          }
        }
      }

      // Individual OSM tree nodes are still respected even when using the semantic grid
      if (osmTrees) {
        for (const tree of osmTrees as GISAmenity[]) {
          if (!tree.coordinates || tree.coordinates.length < 1) continue;
          const [tx, tz] = mapPos(tree.coordinates[0][0], tree.coordinates[0][1]);
          const u = Math.max(0, Math.min(1, (tx + areaHalfX) / worldSpanX));
          const v = Math.max(0, Math.min(1, (tz + areaHalfZ) / worldSpanZ));
          osmVegVertices.push(tx, 0, tz, 0, 1, 0, u, v);
        }
      }
    } else {
      // ── Fallback: OSM natural-area polygon scatter + individual tree nodes ─
      // Used when satellite semantic grid is not yet available.

      // Point-in-polygon (ray-casting) for polygon containment test
      function pointInPoly(pts: [number,number][], px: number, pz: number): boolean {
        let inside = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          if ((pts[i][1] > pz) !== (pts[j][1] > pz) &&
              px < (pts[j][0] - pts[i][0]) * (pz - pts[i][1]) / (pts[j][1] - pts[i][1]) + pts[i][0])
            inside = !inside;
        }
        return inside;
      }

      const VEG_TYPES = new Set(['scrub','heath','grassland','wetland','farmland','allotments','orchard','vineyard']);
      const vegPointDensity = 0.0025 / (CM * CM); // 0.0025 points/m²

      if (osmNaturalAreas) {
        for (const na of osmNaturalAreas as GISNaturalArea[]) {
          if (!na.coordinates || na.coordinates.length < 3) continue;
          if (!VEG_TYPES.has(na.type)) continue;
          const pts = na.coordinates.map(c => mapPos(c[0], c[1]));
          let mnX = Infinity, mxX = -Infinity, mnZ = Infinity, mxZ = -Infinity;
          for (const [x, z] of pts) {
            mnX = Math.min(mnX, x); mxX = Math.max(mxX, x);
            mnZ = Math.min(mnZ, z); mxZ = Math.max(mxZ, z);
          }
          const bw = mxX - mnX, bh_ = mxZ - mnZ;
          const nPoints = Math.min(3000, Math.round(bw * bh_ * vegPointDensity));
          for (let i = 0; i < nPoints; i++) {
            const px = mnX + Math.random() * bw;
            const pz = mnZ + Math.random() * bh_;
            if (!pointInPoly(pts, px, pz)) continue;
            const u = Math.max(0, Math.min(1, (px + areaHalfX) / worldSpanX));
            const v = Math.max(0, Math.min(1, (pz + areaHalfZ) / worldSpanZ));
            osmVegVertices.push(px, 0, pz, 0, 1, 0, u, v);
          }
        }
      }

      if (osmTrees) {
        for (const tree of osmTrees as GISAmenity[]) {
          if (!tree.coordinates || tree.coordinates.length < 1) continue;
          const [tx, tz] = mapPos(tree.coordinates[0][0], tree.coordinates[0][1]);
          const u = Math.max(0, Math.min(1, (tx + areaHalfX) / worldSpanX));
          const v = Math.max(0, Math.min(1, (tz + areaHalfZ) / worldSpanZ));
          osmVegVertices.push(tx, 0, tz, 0, 1, 0, u, v);
          for (let k = 0; k < 3; k++) {
            const angle = (k / 3) * Math.PI * 2;
            const jx = tx + Math.cos(angle) * 200;
            const jz = tz + Math.sin(angle) * 200;
            const ju = Math.max(0, Math.min(1, (jx + areaHalfX) / worldSpanX));
            const jv = Math.max(0, Math.min(1, (jz + areaHalfZ) / worldSpanZ));
            osmVegVertices.push(jx, 0, jz, 0, 1, 0, ju, jv);
          }
        }
      }
    }

    const osmVegVBO   = renderer.createBuffer(new Float32Array(osmVegVertices.length ? osmVegVertices : [0,0,0,0,1,0,0,0]));
    const osmVegCount = osmVegVertices.length / 8;

    // ── BARRIERS (walls, fences, hedges — thin extruded line strips) ──────────
    // osmBarriers is declared above (line ~813); safe to use here
    const barrierVertices: number[] = [];
    if (osmBarriers) {
      for (const b of osmBarriers as GISHighway[]) {
        if (!b.coordinates || b.coordinates.length < 2) continue;
        const coords = b.coordinates.map(c => mapPos(c[0], c[1]));
        const hw = ((b as any).type === 'wall' || (b as any).type === 'retaining_wall') ? 30
                 : (b as any).type === 'hedge' ? 50
                 : 10;
        barrierVertices.push(...expandToQuads(coords, hw));
      }
    }
    const barrierVBO = renderer.createBuffer(new Float32Array(barrierVertices.length ? barrierVertices : [0,0,0]));

    // ── BUILDINGS ─────────────────────────────────────────────────────────────
    // 1 world unit = 1 cm — heights in cm
    const buildHScale = 3.5 * CM; // 350 cm = 3.5 m per floor
    const maxLevels   = 80;
    const buildingVertices: number[] = [];

    const triangulateAndExtrude = (b: GISBuilding) => {
      const coords = b.coordinates;
      if (!coords || coords.length < 3) return;

      const pts    = coords.map(c => mapPos(c[0], c[1]));
      const levels = Math.min(maxLevels, b.levels || 2);

      // Use OSM height tag (metres → cm) or estimate from levels
      const buildHeight = (b.height && b.height > 0) ? b.height * CM : (levels * buildHScale);
      const nh = Math.max(buildHScale, buildHeight);
      const n  = pts.length;

      // Centroid UV — all vertices of this building sample terrain at the same point.
      // This gives a flat, slope-aligned base rather than each corner floating at a
      // different height on inclined terrain.
      const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
      const cz = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      const cu = Math.max(0, Math.min(1, (cx + areaHalfX) / worldSpanX));
      const cv = Math.max(0, Math.min(1, (cz + areaHalfZ) / worldSpanZ));

      // Walls — 7 floats: [x, z, hOffset, is_top, levels, centroidU, centroidV]
      for (let i = 0; i < n - 1; i++) {
        const p1 = pts[i];
        const p2 = pts[i + 1];
        buildingVertices.push(p1[0], p1[1], 0,  0, levels, cu, cv);
        buildingVertices.push(p2[0], p2[1], 0,  0, levels, cu, cv);
        buildingVertices.push(p2[0], p2[1], nh, 1, levels, cu, cv);
        buildingVertices.push(p1[0], p1[1], 0,  0, levels, cu, cv);
        buildingVertices.push(p2[0], p2[1], nh, 1, levels, cu, cv);
        buildingVertices.push(p1[0], p1[1], nh, 1, levels, cu, cv);
      }

      // Roof (fan triangulation from first vertex)
      const p0 = pts[0];
      for (let i = 1; i < n - 1; i++) {
        buildingVertices.push(p0[0],       p0[1],       nh, 1, levels, cu, cv);
        buildingVertices.push(pts[i][0],   pts[i][1],   nh, 1, levels, cu, cv);
        buildingVertices.push(pts[i+1][0], pts[i+1][1], nh, 1, levels, cu, cv);
      }
    };

    if (osmBuildings && osmBuildings.length > 0) {
      osmBuildings.forEach(triangulateAndExtrude);
    } else {
      // Procedural fallback grid — metric scale
      const grid = 16;
      const blockSize = Math.min(worldSpanX, worldSpanZ) / grid;
      for (let gz = 0; gz < grid; gz++) {
        for (let gx = 0; gx < grid; gx++) {
          const noise = Math.abs(Math.sin(gx * 12.98 + gz * 78.23) * 43758.54) % 1.0;
          if (noise > (simData.urbanDensity ?? 50) / 100.0) continue;
          const px  = gx * blockSize - areaHalfX + blockSize * 0.1;
          const pz  = gz * blockSize - areaHalfZ + blockSize * 0.1;
          const sz  = blockSize * 0.7;
          const lv  = 2 + Math.floor(noise * 12);
          const bh  = lv * buildHScale; // cm (buildHScale is already in cm)
          const pts = [[px, pz], [px+sz, pz], [px+sz, pz+sz], [px, pz+sz], [px, pz]];
          const pcu = Math.max(0, Math.min(1, (px + sz/2 + areaHalfX) / worldSpanX));
          const pcv = Math.max(0, Math.min(1, (pz + sz/2 + areaHalfZ) / worldSpanZ));

          for (let i = 0; i < 4; i++) {
            const p1 = pts[i]; const p2 = pts[i + 1];
            buildingVertices.push(p1[0], p1[1], 0,  0, lv, pcu, pcv);
            buildingVertices.push(p2[0], p2[1], 0,  0, lv, pcu, pcv);
            buildingVertices.push(p2[0], p2[1], bh, 1, lv, pcu, pcv);
            buildingVertices.push(p1[0], p1[1], 0,  0, lv, pcu, pcv);
            buildingVertices.push(p2[0], p2[1], bh, 1, lv, pcu, pcv);
            buildingVertices.push(p1[0], p1[1], bh, 1, lv, pcu, pcv);
          }
          // roof
          buildingVertices.push(pts[0][0], pts[0][1], bh, 1, lv, pcu, pcv);
          buildingVertices.push(pts[1][0], pts[1][1], bh, 1, lv, pcu, pcv);
          buildingVertices.push(pts[2][0], pts[2][1], bh, 1, lv, pcu, pcv);
          buildingVertices.push(pts[0][0], pts[0][1], bh, 1, lv, pcu, pcv);
          buildingVertices.push(pts[2][0], pts[2][1], bh, 1, lv, pcu, pcv);
          buildingVertices.push(pts[3][0], pts[3][1], bh, 1, lv, pcu, pcv);
        }
      }
    }

    const buildingVBO = renderer.createBuffer(new Float32Array(buildingVertices));
    const vertexCount = buildingVertices.length / 7;
    setBuildingCount(prev => prev !== vertexCount ? vertexCount : prev);
    setDataReady(!!resultData);

    // Build building AABBs (collision + selection metadata)
    const bAABBs: Array<{minX:number;maxX:number;minZ:number;maxZ:number;height:number;levels:number;buildingUse:string;lat:number;lng:number}> = [];
    if (osmBuildings) {
      for (const b of osmBuildings as GISBuilding[]) {
        if (!b.coordinates || b.coordinates.length < 3) continue;
        const pp = b.coordinates.map(c => mapPos(c[0], c[1]));
        let mnX=Infinity, mxX=-Infinity, mnZ=Infinity, mxZ=-Infinity;
        for (const [x,z] of pp) { mnX=Math.min(mnX,x); mxX=Math.max(mxX,x); mnZ=Math.min(mnZ,z); mxZ=Math.max(mxZ,z); }
        if (mxX > mnX && mxZ > mnZ) {
          const levels = Math.min(80, b.levels || 2);
          const bh = (b.height && b.height > 0) ? b.height * CM : levels * (3.5 * CM);
          // Centroid in geographic coords
          const latc = b.coordinates.reduce((s,c)=>s+c[0],0)/b.coordinates.length;
          const lngc = b.coordinates.reduce((s,c)=>s+c[1],0)/b.coordinates.length;
          bAABBs.push({
            minX:mnX, maxX:mxX, minZ:mnZ, maxZ:mxZ,
            height: Math.max(3.5 * CM, bh), levels,
            buildingUse: (b as any).buildingUse ?? 'residential',
            lat: latc, lng: lngc,
          });
        }
      }
    }
    buildingAABBsRef.current = bAABBs;

    // ── VEGETATION-FILTERED VBO ───────────────────────────────────────────────
    // Remove terrain vertices that fall inside building footprints so trees are
    // never rendered on top of roofs. Each vertex is 8 floats: [x,y,z,nx,ny,nz,u,v].
    const vegFilteredVerts: number[] = [];
    for (let i = 0; i < terrainVertices.length; i += 8) {
      const vx = terrainVertices[i];
      const vz = terrainVertices[i + 2];
      let inside = false;
      for (const aabb of bAABBs) {
        // Add 100 cm margin around each building footprint
        if (vx > aabb.minX - 100 && vx < aabb.maxX + 100 &&
            vz > aabb.minZ - 100 && vz < aabb.maxZ + 100) {
          inside = true; break;
        }
      }
      if (!inside) {
        vegFilteredVerts.push(
          terrainVertices[i], terrainVertices[i+1], terrainVertices[i+2],
          terrainVertices[i+3], terrainVertices[i+4], terrainVertices[i+5],
          terrainVertices[i+6], terrainVertices[i+7],
        );
      }
    }
    const vegFilteredVBO   = renderer.createBuffer(new Float32Array(vegFilteredVerts.length ? vegFilteredVerts : [0,0,0,0,1,0,0,0]));
    const vegFilteredCount = vegFilteredVerts.length / 8;

    // Character capsule: radius 0.22m, total height 1.82m
    const capsuleData   = buildCapsule(22, 182, 10); // 22 cm radius, 182 cm tall
    const charVBO       = renderer.createBuffer(new Float32Array(capsuleData));
    const charVertCount = capsuleData.length / 3;

    // ── SKY QUAD (full-screen NDC quad) ───────────────────────────────────────
    const skyQuadData = new Float32Array([
      -1,-1,  1,-1,  1,1,
      -1,-1,  1, 1, -1,1,
    ]);
    const skyQuadVBO  = renderer.createBuffer(skyQuadData);

    // ── PRECIP SEEDS (static [x_norm, y_phase, z_norm]) ──────────────────────
    const precipCount = 80000;
    const precipData  = new Float32Array(precipCount * 3);
    for (let i = 0; i < precipData.length; i += 3) {
      precipData[i]   = Math.random();   // x_norm  0-1
      precipData[i+1] = Math.random();   // y_phase 0-1  (staggered fall timing)
      precipData[i+2] = Math.random();   // z_norm  0-1
    }
    const precipVBO   = renderer.createBuffer(precipData);

    // Keep legacy particleVBO alias for old pass (tornado only)
    const particleCount = 60000;
    const pData = new Float32Array(particleCount * 3);
    for (let i = 0; i < pData.length; i += 3) {
      pData[i]   = Math.random() * worldSpanX - areaHalfX;
      pData[i+1] = Math.random() * Math.min(worldSpanX, worldSpanZ) * 0.1;
      pData[i+2] = Math.random() * worldSpanZ - areaHalfZ;
    }
    const particleVBO = renderer.createBuffer(pData);

    // ── SEMANTIC VBOs ─────────────────────────────────────────────────────────
    const semTerrainVBO  = renderer.createBuffer(new Float32Array([0,0,0, 0,0, 0,0, 0]));
    const semBuildingVBO = renderer.createBuffer(new Float32Array([0,0,0, 0,0, 0,0, 0]));
    semTerrainCountRef.current  = 0;
    semBuildingCountRef.current = 0;

    let isMounted = true;

    // ── TEXTURES ──────────────────────────────────────────────────────────────
    const createDataTexture = (grid: number[][]): { tex: WebGLTexture; size: number } => {
      const tex = gl.createTexture()!;
      const rows = grid.length;
      const cols = grid[0]?.length ?? 0;
      if (rows === 0 || cols === 0) return { tex, size: 1 };

      let minVal = Infinity, maxVal = -Infinity;
      for (const row of grid) {
        for (const v of row) {
          if (v < minVal) minVal = v;
          if (v > maxVal) maxVal = v;
        }
      }
      const range = Math.max(1, maxVal - minVal);

      const data = new Float32Array(cols * rows);
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++)
          data[y * cols + x] = (grid[y][x] - minVal) / range;

      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, cols, rows, 0, gl.RED, gl.FLOAT, data);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return { tex, size: Math.max(cols, rows) };
    };

    const loadTexture = (url: string): WebGLTexture => {
      const tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([10, 15, 25, 255]));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = url;
      img.onload = () => {
        if (!isMounted) return;
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      };
      return tex;
    };

    const updateTextureFromCanvas = (tex: WebGLTexture, canvas: HTMLCanvasElement) => {
      if (!isMounted) return;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    };

    let topoTexture: WebGLTexture;
    let topoSize = 128;
    // Apply Gaussian blur before texture upload to eliminate false mountains
    // that arise when coarse DEM data is upsampled to a high-resolution mesh.
    const blurRadius = 2;
    if (blueprint?.elevation?.length) {
      const smoothed = smoothGrid(blueprint.elevation as number[][], blurRadius);
      normalizedGridRef.current = smoothed; // already normalized 0-1
      const rows = smoothed.length;
      const cols = smoothed[0]?.length ?? 1;
      const elevData = new Uint8Array(rows * cols);
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
          elevData[r * cols + c] = Math.floor(smoothed[r][c] * 255);
      topoTexture = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, topoTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, cols, rows, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, elevData);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      topoSize = Math.max(cols, rows);
    } else if (resultData?.elevationGrid && resultData.elevationGrid.length > 0) {
      const smoothed = smoothGrid(resultData.elevationGrid as number[][], blurRadius);
      // Compute normalized 0-1 grid for CPU terrain sampling (same as createDataTexture)
      let mn = Infinity, mx = -Infinity;
      for (const row of smoothed) for (const v of row) { if (v < mn) mn = v; if (v > mx) mx = v; }
      const rng = Math.max(1, mx - mn);
      normalizedGridRef.current = smoothed.map(row => row.map(v => (v - mn) / rng));
      const { tex, size } = createDataTexture(smoothed);
      topoTexture = tex;
      topoSize = size;
    } else {
      topoTexture = loadTexture(topoMapUrl);
    }

    // ── SLOPE TEXTURE (Horn algorithm DEM → R8) ─────────────────────────────
    const slopeTexture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, slopeTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 1, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, new Uint8Array([0]));
    const demGrid = blueprint?.elevation ?? resultData?.elevationGrid ?? [];
    if (demGrid.length > 0 && worldSpanX > 0 && worldSpanZ > 0) {
      const slopeFloat = SlopeAnalyzer.compute(demGrid, worldSpanX / CM, worldSpanZ / CM); // metres
      const slopeTex   = SlopeAnalyzer.toTexture(slopeFloat);
      const sCols = demGrid[0]?.length ?? 1;
      const sRows = demGrid.length;
      gl.bindTexture(gl.TEXTURE_2D, slopeTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, sCols, sRows, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, slopeTex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    // ── DENSITY TEXTURE (WorldPop normalized 0-1 → R8) ──────────────────────
    const densityTexture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, densityTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 1, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, new Uint8Array([0]));
    const popGrid = (resultData as any)?.populationDensity;
    if (popGrid?.isAvailable && popGrid.grid?.length) {
      const pRows = popGrid.rows ?? popGrid.grid.length;
      const pCols = popGrid.cols ?? (popGrid.grid[0]?.length ?? 1);
      const popTex = new Uint8Array(pRows * pCols);
      for (let r = 0; r < pRows; r++)
        for (let c = 0; c < pCols; c++)
          popTex[r * pCols + c] = Math.round(Math.min(1, popGrid.grid[r]?.[c] ?? 0) * 255);
      gl.bindTexture(gl.TEXTURE_2D, densityTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, pCols, pRows, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, popTex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    const satelliteTexture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, satelliteTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([15, 20, 30, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Land cover texture from SpectralAnalyzer (classId × 32 per byte, LUMINANCE)
    const landCoverTexture = gl.createTexture()!;
    let landCoverLoaded = false;
    gl.bindTexture(gl.TEXTURE_2D, landCoverTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 1, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, new Uint8Array([0]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const runSemanticFromGrid = (semGrid: import('../../lib/segmentation/SemanticTypes').SemanticGrid) => {
      if (!isMounted) return;
      try {
        const worldScale = Math.max(worldSpanX, worldSpanZ);
        const areaHalf   = Math.max(areaHalfX, areaHalfZ);
        const { terrainVerts, buildingVerts } = SemanticTileProcessor.buildGeometry(
          semGrid, worldScale, areaHalf, CM
        );
        gl.bindBuffer(gl.ARRAY_BUFFER, semTerrainVBO);
        gl.bufferData(gl.ARRAY_BUFFER, terrainVerts, gl.DYNAMIC_DRAW);
        semTerrainCountRef.current = terrainVerts.length / 8;
        gl.bindBuffer(gl.ARRAY_BUFFER, semBuildingVBO);
        gl.bufferData(gl.ARRAY_BUFFER, buildingVerts, gl.DYNAMIC_DRAW);
        semBuildingCountRef.current = buildingVerts.length / 8;
        setSemanticMeta(semGrid.metadata);
        setSemanticReady(true);
      } catch (e) {
        console.warn('[Semantic] Geometry build failed:', e);
      }
    };

    const runSemanticSegmentation = (canvas: HTMLCanvasElement) => {
      if (!isMounted) return;
      try {
        const grid = SemanticTileProcessor.classify(canvas, 16);
        runSemanticFromGrid(grid);
      } catch (e) {
        console.warn('[Semantic] Segmentation failed:', e);
      }
    };

    // LC-augmented geometry VBOs — declared here so render loop closure can always see them
    let lcBuildingVBO: WebGLBuffer | null = null;
    let lcBuildingCount = 0;
    let lcVegVBO: WebGLBuffer | null = null;
    let lcVegCount = 0;
    let lcWaterVBO: WebGLBuffer | null = null;
    let lcWaterCount = 0;

    if (blueprint?.hasSatelliteCanvas) {
      const cachedCanvas = getCachedCanvas();
      if (cachedCanvas) {
        updateTextureFromCanvas(satelliteTexture, cachedCanvas);
        setSatLoaded(true);
      }
      // Use pre-computed semantic grid from blueprint
      runSemanticFromGrid(blueprint.semantic);
    } else {
      // Fetch map tile + DEM via GeoDataPipeline (cached in sessionStorage)
      GeoDataPipeline.fetch(bbox[0], bbox[1], bbox[2], bbox[3], layers.satellite !== false)
        .then(geoData => {
          if (!isMounted) return;
          // Prefer NASA high-res canvas; fall back to map tile canvas
          const satSrc = (geoData as any).nasaCanvas ?? geoData.mapCanvas;
          if (satSrc) {
            updateTextureFromCanvas(satelliteTexture, satSrc);
            setSatLoaded(true);
            runSemanticSegmentation(satSrc);
          } else if (geoData.mapCanvas) {
            updateTextureFromCanvas(satelliteTexture, geoData.mapCanvas);
            setSatLoaded(true);
            runSemanticSegmentation(geoData.mapCanvas);
          }
          // Upload SpectralAnalyzer land cover texture if available
          if ((geoData as any).landCoverTexture && (geoData as any).landCover) {
            const lc = (geoData as any).landCover;
            gl.bindTexture(gl.TEXTURE_2D, landCoverTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, lc.cols, lc.rows, 0,
              gl.LUMINANCE, gl.UNSIGNED_BYTE, (geoData as any).landCoverTexture as Uint8Array);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            landCoverLoaded = true;

            // ── LC-driven procedural fill ──────────────────────────────────────────
            // For every land cover cell not already covered by OSM data,
            // synthesise buildings (urban), vegetation (veg_dense/sparse), water quads.
            const lcData = (geoData as any).landCover as { grid: Uint8Array; rows: number; cols: number };
            const lcGrid2 = lcData.grid;
            const lcRows2 = lcData.rows, lcCols2 = lcData.cols;

            // Mark cells that already have OSM building footprints
            const osmOccupied = new Uint8Array(lcRows2 * lcCols2);
            for (const aabb of buildingAABBsRef.current) {
              const c0 = Math.max(0, Math.floor((aabb.minX + areaHalfX) / worldSpanX * lcCols2));
              const c1 = Math.min(lcCols2 - 1, Math.ceil((aabb.maxX + areaHalfX) / worldSpanX * lcCols2));
              const r0 = Math.max(0, Math.floor((aabb.minZ + areaHalfZ) / worldSpanZ * lcRows2));
              const r1 = Math.min(lcRows2 - 1, Math.ceil((aabb.maxZ + areaHalfZ) / worldSpanZ * lcRows2));
              for (let r = r0; r <= r1; r++)
                for (let c = c0; c <= c1; c++)
                  osmOccupied[r * lcCols2 + c] = 1;
            }
            const hasOsmVeg = osmVegVertices.length > 50;
            const hasOsmWater = waterAreaVertices.length > 0;

            const cellW2 = worldSpanX / lcCols2;
            const cellD2 = worldSpanZ / lcRows2;

            // Deterministic pseudo-noise (stable across frames, no Math.random)
            function cellN(row: number, col: number, salt: number): number {
              const v = Math.sin(row * 127.1 + col * 311.7 + salt * 43758.54) * 43758.54;
              return Math.abs(v - Math.floor(v));
            }

            const lcBuildVerts: number[] = [];
            const lcVegVerts: number[] = [];
            const lcWaterVerts: number[] = [];

            for (let row = 0; row < lcRows2; row++) {
              for (let col = 0; col < lcCols2; col++) {
                const idx = row * lcCols2 + col;
                const cls = Math.round(lcGrid2[idx] / 32); // decode 0-7
                const cx2 = (col + 0.5) / lcCols2 * worldSpanX - areaHalfX;
                const cz2 = (row + 0.5) / lcRows2 * worldSpanZ - areaHalfZ;

                // ── URBAN class → procedural house ─────────────────────────────────
                if (cls === 5 && !osmOccupied[idx]) {
                  const n0 = cellN(row, col, 0);
                  if (n0 > 0.28) { // ~72% fill (some cells are yards/driveways)
                    const bw2 = cellW2 * (0.42 + cellN(row, col, 1) * 0.28);
                    const bd2 = cellD2 * (0.42 + cellN(row, col, 2) * 0.28);
                    const lvls2 = 1 + Math.floor(cellN(row, col, 3) * 2.6); // 1-3 floors
                    const bh2 = lvls2 * buildHScale;
                    const bx2 = cx2 + (cellN(row, col, 4) - 0.5) * cellW2 * 0.22;
                    const bz2 = cz2 + (cellN(row, col, 5) - 0.5) * cellD2 * 0.22;
                    const cu2 = Math.max(0, Math.min(1, (bx2 + areaHalfX) / worldSpanX));
                    const cv2 = Math.max(0, Math.min(1, (bz2 + areaHalfZ) / worldSpanZ));
                    const x0b = bx2 - bw2/2, x1b = bx2 + bw2/2;
                    const z0b = bz2 - bd2/2, z1b = bz2 + bd2/2;
                    // 4 walls (2 tris each)
                    const walls: [number,number,number,number][] = [
                      [x0b,z0b,x1b,z0b],[x1b,z0b,x1b,z1b],[x1b,z1b,x0b,z1b],[x0b,z1b,x0b,z0b],
                    ];
                    for (const [wx0,wz0,wx1,wz1] of walls) {
                      lcBuildVerts.push(wx0,wz0, 0,  0, lvls2, cu2, cv2);
                      lcBuildVerts.push(wx1,wz1, 0,  0, lvls2, cu2, cv2);
                      lcBuildVerts.push(wx1,wz1, bh2, 1, lvls2, cu2, cv2);
                      lcBuildVerts.push(wx0,wz0, 0,  0, lvls2, cu2, cv2);
                      lcBuildVerts.push(wx1,wz1, bh2, 1, lvls2, cu2, cv2);
                      lcBuildVerts.push(wx0,wz0, bh2, 1, lvls2, cu2, cv2);
                    }
                    // Roof (2 tris)
                    lcBuildVerts.push(x0b,z0b, bh2, 1, lvls2, cu2, cv2);
                    lcBuildVerts.push(x1b,z0b, bh2, 1, lvls2, cu2, cv2);
                    lcBuildVerts.push(x1b,z1b, bh2, 1, lvls2, cu2, cv2);
                    lcBuildVerts.push(x0b,z0b, bh2, 1, lvls2, cu2, cv2);
                    lcBuildVerts.push(x1b,z1b, bh2, 1, lvls2, cu2, cv2);
                    lcBuildVerts.push(x0b,z1b, bh2, 1, lvls2, cu2, cv2);
                  }
                }
                // ── VEG_DENSE / VEG_SPARSE → scatter vegetation ─────────────────────
                else if ((cls === 2 || cls === 3) && !hasOsmVeg) {
                  const density = cls === 2 ? 0.72 : 0.42;
                  if (cellN(row, col, 10) < density) {
                    const u2 = Math.max(0, Math.min(1, (cx2 + areaHalfX) / worldSpanX));
                    const v2 = Math.max(0, Math.min(1, (cz2 + areaHalfZ) / worldSpanZ));
                    lcVegVerts.push(cx2, 0, cz2, 0, 1, 0, u2, v2);
                    // Dense forest → 3 extra sub-points within the cell
                    if (cls === 2) {
                      const jitter = cellW2 * 0.33;
                      for (let k = 1; k <= 3; k++) {
                        const jx2 = cx2 + (cellN(row, col, 10+k) - 0.5) * jitter;
                        const jz2 = cz2 + (cellN(row, col, 14+k) - 0.5) * jitter;
                        const ju2 = Math.max(0, Math.min(1, (jx2 + areaHalfX) / worldSpanX));
                        const jv2 = Math.max(0, Math.min(1, (jz2 + areaHalfZ) / worldSpanZ));
                        lcVegVerts.push(jx2, 0, jz2, 0, 1, 0, ju2, jv2);
                      }
                    }
                  }
                }
                // ── WATER → fill missing water areas ────────────────────────────────
                else if (cls === 1 && !hasOsmWater) {
                  const hw2 = cellW2 / 2, hd2 = cellD2 / 2;
                  lcWaterVerts.push(cx2-hw2, 0, cz2-hd2,  cx2+hw2, 0, cz2-hd2,  cx2+hw2, 0, cz2+hd2);
                  lcWaterVerts.push(cx2-hw2, 0, cz2-hd2,  cx2+hw2, 0, cz2+hd2,  cx2-hw2, 0, cz2+hd2);
                }
              }
            }

            if (lcBuildVerts.length > 0) {
              lcBuildingVBO = renderer.createBuffer(new Float32Array(lcBuildVerts));
              lcBuildingCount = lcBuildVerts.length / 7;
            }
            if (lcVegVerts.length > 0) {
              lcVegVBO = renderer.createBuffer(new Float32Array(lcVegVerts));
              lcVegCount = lcVegVerts.length / 8;
            }
            if (lcWaterVerts.length > 0) {
              lcWaterVBO = renderer.createBuffer(new Float32Array(lcWaterVerts));
              lcWaterCount = lcWaterVerts.length / 3;
            }
          }
          // If pipeline returned DEM and we have no elevation data, build topo texture
          if (geoData.dem && !blueprint?.elevation.length && !resultData?.elevationGrid?.length) {
            const dem = geoData.dem;
            const texData = new Uint8Array(dem.rows * dem.cols);
            const range = Math.max(1, dem.maxHeight - dem.minHeight);
            // Build normalized 0-1 grid for CPU terrain sampler
            const normGrid: number[][] = [];
            for (let r = 0; r < dem.rows; r++) {
              normGrid.push([]);
              for (let c = 0; c < dem.cols; c++) {
                const norm = (dem.grid[r * dem.cols + c] - dem.minHeight) / range;
                normGrid[r].push(norm);
                texData[r * dem.cols + c] = Math.round(norm * 255);
              }
            }
            normalizedGridRef.current = normGrid;
            gl.bindTexture(gl.TEXTURE_2D, topoTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, dem.cols, dem.rows, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, texData);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          }
        })
        .catch(() => {
          // Final fallback: load from backend API
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = satelliteMapUrl;
          img.onload = () => {
            const c = document.createElement('canvas');
            c.width = img.width; c.height = img.height;
            c.getContext('2d')!.drawImage(img, 0, 0);
            updateTextureFromCanvas(satelliteTexture, c);
            setSatLoaded(true);
            runSemanticSegmentation(c);
          };
        });
    }

    // ── SIDEWALKS (concrete strips flanking OSM roads) ─────────────────────────
    // Rendered beneath roads (depth-offset +1), adds visible pavement to the scene.
    const sidewalkVertices: number[] = [];
    if (osmHighways && (osmHighways as GISHighway[]).length > 0) {
      for (const h of osmHighways as GISHighway[]) {
        const rt = (h.type as string) || 'residential';
        // Only add sidewalks alongside driveable roads (not footways themselves)
        if (rt === 'footway' || rt === 'path' || rt === 'cycleway' || rt === 'steps') continue;
        const coords = h.coordinates.map(c => mapPos(c[0], c[1]));
        const roadHW = getRoadHalfWidth(h);
        const swW = Math.max(50, roadHW * 0.28); // sidewalk = 28% of road half-width, min 50cm
        // Outer pavement strip (road + sidewalk width)
        sidewalkVertices.push(...expandToQuads(coords, roadHW + swW));
      }
    }
    const sidewalkVBO  = renderer.createBuffer(new Float32Array(sidewalkVertices.length ? sidewalkVertices : [0,0,0]));
    const sidewalkCount = sidewalkVertices.length / 3;

    // Pre-build road group VBOs
    const roadGroupVBOs: Array<{ vbo: WebGLBuffer; count: number; color: [number,number,number]; markings: boolean }> = [];
    for (const rg of roadGroups) {
      if (rg.vertices.length === 0) continue;
      roadGroupVBOs.push({
        vbo:      renderer.createBuffer(new Float32Array(rg.vertices)),
        count:    rg.vertices.length / 3,
        color:    rg.color,
        markings: rg.markings,
      });
    }

    // CPU terrain height sampler — used by character for terrain snapping and collision.
    // Uses the normalizedGridRef (0-1 values) scaled by effectiveTopoScale.
    const sampleTerrainCPU = (wx: number, wz: number): number => {
      const grid = normalizedGridRef.current;
      if (!grid.length) return 0;
      const rows = grid.length, cols = grid[0].length;
      const u  = Math.max(0, Math.min(1, (wx + areaHalfX) / worldSpanX));
      const v  = Math.max(0, Math.min(1, (wz + areaHalfZ) / worldSpanZ));
      const gx = u * (cols - 1), gz = v * (rows - 1);
      const ix = Math.floor(gx), iz = Math.floor(gz);
      const fx = gx - ix, fz = gz - iz;
      const ix1 = Math.min(ix + 1, cols - 1), iz1 = Math.min(iz + 1, rows - 1);
      return (grid[iz][ix]*(1-fx)*(1-fz) + grid[iz][ix1]*fx*(1-fz)
            + grid[iz1][ix]*(1-fx)*fz    + grid[iz1][ix1]*fx*fz) * effectiveTopoScale;
    };

    let frameId: number;
    const startTime = Date.now();

    const render = () => {
      if (!isMounted || !canvasRef.current) return;
      // Always read the latest simData from ref — disaster type/slider changes
      // update the ref without triggering a full scene rebuild.
      const simData = simDataRef.current;
      const time   = (Date.now() - startTime) / 1000;
      const reveal = Math.min(1.0, time / 2.0);

      // ── CHARACTER: snap to terrain every frame ─────────────────────────────
      charPosRef.current[1] = sampleTerrainCPU(charPosRef.current[0], charPosRef.current[2]);

      // Keyboard: FP character movement vs orbit pan vs god-mode fly
      const isShift = cam.current.keys.has('ShiftLeft') || cam.current.keys.has('ShiftRight');
      if (fpModeRef.current && cam.current.keys.size > 0) {
        // Walk 5 m/s, run 15 m/s (Shift)
        const spd = (isShift ? 1500.0 : 500.0) / 60.0;
        const yaw = charYawRef.current;
        let dx = 0, dz = 0;
        if (cam.current.keys.has('KeyW')) { dx += Math.sin(yaw)*spd; dz += Math.cos(yaw)*spd; }
        if (cam.current.keys.has('KeyS')) { dx -= Math.sin(yaw)*spd; dz -= Math.cos(yaw)*spd; }
        if (cam.current.keys.has('KeyA')) { dx += Math.cos(yaw)*spd; dz -= Math.sin(yaw)*spd; }
        if (cam.current.keys.has('KeyD')) { dx -= Math.cos(yaw)*spd; dz += Math.sin(yaw)*spd; }
        if (dx !== 0 || dz !== 0) {
          const nx = charPosRef.current[0] + dx, nz = charPosRef.current[2] + dz;
          const r  = 22;
          const blocked = buildingAABBsRef.current.some(
            a => nx+r > a.minX && nx-r < a.maxX && nz+r > a.minZ && nz-r < a.maxZ
          );
          if (!blocked) { charPosRef.current[0] = nx; charPosRef.current[2] = nz; }
        }
      } else if (godModeRef.current && cam.current.keys.size > 0) {
        // God mode: free-fly with no collision, faster speed
        const flySpd = (isShift ? 8000 : 2500) / 60.0;
        const fwd   = GISMath.normalize(GISMath.subtract(cam.current.target, cam.current.pos));
        const right = GISMath.normalize(GISMath.cross([0, 1, 0], fwd));
        if (cam.current.keys.has('KeyW')) cam.current.target = GISMath.add(cam.current.target, GISMath.scale(fwd,   flySpd)) as [number,number,number];
        if (cam.current.keys.has('KeyS')) cam.current.target = GISMath.add(cam.current.target, GISMath.scale(fwd,  -flySpd)) as [number,number,number];
        if (cam.current.keys.has('KeyA')) cam.current.target = GISMath.add(cam.current.target, GISMath.scale(right, flySpd)) as [number,number,number];
        if (cam.current.keys.has('KeyD')) cam.current.target = GISMath.add(cam.current.target, GISMath.scale(right,-flySpd)) as [number,number,number];
        if (cam.current.keys.has('KeyQ')) cam.current.target[1] += flySpd;
        if (cam.current.keys.has('KeyE')) cam.current.target[1] -= flySpd;
      } else if (!fpModeRef.current && !godModeRef.current && cam.current.keys.size > 0) {
        const spd = cam.current.speed * (cam.current.distance * 0.004);
        const fwd   = GISMath.normalize(GISMath.subtract(cam.current.target, cam.current.pos));
        const right = GISMath.normalize(GISMath.cross([0, 1, 0], fwd));
        if (cam.current.keys.has('KeyW')) cam.current.target = GISMath.add(cam.current.target, GISMath.scale(fwd,   spd)) as [number, number, number];
        if (cam.current.keys.has('KeyS')) cam.current.target = GISMath.add(cam.current.target, GISMath.scale(fwd,  -spd)) as [number, number, number];
        if (cam.current.keys.has('KeyA')) cam.current.target = GISMath.add(cam.current.target, GISMath.scale(right, spd)) as [number, number, number];
        if (cam.current.keys.has('KeyD')) cam.current.target = GISMath.add(cam.current.target, GISMath.scale(right,-spd)) as [number, number, number];
      }

      // Camera: first-person eye view OR god mode macro overview OR standard orbit
      let finalCamPos: [number,number,number];
      let finalTarget: [number,number,number];
      if (fpModeRef.current) {
        const eyeH = charPosRef.current[1] + 160; // 160 cm eye height
        finalCamPos = [charPosRef.current[0], eyeH, charPosRef.current[2]];
        const yaw = charYawRef.current, pitch = fpPitchRef.current;
        finalTarget = [
          charPosRef.current[0] + Math.sin(yaw) * Math.cos(pitch),
          eyeH + Math.sin(pitch),
          charPosRef.current[2] + Math.cos(yaw) * Math.cos(pitch),
        ];
        compassBearingRef.current = charYawRef.current;
      } else if (godModeRef.current) {
        // God mode: high overhead position, slight tilt so user can see the city
        const godHeight = Math.max(worldSpanX, worldSpanZ) * 1.6;
        const orbitPos: [number,number,number] = [
          cam.current.target[0] + cam.current.distance * 0.3 * Math.sin(cam.current.yaw),
          godHeight,
          cam.current.target[2] + cam.current.distance * 0.3 * Math.cos(cam.current.yaw),
        ];
        finalCamPos = orbitPos;
        finalTarget = cam.current.target;
        cam.current.pos = orbitPos;
        compassBearingRef.current = cam.current.yaw;
      } else {
        const orbitPos: [number, number, number] = [
          cam.current.target[0] + cam.current.distance * Math.cos(cam.current.pitch) * Math.sin(cam.current.yaw),
          cam.current.target[1] + cam.current.distance * Math.sin(-cam.current.pitch),
          cam.current.target[2] + cam.current.distance * Math.cos(cam.current.pitch) * Math.cos(cam.current.yaw)
        ];
        // Clamp camera Y: cannot go below terrain surface or above the atmosphere
        const atmoCeiling  = Math.max(worldSpanX, worldSpanZ) * 0.5;
        const terrainFloor = sampleTerrainCPU(orbitPos[0], orbitPos[2]) + 300; // 3 m above ground
        orbitPos[1] = Math.max(terrainFloor, Math.min(atmoCeiling, orbitPos[1]));
        cam.current.pos = orbitPos;
        finalCamPos = orbitPos;
        finalTarget  = cam.current.target;
        compassBearingRef.current = cam.current.yaw;
      }

      // Earthquake camera shake
      if (simData.type === 'EARTHQUAKE' && (simData.magnitude ?? 0) > 0) {
        const mag     = Math.min(9.0, simData.magnitude ?? 0) / 9.0;
        const decay   = Math.exp(-Math.max(0, time - 2.0) * 0.4);
        const shakeAmp = mag * 120 * decay; // 120 cm max shake = 1.2 m
        finalCamPos = [
          finalCamPos[0] + Math.sin(time * 24.0) * shakeAmp,
          finalCamPos[1] + Math.abs(Math.sin(time * 19.0)) * shakeAmp * 0.4,
          finalCamPos[2] + Math.sin(time * 31.0 + 1.2) * shakeAmp * 0.8,
        ];
      }

      const { width, height } = canvasRef.current;
      renderer.setViewport(width, height);
      renderer.clear(0.01, 0.02, 0.04, 1.0);

      // Dynamic sun: simulate a full day in 180 s; sun rises from east, arcs to zenith, sets west
      const dayPeriod = 180.0; // seconds for a simulated day
      const dayFrac   = (time % dayPeriod) / dayPeriod; // 0-1
      const sunEl     = Math.sin(dayFrac * Math.PI) * 72; // elevation: 0° dawn/dusk, 72° noon
      const sunAz     = (dayFrac - 0.25) * Math.PI * 2;  // azimuth sweep
      const dynamicLightDir: [number,number,number] = layers?.sunSync
        ? (() => { const now = new Date(); const [az,el] = GISMath.sunPosition(centerLat,centerLng,now); return GISMath.sunToLightDir(az,el); })()
        : [
            Math.sin(sunAz) * Math.cos(sunEl * Math.PI / 180),
            Math.sin(sunEl * Math.PI / 180),
            Math.cos(sunAz) * Math.cos(sunEl * Math.PI / 180),
          ];

      // FP mode: wider FOV + closer near clip for immersive first-person feel
      const fovRad   = fpModeRef.current ? (90 * Math.PI / 180) : (45 * Math.PI / 180);
      const nearClip = fpModeRef.current ? 5 : 1;  // 5 cm FP, 1 cm orbit
      const projMatrix  = GISMath.perspective(fovRad, width / height, nearClip, Math.max(worldSpanX, worldSpanZ) * 4);
      const viewMatrix  = GISMath.lookAt(finalCamPos, finalTarget, [0, 1, 0]);
      const modelMatrix = identityMatrix;
      lastProjRef.current = projMatrix;
      lastViewRef.current = viewMatrix;

      const soilType  = resultData?.soil?.type || 'Clay';
      const soilColor = soilType.includes('Clay') ? [0.35, 0.15, 0.08] : [0.25, 0.25, 0.18];
      const L_COLOR   = [1.1, 1.1, 1.2] as [number, number, number];

      const isRealMode = 1; // Always use solid realistic colours — satellite is for semantic data only

      // ── 0. SKY ────────────────────────────────────────────────────────────────
      {
        const precipType  = getPrecipType(simData.type, simData.precipitation ?? 0, simData.snowfall ?? 0, simData.temp ?? 25);
        const cloudCover  = getCloudCover(simData.type, simData.precipitation ?? 0, simData.intensity ?? 50);
        const sunElevDeg  = Math.asin(Math.max(-1, Math.min(1, dynamicLightDir[1]))) * 180 / Math.PI;
        const viewProjMat = GISMath.multiply(projMatrix, viewMatrix);
        const invVP       = GISMath.invertMat4(viewProjMat);

        gl.disable(gl.DEPTH_TEST);
        gl.depthMask(false);
        renderer.useProgram(skyProgram);
        renderer.setUniformMatrix4('u_invViewProj', invVP);
        renderer.setUniform3f('u_sunDir', dynamicLightDir[0], dynamicLightDir[1], dynamicLightDir[2]);
        renderer.setUniform1f('u_cloudCover', cloudCover);
        renderer.setUniform1i('u_precipType', precipType);
        renderer.setUniform1f('u_time', time);
        renderer.setUniform1f('u_reveal', reveal);
        renderer.setUniform1f('u_sunElevDeg', sunElevDeg);
        renderer.setUniform1i('u_disasterType', getDisasterTypeInt(simData.type));
        renderer.setUniform1f('u_disasterIntensity', Math.min(1.0, (simData.intensity ?? 50) / 100.0));
        gl.bindBuffer(gl.ARRAY_BUFFER, skyQuadVBO);
        renderer.setAttribute('a_pos', 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.enable(gl.DEPTH_TEST);
        gl.depthMask(true);
      }

      // ── 1. TERRAIN ────────────────────────────────────────────────────────────
      if (layers.terrain) {
        renderer.useProgram(terrainProgram);
        renderer.setUniformMatrix4('u_projectionMatrix', projMatrix);
        renderer.setUniformMatrix4('u_viewMatrix', viewMatrix);
        renderer.setUniformMatrix4('u_modelMatrix', modelMatrix);
        renderer.setUniform1f('u_topoScale', effectiveTopoScale);
        renderer.setUniform1f('u_topoOffset', topoOffset);
        renderer.setUniform1f('u_reveal', reveal);
        renderer.setUniform1f('u_time', time);
        renderer.setUniform1f('u_lightIntensity', lightIntensity);
        renderer.setUniform3f('u_soilColor', soilColor[0], soilColor[1], soilColor[2]);
        // Terrain always uses solid topographic colours — satellite used only for semantic data
        renderer.setUniform1i('u_topoMode', layers.topography ? 1 : 0);
        renderer.setUniform3f('u_lightDir', dynamicLightDir[0], dynamicLightDir[1], dynamicLightDir[2]);
        renderer.setUniform3f('u_lightColor', L_COLOR[0], L_COLOR[1], L_COLOR[2]);
        renderer.bindTexture(topoTexture, 0);
        renderer.setUniform1i('u_topoMap', 0);
        renderer.bindTexture(satelliteTexture, 1);
        renderer.setUniform1i('u_satTex', 1);
        renderer.setUniform1i('u_satMode', (layers.satellite && satLoaded) ? 1 : 0);
        renderer.bindTexture(landCoverTexture, 2);
        renderer.setUniform1i('u_landCoverTex', 2);
        renderer.setUniform1i('u_landCoverMode', landCoverLoaded ? 1 : 0);
        renderer.setUniform1f('u_texelOffset', 1.0 / topoSize);
        renderer.setUniform1f('u_worldSpanX', worldSpanX);
        renderer.setUniform1f('u_worldSpanZ', worldSpanZ);

        // Disaster-driven terrain modifiers
        const wetness = (simData.type === 'FLOOD' || simData.type === 'TSUNAMI')
          ? Math.min(1.0, (simData.waterLevel ?? 0) / 8.0 + (simData.precipitation ?? 0) / 200.0)
          : Math.min(1.0, (simData.precipitation ?? 0) / 180.0 * ((simData.soilMoisture ?? 50) / 100.0));
        const fireScorch = simData.type === 'WILDFIRE'
          ? Math.min(1.0, ((simData.spreadRate ?? 100) / 800.0) * Math.min(1.0, time / 8.0))
          : 0.0;
        renderer.setUniform1f('u_wetness',      wetness);
        renderer.setUniform1f('u_fireScorch',   fireScorch);
        renderer.setUniform1i('u_earthquakeMod', simData.type === 'EARTHQUAKE' ? 1 : 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, terrainVBO);
        renderer.setAttribute('a_position', 3, gl.FLOAT, false, 8 * 4, 0);
        renderer.setAttribute('a_normal',   3, gl.FLOAT, false, 8 * 4, 3 * 4);
        renderer.setAttribute('a_uv',       2, gl.FLOAT, false, 8 * 4, 6 * 4);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, terrainIBO);
        gl.drawElements(gl.TRIANGLES, terrainIndices.length, gl.UNSIGNED_INT, 0);
      }

      // ── 2. WATER AREAS (OSM + satellite WATER cells) ─────────────────────────
      if (layers.polygons && waterAreaVertices.length > 0) {
        renderer.useProgram(waterAreaProgram);
        renderer.setUniformMatrix4('u_projectionMatrix', projMatrix);
        renderer.setUniformMatrix4('u_viewMatrix', viewMatrix);
        renderer.setUniformMatrix4('u_modelMatrix', modelMatrix);
        renderer.setUniform1f('u_topoScale', effectiveTopoScale);
        renderer.setUniform1f('u_topoOffset', topoOffset);
        renderer.setUniform1f('u_areaHalfX', areaHalfX);
        renderer.setUniform1f('u_areaHalfZ', areaHalfZ);
        renderer.setUniform1f('u_time', time);
        renderer.setUniform1f('u_reveal', reveal);
        renderer.setUniform3f('u_lightDir', dynamicLightDir[0], dynamicLightDir[1], dynamicLightDir[2]);
        renderer.setUniform3f('u_lightColor', L_COLOR[0], L_COLOR[1], L_COLOR[2]);
        renderer.setUniform1f('u_lightIntensity', lightIntensity);
        renderer.bindTexture(topoTexture, 2);
        renderer.setUniform1i('u_topoMap', 2);

        gl.bindBuffer(gl.ARRAY_BUFFER, waterAreaVBO);
        renderer.setAttribute('a_position', 3, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, waterAreaVertices.length / 3);
      }

      // ── 2b. LC-AUGMENTED WATER AREAS ──────────────────────────────────────────
      if (layers.polygons && lcWaterVBO && lcWaterCount > 0) {
        renderer.useProgram(waterAreaProgram);
        renderer.setUniformMatrix4('u_projectionMatrix', projMatrix);
        renderer.setUniformMatrix4('u_viewMatrix', viewMatrix);
        renderer.setUniformMatrix4('u_modelMatrix', modelMatrix);
        renderer.setUniform1f('u_topoScale', effectiveTopoScale);
        renderer.setUniform1f('u_topoOffset', topoOffset);
        renderer.setUniform1f('u_areaHalfX', areaHalfX);
        renderer.setUniform1f('u_areaHalfZ', areaHalfZ);
        renderer.setUniform1f('u_reveal', reveal);
        renderer.setUniform1i('u_realisticMode', isRealMode);
        renderer.bindTexture(topoTexture, 2);
        renderer.setUniform1i('u_topoMap', 2);
        gl.bindBuffer(gl.ARRAY_BUFFER, lcWaterVBO);
        renderer.setAttribute('a_position', 3, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, lcWaterCount);
      }

      // ── 3a. SIDEWALKS (concrete pavement strips beneath roads) ────────────────
      if (layers.streets && sidewalkCount > 0) {
        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.polygonOffset(1.0, 1.0); // behind roads
        renderer.useProgram(roadProgram);
        renderer.setUniformMatrix4('u_projectionMatrix', projMatrix);
        renderer.setUniformMatrix4('u_viewMatrix', viewMatrix);
        renderer.setUniformMatrix4('u_modelMatrix', modelMatrix);
        renderer.setUniform1f('u_topoScale', effectiveTopoScale);
        renderer.setUniform1f('u_topoOffset', topoOffset);
        renderer.setUniform1f('u_areaHalfX', areaHalfX);
        renderer.setUniform1f('u_areaHalfZ', areaHalfZ);
        renderer.setUniform1f('u_elevOffset', 0.0);
        renderer.setUniform1f('u_reveal', reveal);
        renderer.setUniform1i('u_realisticMode', isRealMode);
        renderer.bindTexture(topoTexture, 2);
        renderer.setUniform1i('u_topoMap', 2);
        renderer.setUniform3f('u_roadColor', 0.74, 0.72, 0.68); // light concrete
        renderer.setUniform1f('u_markings', 0.0);
        gl.bindBuffer(gl.ARRAY_BUFFER, sidewalkVBO);
        renderer.setAttribute('a_position', 3, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, sidewalkCount);
        gl.disable(gl.POLYGON_OFFSET_FILL);
      }

      // ── 3. ROADS (polygon quads) ───────────────────────────────────────────────
      if (layers.streets) {
        // Polygon offset pushes roads in front of terrain in depth buffer,
        // preventing z-fighting where subdivided quads nearly touch the terrain surface.
        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.polygonOffset(-1.0, -1.0);
        renderer.useProgram(roadProgram);
        renderer.setUniformMatrix4('u_projectionMatrix', projMatrix);
        renderer.setUniformMatrix4('u_viewMatrix', viewMatrix);
        renderer.setUniformMatrix4('u_modelMatrix', modelMatrix);
        renderer.setUniform1f('u_topoScale', effectiveTopoScale);
        renderer.setUniform1f('u_topoOffset', topoOffset);
        renderer.setUniform1f('u_areaHalfX', areaHalfX);
        renderer.setUniform1f('u_areaHalfZ', areaHalfZ);
        renderer.setUniform1f('u_elevOffset', 0.0);
        renderer.setUniform1f('u_reveal', reveal);
        renderer.setUniform1i('u_realisticMode', isRealMode);
        renderer.bindTexture(topoTexture, 2);
        renderer.setUniform1i('u_topoMap', 2);

        if (roadGroupVBOs.length > 0) {
          for (const rg of roadGroupVBOs) {
            renderer.setUniform3f('u_roadColor', rg.color[0], rg.color[1], rg.color[2]);
            renderer.setUniform1f('u_markings', rg.markings ? 1.0 : 0.0);
            gl.bindBuffer(gl.ARRAY_BUFFER, rg.vbo);
            renderer.setAttribute('a_position', 3, gl.FLOAT, false, 0, 0);
            gl.drawArrays(gl.TRIANGLES, 0, rg.count);
          }
        } else if (fallbackRoadVertices.length > 0) {
          renderer.setUniform3f('u_roadColor', 0.40, 0.40, 0.40);
          renderer.setUniform1f('u_markings', 0.0);
          gl.bindBuffer(gl.ARRAY_BUFFER, fallbackRoadVBO);
          renderer.setAttribute('a_position', 3, gl.FLOAT, false, 0, 0);
          gl.drawArrays(gl.TRIANGLES, 0, fallbackRoadVertices.length / 3);
        }
        gl.disable(gl.POLYGON_OFFSET_FILL);
      }

      // ── 3b. BARRIERS (walls, fences, hedges) ──────────────────────────────────
      if (barrierVertices.length > 0) {
        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.polygonOffset(-1.5, -1.5);
        renderer.useProgram(roadProgram);
        renderer.setUniformMatrix4('u_projectionMatrix', projMatrix);
        renderer.setUniformMatrix4('u_viewMatrix', viewMatrix);
        renderer.setUniformMatrix4('u_modelMatrix', modelMatrix);
        renderer.setUniform1f('u_topoScale', effectiveTopoScale);
        renderer.setUniform1f('u_topoOffset', topoOffset);
        renderer.setUniform1f('u_areaHalfX', areaHalfX);
        renderer.setUniform1f('u_areaHalfZ', areaHalfZ);
        renderer.setUniform1f('u_elevOffset', 0.0);
        renderer.setUniform1f('u_reveal', reveal);
        renderer.setUniform1i('u_realisticMode', isRealMode);
        renderer.bindTexture(topoTexture, 2);
        renderer.setUniform1i('u_topoMap', 2);
        renderer.setUniform3f('u_roadColor', 0.55, 0.48, 0.38);
        renderer.setUniform1f('u_markings', 0.0);
        gl.bindBuffer(gl.ARRAY_BUFFER, barrierVBO);
        renderer.setAttribute('a_position', 3, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, barrierVertices.length / 3);
        gl.disable(gl.POLYGON_OFFSET_FILL);
      }

      // ── 4. WATERWAYS (OSM + D8 hydrological streams) ─────────────────────────
      if (layers.polygons && waterwayVertices.length > 0) {
        renderer.useProgram(waterwayProgram);
        renderer.setUniformMatrix4('u_projectionMatrix', projMatrix);
        renderer.setUniformMatrix4('u_viewMatrix', viewMatrix);
        renderer.setUniformMatrix4('u_modelMatrix', modelMatrix);
        renderer.setUniform1f('u_topoScale', effectiveTopoScale);
        renderer.setUniform1f('u_time', time);
        renderer.setUniform1f('u_reveal', reveal);
        renderer.setUniform1f('u_areaHalfX', areaHalfX);
        renderer.setUniform1f('u_areaHalfZ', areaHalfZ);
        renderer.bindTexture(topoTexture, 2);
        renderer.setUniform1i('u_topoMap', 2);

        gl.bindBuffer(gl.ARRAY_BUFFER, waterwayVBO);
        renderer.setAttribute('a_position', 3, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.LINES, 0, waterwayVertices.length / 3);
      }

      // ── 5. BUILDINGS ──────────────────────────────────────────────────────────
      if ((layers.buildings || layers.residential) && vertexCount > 0) {
        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.polygonOffset(-1.0, -1.0);
        renderer.useProgram(infraProgram);
        renderer.setUniformMatrix4('u_projectionMatrix', projMatrix);
        renderer.setUniformMatrix4('u_viewMatrix', viewMatrix);
        renderer.setUniformMatrix4('u_modelMatrix', modelMatrix);
        renderer.setUniform1f('u_topoScale', effectiveTopoScale);
        renderer.setUniform1f('u_topoOffset', topoOffset);
        renderer.setUniform1f('u_time', time);
        renderer.setUniform1f('u_reveal', reveal);
        renderer.setUniform1f('u_areaHalfX', areaHalfX);
        renderer.setUniform1f('u_areaHalfZ', areaHalfZ);
        renderer.setUniform1i('u_aiMode', layers.aiStructural ? 1 : 0);
        renderer.setUniform1i('u_realisticMode', isRealMode);
        renderer.setUniform3f('u_lightDir', dynamicLightDir[0], dynamicLightDir[1], dynamicLightDir[2]);
        renderer.setUniform3f('u_lightColor', L_COLOR[0], L_COLOR[1], L_COLOR[2]);
        renderer.setUniform1f('u_lightIntensity', lightIntensity);
        renderer.bindTexture(topoTexture, 1);
        renderer.setUniform1i('u_topoMap', 1);

        // Dispatch u_buildingType: use first building's buildingUse as representative
        // (buildings are pre-grouped by type during geometry build)
        const firstBuilding = resultData?.urbanFeatures?.buildings?.[0];
        const bldgUse = (firstBuilding as any)?.buildingUse ?? 'residential';
        renderer.setUniform1i('u_buildingType',
          bldgUse === 'commercial' ? 1 : bldgUse === 'industrial' ? 2 : 0
        );

        // Selection highlight AABB (sentinel = no selection)
        const sel = selectedBuildingRef.current;
        if (sel) {
          renderer.setUniform4f('u_highlightAABB', sel.minX, sel.minZ, sel.maxX, sel.maxZ);
        } else {
          renderer.setUniform4f('u_highlightAABB', 1e9, 1e9, -1e9, -1e9);
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, buildingVBO);
        renderer.setAttribute('a_position', 3, gl.FLOAT, false, 7 * 4, 0);
        renderer.setAttribute('a_meta',     4, gl.FLOAT, false, 7 * 4, 3 * 4);
        gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
        gl.disable(gl.POLYGON_OFFSET_FILL);
      }

      // ── 5b. LC-AUGMENTED BUILDINGS (from SpectralAnalyzer land cover) ─────────
      // Draws procedural residential houses for URBAN land-cover cells not covered by OSM.
      if ((layers.buildings || layers.residential) && lcBuildingVBO && lcBuildingCount > 0) {
        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.polygonOffset(-1.0, -1.0);
        renderer.useProgram(infraProgram);
        renderer.setUniformMatrix4('u_projectionMatrix', projMatrix);
        renderer.setUniformMatrix4('u_viewMatrix', viewMatrix);
        renderer.setUniformMatrix4('u_modelMatrix', modelMatrix);
        renderer.setUniform1f('u_topoScale', effectiveTopoScale);
        renderer.setUniform1f('u_topoOffset', topoOffset);
        renderer.setUniform1f('u_time', time);
        renderer.setUniform1f('u_reveal', reveal);
        renderer.setUniform1f('u_areaHalfX', areaHalfX);
        renderer.setUniform1f('u_areaHalfZ', areaHalfZ);
        renderer.setUniform1i('u_aiMode', 0);
        renderer.setUniform1i('u_realisticMode', isRealMode);
        renderer.setUniform3f('u_lightDir', dynamicLightDir[0], dynamicLightDir[1], dynamicLightDir[2]);
        renderer.setUniform3f('u_lightColor', L_COLOR[0], L_COLOR[1], L_COLOR[2]);
        renderer.setUniform1f('u_lightIntensity', lightIntensity);
        renderer.bindTexture(topoTexture, 1);
        renderer.setUniform1i('u_topoMap', 1);
        renderer.setUniform1i('u_buildingType', 0); // residential
        renderer.setUniform4f('u_highlightAABB', 1e9, 1e9, -1e9, -1e9);
        gl.bindBuffer(gl.ARRAY_BUFFER, lcBuildingVBO);
        renderer.setAttribute('a_position', 3, gl.FLOAT, false, 7 * 4, 0);
        renderer.setAttribute('a_meta',     4, gl.FLOAT, false, 7 * 4, 3 * 4);
        gl.drawArrays(gl.TRIANGLES, 0, lcBuildingCount);
        gl.disable(gl.POLYGON_OFFSET_FILL);
      }

      // ── 5b. WILDFIRE OVERLAY ──────────────────────────────────────────────────
      if (simData.type === 'WILDFIRE' && (simData.intensity ?? 0) > 5) {
        const fireRadius = Math.max(4000, (((simData.spreadRate ?? 200) / 3600) * time * 4 + 60) * CM);
        const windRad2   = ((simData.windDirection ?? 45) * Math.PI) / 180;
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.polygonOffset(-2.0, -2.0);
        renderer.useProgram(fireProgram);
        renderer.setUniformMatrix4('u_projectionMatrix', projMatrix);
        renderer.setUniformMatrix4('u_viewMatrix', viewMatrix);
        renderer.setUniformMatrix4('u_modelMatrix', modelMatrix);
        renderer.setUniform1f('u_topoScale', effectiveTopoScale);
        renderer.setUniform1f('u_topoOffset', topoOffset);
        renderer.bindTexture(topoTexture, 0);
        renderer.setUniform1i('u_topoMap', 0);
        renderer.setUniform1f('u_time', time);
        renderer.setUniform1f('u_reveal', reveal);
        renderer.setUniform2f('u_fireCenter', 0.0, 0.0);
        renderer.setUniform1f('u_fireRadius', fireRadius);
        renderer.setUniform2f('u_windDir', Math.sin(windRad2), Math.cos(windRad2));
        renderer.setUniform1f('u_fireIntensity', Math.min(1.0, (simData.intensity ?? 50) / 60.0));
        renderer.setUniform1f('u_areaHalfX', areaHalfX);
        renderer.setUniform1f('u_areaHalfZ', areaHalfZ);
        gl.bindBuffer(gl.ARRAY_BUFFER, terrainVBO);
        renderer.setAttribute('a_position', 3, gl.FLOAT, false, 8 * 4, 0);
        renderer.setAttribute('a_normal',   3, gl.FLOAT, false, 8 * 4, 3 * 4);
        renderer.setAttribute('a_uv',       2, gl.FLOAT, false, 8 * 4, 6 * 4);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, terrainIBO);
        gl.drawElements(gl.TRIANGLES, terrainIndices.length, gl.UNSIGNED_INT, 0);
        gl.disable(gl.POLYGON_OFFSET_FILL);
        gl.disable(gl.BLEND);
      }

      // ── 6. FLOOD WATER ────────────────────────────────────────────────────────
      if (simData.type === 'FLOOD' && simData.waterLevel > 0) {
        renderer.useProgram(waterProgram);
        renderer.setUniformMatrix4('u_projectionMatrix', projMatrix);
        renderer.setUniformMatrix4('u_viewMatrix', viewMatrix);
        renderer.setUniformMatrix4('u_modelMatrix', modelMatrix);
        renderer.setUniform3f('u_lightDir', dynamicLightDir[0], dynamicLightDir[1], dynamicLightDir[2]);
        renderer.setUniform3f('u_lightColor', L_COLOR[0], L_COLOR[1], L_COLOR[2]);
        renderer.setUniform1f('u_lightIntensity', lightIntensity);
        renderer.setUniform1f('u_topoScale', effectiveTopoScale);
        renderer.setUniform1f('u_topoOffset', topoOffset);
        renderer.setUniform1f('u_waterLevel', (simData.waterLevel ?? 0) * CM);
        renderer.setUniform1f('u_time', time);
        renderer.setUniform1f('u_reveal', reveal);
        renderer.bindTexture(topoTexture, 0);
        renderer.setUniform1i('u_topoMap', 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, terrainVBO);
        renderer.setAttribute('a_position', 3, gl.FLOAT, false, 8 * 4, 0);
        renderer.setAttribute('a_uv',       2, gl.FLOAT, false, 8 * 4, 6 * 4);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, terrainIBO);
        gl.drawElements(gl.TRIANGLES, terrainIndices.length, gl.UNSIGNED_INT, 0);
      }

      // ── 7. PRECIPITATION ──────────────────────────────────────────────────────
      if (layers.particles) {
        const precipType  = getPrecipType(simData.type, simData.precipitation ?? 0, simData.snowfall ?? 0, simData.temp ?? 25);
        const cloudCover  = getCloudCover(simData.type, simData.precipitation ?? 0, simData.intensity ?? 50);
        const cloudBase   = getCloudBase(simData.temp ?? 20, simData.humidity ?? 60) * CM; // cm
        const windRad     = (simData.windDirection ?? 0) * Math.PI / 180;
        const windMs      = ((simData.windSpeed ?? 0) / 3.6) * CM; // cm/s
        const windX       = Math.sin(windRad) * windMs;
        const windZ       = Math.cos(windRad) * windMs;
        const turbulence  = (precipType >= 5 ? 600.0 : precipType === 1 ? 200.0 : 50.0); // cm
        // Particle count by type
        const precipCounts = [0, 20000, 40000, 70000, 12000, 25000, 60000];
        const drawCount   = Math.floor((precipCounts[precipType] ?? 0) * Math.min(1.0, particleIntensity));

        if (precipType > 0 && drawCount > 0) {
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          gl.depthMask(false);
          renderer.useProgram(precipProgram);
          renderer.setUniformMatrix4('u_projMatrix',  projMatrix);
          renderer.setUniformMatrix4('u_viewMatrix',  viewMatrix);
          renderer.setUniform1i('u_precipType',  precipType);
          renderer.setUniform1f('u_cloudBase',   cloudBase);
          renderer.setUniform1f('u_windX',       windX);
          renderer.setUniform1f('u_windZ',       windZ);
          renderer.setUniform1f('u_turbulence',  turbulence);
          renderer.setUniform1f('u_time',        time);
          renderer.setUniform1f('u_worldSpanX',  worldSpanX);
          renderer.setUniform1f('u_worldSpanZ',  worldSpanZ);
          renderer.setUniform1f('u_areaHalfX',   areaHalfX);
          renderer.setUniform1f('u_areaHalfZ',   areaHalfZ);
          renderer.bindTexture(topoTexture, 0);
          renderer.setUniform1i('u_topoMap',     0);
          renderer.setUniform1f('u_topoScale',   effectiveTopoScale);
          renderer.setUniform1f('u_topoOffset',  topoOffset);
          renderer.setUniform1f('u_reveal',      reveal);
          renderer.setUniform1f('u_intensity',   Math.min(1.0, particleIntensity));
          gl.bindBuffer(gl.ARRAY_BUFFER, precipVBO);
          renderer.setAttribute('a_seeds', 3, gl.FLOAT, false, 0, 0);
          gl.drawArrays(gl.POINTS, 0, drawCount);
          gl.depthMask(true);
          gl.disable(gl.BLEND);
        }

        // Legacy TORNADO vortex particles (use old particle shader)
        if (simData.type === 'TORNADO') {
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          gl.depthMask(false);
          renderer.useProgram(particleProgram);
          renderer.setUniformMatrix4('u_projectionMatrix', projMatrix);
          renderer.setUniformMatrix4('u_viewMatrix', viewMatrix);
          renderer.setUniform1f('u_time', time);
          renderer.setUniform1f('u_reveal', reveal);
          renderer.setUniform1i('u_type', 1);
          renderer.setUniform1f('u_windSpeed', simData.windSpeed ?? 10.0);
          renderer.setUniform1f('u_windDirection', simData.windDirection ?? 0.0);
          renderer.setUniform1f('u_pressure', simData.pressure ?? 1013.0);
          gl.bindBuffer(gl.ARRAY_BUFFER, particleVBO);
          renderer.setAttribute('a_position', 3, gl.FLOAT, false, 0, 0);
          gl.drawArrays(gl.POINTS, 0, Math.floor(particleCount * Math.min(1.0, particleIntensity)));
          gl.depthMask(true);
          gl.disable(gl.BLEND);
        }
      }

      // ── 8. VEGETATION — removed (trees disabled) ─────────────────────────────

      // ── 9. SEMANTIC RECONSTRUCTION ────────────────────────────────────────────
      if (layers.semantic && semTerrainCountRef.current > 0) {
        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.polygonOffset(-1.0, -1.0);

        renderer.useProgram(semanticProgram);
        renderer.setUniformMatrix4('u_projectionMatrix', projMatrix);
        renderer.setUniformMatrix4('u_viewMatrix', viewMatrix);
        renderer.setUniformMatrix4('u_modelMatrix', modelMatrix);
        renderer.setUniform1f('u_topoScale', effectiveTopoScale);
        renderer.setUniform1f('u_topoOffset', topoOffset);
        renderer.setUniform1f('u_texelOffset', 1.0 / topoSize);
        renderer.setUniform1f('u_time', time);
        renderer.setUniform1f('u_reveal', reveal);
        renderer.setUniform3f('u_lightDir', dynamicLightDir[0], dynamicLightDir[1], dynamicLightDir[2]);
        renderer.setUniform3f('u_lightColor', L_COLOR[0], L_COLOR[1], L_COLOR[2]);
        renderer.setUniform1f('u_lightIntensity', lightIntensity);
        renderer.bindTexture(topoTexture, 0);
        renderer.setUniform1i('u_topoMap', 0);

        const S = 8 * 4;

        gl.bindBuffer(gl.ARRAY_BUFFER, semTerrainVBO);
        renderer.setAttribute('a_position',      3, gl.FLOAT, false, S, 0);
        renderer.setAttribute('a_semanticClass', 1, gl.FLOAT, false, S, 3 * 4);
        renderer.setAttribute('a_intensity',     1, gl.FLOAT, false, S, 4 * 4);
        renderer.setAttribute('a_uv',            2, gl.FLOAT, false, S, 5 * 4);
        renderer.setAttribute('a_isFace',        1, gl.FLOAT, false, S, 7 * 4);
        gl.drawArrays(gl.TRIANGLES, 0, semTerrainCountRef.current);

        if (semBuildingCountRef.current > 0) {
          gl.bindBuffer(gl.ARRAY_BUFFER, semBuildingVBO);
          renderer.setAttribute('a_position',      3, gl.FLOAT, false, S, 0);
          renderer.setAttribute('a_semanticClass', 1, gl.FLOAT, false, S, 3 * 4);
          renderer.setAttribute('a_intensity',     1, gl.FLOAT, false, S, 4 * 4);
          renderer.setAttribute('a_uv',            2, gl.FLOAT, false, S, 5 * 4);
          renderer.setAttribute('a_isFace',        1, gl.FLOAT, false, S, 7 * 4);
          gl.drawArrays(gl.TRIANGLES, 0, semBuildingCountRef.current);
        }

        gl.disable(gl.POLYGON_OFFSET_FILL);
      }

      // ── 10. SLOPE OVERLAY (Horn algorithm risk bands) ─────────────────────
      if (layers.slope) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        renderer.useProgram(slopeProgram);
        renderer.setUniformMatrix4('u_projectionMatrix', projMatrix);
        renderer.setUniformMatrix4('u_viewMatrix', viewMatrix);
        renderer.setUniformMatrix4('u_modelMatrix', modelMatrix);
        renderer.setUniform1f('u_topoScale', effectiveTopoScale);
        renderer.bindTexture(topoTexture, 0);
        renderer.setUniform1i('u_topoMap', 0);
        renderer.bindTexture(slopeTexture, 1);
        renderer.setUniform1i('u_slopeMap', 1);
        renderer.setUniform1f('u_opacity', 0.75);
        gl.bindBuffer(gl.ARRAY_BUFFER, terrainVBO);
        renderer.setAttribute('a_position', 3, gl.FLOAT, false, 8 * 4, 0);
        renderer.setAttribute('a_normal',   3, gl.FLOAT, false, 8 * 4, 3 * 4);
        renderer.setAttribute('a_uv',       2, gl.FLOAT, false, 8 * 4, 6 * 4);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, terrainIBO);
        gl.drawElements(gl.TRIANGLES, terrainIndices.length, gl.UNSIGNED_INT, 0);
        gl.disable(gl.BLEND);
      }

      // ── 11. DENSITY OVERLAY (population heatmap) ──────────────────────────
      if (layers.density) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        renderer.useProgram(densityProgram);
        renderer.setUniformMatrix4('u_projectionMatrix', projMatrix);
        renderer.setUniformMatrix4('u_viewMatrix', viewMatrix);
        renderer.setUniformMatrix4('u_modelMatrix', modelMatrix);
        renderer.setUniform1f('u_topoScale', effectiveTopoScale);
        renderer.bindTexture(topoTexture, 0);
        renderer.setUniform1i('u_topoMap', 0);
        renderer.bindTexture(densityTexture, 2);
        renderer.setUniform1i('u_densityMap', 2);
        renderer.setUniform1f('u_opacity', 0.80);
        gl.bindBuffer(gl.ARRAY_BUFFER, terrainVBO);
        renderer.setAttribute('a_position', 3, gl.FLOAT, false, 8 * 4, 0);
        renderer.setAttribute('a_normal',   3, gl.FLOAT, false, 8 * 4, 3 * 4);
        renderer.setAttribute('a_uv',       2, gl.FLOAT, false, 8 * 4, 6 * 4);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, terrainIBO);
        gl.drawElements(gl.TRIANGLES, terrainIndices.length, gl.UNSIGNED_INT, 0);
        gl.disable(gl.BLEND);
      }

      // ── 12. CHARACTER capsule (hidden in FP mode — we're inside it) ───────────
      if (!fpModeRef.current) {
        renderer.useProgram(charShaderProg);
        renderer.setUniformMatrix4('u_projectionMatrix', projMatrix);
        renderer.setUniformMatrix4('u_viewMatrix', viewMatrix);
        renderer.setUniform3f('u_charPos', charPosRef.current[0], charPosRef.current[1], charPosRef.current[2]);
        renderer.setUniform1f('u_charYaw', charYawRef.current);
        renderer.setUniform3f('u_lightDir', dynamicLightDir[0], dynamicLightDir[1], dynamicLightDir[2]);
        renderer.setUniform3f('u_lightColor', L_COLOR[0], L_COLOR[1], L_COLOR[2]);
        renderer.setUniform1f('u_lightIntensity', lightIntensity);
        gl.bindBuffer(gl.ARRAY_BUFFER, charVBO);
        renderer.setAttribute('a_position', 3, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, charVertCount);
      }

      // ── 13. ZONE OVERLAY (natural areas + land-use zones) ────────────────────
      // Each zone type is independently gated via per-fragment shader uniforms:
      //   u_showNatural  → typeId 0-7  (scrub, heath, grassland, farmland…)
      //   u_showLandUse  → typeId 8-15 (residential, commercial, industrial…)
      //   u_showPaving   → typeId 16-17 (pedestrian plazas, parking lots)
      const anyZoneOn = (layers.naturalAreas || layers.landUseZones || layers.paving);
      if (anyZoneOn && zoneVertCount > 0) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        renderer.useProgram(zoneProgram);
        renderer.setUniformMatrix4('u_projectionMatrix', projMatrix);
        renderer.setUniformMatrix4('u_viewMatrix', viewMatrix);
        renderer.setUniformMatrix4('u_modelMatrix', modelMatrix);
        renderer.setUniform1f('u_topoScale', effectiveTopoScale);
        renderer.setUniform1f('u_topoOffset', topoOffset);
        renderer.setUniform1f('u_areaHalfX', areaHalfX);
        renderer.setUniform1f('u_areaHalfZ', areaHalfZ);
        renderer.setUniform1f('u_reveal', reveal);
        renderer.setUniform1f('u_showNatural',  layers.naturalAreas  ? 1.0 : 0.0);
        renderer.setUniform1f('u_showLandUse',  layers.landUseZones  ? 1.0 : 0.0);
        renderer.setUniform1f('u_showPaving',   layers.paving        ? 1.0 : 0.0);
        renderer.bindTexture(topoTexture, 0);
        renderer.setUniform1i('u_topoMap', 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, zoneVBO);
        renderer.setAttribute('a_position', 3, gl.FLOAT, false, 3 * 4, 0);
        gl.drawArrays(gl.TRIANGLES, 0, zoneVertCount);
        gl.disable(gl.BLEND);
      }

      // ── 14. AMENITY POINT SPRITES ─────────────────────────────────────────────
      if (layers.amenities && amenityVertCount > 0) {
        renderer.useProgram(amenityProgram);
        renderer.setUniformMatrix4('u_projectionMatrix', projMatrix);
        renderer.setUniformMatrix4('u_viewMatrix', viewMatrix);
        renderer.setUniformMatrix4('u_modelMatrix', modelMatrix);
        renderer.setUniform1f('u_topoScale', effectiveTopoScale);
        renderer.setUniform1f('u_topoOffset', topoOffset);
        renderer.setUniform1f('u_areaHalfX', areaHalfX);
        renderer.setUniform1f('u_areaHalfZ', areaHalfZ);
        renderer.setUniform1f('u_reveal', reveal);
        renderer.bindTexture(topoTexture, 0);
        renderer.setUniform1i('u_topoMap', 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, amenityVBO);
        renderer.setAttribute('a_position', 3, gl.FLOAT, false, 3 * 4, 0);
        gl.drawArrays(gl.POINTS, 0, amenityVertCount);
      }

      // ── 15. ATMOSPHERIC FOG OVERLAY ───────────────────────────────────────────
      {
        const precipType = getPrecipType(simData.type, simData.precipitation ?? 0, simData.snowfall ?? 0, simData.temp ?? 25);
        const fogDensity = getFogDensity(simData.humidity ?? 60, precipType);
        const cloudCover = getCloudCover(simData.type, simData.precipitation ?? 0, simData.intensity ?? 50);
        if (fogDensity > 0.02) {
          const fogCol = getFogColor(precipType, simData.temp ?? 20);
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          gl.disable(gl.DEPTH_TEST);
          gl.depthMask(false);
          renderer.useProgram(fogProgram);
          renderer.setUniform1f('u_fogDensity', fogDensity);
          renderer.setUniform3f('u_fogColor', fogCol[0], fogCol[1], fogCol[2]);
          renderer.setUniform1f('u_reveal', reveal);
          renderer.setUniform1f('u_cloudCover', cloudCover);
          renderer.setUniform1i('u_disasterType', getDisasterTypeInt(simData.type));
          renderer.setUniform1f('u_disasterIntensity', Math.min(1.0, (simData.intensity ?? 50) / 100.0));
          gl.bindBuffer(gl.ARRAY_BUFFER, skyQuadVBO);
          renderer.setAttribute('a_pos', 2, gl.FLOAT, false, 0, 0);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
          gl.enable(gl.DEPTH_TEST);
          gl.depthMask(true);
          gl.disable(gl.BLEND);
        }
      }

      frameId = requestAnimationFrame(render);
    };

    frameId = requestAnimationFrame(render);

    return () => {
      isMounted = false;
      cancelAnimationFrame(frameId);
      gl.deleteBuffer(terrainVBO);
      gl.deleteBuffer(terrainIBO);
      gl.deleteBuffer(buildingVBO);
      gl.deleteBuffer(particleVBO);
      gl.deleteBuffer(precipVBO);
      gl.deleteBuffer(skyQuadVBO);
      gl.deleteBuffer(waterwayVBO);
      gl.deleteBuffer(waterAreaVBO);
      gl.deleteBuffer(fallbackRoadVBO);
      gl.deleteBuffer(semTerrainVBO);
      gl.deleteBuffer(semBuildingVBO);
      for (const rg of roadGroupVBOs) gl.deleteBuffer(rg.vbo);
      gl.deleteTexture(topoTexture);
      gl.deleteTexture(satelliteTexture);
      gl.deleteTexture(landCoverTexture);
      gl.deleteTexture(slopeTexture);
      gl.deleteTexture(densityTexture);
      gl.deleteProgram(terrainProgram);
      gl.deleteProgram(infraProgram);
      gl.deleteProgram(vegProgram);
      gl.deleteProgram(grassProgram);
      gl.deleteProgram(waterProgram);
      gl.deleteProgram(particleProgram);
      gl.deleteProgram(skyProgram);
      gl.deleteProgram(precipProgram);
      gl.deleteProgram(fogProgram);
      gl.deleteProgram(waterwayProgram);
      gl.deleteProgram(roadProgram);
      gl.deleteProgram(waterAreaProgram);
      gl.deleteProgram(semanticProgram);
      gl.deleteProgram(slopeProgram);
      gl.deleteProgram(densityProgram);
      gl.deleteProgram(charShaderProg);
      gl.deleteBuffer(charVBO);
      gl.deleteBuffer(zoneVBO);
      gl.deleteBuffer(amenityVBO);
      gl.deleteProgram(zoneProgram);
      gl.deleteProgram(amenityProgram);
      gl.deleteBuffer(osmVegVBO);
      gl.deleteBuffer(barrierVBO);
      gl.deleteBuffer(sidewalkVBO);
      gl.deleteBuffer(vegFilteredVBO);
      if (lcBuildingVBO) gl.deleteBuffer(lcBuildingVBO);
      if (lcVegVBO) gl.deleteBuffer(lcVegVBO);
      if (lcWaterVBO) gl.deleteBuffer(lcWaterVBO);
      gl.deleteProgram(fireProgram);
    };
  }, [
    centerLat, centerLng, layersKey, resultData, blueprint, heightMapUrl,
    topoMapUrl, satelliteMapUrl, effectiveTopoScale, topoOffset, lightAngle, lightIntensity,
    particleIntensity, lightDir, layers.aiStructural, layers.buildings, layers.particles,
    layers.polygons, layers.residential, layers.satellite, layers.streets, layers.terrain,
    layers.topography, layers.semantic, layers.slope, layers.density, layers.sunSync,
    layers.naturalAreas, layers.landUseZones, layers.paving, layers.amenities,
    buildingOffsetX, buildingOffsetY,
    worldSpanX, worldSpanZ, areaHalfX, areaHalfZ, mapPos, rawElevRange
  ]);

  useEffect(() => {
    const id = setInterval(() => {
      setCompassBearing(compassBearingRef.current);
    }, 150);
    return () => clearInterval(id);
  }, []);

  const citySpanKm = (Math.max(worldSpanX, worldSpanZ) / 1000).toFixed(1);

  return (
    <Box w="full" h="full" bg="#030508" overflow="hidden" cursor="crosshair" position="relative">
      {/* ── STATUS HUD (top-left) ─────────────────────────────────────────────── */}
      <Box
        position="absolute" top={4} left={4} zIndex={10}
        bg="rgba(0,8,16,0.80)" p={3} borderRadius="md"
        border="1px solid rgba(0,200,255,0.18)" backdropFilter="blur(8px)"
        fontFamily="monospace" pointerEvents="none" minW="220px"
      >
        <div style={{ color: '#00d4ff', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>
          HYDRA CORE v4.0 // {layers.satellite ? 'SATELLITE_REAL' : 'TACTICAL_MODE'}
        </div>
        <div style={{ color: '#cce8ff', fontSize: '10px', lineHeight: '1.6', opacity: 0.85 }}>
          LOC: {centerLat?.toFixed(4) ?? '0.0000'}, {centerLng?.toFixed(4) ?? '0.0000'}<br/>
          ESCALA: {citySpanKm} km // MESH: {dataReady ? 'REAL_OSM' : 'PROCEDURAL'}<br/>
          SATÉLITE: {satLoaded ? '✓ ESRI' : '⟳ CARREGANDO'}<br/>
          SEMÂNTICA: {semanticReady ? `✓ ATIVO` : '⟳ PENDENTE'}{layers.semantic ? ' [ON]' : ' [OFF]'}<br/>
          {semanticMeta && (
            <>VEG:{semanticMeta.vegetationPct}% ÁGU:{semanticMeta.waterPct}% EDIF:{semanticMeta.buildingPct}%<br/></>
          )}
          OBJ: {buildingCount} // P: {simData.pressure} hPa / I: {simData.intensity}%<br/>
          {fpModeDisplay  ? '[ F ] PRIMEIRA PESSOA — ESC para sair | ⇧ = Correr' :
           godModeDisplay ? '[ G ] MODO DEUS — visão macro | Q/E = altitude' :
           '[ F ] 1ª Pessoa  [ G ] Modo Deus'}
        </div>
      </Box>

      {/* ── COMPASS (bottom-right) ────────────────────────────────────────────── */}
      <Box
        position="absolute" bottom={6} right={6} zIndex={10}
        w="90px" h="90px" pointerEvents="none"
      >
        <svg viewBox="0 0 90 90" width="90" height="90">
          {/* Outer ring */}
          <circle cx="45" cy="45" r="42" fill="rgba(0,8,16,0.75)" stroke="rgba(0,200,255,0.30)" strokeWidth="1.5"/>
          {/* Rotating rose */}
          <g transform={`rotate(${-compassBearing * 180 / Math.PI}, 45, 45)`}>
            {/* N — red */}
            <polygon points="45,8 41,42 45,36 49,42" fill="#ef4444"/>
            {/* S — white */}
            <polygon points="45,82 41,48 45,54 49,48" fill="rgba(255,255,255,0.55)"/>
            {/* E */}
            <polygon points="82,45 48,41 54,45 48,49" fill="rgba(255,255,255,0.35)"/>
            {/* W */}
            <polygon points="8,45 42,41 36,45 42,49" fill="rgba(255,255,255,0.35)"/>
          </g>
          {/* Fixed center dot */}
          <circle cx="45" cy="45" r="3.5" fill="#00d4ff"/>
          {/* Cardinal labels — fixed */}
          <text x="45" y="6" textAnchor="middle" fill="#ef4444" fontSize="8" fontFamily="monospace" fontWeight="bold">N</text>
          <text x="45" y="88" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="7" fontFamily="monospace">S</text>
          <text x="85" y="48" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="7" fontFamily="monospace">E</text>
          <text x="5" y="48" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="7" fontFamily="monospace">O</text>
        </svg>
      </Box>

      {/* ── NAVIGATION GUIDE (bottom-left, dismissable) ───────────────────────── */}
      {showNavHelp && (
        <Box
          position="absolute" bottom={6} left={4} zIndex={10}
          bg="rgba(0,8,16,0.80)" p={3} borderRadius="md"
          border="1px solid rgba(0,200,255,0.18)" backdropFilter="blur(8px)"
          fontFamily="monospace"
        >
          <Box
            as="button"
            position="absolute" top={1} right={2}
            color="whiteAlpha.500"
            fontSize="10px"
            onClick={() => setShowNavHelp(false)}
            _hover={{ color: 'white' }}
          >✕</Box>
          <div style={{ color: '#00d4ff', fontSize: '9px', fontWeight: 'bold', marginBottom: '4px' }}>NAVEGAÇÃO 3D</div>
          <div style={{ color: '#cce8ff', fontSize: '9px', lineHeight: '1.8', opacity: 0.85 }}>
            🖱 Arraste → Orbitar câmera<br/>
            ⇧ + Arraste → Transladar<br/>
            🖱 Scroll → Zoom<br/>
            W A S D → Mover câmera / personagem<br/>
            ⇧ + WASD → Correr (modo 1ª pessoa)<br/>
            F → Visão de 1ª pessoa<br/>
            G → Modo deus (visão macro)<br/>
            Q / E → Subir / Descer (modo deus)<br/>
            ESC → Sair da 1ª pessoa<br/>
            . / Del → Centrar cena
          </div>
        </Box>
      )}

      {/* ── SELECTION PANEL ───────────────────────────────────────────────────── */}
      {selectedBuilding && (
        <Box
          position="absolute" top={4} right={4} zIndex={20}
          bg="rgba(0,8,20,0.92)" borderRadius="xl"
          border="1px solid rgba(0,200,255,0.30)" backdropFilter="blur(12px)"
          fontFamily="monospace" minW="220px" maxW="260px" overflow="hidden"
        >
          {/* Header */}
          <Box
            px={3} py={2}
            bg="rgba(0,200,255,0.10)"
            borderBottom="1px solid rgba(0,200,255,0.15)"
            display="flex" alignItems="center" justifyContent="space-between"
          >
            <div style={{ color: '#00d4ff', fontSize: '10px', fontWeight: 'bold' }}>
              ▣ OBJETO SELECIONADO
            </div>
            <Box
              as="button"
              color="whiteAlpha.400" fontSize="11px"
              onClick={() => { setSelectedBuilding(null); selectedBuildingRef.current = null; }}
              _hover={{ color: 'white' }}
              lineHeight="1"
            >✕</Box>
          </Box>
          {/* Body */}
          <Box px={3} py={2.5} fontSize="10px" lineHeight="1.9" color="#cce8ff">
            <div>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>TIPO&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
              <span style={{ color: '#00d4ff' }}>EDIFÍCIO</span>
            </div>
            <div>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>USO&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
              <span>{(selectedBuilding.buildingUse ?? 'residential').toUpperCase()}</span>
            </div>
            <div>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>PISOS&nbsp;&nbsp;&nbsp;&nbsp;</span>
              <span>{selectedBuilding.levels}</span>
            </div>
            <div>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>ALTURA&nbsp;&nbsp;&nbsp;</span>
              <span>{selectedBuilding.height.toFixed(1)} m</span>
            </div>
            <div>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>LAT&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
              <span>{selectedBuilding.lat.toFixed(5)}</span>
            </div>
            <div>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>LNG&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
              <span>{selectedBuilding.lng.toFixed(5)}</span>
            </div>
            <div>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>DIM X&nbsp;&nbsp;&nbsp;&nbsp;</span>
              <span>{(selectedBuilding.maxX - selectedBuilding.minX).toFixed(1)} m</span>
            </div>
            <div>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>DIM Z&nbsp;&nbsp;&nbsp;&nbsp;</span>
              <span>{(selectedBuilding.maxZ - selectedBuilding.minZ).toFixed(1)} m</span>
            </div>
          </Box>
          <Box
            px={3} py={1.5}
            borderTop="1px solid rgba(0,200,255,0.10)"
            fontSize="9px" color="rgba(255,255,255,0.3)"
          >
            Clique em outro edifício ou no terreno para deselecionar
          </Box>
        </Box>
      )}

      {/* ── MAIN CANVAS ───────────────────────────────────────────────────────── */}
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
        width={window.innerWidth  * window.devicePixelRatio}
        height={window.innerHeight * window.devicePixelRatio}
      />
    </Box>
  );
};
