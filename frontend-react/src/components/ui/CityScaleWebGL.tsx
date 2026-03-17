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
    particles: boolean;
    streets: boolean;
    buildings: boolean;
    topography: boolean;
    vegetation: boolean;
    terrain: boolean;
    satellite: boolean;
    aiStructural: boolean;
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
  heightMapUrl = '/assets/gis/heightmap.png',
  topoMapUrl = '/assets/gis/heightmap.png',
  layers = { 
    particles: true, streets: true, buildings: true, 
    topography: true, vegetation: true, terrain: true,
    satellite: false, aiStructural: true 
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

    // --- BUFFERS ---
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

    // HIGHWAYS & WATERWAYS (Lines)
    const highwayVertices: number[] = [];
    if (resultData?.urbanFeatures?.highways) {
        resultData.urbanFeatures.highways.forEach((h: any) => {
            h.coordinates.forEach((c: [number, number], idx: number) => {
                const [x, z] = mapPos(c[0], c[1]);
                highwayVertices.push(x, 0, z);
                if (idx > 0 && idx < h.coordinates.length - 1) {
                    highwayVertices.push(x, 0, z); // Duplicate for gl.LINES
                }
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
                if (idx > 0 && idx < w.coordinates.length - 1) {
                    waterLineVertices.push(x, 0, z);
                }
            });
        });
    }
    const waterwayVBO = renderer.createBuffer(new Float32Array(waterLineVertices));

    // INFRASTRUCTURE (Buildings)
    const infraVertices: number[] = [];
    if (resultData?.urbanFeatures?.buildings && resultData.urbanFeatures.buildings.length > 0) {
        resultData.urbanFeatures.buildings.forEach((b: any) => {
           const [x, z] = mapPos(b.coordinates[0][0], b.coordinates[0][1]);
           const u = (x + 100) / 200;
           const v = (z + 100) / 200;
           infraVertices.push(x, 0, z, u, v);
           infraVertices.push(x, b.levels || 1, z, u, v);
        });
    } else {
        const buildGridSize = Math.floor(topoGridSize * 0.94);
        const density = (simData.urbanDensity || 50) / 100;
        for(let z = 0; z < buildGridSize; z++) {
            for(let x = 0; x < buildGridSize; x++) {
                const noise = Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1.0;
                if (noise > density) continue;
                const xPos = (x / buildGridSize) * 200 - 100;
                const zPos = (z / buildGridSize) * 200 - 100;
                infraVertices.push(xPos, 0, zPos, x / buildGridSize, z / buildGridSize);
                infraVertices.push(xPos, 1, zPos, x / buildGridSize, z / buildGridSize);
            }
        }
    }
    const infraVBO = renderer.createBuffer(new Float32Array(infraVertices));

    // Particles
    const particleCount = 100000;
    const particlesData: number[] = [];
    for(let i=0; i<particleCount; i++) particlesData.push(Math.random()*100-50, Math.random()*30, Math.random()*100-50);
    const particleVBO = renderer.createBuffer(new Float32Array(particlesData));

    let isMounted = true;
    
    // TEXTURES
    const createDataTexture = (grid: number[][]) => {
        const tex = gl.createTexture()!;
        const width = grid[0].length;
        const height = grid.length;
        const data = new Float32Array(width * height);
        for(let y=0; y<height; y++) for(let x=0; x<width; x++) data[y * width + x] = grid[y][x] / 100.0;
        
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, width, height, 0, gl.RED, gl.FLOAT, data);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
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
    const topoTexture = resultData?.elevationGrid ? createDataTexture(resultData.elevationGrid) : loadTexture(topoMapUrl);

    let frameId: number;
    let startTime = Date.now();

    const updateCamera = () => {
        // Compute relative eye position from angles for Orbit mode
        const orbitPos = [
            cam.current.target[0] + cam.current.distance * Math.cos(cam.current.pitch) * Math.sin(cam.current.yaw),
            cam.current.target[1] + cam.current.distance * Math.sin(cam.current.pitch),
            cam.current.target[2] + cam.current.distance * Math.cos(cam.current.pitch) * Math.cos(cam.current.yaw)
        ] as [number, number, number];
        
        cam.current.pos = orbitPos;

        // Optional: Maintain keyboard navigation if focused on fly mode
        const speed = cam.current.speed * (cam.current.distance * 0.01);
        const forward = GISMath.normalize(GISMath.subtract(cam.current.target, cam.current.pos));
        const right = GISMath.normalize(GISMath.cross([0, 1, 0], forward));

        if (cam.current.keys.has('KeyW')) { 
            cam.current.pos = GISMath.add(cam.current.pos, GISMath.scale(forward, speed)) as [number, number, number];
            cam.current.target = GISMath.add(cam.current.target, GISMath.scale(forward, speed)) as [number, number, number];
        }
        if (cam.current.keys.has('KeyS')) { 
            cam.current.pos = GISMath.add(cam.current.pos, GISMath.scale(forward, -speed)) as [number, number, number];
            cam.current.target = GISMath.add(cam.current.target, GISMath.scale(forward, -speed)) as [number, number, number];
        }
        if (cam.current.keys.has('KeyA')) { 
            cam.current.pos = GISMath.add(cam.current.pos, GISMath.scale(right, speed)) as [number, number, number];
            cam.current.target = GISMath.add(cam.current.target, GISMath.scale(right, speed)) as [number, number, number];
        }
        if (cam.current.keys.has('KeyD')) { 
            cam.current.pos = GISMath.add(cam.current.pos, GISMath.scale(right, -speed)) as [number, number, number];
            cam.current.target = GISMath.add(cam.current.target, GISMath.scale(right, -speed)) as [number, number, number];
        }
    };

    const render = () => {
      updateCamera();
      const time = (Date.now() - startTime) / 1000;
      if (!canvasRef.current) return;
      const { width, height } = canvasRef.current;
      renderer.setViewport(width, height);
      renderer.clear(0.04, 0.05, 0.08, 1.0);
      const aspect = width / height;
      const projectionMatrix = GISMath.perspective(45 * Math.PI / 180, aspect, 0.1, 3000);
      const viewMatrix = GISMath.lookAt(cam.current.pos, cam.current.target, [0, 1, 0]);
      const modelMatrix = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);

      // Soil Color based on geology
      const soilType = resultData?.soil?.type || "Clay";
      const soilColor = soilType.includes("Clay") ? [0.4, 0.2, 0.1] : [0.3, 0.3, 0.2];

      // 1. Terrain
      if (layers.terrain || layers.topography) {
        renderer.useProgram(terrainProgram);
        renderer.setUniformMatrix4('u_projectionMatrix', projectionMatrix);
        renderer.setUniformMatrix4('u_viewMatrix', viewMatrix);
        renderer.setUniformMatrix4('u_modelMatrix', modelMatrix);
        renderer.setUniform1f('u_topoScale', 35.0);
        renderer.setUniform3f('u_soilColor', soilColor[0], soilColor[1], soilColor[2]);
        renderer.bindTexture(topoTexture, 0);
        renderer.setUniform1i('u_topoMap', 0);
        renderer.setUniform1i('u_satelliteMode', layers.satellite ? 1 : 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, terrainVBO);
        renderer.setAttribute('a_position', 3, gl.FLOAT, false, 8 * 4, 0);
        renderer.setAttribute('a_normal', 3, gl.FLOAT, false, 8 * 4, 3 * 4);
        renderer.setAttribute('a_uv', 2, gl.FLOAT, false, 8 * 4, 6 * 4);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, terrainIBO);
        gl.drawElements(gl.TRIANGLES, terrainIndices.length, gl.UNSIGNED_SHORT, 0);
      }

      // 2. Highways & Waterways
      if (layers.streets && highwayVertices.length > 0) {
          renderer.useProgram(highwayProgram);
          renderer.setUniformMatrix4('u_projectionMatrix', projectionMatrix);
          renderer.setUniformMatrix4('u_viewMatrix', viewMatrix);
          renderer.setUniformMatrix4('u_modelMatrix', modelMatrix);
          renderer.setUniform1f('u_topoScale', 35.0);
          renderer.bindTexture(topoTexture, 0);
          renderer.setUniform1i('u_topoMap', 0);
          gl.bindBuffer(gl.ARRAY_BUFFER, highwayVBO);
          renderer.setAttribute('a_position', 3, gl.FLOAT, false, 3 * 4, 0);
          gl.drawArrays(gl.LINES, 0, highwayVertices.length / 3);
      }
      if (waterLineVertices.length > 0) {
          renderer.useProgram(waterwayProgram);
          renderer.setUniformMatrix4('u_projectionMatrix', projectionMatrix);
          renderer.setUniformMatrix4('u_viewMatrix', viewMatrix);
          renderer.setUniformMatrix4('u_modelMatrix', modelMatrix);
          renderer.setUniform1f('u_topoScale', 35.0);
          renderer.setUniform1f('u_time', time);
          renderer.bindTexture(topoTexture, 0);
          renderer.setUniform1i('u_topoMap', 0);
          gl.bindBuffer(gl.ARRAY_BUFFER, waterwayVBO);
          renderer.setAttribute('a_position', 3, gl.FLOAT, false, 3 * 4, 0);
          gl.drawArrays(gl.LINES, 0, waterLineVertices.length / 3);
      }

      // 3. Flood Water
      if (simData.type === 'FLOOD') {
        renderer.useProgram(waterProgram);
        renderer.setUniformMatrix4('u_projectionMatrix', projectionMatrix);
        renderer.setUniformMatrix4('u_viewMatrix', viewMatrix);
        renderer.setUniformMatrix4('u_modelMatrix', modelMatrix);
        renderer.setUniform1f('u_waterLevel', simData.waterLevel || 2.0);
        renderer.setUniform1f('u_topoScale', 35.0);
        renderer.setUniform1f('u_time', time);
        renderer.bindTexture(topoTexture, 0);
        renderer.setUniform1i('u_topoMap', 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, terrainVBO);
        renderer.setAttribute('a_position', 3, gl.FLOAT, false, 8 * 4, 0);
        renderer.setAttribute('a_uv', 2, gl.FLOAT, false, 8 * 4, 6 * 4);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, terrainIBO);
        gl.drawElements(gl.TRIANGLES, terrainIndices.length, gl.UNSIGNED_SHORT, 0);
      }

      // 4. Infrastructure
      if (layers.buildings) {
        renderer.useProgram(infraProgram);
        renderer.setUniformMatrix4('u_projectionMatrix', projectionMatrix);
        renderer.setUniformMatrix4('u_viewMatrix', viewMatrix);
        renderer.setUniformMatrix4('u_modelMatrix', modelMatrix);
        renderer.setUniform1f('u_heightScale', 2.5);
        renderer.setUniform1f('u_topoScale', 35.0);
        renderer.setUniform1f('u_urbanDensity', (simData.urbanDensity || 50) / 100);
        renderer.setUniform1f('u_time', time);
        renderer.setUniform1i('u_aiMode', layers.aiStructural ? 1 : 0);
        renderer.bindTexture(heightTexture, 0);
        renderer.setUniform1i('u_heightMap', 0);
        renderer.bindTexture(topoTexture, 1);
        renderer.setUniform1i('u_topoMap', 1);
        gl.bindBuffer(gl.ARRAY_BUFFER, infraVBO);
        renderer.setAttribute('a_position', 3, gl.FLOAT, false, 5 * 4, 0);
        renderer.setAttribute('a_texCoord', 2, gl.FLOAT, false, 5 * 4, 3 * 4);
        gl.drawArrays(gl.POINTS, 0, infraVertices.length / 5);
      }

      // 5. Particles & Vegetation
      if (layers.particles) {
        renderer.useProgram(particleProgram);
        renderer.setUniformMatrix4('u_projectionMatrix', projectionMatrix);
        renderer.setUniformMatrix4('u_viewMatrix', viewMatrix);
        renderer.setUniform1f('u_time', time);
        renderer.setUniform1i('u_type', simData.type === 'TORNADO' ? 1 : 0);
        
        // New: Atmospheric Physics
        renderer.setUniform1f('u_windSpeed', (simData as any).windSpeed || 10.0);
        renderer.setUniform1f('u_windDirection', (simData as any).windDirection || 0.0);
        renderer.setUniform1f('u_pressure', (simData as any).pressure || 1013.0);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, particleVBO);
        renderer.setAttribute('a_position', 3, gl.FLOAT, false, 3 * 4, 0);
        gl.drawArrays(gl.POINTS, 0, particleCount);
      }
      if (layers.vegetation) {
        renderer.useProgram(vegProgram);
        renderer.setUniformMatrix4('u_projectionMatrix', projectionMatrix);
        renderer.setUniformMatrix4('u_viewMatrix', viewMatrix);
        renderer.setUniformMatrix4('u_modelMatrix', modelMatrix);
        renderer.setUniform1f('u_urbanDensity', (simData.urbanDensity || 50) / 100);
        
        // New: Vegetation Data from GIS
        const vegDensity = resultData?.vegetation?.ndvi_mean || 0.4;
        renderer.setUniform1f('u_vegIntensity', vegDensity);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, infraVBO);
        renderer.setAttribute('a_position', 3, gl.FLOAT, false, 5 * 4, 0);
        renderer.setAttribute('a_uv', 2, gl.FLOAT, false, 5 * 4, 3 * 4);
        gl.drawArrays(gl.POINTS, 0, infraVertices.length / 5);
      }

      frameId = requestAnimationFrame(render);
    };

    frameId = requestAnimationFrame(render);
    return () => {
      isMounted = false;
      cancelAnimationFrame(frameId);
      gl.deleteBuffer(terrainVBO); gl.deleteBuffer(terrainIBO); gl.deleteBuffer(infraVBO); gl.deleteBuffer(particleVBO);
      gl.deleteBuffer(highwayVBO); gl.deleteBuffer(waterwayVBO);
      gl.deleteTexture(heightTexture); gl.deleteTexture(topoTexture);
      gl.deleteProgram(terrainProgram); gl.deleteProgram(infraProgram); gl.deleteProgram(vegProgram); gl.deleteProgram(waterProgram);
      gl.deleteProgram(particleProgram); gl.deleteProgram(highwayProgram); gl.deleteProgram(waterwayProgram);
    };
  }, [centerLat, centerLng, heightMapUrl, topoMapUrl, layers, simData, resultData]);

  return (
    <Box w="full" h="full" bg="#030508" overflow="hidden" cursor="crosshair">
      <canvas 
        ref={canvasRef} 
        style={{ width: '100%', height: '100%', display: 'block' }} 
        width={window.innerWidth * window.devicePixelRatio} 
        height={window.innerHeight * window.devicePixelRatio} 
      />
    </Box>
  );
};
