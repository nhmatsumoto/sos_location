import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimulationStore } from '../../../../store/useSimulationStore';
import { invertFrom3D } from '../../../../utils/projection';

export const CameraBoundsTracker: React.FC = () => {
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
