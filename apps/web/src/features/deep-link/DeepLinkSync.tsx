import { useEffect } from 'react';
import { api } from '../../api/client';
import { useAppStore } from '../../stores/appStore';
import { buildViewHash, parseViewHash } from './deepLink';

/**
 * Sincroniza a vista com a URL: no boot restaura cidade/revisão/câmera do hash;
 * durante a navegação mantém o hash atualizado (replaceState, sem poluir histórico).
 */
export function DeepLinkSync() {
  const selectedCity = useAppStore((s) => s.selectedCity);
  const selectedRevision = useAppStore((s) => s.selectedRevision);
  const camera = useAppStore((s) => s.camera);

  // Restauração (uma vez, no boot).
  useEffect(() => {
    const view = parseViewHash(window.location.hash);
    if (!view.citySlug) return;

    let cancelled = false;
    (async () => {
      try {
        const cities = await api.listCities();
        const city = cities.find((c) => c.slug === view.citySlug);
        if (!city || cancelled) return;

        const revisions = await api.listRevisions(city.id);
        const revision =
          revisions.find((r) => r.revisionNumber === view.revisionNumber) ??
          revisions.find((r) => r.status === 'published') ??
          revisions[0] ??
          null;
        if (cancelled) return;

        const pendingCamera = view.camera ?? (city.centerLon != null && city.centerLat != null
          ? {
              longitude: city.centerLon,
              latitude: city.centerLat,
              zoom: 14,
              pitch: 45,
              bearing: 0,
            }
          : null);
        useAppStore.setState({
          selectedCity: city,
          selectedRevision: revision,
          selectedFeature: null,
          activeSimulation: null,
          tileStats: { loaded: 0, pending: 0 },
          pendingCamera,
        });
      } catch {
        // Hash inválido ou API indisponível: segue o fluxo normal.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Escrita (debounced) — qualquer vista vira link compartilhável.
  useEffect(() => {
    if (!selectedCity || !selectedRevision || !camera) return;
    const handle = window.setTimeout(() => {
      const hash = buildViewHash({
        citySlug: selectedCity.slug,
        revisionNumber: selectedRevision.revisionNumber,
        camera,
      });
      window.history.replaceState(null, '', hash);
    }, 400);
    return () => window.clearTimeout(handle);
  }, [selectedCity, selectedRevision, camera]);

  return null;
}
