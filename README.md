# SOS Location v2.0.0 — The Guardian Beacon

![SOS Location Banner](https://img.shields.io/badge/SOS--Location-2.0.0__City--Scale__GIS-blueviolet?style=for-the-badge)
![Purpose](https://img.shields.io/badge/Purpose-Saving--Lives-red?style=for-the-badge)
![Built with AI](https://img.shields.io/badge/Built--with-AI--Assistance-0096ff?style=for-the-badge)

**English** | [Português](./README.pt.md) | [日本語](./README.ja.md)

> "This project is my purpose in life: to save lives using the knowledge I have. It is the synthesis of years of architectural experience and an intensive, daily collaboration with Generative AI to reach city-scale precision." — *Author's Vision*

**SOS Location** is a resilient, city-scale decision-support platform. Born from the legacy of `brumadinho_location`, it combines professional software architecture with state-of-the-art AI code synthesis to bridge the gap between field reality and strategic command.

---

## 🌟 Vision & Mission

### Our Purpose
Born from the legacy of `brumadinho_location`, this project is a personal mission fueled by the synthesis of professional architecture and **intensive AI collaboration**. Inspired by large-scale urban digital twin projects like **Project PLATEAU** (Japan), and conversations with researchers, professors, and field specialists, SOS Location aims to be the "Guardian Beacon" in the darkest hours.

### Mission
To provide first responders with a "High-Definition Tactical View" of disaster zones. By using AI to leverage billions of data points into actionable 3D environments, we ensure that every second counts when every life is at stake.

---

## 🛠️ Technology Stack (Full Spectrum)

### Frontend (Tactical HUD & 3D WebGL)
- **Core:** React 19 (Strict Mode) + TypeScript 5.7+
- **Build Tool:** Vite 7.0 (Ultra-fast HMR)
- **UI System:** Chakra UI v3 (Custom "Guardian" Theme)
- **State Management:** Zustand 5.0 (Atomic state)
- **Mapping:** React Leaflet + Leaflet.markercluster
- **Visualization:** Three.js (WebGL 2.0 Shaders for 3D City Rendering)
- **Icons:** Lucide React
- **Validation:** Zod
- **i18next** (localization)

### Backend (Clean Architecture & Real-Time)
- **Runtime:** .NET 10.0 (ASP.NET Core)
- **Pattern:** Clean Architecture + CQRS (MediatR)
- **ORM:** Entity Framework Core 10 (Npgsql)
- **Real-Time:** SignalR (Live updates for alerts and missions)
- **Logging:** Serilog (Structured logging to Console/File)
- **Validation:** FluentValidation
- **Docs:** Swagger/OpenAPI (Swashbuckle)

### Database & Security
- **Engine:** PostgreSQL 15 + PostGIS (Spatial queries)
- **SSO/IAM:** Keycloak 26.0 (OpenID Connect / OAuth2)
- **Caching:** In-Memory + PostGIS Indexing

### AI & Risk Intelligence (ML Unit)
- **Core:** Python 3.11+
- **Framework:** FastAPI
- **Libraries:** PyTorch (Neural Risk Models), Scikit-learn, Pandas
- **Strategy:** Intensive use of Generative AI for code synthesis, unit testing, and GIS data normalization.

### Infrastructure & DevOps
- **Containerization:** Docker & Docker Compose
- **Monitoring:** Dozzle (Real-time log viewer)
- **Data Pipeline:** Custom Indexer Services for GIS, Weather, and News.

---

## 🗺️ City-Scale GIS Integration (v2.0.0)
We reconstruct entire cities using cross-border open data:
- **Topography:** OpenTopography (SRTMGL1) — 30m Global DEM.
- **Urban Fabric:** OpenStreetMap via Overpass API (3D Buildings, Road networks).
- **Climate:** Open-Meteo API (Real-time METAR-like weather).
- **Population:** IBGE API (Brasil) & GSI/MLIT (Japan) for cadastral enrichment.

---

## 🏛️ Governance
This project follows a **Sovereign Humanitarian** governance model. Decisions are guided by:
1. **Humanity First:** All features must directly or indirectly serve life-saving efforts.
2. **Resilience:** Systems must function under partial network failure (Synthetic bypasses).
3. **Neutrality:** Open-source core, avoiding vendor lock-in of data sources.
4. **Transparency:** Public dashboards for accountability during crises.

See [GOVERNANCE.md](./docs/GOVERNANCE.md) for detailed protocols.

---

## 📂 Internal Roadmap
- [x] Phase 1-7: Core Infrastructure & Tactical UI
- [x] Phase 8: GIS & Climate Refactor (Real API Integration)
- [ ] Phase 9: Full WebGL City Component (Active Development)
- [ ] Phase 10: Multi-Agency Deployment Cluster

---

## ❤️ Credits & Inspiration
- **Inspired by:** `brumadinho_location` original concept.
- **Architectural Reference:** Project PLATEAU (Digital Twin Japan).
- **Development Tooling:** Antigravity AI, Gemini 2.0 Research.
- **Collaboration:** Insights from researchers, professors, and field specialists.

---

## ⚖️ License & Ethics

> [!CAUTION]
> This platform is **NOT** for military use. It is strictly for humanitarian, civil defense, and environmental protection purposes.

**SOS Location © 2026** — *Protecting the future with knowledge and technology.*
