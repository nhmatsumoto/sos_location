import React, { useEffect, useRef } from 'react';
import { Box } from '@chakra-ui/react';
import { WebGLRenderer } from '../../lib/webgl/WebGLRenderer';
import { GISMath } from '../../lib/webgl/GISMath';
import { 
  CITY_TERRAIN_VS, CITY_TERRAIN_FS, 
  INFRASTRUCTURE_VS, INFRASTRUCTURE_FS,
  VEGETATION_VS, VEGETATION_FS,
  WATER_VS, WATER_FS,
  PARTICLE_VS, PARTICLE_FS,
  HIGHWAY_VS, HIGHWAY_FS,
  WATERWAY_VS, WATERWAY_FS
} from '../../lib/webgl/shaders/cityShaders';

interface CityScaleWebGLProps {
  centerLat: number;
  centerLng: number;
  heightMapUrl?: string; 
  topoMapUrl?: string;   
  layers?: {
    particles?: boolean;
    streets?: boolean;
    buildings?: boolean;
    topography?: boolean;
    vegetation?: boolean;
    terrain?: boolean;
    satellite?: boolean;
    aiStructural?: boolean;
    polygons?: boolean;
  };
  simData?: {
    type: string;
    waterLevel: number;
    intensity: number;
    duration: number;
    pressure: number;
    precipitation: number;
    resolution?: number;
    urbanDensity?: number;
  };
  resultData?: any; // New: Full GIS payload from backend
}

export const CityScaleWebGL: React.FC<CityScaleWebGLProps> = ({ 
  centerLat, 
  centerLng, 
  heightMapUrl: propHeightMapUrl,
  topoMapUrl: propTopoMapUrl,
  layers = { 
    particles: true, streets: true, buildings: true, 
    topography: true, vegetation: true, terrain: true,
    satellite: false, aiStructural: true, polygons: true 
  },
  simData = { 
    type: 'FLOOD', 
    waterLevel: 0, 
    intensity: 50, 
    duration: 60, 
    pressure: 1013, 
    precipitation: 0,
    resolution: 128,
    urbanDensity: 50
  },
  resultData
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  
  // Dynamic GIS Assets based on current selection
  const bbox = resultData?.bbox || [centerLat - 0.02, centerLng - 0.02, centerLat + 0.02, centerLng + 0.02];
  const dynamicHeightmap = `/api/v1/terrain/heightmap?north=${bbox[2]}&south=${bbox[0]}&east=${bbox[3]}&west=${bbox[1]}`;
  const dynamicSatellite = `/api/v1/terrain/satellite?north=${bbox[2]}&south=${bbox[0]}&east=${bbox[3]}&west=${bbox[1]}`;
  
  const heightMapUrl = propHeightMapUrl || dynamicHeightmap;
  const topoMapUrl = propTopoMapUrl || '/assets/gis/heightmap.png';
  const satelliteMapUrl = dynamicSatellite;

  const [buildingCount, setBuildingCount] = React.useState(0);
  const [dataReady, setDataReady] = React.useState(false);

  // Camera State
  const cam = useRef({
    pos: [120, 100, 120] as [number, number, number],
    target: [0, 0, 0] as [number, number, number],
    distance: 250,
    yaw: -Math.PI / 4,
    pitch: -Math.PI / 6,
    speed: 1.5,
    keys: new Set<string>()
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        cam.current.keys.add(e.code);
        
        // Blender-style Focus (Numpad . or Period)
        if (e.code === 'NumpadDecimal' || e.code === 'Period') {
            cam.current.target = [0, 0, 0];
            cam.current.distance = 250;
        }
    };
    const handleKeyUp = (e: KeyboardEvent) => cam.current.keys.delete(e.code);
    
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;

    const handleMouseDown = (e: MouseEvent) => {
        isDragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
        
        // Prevent browser auto-scroll on MMB
        if (e.button === 1) e.preventDefault();
    };
    const handleMouseUp = () => isDragging = false;

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;

        // Middle Mouse (button 1) Orbit / Pan logic
        if (e.button === 1 || e.which === 2) {
            if (e.shiftKey) {
                // Blender-style Pan (Shift + MMB)
                const right = GISMath.normalize(GISMath.cross([0, 1, 0], GISMath.subtract(cam.current.pos, cam.current.target)));
                const up = GISMath.normalize(GISMath.cross(GISMath.subtract(cam.current.pos, cam.current.target), right));
                
                const factor = cam.current.distance * 0.001;
                const moveX = GISMath.scale(right, -dx * factor);
                const moveY = GISMath.scale(up, dy * factor);
                
                cam.current.target = GISMath.add(cam.current.target, GISMath.add(moveX, moveY)) as [number, number, number];
            } else {
                // Blender-style Orbit (MMB)
                cam.current.yaw -= dx * 0.005;
                cam.current.pitch = Math.max(-1.5, Math.min(1.5, cam.current.pitch - dy * 0.005));
            }
        } 
        // Legacy drag if someone doesn't have a middle mouse
        else if (e.button === 0) {
            cam.current.yaw -= dx * 0.005;
            cam.current.pitch = Math.max(-1.5, Math.min(1.5, cam.current.pitch - dy * 0.005));
        }
    };

    const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY * 0.1;
        cam.current.distance = Math.max(5, Math.min(1500, cam.current.distance + delta));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        window.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('wheel', handleWheel);
    };
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    
    const renderer = new WebGLRenderer(canvasRef.current);
    rendererRef.current = renderer;

    const gl = renderer.getContext();
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Programs
    const terrainProgram = renderer.createProgram(CITY_TERRAIN_VS, CITY_TERRAIN_FS);
    const infraProgram = renderer.createProgram(INFRASTRUCTURE_VS, INFRASTRUCTURE_FS);
    const vegProgram = renderer.createProgram(VEGETATION_VS, VEGETATION_FS);
    const waterProgram = renderer.createProgram(WATER_VS, WATER_FS);
    const particleProgram = renderer.createProgram(PARTICLE_VS, PARTICLE_FS);
    const highwayProgram = renderer.createProgram(HIGHWAY_VS, HIGHWAY_FS);
    const waterwayProgram = renderer.createProgram(WATERWAY_VS, WATERWAY_FS);

    // --- GEOGRAPHY MAPPING HELPERS ---
    const bbox = resultData?.bbox || [centerLat - 0.02, centerLng - 0.02, centerLat + 0.02, centerLng + 0.02];
    const mapPos = (lat: number, lng: number) => {
        const x = ((lng - bbox[1]) / (bbox[3] - bbox[1])) * 200 - 100;
        const z = ((lat - bbox[0]) / (bbox[2] - bbox[0])) * 200 - 100;
        return [x, z];
    };

    // --- BUFFERS (GEOMETRY) ---
    const topoGridSize = simData.resolution || 128;
    const terrainVertices: number[] = [];
    const terrainIndices: number[] = [];

    for (let z = 0; z <= topoGridSize; z++) {
      for (let x = 0; x <= topoGridSize; x++) {
        const xPos = (x / topoGridSize) * 200 - 100;
        const zPos = (z / topoGridSize) * 200 - 100;
        terrainVertices.push(xPos, 0, zPos, 0, 1, 0, x / topoGridSize, z / topoGridSize);
      }
    }

    for (let z = 0; z < topoGridSize; z++) {
      for (let x = 0; x < topoGridSize; x++) {
        const i = z * (topoGridSize + 1) + x;
        terrainIndices.push(i, i + 1, i + topoGridSize + 1);
        terrainIndices.push(i + 1, i + topoGridSize + 2, i + topoGridSize + 1);
      }
    }

    const terrainVBO = renderer.createBuffer(new Float32Array(terrainVertices));
    const terrainIBO = renderer.createBuffer(new Uint16Array(terrainIndices), gl.ELEMENT_ARRAY_BUFFER);

    // HIGHWAYS & WATERWAYS (Linear Overlay)
    const highwayVertices: number[] = [];
    if (resultData?.urbanFeatures?.highways) {
        resultData.urbanFeatures.highways.forEach((h: any) => {
            h.coordinates.forEach((c: [number, number], idx: number) => {
                const [x, z] = mapPos(c[0], c[1]);
                highwayVertices.push(x, 0, z);
                if (idx > 0 && idx < h.coordinates.length - 1) highwayVertices.push(x, 0, z);
            });
        });
    }
    const highwayVBO = renderer.createBuffer(new Float32Array(highwayVertices));

    const waterLineVertices: number[] = [];
    if (resultData?.urbanFeatures?.waterways) {
        resultData.urbanFeatures.waterways.forEach((w: any) => {
            w.coordinates.forEach((c: [number, number], idx: number) => {
                const [x, z] = mapPos(c[0], c[1]);
                waterLineVertices.push(x, 0, z);
                if (idx > 0 && idx < w.coordinates.length - 1) waterLineVertices.push(x, 0, z);
            });
        });
    }
    const waterwayVBO = renderer.createBuffer(new Float32Array(waterLineVertices));

    // INFRASTRUCTURE (INSTANCED)
    // Unit Cube: 30 vertices (5 faces, no bottom)
    const unitCube = new Float32Array([
      -0.5,0,0.5, 0.5,0,0.5, 0.5,1,0.5, -0.5,0,0.5, 0.5,1,0.5, -0.5,1,0.5, // Front
      -0.5,0,-0.5, -0.5,1,-0.5, 0.5,1,-0.5, -0.5,0,-0.5, 0.5,1,-0.5, 0.5,0,-0.5, // Back
      -0.5,1,0.5, -0.5,1,-0.5, 0.5,1,-0.5, -0.5,1,0.5, 0.5,1,-0.5, 0.5,1,0.5, // Top
      -0.5,0,-0.5, -0.5,0,0.5, -0.5,1,0.5, -0.5,0,-0.5, -0.5,1,0.5, -0.5,1,-0.5, // Left
       0.5,0,-0.5,  0.5,1,-0.5, 0.5,1,0.5,  0.5,0,-0.5, 0.5,1,0.5,  0.5,0,0.5  // Right
    ]);
    const cubeVBO = renderer.createBuffer(unitCube);

    const instances: number[] = [];
    const maxLevels = 35; 
    const buildHScale = 0.8;

    if (resultData?.urbanFeatures?.buildings?.length > 0) {
        resultData.urbanFeatures.buildings.forEach((b: any) => {
            const [x, z] = mapPos(b.coordinates[0][0], b.coordinates[0][1]);
            const levels = Math.min(maxLevels, b.levels || 1);
            instances.push(x, z, levels * buildHScale, levels);
        });
    } else {
        const grid = 48; // Faster synthetic generation
        for(let z=0; z<grid; z++) for(let x=0; x<grid; x++) {
            const noise = Math.abs(Math.sin(x*12.98 + z*78.23)*43758.54)%1.0;
            if (noise > (simData.urbanDensity/100)) continue;
            const h = 1.0 + noise * 12.0;
            instances.push((x/grid)*200-100, (z/grid)*200-100, h, h/buildHScale);
        }
    }
    const instanceVBO = renderer.createBuffer(new Float32Array(instances));
    const count = instances.length / 4;
    
    // Track stats without triggering re-render if identical
    setBuildingCount(prev => prev !== count ? count : prev);
    setDataReady(!!resultData);

    // PARTICLES (OPTIMIZED)
    const particleCount = 60000;
    const pData = new Float32Array(particleCount * 3);
    for(let i=0; i<pData.length; i+=3) {
        pData[i] = Math.random()*200-100;
        pData[i+1] = Math.random()*50;
        pData[i+2] = Math.random()*200-100;
    }
    const particleVBO = renderer.createBuffer(pData);

    let isMounted = true;
    
    // TEXTURES
    const createDataTexture = (grid: number[][]) => {
        const tex = gl.createTexture()!;
        const h = grid.length;
        const w = grid[0].length;
        const data = new Float32Array(w * h);
        for(let y=0; y<h; y++) for(let x=0; x<w; x++) data[y * w + x] = grid[y][x] / 100.0;
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, w, h, 0, gl.RED, gl.FLOAT, data);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        return tex;
    };

    const loadTexture = (url: string) => {
      const tex = gl.createTexture()!;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = url;
      img.onload = () => {
        if (!isMounted) return;
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      };
      return tex;
    };

    const heightTexture = loadTexture(heightMapUrl);
    const satelliteTexture = loadTexture(satelliteMapUrl);
    const topoTexture = (resultData?.elevationGrid && resultData.elevationGrid.length > 0) 
        ? createDataTexture(resultData.elevationGrid) 
        : loadTexture(topoMapUrl);

    let frameId: number;
    let startTime = Date.now();

    const render = () => {
      if (!isMounted || !canvasRef.current) return;
      
      const time = (Date.now() - startTime) / 1000;
      const reveal = Math.min(1.0, time / 2.0); 

      // 1. Update Camera (Movement & Orbit)
      if (cam.current.keys.size > 0) {
        const moveSpeed = cam.current.speed * (cam.current.distance * 0.004);
        const forward = GISMath.normalize(GISMath.subtract(cam.current.target, cam.current.pos));
        const right = GISMath.normalize(GISMath.cross([0, 1, 0], forward));
        
        if (cam.current.keys.has('KeyW')) cam.current.target = GISMath.add(cam.current.target, GISMath.scale(forward, moveSpeed)) as any;
        if (cam.current.keys.has('KeyS')) cam.current.target = GISMath.add(cam.current.target, GISMath.scale(forward, -moveSpeed)) as any;
        if (cam.current.keys.has('KeyA')) cam.current.target = GISMath.add(cam.current.target, GISMath.scale(right, moveSpeed)) as any;
        if (cam.current.keys.has('KeyD')) cam.current.target = GISMath.add(cam.current.target, GISMath.scale(right, -moveSpeed)) as any;
      }

      const orbitPos = [
          cam.current.target[0] + cam.current.distance * Math.cos(cam.current.pitch) * Math.sin(cam.current.yaw),
          cam.current.target[1] + cam.current.distance * Math.sin(cam.current.pitch),
          cam.current.target[2] + cam.current.distance * Math.cos(cam.current.pitch) * Math.cos(cam.current.yaw)
      ] as [number, number, number];
      cam.current.pos = orbitPos;

      const { width, height } = canvasRef.current;
      renderer.setViewport(width, height);
      renderer.clear(0.01, 0.02, 0.04, 1.0);
      
      const projectionMatrix = GISMath.perspective(45 * Math.PI / 180, width/height, 0.1, 5000);
      const viewMatrix = GISMath.lookAt(cam.current.pos, cam.current.target, [0, 1, 0]);
      const modelMatrix = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);

      const soilType = resultData?.soil?.type || "Clay";
      const soilColor = soilType.includes("Clay") ? [0.35, 0.15, 0.08] : [0.25, 0.25, 0.18];

      // Layer Rendering
      if (layers.terrain) {
        renderer.useProgram(terrainProgram);
        renderer.setUniformMatrix4('u_projectionMatrix', projectionMatrix);
        renderer.setUniformMatrix4('u_viewMatrix', viewMatrix);
        renderer.setUniformMatrix4('u_modelMatrix', modelMatrix);
        renderer.setUniform1f('u_topoScale', 40.0);
        renderer.setUniform1f('u_reveal', reveal);
        renderer.setUniform3f('u_soilColor', soilColor[0], soilColor[1], soilColor[2]);
        renderer.bindTexture(topoTexture, 0);
        renderer.setUniform1i('u_topoMap', 0);
        renderer.setUniform1i('u_satelliteMode', layers.satellite ? 1 : 0);
        renderer.bindTexture(satelliteTexture, 3);
        renderer.setUniform1i('u_satelliteMap', 3);
        gl.bindBuffer(gl.ARRAY_BUFFER, terrainVBO);
        renderer.setAttribute('a_position', 3, gl.FLOAT, false, 8 * 4, 0);
        renderer.setAttribute('a_normal', 3, gl.FLOAT, false, 8 * 4, 3 * 4);
        renderer.setAttribute('a_uv', 2, gl.FLOAT, false, 8 * 4, 6 * 4);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, terrainIBO);
        gl.drawElements(gl.TRIANGLES, terrainIndices.length, gl.UNSIGNED_SHORT, 0);
      }

      if (layers.buildings) {
        renderer.useProgram(infraProgram);
        renderer.setUniformMatrix4('u_projectionMatrix', projectionMatrix);
        renderer.setUniformMatrix4('u_viewMatrix', viewMatrix);
        renderer.setUniformMatrix4('u_modelMatrix', modelMatrix);
        renderer.setUniform1f('u_topoScale', 40.0);
        renderer.setUniform1f('u_time', time);
        renderer.setUniform1f('u_reveal', reveal);
        renderer.setUniform1i('u_aiMode', layers.aiStructural ? 1 : 0);
        renderer.bindTexture(topoTexture, 1);
        renderer.setUniform1i('u_topoMap', 1);

        gl.bindBuffer(gl.ARRAY_BUFFER, cubeVBO);
        renderer.setAttribute('a_position', 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, instanceVBO);
        renderer.setAttribute('a_instanceData', 4, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(renderer.getAttribLocation('a_instanceData'), 1);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 30, count);
        gl.vertexAttribDivisor(renderer.getAttribLocation('a_instanceData'), 0);
      }

      if (layers.streets && highwayVertices.length > 0) {
          renderer.useProgram(highwayProgram);
          renderer.setUniformMatrix4('u_projectionMatrix', projectionMatrix);
          renderer.setUniformMatrix4('u_viewMatrix', viewMatrix);
          renderer.setUniformMatrix4('u_modelMatrix', modelMatrix);
          renderer.setUniform1f('u_topoScale', 40.0);
          renderer.setUniform1f('u_reveal', reveal);
          renderer.bindTexture(topoTexture, 0);
          renderer.setUniform1i('u_topoMap', 0);
          gl.bindBuffer(gl.ARRAY_BUFFER, highwayVBO);
          renderer.setAttribute('a_position', 3, gl.FLOAT, false, 0, 0);
          gl.drawArrays(gl.LINES, 0, highwayVertices.length / 3);
      }

      if (simData.type === 'FLOOD') {
        renderer.useProgram(waterProgram);
        renderer.setUniformMatrix4('u_projectionMatrix', projectionMatrix);
        renderer.setUniformMatrix4('u_viewMatrix', viewMatrix);
        renderer.setUniformMatrix4('u_modelMatrix', modelMatrix);
        renderer.setUniform1f('u_waterLevel', simData.waterLevel);
        renderer.setUniform1f('u_topoScale', 40.0);
        renderer.setUniform1f('u_time', time);
        renderer.setUniform1f('u_reveal', reveal);
        renderer.bindTexture(topoTexture, 0);
        renderer.setUniform1i('u_topoMap', 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, terrainVBO);
        renderer.setAttribute('a_position', 3, gl.FLOAT, false, 8 * 4, 0);
        renderer.setAttribute('a_uv', 2, gl.FLOAT, false, 8 * 4, 6 * 4);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, terrainIBO);
        gl.drawElements(gl.TRIANGLES, terrainIndices.length, gl.UNSIGNED_SHORT, 0);
      }

      if (layers.particles) {
        renderer.useProgram(particleProgram);
        renderer.setUniformMatrix4('u_projectionMatrix', projectionMatrix);
        renderer.setUniformMatrix4('u_viewMatrix', viewMatrix);
        renderer.setUniform1f('u_time', time);
        renderer.setUniform1f('u_reveal', reveal);
        renderer.setUniform1i('u_type', simData.type === 'TORNADO' ? 1 : 0);
        renderer.setUniform1f('u_windSpeed', (simData as any).windSpeed || 10.0);
        renderer.setUniform1f('u_windDirection', (simData as any).windDirection || 0.0);
        renderer.setUniform1f('u_pressure', (simData as any).pressure || 1013.0);
        gl.bindBuffer(gl.ARRAY_BUFFER, particleVBO);
        renderer.setAttribute('a_position', 3, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.POINTS, 0, particleCount);
      }

      if (layers.vegetation) {
        renderer.useProgram(vegProgram);
        renderer.setUniformMatrix4('u_projectionMatrix', projectionMatrix);
        renderer.setUniformMatrix4('u_viewMatrix', viewMatrix);
        renderer.setUniformMatrix4('u_modelMatrix', modelMatrix);
        renderer.setUniform1f('u_vegIntensity', (simData as any).intensity / 100.0);
        renderer.setUniform1f('u_reveal', reveal);
        gl.bindBuffer(gl.ARRAY_BUFFER, terrainVBO);
        renderer.setAttribute('a_position', 3, gl.FLOAT, false, 8 * 4, 0);
        renderer.setAttribute('a_uv', 2, gl.FLOAT, false, 8 * 4, 6 * 4);
        gl.drawArrays(gl.POINTS, 0, terrainVertices.length / 8);
      }

      frameId = requestAnimationFrame(render);
    };

    frameId = requestAnimationFrame(render);
    return () => {
      isMounted = false;
      cancelAnimationFrame(frameId);
      gl.deleteBuffer(terrainVBO); gl.deleteBuffer(terrainIBO); gl.deleteBuffer(instanceVBO); gl.deleteBuffer(cubeVBO);
      gl.deleteBuffer(particleVBO); gl.deleteBuffer(highwayVBO); gl.deleteBuffer(waterwayVBO);
      gl.deleteTexture(heightTexture); gl.deleteTexture(topoTexture); gl.deleteTexture(satelliteTexture);
      gl.deleteProgram(terrainProgram); gl.deleteProgram(infraProgram); gl.deleteProgram(vegProgram); gl.deleteProgram(waterProgram);
      gl.deleteProgram(particleProgram); gl.deleteProgram(highwayProgram); gl.deleteProgram(waterwayProgram);
    };
  }, [centerLat, centerLng, JSON.stringify(layers), JSON.stringify(simData), resultData, heightMapUrl, topoMapUrl, satelliteMapUrl]);

  return (
    <Box w="full" h="full" bg="#030508" overflow="hidden" cursor="crosshair" position="relative">
      {/* Simulation Info Overlay */}
      <Box 
        position="absolute" top={4} left={4} zIndex={10} 
        bg="rgba(0,10,20,0.7)" p={3} borderRadius="md" 
        border="1px solid rgba(0,255,255,0.2)" backdropFilter="blur(8px)"
        fontFamily="monospace" pointerEvents="none"
      >
        <div style={{ color: '#00ffff', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
          HYDRA CORE v3.5 // CONTEXT_ENGINE
        </div>
        <div style={{ color: '#fff', fontSize: '10px', opacity: 0.8 }}>
          LOC: {centerLat.toFixed(4)}, {centerLng.toFixed(4)}<br/>
          DATA: {dataReady ? 'DYNAMIC_GIS_READY' : 'STATIC_ASSET_MODE'}<br/>
          OBJECTS: {buildingCount} UNITS<br/>
          ATMOS: {simData.pressure} hPa // {simData.intensity}%
        </div>
      </Box>

      <canvas 
        ref={canvasRef} 
        style={{ width: '100%', height: '100%', display: 'block' }} 
        width={window.innerWidth * window.devicePixelRatio} 
        height={window.innerHeight * window.devicePixelRatio} 
      />
    </Box>
  );
};
