# SOS Location v3.1 — Humanitarian Disaster Response Platform

![SOS Location Banner](https://img.shields.io/badge/SOS--Location-3.1__Humanitarian__Operations-blueviolet?style=for-the-badge)
![Status Build](https://img.shields.io/badge/Build-Passing-success?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**English** | [Português](./README.pt.md) | [日本語](./README.ja.md)

**SOS Location** is a decision-support and tactical coordination platform for disaster response and humanitarian operations.

## 🌱 Project origin

This project was inspired by **brumadinho_location** and evolved through practical engineering and field-learning inputs:

- lessons from Brumadinho-related response contexts;
- references from initiatives such as **PLATEAU**;
- conversations with researchers and professors;
- intensive AI-assisted coding for implementation speed;
- software architecture and distributed systems experience.

> For the author, SOS Location is a life purpose: **saving lives through technology and knowledge**.

---

## 🎯 Project objective

Build a resilient platform that unifies geospatial, climate, logistics, and operational data to:

- reduce emergency response time;
- support strategic decisions with trustworthy real-time data;
- improve coordination among government, civil defense, volunteers, and communities;
- keep critical operations running even under poor connectivity (offline-first strategy).

## 🫀 Mission

**Save lives, reduce disaster impact, and strengthen humanitarian response capacity through open, auditable, and data-driven technology.**

---

## 🧭 Governance

SOS Location governance is based on social impact, technical accountability, and transparency:

- **Humanitarian Governance**: product decisions prioritize life protection and community resilience.
- **Technical Governance**: clean architecture, observability, secure defaults, and living documentation.
- **Data Governance**: responsible use of public sources and integration traceability.
- **AI Governance**: agents and automations support engineering and operations under human supervision.

📄 Detailed document: [docs/GOVERNANCE.md](docs/GOVERNANCE.md)

---

## 🧱 Technology stack (inferred from repository files)

### Frontend and operations UX
- **React 19** + **TypeScript 5**
- **Vite 7**
- **Chakra UI**, **Emotion**, **Framer Motion**
- **Leaflet + React Leaflet + Supercluster** (2D maps)
- **Three.js + React Three Fiber + Drei** (3D simulation)
- **Zustand**, **React Hook Form**, **Zod**
- **i18next** (localization)
- **Keycloak JS** (frontend auth)

### Backend and domain
- **ASP.NET Core Web API (.NET 10)**
- **Clean Architecture + DDD + CQRS (MediatR)**
- **FluentValidation**
- **Entity Framework Core 10** + **Dapper**
- **PostgreSQL 15** + **Npgsql**
- **SignalR**
- **Serilog**
- **Swagger (Swashbuckle)**

### Risk/AI service
- **Python** with **FastAPI** + **Uvicorn**
- **Pandas**, **Scikit-learn**, **PyTorch**
- **APScheduler**

### Infrastructure and operations
- **Docker Compose**
- **Keycloak 26**
- **Dozzle** (container log observability)
- Dedicated DB backup service
- External integrations: **OpenTopography**, **Overpass/OSM**, **Open-Meteo**, **INMET**, **CEMADEN**, **Defesa Civil**, **IBGE**.

### Agents and skills for engineering orchestration
- Agent catalog under `.workflow/agents` and `docs/agents`.
- Skills under `agents/skills` and `.workflow/skills`.

📄 Detailed inventory: [docs/TECHNOLOGY_STACK.md](docs/TECHNOLOGY_STACK.md)

---

## 🚀 Getting started

```bash
./dev.sh up
```

| Service | URL |
|---|---|
| Operations Dashboard | http://localhost:8088 |
| API Health | http://localhost:8001/api/health |
| Swagger | http://localhost:8001/swagger |
| Risk ML Unit | http://localhost:8090 |
| Logs (Dozzle) | http://localhost:9999 |
| Keycloak SSO | https://localhost:8080 |

---

## 📚 Project documentation

- [Vision, objective, mission](docs/VISION_AND_GOALS.md)
- [Governance](docs/GOVERNANCE.md)
- [Architecture](docs/PROJECT_ARCHITECTURE.md)
- [External integrations](docs/INTEGRATIONS.md)
- [Privacy and transparency policy](docs/PRIVACY_TRANSPARENCY_POLICY.md)
- [Security audit](docs/SECURITY_AUDIT_REPORT.md)
- [Specialist agents catalog](docs/OPS_SPECIALIST_AGENTS.md)

---

## ❤️ Ethical commitment

> [!IMPORTANT]
> SOS Location exists to **SAVE LIVES**. Use for military purposes, warfare activities, or conflict simulations is not aligned with the project's humanitarian values.

---

**SOS Location © 2026** — Built to save lives with resilient technology.
