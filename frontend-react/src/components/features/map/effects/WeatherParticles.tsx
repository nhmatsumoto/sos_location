import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const WeatherParticles: React.FC<{ intensity: number; isSimulating: boolean }> = ({ intensity, isSimulating }) => {
  const meshRef = useRef<THREE.Points>(null);
  const count = 2000;
  
  const [positions, randomness] = useMemo(() => {
    const p = new Float32Array(count * 3);
    const r = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * 500;
      p[i * 3 + 1] = Math.random() * 200;
      p[i * 3 + 2] = (Math.random() - 0.5) * 500;
      r[i] = Math.random();
    }
    return [p, r];
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uIntensity: { value: intensity },
    uColor: { value: new THREE.Color("#93c5fd") },
    uSpeed: { value: isSimulating ? 2.5 : 1.5 }
  }), []);

  useEffect(() => {
    uniforms.uIntensity.value = intensity;
    uniforms.uSpeed.value = isSimulating ? 2.5 : 1.5;
  }, [intensity, isSimulating, uniforms]);

  useFrame((state) => {
    if (meshRef.current) {
      (meshRef.current.material as THREE.ShaderMaterial).uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  if (intensity <= 0) return null;

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aRandom" args={[randomness, 1]} />
      </bufferGeometry>
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={`
          uniform float uTime;
          uniform float uIntensity;
          uniform float uSpeed;
          attribute float aRandom;
          varying float vOpacity;

          void main() {
            vec3 pos = position;
            
            // Animation logic moving to GPU
            float fall = uTime * (0.8 + aRandom * 0.4) * uSpeed * 5.0;
            pos.y = mod(pos.y - fall, 200.0);
            
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_PointSize = (1.5 * uIntensity) * (300.0 / -mvPosition.z) * 10.0;
            gl_Position = projectionMatrix * mvPosition;
            vOpacity = uIntensity * 0.3;
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
