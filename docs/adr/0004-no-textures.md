# ADR 0004 — Renderização sem texturas (decisão de arquitetura)

- **Status**: aceito (2026-07-16)

## Contexto
Texturas fotográficas (satélite, ortofotos, fachadas) criam dependências de
tokens comerciais, pesam na rede e não agregam ao objetivo analítico da
plataforma (estado + semântica + confiança).

## Decisão
A ausência de textura é regra de arquitetura, não falta de arquivos:
- Estilo base do mapa: fundo sólido, **zero sources raster/imagem**.
- Edifícios: material fosco + cores semânticas por categoria
  (residential/commercial/industrial/public/hospital/school/unknown).
- Água: azul translúcido; uso do solo: preenchimentos de baixa opacidade.
- Cores centralizadas em `apps/web/src/geo/materials/theme.ts` (tema), nunca
  nos componentes.
- **Teste automatizado** (`src/tests/theme.test.ts`) falha se o estilo base
  registrar source `raster`/`raster-dem`/`image` ou referenciar URLs externas
  de imagery.

## Consequências
- Aplicação funciona 100% offline com a fixture.
- Um modo de imagery futuro exigiria revisitar este ADR explicitamente.
