# Design System do Frontend

## Objetivo

Esta pasta concentra a fundacao visual do SOS Location em Chakra UI.

O frontend esta em migracao. Durante essa fase:

- componentes novos devem usar Chakra UI;
- tokens semanticos devem ser preferidos a cores hardcoded;
- Tailwind e CSS global ficam em modo de compatibilidade, nao de expansao;
- nenhum componente novo deve nascer com `className` utilitario se puder ser expresso pelo design system.

## Regras praticas

- use `surface.*`, `text.*`, `status.*`, `risk.*` e `hazard.*` antes de valores literais;
- trate estados operacionais como semantica de produto, nao apenas estilo;
- prefira compor paginas a partir de shells, panels e metric cards;
- Leaflet, WebGL e resets globais podem manter CSS estrutural quando Chakra nao for a ferramenta certa.

## Sequencia de migracao

1. providers
2. tema semantico
3. layout compartilhado
4. componentes base
5. paginas por dominio
