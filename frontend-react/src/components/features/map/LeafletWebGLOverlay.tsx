import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { WebGLRenderer } from '../../../lib/webgl/WebGLRenderer';

interface WebGLOverlayProps {
  onDraw: (renderer: WebGLRenderer, params: {
    viewMatrix: Float32Array;
    zoom: number;
    center: L.LatLng;
    pixelOrigin: L.Point;
    map: L.Map;
  }) => void;
  onInit: (renderer: WebGLRenderer) => void;
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

    const CustomLayer = L.Layer.extend({
      onAdd: function (map: L.Map) {
        const pane = map.getPane('overlayPane');
        if (pane) {
          pane.appendChild(canvasRef.current!);
        }
        map.on('move', this._update, this);
        this._update();
      },

      onRemove: function (map: L.Map) {
        if (canvasRef.current?.parentNode) {
          canvasRef.current.parentNode.removeChild(canvasRef.current);
        }
        map.off('move', this._update, this);
      },

      _update: function () {
        const size = map.getSize();
        const canvas = canvasRef.current!;
        
        // Sync canvas size with map size
        if (canvas.width !== size.x || canvas.height !== size.y) {
          canvas.width = size.x;
          canvas.height = size.y;
          renderer.setViewport(size.x, size.y);
        }

        // Adjust canvas position
        const pos = map.containerPointToLayerPoint([0, 0]);
        L.DomUtil.setPosition(canvas, pos);

        this._render();
      },

      _render: function () {
        const canvas = canvasRef.current;
        if (!rendererRef.current || !canvas) return;

        const zoom = map.getZoom();
        const center = map.getCenter();
        const pixelOrigin = (map as any)._getNewPixelOrigin(center, zoom);

        // Simple Ortho projection matrix for testing
        // In full GIS modal, we'd use a projection matrix that maps LatLng to NDC
        const viewMatrix = new Float32Array([
          2 / canvas.width, 0, 0, 0,
          0, -2 / canvas.height, 0, 0,
          0, 0, 1, 0,
          -1, 1, 0, 1
        ]);

        onDraw(rendererRef.current, {
          viewMatrix,
          zoom,
          center,
          pixelOrigin,
          map: map // Pass map for projection
        });
      }
    });

    const layer = new (CustomLayer as any)();
    map.addLayer(layer);

    return () => {
      map.removeLayer(layer);
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
