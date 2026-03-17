import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimulationStore } from '../../../store/useSimulationStore';

export const HazardOverlay: React.FC = () => {
  const { box, waterLevel, hazardType, isSimulating } = useSimulationStore();
  const waterRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (waterRef.current && (hazardType === 'Flood' || hazardType === 'DamBreak')) {
      // Subtle water movement, faster if simulating
      const speed = isSimulating ? 1.5 : 0.5;
      waterRef.current.position.y = waterLevel * 0.1 + Math.sin(state.clock.elapsedTime * speed) * 0.05;
      if (waterRef.current.material instanceof THREE.MeshPhysicalMaterial) {
        waterRef.current.material.roughness = 0.1 + Math.sin(state.clock.elapsedTime) * 0.05;
      }
    }
  });

  if (!box || waterLevel <= 0) return null;

  const x = (box.center[1] + 51.9) * 2;
  const z = -(box.center[0] + 14.2) * 2;
  const width = box.size[0] / 10000;
  const height = box.size[1] / 10000;

  // Render different abstract geometries based on hazardType
  if (hazardType === 'Flood' || hazardType === 'DamBreak') {
    return (
      <mesh ref={waterRef} position={[x, waterLevel * 0.1, z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, height, 32, 32]} />
        <meshPhysicalMaterial 
           color={hazardType === 'DamBreak' ? "#451a03" : "#0ea5e9"} 
           transparent
           opacity={0.8}
           roughness={0.1}
           transmission={0.6}
           thickness={1}
           envMapIntensity={1}
           clearcoat={1}
           clearcoatRoughness={0.1}
        />
      </mesh>
    );
  }

  if (hazardType === 'Contamination') {
    return (
      <group position={[x, 0, z]}>
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[width, height]} />
          <meshStandardMaterial 
            color="#4d7c0f" 
            transparent 
            opacity={0.4} 
            emissive="#4d7c0f"
            emissiveIntensity={0.5}
          />
        </mesh>
        <mesh position={[0, 2.5, 0]}>
          <cylinderGeometry args={[width/2, width/2.2, 5, 32]} />
          <meshStandardMaterial color="#84cc16" transparent opacity={0.1} wireframe />
        </mesh>
      </group>
    );
  }

  if (hazardType === 'Earthquake') {
    return (
      <mesh position={[x, 0.05, z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0, width * 0.8, 64]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={0.2} />
      </mesh>
    );
  }

  if (hazardType === 'Landslide') {
    return (
      <mesh position={[x, 1, z]}>
        <coneGeometry args={[width/3, 2 + waterLevel/10, 32]} />
        <meshStandardMaterial color="#78350f" roughness={1} />
      </mesh>
    );
  }

  return null;
};
