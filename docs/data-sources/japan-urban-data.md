# Dados urbanos públicos do Japão

Pesquisa atualizada em 2026-07-30 para orientar o enriquecimento de
construções do SOS-LOCATION. A regra de integração é simples: dado observado
tem precedência sobre inferência; toda fonte deve preservar versão, licença e
atribuição.

## Cobertura nacional e descoberta por município

| Fonte oficial | Cobertura útil | Uso seguro no SOS-LOCATION |
|---|---|---|
| [Project PLATEAU — open data](https://www.mlit.go.jp/plateau/open-data/) | Modelos 3D produzidos com governos locais | Altura medida, pavimentos, uso, estrutura e, onde houver LOD2, geometria de telhado |
| [PLATEAU Data Catalog API](https://api.plateauview.mlit.go.jp/datacatalog/plateau-datasets) | Catálogo consultável por `city`, `city_code`, `pref`, tipo e LOD | Descoberta automática do pacote mais recente de cada município |
| [GSI Fundamental Geospatial Data](https://www.gsi.go.jp/kiban/index.html) | Footprints de construções e elementos básicos em todo o Japão | Completar footprints ausentes do OSM após download autenticado e reconciliação espacial |
| [MLIT National Land Numerical Information](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-A55-2024.html) | Zoneamento, uso urbano, parques, vias planejadas e restrições | Contexto territorial para classificação; não substitui atributos observados de um edifício |
| [e-Stat API](https://dashboard.e-stat.go.jp/static/api) | Estatísticas de habitação em nível nacional, provincial e, quando publicado, municipal | Calibração agregada; nunca atribuir uma estatística diretamente a uma casa |

Na consulta feita em 2026-07-30, `latest_citygml` do catálogo PLATEAU continha
307 pacotes municipais. Cada entrada informa `city_code`, prefeitura, cidade,
URL estável `-latest`, tamanho e tipos disponíveis (`bldg`, `brid`, `tran`,
`luse`, `dem` etc.). Os pacotes variam de dezenas de megabytes a mais de 1 GB;
por isso não são baixados implicitamente durante uma importação interativa OSM.

Os portais das prefeituras continuam úteis para dados não presentes no
PLATEAU, mas não há um contrato de API único para todos os municípios. O fluxo
correto é descobrir primeiro pelo catálogo nacional e registrar um adapter
municipal somente quando o portal publica formato, licença e atualização
estáveis. Fazer scraping genérico de páginas de prefeitura produziria um
pipeline frágil e sem garantia de redistribuição.

## Precedência de atributos

1. PLATEAU/GSI ou cadastro municipal observado e versionado.
2. Tag explícita do OpenStreetMap (`height`, `building:levels`,
   `roof:height`, `roof:shape`, `surface`, `bridge`).
3. Classe OSM inequívoca (`building=house`, `apartments`, `warehouse` etc.).
4. Inferência morfológica rastreável por footprint, pavimentos e uso do solo.
5. Valor padrão do perfil de reconstrução.

O perfil `osm-japan-urban-v2` implementa os itens 2–5. Ele diferencia casa e
apartamento, preserva o footprint original e escreve tags `sos:*` indicando
classe, base da classificação, confiança, altura, pavimentos e forma de
telhado. Esses valores não devem ser promovidos a “observados” quando forem
apenas inferidos.

## Próxima integração de dados oficiais

O próximo adapter deve consultar o catálogo PLATEAU por `city_code`, baixar o
CityGML sob demanda em um job próprio e extrair:

- `bldg:measuredHeight`;
- `bldg:storeysAboveGround`;
- `bldg:usage` e `uro:majorUsage`;
- `bldg:roofType`;
- estrutura e resistência ao fogo quando publicadas;
- footprints LOD0/LOD1 e pontes `brid`.

A fusão deve usar IoU e distância de centroide, registrar conflitos para
revisão e manter `PLATEAU > OpenStreetMap > e-Stat`, conforme
`UrbanDataSources.DefaultPriority`. LOD2 exige um renderer de malhas 3D;
MapLibre `fill-extrusion` representa apenas extrusões prismáticas.
