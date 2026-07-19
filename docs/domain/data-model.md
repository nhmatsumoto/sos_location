# Modelo de dados

Geometrias autoritativas: **WGS84 (SRID 4326)**. Tiles: transformação para
3857 somente na consulta. Índices GiST em todas as geometrias; unicidade
`(city_revision_id, external_id)` nas features; `(city_id, revision_number)`
nas revisões.

```mermaid
erDiagram
    cities ||--o{ city_revisions : has
    city_revisions ||--o{ buildings : contains
    city_revisions ||--o{ roads : contains
    city_revisions ||--o{ water_features : contains
    city_revisions ||--o{ land_use_areas : contains
    datasets ||--o{ dataset_versions : versions
    dataset_versions ||--o{ buildings : source
    import_jobs ||--o{ processing_issues : reports

    cities {
        uuid id PK
        text name
        text country_code
        text region
        text slug UK
        geometry boundary
        geometry centroid
    }
    city_revisions {
        uuid id PK
        uuid city_id FK
        int revision_number
        text status "draft|processing|ready|published|failed|archived"
        text reconstruction_profile
        geometry spatial_coverage
        jsonb source_summary
        text quality_level "L0..L4"
        timestamptz published_at
    }
    buildings {
        uuid id PK
        uuid city_revision_id FK
        text external_id
        geometry footprint "GiST"
        geometry centroid
        float height_m
        float min_height_m
        float ground_elevation_m
        int building_levels
        int roof_levels
        text building_type
        text roof_shape
        text height_source "observed|inferred"
        float confidence "0..1"
        uuid source_dataset_version_id FK
        jsonb tags
    }
    import_jobs {
        uuid id PK
        uuid city_id
        uuid city_revision_id
        text job_type
        text status "queued|running|completed|failed|cancelled|retrying"
        int progress
        text current_stage
        jsonb request
        text error
        int attempts
        text worker_id
    }
    dataset_versions {
        uuid id PK
        uuid dataset_id FK
        text version
        text checksum "SHA-256"
        text storage_key "chave MinIO do dado bruto"
        jsonb metadata
    }
```

`roads` (geometry, road_class, name, width_m, lanes, is_bridge, is_tunnel),
`water_features` (geometry, water_type, name) e `land_use_areas`
(geometry, land_use_type) seguem o mesmo padrão de proveniência
(`confidence`, `source_dataset_version_id`, `tags jsonb`).

## Cálculo de altura (perfil `osm-basic-v1`)

Precedência: `height` → `building:levels` (+`roof:levels`) → `roof:levels` →
altura por `building:type` → altura por uso do solo → padrão do perfil.

| Parâmetro | Valor |
|---|---|
| defaultLevelHeight | 3.0 m |
| defaultRoofLevelHeight | 2.0 m |
| defaultBuildingHeight | 9.0 m |

Altura explícita ⇒ `height_source = observed`, `confidence = 1.0`.
Inferida ⇒ `inferred`, confiança 0.8 (levels) / 0.6 (roof) / 0.5 (type) /
0.4 (land use) / 0.3 (default). Valores vivem no perfil versionado
(`ReconstructionProfile`), nunca fixos no código.
