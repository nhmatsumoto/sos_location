# MG Location — Centro de Comando para Resgate e Voluntariado (MG)

Plataforma open-source para apoiar operações de resposta a desastres (enchentes, deslizamentos, rompimentos e eventos correlatos), conectando **coordenação tática**, **coleta de relatos em campo** e **visualização geoespacial** para acelerar decisões de busca, salvamento e prevenção.

**Produção:** https://mg-location.osei.ong.br

---

## Estado do Projeto

O repositório está organizado em três frentes principais:

- **Backend:** Django + Django REST Framework (APIs de incidentes, alertas, busca e suporte tático).
- **Frontend Web:** React + Leaflet + Three.js (centro de comando com mapa e camadas visuais).
- **App Mobile (Flutter):** captura de dados em campo (relatos, mídia e registro de dispositivos para push).

> Status atual: o `docker-compose` do repositório está focado no frontend web e é prioridade evoluir para stack completa (frontend + backend + persistência + serviços auxiliares).

---

## Como Você Pode Ajudar

### Para devs

- Corrigir e simplificar setup de desenvolvimento local.
- Evoluir o `docker-compose` para ambiente completo de ponta a ponta.
- Melhorar APIs (validação, paginação, autenticação, contratos e documentação).
- Evoluir UX do mapa (camadas, filtros, desempenho e acessibilidade).
- Melhorar ingestão de mídia e pipeline de processamento (`/api/splat/convert`).
- Adicionar observabilidade (logs estruturados, métricas, traces, health checks).
- Criar testes automatizados (backend e frontend) e fixtures de dados de exemplo.

### Para voluntários não devs

- Coletar relatos de campo (localização, contexto e evidências).
- Validar qualidade de dados (duplicidade, inconsistências e atualização de status).
- Ajudar no mapeamento de áreas já vistoriadas e áreas de risco.
- Apoiar revisão textual e comunicação para públicos locais.

---

## 5 minutos para rodar (Docker Compose)

> O `docker-compose.yml` atual sobe o frontend em container na porta `8080`.

```bash
git clone https://github.com/<seu-user>/mg_location.git
cd mg_location
docker compose up --build
```

Acesse: **http://localhost:8080**

---

## Desenvolvimento Local

### Backend (Django)

Pré-requisitos sugeridos:

- Python 3.10+
- `pip`

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

API local: `http://localhost:8000/api/...`

### Frontend (React + Vite)

Pré-requisitos sugeridos:

- Node.js 20+
- npm

```bash
cd frontend-react
npm install
npm run dev
```

Frontend local: `http://localhost:5173`

### Mobile (Flutter)

```bash
cd flutter_capture_app
flutter pub get
flutter run
```

> Configure o `apiBaseUrl` em `flutter_capture_app/lib/main.dart` apontando para o backend acessível pelo dispositivo/emulador.

---

## Arquitetura e APIs

### Evolução planejada: renderização 3D + análise preditiva

Como próximo passo do MG Location, vamos incorporar um pipeline voltado para nuvens de pontos (Point Cloud):

1. **Renderização 3D de dados de campo** usando uma biblioteca como **Potree** (ou alternativa compatível), permitindo inspeção espacial de áreas críticas.
2. **Enriquecimento com dados climáticos e geométricos** para compor features de risco.
3. **Inferência com modelos de machine learning** treinados para **estimar áreas de soterramento**.
4. **Integração no fluxo operacional** para que visualização 3D e predição convivam no centro de comando, apoiando priorização de buscas em tempo real.

Essa linha de evolução será implementada de forma incremental, com validação por cenários reais e comparação contínua entre predição e evidências coletadas em campo.

### Estrutura principal do repositório

- `core/` — configuração central do projeto Django (`settings.py`, `urls.py`).
- `apps/api/` — endpoints REST para operação e suporte a resposta.
- `apps/map/` — rotas/templates do mapa no backend.
- `frontend-react/` — aplicação web (React + Leaflet + Three.js).
- `flutter_capture_app/` — app mobile para captura em campo.
- `templates/`, `static/` — assets e páginas do backend.
- `geolocations_service/` — serviço legado/experimental relacionado a geolocalizações.

### Endpoints disponíveis (`/api`)

- `POST /api/calculate`
- `GET /api/hotspots`
- `GET, POST /api/collapse-reports`
- `GET /api/rescue-support`
- `POST /api/location/flow-simulation`
- `GET, POST /api/searched-areas`
- `GET, POST /api/report-info`
- `GET /api/missing-people.csv`
- `POST /api/identify-victim`
- `GET /api/cfd/ideas`
- `GET, POST /api/splat/convert`
- `POST /api/push/register`
- `GET, POST /api/attention-alerts`

---

## Prioridades Atuais (P0)

1. **Docker Compose completo** (frontend + backend + banco + volumes + rede + variáveis).
2. **Dados de exemplo/seed confiáveis** para demo local e QA.
3. **Documentação de setup única e reproduzível** (onboarding em minutos).
4. **Padronização de contratos da API** (erros, status, validações, schemas).
5. **Fluxo mínimo de observabilidade e saúde** (`/health`, logs e checks básicos).

👉 **Chamada para ação:** escolha uma dessas prioridades, abra uma issue/PR e ajude a acelerar o impacto do projeto.

---

## Segurança e Uso Responsável

Este projeto pode lidar com dados sensíveis de pessoas em situação de risco. Portanto:

- Não publique dados pessoais sem base legal e sem necessidade operacional.
- Minimize coleta e retenção de dados identificáveis.
- Revise permissões de acesso e sanitização de uploads.
- Reporte vulnerabilidades de forma responsável.

Consulte a política em **[SECURITY.md](./SECURITY.md)**.

---

## Projetos Relacionados

- **Victims Location Prediction:** https://github.com/sosmg-location/victims_location_prediction
- **MG Location Crawlers:** https://github.com/sosmg-location/mg-location_crawlers

---

## Contribuição

Toda ajuda é bem-vinda — código, validação de dados, testes, documentação e operação.

### PR Checklist

Antes de abrir PR, verifique:

- [ ] O escopo está claro e objetivo.
- [ ] A mudança foi testada localmente.
- [ ] Não há segredos/chaves no código ou histórico.
- [ ] Documentação/README atualizados quando necessário.
- [ ] Endpoints/contratos alterados foram descritos.
- [ ] Issue relacionada foi referenciada (quando aplicável).

Também consulte **[CONTRIBUTING.md](./CONTRIBUTING.md)** para orientações de convivência e colaboração.

---

## Licença

Distribuído sob licença **MIT**.

---

## Apoie o MG Location

Se este projeto fizer sentido para você:

- ⭐ Dê uma estrela no repositório
- 🔁 Compartilhe com outras pessoas e comunidades
- 🤝 Contribua com código, dados, validação e operação

Juntos, conseguimos entregar uma resposta mais rápida, coordenada e humana em cenários de desastre.
