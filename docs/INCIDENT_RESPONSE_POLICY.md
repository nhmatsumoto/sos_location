# Política de Resposta a Incidentes

## Objetivo

Estabelecer processo mínimo de detecção, contenção, erradicação, recuperação e pós-incidente.

## Severidade (resumo)

- **SEV-1**: indisponibilidade crítica ou vazamento confirmado de dados sensíveis.
- **SEV-2**: falha relevante de segurança com impacto operacional.
- **SEV-3**: incidente moderado/localizado sem impacto amplo.

## Fluxo operacional

1. **Detecção e triagem** (até 30 min)
2. **Contenção inicial** (até 60 min)
3. **Evidências e investigação** (logs, timeline, escopo)
4. **Erradicação e correção**
5. **Recuperação validada**
6. **Post-mortem** com ações preventivas

## Comunicação

- Canal primário: time técnico responsável pelo repositório.
- Comunicação a partes interessadas conforme severidade e requisitos legais (LGPD/APPI/GDPR quando aplicável).

## Registro mínimo

- Data/hora UTC
- Vetor do incidente
- Sistemas afetados
- Dados potencialmente impactados
- Medidas adotadas
- Ações corretivas e prazo
