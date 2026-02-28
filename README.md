# MG Location

Plataforma open-source para apoio operacional em desastres (enchentes, deslizamentos e eventos correlatos), com foco em coordenação, geolocalização e integração de dados públicos.

**Produção:** https://mg-location.osei.ong.br

## Novidades recentes

- ✅ **Data Hub de integrações públicas** para clima, alertas oficiais, transparência e satélite.
- ✅ **Cache + resiliência HTTP** (retry/backoff/circuit breaker) para chamadas externas.
- ✅ **Cadastro simplificado de desaparecidos no mapa** com persistência no banco.
- ✅ **Persistência de coordenadas (`lat`,`lng`)** em `MissingPerson`.
- ✅ **Layout operacional atualizado** com:
  - caixa de notificações,
  - caixa de ferramentas,
  - caixa de informações relevantes do local.

## Estrutura de documentação

Toda a documentação do projeto foi centralizada em `docs/`:

- [docs/README.md](./docs/README.md)
- [Visão geral e objetivo](./docs/VISION_AND_GOALS.md)
- [Regras de domínio](./docs/DOMAIN_RULES.md)
- [Funcionalidades](./docs/FEATURES.md)
- [Implementações](./docs/IMPLEMENTATIONS.md)
- [Ideias/Roadmap](./docs/IDEAS.md)
- [Política de uso](./docs/USAGE_POLICY.md)
- [Checklist de implementações](./docs/IMPLEMENTATION_CHECKLIST.md)
- [Checklist de testes de segurança](./docs/SECURITY_TEST_CHECKLIST.md)
- [Integrações externas](./docs/INTEGRATIONS.md)
- [Diagramas](./docs/diagrams/ARCHITECTURE.md)

## Rodando localmente

### Backend (Django)

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

### Frontend (assets servidos pelo Django)

Acesse: `http://localhost:8000`

## Endpoints principais

### Operacionais
- `POST /api/calculate`
- `GET,POST /api/missing-persons`
- `GET /api/missing-people.csv`
- `GET /api/hotspots`
- `GET /api/rescue-support`
- `GET /api/terrain/context`

### Data Hub
- `GET /api/weather/forecast`
- `GET /api/weather/archive`
- `GET /api/alerts`
- `GET /api/transparency/transfers`
- `GET /api/transparency/search`
- `GET /api/satellite/layers`
- `GET /api/satellite/stac/search`
- `GET /api/satellite/goes/recent`

## Segurança

Consulte [SECURITY.md](./SECURITY.md) e [docs/SECURITY_TEST_CHECKLIST.md](./docs/SECURITY_TEST_CHECKLIST.md).

## Contribuição

Veja [CONTRIBUTING.md](./CONTRIBUTING.md).

## Licença

MIT.
