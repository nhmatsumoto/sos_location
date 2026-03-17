import React, { useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { integrationsApi } from '../../../services/integrationsApi';
import { useSimulationStore } from '../../../store/useSimulationStore';

export const GEELayer: React.FC = () => {
  const { dynamicBounds, isSimulating, showGEE, geeAnalysisType } = useSimulationStore();
  const [analysisData, setAnalysisData] = useState<any>(null);
  
  useEffect(() => {
    if (!dynamicBounds || !isSimulating || !showGEE) return;

    const fetchGEE = async () => {
      try {
        const data = await integrationsApi.getGeeAnalysis(dynamicBounds, geeAnalysisType);
        setAnalysisData(data);
      } catch (err) {
        console.error('GEE Fetch Error:', err);
      }
    };

    const timer = setTimeout(fetchGEE, 500); // Debounce
    return () => clearTimeout(timer);
  }, [dynamicBounds, isSimulating, showGEE, geeAnalysisType]);

  const meshData = useMemo(() => {
    if (!analysisData || !analysisData.data) return null;
    
    const grid = analysisData.data;
    const size = 10;
    
    return grid.map((row: number[], i: number) => {
      return row.map((val: number, j: number) => {
        const bboxParts = analysisData.bbox.split(',').map(Number);
        const [minLat, minLon, maxLat, maxLon] = bboxParts;
        
        const lat = minLat + (i / (size - 1)) * (maxLat - minLat);
        const lon = minLon + (j / (size - 1)) * (maxLon - minLon);
        
        const x = (lon + 51.9) * 2;
        const z = -(lat + 14.2) * 2;
        
        const color = analysisData.type === 'ndvi' 
          ? (val > 0.6 ? '#10b981' : (val > 0.4 ? '#f59e0b' : '#ef4444'))
          : (val > 70 ? '#1d4ed8' : (val > 30 ? '#3b82f6' : '#93c5fd'));
        
        return { x, z, color, val };
      });
    }).flat();
  }, [analysisData]);

  if (!showGEE || !meshData) return null;

  return (
    <group position={[0, -0.15, 0]}>
      {meshData.map((p: any, idx: number) => (
        <mesh key={idx} position={[p.x, 0, p.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2, 2]} />
          <meshBasicMaterial 
            color={p.color} 
            transparent 
            opacity={0.3} 
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
};
