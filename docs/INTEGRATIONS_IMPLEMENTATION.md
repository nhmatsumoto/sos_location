# Plano de Implementação — Tela de Integrações

> Data: 2026-03-22 | Status: Implementado

---

## 1. Diagnóstico — Bugs e Problemas

### Frontend — `IntegrationsPage.tsx`

| # | Bug | Impacto |
|---|-----|---------|
| F-01 | Toda a página usa Tailwind + `Button`/`TextInput` custom — fora do padrão da plataforma | Visual completamente inconsistente |
| F-02 | Dados exibidos como `<pre>JSON.stringify(...)</pre>` bruto | Completamente ilegível em produção |
| F-03 | `activeLayers` nunca consumido — toggle de camadas não faz nada | Funcionalidade de satélite é decorativa |
| F-04 | Tabs sem estado ativo visual — todos os botões idênticos | Usuário não sabe qual aba está aberta |
| F-05 | Nenhuma aba auto-carrega dados — usuário precisa clicar manualmente | UX muito pobre; aba abre vazia |
| F-06 | Sem loading state em nenhuma aba | Sem feedback durante requisição |
| F-07 | `getAtlasSources`, `getGeeAnalysis`, `getDisasterIntelligence` existem no serviço mas nunca são exibidos | Funcionalidades completamente ocultas |
| F-08 | `loadTransparency` não passa `uf`/`municipio` para o endpoint | Filtros do backend nunca usados |

### Backend — `IntegrationsController.cs`

| # | Bug | Impacto |
|---|-----|---------|
| B-01 | **`GET /integrations/weather/forecast` não existe** | `loadWeather()` sempre retorna 404 — clima completamente quebrado |
| B-02 | **`GET /integrations/alerts` não existe** | `loadAlerts()` sempre retorna 404 — alertas completamente quebrados |
| B-03 | `GetTransparencySummary` retorna valores hardcoded | Exibe dados fictícios como se fossem reais |
| B-04 | `GetAlertsIntelligence` retorna valores hardcoded | Análise de inteligência sempre igual |

---

## 2. Arquitetura — Estado Atual vs Corrigido

```mermaid
flowchart TD
    subgraph Antes["❌ ANTES — Endpoints ausentes"]
        FW["loadWeather()\n→ GET /integrations/weather/forecast"]
        FA["loadAlerts()\n→ GET /integrations/alerts"]
        BE1["IntegrationsController\n❌ weather/forecast não existe\n❌ alerts não existe"]
        FW -->|404| BE1
        FA -->|404| BE1
    end

    subgraph Depois["✅ DEPOIS — Endpoints implementados"]
        FW2["WeatherTab\n→ GET /integrations/weather/forecast"]
        FA2["AlertsTab\n→ GET /integrations/alerts"]
        BE2["IntegrationsController\n✅ weather/forecast → Open-Meteo\n✅ alerts → RAU risk scores"]
        OMA["Open-Meteo API\ntemp, umidade, vento, precipitação"]
        RAU["Risk Analysis Unit\n/api/v1/risk/scores"]
        FW2 --> BE2
        FA2 --> BE2
        BE2 --> OMA
        BE2 --> RAU
    end
```

---

## 3. Diagrama de Componentes — Página Corrigida

```mermaid
graph TB
    subgraph Page["IntegrationsPage"]
        Header["Header\nTítulo + ícone + descrição"]

        subgraph TabBar["Tab Bar — 5 abas"]
            T1["Clima\n(Thermometer)"]
            T2["Alertas\n(AlertTriangle)"]
            T3["Transparência\n(FileText)"]
            T4["Satélite\n(Globe2)"]
            T5["Catálogos\n(Database)"]
        end

        subgraph Content["Conteúdo (GlassPanel por aba)"]
            W["WeatherTab\nInputs lat/lon\nCurrent conditions cards\nForecast 3 dias"]
            A["AlertsTab\nLista de alertas\nSeverity badge\nÁrea afetada"]
            TR["TransparencyTab\nKPIs totais\nTabela de transferências"]
            S["SatelliteTab\nLayer cards com toggle\nLandsat collections"]
            C["CatalogsTab\nIBGE search\nAtlas sources"]
        end
    end

    T1 --> W
    T2 --> A
    T3 --> TR
    T4 --> S
    T5 --> C
```

---

## 4. Sequência — Fluxo de Dados

```mermaid
sequenceDiagram
    actor U as Usuário
    participant P as IntegrationsPage
    participant API as integrationsApi.ts
    participant BE as IntegrationsController
    participant OM as Open-Meteo
    participant RAU as Risk Analysis Unit

    U->>P: Abre /app/integrations
    P->>P: mount → tab="weather"
    P->>API: getWeatherForecast(lat, lon)
    API->>BE: GET /integrations/weather/forecast
    BE->>OM: GET api.open-meteo.com/v1/forecast
    OM-->>BE: {current: temp/humidity/wind, daily: [...]}
    BE->>BE: Transforma → {temperature, humidity, windSpeed, daily[]}
    BE-->>API: WeatherForecastDto tipado
    API-->>P: Renderiza cards de condições

    U->>P: Clica tab "Alertas"
    P->>API: getAlerts()
    API->>BE: GET /integrations/alerts
    BE->>RAU: GET /api/v1/risk/scores
    RAU-->>BE: scores[] com level High/Critical
    BE->>BE: Filtra + transforma em AlertDto[]
    BE-->>API: {items: AlertDto[]}
    API-->>P: Renderiza cards de alertas com severity badges
```

---

## 5. Contrato de Dados — Tipos Corrigidos

```typescript
// WeatherForecastDto — antes era Record<string, unknown>, agora tipado
interface WeatherCurrent {
  temperature:   number;
  humidity:      number;
  windSpeed:     number;
  precipitation: number;
  weatherCode:   number;
}

interface WeatherDay {
  date:             string;
  maxTemp:          number;
  minTemp:          number;
  precipitationSum: number;
  weatherCode:      number;
}

interface WeatherForecastDto {
  source:    string;
  lat:       number;
  lon:       number;
  timezone?: string;
  current?:  WeatherCurrent;
  daily?:    WeatherDay[];
  error?:    string;
}
```

---

## 6. Checklist

- [x] **B-01** — Adicionar `GET /integrations/weather/forecast` → Open-Meteo
- [x] **B-02** — Adicionar `GET /integrations/alerts` → RAU risk scores High/Critical
- [x] **F-01** — Reescrever com Chakra UI + GlassPanel + TacticalText + TacticalButton
- [x] **F-02** — Substituir `<pre>JSON</pre>` por UI estruturada (cards, tabelas, badges)
- [x] **F-03** — Toggle de camadas com estado visual real
- [x] **F-04** — Tab ativa com highlight visual
- [x] **F-05** — Auto-load ao trocar de aba
- [x] **F-06** — Loading state com Spinner inline
- [x] **F-07** — Expor Atlas Sources na aba Catálogos
- [x] **F-08** — Passagem correta de todos os filtros
