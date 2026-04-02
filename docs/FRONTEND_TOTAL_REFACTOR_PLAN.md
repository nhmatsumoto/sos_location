# Plano de Refatoracao Total do Frontend

> Baseado no codigo atual, nos modelos documentados e no problema operacional que o sistema precisa resolver: detectar, compreender, priorizar e coordenar resposta a eventos de risco e desastre.

## 1. Objetivo do produto

O frontend deve servir quatro fluxos primarios:

- publico: consultar transparencia, situacao, alertas e incidentes;
- coordenacao: montar quadro operacional, abrir incidentes, distribuir equipes e recursos;
- campo: executar tarefas, reportar situacao e receber atualizacoes;
- governanca: auditar decisoes, integrações, qualidade de dados e configuracoes.

Hoje o sistema mistura esses fluxos em paginas paralelas, com rotas acumuladas historicamente e guardas de acesso pouco granulares.

## 2. Diagnostico do estado atual

Rotas reais em [AppRoutes.tsx](/home/nhmatsumoto/sos_location/frontend-react/src/AppRoutes.tsx) mostram:

- dominio publico em `/`, `/docs`, `/transparency`, `/login`;
- dominio privado em `/app/*`;
- qualquer usuario autenticado acessa quase todas as paginas privadas;
- apenas `/app/tactical-approval` e `/app/admin/sources` exigem `admin`.

Problemas estruturais:

- `route sprawl`: muitas paginas de mesmo dominio funcional sem hierarquia clara;
- `shell unico`: quase tudo vive no mesmo `AppShell`, embora os modos de uso sejam diferentes;
- `rbac superficial`: os papeis `public`, `volunteer`, `coordinator` e `admin` existem no Keycloak, mas quase nao aparecem na navegacao;
- `estado e dados fragmentados`: hooks e services crescem em paralelo, sem fronteira consistente por dominio;
- `nomenclatura inconsistente`: `sos`, `support`, `rescue-support`, `operational-map`, `volunteer`, `logistics` e `risk-assessment` se sobrepoem;
- `drift documental`: partes dos docs ainda descrevem rotas e arquitetura que nao correspondem ao codigo.

## 3. Principios de refatoracao

- arquitetura por dominio de negocio, nao por pagina isolada;
- rotas como contrato formal;
- permissoes declarativas por area e acao;
- telas desenhadas a partir de jobs-to-be-done operacionais;
- mapas, simulacoes e analytics como capacidades compartilhadas, nao como paginas concorrentes;
- degradacao elegante para usuarios publicos e operacionais em dispositivos diferentes.

## 4. Arquitetura alvo de rotas

## 4.1 Dominio publico

Rotas alvo:

- `/`
- `/transparency`
- `/transparency/incidents`
- `/transparency/incidents/:incidentId`
- `/transparency/alerts`
- `/docs`
- `/status`
- `/login`

Objetivo:

- transparencia;
- comunicacao de risco;
- leitura de incidentes sem jargao tatico;
- acesso a documentacao e disponibilidade da plataforma.

## 4.2 Dominio operacional

Rotas alvo:

- `/app`
- `/app/overview`
- `/app/incidents`
- `/app/incidents/:incidentId`
- `/app/incidents/:incidentId/command`
- `/app/map`
- `/app/field`
- `/app/resources`
- `/app/analytics`
- `/app/simulations`
- `/app/integrations`
- `/app/settings`

Objetivo:

- concentrar a operacao no incidente e nao em dashboards desconectados.

## 4.3 Dominio administrativo

Rotas alvo:

- `/admin`
- `/admin/users`
- `/admin/access`
- `/admin/integrations`
- `/admin/data-sources`
- `/admin/audit`
- `/admin/approvals`

Objetivo:

- separar governanca, catalogo e aprovacoes do fluxo tatico.

## 4.4 Aliases temporarios de migracao

Durante a migracao:

- `/app/sos` -> `/app/overview`
- `/app/operational-map` -> `/app/map`
- `/app/rescue-support` -> `/app/resources`
- `/app/support` -> `/admin/audit` ou pagina equivalente, conforme escopo final

Esses aliases devem ter prazo de remocao definido em backlog.

## 5. Mapa de consolidacao de paginas

| Estado atual | Destino proposto | Justificativa |
|---|---|---|
| `/app/sos` | `/app/overview` | Tela inicial da operacao deve ser um quadro situacional, nao um nome de modulo historico. |
| `/app/operational-map` | `/app/map` | O mapa operacional precisa ser capacidade central e nome unico. |
| `/app/incidents` + `/app/reports` + `/app/searched-areas` | `/app/incidents/:incidentId/command` | Esses tres fluxos pertencem ao contexto do incidente. |
| `/app/rescue-support` + `/app/logistics` + `/app/volunteer` | `/app/resources` e `/app/field` | Recursos e execucao de campo devem ser separados com clareza. |
| `/app/data-hub` + `/app/risk-assessment` + `/app/global-disasters` | `/app/analytics` | Analytics tatico, risco e inteligencia externa devem compartilhar taxonomia. |
| `/app/tactical-approval` + `/app/admin/sources` | `/admin/*` | Aprovacao e administracao nao devem disputar espaco com a operacao. |

## 6. Matriz de acesso alvo

Papeis observados no repositorio:

- `public`
- `volunteer`
- `coordinator`
- `admin`

Matriz recomendada:

| Area | public | volunteer | coordinator | admin |
|---|---|---|---|---|
| Transparencia | leitura | leitura | leitura | leitura |
| Mapa operacional | nao | leitura limitada | leitura/escrita | leitura/escrita |
| Incidentes | nao | leitura do incidente atribuido | leitura/escrita | leitura/escrita |
| Campo | nao | leitura/escrita da propria tarefa | leitura/escrita | leitura/escrita |
| Recursos | nao | leitura | leitura/escrita | leitura/escrita |
| Simulacoes | nao | leitura | leitura/escrita | leitura/escrita |
| Integracoes | nao | nao | leitura | leitura/escrita |
| Admin e auditoria | nao | nao | leitura limitada | leitura/escrita |

## 7. Estrutura tecnica alvo

## 7.1 Route manifest unico

Criar um manifesto tipado, por exemplo:

- `route id`
- `path`
- `domain`
- `required roles`
- `navigation group`
- `feature flag`
- `layout`

Isso elimina duplicidade entre:

- `AppRoutes`
- `Sidebar`
- `NavigationRail`
- breadcrumbs
- guards

## 7.2 Frontend por dominio

Estrutura recomendada:

```text
src/
  app/
    router/
    shell/
    auth/
  domains/
    public/
    incidents/
    operations/
    resources/
    analytics/
    simulations/
    admin/
  shared/
    components/
    map/
    services/
    stores/
    lib/
```

Cada dominio deve conter:

- `pages`
- `components`
- `hooks`
- `api`
- `types`
- `permissions`

## 7.3 Camada de dados

O estado remoto hoje esta disperso. A refatoracao deve separar:

- estado de sessao;
- estado de UI;
- estado remoto/cache;
- estado geoespacial de mapa.

Direcao recomendada:

- manter `Zustand` para sessao e UI local;
- introduzir um cache de dados remoto por query key;
- centralizar contratos REST e mapeadores de DTO;
- remover fetches duplicados por hook/pagina.

Se a equipe aceitar dependencia nova, `@tanstack/react-query` e a melhor opcao. Se nao aceitar, o projeto precisa ao menos de um client cacheado e invalidacao por chave.

## 7.4 App shells especializados

Shells alvo:

- `PublicShell`
- `OperationsShell`
- `AdminShell`
- `IncidentCommandShell`

Cada shell deve ter navegacao, densidade visual e notificacoes adequadas ao contexto.

## 8. Funcionalidades alvo por pagina

## 8.1 `/app/overview`

Deve reunir:

- resumo de incidentes ativos;
- alertas criticos;
- mapa resumido;
- tarefas pendentes;
- saude das integracoes;
- KPIs de risco e capacidade operacional.

## 8.2 `/app/incidents`

Deve permitir:

- listar, filtrar e priorizar incidentes;
- abrir incidente novo;
- acessar timeline, areas, recursos e tarefas;
- entrar no `command mode` do incidente.

## 8.3 `/app/incidents/:incidentId/command`

Deve concentrar:

- mapa do incidente;
- reports e areas demarcadas;
- missing persons;
- risk areas;
- tarefas e despacho;
- simulacao contextual;
- log de decisao.

## 8.4 `/app/map`

Deve ser o mapa operacional generalista:

- overlays;
- clusters;
- filtros;
- selecao de incidente;
- modo desenho;
- leitura de sensores e hotspots.

## 8.5 `/app/resources`

Deve unificar:

- abrigos;
- pontos de apoio;
- estoques;
- meios e equipes;
- gargalos logisticos.

## 8.6 `/app/field`

Deve suportar:

- equipes voluntarias;
- atribuicao de tarefas;
- checklist de campo;
- confirmacao de execucao;
- sincronizacao eventual.

## 8.7 `/app/analytics`

Deve consolidar:

- risco composto;
- hotspots;
- tendencias;
- panorama global;
- confianca e qualidade de dados;
- explicabilidade dos modelos.

## 8.8 `/app/simulations`

Deve focar em:

- configuracao de cenario;
- variaveis fisicas e operacionais;
- comparacao de runs;
- impacto estimado;
- exportacao e compartilhamento.

## 9. Roadmap executivo

## Fase 0. Contrato e limpeza

- consolidar inventario de rotas atuais;
- congelar nomes de dominio;
- revisar docs e contratos de API;
- remover descricoes aspiracionais em conflito com o codigo.

## Fase 1. Router e access control

- introduzir route manifest;
- criar guards por role e capability;
- separar shells publico, operacional e admin.

## Fase 2. Dominio incident-centric

- transformar incidente em agregado central do frontend;
- mover reports, searched areas e rescue support para dentro do contexto do incidente;
- introduzir `IncidentCommandShell`.

## Fase 3. Dados e observabilidade

- consolidar services;
- cache por dominio;
- erros e loading padronizados;
- telemetria de navegacao e performance.

## Fase 4. UX operacional

- redesenhar overview, map, command e resources;
- mobile first para campo;
- acessibilidade e navegacao orientada a tarefas.

## Fase 5. Remocao de legado

- remover aliases;
- eliminar paginas redundantes;
- apagar services e hooks obsoletos;
- estabilizar testes e contratos.

## 10. Definicao de pronto

A refatoracao sera considerada entregue quando:

- cada rota tiver dono funcional claro;
- cada pagina tiver escopo sem sobreposicao;
- cada papel tiver acessos coerentes;
- o incidente for a unidade primaria da operacao;
- analytics e simulacao consumirem contratos consistentes com os modelos documentados;
- o frontend deixar de depender de nomes legados e aliases historicos.

## 11. Decisao arquitetural central

O frontend nao deve mais ser organizado como colecao de dashboards. Ele deve ser reorganizado como sistema de comando orientado por incidente, com capacidades transversais de mapa, analytics, simulacao, recursos e governanca.
