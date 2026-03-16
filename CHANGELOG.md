# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-03-16

### Added
- **Guardian Engine v3.5 (City-Scale WebGL)**: Pure WebGL 2.0 implementation for city-scale GIS rendering.
- **Raster-to-3D Extrusion**: Image intensity-driven building height processing.
- **Layered GIS Rendering**: Separate Terrain, Infrastructure, and Vegetation layers.
- **Volunteer Task Management**: Backend and frontend modules for mission coordination.
- **Asset Prefetching**: Proactive module loading for optimized first-contentful paint.
- **GIS Caching**: IndexedDB integration for offline-first spatial data.

### Changed
- **UI System**: Upgraded to Guardian Design System with tático HUD layouts across all modules.
- **Simulation Engine**: Replaced Three.js with a custom low-level GPU renderer.
- **Branding**: Official transition to "The Guardian Beacon" project identity.

### Fixed
- Multiple TypeScript strict-mode compilation errors.
- Docker build stability and container health checks.
- SignalR real-time stream connectivity for simulations.
