---
name: django-clean-architecture-rescue
description: Use this skill when implementing Django backend modules for rescue operations using SOLID, Clean Architecture, DDD boundaries, and clean code patterns.
---

# Django Clean Architecture (Rescue)

## Objetivo
Estruturar backend Python/Django modular, orientado a domínio e fácil manutenção.

## Estrutura recomendada por contexto
- `domain/`: entidades, value objects, regras de negócio puras.
- `application/`: casos de uso (commands/queries), portas e DTOs.
- `infrastructure/`: ORM, repositórios concretos, integrações externas.
- `interfaces/`: views/serializers/controllers REST.

## Regras de arquitetura
- Dependência sempre aponta para dentro (domain não conhece Django).
- Use interfaces (ports) para abstrair persistência e integrações.
- Serviços de aplicação orquestram casos de uso, não regras de domínio.
- Repositórios fazem tradução entre ORM e objetos de domínio.

## Workflow
1. Definir bounded context (`rescue`, `alerts`, `volunteers`).
2. Modelar agregados e invariantes no domínio.
3. Criar casos de uso explícitos (create/update/dispatch/close).
4. Implementar adapters Django/ORM sem vazar regra de negócio.
5. Escrever testes por camada (unit domain + integration api).

## Padrões sugeridos
- Repository Pattern
- Service Layer / Use Case Interactor
- Factory para criação de entidades com validação
- Domain Events para auditoria operacional
