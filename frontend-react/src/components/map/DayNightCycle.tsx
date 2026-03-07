import React, { useMemo } from 'react';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';

interface DayNightCycleProps {
  timeOfDay?: number; // 0 to 24
}

export const DayNightCycle: React.FC<DayNightCycleProps> = ({ timeOfDay = 12 }) => {
  const sunPosition = useMemo(() => {
    const angle = (timeOfDay / 24) * Math.PI * 2 - Math.PI / 2;
    return new THREE.Vector3(
      Math.cos(angle) * 100,
      Math.sin(angle) * 100,
      0
    );
  }, [timeOfDay]);

  const intensity = Math.max(0.1, Math.sin((timeOfDay / 24) * Math.PI) * 1.5);

  return (
    <group>
      {/* Dynamic Main Light */}
      <directionalLight
        position={sunPosition}
        intensity={intensity}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />

      {/* Ambient Light for tactical feel */}
      <ambientLight intensity={0.15} />

      {/* Stars visible as a tactical backdrop */}
      <Stars 
        radius={100} 
        depth={50} 
        count={5000} 
        factor={4} 
        saturation={0} 
        fade 
        speed={1} 
      />
      
      {/* Hemispheric Light for ground bounce */}
      <hemisphereLight 
        args={['#ffffff', '#000000', 0.2]} 
        intensity={intensity * 0.5} 
      />
    </group>
  );
};
