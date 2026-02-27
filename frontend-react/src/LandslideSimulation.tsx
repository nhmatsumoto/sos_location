import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

const Terrain = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(30, 30, 128, 128);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      // Montanha subindo no Z negativo
      let vy = -vz * 0.6;
      // Ruído Perlin simples
      vy += Math.sin(vx * 0.8) * 1.5 + Math.cos(vz * 0.8) * 1.5;
      vy += Math.sin(vx * 2.5) * 0.3 + Math.cos(vz * 2.5) * 0.3;
      pos.setY(i, vy);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh ref={meshRef} geometry={geometry} receiveShadow>
      <meshStandardMaterial color="#2d3748" roughness={0.9} />
    </mesh>
  );
};

const SlideParticles = () => {
  const count = 3000;
  const positions = useMemo(() => new Float32Array(count * 3), [count]);
  const velocities = useMemo(() => new Float32Array(count * 3), [count]);
  
  for (let i = 0; i < count; i++) {
    // Nasce no topo da montanha
    positions[i * 3] = (Math.random() - 0.5) * 8; // x
    positions[i * 3 + 1] = 12 + Math.random() * 4; // y
    positions[i * 3 + 2] = -12 + Math.random() * 4; // z
    
    velocities[i * 3] = (Math.random() - 0.5) * 0.05; // vx
    velocities[i * 3 + 1] = -0.1 - Math.random() * 0.1; // vy
    velocities[i * 3 + 2] = 0.1 + Math.random() * 0.15; // vz
  }

  const geometryRef = useRef<THREE.BufferGeometry>(null);

  useFrame(() => {
    if (!geometryRef.current) return;
    const posAttribute = geometryRef.current.attributes.position;
    const posArray = posAttribute.array as Float32Array;

    for (let i = 0; i < count; i++) {
      posArray[i * 3] += velocities[i * 3];
      posArray[i * 3 + 1] += velocities[i * 3 + 1];
      posArray[i * 3 + 2] += velocities[i * 3 + 2];

      const vx = posArray[i * 3];
      const vz = posArray[i * 3 + 2];
      
      // Altura do terreno original
      let terrainY = -vz * 0.6 + Math.sin(vx * 0.8) * 1.5 + Math.cos(vz * 0.8) * 1.5 + Math.sin(vx * 2.5) * 0.3 + Math.cos(vz * 2.5) * 0.3;

      // Colisão
      if (posArray[i * 3 + 1] <= terrainY + 0.2) {
        posArray[i * 3 + 1] = terrainY + 0.2;
        // Gravidade descendo a encosta
        velocities[i * 3 + 1] = -0.05; // forçar descida
        velocities[i * 3 + 2] += 0.005; // acelera em Z
        
        // Espalhamento
        velocities[i * 3] += (Math.random() - 0.5) * 0.01;
      }

      // Reset
      if (vz > 12 || posArray[i * 3 + 1] < -10) {
        positions[i * 3] = (Math.random() - 0.5) * 8; 
        positions[i * 3 + 1] = 12 + Math.random() * 4; 
        positions[i * 3 + 2] = -12 + Math.random() * 4; 
        velocities[i * 3] = (Math.random() - 0.5) * 0.05; 
        velocities[i * 3 + 1] = -0.1 - Math.random() * 0.1; 
        velocities[i * 3 + 2] = 0.1 + Math.random() * 0.15; 
      }
    }
    posAttribute.needsUpdate = true;
  });

  return (
    <points>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      {/* Cor de lama / detritos */}
      <pointsMaterial size={0.3} color="#9a5b32" transparent opacity={0.6} />
    </points>
  );
};

export default function LandslideSimulation() {
  return (
    <div className="w-full h-full bg-slate-900 overflow-hidden relative rounded-xl border border-slate-700 shadow-inner">
      <div className="absolute top-3 left-3 z-10 bg-slate-800/80 border border-slate-600 px-3 py-1.5 rounded-md text-xs text-white font-semibold backdrop-blur-md shadow-lg flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
        Simulação 3D (Landslide Runout)
      </div>
      <Canvas camera={{ position: [15, 12, 15], fov: 45 }} shadows>
        <ambientLight intensity={0.4} />
        <directionalLight 
          position={[10, 20, 5]} 
          intensity={1.2} 
          castShadow 
        />
        <color attach="background" args={['#0f172a']} />
        
        <Terrain />
        <SlideParticles />
        
        <OrbitControls 
          enableDamping 
          dampingFactor={0.05} 
          minDistance={5} 
          maxDistance={40} 
          target={[0, -2, 0]} 
          maxPolarAngle={Math.PI / 2 - 0.1}
          autoRotate
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
}
