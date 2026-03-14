# Skill: VERIFY_TECHNICAL_INTEGRITY

Este padrão deve ser seguido rigorosamente para evitar falhas de build frequentes detectadas no ambiente de CI/Docker.

## Passos de Execução

1. **Compilação Incremental**:
   - Para .NET: `dotnet build <SLN/SLNX> -c Release`
   - Para Frontend: `bun run build` (ou comando equivalente do ecossistema)

2. **Verificação de Namespace**:
   - Antes de adicionar chamadas de métodos de extensão (ex: RateLimiter), verificar se o `using` correspondente existe.
   - Caso falte, o `TestAgent` deve interromper a validação e exigir a correção.

3. **Validação de Contrato**:
   - Garantir que alterações no Backend refletem nos modelos do Frontend.

4. **Regra de Ouro**:
   - NUNCA assumir que o código compila apenas por inspeção visual. O uso da ferramenta `run_command` com o build do projeto é OBRIGATÓRIO após edições.
