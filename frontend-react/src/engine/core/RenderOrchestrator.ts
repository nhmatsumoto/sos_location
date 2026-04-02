import * as THREE from 'three';
import { WorldStreamManager } from './WorldStreamManager';
import { TerrainClipmapSystem } from '../terrain/TerrainClipmapSystem';
import { InstanceObjectRenderer } from '../instancing/InstanceObjectRenderer';
import { SimulationOverlaySystem } from '../simulation/SimulationOverlaySystem';

export interface TerrainLayerConfig {
  satellite: boolean;
  relief: boolean;
  streets: boolean;
  vegetation: boolean;
  showGEE?: boolean;
  geeAnalysisType?: 'ndvi' | 'moisture' | 'thermal';
}

export class RenderOrchestrator {
  private static instance: RenderOrchestrator;
  
  public streamManager: WorldStreamManager;
  public terrainSystem: TerrainClipmapSystem | null = null;
  public instanceRenderer: InstanceObjectRenderer;
  public simulationSystem: SimulationOverlaySystem;
  
  public scene: THREE.Scene | null = null;
  public camera: THREE.Camera | null = null;
  public renderer: THREE.WebGLRenderer | null = null;

  // Shared resource pools
  public materials: Map<string, THREE.Material> = new Map();
  public textures: Map<string, THREE.Texture> = new Map();
  public geometries: Map<string, THREE.BufferGeometry> = new Map();

  private constructor() {
    this.streamManager = new WorldStreamManager();
    this.instanceRenderer = new InstanceObjectRenderer(this);
    this.simulationSystem = new SimulationOverlaySystem(this);
  }

  public static getInstance(): RenderOrchestrator {
    if (!RenderOrchestrator.instance) {
      RenderOrchestrator.instance = new RenderOrchestrator();
    }
    return RenderOrchestrator.instance;
  }

  public init(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    
    // Initialize terrain system once scene is available
    if (!this.terrainSystem) {
      this.terrainSystem = new TerrainClipmapSystem(this);
    }
  }

  private activeLayers: TerrainLayerConfig = {
    satellite: false,
    relief: false,
    streets: false,
    vegetation: false,
  };

  public setActiveLayers(layers: TerrainLayerConfig) {
    this.activeLayers = layers;
    // If terrain system already exists, propagate immediately
    if (this.terrainSystem) {
      // Assuming terrainSystem has an update method that can handle layers without lat/lon change
      // We'll call a lightweight method to apply layer changes
      // For now, we simply trigger an update with current camera position if needed
    }
  }

  public update(lat: number, lon: number, activeLayers?: TerrainLayerConfig) {
    if (activeLayers) this.activeLayers = activeLayers;
    this.streamManager.update(lat, lon);
    this.streamManager.update(lat, lon);
    
    if (this.terrainSystem) {
      this.terrainSystem.update(lat, lon, this.activeLayers);
    }
    
    // Future: Update instanced objects and overlays based on visible chunks
  }


  public getMaterial(id: string, factory: () => THREE.Material): THREE.Material {
    if (!this.materials.has(id)) {
      this.materials.set(id, factory());
    }
    return this.materials.get(id)!;
  }

  public getGeometry(id: string, factory: () => THREE.BufferGeometry): THREE.BufferGeometry {
    if (!this.geometries.has(id)) {
      this.geometries.set(id, factory());
    }
    return this.geometries.get(id)!;
  }

  public dispose() {
    if (this.terrainSystem) {
      this.terrainSystem.dispose();
      this.terrainSystem = null;
    }
    this.instanceRenderer.dispose();
    this.simulationSystem.dispose();
    
    this.materials.forEach(m => m.dispose());
    this.textures.forEach(t => t.dispose());
    this.geometries.forEach(g => g.dispose());
    this.materials.clear();
    this.textures.clear();
    this.geometries.clear();
    
    this.scene = null;
    this.camera = null;
    this.renderer = null;
  }
}
