import { weatherCodeToText } from '../../services/openMeteo';

interface WeatherPopupCardProps {
  timestamp?: string;
  temperature?: number | null;
  precipitationProbability?: number | null;
  precipitation?: number | null;
  windSpeed?: number | null;
  windDirection?: number | null;
  weatherCode?: number | null;
}

export function WeatherPopupCard(props: WeatherPopupCardProps) {
  return (
    <div className="space-y-1 text-xs">
      <p className="font-semibold text-slate-100">Clima no ponto</p>
      {props.timestamp && <p className="text-slate-300">{new Date(props.timestamp).toLocaleString('pt-BR')}</p>}
      <p>🌡️ Temperatura: <strong>{props.temperature?.toFixed(1) ?? '--'}°C</strong></p>
      <p>🌧️ Chuva: {props.precipitationProbability ?? '--'}% · {props.precipitation ?? '--'} mm</p>
      <p>💨 Vento: {props.windSpeed ?? '--'} km/h ({props.windDirection ?? '--'}°)</p>
      <p>⛅ Condição: {weatherCodeToText(props.weatherCode)}</p>
    </div>
  );
}
