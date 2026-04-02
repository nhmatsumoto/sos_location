# Modelos Analiticos, Fisicos e Notacao AsciiMath

> Status: documento de referencia do que o codigo implementa hoje.

## Objetivo

Este documento consolida as formulacoes matematicas e fisicas usadas pelo projeto para:

- explicar os modelos analiticos atuais;
- deixar explicito o que e heuristica operacional e o que e aproximacao fisica;
- servir de contrato conceitual para a refatoracao do frontend e da camada de analytics.

## Notacao AsciiMath

O projeto agora suporta `AsciiMath` na documentacao Sphinx/MyST usando o delimitador:

- Inline ou destacado: `[= ... =]`

Exemplos:

- `[= s = arctan(sqrt((dz/dx)^2 + (dz/dz)^2)) =]`
- `[= A(i) = 1 + sum_(k in U(i)) A(k) =]`
- `[= R = clamp(5, 100, 20(L+1) + 10A + H + T) =]`

## 1. Escore Composto de Risco

Implementado em [RiskEngineService.cs](/home/nhmatsumoto/sos_location/backend-dotnet/SOSLocation.ML/Services/RiskEngineService.cs).

### 1.1 Classificacao de nivel

O motor primeiro estima um nivel discreto `[= L in {0,1,2,3} =]` a partir de:

- numero de alertas `[= A =]`
- umidade `[= H_u =]`
- temperatura `[= T =]`
- atividade sismica `[= S =]`

A implementacao atual nao usa inferencia estatistica online. Ela usa uma funcao deterministica calibrada por faixas:

- alerta: `[= f_A(A) in {0, 0.5, 1.0, 2.0, 3.0} =]`
- umidade: `[= f_H(H_u) in {0, 0.5, 1.0, 1.5} =]`
- temperatura: `[= f_T(T) in {0, 0.5, 1.0, 1.5} =]`
- sismicidade: `[= f_S(S) in {0, 0.5, 1.0, 1.5} =]`

A soma intermediaria e:

[= sigma = f_A(A) + f_H(H_u) + f_T(T) + f_S(S) =]

O nivel final e:

- `[= L = 0 =]` se `[= sigma <= 1.0 =]`
- `[= L = 1 =]` se `[= 1.0 < sigma <= 2.5 =]`
- `[= L = 2 =]` se `[= 2.5 < sigma <= 4.5 =]`
- `[= L = 3 =]` se `[= sigma > 4.5 =]`

### 1.2 Escore final

O escore composto `[= R =]` usa a formula:

[= R_raw = 20(L + 1) + 10A + B_H + B_T =]

onde:

- `[= B_H = 15 =]` se `[= H_u > 85 =]`, senao `[= 0 =]`
- `[= B_T = 10 =]` se `[= T > 38 =]`, senao `[= 0 =]`

O escore final e truncado:

[= R = min(100, max(5, R_raw)) =]

Mapeamento qualitativo:

- `[= R < 25 =]` -> `Low`
- `[= 25 <= R < 50 =]` -> `Medium`
- `[= 50 <= R < 75 =]` -> `High`
- `[= R >= 75 =]` -> `Critical`

### 1.3 Interpretacao

Este modelo e adequado para triagem tatico-operacional, nao para previsao probabilistica calibrada. O valor de negocio esta na rapidez, rastreabilidade e explainability.

## 2. Segmentacao Semantica de Imagem

Implementado em [SemanticSegmentationService.cs](/home/nhmatsumoto/sos_location/backend-dotnet/SOSLocation.ML/Services/SemanticSegmentationService.cs).

O modelo atual e heuristico RGB por tiles, sem CNN em producao.

### 2.1 Estatisticas basicas por tile

Para cada tile, a media dos canais e:

[= r = (1/N) sum R_i =]

[= g = (1/N) sum G_i =]

[= b = (1/N) sum B_i =]

Brilho medio:

[= I = (r + g + b) / 3 =]

Saturacao simplificada:

[= sat = max(r,g,b) - min(r,g,b) =]

Indice "verde" simplificado, no espirito de NDVI sem infravermelho:

[= v = (g - r) / max(1, g + r) =]

### 2.2 Regras de classe

Exemplos relevantes do codigo:

- Agua: `[= b > 1.15r and b > 1.05g and I < 165 =]`
- Vegetacao: `[= g > r + 6 and g > b + 4 =]`
- Via: `[= sat < 22 and 95 < I < 185 =]`
- Edificacao alta: `[= I < 80 and sat < 35 =]`
- Favela: `[= r > 1.08g and r > 1.25b and I < 155 and sat > 15 =]`

### 2.3 Metricas agregadas

Percentuais:

[= P_c = 100 * n_c / N_tiles =]

Densidade urbana:

[= U = 100 * (2n_(building_high) + n_(building_low)) / N_tiles =]

## 3. Declividade por Horn (1981)

Implementado em [SlopeAnalyzer.ts](/home/nhmatsumoto/sos_location/frontend-react/src/lib/analysis/SlopeAnalyzer.ts) e [SlopeAnalyzerService.cs](/home/nhmatsumoto/sos_location/backend-dotnet/SOSLocation.ML/Services/SlopeAnalyzerService.cs).

Para a vizinhanca 3x3:

```text
a b d
e x f
g h i
```

As derivadas sao:

[= dz/dx = ((d + 2f + i) - (a + 2e + g)) / (8Delta_x) =]

[= dz/dz = ((g + 2h + i) - (a + 2b + d)) / (8Delta_z) =]

A declividade em radianos:

[= theta = arctan(sqrt((dz/dx)^2 + (dz/dz)^2)) =]

Em graus:

[= slope_deg = theta * 180 / pi =]

Mapeamento de textura:

[= tex = round(min(slope_deg, 90) / 90 * 255) =]

## 4. Hidrologia D8 e Rede de Drenagem

Implementado em [HydrologicalAnalyzer.ts](/home/nhmatsumoto/sos_location/frontend-react/src/lib/analysis/HydrologicalAnalyzer.ts).

### 4.1 Direcao de fluxo

Cada celula `[= i =]` aponta para o vizinho 8-conectado com menor elevacao:

[= flowTo(i) = argmin_(j in N_8(i)) h_j =]

Se nao houver vizinho mais baixo, a celula vira sumidouro local.

### 4.2 Acumulacao de fluxo

A acumulacao e definida por:

[= A(i) = 1 + sum_(k : flowTo(k) = i) A(k) =]

O algoritmo usa ordenacao topologica iterativa para evitar recursao.

### 4.3 Extracao de canais

Uma celula vira canal quando:

[= A(i) >= T =]

com limiar:

[= T = max(5, f_s * max(A)) =]

onde `[= f_s =]` e `streamAccumFraction`, hoje por padrao `[= 0.04 =]`.

## 5. Modelos Simplificados de Simulacao Multi-Hazard

Implementados em [SimulationOrchestrationService.cs](/home/nhmatsumoto/sos_location/backend-dotnet/SOSLocation.ML/Services/SimulationOrchestrationService.cs).

## 5.1 Incendio florestal

[= spread = min(1, 0.45(W/60) + 0.3(1 - H/100) + 0.15F + 0.1V) =]

[= exposure = min(1, 0.55U + 0.45spread) =]

onde:

- `[= W =]` velocidade do vento
- `[= H =]` umidade
- `[= F =]` indice de combustivel
- `[= V =]` pressao de vegetacao
- `[= U =]` densidade urbana

## 5.2 Enchente

[= runoff = min(1, 0.5(R/100) + 0.35I + 0.15(1 - D)) =]

[= accumulation = min(1, runoff * (1 - min(0.9, S))) =]

onde:

- `[= R =]` chuva em `mm/h`
- `[= I =]` fracao impermeavel
- `[= D =]` capacidade de drenagem
- `[= S =]` declividade media normalizada

## 5.3 Sismo

[= intensity = min(1, 0.6(M/9) + 0.2(1 - min(Z/120, 1)) + 0.2A_s) =]

[= damage = min(1, 0.6intensity + 0.4V_b) =]

onde:

- `[= M =]` magnitude
- `[= Z =]` profundidade em km
- `[= A_s =]` amplificacao de solo
- `[= V_b =]` razao de edificacoes vulneraveis

## 5.4 Tsunami

[= amplification = min(1, 0.45(H_w/8) + 0.25(1 - min(S_c/0.2, 1)) + 0.3min(T_l/2.5,1)) =]

[= impact = min(1, 0.65amplification + 0.35E_c) =]

[= ETA = max(8, floor(D_s / 8)) =]

onde:

- `[= H_w =]` altura de onda offshore
- `[= S_c =]` declividade costeira
- `[= T_l =]` nivel de mare
- `[= E_c =]` exposicao populacional costeira
- `[= D_s =]` distancia ate a fonte

## 5.5 Confianca ajustada por sensores

Todos os cenarios aplicam um ajuste:

[= q_s = min(1, 0.5 + 0.05N_s) =]

[= conf = round(raw_conf * (0.7 + 0.3q_s), 2) =]

onde `[= N_s =]` e a contagem de sensores.

## 6. Fisica Visual no Frontend

Implementada em [DisasterPhysics.ts](/home/nhmatsumoto/sos_location/frontend-react/src/lib/webgl/physics/DisasterPhysics.ts).

### 6.1 Sismo visual

Offsets de vibracao:

[= dx = 12alpha sin(15t) + 4alpha sin(43.1t) =]

[= dy = 8alpha cos(18t) =]

[= dz = 11alpha cos(13.5t) + 5alpha sin(37.8t) =]

com:

[= alpha = intensity / 100 =]

### 6.2 Nivel de inundacao visual

[= h_f(t) = h_0 + 200alpha + 50alpha sin(0.2t) =]

### 6.3 Fase de tsunami

Modelo por estados:

- `[= t < 5 =]` -> calmaria
- `[= 5 <= t < 15 =]` -> recuo
- `[= 15 <= t < 25 =]` -> chegada da onda
- `[= t >= 25 =]` -> inundacao

## 7. Limites de Engenharia

O projeto atual entrega:

- modelagem deterministica e explicavel;
- triagem operacional rapida;
- visualizacao GIS coerente com o mapa tatico.

O projeto atual nao entrega:

- solver hidrodinamico 2D/3D;
- FEM estrutural;
- inversao sismica;
- segmentacao profunda com modelo treinado em producao.

## 8. Implicacoes para a Refatoracao

Para a refatoracao do frontend, os contratos visuais e analiticos devem refletir estas entidades matematicas:

- `riskScore`, `riskLevel`, `confidence`, `sensorQualityScore`
- `runoffIndex`, `accumulationIndex`, `damageProbability`, `etaMinutes`
- `slopeGrid`, `streamPolylines`, `waterCellQuads`, `semanticMetadata`

O frontend novo deve expor esses conceitos como primeira classe na interface, sem esconder a semantica dos modelos atras de nomes genericos de widgets.
