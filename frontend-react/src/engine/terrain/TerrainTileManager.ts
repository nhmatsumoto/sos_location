import * as THREE from 'three';

export interface TerrainTile {
    key: string;
    texture: THREE.DataTexture;
    lat: number;
    lon: number;
}

export class TerrainTileManager {
    private cache: Map<string, TerrainTile> = new Map();
    private maxCacheSize: number = 20;

    public getTileKey(lat: number, lon: number, delta: number): string {
        const snapLat = Math.floor(lat / delta) * delta;
        const snapLon = Math.floor(lon / delta) * delta;
        return `${snapLat.toFixed(4)}_${snapLon.toFixed(4)}_${delta.toFixed(4)}`;
    }

    public getTile(key: string): TerrainTile | undefined {
        return this.cache.get(key);
    }

    public addTile(key: string, texture: THREE.DataTexture, lat: number, lon: number) {
        if (this.cache.size >= this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
                const tile = this.cache.get(firstKey);
                if (tile) {
                    tile.texture.dispose();
                    this.cache.delete(firstKey);
                }
            }
        }
        this.cache.set(key, { key, texture, lat, lon });
    }

    public dispose() {
        this.cache.forEach(tile => tile.texture.dispose());
        this.cache.clear();
    }
}
