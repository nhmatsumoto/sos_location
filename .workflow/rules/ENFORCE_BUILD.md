# Rule: ENFORCE_BUILD_BEFORE_RELEASE

mode: mandatory
priority: high

Ações:
1. Qualquer modificação em `.cs` requer `dotnet build`.
2. Qualquer modificação em `.tsx` requer `bun run build` (se disponível no ambiente).
3. O status de falha de build deve ser tratado como bloqueador do ciclo de aprendizado.
