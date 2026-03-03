# Plano de Consolidação Funcional da Plataforma (vFinal)

## Fase 1 — Coleta e visão global (concluído nesta entrega)
- Crawler contínuo 24/7 de desastres (GDACS/USGS/INMET).
- API de eventos globais e estatísticas por país/série temporal.
- Página de Eventos Globais com scatter e mapa interativo.

## Fase 2 — Operação em campo (concluído nesta entrega)
- Ferramentas de mapa interativas com captura precisa de coordenadas.
- Cursor tático customizado para apoio à coleta geográfica.
- Demarcação de áreas por múltiplos cliques.
- Modal de cadastro de evento global com dropdowns.
- Cadastro operacional rápido de incidente e pessoa desaparecida.

## Fase 3 — Robustez operacional (próxima)
- Persistência de polígonos em camada dedicada para busca geoespacial.
- Fluxo de aprovação/validação para eventos cadastrados manualmente.
- Auditoria de alterações por usuário.

## Fase 4 — Inteligência e desempenho (próxima)
- Resolução de país offline (Natural Earth + point-in-polygon + cache geohash).
- Alertas automatizados por severidade/área.
- Dashboards de SLA por provider e observabilidade com métricas/traços.
