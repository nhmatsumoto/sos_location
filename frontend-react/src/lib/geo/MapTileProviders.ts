/**
 * MapTileProviders — Catalogue of public, CORS-enabled XYZ tile sources.
 * Used by TileLoader and GeoDataPipeline to supply base-map imagery for 3D terrain texturing.
 */

export interface TileProvider {
  id: string;
  name: string;
  urlTemplate: string;  // {z}/{x}/{y} placeholders
  attribution: string;
  maxZoom: number;
  style: 'satellite' | 'dark' | 'light' | 'toner' | 'topo' | 'vector';
  apiKeyParam?: string;  // query param name if key needed
}

export const TILE_PROVIDERS: Record<string, TileProvider> = {
  esri_satellite: {
    id: 'esri_satellite',
    name: 'ESRI World Imagery',
    urlTemplate: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri',
    maxZoom: 17,
    style: 'satellite',
  },
  carto_dark: {
    id: 'carto_dark',
    name: 'CartoDB Dark Matter',
    urlTemplate: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap contributors © CARTO',
    maxZoom: 18,
    style: 'dark',
  },
  carto_positron: {
    id: 'carto_positron',
    name: 'CartoDB Positron',
    urlTemplate: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap contributors © CARTO',
    maxZoom: 18,
    style: 'light',
  },
  carto_voyager: {
    id: 'carto_voyager',
    name: 'CartoDB Voyager',
    urlTemplate: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap contributors © CARTO',
    maxZoom: 18,
    style: 'vector',
  },
  osm_standard: {
    id: 'osm_standard',
    name: 'OSM Standard',
    urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
    style: 'vector',
  },
  stadia_alidade: {
    id: 'stadia_alidade',
    name: 'Stadia Alidade Smooth',
    urlTemplate: 'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png',
    attribution: '© Stadia Maps © OpenMapTiles © OpenStreetMap contributors',
    maxZoom: 20,
    style: 'light',
  },
  stadia_alidade_dark: {
    id: 'stadia_alidade_dark',
    name: 'Stadia Alidade Dark',
    urlTemplate: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',
    attribution: '© Stadia Maps © OpenMapTiles © OpenStreetMap contributors',
    maxZoom: 20,
    style: 'dark',
  },
  stadia_toner: {
    id: 'stadia_toner',
    name: 'Stadia Toner',
    urlTemplate: 'https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}{r}.png',
    attribution: '© Stadia Maps © Stamen Design © OpenStreetMap contributors',
    maxZoom: 20,
    style: 'toner',
  },
  stadia_toner_lite: {
    id: 'stadia_toner_lite',
    name: 'Stadia Toner Lite',
    urlTemplate: 'https://tiles.stadiamaps.com/tiles/stamen_toner_lite/{z}/{x}/{y}{r}.png',
    attribution: '© Stadia Maps © Stamen Design © OpenStreetMap contributors',
    maxZoom: 20,
    style: 'toner',
  },
  stadia_osm_bright: {
    id: 'stadia_osm_bright',
    name: 'Stadia OSM Bright',
    urlTemplate: 'https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}{r}.png',
    attribution: '© Stadia Maps © OpenMapTiles © OpenStreetMap contributors',
    maxZoom: 20,
    style: 'vector',
  },
  stadia_outdoors: {
    id: 'stadia_outdoors',
    name: 'Stadia Outdoors',
    urlTemplate: 'https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}{r}.png',
    attribution: '© Stadia Maps © OpenMapTiles © OpenStreetMap contributors',
    maxZoom: 20,
    style: 'topo',
  },
  open_topo: {
    id: 'open_topo',
    name: 'OpenTopoMap',
    urlTemplate: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© OpenTopoMap contributors',
    maxZoom: 15,
    style: 'topo',
  },
  esri_topo: {
    id: 'esri_topo',
    name: 'ESRI World Topo',
    urlTemplate: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri',
    maxZoom: 17,
    style: 'topo',
  },
};

/** Subdomains used by some providers */
const SUBDOMAINS = ['a', 'b', 'c'];

/** Expand a tile URL template to a concrete URL */
export function buildTileUrl(provider: TileProvider, z: number, x: number, y: number, apiKey?: string): string {
  const s = SUBDOMAINS[x % SUBDOMAINS.length];
  const r = window.devicePixelRatio >= 2 ? '@2x' : '';
  let url = provider.urlTemplate
    .replace('{z}', String(z))
    .replace('{x}', String(x))
    .replace('{y}', String(y))
    .replace('{s}', s)
    .replace('{r}', r);
  if (apiKey && provider.apiKeyParam) {
    url += (url.includes('?') ? '&' : '?') + `${provider.apiKeyParam}=${apiKey}`;
  }
  return url;
}

/** Choose the best provider for a context (satellite / style) */
export function selectProvider(preferSatellite: boolean, style?: string): TileProvider {
  if (preferSatellite) return TILE_PROVIDERS.esri_satellite;
  if (style && TILE_PROVIDERS[style]) return TILE_PROVIDERS[style];
  return TILE_PROVIDERS.carto_dark;
}
