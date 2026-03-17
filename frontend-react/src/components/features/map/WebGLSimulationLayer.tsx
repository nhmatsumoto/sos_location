import { useCallback, useState, useEffect } from 'react';
import { LeafletWebGLOverlay } from './LeafletWebGLOverlay';
import { WebGLRenderer } from '../../../lib/webgl/WebGLRenderer';
import { SOIL_STABILITY_VS, SOIL_STABILITY_FS } from '../../../lib/webgl/shaders/soilShaders';
import { geoCentralApi } from '../../../services/geoCentralApi';
import type { GeoPoint } from '../../../services/geoCentralApi';
import L from 'leaflet';
import { useMap } from 'react-leaflet';
import { GeoAttributeTable } from '../../ui/GeoAttributeTable';

interface WebGLSimulationLayerProps {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

export function WebGLSimulationLayer({ minLat, minLng, maxLat, maxLng }: WebGLSimulationLayerProps) {
  const map = useMap();
  const [data, setData] = useState<GeoPoint[]>([]);
  const [program, setProgram] = useState<WebGLProgram | null>(null);

  useEffect(() => {
    geoCentralApi.getCityScaleData(minLat, minLng, maxLat, maxLng)
      .then(setData)
      .catch(console.error);
  }, [minLat, minLng, maxLat, maxLng]);

  const onInit = useCallback((renderer: WebGLRenderer) => {
    try {
      const prg = renderer.createProgram(SOIL_STABILITY_VS, SOIL_STABILITY_FS);
      setProgram(prg);
    } catch (err) {
      console.error('Shader init failed:', err);
    }
  }, []);

  const onDraw = useCallback((renderer: WebGLRenderer, params: {
    viewMatrix: Float32Array;
    zoom: number;
    center: L.LatLng;
    pixelOrigin: L.Point;
    map: L.Map;
  }) => {
    if (!program || data.length === 0) return;

    renderer.useProgram(program);
    renderer.setUniformMatrix4('u_viewMatrix', params.viewMatrix);
    renderer.setUniform1f('u_zoom', params.zoom);

    // Dynamic projection
    const positions = new Float32Array(data.length * 2);
    const stability = new Float32Array(data.length);

    data.forEach((p, i) => {
      // Use Leaflet's projection to get container pixels
      const point = params.map.latLngToContainerPoint([p.latitude, p.longitude]);
      positions[i * 2] = point.x;
      positions[i * 2 + 1] = point.y;
      stability[i] = p.soil.stabilityIndex;
    });

    renderer.createBuffer(positions);
    renderer.setAttribute('a_position', 2);

    renderer.createBuffer(stability);
    renderer.setAttribute('a_stability', 1);

    const gl = renderer.getContext();
    gl.drawArrays(gl.POINTS, 0, data.length);
  }, [program, data]);

  const handleFocus = useCallback((point: GeoPoint) => {
    map.flyTo([point.latitude, point.longitude], 16);
  }, [map]);

  return (
    <>
      <LeafletWebGLOverlay onInit={onInit} onDraw={onDraw} />
      <GeoAttributeTable data={data} onFocus={handleFocus} />
    </>
  );
}
