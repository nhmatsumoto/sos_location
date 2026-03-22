# HURRICANE / CYCLONE — Furacão / Ciclone Tropical
## Conhecimento Científico Especializado para Simulação de Desastres

---

## 1. Classificação e Tipologia

| Região | Nome | Escala Utilizada |
|---|---|---|
| Atlântico Norte / Pacífico NE | Furacão (Hurricane) | Saffir-Simpson |
| Pacífico NW | Tufão (Typhoon) | JMA |
| Oceano Índico / Pacífico SW | Ciclone Tropical | Aus. BOM / IMD |
| Brasil (Atlântico Sul) | Ciclone Extratropical / subtropical | INMET |

**Nota:** O Atlântico Sul produz raramente ciclones tropicais. O Catarina (2004) foi o único furacão tropical documentado no Brasil.

---

## 2. Formação — Condições Necessárias

### 2.1 Critérios de Genesis (Gray 1968)
1. **SST ≥ 26–27°C** na camada superior oceânica (≥ 50 m de profundidade)
2. **Coriolis significativo:** latitudes > 5° (impossível no equador)
3. **Baixo cisalhamento vertical do vento (wind shear):** < 10–15 m/s diferença entre 200–850 hPa
4. **Instabilidade atmosférica:** alta umidade na troposfera média
5. **Perturbação inicial:** onda tropical africana, ZCIT, MJO, baixa fria

### 2.2 Ciclo de Vida
```
Distúrbio tropical → Depressão Tropical (V < 17 m/s)
  → Tempestade Tropical (17–33 m/s)
  → Furacão/Ciclone Categoria 1 (> 33 m/s)
  → Intensificação Rápida: ΔV > 15 m/s em 24h
  → Pico de Intensidade
  → Enfraquecimento (water cooling, wind shear, land)
```

---

## 3. Estrutura Física do Ciclone

### 3.1 Componentes Principais
- **Olho (Eye):** núcleo de subsidência, céu limpo, calmo, pressão mínima, ~20–60 km de diâmetro
- **Parede do Olho (Eyewall):** anel de convecção profunda, ventos máximos, chuvas mais intensas
- **Bandas de Chuva (Rainbands):** espirais de convecção irradiando do centro, 200–800 km
- **Camada de Saída (Outflow):** anticiclone em altitude (~200 hPa), dispersa calor para o ambiente

### 3.2 Perfil de Ventos — Modelo de Rankine Modificado
**Dentro do raio de máximos ventos (r < R_max):**
```
V(r) = V_max × (r / R_max)
```
**Fora do raio de máximos ventos (r > R_max):**
```
V(r) = V_max × (R_max / r)^x   onde x ≈ 0.4–0.6
```

**Modelo de Holland (1980) — perfil de pressão:**
```
P(r) = P_c + ΔP × exp(-(R_max/r)^B)
```
- `P_c` = pressão no centro (hPa)
- `ΔP = P_∞ - P_c` = queda de pressão (hPa)
- `B` = parâmetro de forma de Holland ≈ 1.0–2.5 (geralmente 1.2–1.6)
- `R_max` = raio de máximos ventos (km)

**Velocidade máxima via perfil de Holland:**
```
V_max = √(B × ΔP / (ρ_ar × e) + (f × R_max/2)²) - (f × R_max/2)
```
- `ρ_ar` ≈ 1.15 kg/m³ (ar na superfície)
- `f` = parâmetro de Coriolis = 2Ω sin(φ)
- `e` = base do logaritmo natural ≈ 2.718

---

## 4. Teoria da Intensidade Potencial (Emanuel 1988)

O ciclone tropical funciona como um motor de Carnot entre o oceano quente (fonte) e a troposfera superior fria (sorvedouro):

```
V²_max = (T_s - T_o)/T_o × (C_K/C_D) × (k*_s - k)
```
- `T_s` = temperatura superficial do mar (K)
- `T_o` = temperatura de saída (topo da troposfera, ~200 hPa, ≈ 200 K)
- `C_K` = coeficiente de troca de entalpia superficial ≈ 1.2 × 10⁻³
- `C_D` = coeficiente de arrasto ≈ 1.5 × 10⁻³
- `k*_s` = entalpia de saturação da superfície do mar (J/kg)
- `k` = entalpia do ar na camada limite

**Eficiência termodinâmica:**
```
η = (T_s - T_o)/T_s ≈ (300 - 200)/300 ≈ 0.33
```
Para ΔT = 15°C entre SST e normal → V_max aumenta ~8 m/s

---

## 5. Escala Saffir-Simpson

| Categoria | Ventos Máximos Sustentados | Pressão Central | Maré de Tempestade |
|---|---|---|---|
| 1 | 119–153 km/h (64–82 kt) | > 980 hPa | 1.2–1.5 m |
| 2 | 154–177 km/h (83–95 kt) | 965–980 hPa | 1.8–2.4 m |
| 3 | 178–208 km/h (96–112 kt) | 945–965 hPa | 2.7–3.7 m |
| 4 | 209–251 km/h (113–136 kt) | 920–945 hPa | 4.0–5.5 m |
| 5 | > 252 km/h (> 136 kt) | < 920 hPa | > 5.5 m |

**Recordes:**
- Patricia (2015, Pacífico): 345 km/h, 872 hPa
- Tip (1979, Pacífico): 870 hPa (mais baixo registrado)
- Katrina (2005): maré de tempestade de 8.5 m em New Orleans

---

## 6. Maré de Tempestade (Storm Surge)

### 6.1 Estimativa Simplificada
```
η_surge ≈ 0.5 × V²_max × R_max / (g × d)   [m]
```
- `d` = profundidade média da plataforma continental

**Equação empírica para surge central:**
```
η_max ≈ 0.017 × ΔP + 0.003 × F × R_max
```
- `F` = fetch efectivo (km)
- `ΔP` = queda de pressão (hPa)

### 6.2 Modelo de SLOSH (Sea, Lake and Overland Surges from Hurricanes)
Equações de águas rasas forçadas por ventos e gradiente de pressão atmosférica:
```
∂u/∂t - fv = -g∂η/∂x - (1/ρ)(∂P_a/∂x) + τ_sx/ρh
∂v/∂t + fu = -g∂η/∂y - (1/ρ)(∂P_a/∂y) + τ_sy/ρh
∂η/∂t + ∂(uh)/∂x + ∂(vh)/∂y = 0
```

---

## 7. Decaimento sobre Terra (Landfall Decay)

Após a aterrissagem, ventos diminuem por perda de energia do oceano e atrito:

**Modelo de Kaplan & DeMaria (1995):**
```
V(t) = V_bg + (V₀ - V_bg) × exp(-α × t)
```
- `V₀` = intensidade no momento do landfall
- `V_bg` = intensidade de fundo (background, ≈ 10–20 m/s)
- `α` ≈ 0.095 h⁻¹ (constante de decaimento)
- Tempo de meia-vida da intensidade: t₁/₂ ≈ ln(2)/α ≈ 7.3 horas

---

## 8. Trajetória — Dinâmica de Deslocamento

**Beta-drift:** Devido ao gradiente de vorticidade planetária (β = ∂f/∂y), ciclones migram para noroeste no hemisfério norte e para sudoeste no hemisfério sul.
```
V_beta ≈ 2β × R_giro   (norte-nordeste, HN; sul-sudeste, HS)
```

**Recurvatura (Recurvature):** Sob influência de frente fria / cavado de altitude, o ciclone curva para nordeste (HN) ao atingir latitudes > 30°.

---

## 9. Precipitação e Distribuição

**Taxa de chuva máxima na parede do olho:**
```
R_rain = 0.8–2.5 mm/min (48–150 mm/h)
```
**Precipitação total acumulada:**
```
Chuva ≈ (2π × R_max × LCM × t) / V_translação
```
Ciclone lento → chuva muito mais intensa sobre uma área.

**Equação empírica (Lonfat et al. 2004):**
```
RR(r) = RR_max × exp(-(r - R_max)²/ (2σ²))   (distribuição gaussiana radial)
```

---

## 10. Força do Vento em Estruturas

**Pressão dinâmica do vento:**
```
q = (1/2) × ρ_ar × V²   [Pa]
ρ_ar = 1.225 kg/m³ (ISA)
```
**Força de arrasto em edificação:**
```
F_drag = C_D × q × A_frontal
```
**Forças em edificações por categoria:**
| Cat. | V (m/s) | q (Pa) | Pressão equiv. |
|---|---|---|---|
| 1 | 33–42 | 666–1,081 | 67–108 kgf/m² |
| 2 | 43–49 | 1,134–1,470 | 115–149 kgf/m² |
| 3 | 50–58 | 1,531–2,059 | 156–210 kgf/m² |
| 4 | 58–70 | 2,059–3,002 | 210–306 kgf/m² |
| 5 | > 70 | > 3,002 | > 306 kgf/m² |

**Resistência estrutural típica:**
- Telhado convencional cerâmico: 40–80 kgf/m²
- Parede de alvenaria não reforçada: 60–120 kgf/m² lateral
- Estrutura de concreto armado: 300–600 kgf/m²

---

## 11. Parâmetros para Simulação

| Parâmetro | Unidade | Faixa | Descrição |
|---|---|---|---|
| `windSpeed` | km/h | 0–350 | Velocidade máxima sustentada |
| `windDirection` | graus | 0–360 | Direção de deslocamento da tempestade |
| `pressure` | hPa | 850–1010 | Pressão no centro (olho) |
| `intensity` | % | 0–100 | Intensidade relativa |
| `precipitation` | mm/h | 0–300 | Taxa de precipitação |
| `stormSurge` | m | 0–10 | Altura da maré de tempestade |
| `radius` | km | 20–500 | Raio de máximos ventos |

**Derivações para renderização:**
```
buildingDamage = min(1.0, (windSpeed/280) × intensity)
q_max = 0.5 × 1.225 × (windSpeed/3.6)²   [Pa — arrasto em fachadas]
```

---

## 12. Ciclones no Brasil

- **Ciclone Catarina (2004):** Único furacão tropical documentado no Atlântico Sul, SC/RS, vento ~160 km/h, 3 mortes diretas, R$ 70 Mi em danos
- **Ciclones Extratropicais:** comuns no Sul do Brasil (maio–setembro), ventos 80–130 km/h
- **Sistema SALA/INMET/CPTEC:** monitoramento 24h de ciclones extratropicais
- **Temporais severos do Nordeste:** MCS (Mesoscale Convective Systems), VCAN (Vórtice Ciclônico em Altitude)

---

## 13. Referências Científicas

- Emanuel, K.A. (1988). The maximum intensity of hurricanes. *Journal of the Atmospheric Sciences*, 45(7), 1143–1155.
- Holland, G.J. (1980). An analytic model of the wind and pressure profiles in hurricanes. *Monthly Weather Review*, 108(8), 1212–1218.
- Saffir, H.S. (1973). Hurricane wind and storm surge. *The Military Engineer*, 423, 4–5.
- Kaplan, J. & DeMaria, M. (1995). A simple empirical model for predicting the decay of tropical cyclone winds after landfall. *J. Applied Meteorology*, 34(11), 2499–2512.
- Gray, W.M. (1968). Global view of the origin of tropical disturbances and storms. *Monthly Weather Review*, 96(10), 669–700.
- Lonfat, M. et al. (2004). Tropical cyclone rainfall distribution. *Monthly Weather Review*, 132, 1645–1661.
- Emanuel, K. (2003). Tropical cyclones. *Annual Review of Earth and Planetary Sciences*, 31, 75–104.
