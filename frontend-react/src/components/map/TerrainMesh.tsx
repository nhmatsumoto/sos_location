import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';
import { useSimulationStore } from '../../store/useSimulationStore';
import { projectTo3D } from '../../utils/projection';
import { gisApi } from '../../services/gisApi';

export const TerrainMesh: React.FC = () => {
  const { 
    satelliteTextureUrl, 
    box: simulationBox, 
    soilType, 
    soilSaturation,
    focalPoint,
    activeLayers
  } = useSimulationStore();

  const center = useMemo(() => {
    if (simulationBox) {
      return { lat: simulationBox.center[0], lon: simulationBox.center[1] };
    }
    if (focalPoint) {
      return { lat: focalPoint[0], lon: focalPoint[1] };
    }
    return { lat: -20.91, lon: -42.98 }; 
  }, [simulationBox, focalPoint]);

  const [centerX, centerZ] = useMemo(() => projectTo3D(center.lat, center.lon), [center]);
  
  const mapTextureUrl = 'https://basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}.png'; // Example map tile
  const currentTextureUrl = activeLayers.satellite ? (satelliteTextureUrl || 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}') : (activeLayers.map ? mapTextureUrl : null);

  const texture = useLoader(
    THREE.TextureLoader, 
    currentTextureUrl?.replace('{z}/{x}/{y}', '15/18585/11993') || 'https://basemaps.cartocdn.com/rastertiles/voyager_labels_under/0/0/0.png', // Placeholder URL replacement for useLoader
    (loader) => {
      loader.setCrossOrigin('anonymous');
    }
  );
  
  const segments = 127; // Use 127 to match 128x128 grid from API
  const [elevationGrid, setElevationGrid] = React.useState<number[][] | null>(null);

  // Fetch real SRTM Topography based on bounds
  React.useEffect(() => {
    const fetchTopography = async () => {
      try {
        let minLat, minLon, maxLat, maxLon;
        if (simulationBox) {
          const latDelta = (simulationBox.size[1] / 2) / 111320;
          const lonDelta = (simulationBox.size[0] / 2) / (40075000 * Math.cos(simulationBox.center[0] * Math.PI / 180) / 360);
          minLat = simulationBox.center[0] - latDelta;
          maxLat = simulationBox.center[0] + latDelta;
          minLon = simulationBox.center[1] - lonDelta;
          maxLon = simulationBox.center[1] + lonDelta;
        } else {
          minLat = center.lat - 0.01;
          maxLat = center.lat + 0.01;
          minLon = center.lon - 0.01;
          maxLon = center.lon + 0.01;
        }

        const grid = await gisApi.getElevationGrid(minLat, minLon, maxLat, maxLon, segments + 1);
        if (grid) setElevationGrid(grid);
      } catch (err) {
        console.error("Failed to load topography UI:", err);
      }
    };
    fetchTopography();
  }, [center, simulationBox]);

  const { geometry, wireframeGeometry } = useMemo(() => {
    // If no simulationBox is provided, default to a 2.25km square (22.5 units) because 0.02 degrees * 111.32 km = ~2.22km
    const width = simulationBox ? simulationBox.size[0] / 100 : 20;
    const height_len = simulationBox ? simulationBox.size[1] / 100 : 20;
    const geo = new THREE.PlaneGeometry(width, height_len, segments, segments);
    const vertices = geo.attributes.position.array as Float32Array;
    
    // Apply real Topography if available, otherwise fallback to procedural
    for (let i = 0, j = 0; i < vertices.length; i += 3, j++) {
      const x = vertices[i];
      const y = vertices[i + 1]; 
      
      let height = 0;
      if (elevationGrid && activeLayers.relief) {
        // Map 1D index to 2D grid
        const row = Math.floor(j / (segments + 1));
        const col = j % (segments + 1);
        
        // Ensure within bounds
        if (row < elevationGrid.length && col < elevationGrid[row].length) {
          // Fallback height from API is in meters, translate to 3D scale (1 unit = 100m)
          // Subtract the center height to normalize the terrain around Y=0
          const rawHeight = elevationGrid[row][col] / 100;
          const centerHeight = elevationGrid[Math.floor((segments+1)/2)][Math.floor((segments+1)/2)] / 100;
          height = rawHeight - centerHeight;
        }
      } else {
        // Procedural Fallback
        const h1 = Math.sin(x * 0.01) * Math.cos(y * 0.01) * 0.5;
        const h2 = Math.sin(x * 0.02) * Math.sin(y * 0.02) * 0.2;
        const h3 = (Math.random() - 0.5) * 0.02; 
        height = h1 + h2 + h3;
      }
      
      vertices[i + 2] = height;
    }
    
    geo.computeVertexNormals();
    return { 
      geometry: geo,
      wireframeGeometry: new THREE.WireframeGeometry(geo)
    };
  }, [centerX, centerZ, simulationBox, elevationGrid, center]);

  const terrainColor = useMemo(() => {
    if (satelliteTextureUrl) return "#ffffff";
    
    const color = new THREE.Color();
    if (soilType === 'clay') color.set("#2e1002"); // very dark amber
    else if (soilType === 'sandy') color.set("#2e1402");
    else if (soilType === 'rocky') color.set("#0f172a");
    else color.set("#020617"); // Dark slate (blends perfectly)
    
    // Darken based on saturation
    const darken = (soilSaturation / 100) * 0.4;
    color.multiplyScalar(1 - darken);
    
    return color;
  }, [soilType, satelliteTextureUrl, soilSaturation]);

    if (!activeLayers.relief && !activeLayers.satellite && !activeLayers.map) return null;

    return (
      <group rotation={[-Math.PI / 2, 0, 0]} position={[centerX, 0, centerZ]}>
        <mesh geometry={geometry} receiveShadow>
          <meshStandardMaterial 
            color={terrainColor} 
            map={(activeLayers.satellite || activeLayers.map) ? texture : null}
            roughness={0.9} 
            metalness={0.1 - (soilSaturation / 1000)}
            transparent
            opacity={0.8}
          />
        </mesh>
        
        {activeLayers.relief && (
          <>
            <lineSegments geometry={wireframeGeometry}>
              <lineBasicMaterial color="#06b6d4" transparent opacity={0.15} />
            </lineSegments>
            <points geometry={geometry}>
              <pointsMaterial size={0.03} color="#22d3ee" transparent opacity={0.2} />
            </points>
          </>
        )}
      </group>
    );
};
