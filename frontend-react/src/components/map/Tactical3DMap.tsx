import React, { useMemo, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, FlyControls, GizmoHelper, GizmoViewport, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { CameraOverlayMenu } from './CameraOverlayMenu';
import { SimulationBoxEditor } from './SimulationBoxEditor';
import { HazardOverlay } from './HazardOverlay';
import { SnapshotVolume } from './SnapshotVolume';
import type { SituationalSnapshot } from '../../types';
import { AnimatedBarrier } from './AnimatedBarrier';
import { useSimulationStore } from '../../store/useSimulationStore';
import { projectTo3D } from '../../utils/projection';
import { DayNightCycle } from './DayNightCycle';
import { MapZoneLayer } from './MapZoneLayer';
import { Tactical3DMarkers } from './Tactical3DMarkers';
import { Tactical3DAlerts } from './Tactical3DAlerts';
import { SosHero } from './SosHero';


interface BarrierData {
  id: string;
  points: [number, number, number][];

  color?: string;
  type: 'containment' | 'restricted' | 'hazard';
}

import { ScanningRay } from './effects/ScanningRay';
import { CameraBoundsTracker } from './logic/CameraBoundsTracker';
import { FocalIntelligence } from './logic/FocalIntelligence';
import { InstancedEventBeacons } from './markers/InstancedEventBeacons';
import { WeatherParticles } from './effects/WeatherParticles';
import { BuildingLayer } from './BuildingLayer';
import { StreetLayer } from '../ui/StreetLayer';
import { VegetationLayer } from '../ui/VegetationLayer';



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
  const { environment, isSimulating, timeOfDay, box: simulationBox, cameraMode, activeLayers, heroPosition, cameraTarget, setCameraTo } = useSimulationStore();
  const lastHeroPos = React.useRef<[number, number] | null>(null);

  useEffect(() => {
    if (!lastHeroPos.current || 
        lastHeroPos.current[0] !== heroPosition[0] || 
        lastHeroPos.current[1] !== heroPosition[1]) {
      
      const p = projectTo3D(heroPosition[0], heroPosition[1]);
      setCameraTo(p[0], 500, p[1]); // Teleport high above
      lastHeroPos.current = heroPosition;
    }
  }, [heroPosition, setCameraTo]);
  
  // Intentionally commented unused hook
  // const heroWorldPos = useMemo(() => projectTo3D(heroPosition[0], heroPosition[1]), [heroPosition]);

  const focusPoint = useMemo(() => {
    if (cameraTarget === 'hero') return heroPosition;
    if (simulationBox) return simulationBox.center;
    return initialCenter;
  }, [simulationBox, initialCenter, heroPosition, cameraTarget]);

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
            pos3d: [x, 0.05, z] as [number, number, number],
            color
        };
    });
  }, [events]);

  const clippingPlanes = useMemo(() => {
    if (!simulationBox) return [];
    
    const [cx, cz] = projectTo3D(simulationBox.center[0], simulationBox.center[1]);
    const halfW = simulationBox.size[0] / 200; // 1 unit = 100m
    const halfH = simulationBox.size[1] / 200;

    return [
      new THREE.Plane(new THREE.Vector3(1, 0, 0), -(cx - halfW)),  // West
      new THREE.Plane(new THREE.Vector3(-1, 0, 0), cx + halfW),   // East
      new THREE.Plane(new THREE.Vector3(0, 0, 1), -(cz - halfH)),  // North
      new THREE.Plane(new THREE.Vector3(0, 0, -1), cz + halfH),   // South
    ];
  }, [simulationBox]);

  return (
    <div className="w-full h-full bg-slate-950 rounded-lg overflow-hidden border border-slate-800">
      <Canvas shadows={{ type: THREE.PCFShadowMap }} dpr={[1, 2]}>
        <color attach="background" args={['#020617']} />
        
        <React.Suspense fallback={null}>
          <CameraBoundsTracker />
          <FocalIntelligence />
          <PerspectiveCamera makeDefault position={[centerX + camOffset, camHeight, centerZ + camOffset]} fov={50} far={5000} />
          
          {cameraMode === 'orbit' ? (
            <OrbitControls makeDefault enablePan={true} maxPolarAngle={Math.PI / 2.1} minDistance={0.5} maxDistance={4000} target={[centerX, 0, centerZ]} />
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
          
          <ambientLight intensity={0.4} />
          <directionalLight 
            position={[centerX + 50, 150, centerZ + 50]} 
            intensity={1.5} 
            castShadow 
            shadow-mapSize={[4096, 4096]}
            shadow-camera-left={-400}
            shadow-camera-right={400}
            shadow-camera-top={400}
            shadow-camera-bottom={-400}
          />

          {/* Only show global grid if no relief layer is active to avoid clutter */}
          {!activeLayers.relief && (
            <group>
              <gridHelper args={[500, 100, 0x1e293b, 0x0f172a]} position={[0, -0.1, 0]} />
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]} receiveShadow>
                  <planeGeometry args={[1000, 1000]} />
                  <meshStandardMaterial color="#020617" roughness={0} metalness={0.8} />
              </mesh>
            </group>
          )}

          <React.Suspense fallback={null}>
            <MapZoneLayer clippingPlanes={clippingPlanes} />
            <BuildingLayer clippingPlanes={clippingPlanes} />
            <StreetLayer />
            <VegetationLayer />
          </React.Suspense>

          
          <SosHero />

          {activeLayers.labels && (
            <React.Suspense fallback={null}>
              <Tactical3DMarkers markers={[
                  { lat: focusPoint[0] + 0.002, lon: focusPoint[1] + 0.002, type: 'risk', label: 'Zona de Inundação Alpha', severity: 4 },
                  { lat: focusPoint[0] - 0.001, lon: focusPoint[1] + 0.003, type: 'hospital', label: 'Centro Méd Regional' },
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
            </React.Suspense>
          )}

          <fog attach="fog" args={['#020617', 50, 2000 - environment.fog * 1500]} />

          <Stars radius={1000} depth={500} count={8000} factor={6} saturation={0} fade speed={1} />


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
        </React.Suspense>
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
