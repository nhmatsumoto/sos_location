# Fluxo de Orquestração SOS Location (v3.0) - Lifecycle Completo

Este documento define o ciclo de vida obrigatório para qualquer funcionalidade ou alteração no projeto **SOS Location**. O OrchestratorAgent deve garantir que cada fase seja concluída e validada antes da "Entrega Final".

## 1. Agentes Especialistas e Papéis

- **RequirementAgent**: Traduz linguagem natural em Requirements Cards (DDD).
- **BackendAgent**: Implementa lógica em .NET 10 seguindo Clean Architecture.
- **FrontendAgent**: Implementa interfaces em React 19 + Vite com Glassmorphism.
- **DatabaseAgent**: Gerencia schemas PostgreSQL/PostGIS e migrações.
- **TestAgent**: Executa xUnit (.NET) e valida integridade técnica.
- **PerformanceAgent**: Executa testes de carga/stress com K6.
- **SecurityAgent**: Valida headers, RBAC e segredos.
- **ComplianceAgent**: Garante conformidade com LGPD (Brasil) e APPI (Japão).
- **DocAgent**: Mantém a documentação técnica e o repositório organizados.

## 2. Pipeline de Entrega (DoD - Definition of Done)

Para que uma tarefa seja considerada "Pronta", ela deve passar pelo seguinte fluxo:

### Fase A: Engenharia de Requisitos e Dados
1. [Requirement] Definição de Bounded Context e Entidades.
2. [Database] Criação de Migrações e Atualização do Schema.

### Fase B: Implementação de Core
3. [Backend] Implementação da lógica de domínio e serviços.
4. [Frontend] Implementação da UI e integração com API.

### Fase C: Qualidade e Performance
5. [Test] Cobertura de testes de unidade com **xUnit**.
6. [Performance] Teste de carga com **K6** em endpoints críticos.

### Fase D: Segurança e Conformidade
7. [Security] Verificação de vulnerabilidades e Headers.
8. [Compliance] Auditoria de PII (Dados Pessoais) conforme LGPD e normas Japonesas.

### Fase E: Finalização
9. [Doc] Atualização de `docs/` e `README`.
10. [Orchestrator] Validação final via `verify.sh` e `think.py`.

---

## 3. Matriz de Conformidade de Dados (LGPD & Japan APPI)

| Regra | Aplicação | Responsável |
| :--- | :--- | :--- |
| **Minimização (LGPD)** | Coleta apenas o estritamente necessário para o resgate. | ComplianceAgent |
| **Limitação de Acesso (Japão)** | Dados de cidadãos japoneses devem ter log de acesso estrito. | SecurityAgent |
| **Anonimização** | Dados históricos de desastres não devem conter nomes reais. | DatabaseAgent |
| **Direito ao Esquecimento** | Função de delegação de conta operacional. | BackendAgent |
