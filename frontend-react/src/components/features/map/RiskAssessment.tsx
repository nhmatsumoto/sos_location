import React, { useMemo } from 'react';
import { useSimulationStore } from '../../../store/useSimulationStore';

export const RiskAssessment: React.FC = () => {
  const { box, soilSaturation, soilType, rainIntensity, isSimulating } = useSimulationStore();

  const riskFactors = useMemo(() => {
    if (!box || !isSimulating) return null;

    // Logic: High saturation + Low absorption soil + High rain = Red Zones
    const baseRisk = (soilSaturation / 100) * (rainIntensity / 100);
    const absorptionModifier = soilType === 'clay' ? 1.5 : (soilType === 'rocky' ? 2.0 : (soilType === 'sandy' ? 0.5 : 1.0));
    
    const totalRisk = Math.min(baseRisk * absorptionModifier, 1.0);
    
    if (totalRisk < 0.3) return null;

    const x = (box.center[1] + 51.9) * 2;
    const z = -(box.center[0] + 14.2) * 2;
    const width = box.size[0] / 10000;
    const height = box.size[1] / 10000;

    return { x, z, width, height, color: totalRisk > 0.7 ? '#ef4444' : '#f59e0b', intensity: totalRisk };
  }, [box, soilSaturation, soilType, rainIntensity, isSimulating]);

  if (!riskFactors) return null;

  return (
    <mesh position={[riskFactors.x, 0.01, riskFactors.z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[riskFactors.width * 1.2, riskFactors.height * 1.2]} />
      <meshBasicMaterial 
        color={riskFactors.color} 
        transparent 
        opacity={riskFactors.intensity * 0.3} 
      />
    </mesh>
  );
};
