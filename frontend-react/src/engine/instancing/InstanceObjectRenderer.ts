import * as THREE from 'three';
import { RenderOrchestrator } from '../core/RenderOrchestrator';

export interface InstanceGroup {
  id: string;
  mesh: THREE.InstancedMesh;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  capacity: number;
  count: number;
}

export class InstanceObjectRenderer {
  private orchestrator: RenderOrchestrator;
  private groups: Map<string, InstanceGroup> = new Map();

  constructor(orchestrator: RenderOrchestrator) {
    this.orchestrator = orchestrator;
  }


  public getOrCreateGroup(id: string, geometry: THREE.BufferGeometry, material: THREE.Material, capacity: number = 1000): InstanceGroup {
    if (!this.groups.has(id)) {
      const mesh = new THREE.InstancedMesh(geometry, material, capacity);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      
      if (this.orchestrator.scene) {
        this.orchestrator.scene.add(mesh);
      }

      this.groups.set(id, {
        id,
        mesh,
        geometry,
        material,
        capacity,
        count: 0
      });
    }
    return this.groups.get(id)!;
  }

  public setInstance(groupId: string, index: number, matrix: THREE.Matrix4) {
    const group = this.groups.get(groupId);
    if (group && index < group.capacity) {
      group.mesh.setMatrixAt(index, matrix);
      group.count = Math.max(group.count, index + 1);
      group.mesh.instanceMatrix.needsUpdate = true;
      group.mesh.count = group.count;
    }
  }

  public resetGroup(groupId: string) {
    const group = this.groups.get(groupId);
    if (group) {
      group.count = 0;
      group.mesh.count = 0;
    }
  }

  public dispose() {
    this.groups.forEach(group => {
      if (this.orchestrator.scene) {
        this.orchestrator.scene.remove(group.mesh);
      }
      group.mesh.dispose();
    });
    this.groups.clear();
  }
}
