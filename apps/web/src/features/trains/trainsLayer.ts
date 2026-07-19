import { SimpleMeshLayer } from '@deck.gl/mesh-layers';
import { CubeGeometry } from '@luma.gl/engine';
import type { Layer } from '@deck.gl/core';
import { TRAIN_LINE_COLORS, type TrainState } from './trainSimulation';

// Geometria procedural (cubo unitário escalado em metros) — nenhum asset externo.
const TRAIN_MESH = new CubeGeometry();

/** Vagão ~18 m × 3 m × 3.4 m, orientado pelo rumo da via (estilo Mini Tokyo 3D). */
export function buildTrainsLayer(trains: TrainState[]): Layer {
  return new SimpleMeshLayer<TrainState>({
    id: 'sos-trains-sim',
    data: trains,
    mesh: TRAIN_MESH,
    getPosition: (t) => [t.position[0], t.position[1], 2],
    // Yaw do deck é anti-horário a partir do leste; bearing é horário a partir do norte.
    getOrientation: (t) => [0, 90 - t.bearing, 0],
    getColor: (t) => TRAIN_LINE_COLORS[t.routeIndex % TRAIN_LINE_COLORS.length],
    getScale: [9, 1.5, 1.7],
    sizeScale: 1,
    pickable: false,
    material: { ambient: 0.55, diffuse: 0.6, shininess: 40, specularColor: [60, 60, 60] },
  });
}
