import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { gisApi } from '../../services/gisApi';
import { useSimulationStore } from '../../store/useSimulationStore';
import { projectTo3D } from '../../utils/projection';

interface VegetationFeature {
  type?: string;
  coordinates: [number, number][];
}

export const VegetationLayer: React.FC = () => {
  const [zones, setZones] = useState<VegetationFeature[]>([]);
  const store = useSimulationStore();
  const { box: simulationBox, activeLayers } = store;
  const lastFetchedBbox = useRef<string | null>(null);

  useEffect(() => {
    if (!activeLayers.vegetation) return;

    const center = simulationBox?.center || store.heroPosition;
    const size = simulationBox?.size || [2000, 2000];

    const latDelta = (size[1] / 2) / 111320;
    const lonDelta = (size[0] / 2) / (40075000 * Math.cos(center[0] * Math.PI / 180) / 360);
    const minLat = center[0] - latDelta;
    const minLon = center[1] - lonDelta;
    const maxLat = center[0] + latDelta;
    const maxLon = center[1] + lonDelta;
    
    const activeBbox = `${minLat.toFixed(4)},${minLon.toFixed(4)}`;

    if (activeBbox === lastFetchedBbox.current) return;
    lastFetchedBbox.current = activeBbox;

    const fetchVeg = async () => {
      try {
        const data = await gisApi.getUrbanFeatures(minLat, minLon, maxLat, maxLon);
        if (data && data.buildings) {
          const vegData = data.buildings.filter((b: { type?: string }) => b.type === 'vegetation');
          setZones(vegData);
        }
      } catch (error) {
        console.error("Veg Fetch Error:", error);
      }
    };

    void fetchVeg();
  }, [simulationBox, activeLayers.vegetation, store.heroPosition]);

  const vegMesh = useMemo(() => {
    if (zones.length === 0) return null;

    const geometries: THREE.BufferGeometry[] = [];
    zones.forEach(z => {
      const shape = new THREE.Shape();
      z.coordinates.forEach((c: [number, number]) => {
        const p = projectTo3D(c[0], c[1]);
        if (shape.currentPoint.x === 0 && shape.currentPoint.y === 0) {
           shape.moveTo(p[0], -p[1]);
        } else {
           shape.lineTo(p[0], -p[1]);
        }
      });

      const geometry = new THREE.ShapeGeometry(shape);
      geometry.rotateX(-Math.PI / 2);
      geometry.translate(0, 0.03, 0); 
      geometries.push(geometry);
    });

    if (geometries.length === 0) return null;
    const merged = mergeGeometries(geometries);
    geometries.forEach(g => g.dispose());

    return (
      <mesh geometry={merged}>
        <meshStandardMaterial 
          color="#10b981" 
          transparent 
          opacity={0.4} 
          roughness={1}
          metalness={0}
        />
      </mesh>
    );
  }, [zones]);

  return <group>{vegMesh}</group>;
};
