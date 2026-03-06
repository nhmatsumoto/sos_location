import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { CircleMarker, MapContainer, Polygon, Popup, TileLayer } from 'react-leaflet';
import * as THREE from 'three';
import type { OperationsSnapshot } from '../../services/operationsApi';

type MarkerKind = 'house' | 'building' | 'critical' | 'event' | 'manual';

interface GlobeMarker {
  id: string;
  lat: number;
  lng: number;
  kind: MarkerKind;
  label: string;
}

const GLOBE_RADIUS = 1.8;

function latLngToVector3(lat: number, lng: number, radius = GLOBE_RADIUS): [number, number, number] {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lng + 180) * Math.PI) / 180;

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return [x, y, z];
}

function markerColor(kind: MarkerKind): string {
  if (kind === 'house') return '#38bdf8';
  if (kind === 'building') return '#10b981';
  if (kind === 'critical') return '#f97316';
  if (kind === 'manual') return '#fde047';
  return '#f43f5e';
}

function GlobeMarkerMesh({ marker, index }: { marker: GlobeMarker; index: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const position = useMemo(() => latLngToVector3(marker.lat, marker.lng, GLOBE_RADIUS + 0.055), [marker.lat, marker.lng]);
  const baseScale = marker.kind === 'critical' || marker.kind === 'manual' ? 0.11 : 0.07;

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const pulse = marker.kind === 'critical' || marker.kind === 'event' || marker.kind === 'manual'
      ? 1 + Math.sin(clock.getElapsedTime() * 2 + index) * 0.28
      : 1;

    meshRef.current.scale.setScalar(baseScale * pulse);
    meshRef.current.lookAt(0, 0, 0);
    meshRef.current.rotateX(Math.PI);
  });

  return (
    <mesh ref={meshRef} position={position}>
      <coneGeometry args={[0.12, 0.36, 8]} />
      <meshStandardMaterial
        color={markerColor(marker.kind)}
        emissive={markerColor(marker.kind)}
        emissiveIntensity={marker.kind === 'manual' ? 0.95 : 0.65}
      />
    </mesh>
  );
}

function CameraRig() {
  const { camera } = useThree();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const targetX = Math.sin(t * 0.15) * 0.45;
    const targetY = 0.25 + Math.cos(t * 0.2) * 0.1;
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.02);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.02);
    camera.lookAt(0, 0, 0);
  });

  return null;
}

function GlobeScene({ markers }: { markers: GlobeMarker[] }) {
  const groupRef = useRef<THREE.Group>(null);

  const [albedoMap, bumpMap, specularMap] = useLoader(THREE.TextureLoader, [
    'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg',
    'https://threejs.org/examples/textures/planets/earth_bump_2048.jpg',
    'https://threejs.org/examples/textures/planets/earth_specular_2048.jpg',
  ]);

  useMemo(() => {
    albedoMap.colorSpace = THREE.SRGBColorSpace;
    [albedoMap, bumpMap, specularMap].forEach((texture) => {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.anisotropy = 8;
    });
  }, [albedoMap, bumpMap, specularMap]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.05;
  });

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.22} />
      <hemisphereLight args={['#c7e2ff', '#0b1020', 0.4]} />
      <directionalLight position={[6, 3, 5]} intensity={1.2} color="#dbeafe" castShadow />
      <pointLight position={[-8, -3, -6]} intensity={0.7} color="#60a5fa" />
      <Stars radius={60} depth={30} count={4000} factor={3} saturation={0} fade speed={0.4} />

      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS, 180, 180]} />
        <meshPhongMaterial
          map={albedoMap}
          bumpMap={bumpMap}
          bumpScale={0.07}
          displacementMap={bumpMap}
          displacementScale={0.03}
          specularMap={specularMap}
          specular={new THREE.Color('#93c5fd')}
          shininess={12}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS + 0.018, 90, 90]} />
        <meshStandardMaterial color="#7dd3fc" transparent opacity={0.12} emissive="#1d4ed8" emissiveIntensity={0.15} />
      </mesh>

      {markers.map((marker, index) => (
        <GlobeMarkerMesh key={marker.id} marker={marker} index={index} />
      ))}

      <OrbitControls enablePan={false} minDistance={2.4} maxDistance={6} />
      <CameraRig />
    </group>
  );
}

function createAreaPolygon(lat: number, lng: number, radiusMeters = 500): Array<[number, number]> {
  const steps = 28;
  const metersPerDegreeLat = 111_320;
  const metersPerDegreeLng = 111_320 * Math.cos((lat * Math.PI) / 180);

  return Array.from({ length: steps }, (_, index) => {
    const angle = (index / steps) * Math.PI * 2;
    const dLat = (Math.sin(angle) * radiusMeters) / metersPerDegreeLat;
    const dLng = (Math.cos(angle) * radiusMeters) / Math.max(1, metersPerDegreeLng);
    return [lat + dLat, lng + dLng];
  });
}

export function Public3DOperationsGlobe({ data }: { data: OperationsSnapshot | null }) {
  const [manualLat, setManualLat] = useState('-19.9167');
  const [manualLng, setManualLng] = useState('-43.9345');
  const [manualPoint, setManualPoint] = useState<{ lat: number; lng: number } | null>(null);

  const markers = useMemo<GlobeMarker[]>(() => {
    if (!data) return manualPoint ? [{ id: 'manual-marker', lat: manualPoint.lat, lng: manualPoint.lng, kind: 'manual', label: 'Ponto manual' }] : [];

    const supportMarkers = data.layers.supportPoints.map((point) => ({
      id: `support-${point.id}`,
      lat: point.lat,
      lng: point.lng,
      kind: point.metadata?.type === 'house' ? 'house' : 'building',
      label: point.title,
    } satisfies GlobeMarker));

    const criticalMarkers = data.layers.hotspots.map((hotspot) => ({
      id: `critical-${hotspot.id}`,
      lat: hotspot.lat,
      lng: hotspot.lng,
      kind: 'critical',
      label: `Ponto crítico · ${hotspot.type}`,
    } satisfies GlobeMarker));

    const timelineMarkers = (data.layers.timeline ?? []).map((event) => ({
      id: `event-${event.id}`,
      lat: event.lat,
      lng: event.lng,
      kind: 'event',
      label: event.title,
    } satisfies GlobeMarker));

    const all = [...supportMarkers, ...criticalMarkers, ...timelineMarkers];

    if (!manualPoint) return all;

    return [
      ...all,
      { id: 'manual-marker', lat: manualPoint.lat, lng: manualPoint.lng, kind: 'manual', label: 'Ponto manual' },
    ];
  }, [data, manualPoint]);

  const riskPolygons = useMemo(() => {
    if (!data) return [];

    return data.layers.riskAreas.map((area) => ({
      id: area.id,
      title: area.title,
      severity: area.severity,
      points: createAreaPolygon(area.lat, area.lng, area.radiusMeters ?? 750),
    }));
  }, [data]);

  const markCoordinate = () => {
    const lat = Number(manualLat);
    const lng = Number(manualLng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return;

    setManualPoint({ lat, lng });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 relative">
        <Canvas camera={{ position: [0, 0.2, 4.2], fov: 42 }}>
          <GlobeScene markers={markers} />
        </Canvas>
        
        {/* Interactive Overlay for Coords */}
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <div className="bg-slate-950/80 backdrop-blur-md border border-white/5 p-4 rounded-2xl flex flex-col sm:flex-row items-end gap-3 shadow-2xl">
            <div className="flex-1 grid grid-cols-2 gap-3 w-full">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Latitude</span>
                <input
                  value={manualLat}
                  onChange={(event) => setManualLat(event.target.value)}
                  className="w-full rounded-xl border border-white/5 bg-slate-900/50 px-3 py-2 text-xs text-white focus:border-cyan-500/50 outline-none transition-all"
                  placeholder="-19.9167"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Longitude</span>
                <input
                  value={manualLng}
                  onChange={(event) => setManualLng(event.target.value)}
                  className="w-full rounded-xl border border-white/5 bg-slate-900/50 px-3 py-2 text-xs text-white focus:border-cyan-500/50 outline-none transition-all"
                  placeholder="-43.9345"
                />
              </div>
            </div>
            <button
              onClick={markCoordinate}
              className="w-full sm:w-auto shrink-0 bg-cyan-500 text-slate-950 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-cyan-400 active:scale-95 transition-all shadow-lg shadow-cyan-500/20"
            >
              Marcar Radar
            </button>
          </div>
        </div>
      </div>

      {/* 2D Sync Map (Optional Toggle or separate section, here simplified for presentation) */}
      <div className="h-[240px] border-t border-white/5 bg-slate-950">
        <MapContainer 
          center={manualPoint ? [manualPoint.lat, manualPoint.lng] : [-15.78, -47.93]} 
          zoom={manualPoint ? 9 : 4} 
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; CARTO'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {markers.map((marker) => (
            <CircleMarker
              key={marker.id}
              center={[marker.lat, marker.lng]}
              radius={marker.kind === 'critical' || marker.kind === 'event' || marker.kind === 'manual' ? 6 : 4}
              pathOptions={{ 
                color: markerColor(marker.kind), 
                fillColor: markerColor(marker.kind),
                fillOpacity: 0.8,
                weight: 1
              }}
            >
              <Popup className="tactical-popup">
                <div className="p-1 space-y-1 bg-slate-900 text-white rounded-lg">
                  <p className="text-[10px] font-black uppercase tracking-widest text-cyan-400">{marker.kind}</p>
                  <p className="text-xs font-bold leading-tight">{marker.label}</p>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {riskPolygons.map((area) => (
            <Polygon key={area.id} positions={area.points} pathOptions={{ color: '#f97316', fillOpacity: 0.1, weight: 1.5, dashArray: '4, 4' }}>
              <Popup>
                <div className="p-1">
                   <p className="text-[10px] font-black text-rose-400 uppercase">Área de Risco</p>
                   <p className="text-xs font-bold">{area.title}</p>
                </div>
              </Popup>
            </Polygon>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
