import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { gisApi } from '../../services/gisApi';
import { useSimulationStore } from '../../store/useSimulationStore';
import { projectTo3D } from '../../utils/projection';

interface StreetData {
  id: string;
  points: [number, number][]; // lon, lat
  type: string;
}

export const TacticalStreets: React.FC = () => {
  const [streets, setStreets] = useState<StreetData[]>([]);
  const { focalPoint, box: simulationBox, activeLayers } = useSimulationStore();
  const lastFetchedBbox = useRef<string | null>(null);

  useEffect(() => {
    const center = simulationBox ? simulationBox.center : (focalPoint || [-20.91, -42.98]);
    let activeBbox: string;
    
    if (simulationBox) {
      const latDelta = (simulationBox.size[1] / 2) / 111320;
      const lonDelta = (simulationBox.size[0] / 2) / (40075000 * Math.cos(simulationBox.center[0] * Math.PI / 180) / 360);
      activeBbox = `${(simulationBox.center[0] - latDelta).toFixed(4)},${(simulationBox.center[1] - lonDelta).toFixed(4)},${(simulationBox.center[0] + latDelta).toFixed(4)},${(simulationBox.center[1] + lonDelta).toFixed(4)}`;
    } else {
      activeBbox = `${(center[0] - 0.01).toFixed(4)},${(center[1] - 0.01).toFixed(4)},${(center[0] + 0.01).toFixed(4)},${(center[1] + 0.01).toFixed(4)}`;
    }

    if (activeBbox === lastFetchedBbox.current) return;
    lastFetchedBbox.current = activeBbox;

    const fetchStreets = async () => {
      try {
        const parts = activeBbox.split(',').map(Number);
        const data = await gisApi.getUrbanFeatures(parts[0], parts[1], parts[2], parts[3]);
        
        if (!data || !data.highways) return;

        const parsedStreets: StreetData[] = data.highways.map((h: any) => ({
          id: h.id.toString(),
          points: h.coordinates.map((c: any) => [c[1], c[0]]), // Lon, Lat
          type: h.type
        }));

        setStreets(parsedStreets);
      } catch (error) {
        console.error("Error fetching streets from GIS:", error);
      }
    };

    void fetchStreets();
  }, [focalPoint, simulationBox]);

  const renderedStreets = useMemo(() => {
    if (!activeLayers.streets) return null;
    return streets.map((s) => {
      if (s.points.length < 2) return null;

      const project = (lon: number, lat: number) => projectTo3D(lat, lon);

      const points = s.points.map(p => {
        const [x, z] = project(p[0], p[1]);
        return new THREE.Vector3(x, 0.02, z); // slight offset to prevent Z-fighting
      });

      const curve = new THREE.CatmullRomCurve3(points);
      
      let width = 0.05;
      if (s.type === 'primary' || s.type === 'trunk') width = 0.15;
      if (s.type === 'secondary') width = 0.1;

      return (
        <mesh key={s.id} scale={[1, 0.02, 1]}>
          <tubeGeometry args={[curve, 64, width, 8, false]} />
          <meshStandardMaterial 
            color="#475569" 
            emissive="#000000"
            emissiveIntensity={0}
            roughness={0.9}
            flatShading
          />
        </mesh>
      );
    });
  }, [streets]);

  return <group>{renderedStreets}</group>;
};
