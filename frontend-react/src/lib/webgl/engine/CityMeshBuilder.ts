import type { CityBlueprint } from '../../blueprint/CityBlueprintTypes';

export class CityMeshBuilder {
  /**
   * Generates a grid of vertices and indices for the terrain.
   */
  static buildTerrain(_blueprint: CityBlueprint, worldSpanX: number, worldSpanZ: number, res: number = 512): { vertices: Float32Array; indices: Uint32Array } {
    const vertices = new Float32Array((res + 1) * (res + 1) * 8);
    for (let j = 0; j <= res; j++) {
      for (let i = 0; i <= res; i++) {
        const u = i / res, v = j / res;
        const x = (u - 0.5) * worldSpanX, z = (v - 0.5) * worldSpanZ;
        const idx = (j * (res + 1) + i) * 8;
        vertices[idx+0]=x; vertices[idx+1]=z; vertices[idx+2]=0; // y pos from topo map in shader
        vertices[idx+3]=0; vertices[idx+4]=1; vertices[idx+5]=0; // normal
        vertices[idx+6]=u; vertices[idx+7]=v; // uv
      }
    }
    const indices = new Uint32Array(res * res * 6);
    let iOff = 0;
    for (let j = 0; j < res; j++) {
      for (let i = 0; i < res; i++) {
        const p0 = j * (res + 1) + i;
        const p1 = p0 + 1, p2 = p0 + (res + 1), p3 = p2 + 1;
        indices[iOff++] = p0; indices[iOff++] = p2; indices[iOff++] = p1;
        indices[iOff++] = p1; indices[iOff++] = p2; indices[iOff++] = p3;
      }
    }
    return { vertices, indices };
  }

  /**
   * Generates building geometry from blueprints.
   */
  static buildBuildings(blueprint: CityBlueprint, areaHalfX: number, areaHalfZ: number, worldSpanX: number, worldSpanZ: number): Float32Array {
    const buildings = blueprint.osm.buildings || [];
    const bVerts: number[] = [];

    for (const b of buildings) {
      if (!b.coordinates || b.coordinates.length < 3) continue;
      const levels = b.levels || 1;
      const height = b.height || (levels * 350);
      const color = 0.45; // Default color
      
      const pts = b.coordinates.map(p => this.mapPos(p[0], p[1], blueprint));

      for (let i = 0; i < pts.length; i++) {
        const p0 = pts[i], p1 = pts[(i + 1) % pts.length];
        const dx = p1[0] - p0[0], dz = p1[1] - p0[1];
        const len = Math.sqrt(dx * dx + dz * dz) || 1;
        const nx = -dz / len, nz = dx / len;
        const u0 = (p0[0] + areaHalfX) / worldSpanX, v0 = (p0[1] + areaHalfZ) / worldSpanZ;
        const u1 = (p1[0] + areaHalfX) / worldSpanX, v1 = (p1[1] + areaHalfZ) / worldSpanZ;
        
        // Wall Tri 1
        bVerts.push(p0[0], p0[1], 0, nx, 0, nz, color, u0, v0, 1.0, 0, 0); // 12 elements per vertex
        bVerts.push(p1[0], p1[1], 0, nx, 0, nz, color, u1, v1, 1.0, 0, 0);
        bVerts.push(p1[0], p1[1], height, nx, 0, nz, color, u1, v1, 0.7, 0, 0);
        // Wall Tri 2
        bVerts.push(p0[0], p0[1], 0, nx, 0, nz, color, u0, v0, 1.0, 0, 0);
        bVerts.push(p1[0], p1[1], height, nx, 0, nz, color, u1, v1, 0.7, 0, 0);
        bVerts.push(p0[0], p0[1], height, nx, 0, nz, color, u0, v0, 0.7, 0, 0);
      }
    }
    return new Float32Array(bVerts);
  }

  private static mapPos(lat: number, lng: number, blueprint: CityBlueprint): [number, number] {
    const centerLat = (blueprint.bbox[0] + blueprint.bbox[2]) / 2;
    const centerLng = (blueprint.bbox[1] + blueprint.bbox[3]) / 2;
    const latDiff = (lat - centerLat) * 11132000;
    const lngDiff = (lng - centerLng) * 11132000 * Math.cos(centerLat * Math.PI / 180);
    return [lngDiff, latDiff];
  }
}
