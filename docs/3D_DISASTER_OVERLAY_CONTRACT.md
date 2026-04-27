# Contrato de Disaster Overlays 3D

## Objetivo

Preparar o motor 3D para receber camadas futuras de enchente, terremoto, tsunami, deslizamento, rompimento de barragem, bloqueio de rota e zona de evacuação sem implementar física completa agora.

O overlay deve ser uma camada de dados sobre a cena, não uma dependência do carregamento básico de terreno/cidade.

## Tipos suportados

```ts
type DisasterOverlayType =
  | 'flood_depth'
  | 'earthquake_intensity'
  | 'tsunami_reach'
  | 'landslide_risk'
  | 'dam_break_flow'
  | 'blocked_route'
  | 'evacuation_zone';

interface DisasterOverlay {
  id: string;
  type: DisasterOverlayType;
  bounds: GeoBounds;
  timestamp: string;
  source: string;
  resolutionMeters?: number;
  opacity: number;
  visible: boolean;
}
```

O contrato inicial está implementado em `frontend-react/src/features/scene3d/domain/DisasterOverlay.ts`.

## Representações

| Representação | Uso | Exemplo |
| --- | --- | --- |
| Raster grid | Valores por célula sobre terreno | profundidade de inundação, intensidade sísmica |
| Image overlay | Textura georreferenciada | alcance de tsunami, mapa de calor |
| Vector polygon | Áreas operacionais | evacuação, zona bloqueada |
| Vector line | Rotas e fluxos | rota bloqueada, frente de escoamento |
| Vector point | Pontos críticos | abrigo, ponte danificada, foco de incêndio |

## Regras de aplicação na cena

- O overlay deve declarar `bounds` e ser convertido pela mesma origem local da cena.
- A opacidade deve ser controlada por camada.
- Overlays devem poder ser desligados sem recriar toda a cena.
- Overlays raster devem respeitar a elevação do terreno no shader ou em malha leve projetada.
- Overlays vetoriais devem aceitar simplificação por LOD.
- O renderer deve permitir múltiplos overlays simultâneos.

## Integração com camadas existentes

| Camada base | Como o overlay se conecta |
| --- | --- |
| Terreno | textura, grid ou malha projetada sobre DEM |
| Prédios | tint/outline por interseção com `bounds` ou altura de água |
| Vias | cor/estado de bloqueio e custo de roteamento |
| Hidrografia | referência para enchente, tsunami e rompimento |
| Pontos críticos | símbolos e prioridades operacionais |

## Metadados obrigatórios

Todo overlay vindo de simulação ou fonte externa deve informar:

- `source`: modelo, órgão, serviço ou cálculo local;
- `timestamp`: instante da simulação/observação;
- `resolutionMeters`: quando raster;
- `bounds`: área de validade;
- `visible` e `opacity`: estado de UI;
- validade/frescor em metadado complementar quando disponível.

## Não objetivos desta etapa

- Não calcular física completa de enchente.
- Não calcular propagação sísmica completa.
- Não calcular tsunami ou dam break real time.
- Não misturar modelo físico com renderer.

## Próximos passos técnicos

1. Criar store de overlays com seleção por tipo e visibilidade.
2. Criar builder raster para grids georreferenciados.
3. Criar builder vetorial para polígonos/linhas.
4. Adicionar endpoint backend para listar overlays por `bbox`.
5. Adicionar testes de transformação `GeoBounds -> local rect -> overlay mesh`.
