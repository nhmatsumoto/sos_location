import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { fetchOSMData } from '../../utils/osmFetcher';
import { useSimulationStore } from '../../store/useSimulationStore';
import { projectTo3D } from '../../utils/projection';

interface ZoneData {
  id: string;
  points: [number, number][]; // lon, lat
  type: string;
}

export const MapZoneLayer: React.FC = () => {
  const [zones, setZones] = useState<ZoneData[]>([]);
  const { box: simulationBox, activeLayers } = useSimulationStore();
  const lastFetchedBbox = useRef<string | null>(null);

  useEffect(() => {
    if (!simulationBox) return;

    const latDelta = (simulationBox.size[1] / 2) / 111320;
    const lonDelta = (simulationBox.size[0] / 2) / (40075000 * Math.cos(simulationBox.center[0] * Math.PI / 180) / 360);
    const activeBbox = `${(simulationBox.center[0] - latDelta).toFixed(4)},${(simulationBox.center[1] - lonDelta).toFixed(4)},${(simulationBox.center[0] + latDelta).toFixed(4)},${(simulationBox.center[1] + lonDelta).toFixed(4)}`;

    if (activeBbox === lastFetchedBbox.current) return;
    lastFetchedBbox.current = activeBbox;

    const fetchZones = async () => {
      try {
        const query = `
          [out:json][timeout:25];
          (
            way["landuse"](${activeBbox});
            way["natural"="water"](${activeBbox});
            way["natural"="wood"](${activeBbox});
            way["leisure"="park"](${activeBbox});
          );
          out body;
          >;
          out skel qt;
        `;
        const data = await fetchOSMData(query);
        
        const nodes: Record<string, [number, number]> = {};
        data.elements.filter((el: any) => el.type === 'node').forEach((node: any) => {
          nodes[node.id] = [node.lon, node.lat];
        });

        const parsedZones: ZoneData[] = data.elements
          .filter((el: any) => el.type === 'way' && el.nodes)
          .map((way: any) => ({
            id: way.id,
            points: way.nodes.map((nodeId: string) => nodes[nodeId]).filter(Boolean),
            type: way.tags?.landuse || way.tags?.natural || way.tags?.leisure || 'generic'
          }));
        
        setZones(parsedZones);
      } catch (error) {
        console.error("OSM Zone Fetch Error:", error);
      }
    };

    void fetchZones();
  }, [simulationBox]);

  const renderedZones = useMemo(() => {
    if (zones.length === 0 || (!activeLayers.satellite && !activeLayers.map)) return null;

    const project = (lon: number, lat: number) => projectTo3D(lat, lon);

    const geosByType: Record<string, THREE.BufferGeometry[]> = {};

    zones.forEach((z) => {
      if (z.points.length < 3) return;

      const shape = new THREE.Shape();
      const [startX, startZ] = project(z.points[0][0], z.points[0][1]);
      shape.moveTo(startX, startZ);
      
      for (let i = 1; i < z.points.length; i++) {
        const [px, pz] = project(z.points[i][0], z.points[i][1]);
        shape.lineTo(px, pz);
      }

      const geometry = new THREE.ShapeGeometry(shape);
      geometry.rotateX(-Math.PI / 2);
      geometry.translate(0, -0.45, 0); 

      if (!geosByType[z.type]) geosByType[z.type] = [];
      geosByType[z.type].push(geometry);
    });

    return (
      <group>
        {Object.entries(geosByType).map(([type, geos]) => {
          if (geos.length === 0) return null;
          const merged = mergeGeometries(geos);
          
          let color = "#334155"; 
          if (['forest', 'wood', 'grass', 'park', 'meadow'].includes(type)) color = "#065f46";
          if (['water', 'river', 'lake'].includes(type)) color = "#0c4a6e";
          if (['industrial', 'commercial'].includes(type)) color = "#475569";
          if (['residential'].includes(type)) color = "#334155";

          return (
            <mesh key={type} geometry={merged}>
              <meshStandardMaterial 
                color={color} 
                transparent 
                opacity={0.4} 
                roughness={1}
                metalness={0}
              />
            </mesh>
          );
        })}
      </group>
    );
  }, [zones]);

  return <group>{renderedZones}</group>;
};
