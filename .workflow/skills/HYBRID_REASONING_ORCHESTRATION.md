# Skill: HYBRID_REASONING_ORCHESTRATION

Este padrão define como alternar entre o modelo principal (Gemini) e modelos Open Source (via NVIDIA API) para otimizar o uso de tokens e garantir a continuidade da engenharia em caso de limites excedidos.

## Cenários de Ativação
1. **Excesso de Contexto**: Quando o diff ou o código fonte exceder o limite confortável de tokens do modelo principal.
2. **Raciocínio Profundo Necessário**: Quando a tarefa exigir validação arquitetural intensa que se beneficie de modelos com Chain of Thought (CoT).
3. **Economia de Recursos**: Offloading de análises de segurança e linting para modelos externos.

## Workflow de Transbordamento (Overflow)
1. **Compressão**: O Agente Orquestrador reduz o contexto para o essencial.
2. **Desvio (Offloading)**:
   - Enviar trechos específicos para o `think.py`.
   - Utilizar modelos Open Source (Kimi-k2.5, Llama 3) para auditoria de segurança e revisão por pares.
3. **Reintegração**: O resultado processado externamente é reinjetado no contexto principal como um "Fato Consolidado" para economizar janelas de atenção.

## Modelos Preferenciais (Fallback)
- **Deep Reasoning**: Moonshot Kimi-k2.5 (atual).
- **General Coding**: Llama 3.1 405B ou Mistral Large 2 (conforme disponibilidade na NVIDIA API).
