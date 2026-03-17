# Backlog: Otimização e Refatoração Global Disasters

## Now (Correções e Funcionalidades Core)
- [x] **Fix "Eventos Globais"**: Integrar a busca de Alertas da Defesa Civil/INMET (`GET /api/alerts`) existente no backend diretamenta na renderização de polígonos/marcadores do mapa e no cluster de overlays.
- [x] **Cadastro via Mapa**: Parametrizar a ferramenta "Crosshair" atual (point/area) para abrir o Modal persistindo os itens coletados localmente no endpoint `POST /api/map-annotations` que já existe, mas atualizar também sua listagem no `GET`.
- [x] **Layout "Map-First"**: Converter painéis massivos em Floating Panels translucidos ou collapse/expand menus do Tailwind para garantir a visibilidade 3D/2D do globo ao inicializar a página.

## Next (Integrações Oficiais de Dados e IA Meteorológica)
- [x] **Integração Meteorológica**: Ao clicar ou isolar um evento/região, consumir endpoints meteorológicos locais (`/api/weather`) e carregar o forecast para a região afetada via drawer lateral.
- [ ] **Integração IBGE**: Incorporar o limite municipal ou centroid da macro-região quando uma ocorrência for detectada para reverse-geocoding (baseando-se no `GET /api/integrations/ibge/municipios`).
- [ ] **Painel de Inteligência e Radar**: Interligar os dados retornados de `/api/alerts/intelligence` na seção de inteligência lateral.

## Later (Operações Táticas Avançadas)
- [ ] **Modo Operação Offline-first**: Robustecer a persistência via IndexedDB local, com queue outbox expandida para as anotações do mapa para atrito zero em campo no interior.
- [ ] **Expansão das Camadas de Camada (WMS/XYZ)**: Integrar visões de calor para inundações e chuvas dinamicamente consultando os catalogs GOES/Landsat via backend proxies.
- [ ] **Exportação para Offline/Rádios**: Possibilitar Download das anotações mapeadas (GeoJSON) visando replicação no sistema rádio em cenários de quebra total da rede civil de telecomunicações.


## Multi-Hazard SDK (Solicitação de Feature)
- [ ] **SDK de Simulação Multi-Risco**: Criar núcleo `simulation-sdk` para incêndio, alagamento, terremoto e tsunami com contratos versionados de cenário.
- [ ] **Cenário Costeiro/Tsunami**: Implementar simulação com ETA por trecho da costa, marégrafos/boias e polígonos de inundação costeira.
- [ ] **Incêndio + Vento**: Integrar direção/velocidade do vento e umidade para estimar propagação e zonas de evacuação.
- [ ] **Fusão de Sensores**: Padronizar ingestão de sensores (meteo, nível d'água, sísmico, oceânico) com indicador de qualidade por leitura.
- [ ] **Gestão de Desmatamento**: Adicionar camada para pressão ambiental e aumento de suscetibilidade a incêndio/erosão.
