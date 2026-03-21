# SOS Location v2.0.0 — Plataforma Humanitária de Resposta a Desastres

![SOS Location Banner](https://img.shields.io/badge/SOS--Location-2.0.0__Humanitarian__Operations-blueviolet?style=for-the-badge)
![Status Build](https://img.shields.io/badge/Build-Passing-success?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

[English](./README.md) | [日本語](./README.ja.md) | **Português**

O **SOS Location** é uma plataforma de apoio à decisão, coordenação tática e resposta operacional para cenários de desastres naturais e crises humanitárias.

## 🌱 Origem do projeto

Este projeto nasceu inspirado no **brumadinho_location** e amadureceu com experiências reais de engenharia e campo:

- histórias e aprendizados do contexto de Brumadinho;
- influência de iniciativas como o **PLATEAU**;
- conversas com pesquisadores e professores;
- uso intensivo de IA para acelerar implementação e evolução de funcionalidades;
- experiência prática em arquitetura e desenvolvimento de software distribuído.

> Para o autor, o SOS Location é um propósito de vida: **salvar vidas usando tecnologia e conhecimento técnico**.

---

## 🎯 Objetivo do projeto

Construir uma plataforma resiliente que integre dados geoespaciais, climáticos, logísticos e operacionais para:

- reduzir tempo de resposta em emergências;
- apoiar decisão estratégica com dados confiáveis em tempo real;
- aumentar coordenação entre poder público, defesa civil, voluntários e sociedade;
- manter operação mesmo com conectividade limitada (estratégia offline-first).

## 🫀 Missão

**Salvar vidas, reduzir danos e fortalecer a capacidade de resposta humanitária com tecnologia aberta, auditável e orientada a dados.**

---

## 💡 Onde essa plataforma pode ser útil? (Casos de Uso)

O SOS Location foi projetado para operar em cenários críticos onde a rapidez e a precisão das informações são fundamentais e capazes de salvar vidas. A plataforma pode ser aplicada de forma prática em:

- **Desastres Naturais (Enchentes, Deslizamentos, Terremotos):** Mapeamento 3D dinâmico da área afetada, identificação de zonas de risco extremo e rotas bloqueadas, auxiliando de forma decisiva na busca e localização de vítimas.
- **Coordenação de Resgate e Defesa Civil:** Fornece um painel tático (High-Definition Tactical View) em tempo real centralizado, permitindo aos centros de comando direcionar equipes de campo (bombeiros, socorristas, médicos, voluntários) para as áreas de maior urgência.
- **Logística Humanitária e Gestão de Crise:** Organização ágil de suprimentos, mapeamento de rotas seguras para escoamento e definição estratégica de pontos de apoio e abrigos temporários.
- **Monitoramento e Prevenção de Risco:** Integração com dados topográficos e alertas climáticos em tempo real para antecipar áreas de transbordamento ou deslizamento, apoiando a evacuação preventiva das comunidades.

---

## 🧭 Governança do projeto

A governança do SOS Location segue princípios de impacto social, responsabilidade técnica e transparência:

- **Governança Humanitária**: decisões de produto priorizam proteção de vidas e comunidades.
- **Governança Técnica**: arquitetura limpa, observabilidade, segurança por padrão e documentação viva.
- **Governança de Dados**: uso responsável de fontes públicas e rastreabilidade das integrações.
- **Governança de IA**: agentes e automações devem apoiar engenharia, qualidade e resposta operacional, sempre com supervisão humana.

📄 Documento detalhado: [docs/GOVERNANCE.md](docs/GOVERNANCE.md)

---

## 🧱 Stack tecnológica (mapeada a partir dos arquivos do repositório)

### Frontend e experiência operacional
- **React 19** + **TypeScript 5**
- **Vite 7** (build/dev server)
- **Chakra UI**, **Emotion**, **Framer Motion**
- **Leaflet + React Leaflet + Supercluster** (mapas 2D)
- **Three.js + React Three Fiber + Drei** (simulação/visualização 3D)
- **Zustand**, **React Hook Form**, **Zod**
- **i18next** (internacionalização)
- **Keycloak JS** (autenticação no frontend)

### Backend e domínio
- **ASP.NET Core Web API (.NET 10)**
- **Clean Architecture + DDD + CQRS (MediatR)**
- **FluentValidation**
- **Entity Framework Core 10** + **Dapper**
- **PostgreSQL 15** + **Npgsql**
- **SignalR** (tempo real)
- **Serilog** (logging estruturado)
- **Swashbuckle/Swagger** (documentação de API)

### Unidade de risco e IA aplicada
- **Python** com **FastAPI** + **Uvicorn**
- **Pandas**, **Scikit-learn**, **PyTorch**
- **APScheduler** (tarefas agendadas)

### Infraestrutura e operações
- **Docker Compose** (orquestração local)
- **Keycloak 26** (SSO / IAM)
- **Dozzle** (observabilidade de logs em containers)
- **PostgreSQL backups** (serviço dedicado de backup)
- Estratégia de integração com provedores externos: **OpenTopography**, **Overpass/OSM**, **Open-Meteo**, **INMET**, **CEMADEN**, **Defesa Civil**, **IBGE**.

### Agentes e habilidades de engenharia
- Catálogo de agentes em `.workflow/agents` e `docs/agents`.
- Skills operacionais e de desenvolvimento em `agents/skills` e `.workflow/skills`.

📄 Inventário técnico detalhado: [docs/TECHNOLOGY_STACK.md](docs/TECHNOLOGY_STACK.md)

---

## 🚀 Início rápido

```bash
./dev.sh up
```

| Serviço | URL |
|---|---|
| Dashboard de Operações | http://localhost:8088 |
| API Health | http://localhost:8001/api/health |
| Swagger | http://localhost:8001/swagger |
| Unidade de Risco (ML) | http://localhost:8090 |
| Logs (Dozzle) | http://localhost:9999 |
| Keycloak SSO | https://localhost:8080 |

---

## 📚 Documentação do projeto

- [Visão, objetivo e missão](docs/VISION_AND_GOALS.md)
- [Governança](docs/GOVERNANCE.md)
- [Arquitetura](docs/PROJECT_ARCHITECTURE.md)
- [Integrações externas](docs/INTEGRATIONS.md)
- [Política de privacidade e transparência](docs/PRIVACY_TRANSPARENCY_POLICY.md)
- [Auditoria de segurança](docs/SECURITY_AUDIT_REPORT.md)
- [Catálogo de agentes](docs/OPS_SPECIALIST_AGENTS.md)

---

## ❤️ Compromisso ético

> [!IMPORTANT]
> O SOS Location existe para **SALVAR VIDAS**. O uso para fins militares, atividades bélicas ou simulações de conflito não está alinhado com os valores humanitários do projeto.

---

**SOS Location © 2026** — Construído para salvar vidas com tecnologia resiliente.
