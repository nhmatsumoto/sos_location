/**
 * WeatherDataFetcher — Real-time weather context from:
 *   • NASA GOES (NOAA CDN, no auth, ~5-minute delay) — cloud imagery
 *   • NASA EPIC (DSCOVR, epic.gsfc.nasa.gov) — global Earth imagery
 *   • Open-Meteo (free, no auth) — current weather parameters
 *
 * Returned data is used by the 3D engine to:
 *   - Set cloud cover + cloud base height for atmosphere shaders
 *   - Provide real-time weather overlay texture for terrain
 *   - Drive precipitation type/intensity from actual conditions
 */

export interface WeatherContext {
  /** Open-Meteo current conditions */
  temperature: number;        // °C
  humidity: number;           // %
  cloudCoverPct: number;      // 0–100
  precipMmH: number;          // mm/h
  windSpeedMs: number;        // m/s
  windDirectionDeg: number;   // °
  weatherCode: number;        // WMO weather code
  isDay: boolean;

  /** NASA GOES – direct CDN imagery URL for the scene's sector */
  goesImageUrl: string | null;
  goesFullDiskUrl: string | null;

  /** NASA EPIC – latest global Earth image metadata */
  epicImageUrl: string | null;
  epicCapturedAt: string | null;

  fetchedAt: string;
}

// ── GOES sector selection ─────────────────────────────────────────────────────

type GoesSector = 'CONUS' | 'FD' | 'MESO1' | 'TROPICS';

function selectGoesSector(lat: number, lng: number): GoesSector {
  // CONUS: continental US
  if (lat >= 24 && lat <= 50 && lng >= -126 && lng <= -66) return 'CONUS';
  // Tropics band
  if (lat >= -20 && lat <= 20) return 'TROPICS';
  // Default: full disk
  return 'FD';
}

function goesImageUrl(sector: GoesSector): { sector: string; full: string } {
  const base = 'https://cdn.star.nesdis.noaa.gov/GOES16/ABI';
  switch (sector) {
    case 'CONUS':   return { sector: `${base}/CONUS/GEOCOLOR/1250x750.jpg`,    full: `${base}/FD/GEOCOLOR/1808x1808.jpg` };
    case 'TROPICS': return { sector: `${base}/TROPICS/GEOCOLOR/1000x1000.jpg`, full: `${base}/FD/GEOCOLOR/678x678.jpg` };
    default:        return { sector: `${base}/FD/GEOCOLOR/1808x1808.jpg`,       full: `${base}/FD/GEOCOLOR/1808x1808.jpg` };
  }
}

// ── Open-Meteo ────────────────────────────────────────────────────────────────

async function fetchOpenMeteo(lat: number, lng: number): Promise<Partial<WeatherContext>> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}`
      + `&current=temperature_2m,relative_humidity_2m,cloud_cover,precipitation,wind_speed_10m,wind_direction_10m,weather_code,is_day`
      + `&forecast_days=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error('meteo error');
    const data = await res.json();
    const c = data.current ?? {};
    return {
      temperature:       c.temperature_2m     ?? 20,
      humidity:          c.relative_humidity_2m ?? 60,
      cloudCoverPct:     c.cloud_cover        ?? 30,
      precipMmH:         c.precipitation      ?? 0,
      windSpeedMs:       (c.wind_speed_10m    ?? 0) / 3.6,
      windDirectionDeg:  c.wind_direction_10m ?? 0,
      weatherCode:       c.weather_code       ?? 0,
      isDay:             c.is_day             === 1,
    };
  } catch {
    return { temperature: 20, humidity: 60, cloudCoverPct: 30, precipMmH: 0, windSpeedMs: 0, windDirectionDeg: 0, weatherCode: 0, isDay: true };
  }
}

// ── NASA EPIC ──────────────────────────────────────────────────────────────────

async function fetchEpicLatest(): Promise<{ url: string | null; capturedAt: string | null }> {
  try {
    const meta = await fetch('https://epic.gsfc.nasa.gov/api/natural/images?count=1', { signal: AbortSignal.timeout(6000) });
    if (!meta.ok) return { url: null, capturedAt: null };
    const data = await meta.json() as unknown;
    if (!Array.isArray(data) || data.length === 0) return { url: null, capturedAt: null };
    const img = data[0] as { date?: string; image?: string };
    if (typeof img.date !== 'string' || typeof img.image !== 'string') {
      return { url: null, capturedAt: null };
    }
    const d = img.date.substring(0, 10).replace(/-/g, '/');
    const url = `https://epic.gsfc.nasa.gov/archive/natural/${d}/jpg/${img.image}.jpg`;
    return { url, capturedAt: img.date };
  } catch {
    return { url: null, capturedAt: null };
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export class WeatherDataFetcher {
  /**
   * Fetch all weather context for a geographic point.
   * Runs Open-Meteo + EPIC in parallel; GOES URLs are constructed synchronously.
   */
  static async fetch(lat: number, lng: number): Promise<WeatherContext> {
    const sector = selectGoesSector(lat, lng);
    const goes = goesImageUrl(sector);

    const [meteo, epic] = await Promise.all([
      fetchOpenMeteo(lat, lng),
      fetchEpicLatest(),
    ]);

    return {
      temperature:       meteo.temperature      ?? 20,
      humidity:          meteo.humidity         ?? 60,
      cloudCoverPct:     meteo.cloudCoverPct    ?? 30,
      precipMmH:         meteo.precipMmH        ?? 0,
      windSpeedMs:       meteo.windSpeedMs      ?? 0,
      windDirectionDeg:  meteo.windDirectionDeg ?? 0,
      weatherCode:       meteo.weatherCode      ?? 0,
      isDay:             meteo.isDay            ?? true,
      goesImageUrl:      goes.sector,
      goesFullDiskUrl:   goes.full,
      epicImageUrl:      epic.url,
      epicCapturedAt:    epic.capturedAt,
      fetchedAt:         new Date().toISOString(),
    };
  }
}
