# MG Location: Mapa Tático Resiliente e Sala de Situação 3D v1.2

![MG Location Banner](https://img.shields.io/badge/MG--Location-Resilience--v1.1-blueviolet?style=for-the-badge)
![Status Build](https://img.shields.io/badge/Build-Passing-success?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

[English](./README.md) | [日本語](./README.ja.md) | **Português**

**MG Location** é um sistema de suporte à decisão e coordenação operacional para cenários de desastres naturais (enchentes, deslizamentos, crises humanitárias). O objetivo principal é garantir **100% de disponibilidade operacional**, mesmo sob falha catastrófica de infraestrutura de rede.

---

## 🎯 Nossa Missão
Transformar dados complexos em ações táticas imediatas. O MG Location não é apenas um dashboard, é uma ferramenta de campo projetada para funcionar onde a internet não chega.

---

## 🏗️ Arquitetura de Resiliência (v1.2)

A versão 1.2 consolidou o redesenho **Resilience-First** e a nova camada de **Visualização Tática**, focada em quatro pilares fundamentais:

```mermaid
graph TD
    subgraph "Interface Tática 2.0"
        UI[PWA Frontend] --> T3D[Sala de Situação 3D]
        UI --> SPT[Scatter Plot Tático]
        UI --> MCP[Captura de Pontos de Precisão]
        T3D -.->|Estado Compartilhado| SPT
    end

    subgraph "Campo / Offline"
        UI --> DB[(IndexedDB)]
        DB --> OB[Fila Outbox]
    end

    subgraph "Proxy Tático"
        EH[Edge Hub / RPi] 
        EH -->|Sincronia Local| OB
    end

    subgraph "Infraestrutura Global"
        API[Django REST API]
        MP[MessagePack + Zstd]
        EV[Event Store / DDD]
        API --> EV
    end

    OB -.->|Sincronia Binária| MP
    MP -.-> API
    EH -.->|Backhaul| API
```

1. **Local-first (Offline Outbox)**: O app PWA funciona sem internet usando IndexedDB. Ações são enfileiradas e sincronizadas automaticamente quando houver conectividade.
2. **Protocolo Binário (MessagePack + Zstd)**: Substituímos o JSON pesado por MessagePack comprimido com Zstandard, reduzindo o tráfego de dados em até 80%.
3. **Event-Souring (DDD)**: Todas as alterações no sistema são tratadas como eventos imutáveis com reconciliação automática de conflitos.
4. **Visualização 3D Imersiva**: Nova camada de renderização espacial para consciência situacional profunda em tempo real.

---

## 🚀 Como Funciona

### 1. Sala de Situação 3D (v1.2)
Ambiente tático imersivo usando **Three.js** para visualizar eventos como "beacons" 3D pulsantes. Oferece percepção de profundidade e clusterização espacial de desastres.

### 2. Análise Tática (Scatter Plot 2.0)
Análise temporal avançada integrada ao mapa. Permite identificar padrões e tendências de severidade ao longo do tempo.

### 3. Captura de Pontos de Precisão
Sistema de mira tática (crosshair) para marcação de coordenadas com alta precisão. Integrado a ícones semânticos (Lucide) para classificação instantânea de relatórios de campo.

### 4. Operações de Busca e Resgate
Módulo tático para atribuição de tarefas, demarcação de áreas de busca e acompanhamento de equipes em campo.

---

## 🛠️ Stack Tecnológica

- **Frontend**: React 19, Vite, Tailwind CSS, **@react-three/fiber** (Ambiente 3D).
- **Backend**: Django 5.x, Django REST Framework (Core robusto).
- **Dados**: Postgres + Redis (Central) | IndexedDB (Local/App).
- **Protocolos**: MessagePack, Zstandard, RESTful Events.
- **SSO/Auth**: Keycloak (Gerenciamento de identidades nível Enterprise).

---

## 💻 Iniciando o Desenvolvimento

### Pré-requisitos
- Docker & Docker Compose
- Node.js / Bun (opcional para local)
- Python 3.11+ (opcional para local)

### Rápido (Docker)
```bash
./dev.sh up
```
- **App**: `http://localhost:8088`
- **API**: `http://localhost:8001`

### Semente de Dados (Importante)
Para ver o sistema populado com dados de simulação de enchentes em Ubá (MG):
```bash
./dev.sh seed
```

---

## 🤝 Convite para Contribuição

Este é um projeto **Open Source** com impacto social real. Precisamos de ajuda em várias frentes:

- **Desenvolvedores**: Otimização de algoritmos de sincronização, novos módulos de IA.
- **Especialistas em UX**: Melhoria da interface para uso sob stress e alta luminosidade.
- **Especialistas em GIS**: Integração de mais modelos de terreno e camadas de satélite.
- **Analistas de Dados**: Criação de modelos preditivos de risco.

### Como ingressar?
1. Leia nosso [Guia de Onboarding](docs/PROJECT_CONSOLIDATION_MG_LOCATION.md).
2. Explore os [Gaps de Implementação](docs/DEEP_IMPLEMENTATION_GAP_PLAN.md).
3. Abra uma *Issue* ou submeta um *Pull Request* com suas ideias.

---

## 📂 Organização do Projeto

```bash
├── apps/               # Aplicações Django (Backend)
├── frontend-react/     # Aplicação React (Frontend)
├── agents/             # Agentes de IA e Automação
├── docs/               # Documentação profunda e planos
├── dev.sh              # Canivete suíço tático para DX
└── Dockerfile.*        # Definições de ambiente
```

---

## 📑 Documentação Detalhada
- 📖 [Arquitetura Atual](docs/ARCHITECTURE_CURRENT.md)
- ⚖️ [Políticas de Transparência](docs/PRIVACY_TRANSPARENCY_POLICY.md)
- 🧪 [Plano de Testes](docs/SECURITY_TEST_CHECKLIST.md)

---

**MG Location © 2026** - Desenvolvido para salvar vidas com tecnologia resiliente.
