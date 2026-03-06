import { useState, useCallback } from 'react';
import { apiClient } from '../services/apiClient';
import type { ClimakiSnapshot } from '../types';

export function useClimate() {
  const [climakiSnapshot, setClimakiSnapshot] = useState<ClimakiSnapshot | null>(null);
  const [loadingClimaki, setLoadingClimaki] = useState(true);
  const [climakiError, setClimakiError] = useState('');

  const loadClimakiContext = useCallback(async () => {
    setLoadingClimaki(true);
    setClimakiError('');

    try {
      const { data } = await apiClient.get<any>('/api/climate/integrations?lat=-21.1215&lng=-42.9427');
      const summary = data?.summary ?? {};
      const rainLast24hMm = Number(summary?.rainfallMm24h) || 0;
      const rainLast72hMm = Math.round(rainLast24hMm * 1.8 * 10) / 10;
      const soilMoisturePercent = Number(summary?.relativeHumidityPercent) || 35;
      const temperatureC = Number(summary?.temperatureCelsius ?? summary?.temperatureC ?? 24);

      let saturationLevel: ClimakiSnapshot['saturationLevel'] = 'Baixa';
      let saturationRisk = 'Solo com capacidade de infiltração ainda relevante.';

      if (soilMoisturePercent >= 75 || rainLast72hMm >= 120) {
        saturationLevel = 'Crítica';
        saturationRisk = 'Solo próximo da saturação total; alto risco para escorregamentos e enxurradas.';
      } else if (soilMoisturePercent >= 60 || rainLast72hMm >= 80) {
        saturationLevel = 'Alta';
        saturationRisk = 'Solo bastante encharcado; reforçar monitoramento de encostas e drenagem.';
      } else if (soilMoisturePercent >= 45 || rainLast72hMm >= 40) {
        saturationLevel = 'Moderada';
        saturationRisk = 'Umidade moderada; atenção em caso de continuidade de chuva.';
      }

      setClimakiSnapshot({
        fetchedAtIso: data?.fetchedAtUtc ?? new Date().toISOString(),
        locationLabel: 'Ubá (MG) • integrações climáticas externas',
        temperatureC,
        rainLast24hMm,
        rainLast72hMm,
        soilMoisturePercent,
        saturationLevel,
        saturationRisk,
        providers: (data?.providers ?? []).map((provider: { provider?: string }) => provider.provider || 'Fonte externa'),
      });
    } catch (error) {
      setClimakiError(error instanceof Error ? error.message : 'Erro ao atualizar dados climáticos.');
    } finally {
      setLoadingClimaki(false);
    }
  }, []);

  return {
    climakiSnapshot,
    loadingClimaki,
    climakiError,
    loadClimakiContext,
  };
}
