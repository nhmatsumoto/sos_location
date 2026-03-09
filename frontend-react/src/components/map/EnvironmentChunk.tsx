import React, { useMemo, useState, useEffect } from 'react';
import { TerrainMesh } from './TerrainMesh';
import { TacticalStreets } from './TacticalStreets';
import { BuildingLayer } from './BuildingLayer';
import { TacticalVegetation } from './TacticalVegetation';
import { MapZoneLayer } from './MapZoneLayer';
import { gisApi } from '../../services/gisApi';

interface EnvironmentChunkProps {
  bbox: [number, number, number, number]; // minLat, minLon, maxLat, maxLon
  chunkId: string;
}

export const EnvironmentChunk: React.FC<EnvironmentChunkProps> = ({ bbox, chunkId }) => {
  const [urbanData, setUrbanData] = useState<any>(null);

  const localSimulationBox = useMemo(() => {
    const minLat = bbox[0];
    const minLon = bbox[1];
    const maxLat = bbox[2];
    const maxLon = bbox[3];
    
    const centerLat = (minLat + maxLat) / 2;
    const centerLon = (minLon + maxLon) / 2;
    
    const width = (maxLon - minLon) * (40075000 * Math.cos(centerLat * Math.PI / 180) / 360);
    const height = (maxLat - minLat) * 111320;
    
    return {
      center: [centerLat, centerLon] as [number, number],
      size: [width, height] as [number, number]
    };
  }, [bbox]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await gisApi.getUrbanFeatures(bbox[0], bbox[1], bbox[2], bbox[3]);
        setUrbanData(data);
      } catch (err) {
        console.error("Failed to fetch urban data for chunk:", chunkId, err);
      }
    };
    fetchData();
  }, [bbox, chunkId]);

  return (
    <group key={chunkId}>
      <TerrainMesh clippingPlanes={[]} overrideBox={localSimulationBox} /> 
      
      <React.Suspense fallback={null}>
        <TacticalStreets 
          clippingPlanes={[]} 
          data={urbanData?.highways} 
        />
      </React.Suspense>

      <React.Suspense fallback={null}>
        <BuildingLayer 
          clippingPlanes={[]} 
          data={urbanData?.buildings} 
        />
      </React.Suspense>

      <React.Suspense fallback={null}>
        <TacticalVegetation 
          clippingPlanes={[]} 
          data={urbanData?.forests} 
        />
      </React.Suspense>

      <MapZoneLayer clippingPlanes={[]} overrideBox={localSimulationBox} />
    </group>
  );
};
