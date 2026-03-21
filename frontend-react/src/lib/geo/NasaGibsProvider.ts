/**
 * NasaGibsProvider — NASA GIBS (Global Imagery Browse Services) via WMS.
 *
 * No API key required. Access-Control-Allow-Origin: * on all GIBS endpoints.
 *
 * Layers used:
 *   • VIIRS_SNPP_CorrectedReflectance_TrueColor   — 500 m, daily
 *   • Landsat_WELD_CorrectedReflectance_TrueColor_Global_Annual — 30 m, annual
 *   • MODIS_Terra_L3_NDVI_8Day_1km                — 1 km, 8-day composite
 */

const GIBS_WMS = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi';

export interface NasaImageryResult {
  /** True-color canvas (best available: Landsat 30m or VIIRS 500m) */
  trueColorCanvas: HTMLCanvasElement | null;
  /** NDVI canvas (1 km resolution, greens = vegetation, blues = sparse/water) */
  ndviCanvas: HTMLCanvasElement | null;
  /** Layer name actually fetched */
  layerUsed: string;
  fetchedAt: string;
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function isoDate(daysAgo = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().substring(0, 10);
}

// Landsat Annual WELD: annual composites, most recent confirmed year
const LANDSAT_ANNUAL_DATE = '2021-01-01';

// ── WMS fetcher ───────────────────────────────────────────────────────────────

async function fetchWmsImage(
  layer: string,
  date: string,
  west: number,
  south: number,
  east: number,
  north: number,
  width: number,
  height: number,
  format: 'image/jpeg' | 'image/png' = 'image/jpeg',
): Promise<HTMLCanvasElement | null> {
  const bbox = `${west},${south},${east},${north}`;
  const url = `${GIBS_WMS}?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0`
    + `&LAYERS=${layer}&CRS=CRS:84&BBOX=${bbox}`
    + `&WIDTH=${width}&HEIGHT=${height}&FORMAT=${format}`
    + `&TIME=${date}&TRANSPARENT=FALSE`;

  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = width; c.height = height;
      c.getContext('2d')!.drawImage(img, 0, 0, width, height);
      resolve(c);
    };
    img.onerror = () => resolve(null);
    // 10s timeout
    const t = setTimeout(() => { img.src = ''; resolve(null); }, 10000);
    img.onload = () => {
      clearTimeout(t);
      const c = document.createElement('canvas');
      c.width = width; c.height = height;
      c.getContext('2d')!.drawImage(img, 0, 0, width, height);
      resolve(c);
    };
    img.src = url;
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

export class NasaGibsProvider {
  /**
   * Fetch the best available NASA true-color imagery + NDVI for a bbox.
   * Tries: Landsat 30m annual → VIIRS 500m recent day → null.
   *
   * @param imgSize  Canvas size for true-color (default 2048)
   * @param ndviSize Canvas size for NDVI grid (default 256)
   */
  static async fetch(
    minLat: number,
    minLon: number,
    maxLat: number,
    maxLon: number,
    imgSize  = 2048,
    ndviSize = 256,
  ): Promise<NasaImageryResult> {
    const w = minLon, s = minLat, e = maxLon, n = maxLat;

    // Landsat Annual — 30 m, best detail
    const landsatFetch = fetchWmsImage(
      'Landsat_WELD_CorrectedReflectance_TrueColor_Global_Annual',
      LANDSAT_ANNUAL_DATE, w, s, e, n, imgSize, imgSize, 'image/jpeg',
    );

    // VIIRS True Color — 500 m, daily (fallback)
    const viirsFetch = fetchWmsImage(
      'VIIRS_SNPP_CorrectedReflectance_TrueColor',
      isoDate(3), w, s, e, n, imgSize, imgSize, 'image/jpeg',
    );

    // NDVI — 1 km, 8-day composite
    const ndviFetch = fetchWmsImage(
      'MODIS_Terra_L3_NDVI_8Day_1km',
      isoDate(8), w, s, e, n, ndviSize, ndviSize, 'image/png',
    );

    const [landsat, viirs, ndvi] = await Promise.all([landsatFetch, viirsFetch, ndviFetch]);

    // Prefer Landsat (more detail), fall back to VIIRS
    // Detect if Landsat returned valid content (not all-black/grey fill tiles)
    const trueColorCanvas = isValidImageCanvas(landsat) ? landsat
                          : isValidImageCanvas(viirs)   ? viirs
                          : null;
    const layerUsed = isValidImageCanvas(landsat) ? 'Landsat_30m_Annual'
                    : isValidImageCanvas(viirs)   ? 'VIIRS_500m_Daily'
                    : 'none';

    return {
      trueColorCanvas,
      ndviCanvas: ndvi,
      layerUsed,
      fetchedAt: new Date().toISOString(),
    };
  }
}

/** Heuristic: reject tiles that are solid fill (no data) */
function isValidImageCanvas(canvas: HTMLCanvasElement | null): canvas is HTMLCanvasElement {
  if (!canvas) return false;
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  // Sample 16 pixels across the canvas — if all identical, likely fill tile
  const sz = canvas.width;
  const step = Math.max(1, Math.floor(sz / 4));
  const samples: number[] = [];
  for (let y = step; y < sz; y += step) {
    for (let x = step; x < sz; x += step) {
      const px = ctx.getImageData(x, y, 1, 1).data;
      samples.push(px[0] + px[1] * 256 + px[2] * 65536);
    }
  }
  const unique = new Set(samples).size;
  return unique > 3; // at least 4 distinct pixel values = real data
}
