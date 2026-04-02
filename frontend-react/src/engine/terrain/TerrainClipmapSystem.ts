import * as THREE from 'three';
import { RenderOrchestrator } from '../core/RenderOrchestrator';
import type { TerrainLayerConfig } from '../core/RenderOrchestrator';
import { TerrainShader } from '../shaders/TerrainShader';
import { gisApi } from '../../services/gisApi';
import { TerrainTileManager } from './TerrainTileManager';

export class TerrainClipmapSystem {
  private orchestrator: RenderOrchestrator;
  private rings: THREE.Mesh[] = [];
  private ringGeometries: THREE.PlaneGeometry[] = [];
  private material: THREE.ShaderMaterial;
  private isFetching: boolean = false;
  private tileManager: TerrainTileManager = new TerrainTileManager();
  private blendRequest: number | null = null;

  constructor(orchestrator: RenderOrchestrator) {
    this.orchestrator = orchestrator;
    
    // Initialize shader material
    const uniforms = THREE.UniformsUtils.clone(TerrainShader.uniforms);
    this.material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: TerrainShader.vertexShader,
      fragmentShader: TerrainShader.fragmentShader,
      wireframe: false,
      side: THREE.FrontSide
    });
    
    this.initRings();
  }

  private initRings() {
    const ringCount = 5; 
    
    for (let i = 0; i < ringCount; i++) {
        const size = Math.pow(2, i) * 100;
        const resolution = 128; 
        const geometry = new THREE.PlaneGeometry(size, size, resolution, resolution);
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

  public update(lat: number, lon: number, layers?: TerrainLayerConfig) {
    const [worldX, worldZ] = this.orchestrator.streamManager.project(lat, lon);

    // Dynamic heightmap fetching with tiling
    this.maybeFetchHeightmap(lat, lon);

    // Update Uniforms based on layers
    if (layers) {
        this.material.uniforms.uShowSatellite.value = layers.satellite ? 1.0 : 0.0;
        this.material.uniforms.uShowRelief.value = layers.relief ? 1.0 : 0.0;
        this.material.uniforms.uShowStreets.value = layers.streets ? 1.0 : 0.0;
        this.material.uniforms.uShowVegetation.value = layers.vegetation ? 1.0 : 0.0;
        
        if (layers.showGEE) {
            const geeType = layers.geeAnalysisType ?? 'ndvi';
            this.material.uniforms.uIndicesType.value = geeType === 'ndvi' ? 1.0 : 2.0;
            this.maybeFetchIndicesData(lat, lon, geeType);
        } else {
            this.material.uniforms.uIndicesType.value = 0.0;
        }
        
        if (layers.satellite && !this.material.uniforms.uSatelliteMap.value) {
            const textureUrl = "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg";
            const texture = new THREE.TextureLoader().load(textureUrl);
            this.orchestrator.textures.set('satellite', texture);
            this.material.uniforms.uSatelliteMap.value = texture;
        }

        this.material.wireframe = !!layers.relief && !layers.satellite;
    }

    // Shift rings to follow camera focus
    this.rings.forEach((ring, i) => {
        const resolution = 128;
        const snap = Math.pow(2, i) * (100 / resolution); 
        ring.position.x = Math.floor(worldX / snap) * snap;
        ring.position.z = Math.floor(worldZ / snap) * snap;
    });
  }

  private async maybeFetchHeightmap(lat: number, lon: number) {
    const delta = 0.01; 
    const tileKey = this.tileManager.getTileKey(lat, lon, delta);
    
    const cached = this.tileManager.getTile(tileKey);
    if (cached) {
        if (this.material.uniforms.uHeightMap.value !== cached.texture) {
            this.startBlending(cached.texture);
        }
        return;
    }

    if (this.isFetching) return;
    this.isFetching = true;
    
    const data = await gisApi.getElevationGrid(lat - delta, lon - delta, lat + delta, lon + delta, 128);
    
    if (data && data.length > 0) {
        const texture = this.createHeightTexture(data);
        this.tileManager.addTile(tileKey, texture, lat, lon);
        this.startBlending(texture);
        this.material.uniforms.uDisplacementScale.value = 50.0;
    }
    this.isFetching = false;
  }

  private startBlending(newTexture: THREE.DataTexture) {
    if (this.blendRequest !== null) cancelAnimationFrame(this.blendRequest);

    const oldTexture = this.material.uniforms.uHeightMap.value;
    if (!oldTexture) {
        this.material.uniforms.uHeightMap.value = newTexture;
        this.material.uniforms.uPrevHeightMap.value = newTexture;
        this.material.uniforms.uBlendFactor.value = 1.0;
        return;
    }

    this.material.uniforms.uPrevHeightMap.value = oldTexture;
    this.material.uniforms.uHeightMap.value = newTexture;
    this.material.uniforms.uBlendFactor.value = 0.0;

    let startTime: number | null = null;
    const duration = 500; // ms

    const animate = (time: number) => {
        if (!startTime) startTime = time;
        const progress = Math.min((time - startTime) / duration, 1.0);
        this.material.uniforms.uBlendFactor.value = progress;

        if (progress < 1.0) {
            this.blendRequest = requestAnimationFrame(animate);
        } else {
            this.blendRequest = null;
        }
    };
    this.blendRequest = requestAnimationFrame(animate);
  }

  private createHeightTexture(grid: number[][]): THREE.DataTexture {
    const size = grid.length;
    const data = new Float32Array(size * size);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            data[y * size + x] = grid[y][x];
        }
    }
    const texture = new THREE.DataTexture(data, size, size, THREE.RedFormat, THREE.FloatType);
    texture.needsUpdate = true;
    return texture;
  }

  private async maybeFetchIndicesData(lat: number, lon: number, type: string) {
    if (this.material.uniforms.uIndicesMap.value) return;

    const delta = 0.01;
    let data;
    if (type === 'ndvi') {
        data = await gisApi.getVegetationData(lat - delta, lon - delta, lat + delta, lon + delta);
    } else {
        data = await gisApi.getSoilData(lat - delta, lon - delta, lat + delta, lon + delta);
    }

    if (data) {
        const size = 32;
        const pixels = new Float32Array(size * size);
        pixels.fill(Math.random());
        const texture = new THREE.DataTexture(pixels, size, size, THREE.RedFormat, THREE.FloatType);
        texture.needsUpdate = true;
        this.material.uniforms.uIndicesMap.value = texture;
    }
  }

  public dispose() {
    if (this.blendRequest !== null) cancelAnimationFrame(this.blendRequest);
    this.rings.forEach(ring => {
        if (this.orchestrator.scene) {
            this.orchestrator.scene.remove(ring);
        }
    });
    this.ringGeometries.forEach(g => g.dispose());
    this.material.dispose();
    this.tileManager.dispose();
  }
}
