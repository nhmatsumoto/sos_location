import L from 'leaflet';

export interface WeatherPoint {
  lat: number;
  lng: number;
  value: number;
}

export class WeatherLayer extends L.Layer {
  private canvas?: HTMLCanvasElement;
  private map?: L.Map;
  private points: WeatherPoint[] = [];

  onAdd(map: L.Map): this {
    this.map = map;
    this.canvas = L.DomUtil.create('canvas', 'leaflet-weather-layer') as HTMLCanvasElement;
    this.canvas.style.position = 'absolute';
    this.canvas.style.pointerEvents = 'none';
    const pane = map.getPanes().overlayPane;
    pane.appendChild(this.canvas);
    this.resize();
    map.on('move zoom resize', this.redraw, this);
    this.redraw();
    return this;
  }

  onRemove(map: L.Map): this {
    map.off('move zoom resize', this.redraw, this);
    if (this.canvas?.parentElement) this.canvas.parentElement.removeChild(this.canvas);
    return this;
  }

  setPoints(points: WeatherPoint[]) {
    this.points = points;
    this.redraw();
  }

  private resize = () => {
    if (!this.map || !this.canvas) return;
    const size = this.map.getSize();
    this.canvas.width = size.x;
    this.canvas.height = size.y;
  };

  private redraw = () => {
    if (!this.map || !this.canvas) return;
    this.resize();
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (const point of this.points) {
      const pixel = this.map.latLngToContainerPoint([point.lat, point.lng]);
      const color = point.value >= 20 ? '#ef4444' : point.value >= 10 ? '#f59e0b' : '#22c55e';
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.arc(pixel.x, pixel.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  };
}
