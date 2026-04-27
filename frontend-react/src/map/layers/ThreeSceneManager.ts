import * as THREE from 'three';

export interface ThreeBar {
  id: string;
  x: number;
  y: number;
  height: number;
}

export class ThreeSceneManager {
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera();
  private renderer: THREE.WebGLRenderer;
  private bars = new Map<string, THREE.Mesh>();

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.scene.add(new THREE.AmbientLight(0xffffff, 1));
  }

  setSize(width: number, height: number) {
    this.renderer.setSize(width, height, false);
    this.camera.left = 0;
    this.camera.right = width;
    this.camera.top = 0;
    this.camera.bottom = height;
    this.camera.near = -1000;
    this.camera.far = 1000;
    this.camera.position.set(0, 0, 400);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
  }

  setBars(nextBars: ThreeBar[]) {
    const keep = new Set(nextBars.map((bar) => bar.id));

    this.bars.forEach((mesh, id) => {
      if (!keep.has(id)) {
        this.scene.remove(mesh);
        this.disposeMesh(mesh);
        this.bars.delete(id);
      }
    });

    nextBars.forEach((bar) => {
      const geometry = new THREE.BoxGeometry(10, Math.max(4, bar.height), 10);
      const material = new THREE.MeshBasicMaterial({ color: '#22d3ee' });
      const mesh = this.bars.get(bar.id);
      if (mesh) {
        this.disposeGeometry(mesh.geometry);
        this.disposeMaterial(mesh.material);
        mesh.geometry = geometry;
        mesh.material = material;
      }
      const nextMesh = mesh ?? new THREE.Mesh(geometry, material);
      nextMesh.position.set(bar.x, bar.y - bar.height / 2, 0);
      this.scene.add(nextMesh);
      this.bars.set(bar.id, nextMesh);
    });
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.bars.forEach((mesh) => {
      this.scene.remove(mesh);
      this.disposeMesh(mesh);
    });
    this.bars.clear();
    this.renderer.dispose();
  }

  private disposeMesh(mesh: THREE.Mesh) {
    this.disposeGeometry(mesh.geometry);
    this.disposeMaterial(mesh.material);
  }

  private disposeGeometry(geometry: THREE.BufferGeometry) {
    geometry.dispose();
  }

  private disposeMaterial(material: THREE.Material | THREE.Material[]) {
    if (Array.isArray(material)) {
      material.forEach((item) => item.dispose());
      return;
    }
    material.dispose();
  }
}
