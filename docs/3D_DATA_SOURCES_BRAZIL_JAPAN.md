# Fontes de Dados 3D para Brasil e Japão

## Princípios

- Não depender de serviços pagos para a cena base.
- Sempre registrar fonte, licença, resolução, cobertura, data de coleta e fallback.
- Nunca tratar dado sintético como dado observado.
- Escolher provedor por cobertura do `bbox`, não por cidade fixa.
- Fazer cache no backend quando a fonte permitir, principalmente para recortes PostGIS e tiles repetidos.

## Prioridade de fontes

| Camada | Global | Brasil | Japão | Fallback |
| --- | --- | --- | --- | --- |
| Edificações | OpenStreetMap/Overpass | OSM, dados municipais quando disponíveis | OSM, PLATEAU quando disponível | footprint simplificado/sintético marcado |
| Vias | OpenStreetMap/Overpass | OSM | OSM, MLIT quando aplicável | vias principais geradas a partir de rede mínima |
| Hidrografia | OSM, HydroSHEDS quando integrado | ANA/INDE quando integrado | MLIT/GSI quando integrado | OSM waterway/water polygons |
| Elevação | SRTM/OpenTopography/Copernicus | SRTM, TOPODATA/INDE quando integrado | GSI DEM, OpenTopography | DEM sintético marcado |
| Costa/água | OSM coastline/water | IBGE/INDE quando integrado | GSI/MLIT | polígonos OSM |
| Clima | Open-Meteo | Open-Meteo/INMET futuro | Open-Meteo/JMA futuro | não bloquear cena 3D |

## Fontes já conectadas ou referenciadas

### OpenStreetMap / Overpass

Uso atual: prédios, vias, hidrografia, áreas naturais, land use e amenities por `OverpassProvider`/pipeline urbano.

Decisão: manter como fonte base global para Brasil e Japão. Precisa de cache, timeout e marcação `isSynthetic` quando fallback entrar.

### OpenTopography / Copernicus / OpenElevation

Uso atual: provedores de DEM no backend e fallback no frontend. Adequado para base global, mas resolução/cobertura variam.

Decisão: usar como base global de elevação; GSI deve ser preferido no Japão quando disponível.

### GSI / MLIT / PLATEAU

Uso atual: há documentação e intenção de integração, mas não é o caminho ativo geral da cena.

Decisão: tratar como provedores premium abertos para Japão:

- GSI DEM para elevação;
- MLIT para infraestrutura/hidrografia quando disponível;
- PLATEAU para edifícios 3D em cidades cobertas.

Quando PLATEAU não cobrir o `bbox`, retornar OSM extrudado com metadado de cobertura.

### IBGE / INDE

Uso atual: referência de domínio e integração planejada, não é fonte principal do renderer ativo.

Decisão: usar para limites administrativos, hidrografia oficial, setores e camadas de contexto no Brasil. Para prédios e vias, OSM continua sendo fonte operacional inicial.

### Open-Meteo

Uso atual: clima e camadas de contexto.

Decisão: não deve bloquear renderização 3D base. Entra como overlay futuro de chuva, vento, temperatura e risco.

## Metadados mínimos por fonte

Todo payload geoespacial deve carregar:

```ts
interface SourceCoverage {
  source: string;
  layer: 'terrain' | 'buildings' | 'roads' | 'hydrography' | 'risk' | 'imagery';
  bounds: GeoBounds;
  country?: 'BR' | 'JP' | 'GLOBAL';
  resolutionMeters?: number;
  license?: string;
  fetchedAt: string;
  expiresAt?: string;
  isSynthetic: boolean;
  fallbackReason?: string;
}
```

## Estratégia para Brasil

1. OSM/Overpass para início rápido de prédios, vias e água.
2. DEM global para elevação base.
3. IBGE/INDE para limites, contexto e hidrografia oficial quando backend suportar ingestão.
4. PostGIS para recorte espacial de dados persistidos por `bbox`.

## Estratégia para Japão

1. OSM/Overpass como base universal.
2. GSI DEM como prioridade para terreno onde houver integração.
3. PLATEAU para cidades cobertas com edifícios 3D de maior fidelidade.
4. MLIT/GSI para hidrografia, costa e infraestrutura quando disponíveis.

## Fallback seguro

O fallback deve degradar a cena nesta ordem:

1. DEM real + OSM real.
2. DEM global + OSM real.
3. Terreno plano + OSM real.
4. Cena procedural/sintética com banner/metadado operacional.

O usuário deve conseguir operar a cena em todos os casos, mas o sistema precisa deixar claro quando a fidelidade caiu.
