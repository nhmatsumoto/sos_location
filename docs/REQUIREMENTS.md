# SOS Location — Requisitos do Sistema

> Versão: 1.0 | Data: 2026-03-22

---

## Sumário

1. [Requisitos Funcionais — Backend](#1-requisitos-funcionais--backend)
2. [Requisitos Funcionais — Frontend](#2-requisitos-funcionais--frontend)
3. [Requisitos Funcionais — Risk Analysis Unit](#3-requisitos-funcionais--risk-analysis-unit)
4. [Requisitos Não Funcionais](#4-requisitos-não-funcionais)
5. [Regras de Negócio do Domínio](#5-regras-de-negócio-do-domínio)
6. [Restrições e Premissas](#6-restrições-e-premissas)

---

## 1. Requisitos Funcionais — Backend

### RF-B01: Gerenciamento de Incidentes
- O sistema deve permitir criação, leitura, atualização e encerramento de incidentes.
- Cada incidente deve ter tipo (Flood, Landslide, Earthquake, Wildfire, Storm, Drought, Tsunami, Industrial), status e geolocalização.
- O encerramento de um incidente deve gerar automaticamente um `PublicSnapshot`.
- Todas as mutações em incidentes devem ser registradas em `AuditLog` (append-only).

### RF-B02: Geração de Alertas
- O sistema deve receber e processar alertas de fontes externas: GDACS, Defesa Civil, INMET, CEMADEN.
- Alertas devem ser classificados por severidade: Info, Warning, Critical, Extreme.
- Alertas críticos (Critical/Extreme) devem ser distribuídos via SignalR em tempo real para todos os clientes conectados.

### RF-B03: Simulação de Desastres e Pipeline GIS
- O sistema deve aceitar requisições de simulação com bounding box geográfico e parâmetros de desastre (chuva, vento, temperatura, etc.).
- O backend deve buscar features urbanas via Overpass API (edificações, vias, hidrografia, parques, áreas naturais).
- O backend deve buscar grades de elevação (DEM) via OpenTopography.
- O backend deve preparar `SceneData` pré-processado com: grade semântica, elevação normalizada, features OSM e metadados de cobertura da terra.
- O pipeline deve ter circuit breakers para todos os provedores externos, com fallback para cache ou dados sintéticos.

### RF-B04: Coordenação de Resgate
- Operadores devem poder criar e gerenciar `SearchArea` (áreas de busca com polígono geográfico).
- Equipes devem poder ser atribuídas a áreas de busca (Assignment) com tipo: Bombeiros, Exército, SAMU, Voluntários.
- O status de cada área deve poder ser atualizado: Pending → InProgress → Cleared/Blocked.

### RF-B05: Campanhas de Apoio Humanitário
- O sistema deve permitir criação de campanhas de arrecadação vinculadas a incidentes.
- Doações devem ser registradas com valor, doador (opcional) e data.
- O balanço financeiro de cada campanha deve ser computado em tempo real.
- Dados de campanhas devem ser publicados no endpoint público com valores agregados.

### RF-B06: Portal Público e Transparência
- O sistema deve expor dados anonimizados (sem PII) via endpoints públicos sem autenticação.
- Endpoints públicos: listagem de incidentes, snapshot público, resumo de suporte, áreas de busca ativas.
- Snapshots públicos devem ser gerados automaticamente no encerramento de incidentes.

### RF-B07: Autenticação e Autorização
- Toda rota não pública deve exigir token JWT válido emitido pelo Keycloak.
- O sistema deve implementar RBAC com papéis: Admin, Operator, Analyst, Volunteer, Public.
- Operações destrutivas (encerrar incidente, excluir dados) devem exigir papel Admin ou Operator.

### RF-B08: Integrações com Dados Externos
- OpenTopography: grades DEM de alta resolução para análise de elevação e slope.
- Overpass API: features geoespaciais OSM (edificações, vias, hidrografia, parques).
- Open-Meteo / INMET: dados meteorológicos em tempo real (temperatura, chuva, vento).
- GDACS: alertas globais de desastres naturais.
- NASA GIBS / WorldCover: tiles de satélite e classificação de cobertura da terra.
- IBGE: dados demográficos e limites administrativos.

---

## 2. Requisitos Funcionais — Frontend

### RF-F01: Renderizador 3D Tático (CityScaleWebGL)
- O sistema deve renderizar cenas 3D de cidades a partir de dados GIS reais em WebGL 2.0 puro.
- A cena deve incluir: terreno com deslocamento por DEM, edifícios extrudados por altura OSM, vias, hidrografia, zonas (áreas naturais, uso do solo, calçamento).
- Rios devem ser derivados de análise de fluxo hidrológico D8 sobre o DEM.
- Lagos/corpos d'água devem ser derivados de células WATER da segmentação semântica de satélite.
- O motor deve suportar shaders de: flood (nível de água dinâmico), slope (inclinação do terreno), iluminação solar (sunSync).

### RF-F02: Controle de Camadas 3D
- O usuário deve poder ativar/desativar independentemente: terrain, buildings, highways, waterways/polygons, naturalAreas, landUseZones, paving, amenities, slope, sunSync, aiStructural.
- O sistema deve oferecer presets de camadas: Análise GIS, Cidade Limpa, Cenário de Desastre.
- Mudanças de camadas devem reconstruir a cena sem reload da página.

### RF-F03: Simulação de Parâmetros de Desastre
- O usuário deve poder configurar parâmetros de simulação por tipo de desastre:
  - Enchente: chuva (mm/h), nível do rio (m), velocidade de onda, surge
  - Deslizamento: chuva (mm/h), instabilidade de encosta, saturação do solo
  - Incêndio: temperatura (°C), vento (km/h), umidade (%), temperatura do fogo
  - Terremoto: magnitude, profundidade da falha, índice geológico
  - Tempestade: vento (km/h), chuva (mm/h), wave height
  - Neve: acúmulo (cm), profundidade de geada, déficit pluviométrico
- Todos os parâmetros devem ser passados ao motor 3D para atualização dos shaders.

### RF-F04: Mapa 2D Público (Leaflet)
- O portal público deve exibir incidentes ativos em mapa Leaflet com clustering.
- O usuário deve poder buscar cidades por nome (geocoding).
- Ao selecionar um incidente, o mapa deve exibir detalhes: tipo, severidade, área afetada, número de vítimas.

### RF-F05: Dashboard Analítico (DataHub)
- O DataHub deve exibir KPIs: total de incidentes, vítimas resgatadas, campanhas ativas, arrecadação total.
- Gráficos de série temporal para eventos por tipo e período.
- Exportação de dados em CSV e GeoJSON.

### RF-F06: Painel LOG / EventTimeline
- O painel de logs na cena 3D deve exibir: status de captura do blueprint, resumo do desastre ativo, timeline de eventos.
- Quando não há eventos, exibir mensagem "SEM EVENTOS" com status de análise.
- Eventos devem ser ordenados cronologicamente com ícones por tipo de desastre.

### RF-F07: Internacionalização (i18n)
- A interface deve suportar Português (BR) e Inglês.
- A detecção de idioma deve ser automática pelo browser.
- Textos de alertas e relatórios devem ser traduzidos.

### RF-F08: Modo Offline / Resiliência
- A aplicação deve funcionar com funcionalidade reduzida sem conexão.
- Dados de incidentes recentes devem ser armazenados em IndexedDB (idb).
- A sincronização deve ocorrer automaticamente quando a conexão for restabelecida.

---

## 3. Requisitos Funcionais — Risk Analysis Unit

### RF-R01: Análise de Risco Multi-Hazard
- O serviço deve receber parâmetros de desastre e retornar scores de risco por tipo (flood, landslide, fire, seismic).
- O score geral deve ser normalizado em 0..1 com nível de confiança.
- Recomendações textuais devem ser geradas com base nos scores.

### RF-R02: Segmentação Semântica de Imagem
- O serviço deve aceitar imagens de satélite (array ou base64) e retornar grade semântica classificada.
- Classes: VEGETATION, WATER, URBAN, ROAD, BARE_GROUND.
- A grade deve incluir metadados de percentual por classe.

### RF-R03: Disponibilidade e Health Check
- O serviço deve expor `/health` para monitoramento de disponibilidade.
- O serviço deve processar requisições de análise em menos de 2 segundos (p95).

---

## 4. Requisitos Não Funcionais

### RNF-01: Desempenho
| Métrica | Requisito |
|---------|-----------|
| Render WebGL | 60 fps em hardware moderno (dedicado) |
| API response (simulação) | < 5s para bbox ≤ 10km² |
| API response (CRUD) | < 200ms (p99) |
| Pipeline GIS completo | < 15s (bbox ≤ 25km²) |
| Risk Analysis (RAU) | < 2s (p95) |
| SignalR push latency | < 500ms (rede local) |

### RNF-02: Disponibilidade e Resiliência
- Disponibilidade alvo: 99.5% (excluindo manutenção programada).
- Todos os provedores GIS externos devem ter circuit breaker com fallback.
- O sistema deve operar com funcionalidade de leitura mesmo com providers externos indisponíveis.
- Backup automático do PostgreSQL diário com retenção de 7 dias.

### RNF-03: Segurança
- Autenticação: OIDC Authorization Code Flow via Keycloak.
- Autorização: RBAC com validação JWT a cada requisição.
- Dados de usuários: conformidade com LGPD (Lei 13.709/2018).
- Endpoints públicos: dados anonimizados, sem PII.
- HTTPS obrigatório em produção (TLS 1.2+).
- Rate limiting em endpoints públicos.

### RNF-04: Observabilidade
- Logs estruturados via Serilog (JSON) com correlação por request ID.
- Distributed tracing com OpenTelemetry.
- Health checks para: banco de dados, Keycloak, providers GIS externos.
- Dashboard de logs via Dozzle em desenvolvimento.

### RNF-05: Manutenibilidade
- Cobertura de testes backend: ≥ 70% (unit + integration).
- Cobertura de testes frontend: ≥ 60% (Vitest unit + hooks).
- Documentação de API: Swagger/OpenAPI 3.0 gerado automaticamente.
- Migrações de banco: EF Core Migrations versionadas.
- Código TypeScript: 0 erros em `tsc --noEmit` na branch main.

### RNF-06: Escalabilidade
- O backend deve suportar escalonamento horizontal (stateless, JWT sem sessão de servidor).
- O banco de dados deve suportar índices espaciais (PostGIS) para queries geográficas eficientes.
- O WebGL deve degradar graciosamente em hardware sem suporte a WebGL 2.0.

### RNF-07: Acessibilidade e UX
- Interface principal: Chakra UI com suporte a temas (dark mode padrão).
- Controles críticos: acessíveis via teclado.
- Tempo de carregamento inicial (FCP): < 3s em conexão 4G.
- Mensagens de erro: em linguagem clara, com ação corretiva sugerida.

### RNF-08: Conformidade
- LGPD: dados pessoais coletados apenas com finalidade justificada.
- Audit trail: todas as operações críticas registradas com imutabilidade.
- Política de privacidade: disponível no portal público.
- Retenção de dados: incidentes encerrados mantidos por 5 anos.

---

## 5. Regras de Negócio do Domínio

### RN-01: Incidente
- Um incidente não pode ser reaberdo após estar no estado Closed.
- Um incidente só pode ser encerrado se todas as SearchAreas estiverem no estado Cleared ou Blocked.
- O encerramento gera automaticamente um PublicSnapshot com dados agregados.

### RN-02: Alertas
- Alertas de severidade Extreme automaticamente atualizam o status do incidente vinculado para Active.
- Alertas não podem ser deletados, apenas desativados (soft delete).
- Alertas de fonte Manual requerem papel Operator ou Admin.

### RN-03: Doações e Campanhas
- O valor coletado de uma campanha nunca pode exceder o valor alvo (validação de negócio).
- Campanhas são encerradas automaticamente quando o incidente vinculado é fechado.
- Dados de doadores individuais são anonimizados no portal público.

### RN-04: Simulações
- Simulações só podem ser executadas para bounding boxes com área ≤ 100km².
- Os parâmetros de desastre devem respeitar limites físicos (ex: chuva ≤ 500mm/h).
- Simulações são imutáveis após criação — um novo request cria nova simulação.

### RN-05: Segmentação Semântica
- O threshold para classificação VEGETATION requer intensidade NDVI > 0.12.
- Células WATER são identificadas por dominância do canal azul (B > R + G).
- A grade semântica deve ter no mínimo 8×8 células para análise hidrológica D8.

---

## 6. Restrições e Premissas

### Restrições Técnicas
- O frontend requer suporte a WebGL 2.0 (Chrome 56+, Firefox 51+, Edge 79+).
- O backend requer .NET 10 SDK.
- O banco de dados deve ser PostgreSQL 15+ para suporte a recursos de jsonb e índices parciais.
- O Risk Analysis Unit requer Python 3.11+ e GPU CUDA (opcional, melhora performance).

### Premissas
- Acesso às APIs externas (Overpass, OpenTopography, Open-Meteo) está disponível na rede de produção.
- O Keycloak está configurado com o realm `sos-location` e clientes `frontend` e `api`.
- O ambiente de produção tem pelo menos 4 vCPUs e 8GB RAM para o backend.
- Conexão de rede do usuário final: mínimo 4G / WiFi para uso do renderizador 3D.

### Fora do Escopo (v1)
- Aplicativo mobile nativo (iOS/Android).
- Integração direta com radio/comunicação de campo (TETRA, APCO-25).
- Modelo de risco de tsunamis (dados sísmicos oceânicos indisponíveis).
- IA generativa para recomendações de resposta (planejado para v2).
