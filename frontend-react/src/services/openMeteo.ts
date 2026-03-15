import { z } from 'zod';

const OPEN_METEO_BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const CACHE_TTL_MS = 10 * 60 * 1000;
const STORAGE_KEY = 'open-meteo-cache-v1';


const parseIsoDate = (value: string) => new Date(value);

const formatDateOnly = (value: Date) => {
  if (Number.isNaN(value.getTime())) return 'invalid-date';
  return value.toISOString().slice(0, 10);
};

export const OPEN_METEO_HOURLY_FIELDS = [
  'temperature_2m', 'relative_humidity_2m', 'dew_point_2m', 'apparent_temperature', 'precipitation_probability', 'precipitation', 'rain', 'showers', 'snowfall', 'snow_depth', 'vapour_pressure_deficit', 'et0_fao_evapotranspiration', 'evapotranspiration', 'visibility', 'cloud_cover_high', 'cloud_cover_mid', 'cloud_cover_low', 'cloud_cover', 'surface_pressure', 'pressure_msl', 'weather_code', 'wind_speed_10m', 'wind_speed_80m', 'wind_speed_120m', 'wind_speed_180m', 'wind_direction_10m', 'wind_direction_80m', 'wind_direction_120m', 'wind_direction_180m', 'wind_gusts_10m', 'temperature_80m', 'temperature_120m', 'temperature_180m', 'soil_moisture_27_to_81cm', 'soil_moisture_9_to_27cm', 'soil_moisture_3_to_9cm', 'soil_moisture_1_to_3cm', 'soil_moisture_0_to_1cm', 'soil_temperature_54cm', 'soil_temperature_18cm', 'soil_temperature_6cm', 'soil_temperature_0cm',
] as const;

const openMeteoSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  generationtime_ms: z.number().optional(),
  utc_offset_seconds: z.number().optional(),
  timezone: z.string().optional(),
  timezone_abbreviation: z.string().optional(),
  hourly: z.record(z.array(z.number().nullable())).and(z.object({ time: z.array(z.string()) })),
});

export type OpenMeteoResponse = z.infer<typeof openMeteoSchema>;
export type OpenMeteoHourlyField = (typeof OPEN_METEO_HOURLY_FIELDS)[number];

export interface OpenMeteoParams {
  latitude: number;
  longitude: number;
  start_date: string;
  end_date: string;
  hourly?: OpenMeteoHourlyField[];
  timezone?: string;
}

interface CacheEntry {
  expiresAt: number;
  data: OpenMeteoResponse;
}

const inMemoryCache = new Map<string, CacheEntry>();

const loadLocalStorage = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const payload = JSON.parse(raw) as Record<string, CacheEntry>;
    Object.entries(payload).forEach(([key, value]) => {
      if (value.expiresAt > Date.now()) inMemoryCache.set(key, value);
    });
  } catch {
    // ignore cache parsing issues
  }
};

const saveLocalStorage = () => {
  if (typeof window === 'undefined') return;
  const payload = Object.fromEntries(inMemoryCache.entries());
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};

if (typeof window !== 'undefined') loadLocalStorage();

const keyFromParams = (params: OpenMeteoParams) => {
  const hourly = params.hourly ?? [...OPEN_METEO_HOURLY_FIELDS];
  return JSON.stringify({
    lat: Number(params.latitude.toFixed(4)),
    lon: Number(params.longitude.toFixed(4)),
    start: params.start_date,
    end: params.end_date,
    timezone: params.timezone ?? 'auto',
    hourly,
  });
};

const buildUrl = (params: OpenMeteoParams) => {
  const hourly = params.hourly ?? [...OPEN_METEO_HOURLY_FIELDS];
  const search = new URLSearchParams({
    latitude: String(params.latitude),
    longitude: String(params.longitude),
    hourly: hourly.join(','),
    past_days: '92',
    forecast_days: '16',
    time_mode: 'time_interval',
    start_date: params.start_date,
    end_date: params.end_date,
    timezone: params.timezone ?? 'auto',
  });

  return `${OPEN_METEO_BASE_URL}?${search.toString()}`;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, retries = 2): Promise<OpenMeteoResponse> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Open-Meteo request failed (${response.status})`);
      const json = await response.json();
      return openMeteoSchema.parse(json);
    } catch (error) {
      lastError = error;
      if (attempt < retries) await wait(250 * (attempt + 1));
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Open-Meteo request failed');
}

export async function getForecastAndHistory(params: OpenMeteoParams): Promise<OpenMeteoResponse> {
  const cacheKey = keyFromParams(params);
  const cached = inMemoryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  try {
    const data = await fetchWithRetry(buildUrl(params));
    inMemoryCache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    saveLocalStorage();
    return data;
  } catch (error) {
    if (cached) return cached.data;
    throw error;
  }
}

export const weatherCodeToText = (code?: number | null) => {
  if (code == null) return 'Sem dados';
  if (code === 0) return 'Céu limpo';
  if ([1, 2, 3].includes(code)) return 'Parcialmente nublado';
  if ([45, 48].includes(code)) return 'Névoa';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Garoa';
  if ([61, 63, 65, 80, 81, 82].includes(code)) return 'Chuva';
  if ([71, 73, 75, 85, 86].includes(code)) return 'Neve';
  if ([95, 96, 99].includes(code)) return 'Tempestade';
  return 'Condição variável';
};

export function toSeries(data: OpenMeteoResponse, field: OpenMeteoHourlyField) {
  const values = data.hourly[field] ?? [];
  return data.hourly.time.map((time, index) => ({
    time: parseIsoDate(time),
    value: values[index] ?? null,
  }));
}

export function groupByDay(data: OpenMeteoResponse, field: OpenMeteoHourlyField) {
  const series = toSeries(data, field);
  return series.reduce<Record<string, Array<{ time: Date; value: number | null }>>>((acc, point) => {
    const day = formatDateOnly(point.time);
    acc[day] ??= [];
    acc[day].push(point);
    return acc;
  }, {});
}

export function summarizeWeather(data: OpenMeteoResponse) {
  const temp = data.hourly.temperature_2m ?? [];
  const rain = data.hourly.precipitation ?? [];
  const wind = data.hourly.wind_speed_10m ?? [];

  const tempNumbers = temp.filter((value): value is number => typeof value === "number");
  const rainNumbers = rain.filter((value): value is number => typeof value === "number");
  const windNumbers = wind.filter((value): value is number => typeof value === "number");

  return {
    maxTemp: tempNumbers.length ? Math.max(...tempNumbers) : null,
    minTemp: tempNumbers.length ? Math.min(...tempNumbers) : null,
    accumulatedRain: rainNumbers.reduce((total, value) => total + value, 0),
    maxWind: windNumbers.length ? Math.max(...windNumbers) : null,
  };
}

export async function getCurrentWeather(lat: number, lon: number): Promise<{ temp: number; humidity: number; windSpeed: number; code: number }> {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch current weather');
    const json = await response.json();
    const cur = json.current;
    return {
      temp: cur.temperature_2m,
      humidity: cur.relative_humidity_2m,
      windSpeed: cur.wind_speed_10m,
      code: cur.weather_code
    };
}
