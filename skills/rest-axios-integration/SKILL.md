---
name: rest-axios-integration
description: Use this skill for REST integrations using Axios with centralized client, timeout, error fallback, and typed responses.
---

# REST + Axios Integration

## Padrão
- `services/apiClient.ts`: baseURL e timeout.
- `services/*Api.ts`: métodos por recurso (list/create/update/delete).
- Tipos de resposta em `types/`.
- Fallback e mensagens para indisponibilidade temporária.
