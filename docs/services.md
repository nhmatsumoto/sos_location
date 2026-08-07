# Catálogo de serviços e módulos

## Processos executáveis

### Web (`apps/web`)

SPA React/TypeScript servida pelo Nginx. `App.tsx` coordena seleção de cidade/revisão, deep links, painéis e modais. `GeoScene` combina MapLibre GL (câmera, mapa base e picking) com deck.gl (edificações, vias, água, operações e overlays científicos). TanStack Query carrega dados; Zustand mantém câmera, revisão, simulação observada e desenho operacional.

Responsabilidades: pesquisar lugares, iniciar importações e simulações, inspecionar feições, desenhar operações, escolher ferramentas científicas e renderizar MVT/GeoJSON/PNG. Não grava diretamente no banco.

### API (`src/SosLocation.Api`)

ASP.NET Core Minimal API, prefixo `/api/v1`. Registra validação FluentValidation, Problem Details, compressão Brotli/Gzip, CORS configurável, Serilog, OpenTelemetry e health checks. As migrações/seed são executadas na inicialização quando `SkipMigrations=false`.

| Grupo | Função |
|---|---|
| `cities`, `revisions` | catálogo de cidades e revisões imutáveis |
| `places/search` | geocodificação via adapter configurável |
| `imports` | cria, acompanha, cancela e baixa arquivos de importação |
| `tiles` | MVT por revisão/camada/zoom/x/y, com ETag/cache |
| `features` | detalhe de prédio, via, água, ferrovias e manifest |
| `terrain` | tiles raster-dem Terrarium |
| `simulations` | cria/acompanha/cancela execução, respostas de prédios, replay e rasters de intensidade |
| `risk-zones` | zonas de risco por revisão e exposição calculada |
| `disaster-scenarios` | cenário, mapa operacional, impactos, coleta e resumo |
| `climate/current` | leitura meteorológica pontual |

### Worker (`src/SosLocation.Worker`)

Processo `BackgroundService` com três consumidores independentes:

1. `JobProcessorService`: reserva `ImportJob` no PostgreSQL com lock transacional (`FOR UPDATE SKIP LOCKED`) e executa `ImportPipeline`.
2. `SimulationProcessorService`: reserva `SimulationRun`, resolve o motor pelo `DisasterSimulationEngineRegistry` e executa o pipeline sísmico.
3. `DisasterCollectionWorkerService`: executa coletas agendadas de fontes de desastre (`IDisasterSourceCollector`), com backoff/configuração próprios.

Cada consumidor cria escopo de DI, respeita cancelamento e persiste estado/erro. A escala horizontal é possível porque a reserva é feita no banco.

## Bibliotecas por camada

| Projeto | Responsabilidade |
|---|---|
| `SosLocation.Domain` | entidades, value objects, estados, invariantes e cálculos sem infraestrutura |
| `SosLocation.Application` | ports, DTOs, validadores, casos de uso, pipeline e registro de motores |
| `SosLocation.GeoProcessing` | NTS, reparo/normalização GeoJSON/OSM, raster e modelos sísmicos |
| `SosLocation.Infrastructure` | EF Core/PostGIS, MVT, MinIO, clientes HTTP e adapters externos |
| `SosLocation.Api` | composição HTTP e tradução para contratos |
| `SosLocation.Worker` | consumidores assíncronos |

## Dependências de dados e adapters

- **PostgreSQL + PostGIS:** cidades, revisões, geometrias, jobs, operações, impactos e respostas sísmicas.
- **MinIO/S3:** payload bruto com SHA-256, manifestos, rasters de intensidade, frames de replay e artefatos de terreno.
- **OSM/Overpass:** feições urbanas; **Nominatim:** busca/resolução de lugares.
- **USGS ComCat/FDSN/ShakeMap/finite-fault/Vs30:** catálogo, mecanismos, intensidade, geometria de ruptura e site conditions sísmicos; ver [fonte USGS](data-sources/usgs-earthquake-data.md).
- **JMA:** coleta de avisos/dados de desastre configurada no worker.
- **Open-Meteo:** clima atual.
- **AWS Terrain/Terrarium:** elevação convertida para `raster-dem`.

## Motor científico atual

`SeismicSimulationPipeline` implementa `IDisasterSimulationEngine` para `earthquake`. Encadeia fonte de Brune, estimativa Vs30, propagação elástica FDTD, dissipação/atenuação, resposta SDOF por edifício, classificação de dano e raster de intensidade. A saída inclui PGA, direção/setores, perfis de atenuação, energia estimada, mapa colorido e raster numérico. Enchente e incêndio são tipos de domínio previstos, mas não possuem motor executável.
