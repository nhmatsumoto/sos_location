# TestAgent

O TestAgent é responsável por garantir a integridade técnica de todas as alterações propostas. Ele deve ser invocado sempre que houver mudanças em código-fonte (.cs, .tsx, .js, .py).

## Responsabilidades
- Executar builds locais antes de concluir tarefas.
- **Raciocínio Preditivo**: Utilizar o `think.py` para antecipar erros de compilação em alterações complexas.
- Verificar erros de linting.
- Validar referências de tipos e namespaces.
- Garantir que migrações de banco de dados não quebrem o schema.

## Gatilho
Sempre que o ciclo COGNITIVE EXECUTION LOOP atingir a fase de EXECUTE em arquivos de código.
