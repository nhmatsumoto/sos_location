# DROUGHT — Seca / Estiagem
## Conhecimento Científico Especializado para Simulação de Desastres

---

## 1. Definição e Classificação

**Seca** é uma deficiência prolongada de precipitação em relação à média histórica de uma região, resultando em escassez hídrica com impactos socioeconômicos e ambientais.

### 1.1 Tipos de Seca

| Tipo | Definição | Indicador Principal |
|---|---|---|
| **Meteorológica** | Déficit de precipitação abaixo da normal | SPI, SPEI |
| **Agrícola** | Déficit de umidade do solo para culturas | PDSI, SMI |
| **Hidrológica** | Redução de vazão em rios, reservatórios e aquíferos | Índice de fluxo de base |
| **Socioeconômica** | Impacto na demanda e oferta de bens e serviços | Déficit relativo à demanda |

---

## 2. Índices de Monitoramento de Seca

### 2.1 SPI — Standardized Precipitation Index (McKee et al. 1993)

O índice mais amplamente utilizado pela WMO:
```
SPI = (P_i - μ_P) / σ_P   [após transformação gamma→normal]
```

**Transformação estatística:**
```
Ajuste de distribuição Gamma ao histórico de precipitação:
G(x) = ∫₀ˣ (1/β^α Γ(α)) × t^(α-1) × e^(-t/β) dt

Transformação para distribuição normal (z-score) → SPI
```

**Escalas de tempo:**
- SPI-1 (1 mês): resposta de umidade do solo
- SPI-3 (3 meses): umidade agrícola
- SPI-6 (6 meses): deficiência sazonal
- SPI-12, SPI-24: impacto hidrológico, aquíferos

| SPI | Categoria |
|---|---|
| ≥ 2.0 | Extremamente úmido |
| 1.5–1.99 | Muito úmido |
| 1.0–1.49 | Moderadamente úmido |
| -0.99–0.99 | Próximo do normal |
| -1.0 a -1.49 | Moderadamente seco |
| -1.5 a -1.99 | Muito seco |
| ≤ -2.0 | Extremamente seco |

### 2.2 PDSI — Palmer Drought Severity Index (Palmer 1965)

Incorpora temperatura, precipitação e capacidade de retenção de água do solo:
```
X_t = 0.897 × X_{t-1} + (1/3) × Z_t
```
- `X_t` = PDSI no mês t
- `Z_t` = índice de anomalia hídrica mensal = K × (P - P̂)
- `K` = fator de ponderação climática regional
- `P̂` = precipitação climaticamente adequada (CAFEC)

**Cálculo do balanço hídrico (Palmer):**
```
P̂ = α × PE + β × PR + γ × PRO - δ × PL
```
- `PE` = evapotranspiração potencial
- `PR` = recarga do solo
- `PRO` = escoamento
- `PL` = perda do solo por déficit

| PDSI | Categoria |
|---|---|
| ≥ 4.0 | Extremamente úmido |
| 3.0–3.99 | Muito úmido |
| 2.0–2.99 | Moderadamente úmido |
| -1.99–1.99 | Próximo do normal |
| -2.0 a -2.99 | Moderadamente seco |
| -3.0 a -3.99 | Muito seco |
| ≤ -4.0 | Extremamente seco |

### 2.3 SPEI — Standardized Precipitation-Evapotranspiration Index (Vicente-Serrano 2010)

Combina precipitação com evapotranspiração potencial — sensível ao aquecimento global:
```
D = P - PET   [balanço hídrico mensal]
```
**Transformação log-logística:**
```
SPEI = W - (C₀ + C₁W + C₂W²) / (1 + d₁W + d₂W² + d₃W³)
W = √(-2 × ln(P_exc))
```
Onde `P_exc` = probabilidade de excedência da distribuição log-logística ajustada a D.

### 2.4 VPD — Vapor Pressure Deficit

Déficit de pressão de vapor — governa transpiração e estresse hídrico vegetal:
```
e_s(T) = 6.112 × exp(17.67 × T / (T + 243.5))   [hPa]  (Magnus-Tetens)
e_a    = e_s × RH / 100
VPD    = e_s - e_a   [hPa]
```
- VPD > 10 hPa → estresse moderado
- VPD > 20 hPa → estresse severo em culturas C3
- VPD > 30 hPa → fechamento estomático, colapso fotossintético

---

## 3. Balanço Hídrico do Solo

### 3.1 Parâmetros de Capacidade

| Parâmetro | Definição | Faixa Típica |
|---|---|---|
| **FC (Field Capacity)** | Máx. umidade retida após drenagem gravitacional | 20–45% (vol.) |
| **PWP (Permanent Wilting Point)** | Umidade mínima disponível para plantas | 5–25% (vol.) |
| **PAW (Plant Available Water)** | FC − PWP | 80–200 mm/m de solo |
| **θ_s (Saturação)** | Umidade na saturação | 35–55% (vol.) |

**Variação por textura:**

| Textura | FC (%) | PWP (%) | PAW (mm/m) |
|---|---|---|---|
| Areia grossa | 10–18 | 4–7 | 60–90 |
| Areia fina | 18–26 | 6–10 | 90–140 |
| Franco-arenosa | 23–32 | 8–14 | 110–160 |
| Franca | 27–38 | 11–17 | 140–200 |
| Franco-argilosa | 32–42 | 16–24 | 130–180 |
| Argila | 38–50 | 22–32 | 110–170 |

### 3.2 Equação de Balanço Hídrico

```
ΔS = P + I - ET - R - D
```
- `ΔS` = variação de armazenamento [mm]
- `P` = precipitação
- `I` = irrigação
- `ET` = evapotranspiração real
- `R` = escoamento superficial
- `D` = drenagem profunda (recarga)

### 3.3 Evapotranspiração de Referência (Penman-Monteith — FAO 56)

```
ET₀ = (0.408 × Δ × (R_n - G) + γ × (900/(T+273)) × u₂ × (e_s - e_a)) /
      (Δ + γ × (1 + 0.34 × u₂))   [mm/dia]
```
- `R_n` = saldo de radiação [MJ/m²/dia]
- `G` = fluxo de calor no solo [MJ/m²/dia]
- `T` = temperatura média do ar [°C]
- `u₂` = velocidade do vento a 2 m [m/s]
- `Δ` = inclinação da curva de pressão de vapor [kPa/°C]
- `γ` = constante psicrométrica [kPa/°C]
- `e_s - e_a` = déficit de pressão de vapor [kPa]

---

## 4. Depleção de Água Subterrânea

### 4.1 Equação de Darcy para Aquíferos

```
Q = -K × A × (dh/dl)   [m³/s]   (fluxo de Darcy)
```
- `K` = condutividade hidráulica [m/s] (10⁻³ areia, 10⁻⁸ argila)
- `A` = área da seção transversal [m²]
- `dh/dl` = gradiente hidráulico

**Equação de Theis para bombeamento:**
```
s(r,t) = Q / (4πT) × W(u)   onde u = r²S / (4Tt)
W(u) = integral de poço (tabela)
```
- `s` = rebaixamento [m]
- `T` = transmissividade [m²/s]
- `S` = coeficiente de armazenamento

### 4.2 Depleção de Aquíferos — GRACE Satellite Data

Taxa de depleção estimada por satélite:
```
ΔGWS = ΔTWS - ΔSM - ΔSWE - ΔSW
```
- `ΔTWS` = variação de água total terrestre (GRACE)
- `ΔSM` = variação de umidade do solo
- `ΔSWE` = variação de neve equivalente em água
- `ΔSW` = variação de água superficial

**Aquíferos brasileiros críticos em seca:**
- SAB (Sistema Aquífero Botucatu): nível caiu 10–40 m em 2014–2022
- Aquífero Guarani: transporte inter-estadual de 1.2 Mm³/d na seca 2021

---

## 5. Ondas de Calor e Ilha de Calor Urbano

### 5.1 Definição de Onda de Calor

Critério WMO: temperatura > percentil 90 da normal por ≥ 3 dias consecutivos.

**Índice WBGT (Wet Bulb Globe Temperature):**
```
WBGT = 0.7 × T_wb + 0.2 × T_g + 0.1 × T_a
```
- `T_wb` = temperatura de bulbo úmido (evaporação + umidade)
- `T_g` = temperatura de globo negro (radiação)
- `T_a` = temperatura do ar (sombra)

| WBGT (°C) | Risco de Estresse Térmico |
|---|---|
| < 28 | Baixo |
| 28–32 | Moderado |
| 32–35 | Alto |
| > 35 | Extremo (risco de colapso) |

### 5.2 Ilha de Calor Urbano (UHI)

```
ΔT_UHI = T_urbano - T_rural   [°C]
```
Fatores: superfícies impermeáveis, ausência de vegetação, emissão antrópica de calor, cânions urbanos.

**Balanço de energia na superfície urbana:**
```
R_n = H + LE + G + Q_A
```
- `R_n` = saldo de radiação líquida
- `H` = fluxo de calor sensível (principal na cidade)
- `LE` = fluxo de calor latente (evapotranspiração — reduzido pelo asfalto)
- `G` = fluxo de calor no solo/estrutura
- `Q_A` = calor antrópico (veículos, ar condicionado, indústria)

**ΔT_UHI típico:** 2–10°C (maior à noite, vento calmo, céu limpo)

### 5.3 LST (Land Surface Temperature) por Sensoriamento Remoto

```
LST = T_B / (1 + (λ × T_B / ρ) × ln(ε))   [K]
```
- `T_B` = temperatura de brilho [K] (radiosimetria térmica)
- `λ` = comprimento de onda (10.8 μm para Landsat 8 Band 10)
- `ρ` = h × c / k = 0.01438 m·K
- `ε` = emissividade de superfície (0.95–0.99 vegetação, 0.90–0.95 asfalto)

---

## 6. Impacto em Sistemas Fluviais e Reservatórios

### 6.1 Curva de Permanência de Vazão

```
F_exc(Q) = (m / (N + 1)) × 100   [%]
```
- `m` = posição na série ordenada decrescente
- `N` = número total de observações
- Q₉₀ (excedida 90% do tempo) = referência para seca severa

### 6.2 Índice de Estresse Hídrico (WSI)

```
WSI = Demanda_total / Disponibilidade_anual
```
| WSI | Nível |
|---|---|
| < 0.10 | Sem estresse |
| 0.10–0.20 | Baixo |
| 0.20–0.40 | Médio |
| > 0.40 | Alto (escassez crônica) |

### 6.3 Evaporação de Reservatórios

```
E_res = K_p × E_pan × A_res   [m³/dia]
```
- `K_p` ≈ 0.70–0.85 (coeficiente de pã)
- `E_pan` = evaporação de tanque [mm/dia]
- `A_res` = área da lâmina d'água [m²]

---

## 7. Impacto na Vegetação

### 7.1 NDVI (Normalized Difference Vegetation Index)

```
NDVI = (NIR - RED) / (NIR + RED)   [-1, +1]
```
- NDVI > 0.6: vegetação densa e saudável
- NDVI 0.2–0.5: vegetação esparsa / estressada
- NDVI < 0.2: solo exposto, área queimada ou seca severa

### 7.2 Estresse Hídrico Vegetal — Resistência Estomática

```
g_s = g_smax × f(VPD) × f(θ) × f(T)
```
- `g_s` = condutância estomática [mol/m²/s]
- `g_smax` ≈ 0.3–0.6 mol/m²/s (C3), 0.5–1.0 (C4)
- `f(VPD)` = fator redutor com VPD crescente → fechamento estomático
- `f(θ)` = fator redutor quando θ < FC

**Ponto de murcha permanente (PWP):** quando ψ_solo < -1.5 MPa → morte celular.

---

## 8. Seca no Brasil

### 8.1 Regiões e Sistemas

| Região | Sistema Climático | Frequência | Impacto |
|---|---|---|---|
| **Nordeste** (Semiárido) | ENSO, TSA (Atlântico Tropical Sul) | 5–10 anos (La Niña) | Colapso social histórico |
| **Sudeste** (SP/MG/RJ) | ENSO, SACZ (Zona de Convergência) | Decenal | Sistema Cantareira, crise 2014–2015 |
| **Amazônia** | ENSO, Anomalia SST Atlântico Norte | 2003, 2005, 2010, 2016 | Nível do rio Negro |
| **Sul** (RS/SC/PR) | ENSO (La Niña) | ~3–5 anos | Soja/trigo |

### 8.2 Polígono das Secas

O Semiárido brasileiro (922.000 km², 23 Mi hab.) é caracterizado por:
- Precipitação média: 400–800 mm/ano (alta variabilidade: CV > 30%)
- Déficit hídrico: 1.000–2.000 mm/ano
- Açudes como infraestrutura histórica de resiliência

**Eventos históricos:**
| Evento | Duração | Impacto |
|---|---|---|
| Seca de 1877–79 (Grande Seca) | 3 anos | 500 mil mortes, êxodo massivo |
| Seca 1932–33 | 2 anos | 1 Mi emigrantes |
| Seca 1979–83 | 4 anos | 11 estados afetados |
| Seca Sudeste 2014–2015 | 2 anos | Crise hídrica SP, volume útil Sistema Cantareira < 4% |
| Seca Amazônica 2010 | 1 ano | Nível Rio Negro: recorde de baixa (13.63 m) |
| Seca Amazônica 2023 | 1 ano | Nível Rio Solimões -59 m (pior recorde histórico) |

### 8.3 Crise Hídrica de 2014–2015 — São Paulo

- Volume Útil Sistema Cantareira: mínimo de 3.7% (22 jan 2015)
- Redução acumulada de precipitação: -34% em 2014 (RMSP)
- Sazonalidade rompida: janeiro seco (normalmente 250 mm, realizado 70 mm)
- Solução emergencial: 2 volumes mortos explorados (−3.5 m + −3.5 m adicionais)
- Impacto econômico: R$ 3.4 Bi (FIESP, 2015)

---

## 9. Parâmetros para Simulação

| Parâmetro | Unidade | Faixa | Efeito |
|---|---|---|---|
| `SPI` | adim. | -4 a +4 | Anomalia de precipitação |
| `soilMoisture` | % FC | 0–100 | Estresse agrícola |
| `reservoirLevel` | % | 0–100 | Disponibilidade hídrica |
| `temp` | °C | 15–45 | Evapotranspiração |
| `VPD` | hPa | 0–40 | Estresse hídrico vegetal |
| `intensity` | % | 0–100 | Intensidade relativa |
| `duration` | meses | 1–60 | Duração do evento |

**Derivações para renderização:**
```
vegetationDry  = max(0, 1.0 - soilMoisture/FC)   → amarelamento de vegetação
waterLineLevel = reservoirLevel / 100.0           → nível do reservatório no render
crackPattern   = max(0, 1.0 - soilMoisture/20)   → rachaduras no solo árido
buildingDust   = clamp(intensity/100, 0, 1)       → névoa de poeira
```

---

## 10. Referências Científicas

- McKee, T.B., Doesken, N.J. & Kleist, J. (1993). The relationship of drought frequency and duration to time scales. *Proceedings of the 8th Conference on Applied Climatology*, AMS, 179–184.
- Palmer, W.C. (1965). *Meteorological Drought*. US Weather Bureau Research Paper 45.
- Vicente-Serrano, S.M., Beguería, S. & López-Moreno, J.I. (2010). A multiscalar drought index sensitive to global warming. *Journal of Climate*, 23(7), 1696–1718.
- Allen, R.G. et al. (1998). *Crop Evapotranspiration — Guidelines for Computing Crop Water Requirements*. FAO Irrigation and Drainage Paper 56.
- Rodell, M. et al. (2018). Emerging trends in global freshwater availability. *Nature*, 557, 651–659.
- Marengo, J.A. et al. (2015). The 2014 southeast Brazil atmospheric drought: chronology and physical mechanisms. *Climate Research*, 62(2), 97–107.
- Nobre, C.A. et al. (2016). Land-use and climate change risks in the Amazon and the need of a novel sustainable development paradigm. *PNAS*, 113(39), 10759–10768.
- ANA (2020). *Conjuntura dos Recursos Hídricos no Brasil 2020*. Agência Nacional de Águas e Saneamento Básico.
- CEMADEN (2022). *Monitoramento de Secas e Estiagens no Brasil*. Centro Nacional de Monitoramento e Alertas de Desastres Naturais.
- Hastenrath, S. & Greischar, L. (1993). Circulation mechanisms related to northeast Brazil rainfall anomalies. *Journal of Geophysical Research*, 98(D3), 5093–5102.
