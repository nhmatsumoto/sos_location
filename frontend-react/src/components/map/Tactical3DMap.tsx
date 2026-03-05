import React, { useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stars, Text, Float } from '@react-three/drei';
import * as THREE from 'three';
import { SimulationBoxEditor } from './SimulationBoxEditor';
import { HazardOverlay } from './HazardOverlay';
import { SnapshotVolume } from './SnapshotVolume';
import type { SituationalSnapshot } from '../../types';
import { AnimatedBarrier } from './AnimatedBarrier';
import { useSimulationStore } from '../../store/useSimulationStore';

interface BarrierData {
  id: string;
  points: [number, number, number][];
  color?: string;
  type: 'containment' | 'restricted' | 'hazard';
}


interface Event3DProps {
  id: string;
  position: [number, number, number];
  color: string;
  label: string;
  severity: number;
  isSelected: boolean;
  onHover: (id: string | null) => void;
  onClick: (id: string) => void;
}

const EventBeacon: React.FC<Event3DProps> = ({ 
  id, 
  position, 
  color, 
  label, 
  severity, 
  isSelected,
  onHover,
  onClick
}) => {
  const meshRef = React.useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
      if (isSelected) {
        meshRef.current.scale.setScalar(1.5 + Math.sin(state.clock.elapsedTime * 5) * 0.2);
      }
    }
  });

  return (
    <group position={position}>
      {/* Label */}
      {isSelected && (
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
          <Text
            position={[0, severity * 0.5 + 1.5, 0]}
            fontSize={0.4}
            color="white"
            anchorX="center"
            anchorY="middle"
            font="/fonts/Inter-Bold.woff" // Assuming font exists or fallback
          >
            {label}
          </Text>
        </Float>
      )}

      {/* Main Beacon Column */}
      <mesh 
        ref={meshRef}
        onPointerOver={() => onHover(id)}
        onPointerOut={() => onHover(null)}
        onClick={() => onClick(id)}
      >
        <cylinderGeometry args={[0.2, 0.4, severity * 0.5, 16]} />
        <meshStandardMaterial 
          color={color} 
          emissive={color} 
          emissiveIntensity={isSelected ? 5 : 1}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Ground Pulse */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -severity * 0.25, 0]}>
        <ringGeometry args={[0.5, 0.6, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} />
      </mesh>
      
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -severity * 0.25 + 0.05, 0]}>
          <ringGeometry args={[0.5, 1.5, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.1}>
            {/* Pulsing ring would need a custom material or state */}
          </meshBasicMaterial>
        </mesh>
      )}
    </group>
  );
};

interface Tactical3DMapProps {
  events: any[];
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onClick: (p: any) => void;
  enableSimulationBox?: boolean;
  activeSnapshots?: SituationalSnapshot[];
  barriers?: BarrierData[];
}

export const Tactical3DMap: React.FC<Tactical3DMapProps> = ({ 
  events, 
  hoveredId,
  onHover,
  onClick,
  enableSimulationBox = false,
  activeSnapshots = [],
  barriers = []
}) => {
  const { environment, isSimulating } = useSimulationStore();
  
  // Projection logic: Lat/Lon to 3D Space
  const coords = useMemo(() => {
    if (!events.length) return [];
    return events.map(e => {
        const x = (e.lon + 51.9) * 2;
        const z = -(e.lat + 14.2) * 2;
        const color = getEventColor(e.event_type || e.type, e.severity);
        
        return {
            ...e,
            pos3d: [x, e.severity * 0.25, z] as [number, number, number],
            color
        };
    });
  }, [events]);

  return (
    <div className="w-full h-full bg-slate-950 rounded-lg overflow-hidden border border-slate-800">
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[10, 10, 10]} fov={50} />
        <OrbitControls 
            enablePan={true} 
            maxPolarAngle={Math.PI / 2.1} 
            minDistance={2}
            maxDistance={50}
        />
        
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={1} castShadow />
        <spotLight position={[-10, 20, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />

        {/* Tactical Grid Floor */}
        <gridHelper args={[100, 50, 0x1e293b, 0x0f172a]} position={[0, -0.1, 0]} />
        
        {/* Ground Plane */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]} receiveShadow>
            <planeGeometry args={[100, 100]} />
            <meshStandardMaterial color="#020617" />
        </mesh>

        {/* Global/Domain Events */}
        {coords.map((e) => (
          <EventBeacon
            key={e.id || `${e.provider}-${e.provider_event_id}`}
            id={e.id || `${e.provider}-${e.provider_event_id}`}
            position={e.pos3d}
            color={e.color}
            label={e.title || e.label || "Evento"}
            severity={e.severity}
            isSelected={hoveredId === (e.id || `${e.provider}-${e.provider_event_id}`)}
            onHover={onHover}
            onClick={() => onClick(e)}
          />
        ))}

        {/* Atmosphere/Fog - Reacts to store */}
        <fog attach="fog" args={['#020617', 10, 60 - environment.fog * 40]} />

        {/* Situational Snapshots */}
        {activeSnapshots.map((snap) => (
          <SnapshotVolume key={snap.id} snapshot={snap} />
        ))}

        {/* Active Barriers */}
        {barriers.map((barrier) => (
          <AnimatedBarrier 
            key={barrier.id} 
            points={barrier.points} 
            color={barrier.color || (barrier.type === 'hazard' ? '#ef4444' : '#22d3ee')}
            height={barrier.type === 'containment' ? 1.5 : 2.5}
          />
        ))}

        {enableSimulationBox && <SimulationBoxEditor />}
        {enableSimulationBox && <HazardOverlay />}

        {/* Weather Particles */}
        <WeatherParticles intensity={environment.rain} isSimulating={isSimulating} />
      </Canvas>

      <div className="absolute bottom-4 left-4 pointer-events-none">
        <div className="text-[10px] text-cyan-500/50 uppercase tracking-[0.2em] font-bold">
           Situation Room 3D v1.0 // Real-time Uplink Active {isSimulating && " // PROJECTION_ACTIVE"}
        </div>
      </div>
    </div>
  );
};

const WeatherParticles: React.FC<{ intensity: number; isSimulating: boolean }> = ({ intensity, isSimulating }) => {
  const pointsRef = React.useRef<THREE.Points>(null);
  const count = 1000;
  
  const positions = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * 50;
      p[i * 3 + 1] = Math.random() * 20;
      p[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }
    return p;
  }, []);

  useFrame(() => {
    if (!pointsRef.current || intensity <= 0) return;
    const pos = pointsRef.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] -= (0.1 + intensity * 0.2) * (isSimulating ? 1.5 : 1);
      if (pos[i * 3 + 1] < 0) pos[i * 3 + 1] = 20;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  if (intensity <= 0) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial 
        size={0.05} 
        color="#93c5fd" 
        transparent 
        opacity={0.3 * intensity} 
        blending={THREE.AdditiveBlending} 
      />
    </points>
  );
}

function getEventColor(type: string, severity: number): string {
  if (!type) return '#22d3ee';
  if (type.includes('Rescue')) return '#f87171'; // Red
  if (type.includes('Donation')) return '#4ade80'; // Green
  if (type.includes('Search')) return '#fbbf24'; // Yellow
  if (type.includes('Assignment')) return '#818cf8'; // Indigo
  if (type.includes('Expense')) return '#f472b6'; // Pink
  if (severity >= 4) return '#ef4444'; // Critical Red
  return '#22d3ee'; // Default Cyan
}
