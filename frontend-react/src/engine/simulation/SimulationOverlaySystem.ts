import * as THREE from 'three';
import { RenderOrchestrator } from '../core/RenderOrchestrator';

export class SimulationOverlaySystem {
  private orchestrator: RenderOrchestrator;
  private overlays: Map<string, THREE.Mesh> = new Map();
  private sharedMaterial: THREE.MeshStandardMaterial;

  constructor(orchestrator: RenderOrchestrator) {
    this.orchestrator = orchestrator;
    this.sharedMaterial = new THREE.MeshStandardMaterial({
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      clippingPlanes: []
    });
  }


  public createOverlay(id: string, geometry: THREE.BufferGeometry, color: string | number) {
    if (this.overlays.has(id)) {
      this.removeOverlay(id);
    }

    const material = this.sharedMaterial.clone();
    material.color.set(color);
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = 0.1; // Slight offset to avoid Z-fighting
    
    if (this.orchestrator.scene) {
      this.orchestrator.scene.add(mesh);
    }
    
    this.overlays.set(id, mesh);
  }

  public removeOverlay(id: string) {
    const mesh = this.overlays.get(id);
    if (mesh) {
      if (this.orchestrator.scene) {
        this.orchestrator.scene.remove(mesh);
      }
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      this.overlays.delete(id);
    }
  }

  public updateOverlayData(id: string, color: string | number, opacity: number) {
    const mesh = this.overlays.get(id);
    if (mesh) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.color.set(color);
      mat.opacity = opacity;
    }
  }

  public dispose() {
    this.overlays.forEach((_, id) => this.removeOverlay(id));
    this.sharedMaterial.dispose();
  }
}
