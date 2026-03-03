import L from 'leaflet';
import { ThreeSceneManager, type ThreeBar } from './ThreeSceneManager';

export class LeafletThreeLayer extends L.Layer {
  private canvas?: HTMLCanvasElement;
  private map?: L.Map;
  private manager?: ThreeSceneManager;
  private bars: Array<{ id: string; lat: number; lng: number; height: number }> = [];

  onAdd(map: L.Map): this {
    this.map = map;
    this.canvas = L.DomUtil.create('canvas', 'leaflet-three-layer') as HTMLCanvasElement;
    this.canvas.style.position = 'absolute';
    this.canvas.style.pointerEvents = 'none';
    map.getPanes().overlayPane.appendChild(this.canvas);
    this.manager = new ThreeSceneManager(this.canvas);
    this.sync();
    map.on('move zoom resize', this.sync, this);
    return this;
  }

  onRemove(map: L.Map): this {
    map.off('move zoom resize', this.sync, this);
    this.manager?.dispose();
    if (this.canvas?.parentElement) this.canvas.parentElement.removeChild(this.canvas);
    return this;
  }

  setBars(bars: Array<{ id: string; lat: number; lng: number; height: number }>) {
    this.bars = bars;
    this.sync();
  }

  private sync = () => {
    if (!this.map || !this.canvas || !this.manager) return;
    const size = this.map.getSize();
    this.canvas.width = size.x;
    this.canvas.height = size.y;
    this.manager.setSize(size.x, size.y);

    const projected: ThreeBar[] = this.bars.map((bar) => {
      const point = this.map!.latLngToContainerPoint([bar.lat, bar.lng]);
      return { id: bar.id, x: point.x, y: point.y, height: bar.height };
    });

    this.manager.setBars(projected);
    this.manager.render();
  };
}
