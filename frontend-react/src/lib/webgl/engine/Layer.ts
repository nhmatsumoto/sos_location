import { WebGLRenderer } from '../WebGLRenderer';

export abstract class Layer {
  protected renderer: WebGLRenderer;
  protected visible: boolean = true;

  constructor(renderer: WebGLRenderer) {
    this.renderer = renderer;
  }

  public abstract render(projectionMatrix: Float32Array, viewMatrix: Float32Array): void;

  public setVisible(visible: boolean) {
    this.visible = visible;
  }

  public isVisible(): boolean {
    return this.visible;
  }

  public abstract dispose(): void;
}
