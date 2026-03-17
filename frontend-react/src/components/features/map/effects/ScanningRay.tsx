import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const ScanningRay: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.z = Math.sin(state.clock.elapsedTime * 0.5) * 50;
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
      <planeGeometry args={[100, 2]} />
      <meshBasicMaterial color="#22d3ee" transparent opacity={0.1} />
    </mesh>
  );
};
