import { useEffect, useRef } from 'react';
import { GeoScene } from '../../geo/GeoScene';
import { useAppStore } from '../../stores/appStore';
import { api } from '../../api/client';
import { buildRailRoutes, trainsAtTime } from '../trains/trainSimulation';
import { buildTrainsLayer } from '../trains/trainsLayer';

/** Ponte React → GeoScene. Mantém o runtime geoespacial fora do ciclo do React. */
export function CityViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<GeoScene | null>(null);

  const selectedRevision = useAppStore((s) => s.selectedRevision);
  const selectedPlace = useAppStore((s) => s.selectedPlace);
  const selectedFeature = useAppStore((s) => s.selectedFeature);
  const pendingCamera = useAppStore((s) => s.pendingCamera);
  const layers = useAppStore((s) => s.layers);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new GeoScene();
    scene.init(containerRef.current, {
      onCameraChange: (camera) => useAppStore.getState().setCamera(camera),
      onFps: (fps) => useAppStore.getState().setFps(fps),
      onTileStats: (loaded, pending) => useAppStore.getState().setTileStats(loaded, pending),
      onPick: (pick) => {
        useAppStore
          .getState()
          .setSelectedFeature(pick ? { kind: pick.kind, id: pick.featureId } : null);
      },
    });
    sceneRef.current = scene;
    return () => {
      scene.destroy();
      sceneRef.current = null;
    };
  }, []);

  // Atualiza as camadas urbanas quando revisão/visibilidade mudam.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (!selectedRevision) {
      scene.setCityTiles(null);
      return;
    }
    scene.setCityTiles({
      revisionId: selectedRevision.id,
      visibility: layers,
      boundaryBox: selectedPlace
        ? {
            west: selectedPlace.west,
            south: selectedPlace.south,
            east: selectedPlace.east,
            north: selectedPlace.north,
          }
        : null,
    });
  }, [selectedRevision, layers, selectedPlace]);

  // Trens em movimento por horário (simulação determinística sobre ferrovias OSM
  // da revisão ativa — funciona para qualquer cidade importada).
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (!selectedRevision || !layers.trains) {
      scene.setSimulationLayers([]);
      return;
    }

    let cancelled = false;
    let rafHandle = 0;
    let lastUpdate = 0;

    api
      .getRailways(selectedRevision.id)
      .then((features) => {
        if (cancelled) return;
        const routes = buildRailRoutes(features);
        if (routes.length === 0) return;

        const tick = (now: number) => {
          if (cancelled) return;
          if (now - lastUpdate >= 100) {
            lastUpdate = now;
            scene.setSimulationLayers([buildTrainsLayer(trainsAtTime(routes, Date.now()))]);
          }
          rafHandle = requestAnimationFrame(tick);
        };
        rafHandle = requestAnimationFrame(tick);
      })
      .catch(() => {
        // Ferrovias indisponíveis: a cidade continua funcional sem trens.
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafHandle);
      scene.setSimulationLayers([]);
    };
  }, [selectedRevision, layers.trains]);

  // Fechar o inspetor limpa o destaque no mapa.
  useEffect(() => {
    if (!selectedFeature) sceneRef.current?.clearSelection();
  }, [selectedFeature]);

  useEffect(() => {
    sceneRef.current?.setDebugTiles(layers.debugTiles);
  }, [layers.debugTiles]);

  // Restaura a câmera de um deep-link assim que a cena existir.
  useEffect(() => {
    if (pendingCamera && sceneRef.current) {
      sceneRef.current.jumpTo(pendingCamera);
      useAppStore.getState().setPendingCamera(null);
    }
  }, [pendingCamera]);

  // Voa até o lugar selecionado na pesquisa.
  useEffect(() => {
    if (selectedPlace && sceneRef.current) {
      sceneRef.current.flyToBounds(
        selectedPlace.west,
        selectedPlace.south,
        selectedPlace.east,
        selectedPlace.north,
      );
    }
  }, [selectedPlace]);

  return (
    // absolute inset-0 sobre o <main relative>: altura garantida sem depender
    // de percentual dentro de flex item (height:100% resolveria como 0).
    <div className="absolute inset-0">
      {/* style inline: o CSS do maplibre (.maplibregl-map) sobrescreveria utilities de posição. */}
      <div
        ref={containerRef}
        data-testid="geo-scene"
        style={{ position: 'absolute', inset: 0 }}
      />
      <div className="absolute left-3 top-3 z-10 flex gap-2">
        <button
          type="button"
          className="viewer-btn"
          onClick={() => sceneRef.current?.topDownView()}
          title="Vista superior"
        >
          ⬇ Top
        </button>
        <button
          type="button"
          className="viewer-btn"
          onClick={() => sceneRef.current?.resetNorth()}
          title="Orientar para o norte"
        >
          ⌖ N
        </button>
      </div>
    </div>
  );
}
