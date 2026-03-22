# FLOOD — Enchente / Inundação
## Conhecimento Científico Especializado para Simulação de Desastres

---

## 1. Classificação e Tipologia

| Tipo | Causa Principal | Tempo de Formação | Área Afetada |
|---|---|---|---|
| **Fluvial (riverina)** | Transbordamento de rios por chuva prolongada | Horas a dias | Planícies de inundação |
| **Pluvial (flash flood)** | Chuva intensa de curta duração sobre superfície impermeável | Minutos a horas | Urbano/encostas |
| **Costeira** | Maré de tempestade, ciclones, tsunamis | Horas | Zonas litorâneas |
| **Estuarina** | Combinação de maré de tempestade + descarga fluvial | Horas a dias | Estuários e deltas |
| **Rompimento de barragem** | Falha estrutural ou galgamento | Minutos | Vales a jusante |
| **Por obstrução** | Represamento por deslizamento/gelo | Horas | Localizado |

---

## 2. Ciclo Hidrológico e Formação

A enchente é a expressão do desequilíbrio entre a entrada de água (precipitação) e a capacidade de armazenamento + escoamento de uma bacia hidrográfica.

**Equação de Continuidade da Bacia:**
```
dS/dt = P - E - T - Q_superficial - Q_subterrâneo
```
- `S` = armazenamento (mm)
- `P` = precipitação (mm/h)
- `E` = evaporação
- `T` = transpiração (evapotranspiração combinada: ET₀)
- `Q` = escoamento (descarga)

**Fatores de suscetibilidade:**
- Área impermeabilizada (cobertura asfáltica, concreto)
- Declividade da bacia (tempo de concentração Tc)
- Saturação antecedente do solo (API — Antecedent Precipitation Index)
- Densidade de drenagem (km de rios / km² de bacia)

---

## 3. Equações Fundamentais

### 3.1 Método Racional (Pequenas Bacias)
```
Q = C × i × A / 360
```
- `Q` = vazão de pico (m³/s)
- `C` = coeficiente de escoamento superficial (0.1 rural–0.9 urbano impermeável)
- `i` = intensidade de chuva (mm/h) para o tempo de concentração Tc
- `A` = área da bacia (ha)

**Coeficientes C típicos:**
- Florestas densas: 0.10–0.20
- Pastagens: 0.25–0.40
- Área urbana residencial: 0.50–0.70
- Centro urbano (impermeável): 0.80–0.95

### 3.2 Equação de Manning (Escoamento em Canais Abertos)
```
Q = (1/n) × A × R^(2/3) × S^(1/2)
```
- `Q` = descarga (m³/s)
- `n` = coeficiente de rugosidade de Manning
- `A` = área da seção transversal (m²)
- `R` = raio hidráulico = A / P_wetted (m)
- `S` = declividade da linha d'água (m/m)

**Valores de n de Manning:**
| Superfície | n |
|---|---|
| Canal de concreto liso | 0.011–0.013 |
| Canal terroso regular | 0.022–0.030 |
| Rio natural limpo | 0.025–0.040 |
| Rio com vegetação densa | 0.050–0.080 |
| Planície de inundação com arbustos | 0.070–0.160 |

**Velocidade média:** `V = Q / A = (1/n) × R^(2/3) × S^(1/2)`

### 3.3 Equações de Saint-Venant (Água Rasa — Shallow Water Equations)
Sistema de equações diferenciais parciais que governam o escoamento unidimensional em canal aberto:

**Continuidade:**
```
∂A/∂t + ∂Q/∂x = q_lateral
```

**Quantidade de Movimento:**
```
∂Q/∂t + ∂(Q²/A)/∂x + gA(∂h/∂x + S_f - S_0) = 0
```
- `h` = lâmina d'água (m)
- `S_f` = declividade de atrito (via Manning: S_f = Q²×n² / A²×R^(4/3))
- `S_0` = declividade do leito
- `g` = 9.81 m/s²

**Forma 2D (Saint-Venant 2D)** — para inundações em planícies:
```
∂h/∂t + ∂(hu)/∂x + ∂(hv)/∂y = 0

∂(hu)/∂t + ∂(hu² + gh²/2)/∂x + ∂(huv)/∂y = -gh×∂z/∂x - τ_bx/ρ

∂(hv)/∂t + ∂(huv)/∂x + ∂(hv² + gh²/2)/∂y = -gh×∂z/∂y - τ_by/ρ
```

### 3.4 Velocidade de Onda de Cheia
A celeridade de uma onda cinemática em canal retangular:
```
c = (5/3) × V_média
```
Para onda dinâmica (pequenas perturbações sobre escoamento uniforme):
```
c = V ± √(g × h)
```

### 3.5 Número de Froude (Regime de Escoamento)
```
Fr = V / √(g × h)
```
- `Fr < 1` → subcrítico (tranquilo) — maioria das enchentes em planície
- `Fr = 1` → crítico
- `Fr > 1` → supercrítico (torrencial) — flash floods em encostas

### 3.6 Curvas IDF (Intensidade–Duração–Frequência)
Relação estatística fundamental para dimensionamento hidráulico:
```
i = K × T^a / (t + b)^c
```
- `i` = intensidade (mm/h)
- `T` = período de retorno (anos)
- `t` = duração (min)
- `K, a, b, c` = parâmetros regionais calibrados por estação pluviométrica

**Exemplo — São Paulo (DAEE/CETESB):**
```
i = 1943.7 × T^0.166 / (t + 24)^0.866   [mm/h]
```

---

## 4. Infiltração e Saturação do Solo

### 4.1 Modelo de Green-Ampt
```
f(t) = K_s × (1 + (ψ × Δθ) / F(t))
```
- `f(t)` = taxa de infiltração no tempo t (mm/h)
- `K_s` = condutividade hidráulica saturada (mm/h)
- `ψ` = sucção matricial na frente de molhamento (mm)
- `Δθ` = déficit de umidade do solo = (η - θ_i) onde η = porosidade
- `F(t)` = infiltração acumulada (mm)

### 4.2 Método SCS-CN (Curve Number)
Amplamente usado no Brasil pelo DNIT, ANA e defesa civil:
```
Q = (P - 0.2S)² / (P + 0.8S)   para P > 0.2S
S = 25400/CN - 254   [mm]
```
- `Q` = escoamento direto (mm)
- `P` = precipitação (mm)
- `CN` = Número de Curva (0–100)

**CN por tipo de uso/cobertura:**
| Uso do Solo | Grupo Hidrológico A | B | C | D |
|---|---|---|---|---|
| Floresta (cobertura densa) | 30 | 55 | 70 | 77 |
| Pastagem (boa condição) | 39 | 61 | 74 | 80 |
| Residencial (lotes 1000 m²) | 54 | 70 | 80 | 85 |
| Áreas impermeáveis | 98 | 98 | 98 | 98 |

---

## 5. Acumulação Topográfica — Algoritmo D8

O método D8 (Deterministic Eight-Direction) é a base da análise hidrológica digital:

**Princípio:**
Para cada célula do DEM, o fluxo escoa para o vizinho mais baixo entre as 8 direções (N, NE, E, SE, S, SW, W, NW):
```
D8(i,j) = argmin{h(i+di, j+dj)} para di,dj ∈ {-1,0,1}
```

**Flow Accumulation (acumulação de fluxo):**
```
ACC(i,j) = 1 + Σ ACC(k)   para todo k que drena para (i,j)
```
Células com alto ACC correspondem a canais naturais, vales e zonas de acumulação de água — exatamente as primeiras a inundar.

**Delineamento de sub-bacias:** Usa-se "watershed pour point" para extrair bacias contribuintes.

**Extensões modernas:**
- **D-infinity (Tarboton 1997):** distribui fluxo proporcionalmente entre dois vizinhos, eliminando artefatos de direção
- **MFD (Multiple Flow Direction):** distribui fluxo para todos os vizinhos mais baixos proporcionalmente à declividade

---

## 6. Hidráulica de Inundação Urbana

### 6.1 Capacidade da Rede de Drenagem
Galeria circular pela equação de Manning:
```
Q_máx = (1/n) × (π/4 × D²) × (D/4)^(2/3) × S^(1/2)
```
Quando `Q_chuva > Q_capacidade` → o excesso escoa pela superfície (enxurrada urbana)

### 6.2 Efeito da Impermeabilização
```
C_urbano = C_impermeável × f_imp + C_permeável × (1 - f_imp)
```
Onde `f_imp` = fração impermeável (0.8–0.95 para centros urbanos)

Aumento do volume de escoamento com urbanização:
```
Vol_após / Vol_antes ≈ (CN_após/CN_antes)² × (P + 0.8×S_antes) / (P + 0.8×S_após)
```

---

## 7. Análise de Frequência e Período de Retorno

### 7.1 Distribuição de Gumbel (EV-I)
Para máximos anuais de precipitação/descarga:
```
F(x) = exp(-exp(-α(x - u)))
α = π / (σ_x × √6)
u = x̄ - 0.5772/α
```
**Período de retorno T:** `P(X > x_T) = 1/T`

### 7.2 Distribuição Log-Pearson III
Padrão do USBR e USGS para análise de cheias:
```
log(Q) ~ Pearson III(μ, σ, γ)
Q_T = exp(μ + K_T × σ)
```
Onde `K_T` é o fator de frequência dependente do coeficiente de assimetria γ e do período T.

---

## 8. Intensidade, Profundidade e Danos

### 8.1 Produto Velocidade × Profundidade (Hazard)
```
H = v × d   [m²/s]
```
- `H < 0.3 m²/s` → baixo risco (crianças e pedestres — risco de queda)
- `H > 0.5 m²/s` → perigo para adultos (carros começam a ser arrastados com H > 0.1)
- `H > 1.0 m²/s` → destruição de estruturas leves
- `H > 2.0 m²/s` → perigo para estruturas de alvenaria

### 8.2 Curvas de Profundidade-Dano (Depth-Damage Curves)
```
D(d) = D_max × f(d)   onde f(d) = 1 - exp(-k × d)
```
Ou em forma tabular — exemplo residencial brasileiro:
| Profundidade (m) | Dano relativo (%) |
|---|---|
| 0.0 – 0.5 | 5–15% |
| 0.5 – 1.0 | 15–35% |
| 1.0 – 1.5 | 35–55% |
| 1.5 – 2.0 | 55–70% |
| > 2.0 | 70–95% |

### 8.3 Número de Reynolds para Erosão
```
Re = V × d / ν
```
Para Re > 2000 e alta energia cinética → transporte de sedimentos e erosão de fundação.

---

## 9. Escala de Intensidade de Enchentes

| Categoria | Lâmina d'água | Velocidade | Dano Esperado |
|---|---|---|---|
| Leve | < 0.3 m | < 0.5 m/s | Inundação de pisos baixos |
| Moderada | 0.3–1.0 m | 0.5–1.5 m/s | Perda de móveis, veículos |
| Severa | 1.0–2.5 m | 1.5–3.0 m/s | Dano estrutural, colapso de alvenaria |
| Extrema | > 2.5 m | > 3.0 m/s | Destruição total, flash flood |

---

## 10. Parâmetros para Simulação Computacional

| Parâmetro | Unidade | Faixa Típica | Efeito na Simulação |
|---|---|---|---|
| `waterLevel` | m | 0 – 40 | Altura da lâmina d'água sobre o terreno |
| `precipitation` | mm/h | 0 – 300 | Taxa de precipitação |
| `floodVelocity` | m/s | 0 – 8 | Velocidade do escoamento superficial |
| `soilMoisture` | % | 0 – 100 | Saturação antecedente do solo |
| `duration` | h | 1 – 72 | Duração do evento |
| `intensity` | % | 0 – 100 | Intensidade relativa do desastre |
| `CN` (curve number) | – | 30 – 98 | Potencial de escoamento superficial |

---

## 11. Modelagem Física da Água sobre Terreno

### 11.1 Elevação da Superfície Livre (Water Surface Profile)
Para escoamento gradualmente variado:
```
dh/dx = (S_0 - S_f) / (1 - Fr²)
```
Singularidades quando Fr → 1 (zona de transição crítica).

### 11.2 Tempo de Concentração (Kirpich/FAO)
```
Tc = 0.0195 × L^0.77 × S^(-0.385)   [min]
```
- `L` = comprimento do talvegue (m)
- `S` = declividade média (m/m)

### 11.3 Pressão Hidrostática em Paredes
```
P(z) = ρ_água × g × (h - z)
F_total = (1/2) × ρ × g × h²  [N/m]
```
Uma lâmina de 1.5 m exerce ~11 kN/m de força lateral em uma parede — suficiente para comprometer alvenaria simples sem verga.

---

## 12. Contexto Brasileiro

- **Órgão de Monitoramento:** CEMADEN (Centro Nacional de Monitoramento e Alertas de Desastres Naturais) — alertas em tempo real para ~1000 municípios
- **Agência reguladora:** ANA (Agência Nacional de Águas) — dados hidrométricos, SAR (Sistema de Alerta de Cheias)
- **Regiões críticas:** Vale do Itajaí (SC), Serra Gaúcha (RS), Região Serrana do RJ, Baixada Santista (SP), Vale do Rio Doce (MG)
- **Evento referência:** Enchente da Região Serrana do RJ (2011) — 916 mm em 24h, 916 mortos, 300.000 deslocados
- **Enchente RS 2024:** evento histórico, Rio Guaíba > 5.33 m (recorde), 600.000 deslocados
- **Clima:** El Niño intensifica chuvas no Sul/Sudeste; La Niña no Norte/Nordeste

---

## 13. Referências Científicas

- Chow, V.T. (1959). *Open-Channel Hydraulics*. McGraw-Hill.
- Bates, P.D. et al. (2010). A simple inertial formulation of the shallow water equations for efficient two-dimensional flood inundation modelling. *Journal of Hydrology*, 387(1-2), 33-45.
- USACE HEC-RAS (Hydrologic Engineering Center — River Analysis System), versão 6.x
- Soil Conservation Service (1972). *National Engineering Handbook, Section 4: Hydrology*. USDA.
- Green, W.H. & Ampt, G.A. (1911). Studies on soil physics. *Journal of Agricultural Science*, 4(1), 1-24.
- Tarboton, D.G. (1997). A new method for the determination of flow directions and upslope areas in grid digital elevation models. *Water Resources Research*, 33(2), 309-319.
- CEMADEN. Relatório Anual de Monitoramento de Desastres. MCTI, Brasil.
- ANA — Atlas Pluviométrico do Brasil (2012).
