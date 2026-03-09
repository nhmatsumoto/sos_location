import { useEffect } from 'react';
import type { OperationsSnapshot } from '../../services/operationsApi';
import { summarizeWeather, type OpenMeteoResponse } from '../../services/openMeteo';
import { useMapStore } from '../store/mapStore';
import { FloatingPanel } from './FloatingPanel';
import { TimelineControl } from './TimelineControl';

const STORAGE_KEY = 'map-panels-state-v1';

export function FloatingPanels({ weatherData, snapshot }: { weatherData: OpenMeteoResponse | null; snapshot: OperationsSnapshot | null }) {
  const { panels, setPanelState, layersEnabled, toggleLayer, timelineCursor, setTimelineCursor } = useMapStore((state) => state);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Record<string, Partial<typeof panels.climate>>;
      Object.entries(parsed).forEach(([id, config]) => setPanelState(id, config));
    } catch {
      // ignore persistence failures
    }
  }, [setPanelState]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(panels));
  }, [panels]);

  const summary = weatherData ? summarizeWeather(weatherData) : null;

  return (
    <div className="pointer-events-none absolute inset-0 z-900">
      <FloatingPanel panel={panels.climate} title="Clima" onChange={(next) => setPanelState('climate', next)}>
        {!weatherData && <p className="text-slate-400">Clique no mapa para carregar dados Open-Meteo.</p>}
        {summary && (
          <ul className="space-y-1 text-slate-200">
            <li>Máx: {summary.maxTemp?.toFixed(1)}°C</li>
            <li>Mín: {summary.minTemp?.toFixed(1)}°C</li>
            <li>Chuva acumulada: {summary.accumulatedRain?.toFixed(1)} mm</li>
            <li>Vento máximo: {summary.maxWind?.toFixed(1)} km/h</li>
          </ul>
        )}
      </FloatingPanel>

      <FloatingPanel panel={panels.missing} title="Desaparecidos" onChange={(next) => setPanelState('missing', next)}>
        <p>Total no mapa: {snapshot?.layers?.missingPersons?.length ?? 0}</p>
        <ul className="mt-2 space-y-1">
          {(snapshot?.layers?.missingPersons ?? []).slice(0, 5).map((person) => <li key={person.id}>{person.personName}</li>)}
        </ul>
      </FloatingPanel>


      <FloatingPanel panel={panels.tools} title="Ferramentas" onChange={(next) => setPanelState('tools', next)}>
        <div className="space-y-1">
          <label className="flex items-center justify-between"><span>Weather Overlay</span><input type="checkbox" checked={layersEnabled.weather} onChange={() => toggleLayer('weather')} /></label>
          <label className="flex items-center justify-between"><span>Hotspots</span><input type="checkbox" checked={layersEnabled.hotspots} onChange={() => toggleLayer('hotspots')} /></label>
          <label className="flex items-center justify-between"><span>Desaparecidos</span><input type="checkbox" checked={layersEnabled.missingPersons} onChange={() => toggleLayer('missingPersons')} /></label>
          <label className="flex items-center justify-between"><span>3D Layer</span><input type="checkbox" checked={layersEnabled.three} onChange={() => toggleLayer('three')} /></label>
        </div>
        <div className="mt-3">
          <TimelineControl max={Math.max(0, (weatherData?.hourly?.time?.length ?? 1) - 1)} value={timelineCursor} onChange={setTimelineCursor} />
        </div>
      </FloatingPanel>
    </div>
  );
}
