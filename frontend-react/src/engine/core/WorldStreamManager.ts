import { projectTo3D, invertFrom3D } from '../../utils/projection';

export interface Chunk {
  id: string;
  x: number;
  z: number;
  worldX: number;
  worldZ: number;
  bbox: [number, number, number, number]; // minLat, minLon, maxLat, maxLon
  priority: number;
  status: 'pending' | 'loading' | 'active' | 'evicting';
}

export interface StreamConfig {
  chunkSize: number; // in world units (1 unit = 100m)
  radius: number;    // number of chunks around focus point
  cacheSize: number; // max active chunks
}

export class WorldStreamManager {
  public project(lat: number, lon: number) {
    return projectTo3D(lat, lon);
  }

  private activeChunks: Map<string, Chunk> = new Map();
  private config: StreamConfig;


  constructor(config: Partial<StreamConfig> = {}) {
    this.config = {
      chunkSize: 500,
      radius: 2,
      cacheSize: 50,
      ...config
    };
  }

  public update(lat: number, lon: number): Chunk[] {
    const [worldX, worldZ] = projectTo3D(lat, lon);
    
    const centerChunkX = Math.floor(worldX / this.config.chunkSize);
    const centerChunkZ = Math.floor(worldZ / this.config.chunkSize);

    const neededChunkIds = new Set<string>();

    for (let dx = -this.config.radius; dx <= this.config.radius; dx++) {
      for (let dz = -this.config.radius; dz <= this.config.radius; dz++) {
        const cx = centerChunkX + dx;
        const cz = centerChunkZ + dz;
        const id = `${cx}_${cz}`;
        neededChunkIds.add(id);

        if (!this.activeChunks.has(id)) {
          const chunk = this.createChunk(cx, cz);
          chunk.priority = this.calculatePriority(cx, cz, centerChunkX, centerChunkZ);
          this.activeChunks.set(id, chunk);
        } else {
          const chunk = this.activeChunks.get(id)!;
          chunk.priority = this.calculatePriority(cx, cz, centerChunkX, centerChunkZ);
        }
      }
    }

    // Identify chunks to evict
    const idsToEvict: string[] = [];
    this.activeChunks.forEach((_, id) => {
      if (!neededChunkIds.has(id)) {
        idsToEvict.push(id);
      }
    });

    // Simple eviction policy: immediately remove for now
    // Future: implement LRU or priority-based cache
    idsToEvict.forEach(id => {
      if (this.activeChunks.size > this.config.cacheSize) {
        this.activeChunks.delete(id);
      }
    });

    return Array.from(this.activeChunks.values())
      .filter(c => neededChunkIds.has(c.id))
      .sort((a, b) => b.priority - a.priority);
  }

  private createChunk(cx: number, cz: number): Chunk {
    const worldMinX = cx * this.config.chunkSize;
    const worldMaxX = (cx + 1) * this.config.chunkSize;
    const worldMinZ = cz * this.config.chunkSize;
    const worldMaxZ = (cz + 1) * this.config.chunkSize;

    const [minLat, minLon] = invertFrom3D(worldMinX, worldMaxZ);
    const [maxLat, maxLon] = invertFrom3D(worldMaxX, worldMinZ);

    return {
      id: `${cx}_${cz}`,
      x: cx,
      z: cz,
      worldX: worldMinX,
      worldZ: worldMinZ,
      bbox: [minLat, minLon, maxLat, maxLon],
      priority: 0,
      status: 'active'
    };
  }

  private calculatePriority(cx: number, cz: number, ccx: number, ccz: number): number {
    const dist = Math.sqrt(Math.pow(cx - ccx, 2) + Math.pow(cz - ccz, 2));
    return 1 / (1 + dist);
  }

  public getActiveChunks(): Chunk[] {
    return Array.from(this.activeChunks.values());
  }
}
