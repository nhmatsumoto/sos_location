# Frontend Orchestrator (UX/UI + Resgate)

## Objetivo
Orquestrar melhorias contínuas no frontend para operação em desastres, priorizando usabilidade rápida para voluntários e equipes de resgate.

## Agentes especialistas
1. **UX Navigator Agent**
   - Simplifica navegação entre mapa tático e central operacional.
   - Define fluxos de “ação em 1 clique” para responder ocorrência.

2. **Tailwind Design Agent**
   - Padroniza componentes com Tailwind CSS (cards, formulários, tabelas, estados visuais).
   - Garante consistência visual e contraste para uso em campo.

3. **Rescue Ops Agent**
   - Evolui CRUD operacional (ocorrências, equipe, status).
   - Prioriza SLA: aberto -> em ação -> concluído.

4. **Map Tools Agent**
   - Define ferramentas visuais de mapa: foco em camada de risco, hotspots e pontos de apoio.
   - Mantém integração com tela operacional.

## Backlog orientado a operação
- Persistir tarefas de resgate em API (POST/GET/PUT/DELETE).
- Filtros por prioridade, bairro e equipe.
- Log de atividade por ocorrência.
- Comandos rápidos para despacho e encerramento.
