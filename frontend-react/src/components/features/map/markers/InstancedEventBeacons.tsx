import React, { useRef, useEffect } from 'react';
import { Float, Text } from '@react-three/drei';
import * as THREE from 'three';

export const InstancedEventBeacons: React.FC<{ 
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
