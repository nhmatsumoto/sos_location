# DEFORESTATION — Desmatamento / Degradação Florestal
## Conhecimento Científico Especializado para Simulação de Desastres

---

## 1. Definição e Tipologia

**Desmatamento** é a remoção permanente da cobertura florestal com conversão para outro uso do solo. **Degradação florestal** é a redução da biomassa e biodiversidade sem remoção total — mais difícil de detectar por satélite.

### 1.1 Classes de Perda Florestal

| Tipo | Mecanismo | Reversibilidade | Taxa Brasil |
|---|---|---|---|
| **Corte raso** | Supressão total | Irreversível sem replantio | ~9.000–22.000 km²/ano |
| **Desmatamento seletivo** | Extração madeireira ilegal | Parcialmente reversível | Difícil quantificação |
| **Degradação por fogo** | Queima de margem / interior | Lenta recuperação | 2–5× corte raso |
| **Fragmentação** | Bordas de floresta isoladas | Efeito de borda | Subestimado em mapas |
| **Degradação por seca** | Mortalidade em eventos extremos | Depende da intensidade | Monitorado desde 2005 |

---

## 2. Detecção por Sensoriamento Remoto

### 2.1 PRODES — Programa de Monitoramento da Amazônia

Sistema do INPE para quantificação anual do desmatamento:
- **Resolução:** Landsat 8/9 (30 m), Sentinel-2 (10 m)
- **Frequência:** Anual (período de agosto a julho)
- **Cobertura:** Amazônia Legal (5.0 Mi km²)
- **Produto:** Polígonos vetoriais de incremento de desmatamento ≥ 6.25 ha

**Série histórica — Amazônia (km²/ano):**

| Período | Taxa máxima | Taxa mínima |
|---|---|---|
| 1988–2004 | 29.059 (1995) | 11.030 (1997) |
| 2004–2012 (PPCDAm) | 27.772 (2004) | 4.571 (2012) |
| 2012–2019 | 7.989 (2016) | 4.571 (2012) |
| 2019–2021 | 13.235 (2021) | 10.129 (2019) |
| 2022–2023 | 11.568 (2022) | 9.001 (2023) |

### 2.2 DETER — Detecção em Tempo Real

Sistema de alerta rápido com imagens SAR e ópticas:
- **Revisita:** 5–16 dias (Sentinel-1 SAR, CBERS-4A)
- **Resolução:** 20–64 m (escala de alerta, não quantificação)
- **Limiar mínimo:** alertas > 3 ha
- **Uso:** fiscalização pelo IBAMA e ICMBio

### 2.3 Índices Espectrais de Degradação

**NDFI (Normalized Difference Fraction Index):**
```
NDFI = (GV_shade - NPV - S) / (GV_shade + NPV + S)
```
- `GV_shade` = fração de vegetação verde com sombra (endmember)
- `NPV` = fração de vegetação não-fotossintetizante
- `S` = fração de solo exposto

**Sensitive a degradação florestal sutil** — detecta clareiras, extração seletiva, bordas.

**NDVI para cobertura geral:**
```
NDVI = (NIR - RED) / (NIR + RED)
```
Floresta tropical: NDVI ≈ 0.75–0.90; floresta degradada: 0.55–0.75; pastagem: 0.20–0.45.

---

## 3. Ciclo do Carbono Florestal

### 3.1 Biomassa e Estoque de Carbono

**Equação alométrica para biomassa acima do solo (AGB — Chave 2014):**
```
AGB = 0.0673 × (ρ_wood × D² × H)^0.976   [kg de matéria seca]
```
- `ρ_wood` = densidade da madeira [g/cm³] (Amazônia: 0.55–0.70 média ponderada)
- `D` = DAP (diâmetro à altura do peito) [cm]
- `H` = altura da árvore [m]

**Estoque de carbono em biomassa viva:**
```
C_AGB = AGB × 0.47   [tC/árvore]   (IPCC 2006 — fração de carbono)
C_BGB = C_AGB × R_BGB   onde R_BGB ≈ 0.20–0.37 (raízes/AGB)
C_total = C_AGB + C_BGB + C_necromassa + C_serapilheira + C_solo
```

**Estoques típicos da Amazônia:**
| Componente | Estoque (tC/ha) |
|---|---|
| Biomassa acima do solo | 100–200 |
| Biomassa abaixo do solo | 20–40 |
| Necromassa (madeira morta) | 15–30 |
| Serapilheira | 3–8 |
| Solo (0–30 cm) | 60–120 |
| **Total** | **200–400** |

### 3.2 Emissões por Desmatamento

**Fluxo de carbono por desmatamento:**
```
F = A_defor × BD_C × (1 + R_BGB) × EF   [tCO₂eq/ano]
```
- `A_defor` = área desmatada [ha/ano]
- `BD_C` = densidade de carbono na biomassa [tC/ha]
- `R_BGB` = razão biomassa abaixo/acima do solo
- `EF` = fator de emissão (fração da biomassa que vai para a atmosfera; ~0.7–0.9 no corte+queima)
- Conversão: 1 tC = 3.67 tCO₂

**Brasil (2004–2022, dados SEEG/MCTI):**
- Média: 0.8–2.5 GtCO₂eq/ano (setor LULUCF — Land Use, Land-Use Change and Forestry)
- Pico: ~3.0 GtCO₂eq/ano (período 2003–2005)
- Redução 2012: ~0.4 GtCO₂eq/ano (piso histórico)

---

## 4. Impactos Hidrológicos

### 4.1 Ciclo da Água em Florestas Tropicais

**Balanço hídrico florestal:**
```
P = ET + Q + ΔS
ET_floresta ≈ 1.100–1.500 mm/ano (Amazônia)
ET_pastagem ≈  700–900 mm/ano
```
Diferença: 300–600 mm/ano a menos de reciclagem de vapor com desmatamento.

**Rios Voadores (Flying Rivers — Marengo et al.):**
O fluxo de vapor d'água transportado por ventos de leste da Amazônia para o Sul do Brasil:
- Fluxo: 17–20 Mm³/dia equivalente de precipitação
- Impacto: ~50% da precipitação de SP/MG/PR/RS depende desse vapor
- Ameaça: desmatamento excessivo pode reduzir esse fluxo → secas no Sul/Sudeste

### 4.2 Efeito Albedo e Temperatura Local

```
α_floresta ≈ 0.12–0.15   (baixo — absorve mais radiação)
α_pastagem ≈ 0.20–0.25
α_solo_exposto ≈ 0.25–0.30
```

**Aquecimento local por desmatamento:**
```
ΔT_local ≈ +0.5 a +2.0°C por km² desmatado (escala regional)
```
Origem: redução de ET (menos resfriamento evaporativo) + mudança de albedo.

### 4.3 Escoamento Superficial e Erosão

```
CN_floresta ≈ 25–45   (baixo escoamento, alta infiltração)
CN_pastagem ≈ 55–75
CN_solo_exposto ≈ 85–95
```
(SCS-CN — Curve Number; equação de chuva-deflúvio)

```
Q = (P - 0.2 × S)² / (P + 0.8 × S)   onde S = 25400/CN - 254   [mm]
```

**Erosão acelerada pós-desmatamento:**
```
Erosão_pastagem / Erosão_floresta ≈ 10–100×   (estimativa empírica)
```

---

## 5. Biodiversidade e Fragmentação

### 5.1 Teoria da Biogeografia de Ilhas (MacArthur & Wilson 1967)

**Relação espécies-área:**
```
S = c × A^z
```
- `S` = número de espécies
- `A` = área do fragmento [km² ou ha]
- `c` = constante (dependente do grupo taxonômico e região)
- `z` ≈ 0.25–0.35 (continentes); 0.25–0.40 (fragmentos florestais)

**Perda de espécies por fragmentação:**
```
ΔS = S_original × [1 - (A_remanescente / A_original)^z]
```
Exemplo: redução de 90% da área → perda de ~50% das espécies (z=0.25).

### 5.2 Efeito de Borda

Profundidade do efeito de borda: 50–300 m a partir da margem florestal.
```
A_interior = A_total - π × (2 × d_borda × r_eq - d_borda²)
```
- `d_borda` = profundidade de influência da borda [m]
- `r_eq` = raio equivalente do fragmento

Em fragmentos < 100 ha: praticamente toda a floresta é afetada por efeito de borda.

### 5.3 Conectividade da Paisagem

**Índice de Conectividade Integral (IIC):**
```
IIC = Σᵢ Σⱼ (aᵢ × aⱼ) / (1 + n_links_ij) / A_total²
```
- `aᵢ, aⱼ` = área dos patches i e j
- `n_links_ij` = número de links no menor caminho entre i e j

---

## 6. Feedback Fogo-Desmatamento

### 6.1 Ciclo de Retroalimentação

```
Desmatamento → Savannização parcial
             → Redução de ET → menor reciclagem de umidade
             → Mais seca local → maior inflamabilidade
             → Mais fogo → mais degradação florestal
             → Morte de árvores → mais combustível
             → [volta ao início]
```

**Ponto de inflexão (Tipping Point — Lovejoy & Nobre 2018):**
Estimativa: desmatamento de 20–25% da Amazônia pode desencadear savannização irreversível de 40–60% do bioma.
- Atual (2023): ~22% da Amazônia brasileira já desmatada ou degradada.

### 6.2 Mortalidade de Árvores por Calor + Seca

```
P_mortality = f(VPD, θ, T_max, duração)
```
Modelo de Anderegg (2020):
- Mortalidade em VPD > 20 hPa × 30 dias = 15–40% em espécies sensíveis
- Mortalidade em seca severa (SPI-12 < -2.0) em florestas tropicais: 1–5%/ano

---

## 7. Degradação de Solo

### 7.1 Compactação pelo Pisoteio

```
ρ_solo_pastagem ≈ 1.4–1.7 g/cm³   (vs. 1.0–1.3 sob floresta)
K_sat_pastagem ≈ 0.001–0.1 mm/h   (vs. 10–100 mm/h floresta)
```

**Consequência:** escoamento superficial elevado → erosão laminar → assoreamento de rios.

### 7.2 Laterização Irreversível

Em solos tropicais altamente intemperizados (Oxissolos/Latossolos):
- Remoção de matéria orgânica → exposição de óxi-hidróxidos de ferro e alumínio
- Formação de crostas lateríticas impermeáveis (hardpan) → solo agronomicamente improdutivo
- Reversão exige > 100 anos de pousio em condições favoráveis

---

## 8. Biomas Afetados no Brasil

| Bioma | Área Original (km²) | Desmatamento Acumulado | Taxa Atual |
|---|---|---|---|
| **Amazônia** | 4.196.943 | ~22% (2023) | ~9.000 km²/ano |
| **Cerrado** | 2.036.448 | ~52% (2022) | ~10.000 km²/ano |
| **Mata Atlântica** | 1.110.182 | ~88% | ~230 km²/ano |
| **Caatinga** | 844.453 | ~45% | ~1.100 km²/ano |
| **Pantanal** | 150.355 | ~22% | ~800 km²/ano |
| **Pampa** | 176.496 | ~54% | ~310 km²/ano |

**Instrumentos de monitoramento:**
- **PRODES/DETER/TerraClass (INPE):** Amazônia e Cerrado
- **MapBiomas:** cobertura anual de todos os biomas desde 1985
- **LAPIG/UFG:** Cerrado e Pastagens

---

## 9. Parâmetros para Simulação

| Parâmetro | Unidade | Faixa | Efeito |
|---|---|---|---|
| `deforestationRate` | km²/ano | 0–30.000 | Área convertida |
| `forestCover` | % | 0–100 | Cobertura atual |
| `biomassLoss` | tC/ha | 0–250 | Emissão de CO₂ |
| `fragmentIndex` | 0–1 | 0–1 | Grau de fragmentação |
| `intensity` | % | 0–100 | Intensidade relativa |
| `fireFreq` | eventos/ano | 0–100 | Frequência de queimadas |

**Derivações para renderização:**
```
vegetationColor = mix(green_forest, yellow_pasture, 1.0 - forestCover/100.0)
smokeOpacity    = clamp(fireFreq / 50.0, 0.0, 0.8)
soilExposure    = max(0.0, 1.0 - forestCover/40.0)
carbonBar       = biomassLoss / 250.0   → barra de emissão no HUD
```

---

## 10. Referências Científicas

- Chave, J. et al. (2014). Improved allometric models to estimate the aboveground biomass of tropical trees. *Global Change Biology*, 20(10), 3177–3190.
- Fearnside, P.M. (2006). Desmatamento na Amazônia brasileira: história, índices e consequências. *Megadiversidade*, 2(1–2), 113–123.
- Lovejoy, T.E. & Nobre, C.A. (2018). Amazon tipping point. *Science Advances*, 4(2), eaat2340.
- MacArthur, R.H. & Wilson, E.O. (1967). *The Theory of Island Biogeography*. Princeton University Press.
- Marengo, J.A. et al. (2012). Recent developments on the South American monsoon system. *International Journal of Climatology*, 32(1), 1–21.
- MapBiomas (2023). *Coleção 8 — Mapeamento Anual de Cobertura e Uso do Solo do Brasil 1985–2022*. mapbiomas.org.
- INPE/PRODES (2023). *Taxa de Desmatamento na Amazônia Legal*. Instituto Nacional de Pesquisas Espaciais.
- Anderegg, W.R.L. et al. (2020). Climate-driven risks to the climate mitigation potential of forests. *Science*, 368(6497), eaaz7005.
- Hubbell, S.P. (2001). *The Unified Neutral Theory of Biodiversity and Biogeography*. Princeton University Press.
- SEEG (2023). *Sistema de Estimativas de Emissões e Remoções de Gases de Efeito Estufa — Brasil*. Observatório do Clima.
- Nobre, C.A. et al. (2016). Land-use and climate change risks in the Amazon. *PNAS*, 113(39), 10759–10768.
- Instituto SOS Mata Atlântica & INPE (2023). *Atlas dos Remanescentes Florestais da Mata Atlântica 2021–2022*.
