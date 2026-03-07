import React, { useMemo, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Text, Float, FlyControls, GizmoHelper, GizmoViewport, Splat } from '@react-three/drei';
import * as THREE from 'three';
import { CameraOverlayMenu } from './CameraOverlayMenu';
import { SimulationBoxEditor } from './SimulationBoxEditor';
import { HazardOverlay } from './HazardOverlay';
import { SnapshotVolume } from './SnapshotVolume';
import type { SituationalSnapshot } from '../../types';
import { AnimatedBarrier } from './AnimatedBarrier';
import { useSimulationStore } from '../../store/useSimulationStore';
import { projectTo3D, invertFrom3D } from '../../utils/projection';
import { TacticalEnvironment } from './TacticalEnvironment';
import { DayNightCycle } from './DayNightCycle';
import { MapZoneLayer } from './MapZoneLayer';
import { Tactical3DMarkers } from './Tactical3DMarkers';
import { Tactical3DAlerts } from './Tactical3DAlerts';

interface BarrierData {
  id: string;
  points: [number, number, number][];
  color?: string;
  type: 'containment' | 'restricted' | 'hazard';
}

const ScanningRay: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.z = Math.sin(state.clock.elapsedTime * 0.5) * 50;
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.15, 0]}>
      <planeGeometry args={[100, 2]} />
      <meshBasicMaterial color="#22d3ee" transparent opacity={0.1} />
    </mesh>
  );
};

const CameraBoundsTracker: React.FC = () => {
  const setDynamicBounds = useSimulationStore(state => state.setDynamicBounds);
  const setFocalPoint = useSimulationStore(state => state.setFocalPoint);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.4), []);
  const lastUpdate = useRef(0);

  useFrame((state) => {
    const now = state.clock.elapsedTime;
    if (now - lastUpdate.current < 1) return;
    lastUpdate.current = now;

    const corners = [
      new THREE.Vector2(-1, -1),
      new THREE.Vector2(1, -1),
      new THREE.Vector2(1, 1),
      new THREE.Vector2(-1, 1),
    ];

    const intersections: THREE.Vector3[] = [];
    corners.forEach(c => {
      raycaster.setFromCamera(c, state.camera);
      const target = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(plane, target)) {
        intersections.push(target);
      }
    });

    if (intersections.length < 4) return;

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    intersections.forEach(p => {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.z);
      maxZ = Math.max(maxZ, p.z);
    });

    const [minLat, minLon] = invertFrom3D(minX, maxZ);
    const [maxLat, maxLon] = invertFrom3D(maxX, minZ);

    const bbox = `${minLat.toFixed(4)},${minLon.toFixed(4)},${maxLat.toFixed(4)},${maxLon.toFixed(4)}`;
    setDynamicBounds(bbox);

    // Update Focal Point (Center of screen intersection)
    raycaster.setFromCamera(new THREE.Vector2(0, 0), state.camera);
    const focalTarget = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, focalTarget)) {
      const [fLat, fLon] = invertFrom3D(focalTarget.x, focalTarget.z);
      setFocalPoint([fLat, fLon]);
    }
  });

  return null;
};

const FocalIntelligence: React.FC = () => {
  const focalPoint = useSimulationStore(state => state.focalPoint);
  const setFocalWeather = useSimulationStore(state => state.setFocalWeather);
  const lastUpdate = useRef(0);

  useEffect(() => {
    if (!focalPoint) return;
    
    const now = Date.now();
    if (now - lastUpdate.current < 3000) return;
    lastUpdate.current = now;

    const fetchFocalData = async () => {
      setFocalWeather({ loading: true });
      await new Promise(r => setTimeout(r, 800));
      const [lat, lon] = focalPoint;
      const baseTemp = 22 + Math.sin(lat * 10) * 5;
      const humidity = 40 + Math.cos(lon * 10) * 30;
      
      setFocalWeather({
        temp: Math.round(baseTemp * 10) / 10,
        humidity: Math.round(humidity),
        windSpeed: Math.round(5 + Math.random() * 15),
        description: baseTemp > 25 ? 'Céu Limpo' : 'Parcialmente Nublado',
        loading: false
      });
    };

    void fetchFocalData();
  }, [focalPoint, setFocalWeather]);

  return null;
};

const InstancedEventBeacons: React.FC<{ 
  coords: any[], 
  hoveredId: string | null, 
  onHover: (id: string | null) => void, 
  onClick: (e: any) => void 
}> = ({ coords, hoveredId, onHover, onClick }) => {
  const polesRef = useRef<THREE.InstancedMesh>(null);
  const ringsRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    if (!polesRef.current || !ringsRef.current) return;

    const tempObject = new THREE.Object3D();
    coords.forEach((e, i) => {
      const isSelected = hoveredId === (e.id || `${e.provider}-${e.provider_event_id}`);
      
      // Pole
      tempObject.position.set(e.pos3d[0], e.pos3d[1], e.pos3d[2]);
      tempObject.scale.setScalar(isSelected ? 1.2 : 1.0);
      tempObject.updateMatrix();
      polesRef.current!.setMatrixAt(i, tempObject.matrix);
      polesRef.current!.setColorAt(i, new THREE.Color(e.color));

      // Ring
      tempObject.position.set(e.pos3d[0], -e.severity * 0.15, e.pos3d[2]);
      tempObject.rotation.set(-Math.PI / 2, 0, 0);
      tempObject.scale.setScalar(1);
      tempObject.updateMatrix();
      ringsRef.current!.setMatrixAt(i, tempObject.matrix);
      ringsRef.current!.setColorAt(i, new THREE.Color(e.color));
    });

    polesRef.current.instanceMatrix.needsUpdate = true;
    if (polesRef.current.instanceColor) polesRef.current.instanceColor.needsUpdate = true;
    ringsRef.current.instanceMatrix.needsUpdate = true;
    if (ringsRef.current.instanceColor) ringsRef.current.instanceColor.needsUpdate = true;
  }, [coords, hoveredId]);

  return (
    <group>
      <instancedMesh 
        ref={polesRef} 
        args={[undefined as any, undefined as any, coords.length]}
        onPointerOver={(e) => {
          const id = coords[e.instanceId!].id || `${coords[e.instanceId!].provider}-${coords[e.instanceId!].provider_event_id}`;
          onHover(id);
        }}
        onPointerOut={() => onHover(null)}
        onClick={(e) => onClick(coords[e.instanceId!])}
      >
        <cylinderGeometry args={[0.1, 0.2, 0.3, 16]} />
        <meshStandardMaterial emissiveIntensity={2} transparent opacity={0.8} />
      </instancedMesh>
      
      <instancedMesh ref={ringsRef} args={[undefined as any, undefined as any, coords.length]}>
        <ringGeometry args={[0.3, 0.4, 32]} />
        <meshBasicMaterial transparent opacity={0.3} />
      </instancedMesh>

      {/* Only render labels for selected item to save CPU/DOM */}
      {coords.map((e) => {
        const id = e.id || `${e.provider}-${e.provider_event_id}`;
        if (id !== hoveredId) return null;
        return (
          <Float key={id} speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
            <Text position={[e.pos3d[0], e.severity * 0.2 + 1, e.pos3d[2]]} fontSize={0.3} color="white">
              {e.title || e.label || "Evento"}
            </Text>
          </Float>
        );
      })}
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
  initialCenter?: [number, number];
}

export const Tactical3DMap: React.FC<Tactical3DMapProps> = ({ 
  events, hoveredId, onHover, onClick, enableSimulationBox = false, activeSnapshots = [], barriers = [], initialCenter = [-20.91, -42.98]
}) => {
  const { environment, isSimulating, timeOfDay, box: simulationBox, cameraMode, activeLayers } = useSimulationStore();
  
  const focusPoint = useMemo(() => {
    if (simulationBox) return simulationBox.center;
    return initialCenter;
  }, [simulationBox, initialCenter]);

  const [centerX, centerZ] = projectTo3D(focusPoint[0], focusPoint[1]);

  // Dynamically position the camera based on the area size so it frames the terrain perfectly
  const mapSizeInUnits = simulationBox ? Math.max(simulationBox.size[0] / 100, simulationBox.size[1] / 100) : 200;
  const camHeight = Math.max(mapSizeInUnits * 0.8, 2); 
  const camOffset = Math.max(mapSizeInUnits * 0.8, 2);

  const coords = useMemo(() => {
    return events.map(e => {
        const [x, z] = projectTo3D(e.lat, e.lon);
        const color = getEventColor(e.event_type || e.type, e.severity);
        return {
            ...e,
            pos3d: [x, e.severity * 0.15, z] as [number, number, number],
            color
        };
    });
  }, [events]);

  return (
    <div className="w-full h-full bg-slate-950 rounded-lg overflow-hidden border border-slate-800">
      <Canvas shadows={{ type: THREE.PCFShadowMap }} dpr={[1, 2]}>
        <color attach="background" args={['#020617']} />
        <CameraBoundsTracker />
        <FocalIntelligence />
        <PerspectiveCamera makeDefault position={[centerX + camOffset, camHeight, centerZ + camOffset]} fov={50} />
        
        {cameraMode === 'orbit' ? (
          <OrbitControls makeDefault enablePan={true} maxPolarAngle={Math.PI / 2.1} minDistance={0.5} maxDistance={1000} target={[centerX, 0, centerZ]} />
        ) : (
          <FlyControls makeDefault movementSpeed={mapSizeInUnits * 0.5} rollSpeed={1.0} dragToLook={true} />
        )}

        <GizmoHelper
          alignment="bottom-left"
          margin={[80, 80]}
        >
          <GizmoViewport axisColors={['#ef4444', '#4ade80', '#3b82f6']} labelColor="white" />
        </GizmoHelper>

        <DayNightCycle timeOfDay={timeOfDay} />
        
        {/* Only show global grid if no relief layer is active to avoid clutter */}
        {!activeLayers.relief && (
          <>
            <gridHelper args={[200, 100, 0x1e293b, 0x0f172a]} position={[0, -0.1, 0]} />
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]} receiveShadow>
                <planeGeometry args={[200, 200]} />
                <meshStandardMaterial color="#020617" roughness={0} metalness={0.8} />
            </mesh>
            <gridHelper args={[200, 20, 0x06b6d4, 0x06b6d4]} position={[0, -0.19, 0]} />
          </>
        )}

        <TacticalEnvironment />
        <MapZoneLayer />
        
        {/* showPhotogrammetry && (
          <Splat 
            src="https://huggingface.co/datasets/dylanebert/3dgs/resolve/main/bonsai/bonsai-7k.splat" 
            position={[centerX, 1, centerZ]} 
            scale={10} 
          />
        ) */}

        {activeLayers.labels && (
          <>
            <Tactical3DMarkers markers={[
                { lat: focusPoint[0] + 0.002, lon: focusPoint[1] + 0.002, type: 'risk', label: 'Zona de Inundação Alpha', severity: 4 },
                { lat: focusPoint[0] - 0.001, lon: focusPoint[1] + 0.003, type: 'hospital', label: 'Centro Médico Regional' },
                { lat: focusPoint[1], lon: focusPoint[1], type: 'base', label: 'Posto de Comando' }
            ]} />

            <ScanningRay />

            <Tactical3DAlerts events={events} />

            <InstancedEventBeacons
              coords={coords}
              hoveredId={hoveredId}
              onHover={onHover}
              onClick={(e) => onClick(e)}
            />
          </>
        )}

        <fog attach="fog" args={['#020617', 10, 60 - environment.fog * 40]} />

        {activeSnapshots.map((snap) => (
          <SnapshotVolume key={snap.id} snapshot={snap} />
        ))}

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

        <WeatherParticles intensity={environment.rain} isSimulating={isSimulating} />
      </Canvas>

      <div className="absolute bottom-4 left-4 pointer-events-none z-40">
        <div className="text-[10px] text-cyan-500/50 uppercase tracking-[0.2em] font-bold">
           Situation Room 3D v1.0 // Real-time Uplink Active {isSimulating && " // PROJECTION_ACTIVE"}
        </div>
      </div>
      
      <CameraOverlayMenu />
    </div>
  );
};

const WeatherParticles: React.FC<{ intensity: number; isSimulating: boolean }> = ({ intensity, isSimulating }) => {
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

function getEventColor(type: string, severity: number): string {
  if (!type) return '#22d3ee';
  if (type.includes('Rescue')) return '#f87171';
  if (type.includes('Donation')) return '#4ade80';
  if (type.includes('Search')) return '#fbbf24';
  if (type.includes('Assignment')) return '#818cf8';
  if (type.includes('Expense')) return '#f472b6';
  if (severity >= 4) return '#ef4444';
  return '#22d3ee';
}
