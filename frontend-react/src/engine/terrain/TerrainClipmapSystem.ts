import * as THREE from 'three';
import { RenderOrchestrator } from '../core/RenderOrchestrator';

export class TerrainClipmapSystem {
  private orchestrator: RenderOrchestrator;
  private rings: THREE.Mesh[] = [];
  private ringGeometries: THREE.PlaneGeometry[] = [];
  private material: THREE.MeshStandardMaterial;

  constructor(orchestrator: RenderOrchestrator) {
    this.orchestrator = orchestrator;
    this.material = new THREE.MeshStandardMaterial({
      color: "#1e293b", // Lighter blue-gray for better visibility
      roughness: 0.8,
      metalness: 0.2,
      wireframe: false
    });
    
    this.initRings();
  }

  private initRings() {
    // Basic Geometry-Clipmap inspired structure:
    // Nested rings with increasing size but constant vertex count
    const ringCount = 5; // Added one extra ring for larger coverage
    const baseResolution = 64; 
    
    for (let i = 0; i < ringCount; i++) {
        const size = Math.pow(2, i) * 100;
        
        const geometry = new THREE.PlaneGeometry(size, size, baseResolution, baseResolution);
        geometry.rotateX(-Math.PI / 2);
        
        const mesh = new THREE.Mesh(geometry, this.material);
        mesh.receiveShadow = true;
        
        this.rings.push(mesh);
        this.ringGeometries.push(geometry);
        
        if (this.orchestrator.scene) {
            this.orchestrator.scene.add(mesh);
        }
    }
  }

  public update(lat: number, lon: number, layers?: any) {
    const [worldX, worldZ] = this.orchestrator.streamManager.project(lat, lon);

    // Dynamic layer adjustment
    if (layers) {
        if (layers.satellite && !this.material.map) {
            // Apply a placeholder "CDN" satellite texture or real one if available
            const textureUrl = "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg";
            this.orchestrator.textures.set('satellite', new THREE.TextureLoader().load(textureUrl));
            this.material.map = this.orchestrator.textures.get('satellite')!;
            this.material.color.set("#ffffff");
            this.material.needsUpdate = true;
        } else if (!layers.satellite && this.material.map) {
            this.material.map = null;
            this.material.color.set("#1e293b");
            this.material.needsUpdate = true;
        }

        this.material.wireframe = !!layers.relief && !layers.satellite;
    }

    // Shift rings to follow camera focus directly
    this.rings.forEach((ring, i) => {
        const snap = Math.pow(2, i) * (100 / 64);
        ring.position.x = Math.floor(worldX / snap) * snap;
        ring.position.z = Math.floor(worldZ / snap) * snap;
    });
  }



  public dispose() {
    this.rings.forEach(ring => {
        if (this.orchestrator.scene) {
            this.orchestrator.scene.remove(ring);
        }
    });
    this.ringGeometries.forEach(g => g.dispose());
    this.material.dispose();
  }
}
