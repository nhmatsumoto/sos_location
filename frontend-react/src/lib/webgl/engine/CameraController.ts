import { GISMath } from '../GISMath';

export class CameraController {
  public pos: [number, number, number] = [0, 1000, -2000];
  public target: [number, number, number] = [0, 0, 0];
  public up: [number, number, number] = [0, 1, 0];
  public yaw: number = Math.PI;
  public pitch: number = -0.5;
  public distance: number = 2000;
  public speed: number = 10;
  public keys: Set<string> = new Set();

  private isDragging: boolean = false;
  private lastX: number = 0;
  private lastY: number = 0;

  constructor() {}

  public getViewMatrix(): Float32Array {
    const x = this.distance * Math.sin(this.yaw) * Math.cos(this.pitch);
    const y = -this.distance * Math.sin(this.pitch);
    const z = this.distance * Math.cos(this.yaw) * Math.cos(this.pitch);
    
    this.pos = [this.target[0] + x, this.target[1] + y, this.target[2] + z];
    return GISMath.lookAt(this.pos, this.target, this.up);
  }

  public update(deltaTime: number) {
    if (this.keys.has('KeyW')) this.moveForward(this.speed * deltaTime);
    if (this.keys.has('KeyS')) this.moveForward(-this.speed * deltaTime);
    if (this.keys.has('KeyA')) this.moveRight(-this.speed * deltaTime);
    if (this.keys.has('KeyD')) this.moveRight(this.speed * deltaTime);
  }

  private moveForward(dist: number) {
    const fwd = GISMath.normalize(GISMath.subtract(this.target, this.pos));
    this.pos = GISMath.add(this.pos, GISMath.scale(fwd, dist)) as [number, number, number];
    this.target = GISMath.add(this.target, GISMath.scale(fwd, dist)) as [number, number, number];
  }

  private moveRight(dist: number) {
    const fwd = GISMath.normalize(GISMath.subtract(this.target, this.pos));
    const right = GISMath.normalize(GISMath.cross(this.up, fwd));
    this.pos = GISMath.add(this.pos, GISMath.scale(right, dist)) as [number, number, number];
    this.target = GISMath.add(this.target, GISMath.scale(right, dist)) as [number, number, number];
  }

  public handleMouseDown(x: number, y: number) {
    this.isDragging = true;
    this.lastX = x;
    this.lastY = y;
  }

  public handleMouseMove(x: number, y: number) {
    if (!this.isDragging) return;
    const dx = x - this.lastX;
    const dy = y - this.lastY;
    this.lastX = x;
    this.lastY = y;

    this.yaw -= dx * 0.005;
    this.pitch = Math.max(-1.5, Math.min(1.5, this.pitch - dy * 0.005));
  }

  public handleMouseUp() {
    this.isDragging = false;
  }

  public handleWheel(deltaY: number) {
    this.distance = Math.max(50, Math.min(200000, this.distance + deltaY * (this.distance * 0.001)));
  }
}
