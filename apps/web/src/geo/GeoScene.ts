import maplibregl from 'maplibre-gl';
import type { StyleSpecification } from 'maplibre-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import type { Layer } from '@deck.gl/core';
import { createBaseStyle } from './materials/theme';
import {
  boundaryGeoJson,
  buildCityLayers,
  buildCitySources,
  PICKABLE_LAYERS,
  type CityStyleOptions,
  type FeatureKind,
} from './layers/nativeCityStyle';
import 'maplibre-gl/dist/maplibre-gl.css';

export interface CameraState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

export interface PickResult {
  kind: FeatureKind;
  featureId: string;
  properties: Record<string, unknown>;
}

export interface GeoSceneEvents {
  onCameraChange?: (camera: CameraState) => void;
  onPick?: (pick: PickResult | null) => void;
  onFps?: (fps: number) => void;
  /** Tiles carregados (acumulado da revisão) e sources ainda pendentes. */
  onTileStats?: (loaded: number, pending: number) => void;
}

/**
 * Camada interna que possui o runtime geoespacial: inicializa o mapa,
 * controla a câmera, registra as camadas urbanas nativas (fill-extrusion),
 * coordena seleção via feature-state e libera recursos de GPU.
 * deck.gl (overlay interleaved) fica reservado para camadas de simulação.
 */
export class GeoScene {
  private map: maplibregl.Map | null = null;
  private overlay: MapboxOverlay | null = null;
  private events: GeoSceneEvents = {};
  private fpsHandle: number | null = null;
  private cityOptions: CityStyleOptions | null = null;
  private styleReady = false;
  private selected: { source: string; sourceLayer: string; id: string } | null = null;
  private loadedTiles = 0;

  init(container: HTMLElement, events: GeoSceneEvents): void {
    this.events = events;
    this.map = new maplibregl.Map({
      container,
      style: createBaseStyle() as unknown as StyleSpecification,
      center: [136.9113, 35.2907],
      zoom: 1.4,
      pitch: 0,
      bearing: 0,
      maxPitch: 75,
      attributionControl: false,
      canvasContextAttributes: { antialias: true },
    });

    this.map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    this.map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: '© OpenStreetMap contributors (imported data)',
      }),
    );

    // Reservado para futuras camadas de simulação (água dinâmica, agentes...).
    this.overlay = new MapboxOverlay({ interleaved: true, layers: [] });
    this.map.addControl(this.overlay);

    this.map.on('move', () => this.emitCamera());
    this.map.on('load', () => {
      this.styleReady = true;
      this.emitCamera();
      if (this.cityOptions) this.applyCityStyle();
    });

    // Telemetria de tiles via eventos nativos: o download acontece em Web
    // Workers do MapLibre, invisível a interceptores de fetch do main thread.
    this.map.on('sourcedata', (event) => {
      const e = event as { tile?: unknown; sourceId?: string };
      if (e.tile && e.sourceId?.startsWith('sos-')) {
        this.loadedTiles += 1;
        this.emitTileStats();
      }
    });
    this.map.on('idle', () => this.emitTileStats());

    this.map.on('click', (event) => this.handleClick(event.point));
    this.map.on('mousemove', (event) => {
      if (!this.map) return;
      const feature = this.queryTopFeature(event.point);
      this.map.getCanvas().style.cursor = feature ? 'pointer' : '';
    });

    this.startFpsMeter();
  }

  destroy(): void {
    if (this.fpsHandle !== null) cancelAnimationFrame(this.fpsHandle);
    this.fpsHandle = null;
    if (this.overlay && this.map) this.map.removeControl(this.overlay);
    this.overlay = null;
    this.map?.remove();
    this.map = null;
  }

  /** Registra/atualiza as camadas urbanas nativas da revisão ativa. */
  setCityTiles(options: CityStyleOptions | null): void {
    this.cityOptions = options;
    if (this.styleReady) this.applyCityStyle();
  }

  /** Camadas deck.gl adicionais (reservado para simulações futuras). */
  setSimulationLayers(layers: Layer[]): void {
    this.overlay?.setProps({ layers });
  }

  clearSelection(): void {
    this.applySelection(null);
  }

  /** Posiciona a câmera imediatamente (restauração de deep-link). */
  jumpTo(camera: CameraState): void {
    this.map?.jumpTo({
      center: [camera.longitude, camera.latitude],
      zoom: camera.zoom,
      pitch: camera.pitch,
      bearing: camera.bearing,
    });
  }

  flyToBounds(west: number, south: number, east: number, north: number): void {
    this.map?.fitBounds(
      [
        [west, south],
        [east, north],
      ],
      { pitch: 45, duration: 2500, padding: 60, maxZoom: 16 },
    );
  }

  resetNorth(): void {
    this.map?.resetNorthPitch({ duration: 800 });
  }

  topDownView(): void {
    this.map?.easeTo({ pitch: 0, bearing: 0, duration: 800 });
  }

  setDebugTiles(enabled: boolean): void {
    if (this.map) this.map.showTileBoundaries = enabled;
  }

  getCamera(): CameraState | null {
    if (!this.map) return null;
    const center = this.map.getCenter();
    return {
      longitude: center.lng,
      latitude: center.lat,
      zoom: this.map.getZoom(),
      pitch: this.map.getPitch(),
      bearing: this.map.getBearing(),
    };
  }

  // ------------------------------------------------------------------ estilo

  private applyCityStyle(): void {
    const map = this.map;
    if (!map) return;

    // Remove camadas e sources anteriores (ordem: layers antes de sources).
    for (const layer of map.getStyle().layers ?? []) {
      if (layer.id.startsWith('sos-')) map.removeLayer(layer.id);
    }
    for (const sourceId of Object.keys(map.getStyle().sources ?? {})) {
      if (sourceId.startsWith('sos-')) map.removeSource(sourceId);
    }
    this.selected = null;
    this.loadedTiles = 0;
    this.emitTileStats();

    const options = this.cityOptions;
    if (!options) return;

    for (const [id, source] of Object.entries(buildCitySources(options.revisionId))) {
      map.addSource(id, source);
    }
    if (options.boundaryBox) {
      map.addSource('sos-boundary', {
        type: 'geojson',
        data: boundaryGeoJson(options.boundaryBox),
      });
    }
    for (const layer of buildCityLayers(options)) {
      map.addLayer(layer);
    }
  }

  // ----------------------------------------------------------------- picking

  private queryTopFeature(
    point: maplibregl.Point,
  ): { kind: FeatureKind; feature: maplibregl.MapGeoJSONFeature } | null {
    const map = this.map;
    if (!map) return null;
    for (const { id, kind } of PICKABLE_LAYERS) {
      if (!map.getLayer(id)) continue;
      const features = map.queryRenderedFeatures(point, { layers: [id] });
      if (features.length > 0) return { kind, feature: features[0] };
    }
    return null;
  }

  private handleClick(point: maplibregl.Point): void {
    const hit = this.queryTopFeature(point);
    if (!hit) {
      this.applySelection(null);
      this.events.onPick?.(null);
      return;
    }

    const featureId =
      typeof hit.feature.id === 'string'
        ? hit.feature.id
        : typeof hit.feature.properties?.id === 'string'
          ? hit.feature.properties.id
          : null;
    if (!featureId) return;

    this.applySelection({
      source: hit.feature.source,
      sourceLayer: hit.feature.sourceLayer ?? '',
      id: featureId,
    });
    this.events.onPick?.({
      kind: hit.kind,
      featureId,
      properties: hit.feature.properties ?? {},
    });
  }

  private applySelection(next: { source: string; sourceLayer: string; id: string } | null): void {
    const map = this.map;
    if (!map) return;
    if (this.selected && map.getSource(this.selected.source)) {
      map.setFeatureState(
        { source: this.selected.source, sourceLayer: this.selected.sourceLayer, id: this.selected.id },
        { selected: false },
      );
    }
    this.selected = next;
    if (next && map.getSource(next.source)) {
      map.setFeatureState(
        { source: next.source, sourceLayer: next.sourceLayer, id: next.id },
        { selected: true },
      );
    }
  }

  // ------------------------------------------------------------------- infra

  private emitCamera(): void {
    const camera = this.getCamera();
    if (camera) this.events.onCameraChange?.(camera);
  }

  private emitTileStats(): void {
    const map = this.map;
    if (!map) return;
    let pending = 0;
    for (const sourceId of Object.keys(map.getStyle()?.sources ?? {})) {
      if (!sourceId.startsWith('sos-')) continue;
      try {
        if (!map.isSourceLoaded(sourceId)) pending += 1;
      } catch {
        // source em transição durante rebuild — ignora
      }
    }
    this.events.onTileStats?.(this.loadedTiles, pending);
  }

  private startFpsMeter(): void {
    let frames = 0;
    let last = performance.now();
    const tick = () => {
      frames += 1;
      const now = performance.now();
      if (now - last >= 1000) {
        this.events.onFps?.(Math.round((frames * 1000) / (now - last)));
        frames = 0;
        last = now;
      }
      this.fpsHandle = requestAnimationFrame(tick);
    };
    this.fpsHandle = requestAnimationFrame(tick);
  }
}
