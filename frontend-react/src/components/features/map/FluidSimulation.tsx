import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimulationStore } from '../../../store/useSimulationStore';

const PARTICLE_COUNT = 1500;
const pseudoRandom = (seed: number) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

export const FluidSimulation: React.FC = () => {
  const { isSimulating, rainIntensity, soilSaturation, soilType, waterLevel, box } = useSimulationStore();
  const meshRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const absorptionRate = useMemo(() => {
    const base = (100 - soilSaturation) / 1000;
    switch (soilType) {
      case 'clay': return base * 0.2;
      case 'sandy': return base * 2.5;
      case 'rocky': return base * 0.1;
      default: return base; 
    }
  }, [soilSaturation, soilType]);

  const [initialPositions, randomness] = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const rand = new Float32Array(PARTICLE_COUNT * 3);
    
    if (!box) return [pos, rand];

    const xPos = (box.center[1] + 51.9) * 2;
    const zPos = -(box.center[0] + 14.2) * 2;
    const width = box.size[0] / 10000;
    const height = box.size[1] / 10000;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const rx = pseudoRandom(i * 3 + 1);
        const ry = pseudoRandom(i * 3 + 2);
        const rz = pseudoRandom(i * 3 + 3);
        pos[i * 3] = xPos + (rx - 0.5) * width;
        pos[i * 3 + 1] = 5 + ry * 10;
        pos[i * 3 + 2] = zPos + (rz - 0.5) * height;

        rand[i * 3] = pseudoRandom(i * 3 + 4);
        rand[i * 3 + 1] = pseudoRandom(i * 3 + 5);
        rand[i * 3 + 2] = pseudoRandom(i * 3 + 6);
    }
    return [pos, rand];
  }, [box]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uWaterLevel: { value: waterLevel },
    uAbsorptionRate: { value: absorptionRate },
    uIntensity: { value: rainIntensity },
    uColor: { value: new THREE.Color("#38bdf8") }
  }), [absorptionRate, rainIntensity, waterLevel]);

  useEffect(() => {
    const material = materialRef.current;
    if (!material) return;
    material.uniforms.uWaterLevel.value = waterLevel;
    material.uniforms.uAbsorptionRate.value = absorptionRate;
    material.uniforms.uIntensity.value = rainIntensity;
  }, [waterLevel, absorptionRate, rainIntensity]);

  useFrame((state) => {
    if (meshRef.current && materialRef.current && isSimulating && rainIntensity > 0) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  if (!box || rainIntensity <= 0) return null;

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[initialPositions, 3]} />
        <bufferAttribute attach="attributes-aRandom" args={[randomness, 3]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={`
          uniform float uTime;
          uniform float uWaterLevel;
          uniform float uAbsorptionRate;
          uniform float uIntensity;
          attribute vec3 aRandom;
          varying float vOpacity;

          void main() {
            vec3 pos = position;
            float t = uTime * (0.5 + aRandom.x * 0.5);
            
            // Vertical movement (Gravity + recycled height)
            float fall = t * 5.0;
            float groundLevel = 0.2 + (uWaterLevel * 0.05);
            
            // Cycle height from 15.0 down to groundLevel
            float heightRange = 15.0 - groundLevel;
            pos.y = groundLevel + mod(pos.y - groundLevel - fall, heightRange);
            
            // Horizontal jitter when near ground
            if (pos.y < groundLevel + 0.1) {
              pos.x += (aRandom.y - 0.5) * 0.2 * sin(uTime * 10.0 + aRandom.z);
              pos.z += (aRandom.z - 0.5) * 0.2 * cos(uTime * 10.0 + aRandom.y);
            }

            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_PointSize = 3.0 * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
            vOpacity = 0.6 * (uIntensity / 100.0);
          }
        `}
        fragmentShader={`
          varying float vOpacity;
          uniform vec3 uColor;

          void main() {
            float dist = distance(gl_PointCoord, vec2(0.5));
            if (dist > 0.5) discard;
            gl_FragColor = vec4(uColor, vOpacity * (1.0 - dist * 2.0));
          }
        `}
      />
    </points>
  );
};
