import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Popup, useMap } from 'react-leaflet';
import type { OperationsSnapshot } from '../../services/operationsApi';
import { getForecastAndHistory, OPEN_METEO_HOURLY_FIELDS, type OpenMeteoResponse } from '../../services/openMeteo';
import { LeafletThreeLayer } from '../layers/LeafletThreeLayer';
import { WeatherLayer } from '../layers/WeatherLayer';
import { useMapStore } from '../store/mapStore';
import { BaseLayers } from './BaseLayers';
import { FloatingPanels } from './FloatingPanels';
import { MapEvents } from './MapEvents';
import { OverlayLayers } from './OverlayLayers';
import { WeatherPopupCard } from './WeatherPopupCard';

function WeatherCanvasBridge({ active, value }: { active: boolean; value: number | null }) {
  const map = useMap();
  const [layer] = useState(() => new WeatherLayer());

  useEffect(() => {
    if (!active) {
      map.removeLayer(layer);
      return;
    }
    map.addLayer(layer);
    return () => {
      map.removeLayer(layer);
    };
  }, [active, layer, map]);

  useEffect(() => {
    if (!active || value == null) return;
    const center = map.getCenter();
    layer.setPoints([{ lat: center.lat, lng: center.lng, value }]);
  }, [active, layer, map, value]);

  return null;
}

function ThreeBridge({ active, bars }: { active: boolean; bars: Array<{ id: string; lat: number; lng: number; height: number }> }) {
  const map = useMap();
  const [layer] = useState(() => new LeafletThreeLayer());

  useEffect(() => {
    if (!active) {
      map.removeLayer(layer);
      return;
    }
    map.addLayer(layer);
    return () => {
      map.removeLayer(layer);
    };
  }, [active, layer, map]);

  useEffect(() => {
    if (!active) return;
    layer.setBars(bars);
  }, [active, layer, bars]);

  return null;
}

export function MapShell({ data }: { data: OperationsSnapshot | null }) {
  const [weatherData, setWeatherData] = useState<OpenMeteoResponse | null>(null);
  const [selectedLatLng, setSelectedLatLng] = useState<[number, number] | null>(null);
  const { layersEnabled, timelineCursor, timeRange } = useMapStore((state) => state);

  const current = weatherData
    ? {
      timestamp: weatherData.hourly.time[timelineCursor],
      temperature: weatherData.hourly.temperature_2m?.[timelineCursor],
      precipitationProbability: weatherData.hourly.precipitation_probability?.[timelineCursor],
      precipitation: weatherData.hourly.precipitation?.[timelineCursor],
      windSpeed: weatherData.hourly.wind_speed_10m?.[timelineCursor],
      windDirection: weatherData.hourly.wind_direction_10m?.[timelineCursor],
      weatherCode: weatherData.hourly.weather_code?.[timelineCursor],
    }
    : null;

  const bars = useMemo(() => {
    if (!selectedLatLng || !current?.precipitation) return [];
    return [{ id: 'clicked-point', lat: selectedLatLng[0], lng: selectedLatLng[1], height: current.precipitation * 8 }];
  }, [selectedLatLng, current?.precipitation]);

  const onMapClick = async (lat: number, lng: number) => {
    setSelectedLatLng([lat, lng]);
    const response = await getForecastAndHistory({
      latitude: lat,
      longitude: lng,
      start_date: timeRange.start,
      end_date: timeRange.end,
      timezone: 'auto',
      hourly: [...OPEN_METEO_HOURLY_FIELDS],
    });
    setWeatherData(response);
  };

  return (
    <div className="relative h-[520px] overflow-hidden rounded-xl border border-slate-700">
      <MapContainer center={[-21.1215, -42.9427]} zoom={13} style={{ height: '100%', width: '100%' }}>
        <BaseLayers />
        <MapEvents onMapClick={(lat, lng) => { void onMapClick(lat, lng); }} />
        <OverlayLayers data={data} />
        <WeatherCanvasBridge active={layersEnabled.weather} value={current?.precipitation ?? null} />
        <ThreeBridge active={layersEnabled.three} bars={bars} />
        {selectedLatLng && current && (
          <Popup position={selectedLatLng}>
            <WeatherPopupCard {...current} />
          </Popup>
        )}
      </MapContainer>
      <FloatingPanels weatherData={weatherData} snapshot={data} />
    </div>
  );
}
