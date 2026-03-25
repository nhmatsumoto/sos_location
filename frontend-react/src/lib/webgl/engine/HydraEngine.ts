import { WebGLRenderer } from '../WebGLRenderer';
import { Layer } from './Layer';
import { CameraController } from './CameraController';
import { GISMath } from '../GISMath';
import { DisasterPhysics } from '../physics/DisasterPhysics';
import type { DisasterState } from '../physics/DisasterPhysics';
import { UrbanLayer } from '../layers/UrbanLayer';
import { WaterLayer } from '../layers/WaterLayer';
import { TerrainLayer } from '../layers/TerrainLayer';

export class HydraEngine {
  private renderer: WebGLRenderer;
  private layers: Layer[] = [];
  private camera: CameraController;
  private projectionMatrix: Float32Array;
  private isRunning: boolean = false;
  private lastTime: number = 0;
  private disasterState: DisasterState | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer(canvas);
    this.camera = new CameraController();
    this.projectionMatrix = GISMath.perspective(Math.PI / 4, canvas.width / canvas.height, 10, 2000000);
    
    const gl = this.renderer.getContext();
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0.05, 0.07, 0.1, 1.0);
  }

  public registerLayer(layer: Layer) {
    this.layers.push(layer);
  }

  public setDisasterState(state: DisasterState | null) {
    this.disasterState = state;
  }

  public getRenderer(): WebGLRenderer {
    return this.renderer;
  }

  public getCamera(): CameraController {
    return this.camera;
  }

  public resize(width: number, height: number) {
    this.renderer.setSize(width, height);
    this.projectionMatrix = GISMath.perspective(Math.PI / 4, width / height, 10, 2000000);
  }

  public start() {
    this.isRunning = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.render.bind(this));
  }

  public stop() {
    this.isRunning = false;
  }

  private render(now: number) {
    if (!this.isRunning) return;

    const deltaTime = (now - this.lastTime) / 1000;
    this.lastTime = now;

    this.camera.update(deltaTime);
    const viewMatrix = this.camera.getViewMatrix();

    // Process Disaster Physics
    if (this.disasterState) {
      this.disasterState.time += deltaTime; // Advance internal disaster time
      this.updateLayersWithPhysics(this.disasterState);
    }

    const gl = this.renderer.getContext();
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    for (const layer of this.layers) {
      layer.render(this.projectionMatrix, viewMatrix);
    }

    requestAnimationFrame(this.render.bind(this));
  }

  private updateLayersWithPhysics(state: DisasterState) {
    for (const layer of this.layers) {
      if (layer instanceof UrbanLayer) {
        const [dx, dy, dz] = DisasterPhysics.calculateEarthquake(state);
        layer.setDisasterState(Math.max(dx, dy, dz), 1.0); // Simplified reveal
      }
      if (layer instanceof WaterLayer) {
        const { waterLevel, waveProgress } = DisasterPhysics.calculateTsunami(state);
        layer.setTsunamiState(waterLevel, waveProgress);
      }
      if (layer instanceof TerrainLayer) {
        const { waterLevel } = DisasterPhysics.calculateTsunami(state);
        layer.setWaterLevel(waterLevel);
      }
    }
  }

  public dispose() {
    this.stop();
    for (const layer of this.layers) {
      layer.dispose();
    }
  }
}
