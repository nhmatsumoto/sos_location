import type { CityBlueprint } from '../../blueprint/CityBlueprintTypes';

export class CityMeshBuilder {
  /**
   * Generates a grid of vertices and indices for the terrain.
   * Vertex layout (8 floats, 32 bytes): [x, y, z, nx, ny, nz, u, v]
   * WebGL standard: X=Long, Y=Height(Up), Z=Lat
   */
  static buildTerrain(blueprint: CityBlueprint, worldSpanX: number, worldSpanZ: number, res: number = 256): { vertices: Float32Array; indices: Uint32Array } {
    const vertices = new Float32Array((res + 1) * (res + 1) * 8);
    const elev = blueprint.elevation || [];
    const elevRows = elev.length || 1;
    const elevCols = elev[0]?.length || 1;

    for (let j = 0; j <= res; j++) {
      for (let i = 0; i <= res; i++) {
        const u = i / res, v = j / res;
        const x = (u - 0.5) * worldSpanX;
        const z = (v - 0.5) * worldSpanZ;
        
        // Sample elevation from blueprint if available (normalized 0-1)
        const er = Math.min(elevRows - 1, Math.floor(v * elevRows));
        const ec = Math.min(elevCols - 1, Math.floor(u * elevCols));
        const hNorm = elev[er]?.[ec] ?? 0;
        const h = (blueprint.elevationMin + hNorm * (blueprint.elevationMax - blueprint.elevationMin)) * 100;

        const idx = (j * (res + 1) + i) * 8;
        vertices[idx + 0] = x;
        vertices[idx + 1] = h; // Elevation is Y (UP)
        vertices[idx + 2] = z;
        vertices[idx + 3] = 0; vertices[idx + 4] = 1; vertices[idx + 5] = 0; // Normal (Up)
        vertices[idx + 6] = u; vertices[idx + 7] = v; // UV
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
   * Vertex layout (stride 48 bytes / 12 floats):
   * [x, y, z, nx, ny, nz, color, u, v, reveal, p, p]
   */
  static buildBuildings(blueprint: CityBlueprint, areaHalfX: number, areaHalfZ: number, worldSpanX: number, worldSpanZ: number): Float32Array {
    const buildings = blueprint.osm.buildings || [];
    const bVerts: number[] = [];

    for (const b of buildings) {
      if (!b.coordinates || b.coordinates.length < 3) continue;
      const levels = b.levels || 1;
      const height = (b.height || (levels * 3.5)) * 100;
      const color = 0.45;

      const pts = b.coordinates.map(p => this.mapPos(p[0], p[1], blueprint));
      
      const pushVertex = (x: number, y: number, z: number, nx: number, ny: number, nz: number, u: number, v: number, rev: number) => {
        // [x, y, z, nx, ny, nz, color, u, v, reveal, p, p]
        bVerts.push(x, y, z, nx, ny, nz, color, u, v, rev, 0, 0);
      };

      for (let i = 0; i < pts.length; i++) {
        const p0 = pts[i], p1 = pts[(i + 1) % pts.length];
        const dx = p1[0] - p0[0], dz = p1[1] - p0[1];
        const len = Math.sqrt(dx * dx + dz * dz) || 1;
        const nx = -dz / len, nz = dx / len;
        
        const u0 = (p0[0] + areaHalfX) / worldSpanX, v0 = (p0[1] + areaHalfZ) / worldSpanZ;
        const u1 = (p1[0] + areaHalfX) / worldSpanX, v1 = (p1[1] + areaHalfZ) / worldSpanZ;
        
        // --- Walls ---
        pushVertex(p0[0], 0,      p0[1], nx, 0, nz, u0, v0, 1.0);
        pushVertex(p1[0], 0,      p1[1], nx, 0, nz, u1, v1, 1.0);
        pushVertex(p1[0], height, p1[1], nx, 0, nz, u1, v1, 1.0);
        
        pushVertex(p0[0], 0,      p0[1], nx, 0, nz, u0, v0, 1.0);
        pushVertex(p1[0], height, p1[1], nx, 0, nz, u1, v1, 1.0);
        pushVertex(p0[0], height, p0[1], nx, 0, nz, u0, v0, 1.0);

        // --- Roof ---
        if (i < pts.length - 2) {
          pushVertex(pts[0][0],   height, pts[0][1],   0, 1, 0, (pts[0][0]+areaHalfX)/worldSpanX,   (pts[0][1]+areaHalfZ)/worldSpanZ,   1.0);
          pushVertex(pts[i+1][0], height, pts[i+1][1], 0, 1, 0, (pts[i+1][0]+areaHalfX)/worldSpanX, (pts[i+1][1]+areaHalfZ)/worldSpanZ, 1.0);
          pushVertex(pts[i+2][0], height, pts[i+2][1], 0, 1, 0, (pts[i+2][0]+areaHalfX)/worldSpanX, (pts[i+2][1]+areaHalfZ)/worldSpanZ, 1.0);
        }
      }
    }
    return new Float32Array(bVerts);
  }

  private static mapPos(lat: number, lng: number, blueprint: CityBlueprint): [number, number] {
    const centerLat = (blueprint.bbox[0] + blueprint.bbox[2]) / 2;
    const centerLng = (blueprint.bbox[1] + blueprint.bbox[3]) / 2;
    // Multiplier for cm: 111320 * 100
    const latDiff = (lat - centerLat) * 11132000;
    const lngDiff = (lng - centerLng) * 11132000 * Math.cos(centerLat * Math.PI / 180);
    return [lngDiff, latDiff];
  }
}
