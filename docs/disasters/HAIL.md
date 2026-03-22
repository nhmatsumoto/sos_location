# HAIL — Granizo
## Conhecimento Científico Especializado para Simulação de Desastres

---

## 1. Formação de Granizo

### 1.1 Processo de Nucleação e Crescimento
O granizo forma-se exclusivamente dentro de **tempestades de alta energia** (supercélulas e MCSs) com correntes de ascendência intensas.

**Sequência de formação:**
```
Cristal de gelo / gotícula super-resfriada
  → Embrião (2–5 mm): por coleção de gotículas → graupel
  → Crescimento por acreção úmida ou seca
  → Pedra de granizo (5 mm – 20 cm+)
```

**Tipos de crescimento:**
- **Crescimento Seco (Dry Growth):** temperatura superficial < 0°C, água congela imediatamente → camada opaca (ar aprisionado)
- **Crescimento Úmido (Wet Growth):** temperatura superficial = 0°C, água líquida flui antes de congelar → camada transparente (gelo claro)

**Estrutura anular:** Alternância de camadas opacas/claras registra ciclos de ascensão e descensão no interior da tempestade.

---

## 2. Dinâmica de Sustentação — Equilíbrio na Corrente Ascendente

Para uma pedra de granizo permanecer na zona de crescimento, a força de arrasto deve equilibrar o peso:

### 2.1 Velocidade Terminal no Ar
```
V_t = √(4 × g × D × ρ_gelo / (3 × C_D × ρ_ar))
```
- `D` = diâmetro da pedra [m]
- `ρ_gelo` ≈ 900 kg/m³
- `ρ_ar` ≈ 0.7–0.9 kg/m³ em altitude
- `C_D` ≈ 0.6 para esfera rugosa

**Valores típicos:**
| D (mm) | V_t (m/s) | Velocidade de Updraft necessária |
|---|---|---|
| 5 | ~8 | ~8 m/s |
| 10 | ~13 | ~13 m/s |
| 20 | ~18 | ~18 m/s |
| 50 | ~28 | ~28 m/s |
| 100 | ~40 | ~40 m/s |

**Updrafts em supercélulas:** 30–60 m/s → podem sustentar pedras de 5–10 cm de diâmetro.

### 2.2 Tempo de Residência na Zona de Crescimento
```
Δm/Δt = π × D² × E_c × W_liq × V_rel / 4
```
- `E_c` = eficiência de coleta (0.5–1.0)
- `W_liq` = conteúdo de água líquida na nuvem [g/m³] ≈ 0.5–3.0 g/m³
- `V_rel` = velocidade relativa pedra-ar

Taxa de crescimento de massa → crescimento de diâmetro:
```
dD/dt = E_c × W_liq × V_rel / ρ_gelo
```

---

## 3. Energia Cinética e Potencial de Dano

### 3.1 Energia Cinética no Impacto
```
KE = (1/2) × m × V_impacto²
m = (π/6) × ρ_gelo × D³
V_impacto ≈ V_t (negligenciando turbulência e vento horizontal)
```
**Exemplos:**
| D (cm) | Massa (g) | V_t (m/s) | KE (J) |
|---|---|---|---|
| 0.5 | 0.06 | 7 | 0.0015 |
| 1.0 | 0.47 | 13 | 0.04 |
| 2.0 | 3.77 | 20 | 0.75 |
| 5.0 | 58.9 | 33 | 32 |
| 10.0 | 471 | 50 | 588 |

### 3.2 Fluxo de Energia Cinética (HKE — Hail Kinetic Energy)
Métrica usada em seguro agrícola e análise de danos:
```
HKE = (1/6) × π × ρ_gelo × Σ(n_i × D_i³ × V_ti²)   [J/m²/s]
```
Onde a somatória é sobre todas as pedras por unidade de área por segundo.

### 3.3 Limiares de Dano
| HKE (J/m²) | Dano à Vegetação | Dano em Carros | Dano em Telhados |
|---|---|---|---|
| 1–5 | Folhas perfuradas | Amassados leves | Telhas rachadas |
| 5–20 | Galhos quebrados | Amassados severos | Telhas quebradas |
| 20–100 | Defolhação completa | Destruição de para-brisas | Painéis de metal perfurados |
| > 100 | Destruição total | Estrutura comprometida | Alvenaria com impactos |

---

## 4. Escalas de Classificação

### 4.1 Escala TORRO (Townsend-Turner, Reino Unido)
| H | Diâmetro (mm) | Descrição |
|---|---|---|
| H0 | 5–9 | Granizo muito pequeno |
| H1 | 10–14 | Granizo pequeno — dano a flores |
| H2 | 15–19 | Dano moderado a vegetação |
| H3 | 20–24 | Dano a frutas, vidros finos |
| H4 | 25–29 | Vidros comuns quebram |
| H5 | 30–39 | Dano severo a palheiros e estufas |
| H6 | 40–49 | Telhas cerâmicas quebradas |
| H7 | 50–59 | Dano em concreto, animais em risco |
| H8 | 60–74 | Dano severo em todo tipo de telhado |
| H9 | 75–89 | Dano estrutural em paredes de tijolos |
| H10 | > 90 | Risco de vida, buracos em metal |

**Recordes mundiais de tamanho:**
- Vivian, South Dakota (2010): 20.3 cm de diâmetro, 878g — recorde USA
- Bogotá, Colômbia (2017): 13–15 cm — América do Sul
- Villa Carlos Paz, Argentina (2018): 12–14 cm

---

## 5. Detecção por Radar

### 5.1 Refletividade (Z) e MESH
**Refletividade radar (Weather Surveillance Radar):**
```
Z = Σ D⁶_i   [mm⁶/m³]
Z [dBZ] = 10 × log₁₀(Z)
```
- Chuva forte: 40–50 dBZ
- Granizo: 55–70+ dBZ
- "Three-body scattering spike" (TBSS): artefato que confirma granizo grande (> 2 cm)

**MESH (Maximum Expected Size of Hail — Witt et al. 1998):**
```
MESH = [Σ(W × E_i × D_i^7.5) / ΣW]^(1/7.5)   [mm]
```
- `E_i` = fator de severidade energética em cada altitude
- `W` = peso ponderado pela profundidade

### 5.2 Produtos Dual-Pol (Polarimetria)
Discriminação granizo/chuva com alta precisão:
- **ZDR (Differential Reflectivity):** ZDR ≈ 0 dB para granizo (objetos tumbling aproximadamente esféricos) vs. ZDR > 1 dB para chuva (gotas achatadas)
- **KDP (Specific Differential Phase):** próximo de 0 no granizo (baixa birefringência)
- **CC (ρ_hv):** 0.90–0.97 para granizo misto; CC < 0.90 indica granizo grande

**Algoritmo HCA (Hydrometeor Classification Algorithm):**
Combina Z, ZDR, KDP, CC e temperatura em árvore de decisão fuzzy → distingue granizo de: chuva, granizo + chuva, big drops, etc.

---

## 6. Distribuição Espectral do Granizo

**Distribuição Gamma Generalizada:**
```
N(D) = N₀ × D^μ × exp(-Λ × D)   [m⁻³ mm⁻¹]
```
- `N₀` = concentração de intercepto [m⁻³ mm⁻¹⁻μ]
- `μ` = parâmetro de forma (0–4 para granizo)
- `Λ` = parâmetro de inclinação [mm⁻¹] = (μ + 4) / D̄

**Distribuição de Marshall-Palmer (exponencial, μ=0):**
```
N(D) = N₀ × exp(-Λ × D)
Λ_granizo ≈ 2.5 × (R_granizo)^(-0.48)   [mm⁻¹]
```

---

## 7. Trajetória e Transporte Horizontal

Com vento horizontal U e velocidade terminal V_t:
```
x_impacto = x_nuvem + U × (H_nuvem / V_t)
V_impacto = √(U² + V_t²)
θ = arctan(U/V_t)   [ângulo de incidência da trajetória]
```
Granizo em vento de 15 m/s e H=8km: deslocamento horizontal ≈ 8×(15/13) ≈ 9 km.

**Energia cinética com componente horizontal:**
```
KE_total = (1/2) × m × (U² + V_t²)
```
Impacto oblíquo aumenta dano em superfícies verticais (janelas, fachadas).

---

## 8. Dano em Estruturas e Infraestrutura

### 8.1 Telhados
- **Telha cerâmica**: fratura por impacto quando KE > 5–15 J
- **Telha galvanizada**: deformação plástica quando KE > 20–40 J, perfuração > 80 J
- **Vidro temperado**: fratura quando σ_impacto > 120 MPa
- **Policarbonato**: resiste melhor — absorve energia por deformação

**Pressão de impacto (modelo de Hertz):**
```
P_max = (6 × E*² × F / π³ × R²)^(1/3)
F = KE × (2/3) × √(k_eff × m)   (impulso elástico)
```

### 8.2 Painel Solar (dano recorrente)
- Granizo D > 25 mm a V_t > 20 m/s → microtrincas nas células fotovoltaicas
- Norma IEC 61215: painéis testados com gelo de 25 mm a 23 m/s

### 8.3 Dano Agrícola
```
Dano (%) = f(D, H_acumulado, cultura, fase fenológica)
Milho: Dano > 80% para granizo H5+ em florescimento
Uva: Dano > 90% para granizo H3+ em amadurecimento (epiderme fina)
```

---

## 9. Parâmetros para Simulação

| Parâmetro | Unidade | Faixa | Efeito |
|---|---|---|---|
| `hailSize` | mm | 5–200 | Escala TORRO; dano potencial |
| `hailRate` | pedras/m²/min | 0–200 | Intensidade do granizo |
| `windSpeed` | m/s | 0–50 | Drift horizontal + energia adicional |
| `intensity` | % | 0–100 | Intensidade relativa |
| `duration` | min | 1–60 | Duração do evento |
| `KE_flux` | J/m²/s | 0–200 | Fluxo de energia cinética |

**Derivações para renderização:**
```
buildingDamage = min(1.0, (hailSize/80)^1.5 × intensity)
particleRadius = hailSize/2   [mm] → tamanho das partículas renderizadas
impactFreq     = hailRate / 60   [impactos/m²/s]
```

---

## 10. Granizo no Brasil

### 10.1 Distribuição Regional
- **Região mais ativa:** Sul do Brasil (RS, SC, PR) + Sudeste (SP, MG)
- **Frequência:** 10–20 dias de granizo/ano no Sul; 2–5 dias/ano no Sudeste
- **Período:** setembro–março (convecção primavera/verão); excepcionalmente inverno (frentes)
- **Tipo de sistema:** supercélulas, MCS (Mesoscale Convective Systems), linhas de instabilidade

### 10.2 Eventos Notáveis
| Evento | Danos |
|---|---|
| Granizo RS (2015) | R$ 800 Mi em danos agrícolas e veiculares |
| Gramado SC (2016) | Granizo H6 (50 mm), R$ 150 Mi em seguros |
| Noroeste RS (2020) | Granizo 5–8 cm, lavouras de soja/trigo devastadas |
| São Paulo SP (2021) | Ruas alagadas por volume de granizo, > 10 cm em poças |

### 10.3 Prejuízo Econômico
- **Seguro rural:** 60–80% das indenizações de granizo no Sul do Brasil
- **Fruta Fina:** Serra Gaúcha (uva/maçã) — R$ 300–500 Mi em anos de granizo severo
- **Automotivo:** R$ 200–400 Mi/ano em Rio Grande do Sul

---

## 11. Referências Científicas

- Witt, A. et al. (1998). An enhanced hail detection algorithm for the WSR-88D. *Weather and Forecasting*, 13(2), 286–303.
- Knight, C.A. & Knight, N.C. (2001). Hailstorms. In Doswell, C.A. (ed.), *Severe Convective Storms*. Meteor. Monogr., AMS.
- Foote, G.B. (1984). A study of hail growth utilizing observed storm conditions. *Journal of Climate and Applied Meteorology*, 23(1), 84–101.
- Picard, L. & Mass, C. (2017). The sensitivity of orographic precipitation to flow direction. *J. Hydrometeor.*, 18, 1419–1439.
- Blair, S.F. et al. (2011). Toward improving the climatological understanding of severe hailstorms in the United States. *Bulletin of the AMS*, 92(11), 1521–1532.
- Cecil, D.J. & Blankenship, C.B. (2012). Toward a global climatology of severe hailstorms as estimated by large hail-occurrence potential. *J. Climate*, 25, 2997–3013.
- INMET (2022). *Climatologia de Granizo no Brasil*. Nota Técnica, Instituto Nacional de Meteorologia.
- EMBRAPA (2021). *Impactos do Granizo na Agricultura Subtropical Brasileira*. Embrapa Uva e Vinho, Bento Gonçalves.
