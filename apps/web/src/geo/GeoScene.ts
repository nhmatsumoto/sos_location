import maplibregl from 'maplibre-gl';
import type { StyleSpecification } from 'maplibre-gl';
import type { MapboxOverlay } from '@deck.gl/mapbox';
import type { Layer } from '@deck.gl/core';
import { simulationIntensityUrl, simulationReplayFrameUrl } from '../api/client';
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
  private overlayLoading: Promise<void> | null = null;
  private simulationLayers: Layer[] = [];
  private events: GeoSceneEvents = {};
  private hoverFrame: number | null = null;
  private pendingHoverPoint: maplibregl.Point | null = null;
  private cameraTimer: number | null = null;
  private tileStatsTimer: number | null = null;
  private renderedFrames = 0;
  private fpsWindowStartedAt = performance.now();
  private cityOptions: CityStyleOptions | null = null;
  private styleReady = false;
  private selected: { source: string; sourceLayer: string; id: string } | null = null;
  private loadedTiles = 0;

  init(container: HTMLElement, events: GeoSceneEvents): void {
    this.events = events;
    const browser = navigator as Navigator & { deviceMemory?: number };
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lowPowerDevice = (browser.hardwareConcurrency > 0 && browser.hardwareConcurrency <= 4)
      || (browser.deviceMemory != null && browser.deviceMemory <= 4);
    this.map = new maplibregl.Map({
      container,
      style: createBaseStyle() as unknown as StyleSpecification,
      center: [136.9113, 35.2907],
      zoom: 1.4,
      pitch: 0,
      bearing: 0,
      maxPitch: 75,
      attributionControl: false,
      // Perfil adaptativo: mantém a geometria/dados completos, mas reduz o
      // custo de framebuffer, cache e animações em hardware limitado.
      pixelRatio: Math.min(window.devicePixelRatio || 1, lowPowerDevice ? 1.25 : 2),
      maxTileCacheZoomLevels: lowPowerDevice ? 2 : 4,
      fadeDuration: reducedMotion || lowPowerDevice ? 0 : 200,
      reduceMotion: reducedMotion,
      canvasContextAttributes: {
        antialias: !lowPowerDevice,
        powerPreference: lowPowerDevice ? 'low-power' : 'high-performance',
      },
    });

    this.map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    this.map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: '© OpenStreetMap contributors (imported data)',
      }),
    );

    this.map.on('move', () => this.scheduleCameraEmit());
    this.map.on('render', () => this.recordRenderedFrame());
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
        this.scheduleTileStats();
      }
    });
    this.map.on('idle', () => {
      this.scheduleTileStats();
      this.events.onFps?.(0);
    });

    this.map.on('click', (event) => this.handleClick(event.point));
    this.map.on('mousemove', (event) => {
      this.pendingHoverPoint = event.point;
      if (this.hoverFrame !== null) return;
      this.hoverFrame = requestAnimationFrame(() => {
        this.hoverFrame = null;
        if (!this.map || !this.pendingHoverPoint) return;
        const feature = this.queryTopFeature(this.pendingHoverPoint);
        this.map.getCanvas().style.cursor = feature ? 'pointer' : '';
      });
    });
  }

  destroy(): void {
    if (this.hoverFrame !== null) cancelAnimationFrame(this.hoverFrame);
    if (this.cameraTimer !== null) window.clearTimeout(this.cameraTimer);
    if (this.tileStatsTimer !== null) window.clearTimeout(this.tileStatsTimer);
    this.hoverFrame = null;
    this.cameraTimer = null;
    this.tileStatsTimer = null;
    if (this.overlay && this.map) this.map.removeControl(this.overlay);
    this.overlay = null;
    this.simulationLayers = [];
    this.map?.remove();
    this.map = null;
  }

  /** Registra/atualiza as camadas urbanas nativas da revisão ativa. */
  setCityTiles(options: CityStyleOptions | null): void {
    const previous = this.cityOptions;
    this.cityOptions = options;
    if (!this.styleReady) return;
    if (previous && options && this.canReuseCitySources(previous, options)) {
      if (previous.activeSimulation?.replayFrameIndex
        !== options.activeSimulation?.replayFrameIndex) {
        this.updateSeismicImage(options);
      }
      this.applyLayerVisibility(options);
      return;
    }
    this.applyCityStyle();
  }

  /** Camadas deck.gl adicionais (reservado para simulações futuras). */
  setSimulationLayers(layers: Layer[]): void {
    this.simulationLayers = layers;
    if (!this.map) return;
    if (layers.length === 0) {
      if (this.overlay) this.map.removeControl(this.overlay);
      this.overlay = null;
      return;
    }
    if (!this.overlay) {
      if (this.overlayLoading) return;
      const targetMap = this.map;
      // deck.gl é grande e trens vêm desativados por padrão: carrega todo o
      // runtime apenas quando uma camada animada é realmente solicitada.
      this.overlayLoading = import('@deck.gl/mapbox')
        .then(({ MapboxOverlay: Overlay }) => {
          if (this.map !== targetMap || this.simulationLayers.length === 0) return;
          this.overlay = new Overlay({ interleaved: true, layers: this.simulationLayers });
          targetMap.addControl(this.overlay);
        })
        .finally(() => {
          this.overlayLoading = null;
        });
      return;
    }
    this.overlay.setProps({ layers });
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
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.map?.fitBounds(
      [
        [west, south],
        [east, north],
      ],
      { pitch: 45, duration: reduceMotion ? 0 : 2500, padding: 60, maxZoom: 16 },
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

    // Remove camadas e sources anteriores (ordem: terrain → layers → sources).
    map.setTerrain(null);
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

    // Relevo real (encoding Terrarium) servido pelo backend a partir do object
    // storage — dados de elevação computados, não imagery (ADR-0004 preservado).
    if (options.visibility.terrain) {
      map.addSource('sos-terrain', {
        type: 'raster-dem',
        tiles: [`${window.location.origin}/api/v1/terrain/{z}/{x}/{y}.png`],
        encoding: 'terrarium',
        tileSize: 256,
        minzoom: 8,
        maxzoom: 12,
      });
      map.addLayer({
        id: 'sos-hillshade',
        type: 'hillshade',
        source: 'sos-terrain',
        paint: {
          'hillshade-exaggeration': 0.35,
          'hillshade-shadow-color': '#04060a',
          'hillshade-highlight-color': '#26313e',
          'hillshade-accent-color': '#0b0f14',
        },
      });
      map.setTerrain({ source: 'sos-terrain', exaggeration: 1.0 });
    }

    // Overlay de intensidade sísmica (PGA): uma imagem única por simulação
    // concluída (não uma pirâmide de tiles) — ver IntensityRasterEncoding no backend.
    if (options.visibility.seismicIntensity && options.activeSimulation) {
      const { west, south, east, north } = options.activeSimulation;
      map.addSource('sos-intensity', {
        type: 'image',
        url: this.seismicImageUrl(options),
        coordinates: [
          [west, north],
          [east, north],
          [east, south],
          [west, south],
        ],
      });
      map.addLayer({
        id: 'sos-intensity-raster',
        type: 'raster',
        source: 'sos-intensity',
        paint: { 'raster-opacity': 0.55 },
      });
    }

    for (const [id, source] of Object.entries(buildCitySources(options))) {
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

  /**
   * Visibilidade de camadas vetoriais é uma alteração de layout barata. Manter
   * sources e tiles existentes evita novo download, parse e upload ao WebGL.
   */
  private applyLayerVisibility(options: CityStyleOptions): void {
    const map = this.map;
    if (!map) return;
    const layerVisibility: Array<[string, boolean]> = [
      ['sos-land-use-fill', options.visibility.landUse],
      ['sos-water-fill', options.visibility.water],
      ['sos-water-line', options.visibility.water],
      ['sos-roads-line', options.visibility.roads],
      ['sos-buildings-footprint', options.visibility.buildings],
      ['sos-buildings-3d', options.visibility.buildings],
      ['sos-boundary-line', options.visibility.boundary],
    ];
    for (const [layerId, visible] of layerVisibility) {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
      }
    }
  }

  private seismicImageUrl(options: CityStyleOptions): string {
    const simulation = options.activeSimulation!;
    return simulation.replayFrameIndex == null
      ? simulationIntensityUrl(simulation.id)
      : simulationReplayFrameUrl(simulation.id, simulation.replayFrameIndex);
  }

  /** Troca somente a imagem: preserva os MVTs, a seleção e a câmera durante o replay. */
  private updateSeismicImage(options: CityStyleOptions): void {
    const map = this.map;
    if (!map || !options.visibility.seismicIntensity || !options.activeSimulation) return;
    const source = map.getSource('sos-intensity') as maplibregl.ImageSource | undefined;
    source?.updateImage({ url: this.seismicImageUrl(options) });
  }

  private canReuseCitySources(previous: CityStyleOptions, next: CityStyleOptions): boolean {
    if (previous.revisionId !== next.revisionId) return false;
    // Terrain e intensity criam/removem sources próprios; são mudanças raras e
    // continuam passando pelo rebuild seguro.
    if (previous.visibility.terrain !== next.visibility.terrain) return false;
    if (previous.visibility.seismicIntensity !== next.visibility.seismicIntensity) return false;
    if (!GeoScene.sameBounds(previous.boundaryBox, next.boundaryBox)) return false;
    if (previous.activeSimulation?.id !== next.activeSimulation?.id) return false;
    return true;
  }

  private static sameBounds(
    first: CityStyleOptions['boundaryBox'],
    second: CityStyleOptions['boundaryBox'],
  ): boolean {
    if (!first || !second) return first === second;
    return first.west === second.west
      && first.south === second.south
      && first.east === second.east
      && first.north === second.north;
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

  private scheduleCameraEmit(): void {
    if (this.cameraTimer !== null) return;
    this.cameraTimer = window.setTimeout(() => {
      this.cameraTimer = null;
      this.emitCamera();
    }, 100);
  }

  private scheduleTileStats(): void {
    if (this.tileStatsTimer !== null) return;
    this.tileStatsTimer = window.setTimeout(() => {
      this.tileStatsTimer = null;
      this.emitTileStats();
    }, 100);
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

  private recordRenderedFrame(): void {
    this.renderedFrames += 1;
    const now = performance.now();
    const elapsed = now - this.fpsWindowStartedAt;
    if (elapsed < 1000) return;
    this.events.onFps?.(Math.round((this.renderedFrames * 1000) / elapsed));
    this.renderedFrames = 0;
    this.fpsWindowStartedAt = now;
  }
}
