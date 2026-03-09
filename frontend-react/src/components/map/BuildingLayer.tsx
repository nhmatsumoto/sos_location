import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { gisApi } from '../../services/gisApi';
import { useSimulationStore } from '../../store/useSimulationStore';
import { projectTo3D } from '../../utils/projection';

interface BuildingData {
  id: number;
  coordinates: [number, number][];
  height: number;
  levels: number;
  type: string;
}

interface BuildingLayerProps {
  clippingPlanes?: THREE.Plane[];
}

export const BuildingLayer: React.FC<BuildingLayerProps> = ({ clippingPlanes }) => {
  const [buildings, setBuildings] = useState<BuildingData[]>([]);
  const store = useSimulationStore();
  const { box: simulationBox, activeLayers } = store;
  const lastFetchedBbox = useRef<string | null>(null);

  useEffect(() => {
    if (!activeLayers.buildings) return;

    // Use simulation box or fallback to a 2km area around center
    const center = simulationBox?.center || store.heroPosition;
    const size = simulationBox?.size || [2000, 2000];

    const latDelta = (size[1] / 2) / 111320;
    const lonDelta = (size[0] / 2) / (40075000 * Math.cos(center[0] * Math.PI / 180) / 360);
    const minLat = center[0] - latDelta;
    const minLon = center[1] - lonDelta;
    const maxLat = center[0] + latDelta;
    const maxLon = center[1] + lonDelta;
    
    const activeBbox = `${minLat.toFixed(4)},${minLon.toFixed(4)},${maxLat.toFixed(4)},${maxLon.toFixed(4)}`;

    if (activeBbox === lastFetchedBbox.current) return;
    lastFetchedBbox.current = activeBbox;

    const fetchBuildings = async () => {
      console.log(`[BuildingLayer] Fetching buildings for bbox: ${activeBbox}`);
      try {
        const data = await gisApi.getUrbanFeatures(minLat, minLon, maxLat, maxLon);
        if (data && data.buildings) {
          console.log(`[BuildingLayer] Received ${data.buildings.length} buildings`);
          setBuildings(data.buildings);
        }
      } catch (error) {
        console.error("Building Fetch Error:", error);
      }
    };

    void fetchBuildings();
  }, [simulationBox, activeLayers.buildings, store.heroPosition]);

  const buildingMesh = useMemo(() => {
    if (buildings.length === 0) return null;

    const project = (lat: number, lon: number) => projectTo3D(lat, lon);
    const geometries: THREE.BufferGeometry[] = [];

    buildings.forEach((b) => {
      if (!b.coordinates || b.coordinates.length < 3) return;

      const shape = new THREE.Shape();
      let hasInvalid = false;
      
      const first = project(b.coordinates[0][0], b.coordinates[0][1]);
      if (isNaN(first[0]) || isNaN(first[1])) hasInvalid = true;
      else shape.moveTo(first[0], -first[1]);

      for (let i = 1; i < b.coordinates.length; i++) {
        const p = project(b.coordinates[i][0], b.coordinates[i][1]);
        if (isNaN(p[0]) || isNaN(p[1])) {
          hasInvalid = true;
          break;
        }
        shape.lineTo(p[0], -p[1]);
      }

      if (hasInvalid) return;

      const height = b.height > 0 ? b.height / 100 : (b.levels || 1) * 0.035; 
      
      const extrudeSettings = {
        steps: 1,
        depth: Math.max(0.001, height),
        bevelEnabled: false
      };

      try {
        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geometry.rotateX(-Math.PI / 2);
        // Elevate slightly to avoid Z-fighting with ground
        geometry.translate(0, 0.02, 0); 
        geometries.push(geometry);
      } catch (err) {
        console.warn("[BuildingLayer] Failed to extrude building:", b.id, err);
      }
    });

    if (geometries.length === 0) return null;

    const mergedGeometry = mergeGeometries(geometries);
    
    // Dispose individual geometries once merged
    geometries.forEach(g => g.dispose());
    
    return (
      <group>
        <mesh geometry={mergedGeometry} castShadow receiveShadow>
          <meshStandardMaterial 
            color="#f1f5f9" // Clean white/grey architectural look
            emissive="#f1f5f9"
            emissiveIntensity={0.05}
            roughness={0.1}
            metalness={0.1}
            clippingPlanes={clippingPlanes}
          />
        </mesh>
        {/* PLATEAU Glowing Outlines */}
        <lineSegments geometry={new THREE.EdgesGeometry(mergedGeometry)}>
          <lineBasicMaterial color="#22d3ee" transparent opacity={0.6} />
        </lineSegments>
      </group>
    );
  }, [buildings, clippingPlanes]);

  // Cleanup effect for the merged geometry
  useEffect(() => {
    return () => {
      if (buildingMesh && (buildingMesh as any).props.geometry) {
        (buildingMesh as any).props.geometry.dispose();
      }
    };
  }, [buildingMesh]);

  return <group>{buildingMesh}</group>;
};
