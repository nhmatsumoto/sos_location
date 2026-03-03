# Levantamento CORS e Integração (Frontend ↔ Backend)

## Escopo
Análise de aderência entre contratos de integração usados no frontend React e rotas/headers disponibilizados pelo backend Django.

## Pontos identificados

1. **Divergência de rotas de integração**
   - Frontend consumia endpoints no padrão `/api/integrations/*`.
   - Backend registrava nomes `integrations_*`, porém apontando para caminhos sem prefixo `/integrations` (ex.: `/api/weather/forecast`).
   - **Risco**: erro 404 no frontend para serviços de integrações.

2. **CORS preflight com headers rígidos**
   - Middleware CORS devolvia lista fixa em `Access-Control-Allow-Headers`.
   - Clientes podem enviar headers adicionais em preflight (ex.: `X-Correlation-Id`, headers de tracing/proxy).
   - **Risco**: bloqueio de requests cross-origin legítimas.

3. **CORS com cache de preflight não explícito**
   - Não havia `Access-Control-Max-Age`.
   - **Impacto**: preflight excessivo e degradação de latência em operações contínuas.

4. **Configuração CORS parcialmente documentada**
   - `.env.example` não expunha parâmetros para métodos/headers/max-age.
   - **Impacto**: baixa governança para ajuste por ambiente.

## Ajustes implementados

- Rotas `integrations_*` corrigidas para caminhos com prefixo `/api/integrations/*`.
- Middleware CORS evoluído para:
  - aceitar configuração por env de métodos/headers;
  - refletir `Access-Control-Request-Headers` quando presente;
  - preservar `Vary` existente e adicionar `Origin`;
  - incluir `Access-Control-Max-Age` configurável.
- `.env.example` atualizado com chaves novas de CORS avançado.
- Testes automatizados adicionados para validar:
  - preflight CORS em origem permitida;
  - contrato de rotas `/api/integrations/*` esperado pelo frontend.

## Estratégia de rollback

- Reverter commit único desta entrega (`git revert <sha>`).
- Em emergência operacional, manter fallback de origem local via `CORS_ALLOW_LOCALHOST_ANY_PORT=True`.

