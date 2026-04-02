# Autorizacao e Papeis

## Estado atual

Os papeis reais observados em [realm-export.json](/home/nhmatsumoto/sos_location/infra/keycloak/realm-export.json) sao:

- `public`
- `volunteer`
- `coordinator`
- `admin`

No frontend atual:

- quase todo `/app/*` exige apenas autenticacao;
- apenas `/app/tactical-approval` e `/app/admin/sources` exigem `admin`.

Isso significa que o backend e o provedor de identidade ja conhecem papeis, mas a navegacao e os guards ainda nao usam esses papeis como contrato completo de produto.

## Regras vigentes no frontend

Publico:

- `/`
- `/docs`
- `/transparency`
- `/transparency/:id`
- `/login`

Privado autenticado:

- todas as demais rotas em `/app/*`

Privado `admin`:

- `/app/tactical-approval`
- `/app/admin/sources`

## Modelo recomendado

### `public`

Pode:

- consultar portal de transparencia;
- visualizar incidentes publicos;
- acessar documentacao;
- receber comunicacao de risco.

Nao pode:

- operar mapa tatico;
- editar incidentes;
- criar areas, tarefas ou simulacoes.

### `volunteer`

Pode:

- acessar tarefas de campo;
- registrar atualizacao de execucao;
- consultar incidentes e mapas vinculados ao trabalho atribuido.

Nao deve:

- administrar fontes de dados;
- alterar integrações;
- aprovar fluxos administrativos globais.

### `coordinator`

Pode:

- abrir e gerenciar incidentes;
- operar mapa tatico;
- acionar simulacoes;
- coordenar recursos e equipes;
- consumir analytics operacionais.

Nao deve:

- gerir usuarios e políticas globais;
- alterar catalogo administrativo sem trilha formal.

### `admin`

Pode:

- tudo que `coordinator` pode;
- administrar fontes de dados, aprovacoes, auditoria e configuracoes;
- gerir acessos e catalogos.

## Capabilities alvo

O frontend refatorado deve usar capabilities explicitas alem de role bruta:

- `incident.read`
- `incident.write`
- `map.operate`
- `resource.manage`
- `simulation.run`
- `integration.read`
- `integration.write`
- `admin.audit`
- `admin.approval`

Isso evita espalhar `if role === 'admin'` pela interface e simplifica migracoes futuras.

## Decisao

O contrato de acesso a ser perseguido pelo frontend e:

- role define escopo organizacional;
- capability define acao autorizada;
- rota, menu e botao usam o mesmo manifesto de permissao.

O detalhamento operacional dessa migracao esta em [FRONTEND_TOTAL_REFACTOR_PLAN.md](/home/nhmatsumoto/sos_location/docs/FRONTEND_TOTAL_REFACTOR_PLAN.md).
