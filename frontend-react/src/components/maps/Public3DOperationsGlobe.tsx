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
    <section className="space-y-3">
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-700/70 bg-slate-900/80 p-2">
        <label className="flex flex-col text-xs text-slate-300">
          Latitude
          <input
            value={manualLat}
            onChange={(event) => setManualLat(event.target.value)}
            className="mt-1 rounded-md border border-slate-600 bg-slate-950 px-2 py-1 text-sm text-slate-100"
            placeholder="-19.9167"
          />
        </label>

        <label className="flex flex-col text-xs text-slate-300">
          Longitude
          <input
            value={manualLng}
            onChange={(event) => setManualLng(event.target.value)}
            className="mt-1 rounded-md border border-slate-600 bg-slate-950 px-2 py-1 text-sm text-slate-100"
            placeholder="-43.9345"
          />
        </label>

        <button
          onClick={markCoordinate}
          className="rounded-md border border-amber-400/70 bg-amber-500/20 px-3 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/30"
        >
          Demarcar ponto por coordenadas
        </button>
      </div>

      <section className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <article className="h-[460px] overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
          <Canvas camera={{ position: [0, 0.2, 4.9], fov: 46 }}>
            <GlobeScene markers={markers} />
          </Canvas>
        </article>

        <article className="h-[460px] overflow-hidden rounded-xl border border-slate-700">
          <MapContainer center={manualPoint ? [manualPoint.lat, manualPoint.lng] : [-15.78, -47.93]} zoom={manualPoint ? 9 : 4} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {markers.map((marker) => (
              <CircleMarker
                key={marker.id}
                center={[marker.lat, marker.lng]}
                radius={marker.kind === 'critical' || marker.kind === 'event' || marker.kind === 'manual' ? 8 : 6}
                pathOptions={{ color: markerColor(marker.kind), fillOpacity: 0.85 }}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">{marker.label}</p>
                    <p>{marker.lat.toFixed(4)}, {marker.lng.toFixed(4)}</p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}

            {riskPolygons.map((area) => (
              <Polygon key={area.id} positions={area.points} pathOptions={{ color: '#f97316', fillOpacity: 0.2, weight: 2 }}>
                <Popup>
                  <strong>{area.title}</strong>
                  <p>Severidade: {area.severity}</p>
                </Popup>
              </Polygon>
            ))}
          </MapContainer>
        </article>
      </section>
    </section>
  );
}
