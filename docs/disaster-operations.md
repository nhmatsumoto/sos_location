# Operações de desastre

Esta extensão separa **fatos observados**, previsões e dados de operação. Um
relato inicial não substitui outro: `ImpactObservation` aponta para a observação
anterior e carrega horário observado, horário de captura, fonte, confiança e
estado de verificação. Isso torna possível reproduzir o mapa conhecido em um
instante, inclusive quando números preliminares forem corrigidos.

## Cenário e mapa

`DisasterScenario` é independente de `CityRevision`, portanto pode existir antes
da importação 3D de uma cidade. `OperationalMapFeature` aceita Point, LineString
ou Polygon em WGS84 e atende a camadas de epicentro, intensidade observada,
perímetro de avaliação, área de perigo, zona segura, abrigo, ponto de apoio,
interdição e setor de busca.

O cenário `kumamoto-2026-07-28-m68` é semeado no boot com epicentro, perímetro
inicial de avaliação e observações **preliminares**. O perímetro não representa
uma fronteira municipal nem uma isossista: deve ser substituído por malhas ou
polígonos oficiais quando coletados.

Endpoints:

- `GET /api/v1/disaster-scenarios`
- `GET /api/v1/disaster-scenarios/kumamoto-2026-07-28-m68/map.geojson`
- `GET /api/v1/disaster-scenarios/kumamoto-2026-07-28-m68/operations`
- `GET /api/v1/disaster-scenarios/kumamoto-2026-07-28-m68/operations-summary`
- `POST /api/v1/disaster-scenarios/kumamoto-2026-07-28-m68/operations`
- `PUT /api/v1/disaster-scenarios/kumamoto-2026-07-28-m68/operations/{id}`
- `DELETE /api/v1/disaster-scenarios/kumamoto-2026-07-28-m68/operations/{id}`
- `GET /api/v1/disaster-scenarios/kumamoto-2026-07-28-m68/impacts`
- `POST /api/v1/disaster-scenarios/kumamoto-2026-07-28-m68/collect`

O `DELETE` operacional é um encerramento lógico: preenche `EffectiveTo`, remove
a geometria do quadro ativo e mantém o registro para auditoria. Criações,
alterações e encerramentos também geram `ImpactObservation`.

## Coletores e fontes

O endpoint de coleta armazena o documento bruto, URL, hash SHA-256 e horário de
captura. Os primeiros adaptadores são o feed GeoJSON de terremotos do USGS e o
feed Atom de terremotos/vulcões da JMA. Eles são deliberadamente adaptadores de
fonte, não validadores de boatos: um normalizador promove dados ao mapa somente
com a confiança e o `VerificationStatus` apropriados.

Próximos conectores priorizados:

1. JMA: boletins de intensidade, EEW, tsunami e réplicas.
2. GSI/MLIT: abrigos oficiais, imagem pós-evento, DiMAPS e camadas de risco.
3. J-SHIS/NIED: malha de risco sísmico, solo, liquefação e deslizamento.
4. Prefeituras e municípios: centros de apoio, ordens de evacuação, vias,
   capacidade de abrigos e boletins de danos.
5. Infraestrutura: energia, telecom, ferrovias, estradas, aeroportos e hospitais.

Cada conector precisa de limite de taxa, allowlist de host, retenção do payload
bruto, licença/atribuição, deduplicação por hash e revisão humana para dados de
vítimas, desaparecidos e localização sensível.

## Funcionalidades operacionais

- mapa de situação com áreas de risco/seguras, pontos de apoio, relatos de
  vítimas, setores de busca e trechos de tráfego interrompido;
- desenho validado de Point, LineString e Polygon, com limite de vértices,
  reparo de polígonos e coordenadas WGS84;
- prioridades P1–P4, vítimas confirmadas/estimadas, pessoas resgatadas, equipe,
  capacidade, recursos necessários, notas e estado de verificação;
- fluxo `reported → verified → assigned → in-progress → cleared/closed`,
  resumo em tempo real e filtros P1/vítimas/tráfego.

Próximas extensões:

- mapa de situação com camadas temporais, filtros por fonte/confiança e replay;
- registro protegido de pessoas desaparecidas/encontradas, reunificação familiar
  e consentimento para compartilhamento de localização;
- cadastro de abrigos/postos de apoio com capacidade, ocupação, acessibilidade,
  água, energia, medicamentos e necessidades especiais;
- despacho de equipes, setores de busca, check-in, rastreio de tarefas e cadeia
  de custódia de evidências;
- levantamento de danos por edifício/trecho/serviço, fotos georreferenciadas,
  prioridade e estado de verificação;
- inventário, requisição e distribuição de insumos; previsão de demanda de
  hospital, abrigo, água, alimentos e combustível;
- integração com alertas públicos e comunicação multicanal resiliente;
- controle de acesso por função, trilha de auditoria, minimização de PII e modo
  offline/sincronização posterior para trabalho de campo.
