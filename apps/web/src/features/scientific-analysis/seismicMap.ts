import type {
  SeismicReplayFrame,
  SeismicReplayManifest,
  SimulationRun,
} from '../../schemas/api';
import { useAppStore } from '../../stores/appStore';

export function activateSeismicSimulation(
  run: SimulationRun,
  replayFrameIndex: number | null,
) {
  if (
    run.intensityWest == null
    || run.intensitySouth == null
    || run.intensityEast == null
    || run.intensityNorth == null
  ) {
    return;
  }

  useAppStore.setState((state) => ({
    watchedSimulationId: run.id,
    activeSimulation: {
      id: run.id,
      revisionId: run.cityRevisionId,
      west: run.intensityWest!,
      south: run.intensitySouth!,
      east: run.intensityEast!,
      north: run.intensityNorth!,
      replayFrameIndex,
    },
    layers: { ...state.layers, seismicIntensity: true },
  }));
}

/** Constrói um overlay genérico com epicentro, envelope da frente S e
 * estatísticas direcionais calculadas pelo solver. */
export function buildSeismicDirectionOverlay(
  replay: SeismicReplayManifest,
  frame: SeismicReplayFrame,
): GeoJSON.FeatureCollection {
  const diagonalKm = haversineKm(replay.west, replay.south, replay.east, replay.north);
  const meanFrontKm = Math.min(
    Math.max(0.25, replay.meanShearVelocityMps * frame.timeSeconds / 1000),
    diagonalKm * 1.15,
  );
  const minimumFrontKm = Math.min(
    Math.max(0.2, replay.minimumShearVelocityMps * frame.timeSeconds / 1000),
    diagonalKm * 1.15,
  );
  const maximumFrontKm = Math.min(
    Math.max(0.3, replay.maximumShearVelocityMps * frame.timeSeconds / 1000),
    diagonalKm * 1.15,
  );
  const maximumSectorPga = Math.max(0.001, ...replay.directionSectors.map((sector) => sector.peakPgaG));
  const features: GeoJSON.Feature[] = [];

  for (const sector of replay.directionSectors) {
    const destination = destinationPoint(
      replay.epicenterLon,
      replay.epicenterLat,
      sector.centerBearingDegrees,
      meanFrontKm,
    );
    const normalized = sector.peakPgaG / maximumSectorPga;
    features.push({
      type: 'Feature',
      properties: {
        analysisKind: 'direction',
        analysisColor: accelerationColor(sector.peakPgaG),
        analysisWidth: 1.5 + normalized * 4,
        analysisOpacity: 0.45 + normalized * 0.5,
        analysisLabel: `${sector.direction} · ${sector.peakPgaG.toFixed(3)} g`,
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [replay.epicenterLon, replay.epicenterLat],
          destination,
        ],
      },
    });
  }

  const rings = [
    {
      radius: minimumFrontKm,
      color: '#38bdf8',
      width: 1,
      label: `Vs mín. · ${minimumFrontKm.toFixed(1)} km`,
    },
    {
      radius: meanFrontKm,
      color: '#22d3ee',
      width: 2.5,
      label: `Frente média · ${meanFrontKm.toFixed(1)} km`,
    },
    {
      radius: maximumFrontKm,
      color: '#a5f3fc',
      width: 1,
      label: `Vs máx. · ${maximumFrontKm.toFixed(1)} km`,
    },
  ];
  for (const ring of rings) {
    features.push({
      type: 'Feature',
      properties: {
        analysisKind: 'wavefront',
        analysisColor: ring.color,
        analysisWidth: ring.width,
        analysisOpacity: 0.72,
        analysisLabel: ring.label,
      },
      geometry: {
        type: 'LineString',
        coordinates: geodesicCircle(
          replay.epicenterLon,
          replay.epicenterLat,
          ring.radius,
        ),
      },
    });
  }

  features.push({
    type: 'Feature',
    properties: {
      analysisKind: 'epicenter',
      analysisColor: '#fde047',
      analysisRadius: 9,
      analysisOpacity: 1,
      analysisLabel: `Epicentro · Mw ${replay.momentMagnitude.toFixed(1)}`,
    },
    geometry: {
      type: 'Point',
      coordinates: [replay.epicenterLon, replay.epicenterLat],
    },
  });

  return { type: 'FeatureCollection', features };
}

function geodesicCircle(lon: number, lat: number, radiusKm: number) {
  const coordinates: [number, number][] = [];
  for (let bearing = 0; bearing <= 360; bearing += 6) {
    coordinates.push(destinationPoint(lon, lat, bearing, radiusKm));
  }
  return coordinates;
}

function destinationPoint(
  lon: number,
  lat: number,
  bearingDegrees: number,
  distanceKm: number,
): [number, number] {
  const angularDistance = distanceKm / 6371.0088;
  const bearing = bearingDegrees * Math.PI / 180;
  const latitude = lat * Math.PI / 180;
  const longitude = lon * Math.PI / 180;
  const destinationLatitude = Math.asin(
    Math.sin(latitude) * Math.cos(angularDistance)
    + Math.cos(latitude) * Math.sin(angularDistance) * Math.cos(bearing),
  );
  const destinationLongitude = longitude + Math.atan2(
    Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latitude),
    Math.cos(angularDistance) - Math.sin(latitude) * Math.sin(destinationLatitude),
  );
  return [
    destinationLongitude * 180 / Math.PI,
    destinationLatitude * 180 / Math.PI,
  ];
}

function haversineKm(lon1: number, lat1: number, lon2: number, lat2: number) {
  const latitudeDelta = (lat2 - lat1) * Math.PI / 180;
  const longitudeDelta = (lon2 - lon1) * Math.PI / 180;
  const firstLatitude = lat1 * Math.PI / 180;
  const secondLatitude = lat2 * Math.PI / 180;
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(firstLatitude) * Math.cos(secondLatitude)
    * Math.sin(longitudeDelta / 2) ** 2;
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function accelerationColor(accelerationG: number) {
  if (accelerationG >= 0.7) return '#fff4e6';
  if (accelerationG >= 0.4) return '#da2d23';
  if (accelerationG >= 0.2) return '#f57d20';
  if (accelerationG >= 0.08) return '#f6d546';
  if (accelerationG >= 0.02) return '#19becd';
  if (accelerationG >= 0.005) return '#185caa';
  return '#0a1640';
}
