import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface LandslideSimulationProps {
  sourceLat?: number;
  sourceLng?: number;
  radiusMeters?: number;
  allowRadiusControl?: boolean;
}

interface TerrainGrid {
  gridSize: number;
  heights: number[];
  minElevation: number;
  maxElevation: number;
  source: 'open-meteo' | 'fallback';
}

interface TerrainPatchProps {
  radiusMeters: number;
  terrainGrid: TerrainGrid;
}

interface RunoutParticlesProps {
  radiusMeters: number;
  postSlideIntensity: number;
  terrainGrid: TerrainGrid;
}

const METERS_PER_DEG_LAT = 111_320;

const toRadians = (value: number) => (value * Math.PI) / 180;

const computeDegreesStep = (lat: number, radiusMeters: number, gridSize: number) => {
  const cosLat = Math.max(0.25, Math.cos(toRadians(lat)));
  const diameter = radiusMeters * 2;
  const metersPerStep = diameter / (gridSize - 1);

  return {
    latStep: metersPerStep / METERS_PER_DEG_LAT,
    lngStep: metersPerStep / (METERS_PER_DEG_LAT * cosLat),
  };
};

const buildTerrainFallback = (gridSize: number): TerrainGrid => {
  const heights: number[] = [];

  for (let row = 0; row < gridSize; row += 1) {
    for (let col = 0; col < gridSize; col += 1) {
      const x = (col / (gridSize - 1) - 0.5) * 2;
      const z = (row / (gridSize - 1) - 0.5) * 2;
      const slope = -z * 45;
      const roughness = Math.sin(x * 2.7) * 8 + Math.cos(z * 2.2) * 6;
      heights.push(820 + slope + roughness);
    }
  }

  return {
    gridSize,
    heights,
    minElevation: Math.min(...heights),
    maxElevation: Math.max(...heights),
    source: 'fallback',
  };
};

const sampleGridHeight = (terrainGrid: TerrainGrid, xNorm: number, zNorm: number) => {
  const clampedX = Math.min(0.999, Math.max(0, xNorm));
  const clampedZ = Math.min(0.999, Math.max(0, zNorm));
  const maxIndex = terrainGrid.gridSize - 1;

  const gx = clampedX * maxIndex;
  const gz = clampedZ * maxIndex;

  const x0 = Math.floor(gx);
  const z0 = Math.floor(gz);
  const x1 = Math.min(maxIndex, x0 + 1);
  const z1 = Math.min(maxIndex, z0 + 1);

  const get = (row: number, col: number) => terrainGrid.heights[row * terrainGrid.gridSize + col];

  const h00 = get(z0, x0);
  const h10 = get(z0, x1);
  const h01 = get(z1, x0);
  const h11 = get(z1, x1);

  const tx = gx - x0;
  const tz = gz - z0;

  const h0 = h00 * (1 - tx) + h10 * tx;
  const h1 = h01 * (1 - tx) + h11 * tx;
  return h0 * (1 - tz) + h1 * tz;
};

const toSceneHeight = (terrainGrid: TerrainGrid, elevation: number) => {
  const relief = Math.max(1, terrainGrid.maxElevation - terrainGrid.minElevation);
  return ((elevation - terrainGrid.minElevation) / relief) * 12 - 6;
};

const TerrainPatch = ({ radiusMeters, terrainGrid }: TerrainPatchProps) => {
  const { geometry, contourGeometry } = useMemo(() => {
    const halfExtent = Math.max(12, radiusMeters / 50);
    const segments = terrainGrid.gridSize - 1;
    const geo = new THREE.PlaneGeometry(halfExtent * 2, halfExtent * 2, segments, segments);
    geo.rotateX(-Math.PI / 2);

    const positions = geo.attributes.position;
    const colors = new Float32Array(positions.count * 3);
    const color = new THREE.Color();

    for (let i = 0; i < positions.count; i += 1) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const xNorm = (x + halfExtent) / (halfExtent * 2);
      const zNorm = (z + halfExtent) / (halfExtent * 2);
      const elevation = sampleGridHeight(terrainGrid, xNorm, zNorm);
      const normalizedElevation = (elevation - terrainGrid.minElevation) / Math.max(1, terrainGrid.maxElevation - terrainGrid.minElevation);
      const reliefNoise = Math.sin(xNorm * 18) * 0.04 + Math.cos(zNorm * 16) * 0.04;
      positions.setY(i, toSceneHeight(terrainGrid, elevation) + reliefNoise);

      const rockyBlend = Math.min(1, normalizedElevation * 1.2);
      color.setRGB(
        0.14 + rockyBlend * 0.24,
        0.21 + rockyBlend * 0.21,
        0.13 + rockyBlend * 0.16,
      );
      color.toArray(colors, i * 3);
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const contour = geo.clone();
    const contourPos = contour.attributes.position;
    for (let i = 0; i < contourPos.count; i += 1) {
      contourPos.setY(i, contourPos.getY(i) + 0.05);
    }

    return { geometry: geo, contourGeometry: contour };
  }, [radiusMeters, terrainGrid]);

  return (
    <group>
      <mesh geometry={geometry} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.94} metalness={0.05} />
      </mesh>
      <mesh geometry={contourGeometry} receiveShadow>
        <meshBasicMaterial color="#9ca3af" wireframe transparent opacity={0.12} />
      </mesh>
    </group>
  );
};

const RunoutParticles = ({ radiusMeters, postSlideIntensity, terrainGrid }: RunoutParticlesProps) => {
  const count = 2500;
  const halfExtent = Math.max(12, radiusMeters / 50);

  const positions = useMemo(() => {
    const data = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const n0 = (Math.sin((i + 1) * 12.9898) + 1) * 0.5;
      const n1 = (Math.sin((i + 1) * 78.233) + 1) * 0.5;
      const n2 = (Math.sin((i + 1) * 39.425) + 1) * 0.5;
      data[i * 3] = (n0 - 0.5) * (halfExtent * 0.9);
      data[i * 3 + 1] = 6 + n1 * 4;
      data[i * 3 + 2] = -halfExtent * 0.8 + n2 * 4;
    }
    return data;
  }, [count, halfExtent]);

  const velocitiesRef = useRef<Float32Array>(new Float32Array(count * 3));

  useEffect(() => {
    const velocities = velocitiesRef.current;
    for (let i = 0; i < count; i += 1) {
      const n0 = (Math.sin((i + 1) * 22.111) + 1) * 0.5;
      const n1 = (Math.sin((i + 1) * 54.317) + 1) * 0.5;
      const n2 = (Math.sin((i + 1) * 93.733) + 1) * 0.5;
      velocities[i * 3] = (n0 - 0.5) * 0.05;
      velocities[i * 3 + 1] = -0.1 - n1 * 0.08;
      velocities[i * 3 + 2] = 0.08 + n2 * 0.12;
    }
  }, [count]);

  const geometryRef = useRef<THREE.BufferGeometry>(null);

  useFrame(() => {
    if (!geometryRef.current) return;

    const posAttribute = geometryRef.current.attributes.position;
    const posArray = posAttribute.array as Float32Array;
    const videoPush = postSlideIntensity * 0.004;

    for (let i = 0; i < count; i += 1) {
      const velocities = velocitiesRef.current;
      posArray[i * 3] += velocities[i * 3];
      posArray[i * 3 + 1] += velocities[i * 3 + 1];
      posArray[i * 3 + 2] += velocities[i * 3 + 2];

      const x = posArray[i * 3];
      const z = posArray[i * 3 + 2];
      const xNorm = (x + halfExtent) / (halfExtent * 2);
      const zNorm = (z + halfExtent) / (halfExtent * 2);
      const terrainY = toSceneHeight(terrainGrid, sampleGridHeight(terrainGrid, xNorm, zNorm));

      if (posArray[i * 3 + 1] <= terrainY + 0.2) {
        posArray[i * 3 + 1] = terrainY + 0.2;
        velocities[i * 3 + 1] = -0.02;
        velocities[i * 3 + 2] += 0.004 + videoPush;
        velocities[i * 3] += (Math.sin(i * 17.13) * 0.5) * (0.006 + videoPush * 0.5);
      }

      if (z > halfExtent || posArray[i * 3 + 1] < -10 || xNorm < -0.1 || xNorm > 1.1 || zNorm > 1.2) {
        const n0 = (Math.sin((i + 1) * 12.9898 + z * 0.1) + 1) * 0.5;
        const n1 = (Math.sin((i + 1) * 78.233 + x * 0.2) + 1) * 0.5;
        const n2 = (Math.sin((i + 1) * 39.425 + z * 0.15) + 1) * 0.5;
        posArray[i * 3] = (n0 - 0.5) * (halfExtent * 0.9);
        posArray[i * 3 + 1] = 6 + n1 * 4;
        posArray[i * 3 + 2] = -halfExtent * 0.8 + n2 * 4;
        velocities[i * 3] = (n0 - 0.5) * 0.05;
        velocities[i * 3 + 1] = -0.1 - n1 * 0.08;
        velocities[i * 3 + 2] = 0.08 + n2 * 0.12;
      }
    }

    posAttribute.needsUpdate = true;
  });

  return (
    <points>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.24} color="#b97346" transparent opacity={0.62} />
    </points>
  );
};


async function fetchOpenTopoDataBatch(latValues: number[], lngValues: number[]): Promise<number[]> {
  const locations = latValues.map((lat, index) => `${lat},${lngValues[index]}`).join('|');
  const response = await fetch(`https://api.opentopodata.org/v1/mapzen?locations=${encodeURIComponent(locations)}`);

  if (!response.ok) {
    throw new Error('Falha no provedor secundário de elevação.');
  }

  const data = await response.json();
  const results = data?.results as Array<{ elevation?: number }> | undefined;

  if (!Array.isArray(results) || results.length === 0) {
    throw new Error('Sem dados no provedor secundário de elevação.');
  }

  return results.map((item) => Number(item?.elevation) || 0);
}

async function fetchTopographyGrid(sourceLat: number, sourceLng: number, radiusMeters: number, gridSize: number): Promise<TerrainGrid> {
  const { latStep, lngStep } = computeDegreesStep(sourceLat, radiusMeters, gridSize);

  const allLat: number[] = [];
  const allLng: number[] = [];
  for (let row = 0; row < gridSize; row += 1) {
    for (let col = 0; col < gridSize; col += 1) {
      const lat = sourceLat + (row - (gridSize - 1) / 2) * latStep;
      const lng = sourceLng + (col - (gridSize - 1) / 2) * lngStep;
      allLat.push(lat);
      allLng.push(lng);
    }
  }

  const batchSize = 80;
  const elevations: number[] = [];

  for (let start = 0; start < allLat.length; start += batchSize) {
    const latBatch = allLat.slice(start, start + batchSize).join(',');
    const lngBatch = allLng.slice(start, start + batchSize).join(',');
    const params = new URLSearchParams({
      latitude: latBatch,
      longitude: lngBatch,
    });

    let batch: number[] = [];

    try {
      const response = await fetch(`https://api.open-meteo.com/v1/elevation?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Open-Meteo indisponível para este lote.');
      }

      const data = await response.json();
      const openMeteoBatch = data?.elevation as number[] | undefined;

      if (!Array.isArray(openMeteoBatch) || openMeteoBatch.length === 0) {
        throw new Error('Open-Meteo sem dados para este lote.');
      }

      batch = openMeteoBatch.map((value) => Number(value) || 0);
    } catch {
      batch = await fetchOpenTopoDataBatch(allLat.slice(start, start + batchSize), allLng.slice(start, start + batchSize));
    }

    elevations.push(...batch);
  }

  if (elevations.length !== allLat.length) {
    throw new Error('Malha topográfica incompleta para o ponto selecionado.');
  }

  return {
    gridSize,
    heights: elevations,
    minElevation: Math.min(...elevations),
    maxElevation: Math.max(...elevations),
    source: 'open-meteo',
  };
}

export default function LandslideSimulation({
  sourceLat = -21.1215,
  sourceLng = -42.9427,
  radiusMeters = 500,
  allowRadiusControl = true,
}: LandslideSimulationProps) {
  const [localRadiusMeters, setLocalRadiusMeters] = useState(radiusMeters);
  const [postSlideIntensity, setPostSlideIntensity] = useState(60);
  const [terrainGrid, setTerrainGrid] = useState<TerrainGrid>(buildTerrainFallback(33));
  const [loadingTopography, setLoadingTopography] = useState(true);
  const [topographyError, setTopographyError] = useState('');

  useEffect(() => {
    setLocalRadiusMeters(radiusMeters);
  }, [radiusMeters]);

  useEffect(() => {
    let active = true;
    setLoadingTopography(true);
    setTopographyError('');

    fetchTopographyGrid(sourceLat, sourceLng, localRadiusMeters, 33)
      .then((grid) => {
        if (!active) return;
        setTerrainGrid(grid);
      })
      .catch((error) => {
        if (!active) return;
        setTerrainGrid(buildTerrainFallback(33));
        setTopographyError(error instanceof Error ? error.message : 'Erro ao carregar topografia.');
      })
      .finally(() => {
        if (active) setLoadingTopography(false);
      });

    return () => {
      active = false;
    };
  }, [localRadiusMeters, sourceLat, sourceLng]);

  const projectedVelocity = (0.9 + postSlideIntensity * 0.04).toFixed(1);
  const projectedImpact = (18 + postSlideIntensity * 0.75).toFixed(0);

  return (
    <div className="w-full h-full bg-slate-900 overflow-hidden relative rounded-xl border border-slate-700 shadow-inner">
      <div className="absolute top-3 left-3 z-10 bg-slate-800/85 border border-slate-600 px-3 py-2 rounded-md text-xs text-white font-semibold backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
          Simulação 3D localizada
        </div>
        <p className="text-[11px] text-slate-300 mt-1">
          Centro: {sourceLat.toFixed(4)}, {sourceLng.toFixed(4)} · Janela: {localRadiusMeters}m
        </p>
        <p className="text-[11px] text-cyan-300 mt-1">Topografia: {terrainGrid.source === 'open-meteo' ? 'malha real de elevação' : 'fallback local'}</p>
      </div>

      <div className="absolute top-3 right-3 z-10 bg-slate-800/85 border border-slate-600 px-3 py-2 rounded-md text-[11px] text-slate-200 backdrop-blur-md">
        <p>Velocidade projetada: <span className="text-amber-300 font-semibold">{projectedVelocity} m/s</span></p>
        <p>Impacto relativo: <span className="text-orange-300 font-semibold">{projectedImpact} kPa</span></p>
      </div>

      <div className="absolute bottom-3 left-3 right-3 z-10 grid md:grid-cols-2 gap-2 bg-slate-900/80 border border-slate-700 rounded-lg p-3 text-[11px]">
        {allowRadiusControl ? (
          <label className="space-y-1">
            <span className="text-slate-300">Área local renderizada (m)</span>
            <input type="range" min={300} max={1500} step={50} value={localRadiusMeters} onChange={(e) => setLocalRadiusMeters(Number(e.target.value))} className="w-full" />
          </label>
        ) : (
          <div className="space-y-1">
            <span className="text-slate-300">Área local renderizada (fixa)</span>
            <p className="text-amber-300 font-semibold">500m de raio</p>
          </div>
        )}
        <label className="space-y-1">
          <span className="text-slate-300">Influência pós-deslizamento (vídeo/proxy)</span>
          <input type="range" min={0} max={100} step={1} value={postSlideIntensity} onChange={(e) => setPostSlideIntensity(Number(e.target.value))} className="w-full" />
        </label>
      </div>

      {loadingTopography && (
        <div className="absolute inset-0 z-20 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center text-sm text-slate-200">
          Renderizando topografia real do ponto selecionado...
        </div>
      )}

      {!loadingTopography && topographyError && (
        <div className="absolute top-20 left-3 z-20 max-w-[380px] bg-amber-900/70 border border-amber-600 rounded px-3 py-2 text-[11px] text-amber-100">
          {topographyError} Usando relevo aproximado para manter a visualização ativa.
        </div>
      )}

      <Canvas camera={{ position: [12, 10, 14], fov: 47 }} shadows>
        <ambientLight intensity={0.42} />
        <directionalLight position={[10, 20, 5]} intensity={1.15} castShadow />
        <directionalLight position={[-8, 6, -4]} intensity={0.35} color="#93c5fd" />
        <fog attach="fog" args={['#0f172a', 18, 45]} />
        <color attach="background" args={['#0f172a']} />

        <TerrainPatch radiusMeters={localRadiusMeters} terrainGrid={terrainGrid} />
        {!loadingTopography && (
          <RunoutParticles
            radiusMeters={localRadiusMeters}
            postSlideIntensity={postSlideIntensity}
            terrainGrid={terrainGrid}
          />
        )}

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={5}
          maxDistance={40}
          target={[0, -1, 0]}
          maxPolarAngle={Math.PI / 2 - 0.08}
          autoRotate
          autoRotateSpeed={0.35}
        />
      </Canvas>
    </div>
  );
}
