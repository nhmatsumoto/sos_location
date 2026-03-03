# Agentes Especialistas de Operação (DevOps/SRE)

Este documento define **agentes especialistas** para manter o projeto funcional, atualizado e seguro.

## Objetivo

Padronizar decisões rápidas com qualidade operacional para reduzir tempo de recuperação e acelerar entregas seguras.

## Agentes e responsabilidades

### 1) Docker Specialist
- Mantém `docker-compose.yml` enxuto e atualizado.
- Garante healthchecks, ordem de dependências e política de restart.
- Valida com `docker compose config` após qualquer mudança de infraestrutura.

### 2) Container Security Specialist
- Revisa imagens base e versões suportadas.
- Prioriza imagens menores e atualizadas.
- Evita segredos hardcoded em produção e recomenda uso de variáveis/secret manager.

### 3) Infra/DevOps Specialist
- Define checklist mínimo de deploy e rollback.
- Confirma portas, rede e persistência de dados.
- Mantém runbook de incidentes e observabilidade mínima.

### 4) Coolify Specialist
- Garante compatibilidade de variáveis de ambiente e portas publicadas.
- Define estratégia de promoção entre ambientes (staging -> produção).
- Documenta healthcheck de app para auto-healing da plataforma.

### 5) Keycloak Specialist
- Responsável por padrão de autenticação/autorização quando habilitado.
- Define integração OIDC (frontend + backend), escopos e roles.
- Recomenda rotação de segredos e revisão de sessões/tokens.

### 6) React Specialist
- Mantém performance de build, organização de componentes e UX resiliente.
- Garante consumo correto da API por `VITE_API_BASE_URL`.
- Revisa impacto de mudanças em acessibilidade e legibilidade operacional.

### 7) Tailwind CSS Specialist
- Padroniza design system e tokens quando Tailwind estiver em uso.
- Evita regressões visuais e inconsistências de tema.
- Mantém componentes acessíveis para uso em cenários críticos.

## Checklists obrigatórios por tipo de mudança

### Mudança de infraestrutura
1. Atualizar `docker-compose.yml` e documentação relevante.
2. Rodar validação estática:
   - `docker compose config`
3. Recriar stack para evitar versão antiga em cache (quando possível):
   - `docker compose down --remove-orphans`
   - `docker compose build --no-cache backend frontend`
   - `docker compose up -d --force-recreate`
4. Verificar saúde dos serviços:
   - `docker compose ps`
   - `docker compose logs --tail=100 backend frontend postgres`

### Mudança de aplicação (backend/frontend)
1. Rodar testes/lint locais aplicáveis.
2. Confirmar endpoint de health/rota crítica.
3. Verificar compatibilidade com variáveis de ambiente.

## Definição de pronto operacional
- Serviços sobem sem intervenção manual extra.
- Dependências críticas possuem healthcheck.
- Documentação de execução local está atualizada.
- Não há arquivos temporários ou artefatos desnecessários no repositório.
