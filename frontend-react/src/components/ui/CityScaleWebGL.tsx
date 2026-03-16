import React, { useEffect, useRef } from 'react';
import { Box } from '@chakra-ui/react';
import { WebGLRenderer } from '../../lib/webgl/WebGLRenderer';
import { GISMath } from '../../lib/webgl/GISMath';
import { 
  CITY_TERRAIN_VS, CITY_TERRAIN_FS, 
  INFRASTRUCTURE_VS, INFRASTRUCTURE_FS,
  VEGETATION_VS, VEGETATION_FS
} from '../../lib/webgl/shaders/cityShaders';

interface CityScaleWebGLProps {
  centerLat: number;
  centerLng: number;
  heightMapUrl?: string; // Image where intensity = floors
}

/**
 * Guardian Pure WebGL Engine v2.0.0
 * Renders city-scale GIS data in layers without Three.js.
 */
export const CityScaleWebGL: React.FC<CityScaleWebGLProps> = ({ 
  centerLat, 
  centerLng, 
  heightMapUrl = 'https://api.soslocation.org/v1/gis/mock-heightmap.png' 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);

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

    // --- TERRAIN BUFFER (Grid) ---
    const terrainVertices = new Float32Array([
      -50, 0, -50,  0, 1, 0,  0, 0,
       50, 0, -50,  0, 1, 0,  1, 0,
      -50, 0,  50,  0, 1, 0,  0, 1,
       50, 0,  50,  0, 1, 0,  1, 1,
    ]);
    const terrainIndices = new Uint16Array([0, 1, 2, 2, 1, 3]);
    const terrainVBO = renderer.createBuffer(terrainVertices);
    const terrainIBO = renderer.createBuffer(terrainIndices, gl.ELEMENT_ARRAY_BUFFER);

    // --- INFRASTRUCTURE BUFFER (Instanced or Dense Mesh) ---
    // For simplicity in this version, we use a dense grid and the shader extrudes based on texture
    const gridDiv = 100;
    const infraVertices: number[] = [];
    
    for(let z = 0; z < gridDiv; z++) {
        for(let x = 0; x < gridDiv; x++) {
            const xPos = (x / gridDiv) * 100 - 50;
            const zPos = (z / gridDiv) * 100 - 50;
            const u = x / gridDiv;
            const v = z / gridDiv;
            
            // Bottom face
            infraVertices.push(xPos, 0, zPos, u, v);
            // Top face (Logic in shader will move this Y based on texture)
            infraVertices.push(xPos, 1, zPos, u, v);
        }
    }

    const infraVBO = renderer.createBuffer(new Float32Array(infraVertices));

    // --- HEIGHTMAP TEXTURE ---
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = heightMapUrl;
    let heightTexture: WebGLTexture | null = null;
    image.onload = () => {
        heightTexture = renderer.createTexture(image);
    };

    let frameId: number;
    const render = (_time: number) => {
      if (!canvasRef.current) return;
      const { width, height } = canvasRef.current;
      renderer.setViewport(width, height);
      renderer.clear(0.06, 0.09, 0.16, 1.0);

      const aspect = width / height;
      const projectionMatrix = GISMath.perspective(45 * Math.PI / 180, aspect, 0.1, 1000);
      const viewMatrix = GISMath.lookAt([40, 40, 40], [0, 0, 0], [0, 1, 0]);
      const modelMatrix = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);

      // 1. Draw Terrain
      renderer.useProgram(terrainProgram);
      renderer.setUniformMatrix4('u_projectionMatrix', projectionMatrix);
      renderer.setUniformMatrix4('u_viewMatrix', viewMatrix);
      renderer.setUniformMatrix4('u_modelMatrix', modelMatrix);
      
      gl.bindBuffer(gl.ARRAY_BUFFER, terrainVBO);
      renderer.setAttribute('a_position', 3, gl.FLOAT, false, 8 * 4, 0);
      renderer.setAttribute('a_normal', 3, gl.FLOAT, false, 8 * 4, 3 * 4);
      renderer.setAttribute('a_uv', 2, gl.FLOAT, false, 8 * 4, 6 * 4);
      
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, terrainIBO);
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

      // 2. Draw Infrastructure
      if (heightTexture) {
        renderer.useProgram(infraProgram);
        renderer.setUniformMatrix4('u_projectionMatrix', projectionMatrix);
        renderer.setUniformMatrix4('u_viewMatrix', viewMatrix);
        renderer.setUniformMatrix4('u_modelMatrix', modelMatrix);
        renderer.setUniform1f('u_heightScale', 0.5);
        renderer.setUniform1i('u_heightMap', 0);
        renderer.bindTexture(heightTexture, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, infraVBO);
        renderer.setAttribute('a_position', 3, gl.FLOAT, false, 5 * 4, 0);
        renderer.setAttribute('a_texCoord', 2, gl.FLOAT, false, 5 * 4, 3 * 4);
        
        // Render as points or thin segments for high-density "city" feel
        gl.drawArrays(gl.POINTS, 0, infraVertices.length / 5);
      }

      // 3. Draw Vegetation
      renderer.useProgram(vegProgram);
      renderer.setUniformMatrix4('u_projectionMatrix', projectionMatrix);
      renderer.setUniformMatrix4('u_viewMatrix', viewMatrix);
      renderer.setUniformMatrix4('u_modelMatrix', modelMatrix);
      
      gl.bindBuffer(gl.ARRAY_BUFFER, infraVBO); // Reuse same spatial grid for veg
      renderer.setAttribute('a_position', 3, gl.FLOAT, false, 5 * 4, 0);
      renderer.setAttribute('a_uv', 2, gl.FLOAT, false, 5 * 4, 3 * 4);
      gl.drawArrays(gl.POINTS, 0, infraVertices.length / 5);

      // 4. Draw Roads (Tactical Overlay)
      renderer.useProgram(terrainProgram); // Reuse terrain shader for roads (diff color)
      renderer.setUniformMatrix4('u_projectionMatrix', projectionMatrix);
      renderer.setUniformMatrix4('u_viewMatrix', viewMatrix);
      renderer.setUniformMatrix4('u_modelMatrix', modelMatrix);
      
      gl.bindBuffer(gl.ARRAY_BUFFER, terrainVBO);
      gl.drawElements(gl.LINES, 6, gl.UNSIGNED_SHORT, 0); 

      frameId = requestAnimationFrame(render);
    };

    frameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frameId);
  }, [centerLat, centerLng, heightMapUrl]);

  return (
    <Box w="full" h="full" bg="black" borderRadius="xl" overflow="hidden">
      <canvas 
        ref={canvasRef} 
        style={{ width: '100%', height: '100%', display: 'block' }} 
        width={1024} 
        height={768} 
      />
    </Box>
  );
};
