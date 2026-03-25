import { GISMath } from '../GISMath';

export class CameraController {
  // Centimeter scale: [X, Y, Z]
  // Default: Height 500m (50000cm), Distance from target ~2km (200000cm)
  public pos: [number, number, number] = [0, 50000, -150000];
  public target: [number, number, number] = [0, 0, 0];
  public up: [number, number, number] = [0, 1, 0];
  public yaw: number = Math.PI;
  public pitch: number = -0.45;
  public distance: number = 180000;
  public speed: number = 5000; // 50m per sec at base speed
  public keys: Set<string> = new Set();

  private isDragging: boolean = false;
  private dragButton: number = -1;
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
    const moveAmount = this.speed * deltaTime;
    if (this.keys.has('KeyW')) this.moveForward(moveAmount);
    if (this.keys.has('KeyS')) this.moveForward(-moveAmount);
    if (this.keys.has('KeyA')) this.moveRight(-moveAmount);
    if (this.keys.has('KeyD')) this.moveRight(moveAmount);
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

  public handleMouseDown(e: { clientX: number, clientY: number, button: number }) {
    this.isDragging = true;
    this.dragButton = e.button;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
  }

  public handleMouseMove(e: { clientX: number, clientY: number, shiftKey: boolean, ctrlKey: boolean }) {
    if (!this.isDragging) return;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;

    // Blender MMB Orbit (Button 1)
    if (this.dragButton === 1 && !e.shiftKey && !e.ctrlKey) {
      this.yaw -= dx * 0.005;
      this.pitch = Math.max(-1.5, Math.min(1.5, this.pitch - dy * 0.005));
    }
    // Blender Shift + MMB Pan
    else if (this.dragButton === 1 && e.shiftKey) {
      const fwd = GISMath.normalize(GISMath.subtract(this.target, this.pos));
      const right = GISMath.normalize(GISMath.cross(this.up, fwd));
      const upDir = GISMath.normalize(GISMath.cross(fwd, right));
      
      const factor = this.distance * 0.001; // Scale pan speed by distance
      const panX = GISMath.scale(right, -dx * factor);
      const panY = GISMath.scale(upDir, dy * factor);
      
      this.target = GISMath.add(this.target, GISMath.add(panX, panY)) as [number, number, number];
    }
    // Blender Ctrl + MMB Zoom (or vertical drag)
    else if (this.dragButton === 1 && e.ctrlKey) {
      this.handleWheel(dy * 2);
    }
  }

  public handleMouseUp() {
    this.isDragging = false;
    this.dragButton = -1;
  }

  public handleWheel(deltaY: number) {
    this.distance = Math.max(100, Math.min(2000000, this.distance + deltaY * (this.distance * 0.002)));
  }
}
