import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { CircleMarker, MapContainer, Polygon, Popup, TileLayer } from 'react-leaflet';
import * as THREE from 'three';
import type { OperationsSnapshot } from '../../services/operationsApi';

type MarkerKind = 'house' | 'building' | 'critical' | 'event';

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
  return '#f43f5e';
}

function GlobeMarkerMesh({ marker, index }: { marker: GlobeMarker; index: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const position = useMemo(() => latLngToVector3(marker.lat, marker.lng, GLOBE_RADIUS + 0.04), [marker.lat, marker.lng]);
  const baseScale = marker.kind === 'critical' ? 0.1 : 0.065;

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const pulse = marker.kind === 'critical' || marker.kind === 'event' ? 1 + Math.sin(clock.getElapsedTime() * 2 + index) * 0.3 : 1;
    meshRef.current.scale.setScalar(baseScale * pulse);
    meshRef.current.lookAt(0, 0, 0);
    meshRef.current.rotateX(Math.PI);
  });

  return (
    <mesh ref={meshRef} position={position}>
      <coneGeometry args={[0.16, 0.42, 6]} />
      <meshStandardMaterial color={markerColor(marker.kind)} emissive={markerColor(marker.kind)} emissiveIntensity={0.6} />
    </mesh>
  );
}

function GlobeScene({ markers }: { markers: GlobeMarker[] }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.08;
  });

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.35} />
      <directionalLight position={[6, 3, 2]} intensity={1.1} />
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS, 80, 80]} />
        <meshStandardMaterial color="#0f172a" metalness={0.35} roughness={0.72} emissive="#0b1a34" emissiveIntensity={0.25} />
      </mesh>
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS + 0.01, 80, 80]} />
        <meshStandardMaterial color="#1d4ed8" wireframe opacity={0.22} transparent />
      </mesh>

      {markers.map((marker, index) => (
        <GlobeMarkerMesh key={marker.id} marker={marker} index={index} />
      ))}

      <OrbitControls enablePan={false} minDistance={2.5} maxDistance={6} />
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
    const dLng = (Math.cos(angle) * radiusMeters) / metersPerDegreeLng;
    return [lat + dLat, lng + dLng];
  });
}

export function Public3DOperationsGlobe({ data }: { data: OperationsSnapshot | null }) {
  const markers = useMemo<GlobeMarker[]>(() => {
    if (!data) return [];

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

    return [...supportMarkers, ...criticalMarkers, ...timelineMarkers];
  }, [data]);

  const riskPolygons = useMemo(() => {
    if (!data) return [];

    return data.layers.riskAreas.map((area) => ({
      id: area.id,
      title: area.title,
      severity: area.severity,
      points: createAreaPolygon(area.lat, area.lng, area.radiusMeters ?? 750),
    }));
  }, [data]);

  return (
    <section className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
      <article className="h-[460px] overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
        <Canvas camera={{ position: [0, 0, 4.8], fov: 48 }}>
          <GlobeScene markers={markers} />
        </Canvas>
      </article>

      <article className="h-[460px] overflow-hidden rounded-xl border border-slate-700">
        <MapContainer center={[-15.78, -47.93]} zoom={4} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {markers.map((marker) => (
            <CircleMarker
              key={marker.id}
              center={[marker.lat, marker.lng]}
              radius={marker.kind === 'critical' || marker.kind === 'event' ? 8 : 6}
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
  );
}
