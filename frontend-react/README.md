# SOS Location Frontend

Frontend operacional do SOS Location.

## Stack oficial

- React 19
- TypeScript
- Vite
- Bun
- Chakra UI
- Vitest + Testing Library

## Regras de migracao

- Chakra UI e a fundacao de UI oficial;
- Tailwind e CSS global ainda existem em modo de compatibilidade;
- nenhum componente novo deve nascer em Tailwind se puder ser expresso pelo design system;
- layout, shells e componentes compartilhados migram antes das paginas.

## Comandos

```bash
bun install --frozen-lockfile
bun run dev
bun run build
bun run lint
bun run test
```

## Estrutura importante

- `src/app/providers`: providers globais da aplicacao
- `src/design-system`: tema, tokens e regras da interface
- `src/domains`: paginas e fluxos por dominio
- `src/components`: componentes compartilhados
- `src/test`: utilitarios de teste
