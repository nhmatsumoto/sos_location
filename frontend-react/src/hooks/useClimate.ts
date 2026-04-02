import { useState, useCallback } from 'react';
import { dataHubApi } from '../services/dataHubApi';
import type { ClimakiSnapshot } from '../types';

interface WeatherForecastResponse {
  source?: string;
  current?: {
    temperature?: number;
    humidity?: number;
    windSpeed?: number;
    precipitation?: number;
    weatherCode?: number;
  };
  daily?: Array<{
    date?: string;
    maxTemp?: number;
    minTemp?: number;
    precipitationSum?: number;
    weatherCode?: number;
  }>;
}

export function useClimate() {
  const [climakiSnapshot, setClimakiSnapshot] = useState<ClimakiSnapshot | null>(null);
  const [loadingClimaki, setLoadingClimaki] = useState(true);
  const [climakiError, setClimakiError] = useState('');

  const loadClimakiContext = useCallback(async () => {
    setLoadingClimaki(true);
    setClimakiError('');

    try {
      const response = await dataHubApi.weatherForecast(-21.1215, -42.9427);
      const data = response.data as WeatherForecastResponse | undefined;
      const current = data?.current ?? {};
      const daily = Array.isArray(data?.daily) ? data.daily : [];

      const rainLast24hMm = Number(current.precipitation ?? daily[0]?.precipitationSum ?? 0) || 0;
      const rainLast72hMm = Number(
        daily.slice(0, 3).reduce((sum, day) => sum + Number(day.precipitationSum ?? 0), 0)
      ) || 0;
      const soilMoisturePercent = Number(current.humidity) || 35;
      const temperatureC = Number(current.temperature ?? daily[0]?.maxTemp ?? 24);

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
        fetchedAtIso: new Date().toISOString(),
        locationLabel: 'Ubá (MG) • integrações climáticas externas',
        temperatureC,
        rainLast24hMm,
        rainLast72hMm,
        soilMoisturePercent,
        saturationLevel,
        saturationRisk,
        providers: [data?.source ?? 'Open-Meteo'],
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
