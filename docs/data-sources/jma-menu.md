# Catálogo JMA — coleta e uso no mapa

Fonte de escopo: [menu internacional da JMA](https://www.jma.go.jp/jma/en/menu.html).
O catálogo executável está em `JmaMenuSources`; cada entrada possui ID estável,
categoria, URL de proveniência, tipo de documento e camada de destino.

| Grupo do menu | Fontes mapeadas | Camada operacional |
|---|---|---|
| Redução de risco | avisos, mapas de risco, ciclones, vento perigoso, nowcast, precipitação, chuva torrencial, neve | `warnings`, `risk`, `cyclones`, `wind`, `precipitation`, `torrential-rain`, `snow` |
| Tempo | previsão diária/3h/sazonal, cartas meteorológicas | `weather`, `seasonal`, `weather-maps` |
| Observação | satélite, observação, análise meteorológica | `satellite`, `observations`, `weather-analysis` |
| Clima e oceano | avisos e previsão marítima | `marine-warnings`, `marine-forecasts` |
| Terremotos e tsunamis | tsunami, terremoto, movimento de longo período, feed XML | `tsunami`, `earthquakes`, `long-period-motion` |
| Vulcões | avisos/erupção, previsão de cinzas, feed XML | `volcanoes`, `volcanic-ash` |

Produtos hospedados em `data.jma.go.jp` e o alerta de calor de outro órgão são
catalogados, mas ficam desativados por padrão: antes de consultas periódicas é
necessário registrar o endpoint específico, termos de uso e limite de taxa de
cada produto. Isso evita transformar um link de navegação em um crawler sem
contrato de dados.

## Fluxo

`POST /api/v1/disaster-scenarios/{scenarioKey}/collect` coleta cada fonte JMA
habilitada e o feed XML de terremotos/vulcões. Cada snapshot recebe seu próprio
`SourceObservation`, URL, hash SHA-256, horário de captura, confiança e status
oficial. O normalizador de cada camada deve converter o snapshot em
`OperationalMapFeature`; assim a camada publicada preserva o vínculo com o
documento bruto e não substitui alertas/danos já observados.
