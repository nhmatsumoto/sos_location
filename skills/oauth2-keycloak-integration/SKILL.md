---
name: oauth2-keycloak-integration
description: Use this skill when planning or implementing OAuth2/OIDC authentication with Keycloak in React and Django backends.
---

# OAuth2 + Keycloak Integration

## Diretriz
- Usar OIDC Authorization Code + PKCE no frontend.
- Backend valida token JWT e aplica autorização por papel.
- Definir refresh/session strategy e logout centralizado.

## Checklist
- realm/client configurados
- roles e scopes mapeados
- route guards no frontend
- middleware de auth no backend
