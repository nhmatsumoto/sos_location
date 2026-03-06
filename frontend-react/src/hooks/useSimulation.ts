import { useState } from 'react';
import { apiClient } from '../services/apiClient';
import type { FlowSimulationResponse } from '../types';
import { initialFlowForm, ENABLE_SIMULATION } from '../constants';
import { resolveApiUrl } from '../lib/apiBaseUrl';

export function useSimulation() {
  const [flowForm, setFlowForm] = useState(initialFlowForm);
  const [flowResult, setFlowResult] = useState<FlowSimulationResponse | null>(null);
  const [flowError, setFlowError] = useState('');
  const [runningFlow, setRunningFlow] = useState(false);
  const [splatUploading, setSplatUploading] = useState(false);
  const [splatError, setSplatError] = useState('');

  const handleRunFlow = async () => {
    setFlowError('');
    if (!ENABLE_SIMULATION) {
      setFlowResult(null);
      setFlowError('Simulações estão desabilitadas no momento.');
      return;
    }

    setRunningFlow(true);
    const scenarioConfig: Record<string, any> = {
      encosta: { steps: 130, gridSize: 44, cellSizeMeters: 20, volumeFactor: 0.055, label: 'Encosta crítica' },
      urbano: { steps: 110, gridSize: 38, cellSizeMeters: 22, volumeFactor: 0.045, label: 'Bairro urbano' },
      rural: { steps: 95, gridSize: 34, cellSizeMeters: 26, volumeFactor: 0.038, label: 'Área rural' },
    };

    const activeScenario = scenarioConfig[flowForm.scenario] || scenarioConfig.encosta;
    const rainfall = Number(flowForm.rainfallMmPerHour);

    const payload = {
      sourceLat: Number(flowForm.sourceLat),
      sourceLng: Number(flowForm.sourceLng),
      rainfallMmPerHour: rainfall,
      initialVolume: Math.max(1.8, Number((rainfall * activeScenario.volumeFactor).toFixed(2))),
      steps: activeScenario.steps,
      gridSize: activeScenario.gridSize,
      cellSizeMeters: activeScenario.cellSizeMeters,
    };

    try {
      const { data } = await apiClient.post<any>('/api/simulation/easy', payload);
      const flowData = data?.flowSimulation ?? data;
      if (!flowData) throw new Error('Resposta inválida da simulação.');
      setFlowResult(flowData);
      setFlowError(`Cenário aplicado: ${activeScenario.label}.`);
    } catch (error) {
      setFlowError(error instanceof Error ? error.message : 'Erro na simulação.');
    } finally {
      setRunningFlow(false);
    }
  };

  const handleSplatUpload = async (formData: { latitude: string; longitude: string; video: File }) => {
    setSplatError('');
    setSplatUploading(true);
    try {
      const payload = new FormData();
      payload.append('latitude', formData.latitude);
      payload.append('longitude', formData.longitude);
      payload.append('video', formData.video);

      const { data } = await apiClient.post<any>('/api/splat/convert', payload);
      return { 
        success: true, 
        data: {
          splatUrl: data?.splatUrl ? resolveApiUrl(data.splatUrl) : null,
          sourceVideoUrl: data?.storedVideoPath,
        }
      };
    } catch (error) {
      setSplatError(error instanceof Error ? error.message : 'Erro no splatting.');
      return { success: false, error: error instanceof Error ? error.message : 'Erro no splatting.' };
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
