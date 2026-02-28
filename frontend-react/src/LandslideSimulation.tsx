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

interface TerrainPatchProps {
  sourceLat: number;
  sourceLng: number;
  radiusMeters: number;
}

interface RunoutParticlesProps {
  sourceLat: number;
  sourceLng: number;
  radiusMeters: number;
  postSlideIntensity: number;
}

const seededNoise = (x: number, z: number, seedA: number, seedB: number) => {
  return (
    Math.sin((x + seedA) * 0.8) * 1.3 +
    Math.cos((z + seedB) * 0.7) * 1.2 +
    Math.sin((x + seedB) * 2.4) * 0.35 +
    Math.cos((z + seedA) * 2.1) * 0.3
  );
};

const TerrainPatch = ({ sourceLat, sourceLng, radiusMeters }: TerrainPatchProps) => {
  const geometry = useMemo(() => {
    const halfExtent = Math.max(12, radiusMeters / 50);
    const geo = new THREE.PlaneGeometry(halfExtent * 2, halfExtent * 2, 128, 128);
    geo.rotateX(-Math.PI / 2);

    const seedA = sourceLat * 100;
    const seedB = sourceLng * 100;
    const positions = geo.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      const vx = positions.getX(i);
      const vz = positions.getZ(i);
      const slope = -vz * 0.55;
      const roughness = seededNoise(vx, vz, seedA, seedB);
      positions.setY(i, slope + roughness);
    }

    geo.computeVertexNormals();
    return geo;
  }, [radiusMeters, sourceLat, sourceLng]);

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial color="#263246" roughness={0.92} metalness={0.08} />
    </mesh>
  );
};

const RunoutParticles = ({ sourceLat, sourceLng, radiusMeters, postSlideIntensity }: RunoutParticlesProps) => {
  const count = 2500;
  const halfExtent = Math.max(12, radiusMeters / 50);
  const seedA = sourceLat * 100;
  const seedB = sourceLng * 100;

  const positions = useMemo(() => {
    const data = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      data[i * 3] = (Math.random() - 0.5) * (halfExtent * 0.9);
      data[i * 3 + 1] = 8 + Math.random() * 4;
      data[i * 3 + 2] = -halfExtent * 0.8 + Math.random() * 4;
    }
    return data;
  }, [count, halfExtent]);

  const velocities = useMemo(() => {
    const data = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      data[i * 3] = (Math.random() - 0.5) * 0.05;
      data[i * 3 + 1] = -0.1 - Math.random() * 0.08;
      data[i * 3 + 2] = 0.08 + Math.random() * 0.12;
    }
    return data;
  }, [count]);

  const geometryRef = useRef<THREE.BufferGeometry>(null);

  useFrame(() => {
    if (!geometryRef.current) return;

    const posAttribute = geometryRef.current.attributes.position;
    const posArray = posAttribute.array as Float32Array;
    const videoPush = postSlideIntensity * 0.004;

    for (let i = 0; i < count; i++) {
      posArray[i * 3] += velocities[i * 3];
      posArray[i * 3 + 1] += velocities[i * 3 + 1];
      posArray[i * 3 + 2] += velocities[i * 3 + 2];

      const x = posArray[i * 3];
      const z = posArray[i * 3 + 2];
      const terrainY = -z * 0.55 + seededNoise(x, z, seedA, seedB);

      if (posArray[i * 3 + 1] <= terrainY + 0.2) {
        posArray[i * 3 + 1] = terrainY + 0.2;
        velocities[i * 3 + 1] = -0.02;
        velocities[i * 3 + 2] += 0.004 + videoPush;
        velocities[i * 3] += (Math.random() - 0.5) * (0.006 + videoPush * 0.5);
      }

      if (z > halfExtent || posArray[i * 3 + 1] < -10) {
        posArray[i * 3] = (Math.random() - 0.5) * (halfExtent * 0.9);
        posArray[i * 3 + 1] = 8 + Math.random() * 4;
        posArray[i * 3 + 2] = -halfExtent * 0.8 + Math.random() * 4;
        velocities[i * 3] = (Math.random() - 0.5) * 0.05;
        velocities[i * 3 + 1] = -0.1 - Math.random() * 0.08;
        velocities[i * 3 + 2] = 0.08 + Math.random() * 0.12;
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

export default function LandslideSimulation({
  sourceLat = -21.1215,
  sourceLng = -42.9427,
  radiusMeters = 500,
  allowRadiusControl = true,
}: LandslideSimulationProps) {
  const [localRadiusMeters, setLocalRadiusMeters] = useState(radiusMeters);
  const [postSlideIntensity, setPostSlideIntensity] = useState(60);

  useEffect(() => {
    setLocalRadiusMeters(radiusMeters);
  }, [radiusMeters]);

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

      <Canvas camera={{ position: [12, 10, 14], fov: 47 }} shadows>
        <ambientLight intensity={0.42} />
        <directionalLight position={[10, 20, 5]} intensity={1.15} castShadow />
        <color attach="background" args={['#0f172a']} />

        <TerrainPatch sourceLat={sourceLat} sourceLng={sourceLng} radiusMeters={localRadiusMeters} />
        <RunoutParticles
          sourceLat={sourceLat}
          sourceLng={sourceLng}
          radiusMeters={localRadiusMeters}
          postSlideIntensity={postSlideIntensity}
        />

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
