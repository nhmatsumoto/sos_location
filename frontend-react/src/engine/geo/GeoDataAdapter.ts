import { gisApi } from '../../services/gisApi';
import { projectTo3D } from '../../utils/projection';

export class GeoDataAdapter {
  public static async getElevation(minLat: number, minLon: number, maxLat: number, maxLon: number, resolution: number = 128) {
    return await gisApi.getElevationGrid(minLat, minLon, maxLat, maxLon, resolution);
  }

  public static async getUrbanFeatures(minLat: number, minLon: number, maxLat: number, maxLon: number) {
    return await gisApi.getUrbanFeatures(minLat, minLon, maxLat, maxLon);
  }

  public static project(lat: number, lon: number): [number, number] {
    return projectTo3D(lat, lon);
  }
}
