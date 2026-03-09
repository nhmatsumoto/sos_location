import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { gisApi } from '../../services/gisApi';
import { useSimulationStore } from '../../store/useSimulationStore';
import { projectTo3D } from '../../utils/projection';

export const StreetLayer: React.FC = () => {
  const [streets, setStreets] = useState<any[]>([]);
  const store = useSimulationStore();
  const { box: simulationBox, activeLayers } = store;
  const lastFetchedBbox = useRef<string | null>(null);

  useEffect(() => {
    if (!activeLayers.streets) return;

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

    const fetchStreets = async () => {
      try {
        const data = await gisApi.getUrbanFeatures(minLat, minLon, maxLat, maxLon);
        if (data && data.buildings) {
          // In the updated backend, buildings list also contains highways with category='highway'
          const highwayData = data.buildings.filter((b: any) => b.category === 'highway');
          setStreets(highwayData);
        }
      } catch (error) {
        console.error("Street Fetch Error:", error);
      }
    };

    void fetchStreets();
  }, [simulationBox, activeLayers.streets, store.heroPosition]);

  const streetNetwork = useMemo(() => {
    if (streets.length === 0) return null;

    return streets.map((s, i) => {
      const points: THREE.Vector3[] = [];
      s.coordinates.forEach((c: [number, number]) => {
        const p = projectTo3D(c[0], c[1]);
        points.push(new THREE.Vector3(p[0], 0.05, p[1]));
      });
      
      if (points.length < 2) return null;
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      
      return (
        <primitive 
          key={i} 
          object={new THREE.Line(geometry, new THREE.LineBasicMaterial({
            color: '#8b5cf6',
            transparent: true,
            opacity: 0.6,
            linewidth: 2
          }))} 
        />
      );
    }).filter(Boolean);
  }, [streets]);

  return <group>{streetNetwork}</group>;
};
