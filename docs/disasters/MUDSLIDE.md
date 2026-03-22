# MUDSLIDE / LANDSLIDE / DEBRIS FLOW — Deslizamento / Corrida de Detritos
## Conhecimento Científico Especializado para Simulação de Desastres

---

## 1. Classificação de Movimentos de Massa

| Tipo | Mecanismo | Velocidade | Material |
|---|---|---|---|
| **Queda (Fall)** | Descolamento brusco de rocha/solo | Extremamente rápido (> 5 m/s) | Rocha, blocos |
| **Tombamento (Topple)** | Rotação para frente de bloco/coluna | Lento a extremamente rápido | Rocha, estruturas |
| **Escorregamento rotacional (Slump)** | Slip em superfície côncava | Muito lento a rápido | Argilas, solos |
| **Escorregamento translacional** | Slip em superfície planar | Lento a muito rápido | Qualquer solo |
| **Expansão lateral (Spread)** | Liquefação/fluidificação | Lento a rápido | Solo saturado |
| **Fluxo (Flow)** | Fluência viscoplástica | Muito rápido | Solo+água |
| **Corrida de detritos (Debris flow)** | Fluxo hiperconcentrado | 1–10+ m/s | Solo+pedras+troncos |
| **Corrida de lama (Mudflow)** | Fluxo de lama fina | 1–5 m/s | Argila+água |
| **Avalanche de rocha** | Fluxo granular seco | 10–100 m/s | Rocha fragmentada |

---

## 2. Mecânica de Ruptura — Fator de Segurança

### 2.1 Critério de Mohr-Coulomb
A resistência ao cisalhamento do solo:
```
τ_f = c' + (σ - u) × tan(φ')
```
- `τ_f` = resistência ao cisalhamento [kPa]
- `c'` = coesão efetiva [kPa] (0 em areias limpas, 10–50 kPa em argilas)
- `σ` = tensão normal total [kPa]
- `u` = pressão de poros [kPa]
- `φ'` = ângulo de atrito interno efetivo [°] (25–45° para solos tropicais lateríticos)

### 2.2 Fator de Segurança (FS)
```
FS = τ_f / τ_mobilizada = (c' + (σ - u) × tan φ') / (σ × sin β × cos β)
```
- `FS < 1.0` → ruptura (deslizamento ocorre)
- `FS = 1.0` → condição limite (equilíbrio instável)
- `FS > 1.5` → estável (margem de segurança aceitável)

---

## 3. Modelo de Talude Infinito

Amplamente usado para encostas homogêneas com camada rasa de solo:

```
FS = c' / (γ × z × sin β × cos β) + (tan φ' / tan β) - (m_w × γ_w × tan φ') / (γ × tan β)
```
- `γ` = peso específico do solo [kN/m³] ≈ 18–22 kN/m³
- `z` = espessura da camada de solo [m]
- `β` = ângulo da encosta [°]
- `m_w` = proporção da camada saturada (0 = seco, 1 = totalmente saturado)
- `γ_w` = 9.81 kN/m³ (peso específico da água)

**Caso saturado (m_w = 1):**
```
FS_sat = c'/(γz sin β cos β) + (γ-γ_w)/γ × tan φ'/tan β
```
Para solos sem coesão (c' = 0): `FS = (γ-γ_w)/γ × tan φ'/tan β`
Ruptura quando β > φ'/2 em condições saturadas.

---

## 4. Limiar de Chuva para Deflagração

### 4.1 Curvas Intensidade-Duração (Caine 1980)
Threshold empírico global:
```
I = α × D^(-β)   [mm/h]
```
- `I` = intensidade da chuva [mm/h]
- `D` = duração acumulada [h]
- `α, β` = parâmetros regionais

**Valores para o Brasil (regiões serranas — Tominaga et al.):**
```
I = 27.5 × D^(-0.39)   (Região Serrana do RJ)
I = 48.0 × D^(-0.61)   (Serra de Santa Catarina)
```

### 4.2 Chuva Acumulada Antecedente
O modelo de Chuva Crítica Acumulada (INPE/CEMADEN):
```
P_crítica = P_3h + 0.5 × P_24h + 0.25 × P_72h > limiar_regional
```
Limiares típicos no Brasil:
- RJ Serra: P_24h > 80 mm → alerta; > 120 mm → emergência
- SC Serra: P_72h > 200 mm → alto risco

### 4.3 Índice API (Antecedent Precipitation Index)
```
API_t = k × API_(t-1) + P_t   onde k ≈ 0.90–0.95 (fator de recessão)
```
API alto indica saturação antecedente do solo → reduz FS crítico.

---

## 5. Dinâmica de Fluxo de Detritos

### 5.1 Modelo de Bingham (Fluido Viscoplástico)
```
τ = τ_y + μ_B × (dv/dz)   para τ > τ_y
v = 0                       para τ < τ_y
```
- `τ_y` = tensão de escoamento (yield stress) [Pa] ≈ 100–10,000 Pa para lamas densas
- `μ_B` = viscosidade plástica de Bingham [Pa·s] ≈ 1–100 Pa·s

**Velocidade de perfil parabólico numa corrida de lama:**
```
v(z) = τ_y/(μ_B) × [(h - h_p)² - (z - h_p)²] / (2h)
```
onde `h_p = τ_y/(ρg sinβ)` = espessura da camada de plug (núcleo rígido)

### 5.2 Modelo de Voellmy (Debris Avalanche)
Para corridas de detritos em canais — amplamente usado no Suíça:
```
a = g × (sin β - μ × cos β) - V² × g/(ξ × h)
```
- `μ` = coeficiente de atrito basal (0.1–0.3)
- `ξ` = coeficiente turbulento de Voellmy [m/s²] (200–1000 m/s²)
- `h` = espessura do fluxo

**Velocidade terminal:**
```
V_terminal = √(ξ × h × (sin β - μ cos β))
```

### 5.3 Número de Froude do Fluxo
```
Fr = V / √(g' × h)   onde g' = g × (ρ_debris - ρ_fluido)/ρ_debris
```
- Fr < 1 → subcrítico (lento)
- Fr > 1 → supercrítico (torrencial, ondas de choque)

---

## 6. Análise Topográfica de Suscetibilidade

### 6.1 Parâmetros Topográficos (extraídos de DEM)
```
slope (β) = arctan(√(∂z/∂x)² + (∂z/∂y)²)   [graus]
aspect     = arctan(∂z/∂y / ∂z/∂x)           [azimute]
curvatura  = ∂²z/∂x² + ∂²z/∂y²               [concavidade/convexidade]
CTI        = ln(A_c / tan β)                   [Compound Topographic Index]
TWI        = ln(A_c / tan β)                   [igual ao CTI — acumulação de água]
```

**Critérios de alto risco:**
- β > 30° (Declive crítico para solos tropicais)
- CTI alto (áreas de convergência de fluxo)
- Curvatura côncava (concentra fluxo subsuperficial)
- Exposição N-NE (mais úmida no Brasil)

### 6.2 Índice SHALSTAB (Shallow Landslide Stability)
```
log(q/T) = log(a/b) - log(tan φ'/sin β) - log[c'/(ρ_w × g × z × cos β)]
```
- `q/T` = razão de chuva efetiva / transmissividade
- Células onde q/T mínimo < limiar → instáveis

### 6.3 D8 Flow Direction para Percurso de Corrida
```
ACC(i,j) = Σ ACC vizinhos que drenam para (i,j)
Trajetória = seguir D8 do ponto de ruptura até planície
```

---

## 7. Propagação e Runout

### 7.1 Distância de Corrida
Relação empírica (Scheidegger 1973):
```
H/L = tan φ_aparente   onde φ_aparente ≈ 10°–30°
```
- `H` = diferença de elevação entre origem e depósito
- `L` = comprimento horizontal da corrida
- Corridas maiores → φ_aparente menor (efeito de escala)

Para debris flows:
```
L_runout ≈ 20 × V^(1/3) × M^(1/4)   (relação empírica)
```
- V = volume em m³
- M = mobilidade

### 7.2 Equação de Energia (Modelo Runout)
```
E_cinética = m × g × H - m × g × μ × L_horizontal - (1/2) × ξ⁻¹ × m × V²
```
Integrando ao longo da trajetória para obter L_runout.

---

## 8. Parâmetros Geotécnicos Típicos — Solos Brasileiros

| Solo | c' (kPa) | φ' (°) | γ (kN/m³) | k_s (m/s) |
|---|---|---|---|---|
| Areia fina | 0–5 | 30–35 | 16–18 | 10⁻⁴–10⁻³ |
| Silte | 5–15 | 25–30 | 17–19 | 10⁻⁶–10⁻⁴ |
| Argila mole | 15–30 | 15–20 | 14–17 | 10⁻⁹–10⁻⁷ |
| Solo laterítico | 8–25 | 28–38 | 17–21 | 10⁻⁶–10⁻⁴ |
| Saprolito gnáissico | 5–40 | 30–40 | 18–22 | 10⁻⁷–10⁻⁵ |

---

## 9. Danos em Estruturas

### 9.1 Pressão de Impacto de Debris Flow
```
P_imp = ρ_debris × V² × C_D × (1 + D_w/h)
```
- `ρ_debris` ≈ 1500–2200 kg/m³
- `C_D` ≈ 1.0–2.0 (dependendo da concentração de blocos)
- `D_w` = diâmetro médio de blocos

**Força total em parede:**
```
F_total = P_imp × A_frontal + (1/2) × ρ_debris × g × h² × A_lateral
```

### 9.2 Força de Impacto de Bloco
```
F_bloco = m_bloco × V × √(k_parede / m_bloco)   (modelo impulso-momentum)
```
Um bloco de 1 ton a 5 m/s: F_impacto ≈ 500–2000 kN — suficiente para penetrar parede de concreto.

---

## 10. Parâmetros para Simulação

| Parâmetro | Unidade | Faixa | Efeito |
|---|---|---|---|
| `soilMoisture` | % | 0–100 | Saturação → FS reduzido |
| `precipitation` | mm/h | 0–200 | Chuva deflagrante |
| `intensity` | % | 0–100 | Intensidade do evento |
| `slopeAngle` | graus | 15–70 | Declividade da encosta |
| `cohesion` | kPa | 0–50 | Resistência do solo |
| `friction` | graus | 15–45 | Ângulo de atrito |

**Derivações para renderização:**
```
mudHeight    = soilMoisture/100 × runoutLength × 0.1   [m]
buildingDmg  = min(1.0, intensity × 0.65)
mudCoat      = min(1.0, soilMoisture/100)  → altura da lama nos edifícios
```

---

## 11. Contexto Brasileiro

### 11.1 Regiões Críticas
- **Serra do Mar (SP/RJ/SC/PR):** maior risco nacional, interface urbanização + encosta íngreme
- **Região Serrana do RJ:** Petrópolis, Teresópolis, Nova Friburgo
- **Baixada Santista:** Santos, Serra de Cubatão
- **Vale do Itajaí, SC:** convergência de enchente + deslizamento
- **Grande Recife/Salvador:** encostas periurbanas em solos tropicais intemperizados

### 11.2 Eventos Históricos
| Evento | Mortes | Volume (m³) | Precipitação |
|---|---|---|---|
| Serrana RJ (2011) | 916 | ~10 Mi | 250 mm em 24h |
| Caraguatatuba SP (1967) | 436 | N/D | 300 mm em 24h |
| Franco da Rocha SP (2022) | 33 | ~500 k | 170 mm em 3h |
| Petrópolis RJ (2022) | 241 | ~2 Mi | 258 mm em 3h (recorde) |

### 11.3 Mapeamento Nacional
- **CPRM:** Carta de Suscetibilidade a Movimentos Gravitacionais e Inundações (1:25.000)
- **IPT:** Zoneamento de Risco em Encostas
- **CEMADEN:** Monitoramento pluviométrico em tempo real em 200+ municípios

---

## 12. Referências Científicas

- Caine, N. (1980). The rainfall intensity–duration control of shallow landslides and debris flows. *Geografiska Annaler*, 62A(1–2), 23–27.
- Hungr, O., Leroueil, S. & Picarelli, L. (2014). The Varnes classification of landslide types, an update. *Landslides*, 11(2), 167–194.
- Voellmy, A. (1955). Über die Zerstörungskraft von Lawinen. *Schweizerische Bauzeitung*, 73, 159–165.
- Montgomery, D.R. & Dietrich, W.E. (1994). A physically based model for the topographic control on shallow landsliding. *Water Resources Research*, 30(4), 1153–1171.
- Scheidegger, A.E. (1973). On the prediction of the reach and velocity of catastrophic landslides. *Rock Mechanics*, 5(4), 231–236.
- Varnes, D.J. (1978). Slope movement types and processes. In Schuster, R.L. & Krizek, R.J. (eds.), *Landslides: Analysis and Control*, Transportation Research Board, Special Report 176.
- IPT (2007). *Mapeamento de Riscos em Encostas e Margens de Rios*. Instituto de Pesquisas Tecnológicas, São Paulo.
- CPRM (2014). *Cartas de Suscetibilidade a Movimentos Gravitacionais e Inundações*. Serviço Geológico do Brasil.
- Tominaga, L.K. et al. (2009). *Desastres Naturais: Conhecer para Prevenir*. Instituto Geológico, SMA, São Paulo.
