# Setup de Ambiente (Dev/Produção) com Docker + Auth

## Objetivo
Padronizar a execução local e de produção com:
- backend + frontend + postgres + risk-agent em Docker Compose;
- autenticação por login/senha e logout via sessão Django;
- login federado via Google OAuth2 (ID token);
- seed inicial de usuário administrador.

## Variáveis principais
Use `.env` baseado em `.env.example`.

- `DEBUG` (`True` em dev, `False` em produção)
- `SECRET_KEY` (obrigatório em produção)
- `ALLOWED_HOSTS`
- `CORS_ALLOWED_ORIGINS`
- `CSRF_TRUSTED_ORIGINS`
- `GOOGLE_OAUTH_CLIENT_ID` (necessário para `/api/auth/google`)
- `SEED_ON_STARTUP=true|false` (executa `manage.py seed_auth` no boot do backend)

## Rodando em desenvolvimento
```bash
docker compose up --build
```

Serviços:
- Frontend: `http://localhost:8088`
- Backend API: `http://localhost:8001/api`

## Seed inicial
Com `SEED_ON_STARTUP=true`, no startup do backend será garantido:
- usuário: `admin`
- senha: `admin123456`
- perfil: `is_staff=True`, `is_superuser=True`

Para executar manualmente:
```bash
python manage.py seed_auth
```

## Endpoints de autenticação
- `POST /api/auth/login` `{ "username": "...", "password": "..." }`
- `POST /api/auth/logout`
- `GET /api/auth/session`
- `POST /api/auth/google` `{ "credential": "<google_id_token>" }`

## Produção (baseline)
- `DEBUG=False`
- `SECRET_KEY` forte e rotacionável
- cookies seguros (`SESSION_COOKIE_SECURE=True`, `CSRF_COOKIE_SECURE=True`)
- `SECURE_SSL_REDIRECT=True` atrás de proxy TLS
- `ALLOWED_HOSTS` e `CSRF_TRUSTED_ORIGINS` estritos
- `GOOGLE_OAUTH_CLIENT_ID` do projeto OAuth publicado
