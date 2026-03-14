# Skill: PREDICTIVE_REASONING_ANALYSIS

Este padrão utiliza inteligência artificial de raciocínio profundo (LLM Reasoning) para identificar falhas silenciadas antes da compilação.

## Quando usar
- Após modificações estruturais no `Program.cs`.
- Ao adicionar novos Middlewares ou chamadas de métodos de extensão.
- Quando houver dependências complexas entre camadas DDD.

## Workflow de Uso
1. **Captura de Mudança**: O agente identifica o diff gerado.
2. **Invocação do Raciocinador**:
   ```bash
   python3 .workflow/tools/think.py "Analise este diff em busca de erros de namespace no .NET 10: [CONTEÚDO DO DIFF]"
   ```
3. **Avaliação Crítica**: Se o modelo identificar falhas (ex: missing using for RateLimiting), o agente deve aplicar a correção imediatamente ANTES de tentar o build.

## Objetivo
Reduzir a frequência de erros de compilação triviais (CS1061, CS0246) que interrompem o fluxo de deploy.
