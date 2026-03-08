import React, { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { RenderOrchestrator } from '../core/RenderOrchestrator';
import { useSimulationStore } from '../../store/useSimulationStore';

export const EngineController: React.FC = () => {
    const { scene, camera, gl } = useThree();
    const { heroPosition, box: simulationBox, cameraTarget, activeLayers } = useSimulationStore();
    
    useEffect(() => {
        const orchestrator = RenderOrchestrator.getInstance();
        orchestrator.init(scene, camera, gl);
        
        return () => {
            orchestrator.dispose();
        };
    }, [scene, camera, gl]);

    useEffect(() => {
        const orchestrator = RenderOrchestrator.getInstance();
        const focusPoint = cameraTarget === 'hero' 
            ? heroPosition 
            : (simulationBox ? simulationBox.center : heroPosition);
            
        orchestrator.update(focusPoint[0], focusPoint[1], activeLayers);
    }, [heroPosition, simulationBox, cameraTarget, activeLayers]);


    return null;
};
