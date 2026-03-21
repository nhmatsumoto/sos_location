# Plano de Implementação — Análise de Risco (Risk Assessment)

> Data: 2026-03-22 | Status: Implementado

---

## 1. Diagnóstico — Bugs e Problemas Encontrados

### Frontend — `RiskAssessmentPage.tsx`

| # | Bug | Impacto |
|---|-----|---------|
| F-01 | `VStack align="right"` inválido — Chakra não aceita "right" | Quebra layout CSS silenciosamente |
| F-02 | `severity` vs `level` — `getSeverityColor` compara minúsculas mas backend retorna capitalizado ("High"/"Critical") | Todos os pontos aparecem com cor verde (baixo risco) |
| F-03 | Campo `riskScore` não existe — Python retorna `score` (0-100 int), tipo TS espera `riskScore` (float 0-1) | Progress bar sempre 0% ou NaN |
| F-04 | Campo `lon` vs `lng` — Python retorna `lng`, TS declara `lon` | Coordenadas sempre `undefined`, mapa sem pontos |
| F-05 | `analytics` sempre `undefined` — backend nunca retorna este objeto | Cards mostram "N/A" e "0" eternamente |
| F-06 | `coords` hardcoded e sem UI — fixo em Muriaé-MG, usuário não pode mudar | Pesquisa sempre falha / ignora localização real |
| F-07 | `className="animate-pulse"` / `"custom-scrollbar"` — Tailwind misturado com Chakra | Inconsistente; `custom-scrollbar` provavelmente sem efeito |
| F-08 | `LoadingOverlay variant="fullscreen"` durante recalculate | Bloqueia tela inteira em cada refresh |
| F-09 | Painel direito completamente estático | 50% da tela com zero informação útil |
| F-10 | Sem empty state quando `riskMap` vazio | Lista em branco, usuário não entende o que aconteceu |

### Frontend — `riskApi.ts`

| # | Bug | Impacto |
|---|-----|---------|
| R-01 | Interface `RiskAssessment` desatualizada | Tipos TS incompatíveis com dados reais |
| R-02 | `riskMap` item declara `lon`/`severity`/`riskScore` — nunca corresponde ao backend | TypeScript não avisa, runtime silenciosamente falha |

### Backend — `RiskController.cs`

| # | Bug | Impacto |
|---|-----|---------|
| B-01 | `GetAssessment()` ignora `lat`/`lon`/`radiusKm` query params | Filtro por área geográfica nunca funciona |
| B-02 | Passa `List<object>` raw do Python sem transformação | Contrato de campos totalmente errado para o frontend |
| B-03 | `analytics` nunca computado | Cards sempre mostram N/A |
| B-04 | `PipelineSync` é stub (retorna zeros, não faz nada) | Botão "Sinc Pipeline" é decorativo |

---

## 2. Fluxo de Dados — Estado Atual (Quebrado)

```mermaid
flowchart LR
    FE["Frontend\nriskApi.getAssessment(lat,lon)"]
    BE["RiskController.cs\nGET /api/risk/assessment"]
    PY["FastAPI RAU\nGET /api/v1/risk/scores"]
    DB["RiskEngine\ncurrent_scores[]"]

    FE -->|"params: lat, lon, radiusKm\n❌ IGNORADOS"| BE
    BE -->|"GET /api/v1/risk/scores\n✅ correto"| PY
    PY --> DB
    DB -->|"{ country, location, score, level, lng? }\n❌ campos errados para FE"| PY
    PY -->|"List[object] raw\n❌ sem transformação"| BE
    BE -->|"{ model, riskMap: raw, NO analytics }\n❌ contrato errado"| FE
    FE -->|"riskMap[i].riskScore = undefined\nriskMap[i].severity = wrong case\nanalytics = undefined\n❌ tudo quebrado"| FE
```

## 3. Fluxo de Dados — Estado Corrigido

```mermaid
flowchart LR
    FE["Frontend\nriskApi.getAssessment()"]
    BE["RiskController.cs\nGET /api/risk/assessment"]
    PY["FastAPI RAU\nGET /api/v1/risk/scores"]
    DB["RiskEngine\ncurrent_scores[]"]

    FE -->|"GET /api/risk/assessment"| BE
    BE -->|"GET /api/v1/risk/scores"| PY
    PY --> DB
    DB -->|"{ country, location, score(0-100), level('High'), lat, lng }"| PY
    PY -->|"scores[]"| BE
    BE -->|"Transformação:\nscore→riskScore(/100)\nlevel→severity(lower)\nlng→lon\n+ analytics computado"| BE
    BE -->|"{ model, riskMap, analytics, generatedAt }"| FE
    FE -->|"Renderiza corretamente\nbadges, progress, cards"| FE
```

---

## 4. Diagrama de Componentes — Página Corrigida

```mermaid
graph TB
    subgraph Page["RiskAssessmentPage"]
        Header["Header\nTítulo + última atualização + botões"]
        StatsRow["StatsRow\n4 cards: Critical / High / Medium / Low"]

        subgraph Content["Conteúdo Principal (2 colunas)"]
            subgraph Left["Painel Esquerdo — Lista"]
                SearchBar["SearchBar\nbusca por nome de localização"]
                LevelFilter["LevelFilter\ntabs: All / Critical / High / Medium / Low"]
                RiskList["RiskList\nlocalização + barra de score + badge + país"]
            end

            subgraph Right["Painel Direito — Detalhe"]
                ScoreDist["Distribuição por Nível\nbarras CSS proporcionais"]
                TopRisks["Top 5 Locais de Maior Risco"]
                FactorDetail["Fatores Ambientais\n(ao selecionar item)"]
            end
        end
    end

    Header --> StatsRow
    StatsRow --> Content
    SearchBar --> RiskList
    LevelFilter --> RiskList
    RiskList --> FactorDetail
```

---

## 5. Diagrama de Sequência — Ciclo Completo

```mermaid
sequenceDiagram
    actor Op as Operador
    participant Page as RiskAssessmentPage
    participant API as riskApi.ts
    participant BE as RiskController (.NET)
    participant RAU as FastAPI (Python)
    participant Engine as RiskEngine

    Op->>Page: Abre /app/risk-assessment
    Page->>API: getAssessment()
    API->>BE: GET /api/risk/assessment
    BE->>RAU: GET /api/v1/risk/scores
    RAU->>Engine: get_current_scores()
    Engine-->>RAU: scores[] (60+ locais)
    RAU-->>BE: List[{country,location,score,level,lat,lng}]
    BE->>BE: Transformar campos + calcular analytics
    BE-->>API: {model, riskMap, analytics, generatedAt}
    API-->>Page: RiskAssessment tipado corretamente
    Page->>Page: Renderizar cards, lista, distribuição

    Op->>Page: Filtra por "Critical"
    Page->>Page: Filtrar riskMap localmente

    Op->>Page: Clica em localização
    Page->>Page: Expandir fatores ambientais

    Op->>Page: Clica "Recalcular"
    Page->>API: getAssessment()
    Note over Page: Spinner inline (não fullscreen)
```

---

## 6. Contrato de Dados — Tipos Corrigidos

```typescript
interface RiskScore {
  lat:       number | null;
  lon:       number | null;          // mapeado de "lng" do Python
  severity:  'critical' | 'high' | 'medium' | 'low';  // lowercase de "level"
  riskScore: number;                 // score / 100.0 → float 0..1
  country:   string;
  location:  string;
  factors?: {
    alert_count: number;
    environmental: { humidity: number; temp: number; seismic: number };
    alerts_sample: string[];
  };
}

interface RiskAssessment {
  model: { name: string; version: string };
  riskMap: RiskScore[];
  analytics: {
    totalLocations:            number;
    criticalCount:             number;
    highCount:                 number;
    mediumCount:               number;
    lowCount:                  number;
    affectedPopulation:        number;
    criticalInfrastructureCount: number;
  };
  generatedAt: string;
}
```

---

## 7. Checklist de Implementação

- [x] **B-01/B-02/B-03** — `RiskController.cs`: transformar campos, computar analytics, aceitar params
- [x] **B-04** — `RiskController.cs`: `PipelineSync` dispara ciclo no RAU
- [x] **R-01/R-02** — `riskApi.ts`: interfaces atualizadas
- [x] **F-01** — `VStack align="right"` → `align="flex-end"`
- [x] **F-02** — `severity` case insensitive fix
- [x] **F-03** — `riskScore` field correto
- [x] **F-04** — `lon`/`lng` alinhados
- [x] **F-05** — `analytics` computado no backend
- [x] **F-06** — coordenadas removidas da UI (análise global)
- [x] **F-07** — Tailwind removido, Chakra usado consistentemente
- [x] **F-08** — Spinner inline, não fullscreen overlay
- [x] **F-09** — Painel direito com distribuição + top risks + fatores
- [x] **F-10** — Empty state para lista vazia
