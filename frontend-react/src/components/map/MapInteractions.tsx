import { useMap, useMapEvents, Rectangle } from 'react-leaflet';

export type ToolMode = 'inspect' | 'point' | 'area' | 'filter_area' | 'simulation_box' | 'snapshot';

interface MapInteractionsProps {
  tool: ToolMode;
  onPickPoint: (lat: number, lon: number) => void;
  onHover: (lat: number, lon: number) => void;
  areaDraft: Array<[number, number]>;
  setAreaDraft: (next: Array<[number, number]>) => void;
  spatialFilter: { center: [number, number], radius: number } | null;
  setSpatialFilter: (next: { center: [number, number], radius: number } | null) => void;
  onFilterComplete: (filter: { center: [number, number], radius: number }) => void;
  onSnapshotComplete: (bounds: Array<[number, number]>) => void;
  onContextMenu?: (x: number, y: number, lat: number, lon: number) => void;
  show3D: boolean;
}

export function MapInteractions({
  tool,
  onPickPoint,
  onHover,
  areaDraft,
  setAreaDraft,
  spatialFilter,
  setSpatialFilter,
  onFilterComplete,
  onSnapshotComplete,
  onContextMenu,
  show3D
}: MapInteractionsProps) {
  const map = useMap();
  
  useMapEvents({
    mousemove(e) {
      if (show3D) return;
      const wrap = e.latlng.wrap();
      onHover(wrap.lat, wrap.lng);
      if (tool === 'filter_area' && spatialFilter && !spatialFilter.radius) {
        setSpatialFilter({ ...spatialFilter, radius: map.distance(spatialFilter.center, wrap) });
      }
      if ((tool === 'snapshot' || tool === 'simulation_box') && areaDraft.length === 1) {
        setAreaDraft([areaDraft[0], [wrap.lat, wrap.lng]]);
      }
    },
    click(e) {
      if (show3D) return;
      const wrap = e.latlng.wrap();
      if (tool === 'point') {
        onPickPoint(wrap.lat, wrap.lng);
        return;
      }
      if (tool === 'area') {
        setAreaDraft([...areaDraft, [wrap.lat, wrap.lng]]);
        return;
      }
      if (tool === 'filter_area') {
        if (!spatialFilter || spatialFilter.radius) {
          setSpatialFilter({ center: [wrap.lat, wrap.lng], radius: 0 });
        } else {
          const finalRadius = map.distance(spatialFilter.center, wrap);
          const filter = { ...spatialFilter, radius: finalRadius };
          setSpatialFilter(filter);
          onFilterComplete(filter);
        }
      }
    },
    mousedown(e) {
      if (show3D) return;
      const wrap = e.latlng.wrap();
      if (tool === 'snapshot' || tool === 'simulation_box') {
        setAreaDraft([[wrap.lat, wrap.lng]]);
      }
    },
    mouseup(e) {
      if (show3D) return;
      const wrap = e.latlng.wrap();
      if ((tool === 'snapshot' || tool === 'simulation_box') && areaDraft.length === 1) {
        onSnapshotComplete([areaDraft[0], [wrap.lat, wrap.lng]]);
        setAreaDraft([]);
      }
    },
    contextmenu(e) {
      if (show3D) return;
      const wrap = e.latlng.wrap();
      if (tool === 'area' && areaDraft.length > 2) {
        const [lat, lon] = areaDraft[0];
        onPickPoint(lat, lon);
      } else if (tool === 'inspect') {
        const { x, y } = e.originalEvent;
        if (onContextMenu) {
          onContextMenu(x, y, wrap.lat, wrap.lng);
        }
      }
    },
  });

  return (
    <>
      {!show3D && (tool === 'snapshot' || tool === 'simulation_box') && areaDraft.length === 2 && (
        <Rectangle 
          bounds={[areaDraft[0], areaDraft[1]]} 
          pathOptions={{ color: tool === 'snapshot' ? '#22d3ee' : '#f59e0b', weight: 1, fillOpacity: 0.1, dashArray: '5, 5' }} 
        />
      )}
    </>
  );
}

export function MapListener({ onMove }: { onMove: (center: [number, number], zoom: number) => void }) {
  const map = useMap();
  useMapEvents({
    moveend() {
      const center = map.getCenter().wrap();
      onMove([center.lat, center.lng], map.getZoom());
    },
    zoomend() {
      const center = map.getCenter().wrap();
      onMove([center.lat, center.lng], map.getZoom());
    }
  });
  return null;
}
