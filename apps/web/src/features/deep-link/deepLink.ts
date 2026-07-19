import type { CameraState } from '../../geo/GeoScene';

/**
 * Deep-link de visualização: cidade, revisão e câmera codificadas no hash da URL.
 * Formato: #c=<citySlug>&r=<revisionNumber>&v=<lon>,<lat>,<zoom>,<pitch>,<bearing>
 * Qualquer vista vira um link compartilhável e restaurável.
 */
export interface ViewHash {
  citySlug?: string;
  revisionNumber?: number;
  camera?: CameraState;
}

export function buildViewHash(view: ViewHash): string {
  const params = new URLSearchParams();
  if (view.citySlug) params.set('c', view.citySlug);
  if (view.revisionNumber !== undefined) params.set('r', String(view.revisionNumber));
  if (view.camera) {
    const { longitude, latitude, zoom, pitch, bearing } = view.camera;
    params.set(
      'v',
      [
        longitude.toFixed(5),
        latitude.toFixed(5),
        zoom.toFixed(2),
        Math.round(pitch),
        Math.round(bearing),
      ].join(','),
    );
  }
  return `#${params.toString()}`;
}

export function parseViewHash(hash: string): ViewHash {
  const view: ViewHash = {};
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!raw) return view;

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(raw);
  } catch {
    return view;
  }

  const slug = params.get('c');
  if (slug && /^[a-z0-9-]{1,128}$/.test(slug)) view.citySlug = slug;

  const revision = Number(params.get('r'));
  if (Number.isInteger(revision) && revision > 0) view.revisionNumber = revision;

  const v = params.get('v')?.split(',').map(Number) ?? [];
  if (v.length === 5 && v.every((n) => Number.isFinite(n))) {
    const [longitude, latitude, zoom, pitch, bearing] = v;
    if (
      longitude >= -180 && longitude <= 180 &&
      latitude >= -90 && latitude <= 90 &&
      zoom >= 0 && zoom <= 24 &&
      pitch >= 0 && pitch <= 85
    ) {
      view.camera = { longitude, latitude, zoom, pitch, bearing: ((bearing % 360) + 360) % 360 };
    }
  }
  return view;
}
