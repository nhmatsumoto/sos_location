import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Text, Float } from '@react-three/drei';
import { projectTo3D } from '../../utils/projection';

interface Alert3D {
  id: string;
  title: string;
  description: string;
  lat: number;
  lon: number;
  severity: number;
  pos3d: [number, number, number];
  color: string;
  polygon?: any;
}

const AlertZone: React.FC<{ alert: Alert3D }> = ({ alert }) => {
  const pillarRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (pillarRef.current) {
        // Subtle glow fluctuation
        pillarRef.current.scale.set(1 + Math.sin(time * 2) * 0.05, 1, 1 + Math.sin(time * 2) * 0.05);
    }
    if (ringRef.current) {
        // Expanding radar rings
        const s = 1 + (time % 2) * 2;
        ringRef.current.scale.set(s, s, 1);
        (ringRef.current.material as THREE.MeshBasicMaterial).opacity = 0.4 * (1 - (time % 2) / 2);
    }
    if (ring2Ref.current) {
        const s = 1 + ((time + 1) % 2) * 2;
        ring2Ref.current.scale.set(s, s, 1);
        (ring2Ref.current.material as THREE.MeshBasicMaterial).opacity = 0.4 * (1 - ((time + 1) % 2) / 2);
    }
  });

  const pillarHeight = 5 + alert.severity * 2;

  return (
    <group position={[alert.pos3d[0], 0, alert.pos3d[2]]}>
      {/* Central Pillar of Light/Intel */}
      <mesh ref={pillarRef} position={[0, pillarHeight / 2, 0]}>
        <cylinderGeometry args={[0.05, 0.2, pillarHeight, 16, 1, true]} />
        <meshStandardMaterial 
          color={alert.color} 
          emissive={alert.color} 
          emissiveIntensity={4} 
          transparent 
          opacity={0.3} 
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Radar Rings on ground */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[0.8, 1, 32]} />
        <meshBasicMaterial color={alert.color} transparent opacity={0.4} />
      </mesh>
      <mesh ref={ring2Ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[0.8, 1, 32]} />
        <meshBasicMaterial color={alert.color} transparent opacity={0.4} />
      </mesh>

      {/* Ground Glow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[1.5, 32]} />
        <meshBasicMaterial color={alert.color} transparent opacity={0.1} />
      </mesh>

      {/* Floating Info */}
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        <Text
          position={[0, pillarHeight + 0.5, 0]}
          fontSize={0.4}
          color="white"
          anchorX="center"
          anchorY="middle"
          font="Inter"
        >
          {alert.title}
        </Text>
        <Text
          position={[0, pillarHeight, 0]}
          fontSize={0.2}
          color={alert.color}
          anchorX="left"
          anchorY="middle"
          maxWidth={4}
          lineHeight={1.2}
          textAlign="center"
        >
          {alert.description.substring(0, 100) + (alert.description.length > 100 ? '...' : '')}
        </Text>
      </Float>
    </group>
  );
};

export const Tactical3DAlerts: React.FC<{ events: any[] }> = ({ events }) => {
  const alerts = useMemo(() => {
    return events
      .filter(e => e.type === 'disaster_alert' || e.is_gis_alert)
      .map(e => {
        const [x, z] = projectTo3D(e.lat, e.lon);
        const color = e.severity >= 5 ? '#ef4444' : (e.severity >= 3 ? '#fb923c' : '#fbbf24');
        return {
          ...e,
          pos3d: [x, 0, z] as [number, number, number],
          color
        } as Alert3D;
      });
  }, [events]);

  return (
    <group>
      {alerts.map(a => (
        <AlertZone key={a.id} alert={a} />
      ))}
    </group>
  );
};
