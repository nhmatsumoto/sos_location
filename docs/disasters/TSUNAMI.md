# TSUNAMI
## Conhecimento Científico Especializado para Simulação de Desastres

---

## 1. Definição e Mecanismos de Geração

Tsunami é uma onda de longa duração gerada pelo deslocamento súbito de grande volume d'água. A palavra é japonesa: "tsu" (porto) + "nami" (onda).

### 1.1 Mecanismos Geradores

| Mecanismo | Frequência | Magnitude típica | Exemplo |
|---|---|---|---|
| **Terremoto submarino (thrust)** | 80–90% dos casos | Mw ≥ 7.5 | Sumatra 2004, Japan 2011 |
| **Deslizamento submarino** | 5–10% | Qualquer | Papua Nova Guiné 1998 |
| **Erupção vulcânica** | < 5% | Qualquer | Krakatoa 1883, Tonga 2022 |
| **Impacto de meteorito** | Raro | Grande | Chicxulub ~66 Ma |
| **Colapso de caldera** | < 1% | Regional | Santorini ~1600 AC |

### 1.2 Geração por Terremoto
Para geração eficaz de tsunami, o terremoto deve:
- Magnitude **Mw ≥ 7.5** (mínimo prático; eventos de Mw ≥ 7.8 geram tsunamis regionais)
- **Componente vertical** de deslocamento no fundo oceânico (falhas de thrust/reverse)
- **Profundidade hipocêntrica ≤ 60 km** (maior eficiência na coluna d'água)
- **Área de ruptura ≥ 100 km × 50 km**

**Deslocamento vertical do fundo oceânico (Okada 1985):**
```
Uz = (M₀ / 2πμ) × f(L, W, δ, λ, φ, x, y, d)
```
O deslocamento estático do fundo oceânico transmite-se instantaneamente à superfície livre → perturbação inicial da onda.

---

## 2. Física da Propagação em Mar Aberto

### 2.1 Velocidade de Fase (Onda de Água Rasa)
O tsunami em oceano aberto comporta-se como onda de água rasa (comprimento de onda >> profundidade):
```
c = √(g × d)
```
- `g` = 9.81 m/s²
- `d` = profundidade local (m)

**Exemplos de velocidade:**
| Profundidade | Velocidade |
|---|---|
| 4000 m (oceano) | ≈ 198 m/s = 713 km/h |
| 200 m (plataforma) | ≈ 44 m/s = 158 km/h |
| 10 m (costa) | ≈ 10 m/s = 36 km/h |
| 2 m (rua) | ≈ 4.4 m/s = 16 km/h |

### 2.2 Comprimento de Onda e Período
```
λ = c × T
```
- Período T: 10–60 minutos (típico: 15–30 min)
- Comprimento de onda: 150–300 km em oceano profundo
- Velocidade de grupo = velocidade de fase (dispersão desprezível)

### 2.3 Amplitude em Oceano Aberto
```
η₀ ≈ Δuz × (A_falha / A_onda)^(1/2) × fator_direcionalidade
```
Em mar aberto: η₀ = 0.1–1.0 m (imperceptível para navios)

---

## 3. Shoaling — Empolamento Costeiro

### 3.1 Lei de Green (Conservação de Energia)
À medida que o tsunami se aproxima da costa e o fundo sobe:
```
E_onda = (1/8) × ρ × g × H² × λ × 1 = constante (sem dissipação)
```
Combinando com conservação de fluxo de energia:
```
H × c^(1/2) × b^(1/2) = constante
```
**Lei de Shoaling simplificada:**
```
H ∝ d^(-1/4)   (sem refração lateral)
```
**Com refração (fator de refração K_r):**
```
H = H₀ × K_s × K_r
K_s = (d₀/d)^(1/4)   (coeficiente de empolamento)
K_r = (b₀/b)^(1/2)   (coeficiente de refração — b = largura do raio)
```

### 3.2 Amplificação Típica
- Oceano profundo → plataforma rasa (200→20 m): H aumenta ~1.7×
- Plataforma → zona de arrebentação (20→2 m): H aumenta ~2.6×
- Total (4000→1 m): H aumenta ~7–10× (mais refração/focalização)

---

## 4. Run-up e Inundação

### 4.1 Fórmula de Run-up (Iribarren / Synolakis 1987)
Para praia plana com inclinação β:
```
R/H = (π/4) × (H/L)^(-1/2) × tan(β) × f_corr
```
**Formulação de Carrier & Greenspan (onda solitary):**
```
R = 2.831 × √(d_off / g) × H_incident^(5/4) × d_off^(-3/4)
```
**Regra empírica amplamente usada:**
```
R ≈ 2 × H_max_offshore × (L/2π × d)^(1/2)
```

### 4.2 Relação Velocidade-Profundidade na Inundação
```
V_inundação ≈ √(2 × g × (R - z))   [m/s]
```
Onde z = elevação local do terreno. Velocidades de inundação: 3–15 m/s.

**Força hidrodinâmica sobre edificações:**
```
F = (1/2) × ρ × C_D × b × h × V²
```
- `ρ` = 1025 kg/m³ (água do mar)
- `C_D` ≈ 1.5–2.0 para edifícios quadrados
- `b × h` = área frontal exposta

---

## 5. Modelo de Propagação (Shallow Water Equations)

O método padrão para simulação numérica de tsunami:

```
∂η/∂t + ∂(hu)/∂x + ∂(hv)/∂y = 0

∂u/∂t + u∂u/∂x + v∂u/∂y = -g∂η/∂x - τ_bx/(ρh)

∂v/∂t + u∂v/∂x + v∂v/∂y = -g∂η/∂y - τ_by/(ρh)
```

Softwares: **TUNAMI** (Tohoku), **COMCOT** (Cornell), **GeoClaw**, **SELFE**, **OpenFOAM** (zona costeira com turbulência).

### 5.1 Atenuação no Oceano Aberto
```
η(r) ≈ η₀ × (r₀/r)^(1/2)   (decaimento geométrico 2D)
```
Um tsunami gerado a 10,000 km tem amplitude < 5–10% da amplitude inicial.

---

## 6. Escala de Intensidade de Tsunami

### 6.1 Escala de Imamura-Iida (magnitude de tsunami)
```
m_t = log₂(H_max)   onde H_max em metros
```
| m_t | H_max | Dano |
|---|---|---|
| -1 | 0.5 m | Sem dano |
| 0 | 1 m | Navio danificados em docas |
| 1 | 2 m | Casas litorâneas danificadas |
| 2 | 4 m | Destrutivo — casas arrastadas |
| 3 | 8 m | Muito destrutivo — florestas derrubadas |
| 4 | 16 m | Devastador — destruição da faixa costeira |

### 6.2 Escala NOAA (Ameaça)
- **Informação:** Mw ≥ 6.5, sem ameaça
- **Observação:** Mw ≥ 7.5, run-up < 0.3 m
- **Alerta:** run-up 0.3–1.0 m
- **Aviso (Warning):** run-up > 1.0 m, evacuação obrigatória

---

## 7. Detecção e Alerta

### 7.1 Boia DART (Deep-ocean Assessment and Reporting of Tsunamis)
- Sensor de pressão no fundo oceânico (BPR — Bottom Pressure Recorder)
- Detecta variações de pressão de ~1 mm de coluna d'água
- Transmissão via satélite (GOES) em < 2 minutos
- 60+ boias na rede NOAA ao redor do Pacífico e Atlântico

### 7.2 Tempo de Alerta Disponível
```
t_alerta = d / c - t_detecção   [s]
```
- Pacífico (1000 km): ~1.5 h de aviso após detecção
- Atlântico (500 km fonte): ~40 min
- Mar local (< 100 km fonte): < 10 min → alerta instrumental inviável, usa-se alerta natural

---

## 8. Efeitos em Estruturas

| Altura da Onda (m) | Velocidade de Impacto (m/s) | Pressão Impacto (kPa) | Dano |
|---|---|---|---|
| 0.5 | 2–3 | 20–40 | Dano leve, inundação de cave |
| 1.0 | 4–5 | 50–80 | Colapso de alvenaria simples |
| 2.0 | 6–7 | 120–160 | Derrubamento de estruturas leves |
| 4.0 | 8–10 | 250–350 | Dano severo em concreto |
| > 8 m | > 12 | > 500 | Destruição total; RC reforçado danificado |

**Pressão de impacto hidráulico:**
```
P_imp = C_imp × ρ × V²   onde C_imp ≈ 1.5–4.0 (impacto frontol súbito)
```

---

## 9. Parâmetros para Simulação

| Parâmetro | Unidade | Faixa | Efeito |
|---|---|---|---|
| `waveHeight` | m | 0.1–50 | Altura inicial da onda |
| `waveVelocity` | km/h | 100–900 | Velocidade em oceano aberto |
| `stormSurge` | m | 0–30 | Maré de tempestade combinada |
| `waterLevel` | m | 0–40 | Run-up máximo em costa |
| `duration` | min | 1–60 | Período da onda |
| `intensity` | % | 0–100 | Intensidade relativa |

**Derivações para renderização:**
```
waterLevel  = run_up_max   [m acima MSL]
floodSpeed  = √(2 × g × waterLevel)   [m/s]
buildingDmg = min(1.0, waterLevel / 12.0)
c_ocean     = √(g × 4000) ≈ 198 m/s
```

---

## 10. Tsunamis Históricos Notáveis

| Evento | Mw | H_max | Mortes |
|---|---|---|---|
| Valdivia, Chile 1960 | 9.5 | 25 m local | 6,000 |
| Alaska 1964 | 9.2 | 67 m (Valdez) | 139 |
| Papua Nova Guiné 1998 | 7.0 (landslide) | 15 m | 2,200 |
| Sumatra-Andaman 2004 | 9.1–9.3 | 30–50 m | 227,898 |
| Chile 2010 | 8.8 | 10–15 m | 525 |
| Tōhoku, Japan 2011 | 9.0–9.1 | 40.5 m (Miyako) | 20,000+ |
| Tonga 2022 (vulcão) | 5.8 equiv | ~15 m | 4 |

---

## 11. Brasil — Vulnerabilidade

- Margens passivas (sem subducção) → baixo risco de geração local
- **Risco trans-oceânico:** tsunamis gerados na zona de subducção de Cascádia ou Caribe podem atingir costa NE do Brasil com H ~1–3 m após 10–12 h
- **Evento histórico:** Tsunami de Lisboa (1755) atingiu costa do Brasil com ondas de 1–3 m
- **Monitoramento:** PCTBRASIL — Plano de Contingência para Tsunamis (Marinha do Brasil + INMET)

---

## 12. Referências Científicas

- Synolakis, C.E. (1987). The runup of solitary waves. *Journal of Fluid Mechanics*, 185, 523–545.
- Okada, Y. (1985). Surface deformation due to shear and tensile faults in a half-space. *BSSA*, 75(4), 1135–1154.
- Carrier, G.F. et al. (2003). Tsunami runup and drawdown on a plane beach. *Journal of Fluid Mechanics*, 475, 79–99.
- Ward, S.N. (2001). Landslide tsunami. *Journal of Geophysical Research*, 106(B6), 11,201–11,215.
- Liu, P.L.F. et al. (1995). Runup of solitary waves on a circular island. *Journal of Fluid Mechanics*, 302, 259–285.
- Imamura, F. (1996). *Tsunami Numerical Simulation with the Staggered Leap-Frog Scheme*. Disaster Control Research Center, Tohoku University.
- Bernard, E. & Titov, V. (2015). Evolution of tsunami warning systems and products. *Philosophical Transactions of the Royal Society A*, 373, 20140371.
- Ambraseys, N.N. (1962). Data for the investigation of the seismic sea waves in the eastern Mediterranean. *BSSA*, 52(4), 895–913.
