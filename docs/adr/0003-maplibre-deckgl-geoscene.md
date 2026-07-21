# ADR 0003 — MapLibre + deck.gl interleaved atrás da GeoScene

- **Status**: aceito (2026-07-16)

## Contexto
O runtime visual precisa de globo, câmera cartográfica, MVT e extrusão 3D
selecionável, sem acoplar o restante do frontend a APIs de mapa.

## Decisão
- MapLibre GL JS: globo, câmera, projeção, camada base (background sólido).
- deck.gl `MapboxOverlay` em modo **interleaved** (compartilha câmera e depth
  buffer): `MVTLayer` extrudada para edifícios, camadas de vias/água/uso do solo.
- Classe própria `GeoScene` é a única fronteira com MapLibre/deck: inicializa,
  registra/remove camadas, seleção, métricas e liberação de GPU. Componentes
  React nunca importam maplibre/deck diretamente (exceto a fábrica de camadas
  em `geo/layers`).
- Three.js fica reservado para camadas futuras de simulação (água dinâmica,
  partículas), fora do runtime geoespacial.

## Consequências
- Sem wrappers React de terceiros; upgrade de MapLibre/deck é localizado.
- O modo interleaved permite oclusão correta entre edifícios extrudados e
  futuras camadas.
