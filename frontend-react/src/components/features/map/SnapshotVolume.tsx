import React, { useRef, useState } from 'react';
import { Html, Float, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { SituationalSnapshot } from '../../../types';

interface SnapshotVolumeProps {
  snapshot: SituationalSnapshot;
  isSelected?: boolean;
}

export const SnapshotVolume: React.FC<SnapshotVolumeProps> = ({ snapshot, isSelected = false }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Projection logic: Lat/Lon to 3D Space (consistent with Tactical3DMap)
  const x = (snapshot.center[1] + 51.9) * 2;
  const z = -(snapshot.center[0] + 14.2) * 2;

  // Calculate size from bounds
  const lats = snapshot.bounds.map(b => b[0]);
  const lons = snapshot.bounds.map(b => b[1]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  // Approximate scaling for visualization
  const width = (maxLon - minLon) * 2;
  const depth = (maxLat - minLat) * 2;
  const height = 4; // Constant height for the "volume"

  return (
    <group position={[x, height / 2, z]}>
      <mesh
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[width, height, depth]} />
        <meshPhysicalMaterial
          color="#22d3ee"
          transparent
          opacity={hovered || isSelected ? 0.3 : 0.1}
          wireframe={true}
          blending={THREE.AdditiveBlending}
          emissive="#22d3ee"
          emissiveIntensity={hovered ? 1 : 0.2}
          depthWrite={false}
        />
      </mesh>

      {/* Environmental Data Tooltip */}
      {(hovered || isSelected) && (
        <Html distanceFactor={10} position={[0, height / 2 + 0.5, 0]}>
          <div className="bg-slate-900/90 border border-cyan-500/50 p-2 rounded shadow-xl backdrop-blur-md text-[10px] font-mono text-cyan-100 min-w-[120px]">
            <div className="font-bold border-b border-cyan-500/30 mb-1 pb-1 text-cyan-400 uppercase tracking-tighter">
              Snapshot Data
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">TEMP:</span>
              <span>{snapshot.environmentalData.temp ?? 'N/A'}°C</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">RAIN:</span>
              <span>{snapshot.environmentalData.rainfall ?? 0}mm</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">WIND:</span>
              <span>{snapshot.environmentalData.windSpeed ?? 'N/A'}km/h</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">SOIL:</span>
              <span className={snapshot.environmentalData.soilSaturation && snapshot.environmentalData.soilSaturation > 80 ? 'text-red-400' : ''}>
                {snapshot.environmentalData.soilSaturation?.toFixed(1) ?? 'N/A'}%
              </span>
            </div>
          </div>
        </Html>
      )}

      {/* Optional floating label */}
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        <Text
          position={[0, height / 2 + 1.2, 0]}
          fontSize={0.2}
          color="cyan"
          anchorX="center"
          anchorY="middle"
        >
          {new Date(snapshot.timestamp).toLocaleTimeString()}
        </Text>
      </Float>
    </group>
  );
};
