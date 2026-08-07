# Arquitetura de ferramentas científicas

O workspace científico separa quatro responsabilidades:

1. **motor físico** — executa o modelo do desastre no worker;
2. **artefatos científicos** — resultados versionados, numéricos e
   cartográficos;
3. **ferramenta analítica** — interpreta um ou mais artefatos no frontend;
4. **overlay genérico** — projeta GeoJSON científico no mapa sem criar uma
   camada MapLibre específica para cada ferramenta.

## Motores de desastre

Um motor implementa `IDisasterSimulationEngine` e declara:

- `DisasterType`: chave usada pelo worker;
- `ModelId`: versão auditável do modelo;
- `ExecuteAsync`: pipeline que atualiza o mesmo ciclo de `SimulationRun`.

`DisasterSimulationEngineRegistry` recebe as implementações por injeção de
dependência, rejeita duplicatas e resolve o motor da execução. O worker não
conhece `SeismicSimulationPipeline`; adicionar inundação, incêndio ou tsunami
não exige editar o seu loop.

Para adicionar um motor:

1. criar uma implementação de `IDisasterSimulationEngine`;
2. registrar a implementação em `DependencyInjection`;
3. declarar o tipo como implementado na validação da API;
4. versionar e documentar os parâmetros e artefatos produzidos.

## Registro do frontend

Cada `ScientificToolDefinition` informa ID, tipo de desastre, categoria,
descrição, outputs e componente. `ScientificToolRegistry` compõe o workspace e
rejeita IDs duplicados no mesmo desastre.

Uma ferramenta nova pode reutilizar uma execução, combinar observações externas
ou funcionar somente com dados. Ela não precisa alterar o shell do workspace.

## Contrato cartográfico

Ferramentas publicam uma `GeoJSON.FeatureCollection` em `scientificOverlay`.
As propriedades abaixo são interpretadas pelas camadas genéricas:

- `analysisColor`
- `analysisWidth`
- `analysisRadius`
- `analysisOpacity`
- `analysisLabel`
- `analysisKind`

Isso mantém MapLibre desacoplado do modelo físico. As propriedades são apenas
de apresentação; valores científicos permanecem no artefato original.

## Primeiro pacote: terremotos

O motor sísmico produz:

- fonte de Brune, momento sísmico, energia radiada estimada e frequência de
  canto;
- campo de Vs derivado do terreno, malha FDTD e métricas de estabilidade;
- raster numérico de PGA e mapa de calor em escala fixa;
- quadros instantâneos da propagação;
- setores azimutais de PGA para direção;
- perfil de atenuação por distância e correção de espalhamento geométrico;
- PGA, PGV, aceleração espectral, drift e dano por edifício.

O solver atual é uma aproximação SH 2D com correção 2.5D e resposta estrutural
SDOF. Resultados são cenários de engenharia, não observações nem laudos.
