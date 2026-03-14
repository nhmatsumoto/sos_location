# Rule: TOKEN_EFFICIENCY_AND_HYBRID_FALLBACK

mode: adaptive
priority: high

## Diretrizes
1. **Preferência por Modelos OS**: Para tarefas de "Deep Thinking" (análise de risco, auditoria de segurança, detecção de bugs complexos), prefira o uso do `think.py` (Kimi-k2.5) para preservar a janela de tokens do Gemini para orquestração e geração de código.
2. **Fallback por Excedente**: Caso o sistema atinja limites de quota do modelo principal, o orquestrador deve mudar automaticamente para modo `Offload`, delegando a validação técnica total para o pool de modelos Open Source disponíveis via NVIDIA API.
3. **Padrão de Resposta**: Respostas vindas de modelos externos devem ser marcadas como `[EXTERNAL_REASONING_SIGNAL]` no contexto interno para rastreabilidade.

## Limites de Contexto
- Se o arquivo a ser analisado for > 500 linhas, **sempre** use o `think.py` para um resumo técnico prévio antes de processar no modelo principal.
