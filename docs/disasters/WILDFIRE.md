# WILDFIRE — Incêndio Florestal / Queimada
## Conhecimento Científico Especializado para Simulação de Desastres

---

## 1. Triângulo e Tetraedro do Fogo

### 1.1 Triângulo do Fogo (elementos necessários)
- **Combustível (Fuel):** material orgânico seco — folhas, galhos, gramíneas, manta orgânica
- **Comburente (Oxidante):** oxigênio (O₂, ≥ 16% na atmosfera)
- **Calor (Energia de ignição):** raio, fagulha, brasa, fósforo

**Tetraedro do Fogo (combustão em cadeia):**
+ Reação em cadeia autossustentada — radicais livres (OH•, H•, O•)

---

## 2. Ambiente de Incêndio — A Tríade

```
Comportamento do Fogo = f(Combustível, Topografia, Clima/Meteorologia)
```

### 2.1 Combustível (Fuel)
**Carga de combustível (Fuel Load):** kg de matéria seca por m²
```
w = ∫₀ᴴ ρ_fuel × f_biomassa × dz   [kg/m²]
```
**Teor de umidade do combustível (Fine Fuel Moisture Content — FFMC):**
```
FFMC = 59.5 × (250 - mo_eq) / (147.2 + mo_eq)
mo_eq = (Equilíbrio de umidade baseado em T, RH via equação empírica de Van Wagner)
```
- FFMC > 90 → extremamente inflamável
- FFMC > 95 → risco crítico de ignição

**Modelos de Combustível (NFFL/Anderson 13 tipos):**
- Modelo 1 (Gramíneas anuais): w ≈ 0.166 kg/m², velocidade alta de propagação
- Modelo 8 (Serapilheira compacta): w ≈ 1.117 kg/m², propagação lenta mas intensa
- Modelo 13 (Grandes detritos lenhosos): w ≈ 3.013 kg/m², intensidade extrema

### 2.2 Topografia
- **Declividade:** cada 10% de slope → dobro da velocidade de propagação (regra de Albini)
- **Aspecto:** encostas sul-expostas (HS) mais secas → mais inflamáveis
- **Canalização do vento** em vales → aceleração local

```
φ_slope = exp(0.069 × slope_pct)   (fator de inclinação no Rothermel)
```

### 2.3 Meteorologia
- **Vento:** principal fator de intensificação e direção
- **Temperatura:** afeta secagem e FFMC
- **Umidade relativa:** diretamente relacionada à umidade do combustível
- **Inversion layer:** supressão convectiva → foco na superfície

---

## 3. Modelo de Propagação de Rothermel (1972)

O modelo mais utilizado mundialmente para previsão de comportamento do fogo:

```
R = I_R × ξ × (1 + φ_w + φ_s) / (ρ_b × ε × Q_ig)
```

Onde:
- `R` = velocidade de propagação [m/min]
- `I_R` = intensidade de reação [kJ/min/m²] = Γ' × w_n × h × η_M × η_s
- `ξ` = razão de propagação (flux ratio) = exp[(0.792 + 0.681×σ^0.5)(β+0.1)] / (192+0.2595σ)
- `φ_w` = fator de vento = C × U^B × (β/β_op)^(-E)
- `φ_s` = fator de inclinação = 5.275 × β^(-0.3) × (tan Φ)²
- `ρ_b` = bulk density do combustível [kg/m³]
- `ε` = fator de calor efetivo de aquecimento
- `Q_ig` = calor de pré-ignição [kJ/kg] ≈ 251 + 1116×M_f (onde M_f = umidade fração decimal)

**Intensidade de Reação:**
```
I_R = Γ' × w_n × h × η_M × η_s
Γ' = Γ'_max × (β/β_op)^A × exp(A × (1 - β/β_op))
```

---

## 4. Intensidade de Linha de Fogo (Byram 1959)

```
I = H × w × R
```
- `I` = intensidade de linha de fogo [kW/m]
- `H` = calor de combustão efetivo [kJ/kg] ≈ 18,000–21,000 kJ/kg (celulose)
- `w` = carga de combustível consumida [kg/m²]
- `R` = velocidade de propagação [m/s]

**Relação com comprimento de chama (Byram):**
```
L_f = 0.0775 × I^0.46   [m]
```

**Classificação por intensidade:**
| I (kW/m) | L_f (m) | Supressão |
|---|---|---|
| < 500 | < 1.5 | Direta — batedores, tratores |
| 500–2000 | 1.5–3.5 | Indireta — aceiros, retardante aéreo |
| 2000–10000 | 3.5–10 | Ataque aéreo intensivo |
| > 10000 | > 10 | Incontrolável — evacuação |

---

## 5. Transição para Fogo de Copa (Crown Fire)

### 5.1 Critério de Van Wagner (1977)

**Iniciação do fogo de copa (condição de início):**
```
I₀ = (0.01 × CBH × (460 + 26×M_f))^1.5   [kW/m]
```
- `CBH` = altura da base da copa [m]
- `M_f` = umidade dos ramos finos vivos [%]
- Se `I ≥ I₀` → transição para fogo de copa iniciada

**Propagação ativa de copa:**
```
R_a = 3.0 / CBD   [m/min]   onde CBD = densidade de carga da copa [kg/m³]
```
Se R_crown ≥ R_a → fogo de copa ativo (se não, fogo de copa passivo)

**Energia liberada por fogo de copa:**
```
I_total = I_superfície + CBD × h × R_crown × 1000/60   [kW/m]
```

---

## 6. Sistema FWI — Fire Weather Index

Sistema canadense (Van Wagner 1987) amplamente adotado incluindo pelo INPE/CENSIPAM no Brasil:

### 6.1 Sub-índices
**FFMC (Fine Fuel Moisture Code) — combustível fino:**
```
E_d = 0.942 × H^0.679 + 11 × exp((H-100)/10) + 0.18 × (21.1 - T) × (1 - exp(-0.115×H))
m_o = 250 - E_d + ...   (equação iterativa)
FFMC = 59.5 × (250-m)/(147.2+m)
```

**DMC (Duff Moisture Code) — camada orgânica:**
```
K = 1.894 × (T+1.1) × (100-H) × l_e × 10⁻⁶
DMC = P_o + 100 × K
```

**DC (Drought Code) — profundidade de seca:**
```
Q = 0.36 × (T + 2.8) + L_f
DC = D_o + 0.5 × Q
```

**ISI (Initial Spread Index) — velocidade de propagação inicial:**
```
ISI = 0.208 × F × exp(0.05039 × W)   onde F = função do FFMC e W = vento (km/h)
```

**BUI (Buildup Index) — carga de combustível disponível:**
```
BUI = 0.8 × DMC × DC / (DMC + 0.4 × DC)
```

**FWI (Fire Weather Index):**
```
D = 0.0272 × (ISI × B)^1.77   onde B = função do BUI
FWI = 1.0 / (0.10 × D^(-0.9) + 0.9)
```
| FWI | Risco |
|---|---|
| 0–5 | Baixo |
| 5–11 | Moderado |
| 11–21 | Alto |
| 21–33 | Muito Alto |
| > 33 | Extremo |

---

## 7. Transporte de Brasas (Spotting)

### 7.1 Distância de Lançamento de Faíscas
Modelos de Albini (1983) e Sardoy (2007):

**Distância máxima de spotting:**
```
X_max ≈ 0.56 × U_10 × h_f^0.5   [km]
```
- `U_10` = velocidade do vento a 10m [m/s]
- `h_f` = altura da chama [m]

**Modelo de transporte balístico com combustão em voo:**
```
dX/dt = V_vento + V_drift
dZ/dt = V_updraft - V_terminal
```
A brasa perde massa por combustão e eventualmente cai quando seu diâmetro < crítico.

**Probabilidade de ignição:**
```
P_ig = f(Mc, tipo_brasa, superfície) × exp(-k × X)
```
Brasas podem percorrer até 35 km em condições extremas (incêndios de 2019–2020 na Austrália).

---

## 8. Índice de Haines (Haines Index — HI)

Mede a instabilidade e secura do ar baixo-troposférico:
```
HI = A + B
```
- `A` = estabilidade = diferença de temperatura (850–700 hPa ou 950–850 hPa)
- `B` = umidade = ponto de orvalho na camada inferior

| HI | Potencial de desenvolvimento de grandes incêndios |
|---|---|
| 2–3 | Muito baixo |
| 4 | Baixo |
| 5 | Moderado |
| 6 | Alto |

---

## 9. Comportamento Pós-Fogo

### 9.1 Hidrofobicidade do Solo
Substâncias orgânicas volatilizadas condensam-se em camadas subsuperficiais e formam camada hidrofóbica:
```
Repelência = f(T_fogo, tipo_solo, umidade)
T > 270°C → camada hidrofóbica intensa
```
Consequências: aumento do escoamento superficial → risco de debris flow pós-incêndio.

### 9.2 Risco de Deslizamento Pós-Fogo
A ausência de cobertura vegetal + solo hidrofóbico → maior escoamento → saturação sub-superficial rápida → failure de talude.

### 9.3 Erosão Acelerada
```
Erosão_pós_fogo / Erosão_normal ≈ 2 – 40× (dependendo do tipo de solo e inclinação)
```

---

## 10. Biomas Brasileiros e Comportamento do Fogo

| Bioma | Área (km²) | Sazonalidade | Combustível Dominante | I típica |
|---|---|---|---|---|
| **Cerrado** | 2.0 Mi | Maio–Setembro | Gramíneas (Poaceae) | 5,000–20,000 kW/m |
| **Amazônia** | 4.2 Mi | Agosto–Outubro | Serapilheira densa | 1,000–8,000 kW/m |
| **Mata Atlântica** | 150 k | Julho–Setembro | Serapilheira + epífitas | 500–5,000 kW/m |
| **Pantanal** | 150 k | Agosto–Setembro | Gramíneas e ciperáceas | 2,000–10,000 kW/m |
| **Caatinga** | 850 k | Junho–Agosto | Folhas ressecadas | 1,000–5,000 kW/m |

**Monitoramento nacional:** INPE/BDQueimadas — detecção de focos ativos por satélite (AQUA/TERRA MODIS, VIIRS/Suomi-NPP, GOES-16 ABI) — resolução até 375 m.

---

## 11. Parâmetros para Simulação

| Parâmetro | Unidade | Faixa | Efeito |
|---|---|---|---|
| `spreadRate` | m/h | 0–5000 | Velocidade de propagação do fogo |
| `windSpeed` | km/h | 0–150 | Fator de intensificação principal |
| `windDirection` | graus | 0–360 | Direção de propagação |
| `intensity` | % | 0–100 | Intensidade relativa |
| `fuelLoad` | kg/m² | 0.1–5.0 | Carga de combustível |
| `fuelMoisture` | % | 2–30 | Teor de umidade |
| `temp` | °C | 10–45 | Temperatura do ar |
| `humidity` | % | 5–80 | Umidade relativa |

**Derivações para renderização:**
```
fireRadius = max(4000, ((spreadRate/3600) × time × 4 + 60) × CM)   [cm]
fireScorch  = min(1.0, (spreadRate/800) × min(1.0, time/8))
buildingDamage = min(1.0, (spreadRate/600) × min(1.0, time/8))
```

---

## 12. Referências Científicas

- Rothermel, R.C. (1972). *A Mathematical Model for Predicting Fire Spread in Wildland Fuels*. USDA Forest Service, Research Paper INT-115.
- Byram, G.M. (1959). Combustion of forest fuels. In Davis, K.P. (ed.), *Forest Fire: Control and Use*. McGraw-Hill.
- Van Wagner, C.E. (1977). Conditions for the start and spread of crown fire. *Canadian Journal of Forest Research*, 7(1), 23–34.
- Van Wagner, C.E. (1987). *Development and Structure of the Canadian Forest Fire Weather Index System*. Canadian Forestry Service, Technical Report 35.
- Albini, F.A. (1983). Transport of firebrands by line thermals. *Combustion Science and Technology*, 32(5-6), 277–288.
- Anderson, H.E. (1982). *Aids to Determining Fuel Models for Estimating Fire Behavior*. USDA Forest Service, General Technical Report INT-122.
- Huygens, R.N. (1941). Onderzoekingen over de natuur des lichts. *Verhandelingen der Koninklijke Akademie*.
- INPE/BDQueimadas. *Sistema de Informações sobre Focos Ativos*. Instituto Nacional de Pesquisas Espaciais, Brasil.
- Marengo, J.A. et al. (2022). Extreme fires in 2019–2021 in South America. *Bulletin of the American Meteorological Society*.
