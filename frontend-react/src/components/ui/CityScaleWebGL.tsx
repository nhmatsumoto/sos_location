import React, { useEffect, useRef } from 'react';
import { Box } from '@chakra-ui/react';
import type { UrbanSimulationResult } from '../../types';
import type { CityBlueprint } from '../../lib/blueprint/CityBlueprintTypes';
import { HydraEngine } from '../../lib/webgl/engine/HydraEngine';
import { TerrainLayer } from '../../lib/webgl/layers/TerrainLayer';
import { UrbanLayer } from '../../lib/webgl/layers/UrbanLayer';
import { WaterLayer } from '../../lib/webgl/layers/WaterLayer';
import { ParticleLayer } from '../../lib/webgl/layers/ParticleLayer';
import { CityMeshBuilder } from '../../lib/webgl/engine/CityMeshBuilder';
import { GeoDataPipeline } from '../../lib/geo/GeoDataPipeline';
import type { DisasterState } from '../../lib/webgl/physics/DisasterPhysics';

interface CityScaleWebGLProps {
  centerLat: number;
  centerLng: number;
  bbox?: [number, number, number, number];
  blueprint?: CityBlueprint;
  resultData?: UrbanSimulationResult;
  simData?: DisasterState;
  layers?: {
    satellite?: boolean;
    vegetation?: boolean;
    urban?: boolean;
    water?: boolean;
    disaster?: boolean;
  };
}

export const CityScaleWebGL: React.FC<CityScaleWebGLProps> = ({
  centerLat,
  bbox,
  blueprint,
  simData,
  layers = {}
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<HydraEngine | null>(null);
  const terrainRef = useRef<TerrainLayer | null>(null);
  const urbanRef = useRef<UrbanLayer | null>(null);
  const waterRef = useRef<WaterLayer | null>(null);
  const particlesRef = useRef<ParticleLayer | null>(null);

  const CM = 100;
  // Use metadata from blueprint if available, otherwise calculate from bbox or defaults
  const spanX = blueprint?.worldSpanX ?? (bbox ? Math.abs(bbox[3] - bbox[1]) * 111320 * Math.cos(centerLat * Math.PI / 180) : 5000);
  const spanZ = blueprint?.worldSpanZ ?? (bbox ? Math.abs(bbox[2] - bbox[0]) * 111320 : 5000);
  const worldSpanX = spanX * CM;
  const worldSpanZ = spanZ * CM;

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new HydraEngine(canvasRef.current);
    engineRef.current = engine;

    const terrain = new TerrainLayer(engine.getRenderer());
    const urban = new UrbanLayer(engine.getRenderer());
    const water = new WaterLayer(engine.getRenderer());
    const particles = new ParticleLayer(engine.getRenderer());

    engine.registerLayer(terrain);
    engine.registerLayer(urban);
    engine.registerLayer(water);
    engine.registerLayer(particles);

    terrainRef.current = terrain;
    urbanRef.current = urban;
    waterRef.current = water;
    particlesRef.current = particles;

    engine.start();
    return () => engine.dispose();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && engineRef.current) {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvasRef.current.getBoundingClientRect();
        canvasRef.current.width = rect.width * dpr;
        canvasRef.current.height = rect.height * dpr;
        engineRef.current.resize(canvasRef.current.width, canvasRef.current.height);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !engineRef.current) return;
    const camera = engineRef.current.getCamera();

    const onMouseDown = (e: MouseEvent) => { e.preventDefault(); camera.handleMouseDown(e); };
    const onMouseMove = (e: MouseEvent) => camera.handleMouseMove(e);
    const onMouseUp = () => camera.handleMouseUp();
    const onWheel = (e: WheelEvent) => { e.preventDefault(); camera.handleWheel(e.deltaY); };
    const onContextMenu = (e: MouseEvent) => e.preventDefault();
    const onKeyDown = (e: KeyboardEvent) => camera.keys.add(e.code);
    const onKeyUp = (e: KeyboardEvent) => camera.keys.delete(e.code);

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Update Geometry & State
  useEffect(() => {
    const engine = engineRef.current;
    if (!blueprint || !engine) return;

    if (terrainRef.current) {
      const terrainData = CityMeshBuilder.buildTerrain(blueprint, worldSpanX, worldSpanZ);
      terrainRef.current.updateGeometry(terrainData.vertices, terrainData.indices);
      
      const satEnabled = layers.satellite !== false;
      const fetchBbox = bbox || blueprint.bbox;
      GeoDataPipeline.fetch(fetchBbox[0], fetchBbox[1], fetchBbox[2], fetchBbox[3], satEnabled)
        .then(geoData => {
          if (geoData.mapCanvas && terrainRef.current) {
            const gl = engine.getRenderer().getContext();
            const tex = gl.createTexture()!;
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, geoData.mapCanvas);
            gl.generateMipmap(gl.TEXTURE_2D);
            terrainRef.current.setSatellite(tex, 0.85);
          }
        });
    }

    if (urbanRef.current) {
      const areaHalfX = worldSpanX / 2;
      const areaHalfZ = worldSpanZ / 2;
      urbanRef.current.updateBuildings(CityMeshBuilder.buildBuildings(blueprint, areaHalfX, areaHalfZ, worldSpanX, worldSpanZ));
    }

    if (particlesRef.current && simData) {
      const seeds = new Float32Array(50000 * 3);
      for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
      const type = simData.type === 'HURRICANE' ? 'RAIN' : (simData.type === 'BLIZZARD' ? 'SNOW' : 'NONE');
      particlesRef.current.update(seeds, type);
    }
  }, [blueprint, worldSpanX, worldSpanZ, simData, bbox, layers.satellite]);

  // Synchronize Disaster State
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setDisasterState(simData ? { ...simData, time: 0 } : null);
    }
  }, [simData]);

  return (
    <Box position="relative" w="100%" h="100%" overflow="hidden">
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </Box>
  );
};
