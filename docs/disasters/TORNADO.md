# TORNADO
## Conhecimento Científico Especializado para Simulação de Desastres

---

## 1. Classificação e Escala EF

A **Escala Fujita Aprimorada (Enhanced Fujita — EF)** classifica tornados pela velocidade estimada do vento com base em danos observados a indicadores de dano (DIs):

| Categoria | Velocidade 3s | Descrição dos Danos |
|---|---|---|
| **EF0** | 105–137 km/h | Dano leve: galhos quebrados, painéis de sinalização, telhas |
| **EF1** | 138–178 km/h | Dano moderado: carros movidos, telhados removidos, árvores derrubadas |
| **EF2** | 179–218 km/h | Dano considerável: casas no ar, vagões ferroviários virados |
| **EF3** | 219–266 km/h | Dano severo: andares superiores de edifícios destruídos, florestas arrasadas |
| **EF4** | 267–322 km/h | Dano devastador: casas bem construídas niveladas ao chão |
| **EF5** | > 322 km/h | Dano total: estruturas de concreto armado arrastadas de suas fundações |

**Registros históricos:**
- EF5 em El Reno, Oklahoma (2013): largura de 4.2 km (maior já registrada)
- Tri-State Tornado (1925): 352 km de percurso, 695 mortes
- Velocidade estimada máxima: ~512 km/h (vento de translação + rotação)

---

## 2. Formação — Dinâmica Atmosférica

### 2.1 Condições Precursoras (Supercell Tornados)
1. **CAPE (Convective Available Potential Energy) ≥ 2500 J/kg** — energia disponível para convecção
2. **LI (Lifted Index) < -6°C** — instabilidade intensa
3. **Cisalhamento vertical de vento (Wind Shear):**
   - Bulk Shear 0–6 km ≥ 18–20 m/s → tempestades supercelulares
   - Hodógrafo em forma de gancho (curved hodograph) → rotação organizada
4. **Bulk Richardson Number (BRN):** BRN = CAPE / (0.5 × U²_shear) — entre 15–45 → tornados prováveis
5. **Significative Tornado Parameter (STP):**
```
STP = (MLCAPE/1500 J/kg) × (MLLCL_height/1500 m)⁻¹ × (BulkShear/20 m/s) × (SREH/150 m²/s²)
```
STP > 1 → risco elevado de tornado.

### 2.2 Sequência de Formação
```
Thunderstorm → Updraft / Downdraft diferencial
  → Vórtice horizontal (vento shear → rotação)
  → Inclinação para vertical (updraft)
  → Mesociclone (diâmetro 3–10 km, rotação em ~20 min)
  → RFD (Rear Flank Downdraft) comprime e concentra vorticidade
  → Condensação → Funnel cloud → Toca o chão → TORNADO
```

### 2.3 Helicidade Relativa à Tempestade (Storm-Relative Helicity — SREH)
```
SREH = -∫₀ᴴ (V - C) × dV/dz × dz
```
- `V` = vetor de vento
- `C` = vetor de movimento da tempestade
- H = 1 km (tornado low-level) ou 3 km (mesocyclone)
- SREH > 150 m²/s² → tornado possível
- SREH > 300 m²/s² → tornado forte/violento (EF3+)

---

## 3. Modelo do Vórtice de Tornado

### 3.1 Vórtice Burgers-Rott (modelo analítico)
Solução exata para vórtice viscoso com convergência radial:

**Velocidade tangencial:**
```
V_θ(r) = Γ/(2πr) × [1 - exp(-r²/(2δ²))]
```
- `Γ` = circulação (m²/s)
- `δ` = raio do núcleo (raio de máximos ventos)
- Para r << δ: V_θ ∝ r (corpo sólido, rotação rígida)
- Para r >> δ: V_θ ∝ 1/r (vórtice potencial livre)

**Velocidade radial (convergência):**
```
V_r(r) = -A × r × (2δ²)/(r² + 2δ²)
```

**Velocidade vertical (updraft):**
```
W(r,z) = 2A × z × [1 - exp(-r²/(2δ²))]/(1 + z²/H²)
```

### 3.2 Queda de Pressão no Centro
```
ΔP = ρ_ar × V²_max × [1 + (Γ²/(2π²r_c² V_max²))]
```
Valores típicos: ΔP ≈ 50–200 hPa dentro do funil

### 3.3 Múltiplos Vórtices (Multiple Vortex)
Tornados violentos frequentemente têm 2–7 sub-vórtices girando em torno do centro:
- Diâmetro de sub-vórtice: 30–100 m
- Velocidade de rotação ao redor do centro: 50–100 m/s
- Velocidade adicional no sub-vórtice: +100–200 km/h
- Responsáveis pelos padrões de dano "cíclicos" no solo

---

## 4. Dinâmica de Detritos (Debris Transport)

### 4.1 Força de Sustentação e Arrasto sobre Objeto
```
F_lift = C_L × (1/2) × ρ_ar × V² × A
F_drag = C_D × (1/2) × ρ_ar × V² × A
```
- `C_L, C_D` = coeficientes aerodinâmicos (C_D ≈ 0.5–2.0 para corpos irregulares)
- `A` = área frontal do objeto

**Condição de levitação (debris liftoff):**
```
V_liftoff = √(2 × m × g / (ρ_ar × C_L × A))
```
Exemplos:
- Telha cerâmica (2 kg, 0.06 m²): V_liftoff ≈ 17 m/s
- Automóvel (1500 kg, 2.5 m²): V_liftoff ≈ 112 m/s (EF4)

### 4.2 Trajetória Balística de Detritos
```
ẍ = (C_D × ρ_ar × A / (2m)) × V_rel × V_rel_x - F_drag_x/m
z̈ = (C_L × ρ_ar × A / (2m)) × V²_rel - g
```
**Energia cinética de projétil:**
```
KE = (1/2) × m × V² [J]
```
Um pedaço de madeira de 2 kg a 100 m/s: KE = 10,000 J — letal.

---

## 5. Dano em Estruturas

### 5.1 Mecanismos de Falha
| Tipo de Dano | Vento (km/h) | Mecanismo |
|---|---|---|
| Arrancamento de telhas | 100–140 | Sucção na superfície + pressão positiva a barlavento |
| Remoção completa de telhado | 140–180 | Falha nas fixações do caibro |
| Colapso de paredes | 180–250 | Momento fletor > capacidade da alvenaria |
| Estrutura levantada | > 250 | Sucção total excede peso + âncoras |
| Fundação danificada | > 300 | Pressão lateral + vibração + detritos |

### 5.2 Pressão sobre Fachadas
```
P_positiva (barlavento) = 0.8 × q   [Pa]
P_negativa (sotavento)  = -0.5 × q  [Pa]
P_negativa (cobertura)  = -0.7 a -1.3 × q   [Pa]
q = 0.5 × ρ × V²
```
**Pressão diferencial cobertura:** Para V = 250 km/h (EF3): q ≈ 2,944 Pa → cobertura sofre sucção de ~2,900 Pa = ~296 kgf/m²

### 5.3 Coeficiente de Pressão (CP)
Varia com geometria da edificação e ângulo de incidência:
- Parede barlavento: CP ≈ +0.7 a +0.9
- Parede sotavento: CP ≈ -0.3 a -0.5
- Telhado (pendente < 10°): CP ≈ -0.9 a -1.3
- Telhado (ângulo de ataque): CP ≈ +0.2 (barlavento) / -0.6 (sotavento)

---

## 6. Características de Percurso

| Parâmetro | Faixa Típica |
|---|---|
| Comprimento do percurso | 0.1 – 352 km |
| Largura da trajetória | 10 m – 4.2 km |
| Velocidade de translação | 0 – 100 km/h (média: 40–50 km/h) |
| Duração | 1 min – 3.5 horas |
| Inclinação do funil | 5°–20° da vertical (ventos dominantes) |

---

## 7. Parâmetros Atmosféricos e Radar

### 7.1 Assinatura Doppler (Hook Echo)
- Eco em gancho no radar (600–700 km/h rotação medida)
- **Rotational Velocity (Vrot):** diferença de velocidade radial no mesociclone
  - Vrot < 20 m/s → tempestade rotativa, sem tornado
  - Vrot ≥ 25 m/s → tornado possível
  - Vrot ≥ 40 m/s → tornado violento (EF3+)
- **Debris Ball:** alta refletividade (> 65 dBZ) + baixo CC (< 0.80) = detritos no vórtice → confirmação de tornado em solo

### 7.2 Indicadores de Alta Resolução (Dual-Pol)
- ZDR (Differential Reflectivity) < 0 dB no vórtice → objetos misturados/tumbling
- KDP (Specific Differential Phase) anomalia no núcleo
- CC (Cross-Correlation) < 0.80 → indicador de detritos

---

## 8. Parâmetros para Simulação

| Parâmetro | Unidade | Faixa | Efeito |
|---|---|---|---|
| `windSpeed` | km/h | 100–500 | EF0-EF5; arrasto em estruturas |
| `windDirection` | graus | 0–360 | Direção de translação |
| `pressure` | hPa | 800–1000 | Queda no centro do funil |
| `intensity` | % | 0–100 | Intensidade relativa |
| `pathWidth` | m | 10–4000 | Largura da trajetória |
| `pathLength` | km | 0.1–300 | Comprimento do percurso |
| `translationSpeed` | km/h | 0–100 | Velocidade de deslocamento |

**Derivações para renderização:**
```
buildingDamage = min(1.0, (windSpeed/400) × intensity × 1.2)
vortexRadius   = pathWidth / 2   [m]
debrisMax      = windSpeed / 3.6 × 0.7   [m/s] — velocidade de detritos
```

---

## 9. Tornados no Brasil

- **Frequência:** 60–100 tornados/ano documentados (subestimado — regiões remotas)
- **Região mais ativa:** Sul do Brasil (RS, SC, PR) e Centro-Oeste
- **Seasonalidade:** setembro–março (primavera/verão austral)
- **Tipos predominantes:** EF0-EF2 (raramente EF3)
- **Evento notável:** Marechal Cândido Rondon, PR (1996) — EF3, 250+ km/h, 14 mortes
- **Evento notável:** Xanxerê, SC (2015) — EF3, cobertura nacional, 2 mortes, 200 feridos
- **Monitoramento:** INMET + rede de estações automáticas + radar meteorológico Doppler (DECEA/CEMADEN)

---

## 10. Referências Científicas

- Fujita, T.T. (1971). Proposed characterization of tornadoes and hurricanes by area and intensity. *SMRP Research Paper*, 91, University of Chicago.
- McDonald, J.R. & Mehta, K.C. (2006). *A recommendation for an Enhanced Fujita scale (EF scale)*. Wind Science and Engineering Research Center, Texas Tech University.
- Burgers, J.M. (1948). A mathematical model illustrating the theory of turbulence. *Advances in Applied Mechanics*, 1, 171–199.
- Brooks, H.E. (2004). On the relationship of tornado path length and width to intensity. *Meteorological Applications*, 11, 137–140.
- Markowski, P. & Richardson, Y. (2010). *Mesoscale Meteorology in Midlatitudes*. Wiley-Blackwell.
- Doswell, C.A., Brooks, H.E. & Dotzek, N. (2009). On the implementation of the enhanced Fujita scale in the USA. *Atmospheric Research*, 93, 554–563.
- Nascimento, E.L. (2005). Previsão de tempestades severas utilizando-se parâmetros convectivos. *RBMET*, 20(1), 59–78.
