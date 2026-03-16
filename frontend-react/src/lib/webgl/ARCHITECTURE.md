# Architecture: City-Scale Pure WebGL GIS Engine

This document outlines the refactoring of the simulation engine from Three.js to a custom, high-performance pure WebGL 2.0 implementation ("Guardian Engine v2.0.0").

## 🎯 Objectives
- **Zero Heavy Dependencies**: Remove Three.js to minimize bundle size and maximize low-level GPU control.
- **City-Scale Multi-Sourced Rendering**: Unify Raster (Image-based) and Vector (GeoJSON/Structured) data.
- **Tactical Layering**: Orthogonally process Terrain, Infrastructure, and Environmental layers.
- **Data-Driven 3D**: Use pixel intensity from encoded textures to determine building heights and material properties.

## 🧱 Engine Components

### 1. WebGL Infrastructure (`WebGLRenderer.ts`)
The core renderer wrapper for WebGL 2.0.
- **Program Management**: Switching between specific shaders for different layers.
- **Resource Lifecycle**: Efficient VBO/IBO management.
- **Coordinate Projection**: Custom Matrix mathematical logic for GIS-to-ClipSpace projection.

### 2. Layer Pipeline
Each layer is an independent entity with its own shaders and buffers:
- **TerrainLayer**: Renders the base mesh from DEM (Digital Elevation Model) data.
- **BuildingLayer**: Extrudes 3D volumes.
  - *Raster Mode*: Reads height/levels from a floor-count texture.
  - *Vector Mode*: Uses coordinates fetched from Overpass/OpenStreetMap.
- **RoadLayer**: Renders line-based or strip-based infrastructure.
- **ForestLayer**: Instanced rendering of vegetation points.

### 3. Data Decoders
- **ImageProcessor**: Decodes PNG/JPG intensity (R channel) into `levels` or `pavement_type`.
- **GeoJSONWorker**: Converts structured geospatial metadata into optimized interleaved vertex arrays.

## 🛠️ Implementation Strategy

### Phase 1: Engine Foundation
- Update `WebGLRenderer` with Texture support and Index Buffer management.
- Implement a GIS Math library for projection without Three.js objects.

### Phase 2: Layer Implementation
- **Terrain**: Direct DEM-to-Vertex mapping.
- **Buildings**: Geometry shader or CPU-side extrusion for better performance.
- **Raster Mapping**: Implement sampling logic in shaders to look up heights from "FloorIntensityMaps".

### Phase 3: Integration
- Replace `LandslideSimulation.tsx` with `GuardianCityHUD.tsx` (Pure WebGL).
- Bind `useSimulationsController` events directly to the WebGL state.

## 🎨 Visual Identity
- **Wireframe Tactical Overlay**: High-contrast blue/cyan outlines.
- **Depth-Encoded Fog**: Using raw GLSL fog calculations.
- **Scanline HUD**: Post-processing or per-object temporal effects.

---
*Created by Antigravity AI — Protecting the future with precise engineering.*
