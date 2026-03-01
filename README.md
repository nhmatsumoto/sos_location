# MG Location

Plataforma open-source para apoio operacional em desastres (enchentes, deslizamentos e eventos correlatos), com foco em coordenação, geolocalização e integração de dados públicos.

**Produção:** https://mg-location.osei.ong.br

## Comunidade

- **Grupo no Telegram:** https://t.me/+zVye-1dWSdFiMWZl

## Tecnologias do projeto (referências oficiais)

- Django: https://www.djangoproject.com/
- React: https://react.dev/
- TypeScript: https://www.typescriptlang.org/
- PostgreSQL: https://www.postgresql.org/
- Docker: https://www.docker.com/
- OpenStreetMap: https://www.openstreetmap.org/

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

## Deploy no Coolify (produção)

1. No Coolify, crie um novo recurso selecionando **Docker Compose**.
2. Configure o repositório `nhmatsumoto/mg_location` com a branch `master`.
3. Defina o caminho do compose como `docker-compose.yml`.
4. Configure variáveis de ambiente obrigatórias:
   - `SECRET_KEY` com um valor forte e único
   - `DEBUG=False`
   - `VITE_API_BASE_URL` (opcional, recomendável para domínio público, ex.: `https://api.seudominio.com`)
5. Faça o deploy. O backend executa migrações automaticamente e sobe com Gunicorn.

Sugestão de publicação (opcional):
- Frontend: `app.seudominio.com`
- Backend/API: `api.seudominio.com`

## Atualizar stack sem risco de versão antiga

```bash
docker compose down --remove-orphans
docker compose build --no-cache backend frontend
docker compose up -d --force-recreate
docker compose ps
```

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

## Portas oficiais locais (sem legado)

- Frontend atualizado (default): `http://localhost:8088`
- API backend (default): `http://localhost:8001`

As portas são configuráveis por ambiente no `docker-compose`:

- `FRONTEND_PORT` (default `8088`)
- `BACKEND_PORT` (default `8001`)

Exemplo para evitar conflito de porta já ocupada:

```bash
FRONTEND_PORT=8090 BACKEND_PORT=8002 docker compose up --build
```

## Licença

MIT.
