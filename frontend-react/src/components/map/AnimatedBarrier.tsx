import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface AnimatedBarrierProps {
  points: [number, number, number][]; // 3D path points
  height?: number;
  color?: string;
  opacity?: number;
  speed?: number;
}

export const AnimatedBarrier: React.FC<AnimatedBarrierProps> = ({
  points,
  height = 2,
  color = '#22d3ee',
  opacity = 0.4,
  speed = 1
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  // Create a wall geometry along the path
  const geometry = useMemo(() => {
    if (points.length < 2) return new THREE.BufferGeometry();

    const vertices: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];

        const baseIdx = (vertices.length / 3);

        // 4 vertices for the segment rectangle
        vertices.push(p1[0], 0, p1[2]);         // Bottom left
        vertices.push(p2[0], 0, p2[2]);         // Bottom right
        vertices.push(p2[0], height, p2[2]);    // Top right
        vertices.push(p1[0], height, p1[2]);    // Top left

        // 2 triangles for the segment
        indices.push(baseIdx, baseIdx + 1, baseIdx + 2);
        indices.push(baseIdx, baseIdx + 2, baseIdx + 3);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, [points, height]);

  useFrame((state) => {
    if (materialRef.current) {
      // Pulse effect
      materialRef.current.opacity = opacity + Math.sin(state.clock.elapsedTime * 3 * speed) * 0.1 * opacity;
      materialRef.current.emissiveIntensity = 0.5 + Math.sin(state.clock.elapsedTime * 2 * speed) * 0.3;
    }
  });

  if (points.length < 2) return null;

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshPhysicalMaterial
        ref={materialRef as any}
        color={color}
        transparent
        opacity={0.15}
        wireframe={true}
        blending={THREE.AdditiveBlending}
        emissive={color}
        emissiveIntensity={0.3}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
};
