import React, { useMemo, useEffect, useRef } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { projectTo3D } from '../../utils/projection';
import { MapPin, AlertCircle, Home, Hospital, TreePine } from 'lucide-react';

interface MarkerProps {
  lat: number;
  lon: number;
  type: 'risk' | 'hospital' | 'base' | 'incident' | 'vegetation';
  label: string;
  severity?: number;
}

const MarkerIcon = ({ type }: { type: MarkerProps['type'] }) => {
  switch (type) {
    case 'risk': return <AlertCircle className="text-red-500" size={16} />;
    case 'hospital': return <Hospital className="text-blue-400" size={16} />;
    case 'base': return <Home className="text-emerald-400" size={16} />;
    case 'vegetation': return <TreePine className="text-green-500" size={16} />;
    default: return <MapPin className="text-cyan-400" size={16} />;
  }
};

export const Tactical3DMarkers: React.FC<{ markers: MarkerProps[] }> = ({ markers }) => {
  const polesRef = useRef<THREE.InstancedMesh>(null);
  const ringsRef = useRef<THREE.InstancedMesh>(null);

  const markerData = useMemo(() => {
    return markers.map((m) => {
      const [x, z] = projectTo3D(m.lat, m.lon);
      const color = m.type === 'risk' ? '#ef4444' : m.type === 'hospital' ? '#3b82f6' : '#22d3ee';
      return { x, z, color: new THREE.Color(color), ...m };
    });
  }, [markers]);

  useEffect(() => {
    if (!polesRef.current || !ringsRef.current) return;

    const tempObject = new THREE.Object3D();

    markerData.forEach((m, i) => {
      // Setup Pole
      tempObject.position.set(m.x, 0.5, m.z);
      tempObject.scale.set(1, 1, 1);
      tempObject.rotation.set(0, 0, 0);
      tempObject.updateMatrix();
      polesRef.current!.setMatrixAt(i, tempObject.matrix);
      polesRef.current!.setColorAt(i, m.color);

      // Setup Ring
      tempObject.position.set(m.x, -0.45, m.z);
      tempObject.rotation.set(-Math.PI / 2, 0, 0);
      tempObject.updateMatrix();
      ringsRef.current!.setMatrixAt(i, tempObject.matrix);
      ringsRef.current!.setColorAt(i, m.color);
    });

    polesRef.current.instanceMatrix.needsUpdate = true;
    if (polesRef.current.instanceColor) polesRef.current.instanceColor.needsUpdate = true;
    
    ringsRef.current.instanceMatrix.needsUpdate = true;
    if (ringsRef.current.instanceColor) ringsRef.current.instanceColor.needsUpdate = true;
  }, [markerData]);

  return (
    <group>
      <instancedMesh ref={polesRef} args={[undefined as any, undefined as any, markers.length]}>
        <cylinderGeometry args={[0.01, 0.02, 1, 8]} />
        <meshStandardMaterial metalness={0.8} roughness={0.2} />
      </instancedMesh>

      <instancedMesh ref={ringsRef} args={[undefined as any, undefined as any, markers.length]}>
        <ringGeometry args={[0.2, 0.3, 32]} />
        <meshBasicMaterial transparent opacity={0.2} />
      </instancedMesh>

      {/* Keep labels as expensive HTML for now, but only if they are critical */}
      {markers.map((m, i) => {
        const [x, z] = projectTo3D(m.lat, m.lon);
        return (
          <Html key={i} distanceFactor={15} position={[x, 1.7, z]} transform occlude>
            <div className="flex flex-col items-center group pointer-events-auto cursor-pointer">
              <div className={`p-1.5 rounded-full bg-slate-950/80 backdrop-blur-md border animate-bounce ${
                m.type === 'risk' ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]' :
                m.type === 'hospital' ? 'border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]' :
                'border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.3)]'
              }`}>
                <MarkerIcon type={m.type} />
              </div>
            </div>
          </Html>
        );
      })}
    </group>
  );
};
