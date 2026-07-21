/**
 * Simulação de trens por horário, inspirada no Mini Tokyo 3D (nagix/mini-tokyo-3d).
 *
 * Genérica por projeto: anima trens sobre QUALQUER ferrovia OSM importada
 * (road_class = "rail"), em qualquer cidade/país. As posições são uma função
 * determinística do relógio (headway fixo por linha), então todos os clientes
 * veem os mesmos trens no mesmo instante — um "timetable sintético".
 * Feeds reais (ODPT/GTFS-RT) podem ser plugados depois trocando esta função.
 */

export interface RailwayFeature {
  properties: { id: string; name?: string | null };
  geometry: { type: string; coordinates: unknown };
}

export interface RailRoute {
  id: string;
  name: string | null;
  /** Vértices [lon, lat]. */
  path: [number, number][];
  /** Distância acumulada em metros por vértice. */
  cumulative: number[];
  lengthMeters: number;
}

export interface TrainState {
  position: [number, number];
  /** Rumo em graus (0 = norte, sentido horário). */
  bearing: number;
  routeIndex: number;
}

export interface ScheduleOptions {
  /** Velocidade média (m/s). Padrão ~60 km/h. */
  speedMps?: number;
  /** Intervalo entre partidas por sentido (s). */
  headwaySeconds?: number;
  /** Ignora trechos menores que isto (m). */
  minRouteLengthMeters?: number;
}

const EARTH_RADIUS_M = 6_371_008.8;

export function haversineMeters(a: [number, number], b: [number, number]): number {
  const toRad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * toRad;
  const dLon = (b[0] - a[0]) * toRad;
  const lat1 = a[1] * toRad;
  const lat2 = b[1] * toRad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

function asLineStrings(geometry: { type: string; coordinates: unknown }): [number, number][][] {
  if (geometry.type === 'LineString') return [geometry.coordinates as [number, number][]];
  if (geometry.type === 'MultiLineString') return geometry.coordinates as [number, number][][];
  return [];
}

export function buildRailRoutes(
  features: RailwayFeature[],
  options: ScheduleOptions = {},
): RailRoute[] {
  const minLength = options.minRouteLengthMeters ?? 300;
  const routes: RailRoute[] = [];

  for (const feature of features) {
    for (const line of asLineStrings(feature.geometry)) {
      if (line.length < 2) continue;
      const cumulative: number[] = [0];
      for (let i = 1; i < line.length; i++)
        cumulative.push(cumulative[i - 1] + haversineMeters(line[i - 1], line[i]));
      const lengthMeters = cumulative[cumulative.length - 1];
      if (lengthMeters < minLength) continue;
      routes.push({
        id: feature.properties.id,
        name: feature.properties.name ?? null,
        path: line,
        cumulative,
        lengthMeters,
      });
    }
  }
  return routes;
}

export function positionAlongRoute(
  route: RailRoute,
  distanceMeters: number,
): { position: [number, number]; bearing: number } {
  const d = Math.max(0, Math.min(route.lengthMeters, distanceMeters));
  // Busca binária do segmento que contém a distância d.
  let low = 0;
  let high = route.cumulative.length - 1;
  while (low + 1 < high) {
    const mid = (low + high) >> 1;
    if (route.cumulative[mid] <= d) low = mid;
    else high = mid;
  }
  const segmentStart = route.cumulative[low];
  const segmentLength = route.cumulative[high] - segmentStart;
  const t = segmentLength > 0 ? (d - segmentStart) / segmentLength : 0;
  const [x1, y1] = route.path[low];
  const [x2, y2] = route.path[high];
  const position: [number, number] = [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t];

  const midLatRad = ((y1 + y2) / 2) * (Math.PI / 180);
  const bearing =
    (Math.atan2((x2 - x1) * Math.cos(midLatRad), y2 - y1) * 180) / Math.PI;
  return { position, bearing: (bearing + 360) % 360 };
}

/**
 * Posições dos trens no instante timeMs (época Unix). Cada rota opera um
 * serviço de vai-e-vem com partidas a cada headway, em ambos os sentidos.
 */
export function trainsAtTime(
  routes: RailRoute[],
  timeMs: number,
  options: ScheduleOptions = {},
): TrainState[] {
  const speed = options.speedMps ?? 16.7;
  const headway = options.headwaySeconds ?? 240;
  const t = timeMs / 1000;
  const trains: TrainState[] = [];

  routes.forEach((route, routeIndex) => {
    const travelTime = route.lengthMeters / speed;
    const period = 2 * travelTime; // ida + volta
    const perDirection = Math.max(1, Math.floor(travelTime / headway));

    for (let k = 0; k < perDirection; k++) {
      // Duas partidas por ciclo (uma de cada terminal), defasadas por headway.
      for (const phase of [k * headway, k * headway + travelTime]) {
        const local = ((t + phase) % period + period) % period;
        const distance =
          local <= travelTime ? local * speed : (period - local) * speed;
        const { position, bearing } = positionAlongRoute(route, distance);
        trains.push({
          position,
          bearing: local <= travelTime ? bearing : (bearing + 180) % 360,
          routeIndex,
        });
      }
    }
  });
  return trains;
}

/** Paleta de linhas (cores sólidas; hash estável por índice de rota). */
export const TRAIN_LINE_COLORS: [number, number, number][] = [
  [86, 204, 130],   // verde (JR-like)
  [240, 130, 80],   // laranja
  [95, 170, 240],   // azul
  [235, 90, 110],   // vermelho
  [200, 170, 80],   // dourado
  [170, 120, 220],  // roxo
  [90, 210, 200],   // teal
];
