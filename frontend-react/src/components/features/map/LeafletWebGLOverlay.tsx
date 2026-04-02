import { useEffect, useRef, type RefObject } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { WebGLRenderer } from '../../../lib/webgl/WebGLRenderer';

interface OverlayDrawParams {
  viewMatrix: Float32Array;
  zoom: number;
  center: L.LatLng;
  pixelOrigin: L.Point;
  map: L.Map;
}

interface WebGLOverlayProps {
  onDraw: (renderer: WebGLRenderer, params: OverlayDrawParams) => void;
  onInit: (renderer: WebGLRenderer) => void;
}

class LeafletOverlayLayer extends L.Layer {
  private readonly mapRef: L.Map;
  private readonly canvasRef: RefObject<HTMLCanvasElement | null>;
  private readonly rendererRef: RefObject<WebGLRenderer | null>;
  private readonly renderer: WebGLRenderer;
  private readonly onDraw: (renderer: WebGLRenderer, params: OverlayDrawParams) => void;

  constructor(
    mapRef: L.Map,
    canvasRef: RefObject<HTMLCanvasElement | null>,
    rendererRef: RefObject<WebGLRenderer | null>,
    renderer: WebGLRenderer,
    onDraw: (renderer: WebGLRenderer, params: OverlayDrawParams) => void,
  ) {
    super();
    this.mapRef = mapRef;
    this.canvasRef = canvasRef;
    this.rendererRef = rendererRef;
    this.renderer = renderer;
    this.onDraw = onDraw;
  }

  private update = () => {
    const canvas = this.canvasRef.current;
    if (!canvas || !this.rendererRef.current) return;

    const size = this.mapRef.getSize();
    if (canvas.width !== size.x || canvas.height !== size.y) {
      canvas.width = size.x;
      canvas.height = size.y;
      this.renderer.setViewport(size.x, size.y);
    }

    const pos = this.mapRef.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(canvas, pos);
    this.renderOverlay();
  };

  private renderOverlay = () => {
    const canvas = this.canvasRef.current;
    const activeRenderer = this.rendererRef.current;
    if (!canvas || !activeRenderer) return;

    const zoom = this.mapRef.getZoom();
    const center = this.mapRef.getCenter();
    const pixelOrigin = this.mapRef.getPixelOrigin();

    // Simple Ortho projection matrix for testing
    // In full GIS modal, we'd use a projection matrix that maps LatLng to NDC
    const viewMatrix = new Float32Array([
      2 / canvas.width, 0, 0, 0,
      0, -2 / canvas.height, 0, 0,
      0, 0, 1, 0,
      -1, 1, 0, 1,
    ]);

    this.onDraw(activeRenderer, {
      viewMatrix,
      zoom,
      center,
      pixelOrigin,
      map: this.mapRef,
    });
  };

  onAdd(mapInstance: L.Map): this {
    const pane = mapInstance.getPane('overlayPane');
    if (pane && this.canvasRef.current) {
      pane.appendChild(this.canvasRef.current);
    }
    mapInstance.on('move', this.update);
    this.update();
    return this;
  }

  onRemove(mapInstance: L.Map): this {
    if (this.canvasRef.current?.parentNode) {
      this.canvasRef.current.parentNode.removeChild(this.canvasRef.current);
    }
    mapInstance.off('move', this.update);
    return this;
  }
}

/**
 * Custom WebGL Overlay for Leaflet
 * Bridges Leaflet's coordinate system with WebGL NDC.
 */
export function LeafletWebGLOverlay({ onDraw, onInit }: WebGLOverlayProps) {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize Renderer
    const renderer = new WebGLRenderer(canvasRef.current);
    rendererRef.current = renderer;
    onInit(renderer);

    const layer = new LeafletOverlayLayer(map, canvasRef, rendererRef, renderer, onDraw);
    map.addLayer(layer);

    return () => {
      map.removeLayer(layer);
      rendererRef.current = null;
    };
  }, [map, onDraw, onInit]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 400
      }}
    />
  );
}
