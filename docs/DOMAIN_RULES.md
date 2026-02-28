# Regras de Domínio

## Missing Person
- Cadastro mínimo: `personName` + `lastSeenLocation`.
- `lat`/`lng` são opcionais, mas recomendados para mapa.
- Campos ausentes de contato/cidade podem receber default de plataforma.

## Alertas
- Alertas podem vir de feed CAP, RSS ou Atom.
- Normalização para schema interno único é obrigatória.
