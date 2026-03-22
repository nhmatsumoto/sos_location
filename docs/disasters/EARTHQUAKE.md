# EARTHQUAKE — Terremoto / Sismo
## Conhecimento Científico Especializado para Simulação de Desastres

---

## 1. Classificação e Tipologia

| Tipo | Mecanismo | Profundidade | Magnitude Típica |
|---|---|---|---|
| **Intraplaca (intraplate)** | Reativação de falhas antigas | 0–30 km | 3.0–6.5 |
| **Subducção** | Convergência de placas oceânica/continental | 0–700 km | Até 9.5 (Valdivia 1960) |
| **Transformante** | Deslizamento lateral ao longo de falha | 0–25 km | Até 8.0 (San Andreas) |
| **Vulcânico** | Movimento de magma, câmaras de gás | 1–10 km | Raramente > 6.0 |
| **Induzido** | Injeção de fluidos, reservatórios, mineração | 0–5 km | Raramente > 5.5 |

---

## 2. Ondas Sísmicas — Tipos e Propriedades

### 2.1 Ondas de Corpo (Body Waves)

**Onda P (Primária / Compressional):**
- Movimento de partícula paralelo à direção de propagação
- Velocidade: `V_P = √((K + 4/3×G) / ρ)` onde K = módulo de compressibilidade, G = módulo de cisalhamento
- Crosta continental: V_P ≈ 5.5–7.0 km/s
- Manto superior: V_P ≈ 8.0 km/s
- Atravessa sólidos, líquidos e gases

**Onda S (Secundária / Cisalhante):**
- Movimento perpendicular à direção de propagação
- Velocidade: `V_S = √(G / ρ)` ≈ V_P / 1.73 (razão de Poisson = 0.25)
- Crosta continental: V_S ≈ 3.0–4.0 km/s
- Não se propaga em fluidos (G = 0 em líquidos)
- Principal causadora de danos estruturais

### 2.2 Ondas de Superfície (Surface Waves)
Geradas pela interação de ondas de corpo com a superfície livre:

**Onda Love (L):**
- Movimento horizontal transversal
- Velocidade: `V_L = V_S × (1 + 2πa/λ × gradiente)` — dispersiva
- Amplitude decai como r^(-1/2)
- Particularmente danosa para estruturas assimétricas

**Onda Rayleigh (R):**
- Movimento elíptico retrógrado (partícula gira em sentido contrário à propagação)
- Velocidade: V_R ≈ 0.92 × V_S
- Amplitude decai como r^(-1/2) na superfície
- Responsável pelo "rolar" do chão durante terremotos intensos

### 2.3 Relação Distância Epicentral × Diferença de Chegada
```
Δt = t_S - t_P = d × (1/V_S - 1/V_P)
d ≈ Δt × 8.0   [km]  (regra simplificada para crosta)
```

---

## 3. Escalas de Magnitude

### 3.1 Magnitude Richter (ML)
```
ML = log₁₀(A) - log₁₀(A₀(Δ))
```
- `A` = amplitude máxima em sismógrafo Wood-Anderson (μm)
- `A₀(Δ)` = amplitude de referência (função da distância epicentral Δ)
- Válida para distâncias < 600 km; satura em ~7.0

### 3.2 Magnitude de Momento (Mw) — Padrão Internacional
```
Mw = (2/3) × log₁₀(M₀) - 10.7
```
**Momento sísmico escalar:**
```
M₀ = μ × A_falha × D
```
- `μ` = rigidez do meio (≈ 3×10¹⁰ Pa para crosta, 7×10¹⁰ para manto)
- `A_falha` = área de ruptura (m²)
- `D` = deslocamento médio na falha (m)

**Relação energia sísmica × magnitude:**
```
log₁₀(E_s) = 1.5 × Mw + 11.8   [erg]
ΔMw = 1.0 → E aumenta 31.6×
ΔMw = 2.0 → E aumenta 1000×
```

### 3.3 Relações Empíricas Falha × Magnitude (Wells & Coppersmith 1994)
```
log₁₀(L) = -2.44 + 0.59 × Mw   (comprimento L em km)
log₁₀(W) = -1.01 + 0.32 × Mw   (largura W em km)
log₁₀(D) = -4.80 + 0.69 × Mw   (deslocamento médio D em m)
```

---

## 4. Relação Gutenberg-Richter (Recorrência)

Distribuição estatística do número de terremotos por magnitude:
```
log₁₀(N) = a - b × M
```
- `N` = número de eventos com magnitude ≥ M por unidade de tempo
- `a` = parâmetro de atividade sísmica (10^a = taxa total de eventos)
- `b` ≈ 1.0 (universal; varia 0.8–1.2 regionalmente)

**Implicação:** Para cada aumento de 1 unidade de M, o número de eventos diminui 10×. Para cada terremoto M7, ocorrem ~10 terremotos M6 e ~100 terremotos M5.

---

## 5. Sequências de Réplicas — Lei de Omori

Decaimento temporal da taxa de réplicas após o evento principal:
```
n(t) = K / (t + c)^p
```
- `n(t)` = número de réplicas por unidade de tempo no instante t
- `K` = constante de produtividade
- `c` ≈ 0.01–0.1 dias (evita singularidade em t=0)
- `p` ≈ 1.0–1.3 (universal; controla velocidade de decaimento)

**Lei de Bath:** A maior réplica tem magnitude M_principal - 1.2 (em média).

---

## 6. Atenuação do Movimento do Solo (GMPEs)

**Ground Motion Prediction Equations** — relacionam aceleração/velocidade do solo com magnitude e distância:

**Forma genérica (Abrahamson & Silva, Boore & Atkinson, etc.):**
```
ln(Y) = f₁(M) + f₂(R, M) + f₃(S) + ε
```
- `Y` = parâmetro de movimento do solo (PGA, PGV, SA)
- `f₁` = escalonamento com magnitude
- `f₂` = atenuação geométrica e anelástica com distância
- `f₃` = amplificação por efeito de sítio (Vs30)
- `ε` = variabilidade aleatória (σ ≈ 0.6–0.7 em ln)

**Exemplo simplificado (Joyner & Boore 1981):**
```
log₁₀(PGA) = -1.02 + 0.249×M - log₁₀(R_JB) - 0.00255×R_JB + 0.26×S
```
- `PGA` em g
- `R_JB` = distância de Joyner-Boore (km)
- `S` = 0 para rocha, 1 para solo

**Efeito de sítio (VS30):**
```
ln(A_solo / A_rocha) = c × ln(V_S30 / V_ref)   c ≈ -0.5 para PGA
```
Solos moles (V_S30 < 200 m/s) amplificam 3–10× em relação à rocha.

---

## 7. Aceleração de Pico do Solo (PGA) e Dano

| PGA (g) | MMI | Percepção / Dano |
|---|---|---|
| < 0.005 g | I | Imperceptível |
| 0.005–0.03 g | II–IV | Sentido por pessoas em repouso |
| 0.03–0.08 g | V | Quadros caem, líquidos transbordam |
| 0.08–0.25 g | VI–VII | Dano leve a moderado em alvenaria |
| 0.25–0.60 g | VIII–IX | Dano severo, colapso parcial |
| > 0.60 g | X–XII | Destruição generalizada |

**Espectro de Resposta (SA):**
```
SA(T) = máx |ẍ + ẍ_g| para oscilador com período T e amortecimento ζ = 5%
```
Estruturas ressonam quando T_estrutura ≈ T_dominante do terremoto.

**Período natural de edificações:**
```
T_n ≈ 0.08 × H^0.75   (estruturas de concreto)
T_n ≈ 0.10 × H^0.75   (estruturas de aço)
T_n ≈ H/11             (regra rápida: H em m → T em s)
```

---

## 8. Escala de Intensidade Macrossísmica (MMI → EMS-98)

| Grau | MMI | Descrição | Aceleração |
|---|---|---|---|
| I | Imperceptível | Somente detectado por sismógrafos | < 0.5 mg |
| II–III | Fraco | Sentido por pessoas em repouso, em andares altos | 0.5–2.5 mg |
| IV | Levemente forte | Vibração de janelas, talheres | 2.5–6 mg |
| V | Forte | Acordam dormentes, objetos movem | 6–18 mg |
| VI | Muito forte | Dano em alvenaria mal construída | 18–45 mg |
| VII | Danoso | Rachaduras em alvenaria, alguns colapsos | 45–100 mg |
| VIII | Muito danoso | Colapso de alvenaria, estruturas de aço distorcem | 100–250 mg |
| IX | Destruidor | Colapso generalizado de alvenaria | 250–600 mg |
| X | Muito destruidor | Maioria das estruturas colapsa | 600–1400 mg |
| XI | Devastador | Poucas estruturas permanecem | 1400–3200 mg |
| XII | Completamente devastador | Destruição total | > 3200 mg |

---

## 9. Mecanismos de Falha

| Tipo de Falha | Plunge/Strike | Mecanismo | Sismicidade |
|---|---|---|---|
| **Strike-slip (transcorrente)** | Sub-vertical, movimento horizontal | Tensão cisalhante horizontal | San Andreas (EUA), Anatólia (Turquia) |
| **Thrust/Reverse (inversa)** | Inclinada, bloco sobe | Compressão | Zonas de subducção, Himalaias |
| **Normal (distensional)** | Inclinada, bloco desce | Extensão | Rift Valleys, ZNSB (Brasil) |
| **Oblíqua** | Componentes mistas | Combinação | Zonas de transição |

---

## 10. Liquefação

Fenômeno em solos arenosos saturados onde o excesso de pressão de poros anula a tensão efetiva:

**Tensão efetiva:**
```
σ' = σ - u = 0   → liquefação
```

**CSR — Cyclic Stress Ratio (demanda):**
```
CSR = 0.65 × (σ_v / σ'_v) × (a_max / g) × r_d
```
- `r_d` = fator de redução com profundidade (r_d ≈ 1 - 0.00765×z para z ≤ 9.15 m)

**CRR — Cyclic Resistance Ratio (resistência):**
Obtido via SPT ou CPT:
```
CRR₇.₅ = 1/(34 - N₁,₆₀) + N₁,₆₀/135 + 50/(10×N₁,₆₀+45)² - 1/200
```

**Fator de Segurança:**
```
FS_liq = CRR₇.₅ × MSF / CSR
```
- `MSF` = fator de escalonamento de magnitude: MSF = 10^(2.24) / Mw^(2.56)
- FS < 1.0 → liquefação ocorre

**Consequências:** recalques, perda de capacidade de carga, danos em fundações, inclinação de estruturas.

---

## 11. Curvas de Fragilidade Estrutural

Probabilidade de atingir ou exceder um estado de dano dado o PGA:
```
P(DS ≥ ds_i | PGA) = Φ[(1/β_ds) × ln(PGA/θ_ds)]
```
- `Φ` = função de distribuição normal acumulada
- `θ_ds` = mediana de PGA para o estado de dano i
- `β_ds` = dispersão logarítmica ≈ 0.4–0.6

**Estados de Dano Típicos:**
| DS | Descrição | θ_PGA (g) alvenaria | β |
|---|---|---|---|
| DS1 | Leve | 0.07 | 0.50 |
| DS2 | Moderado | 0.15 | 0.55 |
| DS3 | Severo | 0.30 | 0.60 |
| DS4 | Colapso | 0.55 | 0.65 |

---

## 12. Parâmetros para Simulação

| Parâmetro | Unidade | Faixa | Descrição |
|---|---|---|---|
| `magnitude` | Mw | 4.0–9.5 | Momento de magnitude |
| `faultDepth` | km | 5–100 | Profundidade hipocêntrica |
| `geologyIndex` | 1–10 | – | 1=rocha dura, 10=argila mole |
| `duration` | s | 10–300 | Duração do movimento forte |
| `intensity` | % | 0–100 | Intensidade relativa |
| `PGA` (derivado) | g | 0–2.0 | Aceleração máxima do solo |
| `buildingDamage` | 0–1 | – | Nível de dano normalizado |
| `buildingLean` | cm/m | 0–0.05 | Inclinação máxima por piso |

**Cálculo de buildingDamage para simulação:**
```
damage = min(1.0, (Mw/9.0) × disasterIntensity × 1.3)
lean = (Mw/9.0) × sin(t×22) × 0.0008 × exp(-max(0,t-2.5)×0.35)
```

---

## 13. Sismicidade no Brasil

O Brasil é uma placa intraplaca com sismicidade moderada:
- **Zona Sísmica Principal:** Nordeste (CE, RN, PB) — Falha de Samambaia
- **Mato Grosso:** 5.1 Mw (1955) — maior terremoto histórico
- **Eventos notáveis:** Itacarambi-MG (2007, 4.9 Mw), João Câmara-RN (1986–1987, série de 5.1 Mw)
- **Norma:** ABNT NBR 15421:2006 — Projeto de estruturas resistentes a sismos

---

## 14. Referências Científicas

- Aki, K. & Richards, P.G. (2002). *Quantitative Seismology*, 2ª ed. University Science Books.
- Gutenberg, B. & Richter, C.F. (1954). *Seismicity of the Earth and Associated Phenomena*, 2ª ed. Princeton University Press.
- Omori, F. (1894). On the aftershocks of earthquakes. *J. Coll. Sci. Imp. Univ. Tokyo*, 7, 111–200.
- Wells, D.L. & Coppersmith, K.J. (1994). New empirical relationships among magnitude, rupture length, rupture width, rupture area, and surface displacement. *BSSA*, 84(4), 974–1002.
- Seed, H.B. & Idriss, I.M. (1971). Simplified procedure for evaluating soil liquefaction potential. *J. Geotechnical Eng.*, ASCE, 97(9), 1249–1273.
- Abrahamson, N.A. & Silva, W.J. (2008). Summary of the Abrahamson & Silva NGA ground motion relations. *Earthquake Spectra*, 24(1), 67–97.
- Hazus-MH Technical Manual (FEMA 2003) — multihazard loss estimation methodology.
- ABNT NBR 15421:2006 — Projeto de estruturas resistentes a sismos.
- Assumpcao, M. et al. (2014). Seismic activity triggered by wastewater injection in the Paraná Basin. *J. South Am. Earth Sci.*, 56, 55–63.
