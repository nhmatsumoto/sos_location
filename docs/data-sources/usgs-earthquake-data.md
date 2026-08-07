# USGS Earthquake Data — integração científica

Fonte de escopo: [Earthquake Data, USGS Earthquake Hazards Program](https://www.usgs.gov/programs/earthquake-hazards/science/earthquake-data).

A página é um catálogo de famílias de dados, não um endpoint único. A integração
deve preservar a identidade e a revisão de cada produto do evento. O feed
GeoJSON já coletado pelo sistema serve à descoberta e reconciliação inicial;
produtos científicos detalhados entram separadamente.

| Produto | Fonte oficial | Aplicação no SOS_LOCATION |
|---|---|---|
| ComCat / FDSN Event | `earthquake.usgs.gov/fdsnws/event/1` | origem, profundidade, magnitudes, fases, mecanismo focal, tensor de momento e índice dos produtos associados |
| ShakeMap | `earthquake.usgs.gov/data/shakemap` | PGA, PGV e intensidade instrumental observada; validação e comparação com o raster simulado |
| Finite Fault | `earthquake.usgs.gov/data/finitefault` | geometria de ruptura, rake, slip, tempo de ruptura, função de momento e direção de propagação |
| Vs30 | `earthquake.usgs.gov/data/vs30` | condição de sítio para calibrar ou substituir a estimativa por inclinação topográfica |
| Strong motion / waveforms | catálogo USGS e redes associadas | acelerogramas observados para calibração do movimento do solo e da resposta estrutural |

## Política de ingestão

1. Descobrir o evento pelo feed GeoJSON e fixar o `eventId` preferencial.
2. Consultar o detalhe ComCat e registrar `updateTime`, autor, status e ID de
   cada produto; revisões não sobrescrevem o payload bruto anterior.
3. Baixar ShakeMap e Finite Fault somente quando listados no evento. Ausência de
   produto é um estado válido, não um erro que autorize dados inventados.
4. Reprojetar grades e geometrias para WGS84 apenas na camada derivada,
   preservando o arquivo original e o checksum.
5. Comparar ShakeMap observado e FDTD simulado como produtos diferentes:
   observado, cenário calculado e previsão nunca compartilham o mesmo rótulo.
6. Aplicar cache, `User-Agent`, limite de taxa e atualização incremental pelo
   timestamp do produto.

## Mapeamento para ferramentas

- **Fonte e dados:** ComCat, tensor de momento, mecanismo focal, Finite Fault e
  Vs30.
- **Propagação e dissipação:** função momento-tempo, direção de ruptura e
  acelerogramas.
- **Intensidade e mapa de calor:** grades ShakeMap de PGA/PGV/MMI e estações.
- **Impacto estrutural:** movimento observado como entrada/validação da resposta
  SDOF; PAGER apenas como produto externo de comparação, nunca como vítimas
  locais confirmadas.
