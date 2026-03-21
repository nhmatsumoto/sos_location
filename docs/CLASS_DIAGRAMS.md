# SOS Location — Diagramas de Classe

> Versão: 1.0 | Data: 2026-03-22

---

## 1. Domain Layer — Aggregates e Entities

```mermaid
classDiagram
    class Incident {
        +Guid Id
        +string Title
        +string Description
        +IncidentType Type
        +IncidentStatus Status
        +GeoPoint Location
        +DateTime OccurredAt
        +DateTime? ClosedAt
        +List~Alert~ Alerts
        +List~SearchArea~ SearchAreas
        +List~Campaign~ Campaigns
        +AddAlert(alert) void
        +Close() void
        +UpdateStatus(status) void
    }

    class Alert {
        +Guid Id
        +Guid IncidentId
        +AlertSeverity Severity
        +string Message
        +AlertSource Source
        +DateTime IssuedAt
        +bool IsActive
        +Deactivate() void
    }

    class SearchArea {
        +Guid Id
        +Guid IncidentId
        +string Name
        +GeoPolygon Boundary
        +SearchAreaStatus Status
        +List~Assignment~ Assignments
        +AssignTeam(teamId) Assignment
    }

    class Assignment {
        +Guid Id
        +Guid SearchAreaId
        +Guid TeamId
        +string TeamType
        +DateTime AssignedAt
        +AssignmentStatus Status
        +Complete() void
    }

    class Campaign {
        +Guid Id
        +Guid IncidentId
        +string Name
        +decimal TargetAmount
        +decimal CollectedAmount
        +List~DonationMoney~ Donations
        +AddDonation(donation) void
        +GetBalance() decimal
    }

    class DonationMoney {
        +Guid Id
        +Guid CampaignId
        +decimal Amount
        +string DonorName
        +DateTime DonatedAt
    }

    class AuditLog {
        +Guid Id
        +string EntityType
        +Guid EntityId
        +string Action
        +string PerformedBy
        +DateTime PerformedAt
        +string Payload
    }

    class PublicSnapshot {
        +Guid Id
        +Guid IncidentId
        +string Summary
        +int AffectedCount
        +int RescuedCount
        +DateTime GeneratedAt
        +SnapshotStatus Status
    }

    class GeoPoint {
        +double Latitude
        +double Longitude
        +double? Altitude
        +DistanceTo(other) double
    }

    class GeoPolygon {
        +List~GeoPoint~ Points
        +double Area()
        +bool Contains(point) bool
    }

    Incident "1" *-- "0..*" Alert
    Incident "1" *-- "0..*" SearchArea
    Incident "1" *-- "0..*" Campaign
    Incident "1" *-- "0..*" PublicSnapshot
    SearchArea "1" *-- "0..*" Assignment
    Campaign "1" *-- "0..*" DonationMoney
    Incident --> GeoPoint
    SearchArea --> GeoPolygon
    AuditLog ..> Incident : references
```

---

## 2. Domain — Enumerações e Value Objects

```mermaid
classDiagram
    class IncidentType {
        <<enumeration>>
        Flood
        Landslide
        Earthquake
        Wildfire
        Storm
        Drought
        Tsunami
        Industrial
        Other
    }

    class IncidentStatus {
        <<enumeration>>
        Active
        Monitoring
        Contained
        Closed
    }

    class AlertSeverity {
        <<enumeration>>
        Info
        Warning
        Critical
        Extreme
    }

    class AlertSource {
        <<enumeration>>
        GDACS
        DefesaCivil
        INMET
        CEMADEN
        Manual
        System
    }

    class SearchAreaStatus {
        <<enumeration>>
        Pending
        InProgress
        Cleared
        Blocked
    }

    class AssignmentStatus {
        <<enumeration>>
        Assigned
        InProgress
        Completed
        Aborted
    }
```

---

## 3. Application Layer — Commands e Queries (CQRS)

```mermaid
classDiagram
    class ICommand~TResult~ {
        <<interface>>
    }

    class IQuery~TResult~ {
        <<interface>>
    }

    class ICommandHandler~TCommand, TResult~ {
        <<interface>>
        +Handle(command, ct) Task~TResult~
    }

    class IQueryHandler~TQuery, TResult~ {
        <<interface>>
        +Handle(query, ct) Task~TResult~
    }

    class RunSimulationCommand {
        +double[] BBox
        +DisasterParameters Parameters
        +string RequestedBy
    }

    class RunSimulationHandler {
        -IGisService _gis
        -ISimulationRepository _repo
        -IRiskAnalysisClient _rau
        +Handle(cmd, ct) Task~SimulationResult~
    }

    class CreateIncidentCommand {
        +string Title
        +string Description
        +IncidentType Type
        +GeoPoint Location
    }

    class CreateIncidentHandler {
        -IIncidentRepository _repo
        -IAuditLogger _audit
        +Handle(cmd, ct) Task~Guid~
    }

    class GetPublicIncidentsQuery {
        +string? Region
        +IncidentStatus? Status
        +int Page
        +int PageSize
    }

    class GetPublicIncidentsHandler {
        -IPublicSnapshotRepository _repo
        +Handle(query, ct) Task~PagedResult~
    }

    ICommandHandler <|.. RunSimulationHandler
    ICommandHandler <|.. CreateIncidentHandler
    IQueryHandler <|.. GetPublicIncidentsHandler
    RunSimulationCommand ..|> ICommand
    CreateIncidentCommand ..|> ICommand
    GetPublicIncidentsQuery ..|> IQuery
```

---

## 4. Infrastructure Layer — Repositórios e Serviços GIS

```mermaid
classDiagram
    class IIncidentRepository {
        <<interface>>
        +GetByIdAsync(id) Task~Incident~
        +GetAllAsync(filter) Task~IList~Incident~~
        +AddAsync(incident) Task
        +UpdateAsync(incident) Task
        +DeleteAsync(id) Task
    }

    class IncidentRepository {
        -AppDbContext _ctx
        +GetByIdAsync(id) Task~Incident~
        +GetAllAsync(filter) Task~IList~Incident~~
        +AddAsync(incident) Task
        +UpdateAsync(incident) Task
        +DeleteAsync(id) Task
    }

    class IGisService {
        <<interface>>
        +FetchUrbanFeaturesAsync(bbox) Task~UrbanSimulationResult~
        +FetchElevationGridAsync(bbox) Task~double[][]~
        +FetchWeatherAsync(lat, lon) Task~WeatherData~
    }

    class GisService {
        -IOverpassClient _overpass
        -IOpenTopoClient _topo
        -IMeteoClient _meteo
        -IMemoryCache _cache
        +FetchUrbanFeaturesAsync(bbox) Task~UrbanSimulationResult~
        +FetchElevationGridAsync(bbox) Task~double[][]~
        +FetchWeatherAsync(lat, lon) Task~WeatherData~
    }

    class IOverpassClient {
        <<interface>>
        +QueryAsync(query) Task~GeoJSON~
    }

    class IOpenTopoClient {
        <<interface>>
        +GetDemAsync(bbox) Task~double[][]~
    }

    class AppDbContext {
        +DbSet~Incident~ Incidents
        +DbSet~Alert~ Alerts
        +DbSet~SearchArea~ SearchAreas
        +DbSet~AuditLog~ AuditLogs
        +DbSet~PublicSnapshot~ PublicSnapshots
    }

    IIncidentRepository <|.. IncidentRepository
    IGisService <|.. GisService
    IncidentRepository --> AppDbContext
    GisService --> IOverpassClient
    GisService --> IOpenTopoClient
```

---

## 5. Frontend — WebGL Pipeline (Classes TypeScript)

```mermaid
classDiagram
    class CityScaleWebGL {
        -WebGL2RenderingContext gl
        -CityBlueprint blueprint
        -LayerState layers
        -SimData simData
        -CameraState camera
        +initGL() void
        +buildScene() void
        +renderLoop() void
        +handleLayerToggle(layer, value) void
        +dispose() void
    }

    class CityBlueprintBuilder {
        +build(bbox, osmData, tileSize) Promise~CityBlueprint~
        +buildFromSceneData(bbox, sceneData, osmData) Promise~CityBlueprint~
        -resampleElevation(src, rows, cols) ElevationResult
        -createFallbackCanvas(w, h) HTMLCanvasElement
    }

    class CityBlueprint {
        +bbox: BBox
        +worldSpanX: number
        +worldSpanZ: number
        +semantic: SemanticGrid
        +elevation: number[][]
        +elevationMin: number
        +elevationMax: number
        +osm: OsmFeatures
        +hasSatelliteCanvas: boolean
        +metadata: SemanticMetadata
        +capturedAt: string
    }

    class HydrologicalAnalyzer {
        +analyze(elevGrid, semanticCells, worldSpanX, worldSpanZ, fraction) HydroResult$
    }

    class HydroResult {
        +streamPolylines: StreamPolyline[]
        +waterCellQuads: WaterCellQuad[]
    }

    class SemanticTileProcessor {
        +classify(canvas, tileSize) SemanticGrid$
        +classifyWithLandCover(canvas, lcGrid, tileSize) SemanticGrid$
    }

    class SemanticGrid {
        +rows: number
        +cols: number
        +tileSize: number
        +cells: SemanticCell[][]
        +metadata: SemanticMetadata
    }

    class SemanticCell {
        +class: SemanticClass
        +intensity: number
        +r: number
        +g: number
        +b: number
    }

    class SemanticClass {
        <<enumeration>>
        VEGETATION
        WATER
        URBAN
        ROAD
        BARE_GROUND
        UNKNOWN
    }

    class TileLoader {
        +loadSatelliteTiles(minLat, minLon, maxLat, maxLon) Promise~HTMLCanvasElement~$
    }

    class LayerState {
        +terrain: boolean
        +buildings: boolean
        +highways: boolean
        +waterways: boolean
        +polygons: boolean
        +naturalAreas: boolean
        +landUseZones: boolean
        +paving: boolean
        +amenities: boolean
        +slope: boolean
        +sunSync: boolean
        +aiStructural: boolean
    }

    CityScaleWebGL --> CityBlueprintBuilder
    CityScaleWebGL --> LayerState
    CityBlueprintBuilder ..> CityBlueprint
    CityBlueprintBuilder --> TileLoader
    CityBlueprintBuilder --> SemanticTileProcessor
    CityBlueprintBuilder --> HydrologicalAnalyzer
    HydrologicalAnalyzer ..> HydroResult
    SemanticTileProcessor ..> SemanticGrid
    SemanticGrid "1" *-- "n×m" SemanticCell
    SemanticCell --> SemanticClass
    CityBlueprint --> SemanticGrid
```

---

## 6. Frontend — Hooks e State Management

```mermaid
classDiagram
    class useSimulationData {
        +simData: SimData
        +isLoading: boolean
        +error: string
        +runSimulation(bbox, params) void
        +reset() void
    }

    class usePublicMapPage {
        +incidents: PublicIncident[]
        +selectedIncident: PublicIncident
        +mapCenter: LatLng
        +searchCity(query) void
        +selectIncident(id) void
    }

    class useAuth {
        +user: KeycloakUser
        +isAuthenticated: boolean
        +roles: string[]
        +login() void
        +logout() void
        +hasRole(role) boolean
    }

    class useSignalR {
        +connection: HubConnection
        +isConnected: boolean
        +subscribe(event, handler) void
        +unsubscribe(event) void
    }

    class useLayerControls {
        +layers: LayerState
        +setLayer(key, value) void
        +applyPreset(preset) void
        +resetLayers() void
    }

    class SimulationStore {
        <<Zustand Store>>
        +simulations: Simulation[]
        +currentSimulation: Simulation
        +isRunning: boolean
        +addSimulation(sim) void
        +setCurrentSimulation(id) void
    }

    class AlertStore {
        <<Zustand Store>>
        +alerts: Alert[]
        +unreadCount: number
        +addAlert(alert) void
        +markAsRead(id) void
        +clearAll() void
    }

    useSimulationData --> SimulationStore
    usePublicMapPage --> AlertStore
    useSignalR --> AlertStore
```

---

## 7. Risk Analysis Unit — Python Classes

```mermaid
classDiagram
    class RiskAnalyzer {
        -model: PyTorchModel
        -scaler: StandardScaler
        +analyze(params) RiskResult
        +batch_analyze(params_list) List~RiskResult~
    }

    class SemanticSegmentor {
        -model: SegmentationModel
        -class_map: Dict
        +segment(image_array) SegmentationResult
        +segment_base64(b64_image) SegmentationResult
    }

    class RiskResult {
        +overall_score: float
        +flood_risk: float
        +landslide_risk: float
        +fire_risk: float
        +seismic_risk: float
        +confidence: float
        +recommendations: List~str~
    }

    class SegmentationResult {
        +grid: List~List~CellClass~~
        +rows: int
        +cols: int
        +metadata: SegMetadata
    }

    class DisasterParameters {
        +rainfall_mm: float
        +wind_speed_kmh: float
        +temperature_c: float
        +slope_degrees: float
        +soil_saturation: float
        +elevation_m: float
        +population_density: float
    }

    RiskAnalyzer --> RiskResult
    RiskAnalyzer --> DisasterParameters
    SemanticSegmentor --> SegmentationResult
```
