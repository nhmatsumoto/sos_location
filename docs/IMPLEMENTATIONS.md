# Implementações

## Backend
- Django + endpoints REST em `apps/api/views.py` e `apps/api/views_integrations.py`.
- Persistência de `MissingPerson` com `lat`/`lng`.
- Integrações externas com cache + retry + circuit breaker.

## Frontend
- Layout com painéis operacionais no mapa.
- Formulário simplificado para cadastro.
- Notificações e painel de contexto local.
