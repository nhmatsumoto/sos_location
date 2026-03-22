# SNOW / FROST / BLIZZARD — Neve / Geada / Nevasca
## Conhecimento Científico Especializado para Simulação de Desastres

---

## 1. Formação de Cristais de Neve

### 1.1 Nucleação do Gelo (Ice Nucleation)
A formação de cristais de gelo requer dois processos:
- **Nucleação homogênea:** em água pura super-resfriada, espontânea abaixo de -40°C
- **Nucleação heterogênea:** na presença de partículas nucleantes (IN — Ice Nuclei) entre -5°C e -20°C
  - Partículas de solo mineral (argila, feldspato), bactérias (Pseudomonas syringae), soot

**Temperatura de congelamento:** 0°C a 1 atm; decresce com pressão e solutos:
```
ΔT_f = K_f × m × i   onde K_f(água) = 1.853 °C/molal
```

### 1.2 Diagrama de Nakaya — Hábito do Cristal
O formato do cristal de neve depende de temperatura e supersaturação:

| Temperatura (°C) | Hábito | Descrição |
|---|---|---|
| 0 a -3 | Placa (plate) | Hexagonal plano, fino |
| -3 a -5 | Coluna (column) | Prisma hexagonal |
| -5 a -8 | Placa + setor | Mais complexo |
| -8 a -12 | Dendrito (dendrite) | Estrela clássica, 6 braços |
| -12 a -16 | Placa densa | Compacto |
| -16 a -22 | Coluna oca | Hollow column |
| < -22 | Misto | Combinações |

---

## 2. Acumulação e Propriedades da Neve

### 2.1 Densidade da Neve
A neve fresca tem densidade muito menor que o gelo compacto:
```
ρ_neve = f(T_ar, vento, tempo de deposição)
```
| Tipo | Densidade (kg/m³) |
|---|---|
| Neve recém-caída, calma | 30–70 |
| Neve média | 70–150 |
| Neve compactada | 150–350 |
| Neve granular (primavera) | 350–500 |
| Firn (nevado compactado) | 400–830 |
| Gelo glaciar | 830–920 |

### 2.2 Snow Water Equivalent (SWE)
```
SWE = h_neve × (ρ_neve / ρ_água)   [mm ou m]
```
Exemplo: 50 cm de neve fresca (ρ=70 kg/m³) → SWE = 35 mm (equivalente de chuva).

### 2.3 Carga de Neve em Coberturas
Norma ASCE 7:
```
S = C_s × C_e × C_t × I × p_g
```
- `p_g` = carga de neve no solo [kN/m²]
- `C_s` = coeficiente de forma do telhado
- `C_e` = coeficiente de exposição ao vento
- `C_t` = coeficiente térmico (aquecido = 1.0, não aquecido = 1.3)
- `I` = fator de importância

**Carga de neve no solo:**
```
p_g = ρ_neve × g × h_neve   [N/m²]
```
50 cm de neve compactada (ρ=300 kg/m³): p_g = 1,472 Pa ≈ 150 kgf/m²

**Telhados típicos no Brasil (sem projeto para neve):** capacidade ≈ 30–60 kgf/m² → risco de colapso com > 20–30 cm de neve compactada.

---

## 3. Nevascas e Blizzards

### 3.1 Definição Meteorológica (NOAA)
**Blizzard:** ventos ≥ 56 km/h + neve intensa + visibilidade ≤ 400 m por ≥ 3 horas.

### 3.2 Equações de Transporte de Neve pelo Vento
**Threshold de erosão (velocidade crítica):**
```
u*_t ≈ 0.1 × √(ρ_neve × g × d_partícula / ρ_ar)
```
Típico: u*_t ≈ 0.2–0.3 m/s (velocidade de fricção)
Velocidade do vento a 10 m: U₁₀_t ≈ 5–10 m/s (depende da densidade da neve)

**Transporte por saltação e suspensão:**
```
q_saltação ∝ u*³   [kg/m/s]
q_suspensão ∝ u*² × z_ref⁻¹
```

### 3.3 Deriva de Neve (Snow Drift)
Acumulação em obstáculos (paredes, veículos, estruturas):
```
h_drift = C_drift × U² / g   [m]   (estimativa empírica)
```
Deriva pode acumular 3–5× a altura da neve regular próximo a obstáculos.

---

## 4. Geada (Frost)

### 4.1 Tipos de Geada
- **Geada de advecção:** massa de ar fria entra em região — toda a coluna resfria
- **Geada de radiação:** noite clara, vento fraco — superfície resfria por radiação de onda longa
- **Geada branca (hoarfrost):** deposição de gelo por vapor → cristais visíveis
- **Geada negra (black frost):** temperatura < 0°C mas sem deposição visível de gelo (umidade baixa) — mais letal para vegetação

**Ponto de orvalho e formação:**
```
T_dp = T_ar - (100 - RH)/5   [°C]   (aproximação Magnus)
Geada ocorre quando T_superfície ≤ 0°C
```

### 4.2 Profundidade de Congelamento do Solo
**Equação de Stefan (congelamento unidimensional):**
```
z_f = √(2 × k_solo × t × ΔT / L × ρ)   [m]
```
- `k_solo` = condutividade térmica do solo [W/m/K] ≈ 0.3–2.5
- `t` = tempo de exposição [s]
- `ΔT` = temperatura abaixo de 0°C [°C]
- `L` = calor latente de fusão = 334,000 J/kg
- `ρ` = densidade do solo congelado ≈ 1500 kg/m³

**Índice de Congelamento (Freezing Index):**
```
FI = Σ |ΔT_abaixo_zero| × Δt   [graus-dia ou °C·dia]
```
Solo congelado quando FI > F_crítico para o tipo de solo.

### 4.3 Heaving do Solo (Frost Heave)
Expansão volumétrica do solo ao congelar (~9%):
```
Expansão ≈ V_água_poros × 0.09
Pressão de frost heave: até 2,000 kPa → rachaduras em fundações
```

---

## 5. Índice de Sensação Térmica (Wind Chill)

**Equação NOAA/Meteorological Service of Canada (2001):**
```
T_wc = 13.12 + 0.6215×T - 11.37×V^0.16 + 0.3965×T×V^0.16
```
- `T` = temperatura do ar [°C]
- `V` = velocidade do vento a 10 m [km/h]

**Risco de congelamento de tecidos (frostbite):**
| T_wc (°C) | Risco | Tempo para congelamento |
|---|---|---|
| -10 a -27 | Baixo | 30 min + |
| -28 a -39 | Moderado | 10–30 min |
| -40 a -47 | Alto | 5–10 min |
| < -48 | Extremo | < 2 min |

---

## 6. Avalanches

### 6.1 Tipos
- **Avalanche de placa (Slab avalanche):** principal tipo perigoso; bloco coeso se desprende
- **Avalanche de neve solta (Loose snow avalanche):** a partir de ponto único, alarga-se
- **Avalanche úmida (Wet slab):** neve saturada de água — mais pesada e viscosa

### 6.2 Mecânica de Ruptura da Placa
A placa de neve tem resistência à tração e ao cisalhamento:
```
FS = τ_resistência / τ_tração_gravitacional
τ = ρ_neve × g × sin θ × h_placa
FS < 1.0 → avanche inicia
```

**Propagação da fratura:** depende do "weak layer" (camada fraca) sob a placa e do coeficiente de propagação de fratura (toughness) do snowpack.

### 6.3 Velocidade e Runout
```
V_max ≈ 25–100 m/s (avalanche de neve seca)
V_max ≈ 5–30 m/s (avalanche de neve úmida)
```
**Pressão de impacto em estrutura:**
```
P_imp = C_D × ρ_neve × V²   [kPa]
```
- C_D ≈ 0.4–1.0 para estruturas simples
- Pressão máxima: 100–600 kPa para avalanches severas

### 6.4 Runout (Schaerer 1975)
```
α = arctan(H/L)   ângulo de alcance
α_médio ≈ 18°–22° para avalanches de neve seca
```

---

## 7. Efeitos em Infraestrutura

### 7.1 Linhas de Transmissão
Carga de gelo acumulada em cabos:
```
d_gelo = K × V² × e^(-0.1T)   [mm]   (espessura de gelo)
```
Cabos podem suportar normalmente 10–20 mm de gelo; acima disso → falha.

### 7.2 Rodovias e Pistas de Pouso
- **Black ice (verglas):** camada fina de gelo transparente sobre asfalto — reduz atrito a μ ≈ 0.05–0.10 (vs. 0.7 em asfalto seco)
- **Coeficiente de atrito pneu-neve:** μ ≈ 0.2–0.4

### 7.3 Edificações
- Peso da neve sobre coberturas (calculado acima)
- Infiltração pela neve derretida → danos por umidade/mofo
- Expansão do gelo em trincas → deterioração progressiva (ciclos gelo-degelo)
- Perda de calor intensificada: Q = U_parede × A × ΔT (W) — isolamento crítico

---

## 8. Parâmetros para Simulação

| Parâmetro | Unidade | Faixa | Efeito |
|---|---|---|---|
| `snowfall` | cm/h | 0–50 | Taxa de acúmulo |
| `temp` | °C | -50–0 | Temperatura do ar |
| `windSpeed` | km/h | 0–150 | Transporte de neve, drift |
| `humidity` | % | 20–100 | Umidade para formação |
| `intensity` | % | 0–100 | Intensidade relativa |
| `SWE` (derivado) | mm | 0–500 | Equivalente em água |
| `snowLoad` | kPa | 0–10 | Carga em estruturas |

**Derivações para renderização:**
```
snowAccum = min(1.0, snowfall / 40.0)   → brancura no topo dos edifícios
roofColor = mix(originalColor, vec3(0.93, 0.95, 0.98), snowAccum)
visibility = max(0.1, 1.0 - (windSpeed/100) × (snowfall/20))
```

---

## 9. Neve no Brasil

### 9.1 Regiões com Neve
O Brasil é o único país da América do Sul tropical sem cadeias de alta montanha, mas neve ocorre:
- **Serra Gaúcha (RS):** São Francisco de Paula, Bom Jesus — média de 1–3 nevadas/ano
- **Serra Catarinense (SC):** São Joaquim, Urupema, Lages — região mais nevada, até 5–8 cm
- **Planalto Norte do RS/SC:** Vacaria, Campos de Cima da Serra

**Condições:**
- Temperatura < 0°C em superfície + frente polar intensa
- Massa polar de origem antártica (mP) + frente fria
- Sazonalidade: junho–agosto (inverno austral)

**Eventos extremos:**
- Agosto 2021: neve em 10 estados brasileiros, geada histórica, R$ 2 Bi em perdas agrícolas
- Julho 2013: neve em São Paulo (Apiaí) — raro evento histórico

### 9.2 Monitoramento
- **INMET:** rede de estações automáticas, alertas de geada
- **EMBRAPA:** monitoramento de risco agrícola (café, soja, trigo)
- **Defesa Civil RS/SC:** protocolos de abrigo e assistência

---

## 10. Referências Científicas

- Nakaya, U. (1954). *Snow Crystals: Natural and Artificial*. Harvard University Press.
- Liston, G.E. & Sturm, M. (1998). A snow-transport model for complex terrain. *Journal of Glaciology*, 44(148), 498–516.
- Pomeroy, J.W. & Gray, D.M. (1995). *Snowcover Accumulation, Relocation and Management*. National Hydrology Research Institute, Canada.
- Mellor, M. (1975). A review of basic snow mechanics. *IAHS Publication*, 114, 251–291.
- McClung, D. & Schaerer, P. (2006). *The Avalanche Handbook*, 3ª ed. The Mountaineers Books.
- Seidel, K. & Martinec, J. (2004). *Remote Sensing in Snow Hydrology*. Springer.
- ASCE 7-22 (2022). *Minimum Design Loads and Associated Criteria for Buildings and Other Structures*. ASCE.
- INMET (2021). *Boletim de Monitoramento da Neve e Geada — Inverno 2021*. Instituto Nacional de Meteorologia, Brasil.
