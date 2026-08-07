import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GeoScene } from '../../geo/GeoScene';
import { useAppStore } from '../../stores/appStore';
import { api } from '../../api/client';
import { buildRailRoutes, trainsAtTime } from '../trains/trainSimulation';
import type { OperationalFeature, RiskZone } from '../../schemas/api';
import { getOperationalTool } from '../disaster-management/operationalTools';

const KUMAMOTO_SCENARIO_KEY = 'kumamoto-2026-07-28-m68';

function riskZonesToFeatureCollection(zones: RiskZone[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: zones.map((zone) => ({
      type: 'Feature',
      properties: { id: zone.id, name: zone.name, hazardType: zone.hazardType, level: zone.level },
      geometry: zone.geometry as GeoJSON.Polygon,
    })),
  };
}

function operationsToFeatureCollection(
  features: OperationalFeature[],
): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: features.map((feature) => ({
      type: 'Feature',
      id: feature.id,
      properties: {
        id: feature.id,
        type: feature.featureType,
        name: feature.name,
        priority: feature.priority,
        status: feature.status,
        confirmedVictims: feature.confirmedVictims,
        estimatedVictims: feature.estimatedVictims,
        peopleRescued: feature.peopleRescued,
        assignedTeam: feature.assignedTeam,
        verificationStatus: feature.verificationStatus,
      },
      geometry: feature.geometry,
    })),
  };
}

/** Ponte React → GeoScene. Mantém o runtime geoespacial fora do ciclo do React. */
export function CityViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<GeoScene | null>(null);

  const selectedRevision = useAppStore((s) => s.selectedRevision);
  const selectedPlace = useAppStore((s) => s.selectedPlace);
  const selectedFeature = useAppStore((s) => s.selectedFeature);
  const pendingCamera = useAppStore((s) => s.pendingCamera);
  const layers = useAppStore((s) => s.layers);
  const activeSimulation = useAppStore((s) => s.activeSimulation);
  const riskZoneDraw = useAppStore((s) => s.riskZoneDraw);
  const operationalDraw = useAppStore((s) => s.operationalDraw);
  const scientificOverlay = useAppStore((s) => s.scientificOverlay);

  const { data: riskZones } = useQuery({
    queryKey: ['risk-zones', selectedRevision?.id],
    queryFn: () => api.listRiskZones(selectedRevision!.id),
    enabled: !!selectedRevision,
  });
  const { data: kumamotoOperations } = useQuery({
    queryKey: ['operational-features', KUMAMOTO_SCENARIO_KEY],
    queryFn: () => api.listOperationalFeatures(KUMAMOTO_SCENARIO_KEY),
    refetchInterval: 5_000,
    retry: false,
  });

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
      activeSimulation,
    });
  }, [selectedRevision, layers, selectedPlace, activeSimulation]);

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

    Promise.all([
      api.getRailways(selectedRevision.id),
      import('../trains/trainsLayer'),
    ])
      .then(([features, { buildTrainsLayer }]) => {
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

  // Ponte das ferramentas de desenho: o painel configura o tipo e o mapa
  // captura a geometria sem acoplar MapLibre aos formulários React.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (operationalDraw?.active) {
      scene.startGeometryDraw(
        operationalDraw.geometryKind,
        (count) => useAppStore.getState().setOperationalDrawVertexCount(count),
      );
    } else if (riskZoneDraw?.active) {
      scene.startRiskZoneDraw((count) => useAppStore.getState().setRiskZoneDrawVertexCount(count));
    } else {
      scene.cancelGeometryDraw();
    }
  }, [operationalDraw?.active, operationalDraw?.geometryKind, riskZoneDraw?.active]);

  // Exibe as zonas de risco salvas da revisão ativa.
  useEffect(() => {
    sceneRef.current?.setRiskZones(riskZones ? riskZonesToFeatureCollection(riskZones) : null);
  }, [riskZones]);

  useEffect(() => {
    sceneRef.current?.setOperationalFeatures(
      kumamotoOperations ? operationsToFeatureCollection(kumamotoOperations) : null,
    );
  }, [kumamotoOperations]);

  useEffect(() => {
    sceneRef.current?.setScientificAnalysis(scientificOverlay);
  }, [scientificOverlay]);

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
      {riskZoneDraw?.active && (
        <div className="absolute left-3 top-14 z-10 flex items-center gap-2">
          <span className="viewer-btn" data-testid="risk-zone-vertex-count">
            {riskZoneDraw.vertexCount} pts
          </span>
          <button
            type="button"
            className="viewer-btn"
            data-testid="risk-zone-finish"
            disabled={riskZoneDraw.vertexCount < 3}
            onClick={() => {
              const polygon = sceneRef.current?.finishRiskZoneDraw() ?? null;
              useAppStore.getState().setPendingRiskZoneGeometry(polygon);
              useAppStore.getState().endRiskZoneDraw();
            }}
          >
            Finish
          </button>
          <button
            type="button"
            className="viewer-btn"
            data-testid="risk-zone-cancel"
            onClick={() => {
              sceneRef.current?.cancelRiskZoneDraw();
              useAppStore.getState().endRiskZoneDraw();
            }}
          >
            Cancel
          </button>
        </div>
      )}
      {operationalDraw?.active && (
        <div
          className="absolute left-3 top-14 z-10 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-2 rounded-xl border border-amber-700/60 bg-slate-950/92 p-2 shadow-xl shadow-black/40 backdrop-blur-md"
          data-testid="operational-draw-toolbar"
        >
          <span className="px-1 text-[11px] text-slate-300" data-testid="operational-draw-count">
            <strong className="text-amber-200">
              {getOperationalTool(operationalDraw.featureType)?.label ?? operationalDraw.featureType}
            </strong>
            {' · '}
            {operationalDraw.vertexCount}{' '}
            {operationalDraw.geometryKind === 'point' ? 'ponto' : 'pontos'}
          </span>
          <button
            type="button"
            className="viewer-btn"
            aria-label="Desfazer último ponto"
            disabled={operationalDraw.vertexCount === 0}
            onClick={() => sceneRef.current?.undoGeometryDrawVertex()}
          >
            ↶ Desfazer
          </button>
          <button
            type="button"
            className="rounded-md bg-amber-600 px-2.5 py-1 text-xs font-semibold text-slate-950 hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
            data-testid="operational-draw-finish"
            disabled={
              operationalDraw.vertexCount
              < (operationalDraw.geometryKind === 'point'
                ? 1
                : operationalDraw.geometryKind === 'line'
                  ? 2
                  : 3)
            }
            onClick={() => {
              const geometry = sceneRef.current?.finishGeometryDraw() ?? null;
              if (geometry) {
                useAppStore.getState().setPendingOperationalGeometry({
                  featureType: operationalDraw.featureType,
                  geometry,
                });
              }
              useAppStore.getState().endOperationalDraw();
            }}
          >
            Concluir marcação
          </button>
          <button
            type="button"
            className="viewer-btn"
            data-testid="operational-draw-cancel"
            onClick={() => {
              sceneRef.current?.cancelGeometryDraw();
              useAppStore.getState().endOperationalDraw();
            }}
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
