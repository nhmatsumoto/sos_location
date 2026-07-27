# Fontes de dados para maior precisão de edifícios

Análise feita em 2026-07-27 em resposta ao pedido de renderização de edifícios
mais realista (tamanhos e forma). Cobre o que a plataforma usa hoje e as
opções externas avaliadas para melhorar altura e forma de telhado no futuro.

## Fonte atual: OpenStreetMap (Overpass)

O que já é extraído e usado (`OverpassNormalizer`, `OsmTagNormalizer`):
`building`/`building:part`, `height`/`building:height`, `building:levels`,
`roof:levels`, `roof:shape`, `min_height`. Footprint é o polígono OSM real,
nunca uma bounding box.

**Limitação real**: cobertura de tags de altura e forma de telhado varia
muito por região — a maioria das construções residenciais no mundo (inclusive
grande parte do Japão) não tem `height`/`roof:shape` marcados. Por isso a
plataforma sempre precisou de uma cascata de inferência
(`BuildingHeightCalculator`) e agora também de um valor padrão de telhado por
tipo de construção (`BuildingRoofCalculator`) — nenhum dos dois inventa
tamanho, mas a precisão fica limitada ao que o OSM realmente documentou.

`roof:height`, `roof:direction`, `roof:material` e `building:material`
chegam da Overpass mas hoje só ficam guardados sem uso na coluna `Tags`
(jsonb) do `Building` — não são parseados para colunas próprias.

## Overture Maps Foundation — tema `buildings`

- Cobertura global; funde OpenStreetMap + Microsoft Global ML Building
  Footprints + Google Open Buildings.
- `height` já vem derivado de `height`/`est_height`/`min_height`/`roof_height`
  quando qualquer uma dessas fontes tem o dado — ou seja, uma construção sem
  `height` no OSM pode ainda assim ter altura no Overture, vinda de detecção
  por imagem de satélite (Microsoft/Google).
- Distribuição: GeoParquet público em
  `s3://overturemaps-us-west-2/release/<data-do-release>/theme=buildings`,
  sem autenticação; CLI oficial `overturemaps` para recortar por bounding box.
- **Não** traz forma de telhado real (cumeeira etc.) — só footprint + altura.

**Como encaixaria**: como uma nova fonte no mecanismo de fusão por prioridade
que já existe (`Dataset`/`DatasetVersion` + `UrbanDataSources.DefaultPriority`
em `src/SosLocation.Domain/Catalog/Dataset.cs`), preenchendo altura onde o OSM
não tem tag — sem mudar a lógica de renderização (o pipeline continuaria
produzindo `HeightMeters`/`HeightSource`, só com mais uma fonte candidata
antes de cair no valor padrão do perfil). Não implementado nesta entrega.

## PLATEAU (MLIT / G-Spatial Information Center, Japão)

- Projeto do governo japonês (Ministry of Land, Infrastructure, Transport and
  Tourism); modelos 3D de cidade em CityGML, dados abertos, uso comercial
  permitido.
- ~250 cidades têm cobertura **LOD1** (edifício como bloco único, altura real
  medida — mais precisa que a inferência do OSM, mas sem forma de telhado,
  mesma fidelidade visual da aproximação implementada nesta entrega).
- Forma real de telhado (**LOD2**, com cumeeira e águas modeladas) existe para
  apenas ~480 mil edifícios (marcos/prédios altos) em 97 cidades — **não**
  resolve "telhado real" para a maioria das construções, nem mesmo dentro do
  Japão.
- Formato CityGML exige transformação de coordenadas (JGD2011 → WGS84) e, para
  aproveitar a geometria LOD2 de verdade, extração de malha 3D por vértice —
  algo que o pipeline de tiles MVT atual não consegue carregar (ver seção
  abaixo).

**Como encaixaria**: fonte de altura de alta precisão (LOD1) para cidades
japonesas cobertas — mesmo mecanismo de fusão do Overture. A geometria LOD2
exigiria uma frente própria (parser CityGML + pipeline de malha), avaliável
separadamente pela iniciativa "Building Intelligence" já esboçada em
`docs/domain/building-intelligence-spec.toml`. Não implementado nesta entrega.

## Por que não dá para ter telhado com geometria real hoje

A extrusão atual (MapLibre `fill-extrusion`, ver ADR 0002/0003) só sabe
desenhar um prisma de topo plano — um único valor de altura por polígono, sem
variação por vértice. Cumeeira/água de telhado real exigem altura diferente
em cada vértice do topo, o que MVT + `fill-extrusion` não representam. Isso só
seria possível com uma malha 3D (ex.: deck.gl `SimpleMeshLayer`), o que muda
a arquitetura de renderização hoje deliberadamente MapLibre-nativa e
revisitaria as ADRs 0002/0003. Por isso esta entrega usa uma aproximação (um
segundo volume mais estreito sobre o principal) em vez de forma real — ver
`RoofHeightMeters`/`BuildingRoofCalculator` e a camada `sos-buildings-roof`.

## Recomendação

1. **Feito nesta entrega**: aproximação de telhado via dado OSM já coletado
   (`roof:shape`/`roof:levels`), sem depender de fonte externa nova.
2. **Próximo passo natural**: Overture Maps como fonte adicional de altura
   (não de forma), preenchendo lacunas onde o OSM não tem `height` — reusa a
   fusão por prioridade já existente, esforço moderado.
3. **Iniciativa maior, separada**: PLATEAU LOD1 para altura de alta precisão
   em cidades japonesas cobertas; LOD2 (forma real de telhado) só viável para
   um subconjunto curado de edifícios-marco, e exigiria repensar o pipeline de
   renderização para malha 3D — escopo de projeto próprio, não uma tarefa
   incremental.
