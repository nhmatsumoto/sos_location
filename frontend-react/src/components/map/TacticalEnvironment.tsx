import React from 'react';
import { TerrainMesh } from './TerrainMesh';
import { OSMBuildings } from './OSMBuildings';
import { TacticalVegetation } from './TacticalVegetation';
import { TacticalStreets } from './TacticalStreets';
import { useSimulationStore } from '../../store/useSimulationStore';

export const TacticalEnvironment: React.FC = () => {
  const { showStreets, showVegetation, activeLayers } = useSimulationStore();

  return (
    <group>
      <TerrainMesh />
      {activeLayers.buildings && <OSMBuildings />}
      {showVegetation && <TacticalVegetation />}
      {showStreets && <TacticalStreets />}
      
      <ambientLight intensity={0.2} />
    </group>
  );
};
