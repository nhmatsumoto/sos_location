import { useEffect, useRef, useState } from 'react';
import type { FlowSimulationResponse } from '../types';
import { initialFlowForm, ENABLE_SIMULATION } from '../constants';
import type { FlowCell, FlowPathPoint } from '../types';

interface ScenarioConfig {
  steps: number;
  cellSizeMeters: number;
  volumeFactor: number;
  label: string;
}

const SCENARIOS: Record<'encosta' | 'urbano' | 'rural', ScenarioConfig> = {
  encosta: { steps: 130, cellSizeMeters: 20, volumeFactor: 0.055, label: 'Encosta crítica' },
  urbano: { steps: 110, cellSizeMeters: 22, volumeFactor: 0.045, label: 'Bairro urbano' },
  rural: { steps: 95, cellSizeMeters: 26, volumeFactor: 0.038, label: 'Área rural' },
};

const buildFlowResponse = (flowForm: typeof initialFlowForm): FlowSimulationResponse => {
  const activeScenario = SCENARIOS[flowForm.scenario] || SCENARIOS.encosta;
  const rainfall = Number(flowForm.rainfallMmPerHour) || 0;
  const sourceLat = Number(flowForm.sourceLat);
  const sourceLng = Number(flowForm.sourceLng);
  const stepCount = Math.max(12, Math.round(activeScenario.steps / 10));
  const initialVolume = Math.max(1.8, Number((rainfall * activeScenario.volumeFactor).toFixed(2)));

  const direction = flowForm.scenario === 'urbano'
    ? { lat: -0.00085, lng: 0.00105, spread: 1.15 }
    : flowForm.scenario === 'rural'
      ? { lat: -0.00125, lng: 0.00035, spread: 0.85 }
      : { lat: -0.00135, lng: 0.00085, spread: 1.35 };

  const floodedCells: FlowCell[] = [];
  const mainPath: FlowPathPoint[] = [];

  for (let index = 0; index < stepCount; index += 1) {
    const progress = index / Math.max(1, stepCount - 1);
    const attenuation = Math.max(0.28, 1 - progress * 0.7);
    const pathLat = sourceLat + direction.lat * index;
    const pathLng = sourceLng + direction.lng * index;
    const pathDepth = Number(Math.max(0.08, initialVolume * attenuation * 0.34).toFixed(2));
    const pathVelocity = Number(Math.max(0.1, (rainfall / 220) + attenuation * 0.55).toFixed(2));

    mainPath.push({
      step: index,
      lat: pathLat,
      lng: pathLng,
      depth: pathDepth,
    });

    const lateralOffsets = [
      { lat: 0, lng: 0, depthFactor: 1, velocityFactor: 1 },
      { lat: 0.00022 * direction.spread, lng: 0.00016 * direction.spread, depthFactor: 0.8, velocityFactor: 0.88 },
      { lat: -0.00018 * direction.spread, lng: -0.00014 * direction.spread, depthFactor: 0.62, velocityFactor: 0.76 },
    ];

    lateralOffsets.forEach((offset, offsetIndex) => {
      floodedCells.push({
        lat: pathLat + offset.lat,
        lng: pathLng + offset.lng,
        depth: Number(Math.max(0.05, pathDepth * offset.depthFactor).toFixed(2)),
        terrain: Number((32 - progress * 8 + offsetIndex * 1.4).toFixed(2)),
        velocity: Number(Math.max(0.08, pathVelocity * offset.velocityFactor).toFixed(2)),
      });
    });
  }

  const estimatedAffectedAreaM2 = Math.round(
    floodedCells.reduce((sum, cell) => sum + Math.max(1, cell.depth * activeScenario.cellSizeMeters * activeScenario.cellSizeMeters * 0.6), 0),
  );
  const maxDepth = Math.max(...floodedCells.map((cell) => cell.depth), 0);

  return {
    generatedAtUtc: new Date().toISOString(),
    floodedCells,
    mainPath,
    maxDepth,
    estimatedAffectedAreaM2,
    disclaimer: `Simulação determinística local (${activeScenario.label}).`,
  };
};

export function useSimulation() {
  const [flowForm, setFlowForm] = useState(initialFlowForm);
  const [flowResult, setFlowResult] = useState<FlowSimulationResponse | null>(null);
  const [flowError, setFlowError] = useState('');
  const [runningFlow, setRunningFlow] = useState(false);
  const [splatUploading, setSplatUploading] = useState(false);
  const [splatError, setSplatError] = useState('');
  const sourceVideoUrlRef = useRef<string | null>(null);

  useEffect(() => () => {
    if (sourceVideoUrlRef.current) {
      URL.revokeObjectURL(sourceVideoUrlRef.current);
    }
  }, []);

  const handleRunFlow = async () => {
    setFlowError('');
    if (!ENABLE_SIMULATION) {
      setFlowResult(null);
      setFlowError('Simulações estão desabilitadas no momento.');
      return;
    }

    setRunningFlow(true);
    try {
      const activeScenario = SCENARIOS[flowForm.scenario] || SCENARIOS.encosta;
      const flowData = buildFlowResponse(flowForm);
      setFlowResult(flowData);
      setFlowError(`Cenário aplicado: ${activeScenario.label}.`);
    } catch (error) {
      setFlowError(error instanceof Error ? error.message : 'Erro na simulação.');
    } finally {
      setRunningFlow(false);
    }
  };

  const handleSplatUpload = async (formData: { latitude: string; longitude: string; video: File }) => {
    setSplatUploading(true);
    setSplatError('');

    if (!formData.video) {
      const message = 'Selecione um vídeo para gerar a cena.';
      setSplatError(message);
      setSplatUploading(false);
      return { success: false, error: message };
    }

    try {
      if (sourceVideoUrlRef.current) {
        URL.revokeObjectURL(sourceVideoUrlRef.current);
      }

      const sourceVideoUrl = URL.createObjectURL(formData.video);
      sourceVideoUrlRef.current = sourceVideoUrl;

      return {
        success: true,
        data: {
          splatUrl: null,
          sourceVideoUrl,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro no splatting.';
      setSplatError(message);
      return { success: false, error: message };
    } finally {
      setSplatUploading(false);
    }
  };

  return {
    flowForm, setFlowForm,
    flowResult, setFlowResult,
    flowError, setFlowError,
    runningFlow,
    handleRunFlow,
    splatUploading,
    splatError,
    handleSplatUpload,
  };
}
