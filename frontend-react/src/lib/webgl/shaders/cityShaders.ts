/**
 * Hydra Core v4.0.0 — Real-World City Rendering Shader Library
 * Dual-mode rendering: satellite imagery (real city) + tactical holographic overlay.
 */

export const SHADERS = {
  INFRASTRUCTURE: {
    VS: `#version 300 es
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;
layout(location = 2) in float a_color;
layout(location = 3) in vec2 a_uv;
layout(location = 4) in float a_reveal;

uniform mat4 u_projectionMatrix;
uniform mat4 u_viewMatrix;
uniform float u_vibration;
uniform float u_time;

out vec3 v_normal;
out vec2 v_uv;
out float v_color;
out float v_reveal;
out vec3 v_worldPos;

void main() {
    v_normal = a_normal;
    v_uv = a_uv;
    v_color = a_color;
    v_reveal = a_reveal;

    vec3 pos = a_position;
    if (u_vibration > 0.01) {
        float f = sin(u_time * 15.0 + pos.x * 0.05 + pos.z * 0.05);
        pos.x += f * u_vibration;
        pos.z += f * u_vibration;
    }

    v_worldPos = pos;
    gl_Position = u_projectionMatrix * u_viewMatrix * vec4(pos, 1.0);
}
`,
    FS: `#version 300 es
precision highp float;

in vec3 v_normal;
in vec2 v_uv;
in float v_color;
in float v_reveal;
in vec3 v_worldPos;

uniform vec3 u_lightDir;
uniform vec3 u_lightColor;
uniform float u_reveal;
uniform float u_time;

out vec4 outColor;

void main() {
    vec3 N = normalize(v_normal);
    vec3 L = normalize(u_lightDir);
    float diff = max(dot(N, L), 0.2);
    
    vec3 baseCol = vec3(v_color);
    
    // Subtle holographic grid
    float grid = (sin(v_worldPos.x * 0.1) * 0.5 + 0.5) * (sin(v_worldPos.z * 0.1) * 0.5 + 0.5);
    vec3 finalCol = mix(baseCol, vec3(0.0, 0.4, 0.8), grid * 0.15);
    
    finalCol *= u_lightColor * diff;
    
    outColor = vec4(finalCol, v_reveal * u_reveal);
}
`
  },

  WATER: {
    VS: `#version 300 es
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;
layout(location = 2) in vec2 a_uv;

uniform mat4 u_projectionMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_modelMatrix;
uniform float u_time;
uniform float u_waterLevel;
uniform float u_waveHeight;
uniform float u_waveSpeed;
uniform float u_waveFrequency;
uniform float u_waveDirectionX;
uniform float u_waveDirectionZ;

out vec3 v_normal;
out vec2 v_uv;
out float v_depth;
out vec3 v_worldPos;

void main() {
  v_uv = a_uv;
  vec3 pos = a_position;

  // Simple sine wave for water surface
  float waveOffset = sin(dot(pos.xz, vec2(u_waveDirectionX, u_waveDirectionZ)) * u_waveFrequency + u_time * u_waveSpeed) * u_waveHeight;
  pos.y += u_waterLevel + waveOffset;

  v_worldPos = (u_modelMatrix * vec4(pos, 1.0)).xyz;
  v_normal = normalize((u_modelMatrix * vec4(a_normal, 0.0)).xyz); // Placeholder, proper normal calculation for waves is more complex
  v_depth = -pos.y; // Assuming 0 is sea level, negative is below

  gl_Position = u_projectionMatrix * u_viewMatrix * u_modelMatrix * vec4(pos, 1.0);
}
`,
    FS: `#version 300 es
precision highp float;

in vec3 v_normal;
in vec2 v_uv;
in float v_depth;
in vec3 v_worldPos;

out vec4 outColor;

uniform vec3 u_lightDir;
uniform vec3 u_lightColor;
uniform float u_lightIntensity;
uniform float u_time;
uniform float u_reveal;
uniform float u_waterClarity;
uniform vec3 u_waterColorDeep;
uniform vec3 u_waterColorShallow;
uniform float u_fresnelPower;
uniform float u_fresnelBias;

void main() {
  vec3 N = normalize(v_normal);
  vec3 L = normalize(u_lightDir);
  vec3 V = normalize(-v_worldPos); // Camera position is (0,0,0) in view space, so vector to camera is -v_worldPos

  float diff = max(dot(N, L), 0.0);
  vec3 ambient = vec3(0.1, 0.2, 0.3) * u_lightIntensity; // Basic ambient

  // Water color based on depth
  vec3 waterColor = mix(u_waterColorShallow, u_waterColorDeep, clamp(v_depth * u_waterClarity, 0.0, 1.0));

  // Fresnel effect for reflection at glancing angles
  float fresnel = u_fresnelBias + (1.0 - u_fresnelBias) * pow(1.0 - max(0.0, dot(N, V)), u_fresnelPower);

  // Simple specular reflection (placeholder)
  vec3 R = reflect(-L, N);
  float spec = pow(max(dot(R, V), 0.0), 32.0);

  vec3 finalColor = waterColor * (ambient + u_lightColor * diff * u_lightIntensity) + vec3(spec * 0.5); // Add some specular

  // Add subtle distortion/refraction effect (optional, more complex with actual refraction)
  float distortion = sin(v_uv.x * 10.0 + u_time * 0.5) * cos(v_uv.y * 12.0 + u_time * 0.7) * 0.02;
  finalColor += distortion * 0.1;

  outColor = vec4(finalColor, 0.8 * u_reveal); // Semi-transparent water
}
`
  },

  TERRAIN: {
    VS: `#version 300 es
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;
layout(location = 2) in vec2 a_uv;

uniform mat4 u_projectionMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_modelMatrix;
uniform sampler2D u_topoMap;
uniform float u_topoScale;
uniform float u_texelOffset; // 1.0 / textureSize — set by host based on actual texture dimensions
uniform float u_worldSpanX;  // city width  in metres (E-W)
uniform float u_worldSpanZ;  // city depth  in metres (N-S)

out vec3 v_normal;
out vec2 v_uv;
out float v_height;

void main() {
  v_uv = a_uv;
  float height = texture(u_topoMap, a_uv).r * u_topoScale;
  v_height = height;

  vec3 pos = a_position;
  pos.y += height;

  // Earth curvature: at distance d the horizon drops d²/(2R).
  // R_earth = 6,371 km = 637,100,000 cm  →  2R = 1,274,200,000 cm
  pos.y -= dot(pos.xz, pos.xz) / 1274200000.0;

  // Physically-correct terrain normal via finite differences.
  // Each neighbour sample is u_texelOffset UV units away, which corresponds to
  // (u_worldSpanX * u_texelOffset) metres in X and (u_worldSpanZ * u_texelOffset) in Z.
  // The resulting cross-product gives the exact surface normal:
  //   tangent_x = (cellX, hR-hL,    0  )
  //   tangent_z = (  0,   hU-hD, cellZ )
  //   normal    = cross(tangent_z, tangent_x) — normalised
  float o     = u_texelOffset;
  float cellX = u_worldSpanX * o;   // metres per texel step in X
  float cellZ = u_worldSpanZ * o;   // metres per texel step in Z

  float hL = texture(u_topoMap, a_uv + vec2(-o, 0.0)).r * u_topoScale;
  float hR = texture(u_topoMap, a_uv + vec2( o, 0.0)).r * u_topoScale;
  float hD = texture(u_topoMap, a_uv + vec2(0.0, -o)).r * u_topoScale;
  float hU = texture(u_topoMap, a_uv + vec2(0.0,  o)).r * u_topoScale;

  // rise/run for each axis — gives slope in metres/metre (dimensionless)
  float slopeX = (hR - hL) / (2.0 * cellX);
  float slopeZ = (hU - hD) / (2.0 * cellZ);

  vec3 normal = normalize(vec3(-slopeX, 1.0, -slopeZ));
  v_normal = (u_modelMatrix * vec4(normal, 0.0)).xyz;

  gl_Position = u_projectionMatrix * u_viewMatrix * u_modelMatrix * vec4(pos, 1.0);
}
`,
    FS: `#version 300 es
precision highp float;
precision highp int;

in vec3 v_normal;
in vec2 v_uv;
in float v_height;

out vec4 outColor;

uniform highp int   u_topoMode;
uniform float u_topoScale;
uniform float u_lightIntensity;
uniform vec3  u_soilColor;
uniform float u_reveal;
uniform vec3  u_lightDir;
uniform vec3  u_lightColor;
uniform float u_wetness;
uniform float u_fireScorch;
uniform highp int   u_earthquakeMod;
uniform float u_time;          // elapsed simulation time [s]
uniform float u_waterLevel;    // current water surface height
uniform float u_quakeOriginX;  // epicenter UV X (0-1)
uniform float u_quakeOriginZ;  // epicenter UV Z (0-1)
// Tsunami drawback: expose sea floor when water recedes
uniform float u_tsunamiDrawback; // 0=normal, 1=full drawback (water receded)
// Drought / Mudslide terrain modifiers
uniform float u_droughtMod;   // 0-1 drought severity (drives soil cracking)
uniform float u_mudslideMod;  // 0-1 mudslide activity (drives flowing mud)

// Satellite / map tile texture
uniform sampler2D u_satTex;
uniform highp int       u_satMode;   // 1 = texture loaded
uniform float     u_satBlend;  // 0 = pure procedural, 1 = pure satellite

// Land cover texture (SpectralAnalyzer output, one byte per cell = classId × 32)
// classId: 0=unknown 1=water 2=veg_dense 3=veg_sparse 4=bare_soil 5=urban 6=sand 7=snow
uniform sampler2D u_landCoverTex;
uniform highp int       u_landCoverMode;  // 1 = texture loaded, blend land cover tint

vec3 landCoverTint(float encoded) {
  int cls = int(encoded * 255.0 / 32.0 + 0.5);
  if (cls == 1) return vec3(0.08, 0.22, 0.55);  // water — deep blue
  if (cls == 2) return vec3(0.10, 0.32, 0.08);  // veg_dense — dark green
  if (cls == 3) return vec3(0.28, 0.52, 0.18);  // veg_sparse — medium green
  if (cls == 4) return vec3(0.44, 0.30, 0.16);  // bare_soil — brown
  if (cls == 5) return vec3(0.46, 0.46, 0.48);  // urban — grey
  if (cls == 6) return vec3(0.80, 0.72, 0.52);  // sand — tan
  if (cls == 7) return vec3(0.90, 0.93, 0.97);  // snow — white-blue
  return vec3(-1.0);                             // unknown → no tint
}

void main() {
  vec3 N = normalize(v_normal);
  vec3 L = normalize(u_lightDir);

  float diff   = max(dot(N, L), 0.0);
  float ambStr = 0.64; // midday: stronger sky contribution from all directions

  // ── Procedural elevation palette ─────────────────────────────────────────
  float normH   = clamp(v_height / max(u_topoScale, 1.0), 0.0, 1.0);
  float flatness = clamp(N.y, 0.0, 1.0);
  // Slope-based ambient occlusion: valleys and steep faces receive less sky light
  float ao = 0.45 + 0.55 * flatness * flatness;

  vec3 cWater  = vec3(0.10, 0.26, 0.50);
  vec3 cSand   = vec3(0.72, 0.63, 0.44);
  vec3 cGrass  = vec3(0.24, 0.48, 0.16);
  vec3 cForest = vec3(0.13, 0.34, 0.11);
  vec3 cScrub  = vec3(0.38, 0.40, 0.20);
  vec3 cSoil   = vec3(0.44, 0.30, 0.16);
  vec3 cRock   = vec3(0.50, 0.46, 0.42);
  vec3 cSnow   = vec3(0.91, 0.93, 0.96);

  vec3 baseColor;
  if      (normH < 0.04) baseColor = mix(cWater,  cSand,   normH / 0.04);
  else if (normH < 0.12) baseColor = mix(cSand,   cGrass,  (normH - 0.04) / 0.08);
  else if (normH < 0.30) baseColor = mix(cGrass,  cForest, (normH - 0.12) / 0.18);
  else if (normH < 0.48) baseColor = mix(cForest, cScrub,  (normH - 0.30) / 0.18);
  else if (normH < 0.63) baseColor = mix(cScrub,  cSoil,   (normH - 0.48) / 0.15);
  else if (normH < 0.80) baseColor = mix(cSoil,   cRock,   (normH - 0.63) / 0.17);
  else                   baseColor = mix(cRock,   cSnow,   (normH - 0.80) / 0.20);

  vec3 terrainColor = mix(cRock, baseColor, smoothstep(0.35, 0.68, flatness));

  // ── Land cover tint (procedural mode) ────────────────────────────────────
  if (u_landCoverMode == 1) {
    float enc  = texture(u_landCoverTex, v_uv).r;
    vec3  tint = landCoverTint(enc);
    if (tint.r >= 0.0) terrainColor = mix(terrainColor, tint, 0.45);
  }

  if (u_topoMode == 1) {
    float interval = max(u_topoScale * 0.05, 1.0);
    float contour  = fract(v_height / interval);
    float line     = 1.0 - smoothstep(0.0, 0.035, min(contour, 1.0 - contour));
    terrainColor   = mix(terrainColor, vec3(0.0, 0.62, 0.95), line * 0.55);
  }

  // Hemisphere ambient: midday sky (deep blue-white) from upper hemisphere,
  // warm diffuse ground bounce from lower hemisphere. Uses normal.y for blend.
  vec3 skyAmb  = vec3(0.38, 0.54, 0.82) * ambStr * ao; // clear noon sky: deep blue
  vec3 gndAmb  = (u_soilColor * 0.8 + vec3(0.10, 0.09, 0.06)) * 0.22 * ao; // warm ground bounce
  vec3 ambient = mix(gndAmb, skyAmb, N.y * 0.5 + 0.5);

  vec3 diffuse = terrainColor * diff * u_lightColor * u_lightIntensity;
  // Harder specular at noon (sun high = tighter specular highlight)
  vec3 V = normalize(vec3(0.0, 1.0, 0.3));
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 96.0) * flatness * 0.20;
  float micro = fract(sin(dot(floor(v_uv * 256.0), vec2(127.1, 311.7))) * 43758.5) * 0.025 - 0.012;

  if (u_wetness > 0.01) {
    float wet = u_wetness * 0.72;
    terrainColor = mix(terrainColor, terrainColor * vec3(0.50, 0.52, 0.55), wet);
    spec += wet * 0.18;
  }

  if (u_earthquakeMod > 0) {
    float crackProg  = clamp(u_time / 4.0, 0.0, 1.0);
    float radialProg = clamp((u_time - 0.5) / 2.5, 0.0, 1.0);

    // Random Voronoi fracture network
    vec2 cp = v_uv * 36.0;
    vec2 ci = floor(cp); vec2 cf = fract(cp);
    float md = 1.0;
    for (int dy=-1; dy<=1; dy++) for (int dx=-1; dx<=1; dx++) {
      vec2 nb   = vec2(float(dx), float(dy));
      vec2 seed = ci + nb;
      vec2 rp   = vec2(fract(sin(dot(seed, vec2(127.1,311.7)))*43758.5),
                       fract(sin(dot(seed, vec2(269.5,183.3)))*17371.3));
      md = min(md, length(cf - nb - rp));
    }
    float crack = 1.0 - smoothstep(0.0, 0.09, md);
    terrainColor = mix(terrainColor, vec3(0.01, 0.01, 0.01), crack * 0.88 * crackProg);

    // Radial fault lines radiating from epicenter
    vec2 toEpic   = v_uv - vec2(u_quakeOriginX, u_quakeOriginZ);
    float distEpic = length(toEpic);
    if (distEpic > 0.001) {
      float radAngle  = atan(toEpic.y, toEpic.x);
      // 8 radial faults with slight angular offsets per ray
      float radFault  = abs(sin(radAngle * 4.0)) * (1.0 - smoothstep(0.05, 0.60, distEpic));
      float radLine   = smoothstep(0.90, 1.0, radFault);
      terrainColor    = mix(terrainColor, vec3(0.0, 0.0, 0.0), radLine * 0.80 * radialProg);
      // Darker epicenter zone: ground disruption
      float epicZone  = (1.0 - smoothstep(0.0, 0.08, distEpic)) * crackProg;
      terrainColor    = mix(terrainColor, vec3(0.06, 0.05, 0.04), epicZone * 0.55);
    }
  }

  // Tsunami drawback: expose sea floor / wet sand
  if (u_tsunamiDrawback > 0.01) {
    float db = u_tsunamiDrawback;
    // Low-lying areas (near sea level) turn to exposed wet sand
    float lowLying = clamp(1.0 - v_height / (u_topoScale * 0.08 + 1.0), 0.0, 1.0);
    terrainColor = mix(terrainColor, vec3(0.62, 0.55, 0.38), lowLying * db * 0.70);
    // Wet sheen on exposed areas
    float wetSheen = lowLying * db * 0.40;
    terrainColor = mix(terrainColor, vec3(0.45, 0.50, 0.55), wetSheen);
  }

  if (u_fireScorch > 0.01) {
    terrainColor = mix(terrainColor, vec3(0.04,0.02,0.01), u_fireScorch * 0.80);
  }

  // Drought: bleached/cracked dry earth
  if (u_droughtMod > 0.01) {
    float dm = u_droughtMod;
    // Bleach toward pale straw-tan
    terrainColor = mix(terrainColor, vec3(0.72, 0.61, 0.38), dm * 0.55);
    // Desiccation crack network: fine grid lines of dark brown
    float cx = abs(sin(v_uv.x * 180.0)) < (0.025 * dm) ? 1.0 : 0.0;
    float cz = abs(sin(v_uv.y * 180.0)) < (0.025 * dm) ? 1.0 : 0.0;
    float crack = max(cx, cz);
    // Secondary finer cracks
    float cx2 = abs(sin(v_uv.x * 420.0 + 0.5)) < (0.018 * dm) ? 1.0 : 0.0;
    float cz2 = abs(sin(v_uv.y * 420.0 + 0.5)) < (0.018 * dm) ? 1.0 : 0.0;
    crack = max(crack, max(cx2, cz2) * 0.6);
    terrainColor = mix(terrainColor, vec3(0.20, 0.14, 0.08), crack * dm * 0.70);
  }

  // Mudslide: flowing brown mud stream down slopes
  if (u_mudslideMod > 0.01) {
    float mm = u_mudslideMod;
    // Mud flow: animated streaks in slope direction (use UV + time)
    float flowAnim = fract(v_uv.y * 4.0 - u_time * 0.08 * mm); // flows downslope (increasing v)
    float flowStripe = smoothstep(0.42, 0.50, flowAnim) * smoothstep(0.70, 0.55, flowAnim);
    // Only on sloped areas (flatness < 0.85 = N.y < threshold)
    float N_y = dot(normalize(v_normal), vec3(0.0, 1.0, 0.0));
    float slopeWeight = clamp(1.0 - N_y / 0.92, 0.0, 1.0);
    vec3  mudCol = mix(vec3(0.28, 0.18, 0.08), vec3(0.38, 0.28, 0.14), flowAnim);
    terrainColor = mix(terrainColor, mudCol, flowStripe * slopeWeight * mm * 0.80);
    // Overall mud tint on low areas
    terrainColor = mix(terrainColor, vec3(0.30, 0.20, 0.10), mm * slopeWeight * 0.35);
  }

  vec3 finalColor = terrainColor * ambient + diffuse + spec + micro;

  // ── Satellite blending (final pass) ──────────────────────────────────────
  if (u_satMode == 1 && u_satBlend > 0.001) {
    vec3 sat = texture(u_satTex, vec2(v_uv.x, v_uv.y)).rgb;
    sat = pow(clamp(sat, 0.0, 1.0), vec3(0.9)); // Gamma correction
    
    // Satellite lighting (simplified) - keep it visible but affected by light
    vec3 satLit = sat * (ambStr + diff * 0.65 * u_lightIntensity * u_lightColor);
    satLit = clamp(satLit, 0.0, 1.0);
    
    finalColor = mix(finalColor, satLit, u_satBlend);
  }

  outColor = vec4(clamp(finalColor, 0.0, 1.0), u_reveal);
}
`
  },

  HIGHWAY: {
    VS: `#version 300 es
layout(location = 0) in vec3 a_position;
uniform mat4 u_projectionMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_modelMatrix;
uniform sampler2D u_topoMap;
uniform float u_topoScale;
uniform float u_topoOffset;
uniform float u_areaHalf;
uniform int u_bridgeMode;

void main() {
    vec2 uv = (a_position.xz + u_areaHalf) / (u_areaHalf * 2.0);
    float height = texture(u_topoMap, uv).r * u_topoScale + u_topoOffset + 0.3;
    if (u_bridgeMode == 1 && fract(a_position.x * 0.001) < 0.05) height += 400.0;
    vec4 pos = u_modelMatrix * vec4(a_position.x, height, a_position.z, 1.0);
    gl_Position = u_projectionMatrix * u_viewMatrix * pos;
}
`,
    FS: `#version 300 es
precision highp float;
precision highp int;
uniform float u_reveal;
uniform highp int u_realisticMode;
out vec4 outColor;
void main() {
    // In satellite mode: asphalt gray roads; in tactical: pale blue-gray
    vec3 color = u_realisticMode == 1 ? vec3(0.28, 0.28, 0.28) : vec3(0.4, 0.45, 0.5);
    outColor = vec4(color, u_reveal);
}
`
  },

  WATERWAY: {
    VS: `#version 300 es
layout(location = 0) in vec3 a_position;
uniform mat4 u_projectionMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_modelMatrix;
uniform sampler2D u_topoMap;
uniform float u_topoScale;
uniform float u_areaHalfX;
uniform float u_areaHalfZ;

out vec3 v_worldPos;

void main() {
    vec2 uv = clamp(vec2(
        (a_position.x + u_areaHalfX) / (u_areaHalfX * 2.0),
        (a_position.z + u_areaHalfZ) / (u_areaHalfZ * 2.0)
    ), 0.0, 1.0);
    float height = texture(u_topoMap, uv).r * u_topoScale + 0.2;
    vec4 pos = u_modelMatrix * vec4(a_position.x, height, a_position.z, 1.0);
    v_worldPos = pos.xyz;
    gl_Position = u_projectionMatrix * u_viewMatrix * pos;
}
`,
    FS: `#version 300 es
precision highp float;
in vec3 v_worldPos;
uniform float u_time;
uniform float u_reveal;
out vec4 outColor;

float wHash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5); }
float wNoise(vec2 p){
  vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(wHash(i),wHash(i+vec2(1,0)),f.x),
             mix(wHash(i+vec2(0,1)),wHash(i+vec2(1,1)),f.x),f.y);
}

void main() {
    // Flowing water noise along world coordinates
    // u_time drives the x offset to simulate downstream flow
    vec2 wuv = v_worldPos.xz * 0.008;
    float n1 = wNoise(wuv + vec2(u_time * 0.45, u_time * 0.12));
    float n2 = wNoise(wuv * 2.3 - vec2(u_time * 0.62, u_time * 0.18));
    float flow = n1 * 0.6 + n2 * 0.4;
    
    // Animated water color with dual-frequency specular flash
    float s1 = sin(u_time * 2.4 + v_worldPos.x * 0.01) * 0.5 + 0.5;
    float s2 = sin(u_time * 1.3 + v_worldPos.z * 0.01 + 1.2) * 0.5 + 0.5;
    float glint = s1 * s2 * flow;
    
    vec3 deepCol    = vec3(0.01, 0.08, 0.24);
    vec3 shallowCol = vec3(0.04, 0.28, 0.55);
    vec3 color = mix(deepCol, shallowCol, 0.35 + glint * 0.45 + flow * 0.2);
    
    // foam/crest fringe
    float foam = smoothstep(0.78, 1.0, glint + flow * 0.2);
    color = mix(color, vec3(0.85, 0.93, 1.0), foam * 0.5);
    
    outColor = vec4(color, 0.92 * u_reveal);
}
`
  },



  PARTICLE: {
    VS: `#version 300 es
layout(location = 0) in vec3 a_position;
uniform mat4 u_projectionMatrix;
uniform mat4 u_viewMatrix;
uniform float u_time;
uniform float u_reveal;
uniform int u_type;
uniform float u_windSpeed;
uniform float u_windDirection;
uniform float u_pressure;

out float v_life;
out float v_type;

void main() {
    vec3 pos = a_position;
    float windFactor = u_windSpeed * 0.1;
    float rad = u_windDirection * 0.0174533;
    vec2 windDir = vec2(cos(rad), sin(rad));
    float pressureFactor = (1013.0 - u_pressure) * 0.05;
    v_type = float(u_type);

    if (u_type == 1) { // TORNADO
        float h = pos.y / 25.0;
        float swirlFreq = 6.0 + pressureFactor;
        float angle = u_time * (swirlFreq + h * 4.0) + pos.x * 5.0;
        float radius = h * (8.0 + windFactor) + sin(u_time * 2.0) * 0.5;
        pos.x = cos(angle) * radius + windDir.x * (5.0 + windFactor) + sin(u_time * 0.3) * 2.0;
        pos.z = sin(angle) * radius + windDir.y * (5.0 + windFactor) + cos(u_time * 0.3) * 2.0;
        pos.y += sin(u_time * 0.5) * 2.0;
    } else { // FLOOD/RAIN
        float speed = 25.0 + windFactor;
        pos.y = mod(pos.y - u_time * speed, 50.0);
        pos.x += windDir.x * windFactor * (1.0 + pos.y * 0.05);
        pos.z += windDir.y * windFactor * (1.0 + pos.y * 0.05);
    }

    gl_Position = u_projectionMatrix * u_viewMatrix * vec4(pos, 1.0);
    gl_PointSize = u_type == 1 ? (4.0 + windFactor * 0.2) : 1.5;
    v_life = pos.y / 50.0;
}
`,
    FS: `#version 300 es
precision highp float;
in float v_life;
in float v_type;
uniform float u_reveal;
out vec4 outColor;
void main() {
    vec3 color = (v_type > 0.5) ? vec3(0.8, 0.9, 1.0) : vec3(0.4, 0.7, 1.0);
    outColor = vec4(color, 0.8 * (1.0 - v_life) * u_reveal);
}
`
  },

  ROAD: {
    VS: `#version 300 es
layout(location=0) in vec3 a_position; // x, roadU (0=left edge, 1=right edge), z
uniform mat4 u_projectionMatrix, u_viewMatrix, u_modelMatrix;
uniform sampler2D u_topoMap;
uniform float u_topoScale, u_topoOffset, u_areaHalfX, u_areaHalfZ, u_elevOffset;
out float v_roadU;
void main() {
    v_roadU = a_position.y; // repurposed: 0.0=left edge, 0.5=centre, 1.0=right edge
    vec2 uv = vec2(
        (a_position.x + u_areaHalfX) / (u_areaHalfX * 2.0),
        (a_position.z + u_areaHalfZ) / (u_areaHalfZ * 2.0)
    );
    uv = clamp(uv, 0.0, 1.0);
    float h = texture(u_topoMap, uv).r * u_topoScale + u_topoOffset + 0.3 + u_elevOffset;
    gl_Position = u_projectionMatrix * u_viewMatrix * u_modelMatrix * vec4(a_position.x, h, a_position.z, 1.0);
}
`,
    FS: `#version 300 es
precision highp float;
in float v_roadU;
uniform float u_reveal;
uniform int u_realisticMode;
uniform vec3 u_roadColor;
uniform float u_markings; // 1.0 = draw centre stripe + edge lines
out vec4 outColor;
void main() {
    vec3 c = u_realisticMode == 1 ? u_roadColor : vec3(0.35, 0.40, 0.50);
    if (u_markings > 0.5) {
        // Centre stripe — yellow
        float ct = smoothstep(0.028, 0.0, abs(v_roadU - 0.5));
        c = mix(c, vec3(0.97, 0.88, 0.08), ct);
        // Edge lines — white
        float el = max(smoothstep(0.07, 0.0, v_roadU), smoothstep(0.93, 1.0, v_roadU));
        c = mix(c, vec3(0.88, 0.88, 0.88), el);
    }
    outColor = vec4(c, u_reveal);
}
`
  },

  WATER_AREA: {
    VS: `#version 300 es
layout(location=0) in vec3 a_position;
uniform mat4 u_projectionMatrix, u_viewMatrix, u_modelMatrix;
uniform sampler2D u_topoMap;
uniform float u_topoScale, u_topoOffset, u_areaHalfX, u_areaHalfZ, u_time;
out vec3 v_worldPos; out vec2 v_uv;
void main() {
    vec2 uv = vec2(
        (a_position.x + u_areaHalfX) / (u_areaHalfX * 2.0),
        (a_position.z + u_areaHalfZ) / (u_areaHalfZ * 2.0)
    );
    uv = clamp(uv, 0.0, 1.0);
    v_uv = uv;
    float h = texture(u_topoMap, uv).r * u_topoScale + u_topoOffset;
    float wave = sin(a_position.x * 0.00008 + u_time * 1.5) * 0.12 + cos(a_position.z * 0.00006 + u_time * 1.2) * 0.08;
    vec3 wPos = vec3(a_position.x, h + wave, a_position.z);
    v_worldPos = wPos;
    gl_Position = u_projectionMatrix * u_viewMatrix * u_modelMatrix * vec4(wPos, 1.0);
}
`,
    FS: `#version 300 es
precision highp float;
in vec3 v_worldPos; in vec2 v_uv;
uniform float u_time, u_reveal;
uniform vec3 u_lightDir, u_lightColor;
uniform float u_lightIntensity;
out vec4 outColor;

float wHash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5); }
float wNoise(vec2 p){
  vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(wHash(i),wHash(i+vec2(1,0)),f.x),
             mix(wHash(i+vec2(0,1)),wHash(i+vec2(1,1)),f.x),f.y);
}
float wFbm(vec2 p){
  float v=0.0,a=0.5;
  for(int i=0;i<5;i++){v+=a*wNoise(p);p=p*2.07+vec2(1.7,9.2);a*=0.5;}
  return v;
}

void main() {
    // World-space UV at water detail scale (0.00006 → ~1 wave per ~17 m)
    vec2 wuv = v_worldPos.xz * 0.00006;

    // Two-layer FBM domain-warped normals for realistic chop
    vec2 q = vec2(wFbm(wuv + vec2(u_time*0.10)),
                  wFbm(wuv + vec2(u_time*0.08) + 5.2));
    vec2 r = vec2(wFbm(wuv*2.3 + q*0.6 + vec2(u_time*0.07,0.0)),
                  wFbm(wuv*2.3 + q*0.6 + vec2(0.0,u_time*0.09) + 1.7));
    // Normal from gradient of domain-warped FBM
    float nx = r.x * 0.45 - 0.225;
    float nz = r.y * 0.45 - 0.225;
    vec3 N = normalize(vec3(nx, 1.0, nz));

    vec3 L = normalize(u_lightDir);
    // Approximate view direction (overhead look-down with slight tilt)
    vec3 V = normalize(vec3(0.0, 1.0, 0.18));
    vec3 H = normalize(L + V);

    // Schlick Fresnel — F0 = 0.02 for water
    float cosV = max(dot(N, V), 0.0);
    float F = 0.02 + 0.98 * pow(1.0 - cosV, 5.0);

    // Water color: deep/shallow blend with FBM variation
    float depth = wFbm(wuv * 2.8 + u_time * 0.018);
    vec3 shallowCol = vec3(0.04, 0.32, 0.60);
    vec3 deepCol    = vec3(0.01, 0.08, 0.26);
    vec3 waterCol   = mix(shallowCol, deepCol, depth);
    // Sub-surface scattering: bright turquoise tint at shallow crest areas
    vec3 sssCol = vec3(0.08, 0.62, 0.80);
    waterCol = mix(waterCol, sssCol, (1.0 - depth) * 0.18);

    float diff = max(dot(N, L), 0.0) * u_lightIntensity;

    // Specular highlight (sun glint on water)
    float spec = pow(max(dot(N, H), 0.0), 256.0) * u_lightIntensity;
    vec3 sunGlint = u_lightColor * spec * 3.5 * F;

    // Sky reflection tint
    vec3 skyRefl = mix(vec3(0.30, 0.50, 0.78), vec3(0.65, 0.80, 0.95), F);

    // Animated caustic shimmer (bright wave-crests)
    float cw = wuv.x * 120.0; float ch = wuv.y * 120.0;
    float caustic = max(0.0, sin(cw + u_time*2.2)*sin(ch + u_time*1.8));
    caustic = pow(caustic, 4.0) * 0.18 * (1.0 - depth);

    // Foam: white froth at high-frequency wave peaks
    float foamN = wFbm(wuv * 9.0 + vec2(u_time * 0.18, -u_time * 0.14));
    float foam  = smoothstep(0.60, 0.78, foamN) * 0.65;

    // Horizon foam streaks (wind-aligned)
    float streak = wFbm(vec2(wuv.x * 3.0 + u_time * 0.06, wuv.y * 18.0));
    foam = max(foam, smoothstep(0.72, 0.82, streak) * 0.35);

    vec3 color = waterCol * (0.30 + diff * 0.70) * u_lightColor
               + sunGlint
               + skyRefl * F * 0.35
               + caustic;
    color = mix(color, vec3(0.92, 0.96, 1.0), foam);

    // Distance fog
    float fog = smoothstep(80000.0, 180000.0, length(v_worldPos));
    color = mix(color, vec3(0.38, 0.52, 0.70), fog);

    outColor = vec4(clamp(color, 0.0, 1.0), (0.88 + F * 0.08) * u_reveal);
}
`
  },

  CHARACTER: {
    VS: `#version 300 es
layout(location = 0) in vec3 a_position; // capsule local space
uniform mat4 u_projectionMatrix;
uniform mat4 u_viewMatrix;
uniform vec3 u_charPos;   // world-space foot position
uniform float u_charYaw;  // rotation around Y (radians)
out vec3 v_worldPos;

void main() {
    float cy = cos(u_charYaw), sy = sin(u_charYaw);
    vec3 rotated = vec3(
        a_position.x * cy - a_position.z * sy,
        a_position.y,
        a_position.x * sy + a_position.z * cy
    );
    vec3 world = rotated + u_charPos;
    v_worldPos = world;
    gl_Position = u_projectionMatrix * u_viewMatrix * vec4(world, 1.0);
}
`,
    FS: `#version 300 es
precision highp float;
in vec3 v_worldPos;
uniform vec3 u_lightDir;
uniform vec3 u_lightColor;
uniform float u_lightIntensity;
out vec4 outColor;

void main() {
    vec3 N = normalize(cross(dFdx(v_worldPos), dFdy(v_worldPos)));
    float diff = max(dot(N, normalize(u_lightDir)), 0.25);
    // Orange-red body — highly visible against any terrain colour
    vec3 bodyColor = vec3(0.97, 0.26, 0.06);
    vec3 color = bodyColor * diff * u_lightColor * u_lightIntensity;
    outColor = vec4(color, 1.0);
}
`
  },

  VEGETATION: {
    VS: `#version 300 es
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec2 a_uv;
uniform mat4 u_projectionMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_modelMatrix;
uniform sampler2D u_topoMap;
uniform float u_topoScale;
uniform float u_areaHalfX;
uniform float u_areaHalfZ;
uniform float u_urbanDensity;
uniform float u_vegIntensity;
uniform float u_time;
out float v_density;
out float v_vegHeight;

void main() {
    float density = fract(sin(dot(a_uv, vec2(12.9898, 78.233))) * 43758.5453);
    v_density = density;
    vec2 uv = clamp(vec2(
        (a_position.x + u_areaHalfX) / (u_areaHalfX * 2.0),
        (a_position.z + u_areaHalfZ) / (u_areaHalfZ * 2.0)
    ), 0.0, 1.0);
    float terrainH = texture(u_topoMap, uv).r * u_topoScale;
    // Tree height: 3–12 m (300–1200 cm)
    float vegHeight = 300.0 + density * 900.0 * (0.5 + u_vegIntensity * 0.5);
    v_vegHeight = vegHeight;
    // Subtle wind sway: trunk base stays fixed, top sways
    float sway = sin(u_time * 1.4 + a_position.x * 0.0023 + a_position.z * 0.0019) * 18.0 * density;
    vec3 top = vec3(a_position.x + sway, terrainH + vegHeight, a_position.z);
    // Point size: proportional to tree height, visible from far
    vec4 clip = u_projectionMatrix * u_viewMatrix * u_modelMatrix * vec4(top, 1.0);
    // Estimate on-screen size: ~treeDiameter projected. Use fixed world radius 400 cm.
    // gl_PointSize approximation via frustum depth
    gl_PointSize = clamp(vegHeight * 0.018, 10.0, 48.0);
    gl_Position = clip;
}
`,
    FS: `#version 300 es
precision highp float;
in float v_density;
in float v_vegHeight;
uniform float u_vegIntensity;
uniform float u_reveal;
out vec4 outColor;

void main() {
    float threshold = 0.9 - (u_vegIntensity * 0.6);
    if (v_density < threshold) discard;

    vec2 pc = gl_PointCoord; // [0,1] — 0=top-left, y increases downward
    float py = 1.0 - pc.y;  // flip so py=0 is bottom, py=1 is top

    // Trunk: lower 22% of sprite, narrow band
    bool isTrunk = py < 0.22 && abs(pc.x - 0.5) < 0.10;

    // Crown: circular shape centered at upper 60% of sprite
    float crownY = 0.62;
    float crownR = length(vec2(pc.x - 0.5, py - crownY) * vec2(1.0, 0.85));
    bool isCrown = crownR < 0.36;

    if (!isTrunk && !isCrown) discard;

    vec3 color;
    if (isTrunk) {
        // Bark: warm brown, lighter on sun side
        color = mix(vec3(0.30, 0.18, 0.08), vec3(0.48, 0.32, 0.16), pc.x);
    } else {
        // Crown: layered greens with occasional autumn tint
        float t = v_density;
        vec3 dark   = vec3(0.05, 0.18, 0.04);
        vec3 mid    = vec3(0.18, 0.42, 0.10);
        vec3 bright = vec3(0.30, 0.56, 0.16);
        color = mix(dark, mid, t);
        color = mix(color, bright, max(0.0, t - 0.6) * 2.5);
        // Rare autumn orange/yellow
        vec3 autumn = vec3(0.72, 0.46, 0.08);
        color = mix(color, autumn, smoothstep(0.88, 0.96, t) * 0.65);
        // Rim darkening at crown edge
        color = mix(color * 0.55, color, smoothstep(0.30, 0.10, crownR));
        // Top highlight (sky-lit crown tip)
        color = mix(color, color * 1.35, smoothstep(0.20, 0.0, crownR) * (py > 0.70 ? 1.0 : 0.0));
    }

    float alpha = isTrunk ? 0.95 : smoothstep(0.36, 0.20, crownR) * 0.92;
    outColor = vec4(color, alpha * u_reveal);
}
`
  },

  // ── ZONE ─────────────────────────────────────────────────────────────────────
  // Renders natural-area and land-use-zone polygons with type-coded colors.
  // Vertex layout: [worldX, typeId, worldZ]  (typeId stored in the y slot)
  ZONE: {
    VS: `#version 300 es
layout(location=0) in vec3 a_position; // [worldX, typeId, worldZ]
uniform mat4 u_projectionMatrix, u_viewMatrix, u_modelMatrix;
uniform sampler2D u_topoMap;
uniform float u_topoScale, u_topoOffset, u_areaHalfX, u_areaHalfZ;
out float v_typeId;
void main() {
    float wx = a_position.x, wz = a_position.z, tid = a_position.y;
    vec2 uv = clamp(vec2((wx+u_areaHalfX)/(u_areaHalfX*2.0), (wz+u_areaHalfZ)/(u_areaHalfZ*2.0)), 0.0, 1.0);
    float h = texture(u_topoMap, uv).r * u_topoScale + u_topoOffset + 0.4;
    v_typeId = tid;
    gl_Position = u_projectionMatrix * u_viewMatrix * u_modelMatrix * vec4(wx, h, wz, 1.0);
}
`,
    FS: `#version 300 es
precision highp float;
in float v_typeId;
uniform float u_reveal;
// Layer visibility uniforms — 1.0 = visible, 0.0 = hidden
// tid 0-7:  natural areas (u_showNatural)
// tid 8-15: land-use zones (u_showLandUse)
// tid 16-17: pedestrian / parking (u_showPaving)
uniform float u_showNatural;
uniform float u_showLandUse;
uniform float u_showPaving;
out vec4 outColor;
void main() {
    int tid = int(v_typeId + 0.5);
    // Per-layer discard — skip fragments whose layer is toggled off
    if (tid <= 7  && u_showNatural < 0.5) discard;
    if (tid >= 8  && tid <= 15 && u_showLandUse < 0.5) discard;
    if (tid >= 16 && u_showPaving  < 0.5) discard;
    vec3 col;
    if      (tid ==  0) col = vec3(0.55, 0.47, 0.28); // scrub - olive/tan
    else if (tid ==  1) col = vec3(0.55, 0.38, 0.45); // heath - purple-brown
    else if (tid ==  2) col = vec3(0.58, 0.75, 0.28); // grassland - yellow-green
    else if (tid ==  3) col = vec3(0.25, 0.48, 0.48); // wetland - teal
    else if (tid ==  4) col = vec3(0.82, 0.72, 0.52); // sand/beach - sandy
    else if (tid ==  5) col = vec3(0.50, 0.48, 0.44); // bare_rock/cliff - gray
    else if (tid ==  6) col = vec3(0.72, 0.78, 0.48); // farmland/allotments - pale yellow-green
    else if (tid ==  7) col = vec3(0.58, 0.38, 0.62); // vineyard/orchard - purple
    else if (tid ==  8) col = vec3(0.46, 0.52, 0.62); // residential zone - blue-gray
    else if (tid ==  9) col = vec3(0.22, 0.40, 0.68); // commercial zone - blue
    else if (tid == 10) col = vec3(0.30, 0.28, 0.35); // industrial zone - dark gray-purple
    else if (tid == 11) col = vec3(0.72, 0.40, 0.15); // retail - orange
    else if (tid == 12) col = vec3(0.22, 0.36, 0.22); // cemetery - dark green
    else if (tid == 13) col = vec3(0.72, 0.60, 0.10); // construction - yellow
    else if (tid == 14) col = vec3(0.48, 0.20, 0.20); // military - dark red
    else if (tid == 15) col = vec3(0.38, 0.60, 0.35); // leisure/sports - light green
    else if (tid == 16) col = vec3(0.82, 0.80, 0.76); // pedestrian plaza - light stone/concrete
    else if (tid == 17) col = vec3(0.40, 0.38, 0.36); // parking lot - dark asphalt
    else                col = vec3(0.38, 0.60, 0.35); // fallback - light green
    outColor = vec4(col, 0.50 * u_reveal);
}
`
  },

  // ── AMENITY ──────────────────────────────────────────────────────────────────
  // Point-sprite markers for hospitals, schools, fire stations, police, etc.
  // Vertex layout: [worldX, worldZ, typeId]  (worldZ in y slot, typeId in z slot)
  AMENITY: {
    VS: `#version 300 es
layout(location=0) in vec3 a_position; // [worldX, worldZ, typeId]
uniform mat4 u_projectionMatrix, u_viewMatrix, u_modelMatrix;
uniform sampler2D u_topoMap;
uniform float u_topoScale, u_topoOffset, u_areaHalfX, u_areaHalfZ;
out float v_typeId;
void main() {
    float wx = a_position.x, wz = a_position.y, tid = a_position.z;
    vec2 uv = clamp(vec2((wx+u_areaHalfX)/(u_areaHalfX*2.0), (wz+u_areaHalfZ)/(u_areaHalfZ*2.0)), 0.0, 1.0);
    float h = texture(u_topoMap, uv).r * u_topoScale + u_topoOffset + 8.0;
    v_typeId = tid;
    gl_PointSize = 14.0;
    gl_Position = u_projectionMatrix * u_viewMatrix * u_modelMatrix * vec4(wx, h, wz, 1.0);
}
`,
    FS: `#version 300 es
precision highp float;
in float v_typeId;
uniform float u_reveal;
out vec4 outColor;
void main() {
    vec2 pc = gl_PointCoord - 0.5;
    float d = dot(pc, pc);
    if (d > 0.25) discard;
    int tid = int(v_typeId + 0.5);
    vec3 col;
    if      (tid == 0) col = vec3(0.92, 0.12, 0.12); // hospital/clinic - red
    else if (tid == 1) col = vec3(0.95, 0.85, 0.05); // school/university - yellow
    else if (tid == 2) col = vec3(0.90, 0.35, 0.05); // fire_station - orange-red
    else if (tid == 3) col = vec3(0.12, 0.38, 0.88); // police - blue
    else if (tid == 4) col = vec3(0.18, 0.72, 0.88); // shelter - cyan
    else if (tid == 5) col = vec3(0.12, 0.80, 0.30); // pharmacy - green
    else if (tid == 6) col = vec3(0.80, 0.60, 0.20); // post_office - gold
    else if (tid == 7) col = vec3(0.85, 0.85, 0.85); // townhall - white
    else               col = vec3(0.65, 0.65, 0.65); // other - gray
    float edge = smoothstep(0.25, 0.18, d);
    outColor = vec4(col, edge * u_reveal);
}
`
  },

};

// ── TSUNAMI WAVE SHADER ───────────────────────────────────────────────────────
// Renders the advancing tsunami wave front as a displaced 3D mesh with shoaling.
// A dense grid quad (subdivided at geometry level) is displaced in Y by a soliton
// profile. The shoaling factor amplifies wave height as depth decreases (H ∝ d^-0.25).
export const TSUNAMI_WAVE_VS = `#version 300 es
layout(location = 0) in vec2 a_gridPos; // normalised -1..1 in XZ

uniform mat4  u_projectionMatrix;
uniform mat4  u_viewMatrix;
uniform mat4  u_modelMatrix;
uniform sampler2D u_topoMap;
uniform float u_topoScale;
uniform float u_time;
uniform float u_areaHalfX;
uniform float u_areaHalfZ;
// Wave parameters
uniform float u_waveProgress;    // 0-1, how far the front has crossed the city
uniform float u_tsunamiDir;      // direction [rad] wave travels (0=+Z, π/2=+X)
uniform float u_waveHeight;      // peak wave height in cm (scene units)
uniform float u_waveFrontX;      // current wave front X [cm]
uniform float u_waveFrontZ;      // current wave front Z [cm]
uniform float u_waveWidth;       // decay width of wave profile [cm]

out float v_waveProfile;   // 0=flat water, 1=wave crest
out float v_foam;          // foam factor at crest
out float v_alpha;         // transparency

void main() {
    // Map grid to world XZ
    float worldX = a_gridPos.x * u_areaHalfX;
    float worldZ = a_gridPos.y * u_areaHalfZ;

    // UV for terrain height lookup
    vec2 uv = (a_gridPos + 1.0) * 0.5;
    float terrainH = texture(u_topoMap, uv).r * u_topoScale;

    // Signed distance from wave front along wave direction
    vec2 waveNormal = vec2(sin(u_tsunamiDir), cos(u_tsunamiDir));
    float distToFront = (worldX - u_waveFrontX) * waveNormal.x
                      + (worldZ - u_waveFrontZ) * waveNormal.y;

    // Soliton profile: exponential rise ahead of front, sharper drop behind
    float sigma = max(u_waveWidth, 50.0);
    float ahead  = exp(-max(0.0,  distToFront) / sigma);        // smooth rise ahead
    float behind = exp(-max(0.0, -distToFront) / (sigma * 0.4)); // steep drop behind
    float profile = ahead * behind;

    // Shoaling: H ∝ depth^(-0.25). terrain height is elevation above sea floor;
    // approximate depth as inverse of normalised elevation.
    float normElev = clamp(terrainH / max(u_topoScale * 0.12, 1.0), 0.0, 1.0);
    float approxDepth = max(0.05, 1.0 - normElev);  // deeper ocean = high depth
    float shoal = pow(approxDepth, -0.25);           // Green's law exponent
    shoal = clamp(shoal, 1.0, 4.5);                  // cap amplification

    // Wave height: rises above terrain
    float waveY = profile * u_waveHeight * shoal;
    // Only place wave where it clears terrain (don't sink into hills)
    float finalY = max(terrainH + 2.0, terrainH + waveY);

    // Undulating secondary waves trailing behind the front
    float trailDist = -distToFront;
    float trail = max(0.0, (trailDist - sigma * 0.5) / (sigma * 3.0));
    float trailWave = exp(-trail * 0.5) * sin(trailDist * 0.003 + u_time * 1.8) * 0.22;
    finalY += trailWave * u_waveHeight * clamp(trail, 0.0, 1.0);

    v_waveProfile = profile;
    v_foam = smoothstep(0.65, 1.0, profile);
    v_alpha = clamp(profile * 1.8 + trail * 0.5, 0.0, 1.0);

    gl_Position = u_projectionMatrix * u_viewMatrix * u_modelMatrix
                * vec4(worldX, finalY, worldZ, 1.0);
}
`;

export const TSUNAMI_WAVE_FS = `#version 300 es
precision highp float;

in float v_waveProfile;
in float v_foam;
in float v_alpha;

uniform float u_time;
uniform float u_reveal;

out vec4 outColor;

void main() {
    if (v_alpha < 0.02) discard;

    // Deep ocean blue → green-blue shallows → white foam crest
    vec3 deepColor     = vec3(0.04, 0.18, 0.42);
    vec3 shallowColor  = vec3(0.06, 0.42, 0.55);
    vec3 foamColor     = vec3(0.90, 0.95, 1.00);

    vec3 waterColor = mix(deepColor, shallowColor, clamp(v_waveProfile * 2.0, 0.0, 1.0));

    // Foam at crest with time-animated churn
    float foamNoise = fract(sin(u_time * 3.7 + v_foam * 17.3) * 437.58) * 0.5 + 0.5;
    float foamAmt   = v_foam * (0.7 + foamNoise * 0.3);
    waterColor = mix(waterColor, foamColor, foamAmt * 0.90);

    // Translucency: crest is opaque, flanks more transparent
    float alpha = clamp(v_alpha * (0.72 + v_foam * 0.28), 0.0, 1.0) * u_reveal;

    outColor = vec4(waterColor, alpha);
}
`;

// ── GRASS SHADER ─────────────────────────────────────────────────────────────
// Ground-level grass tufts rendered as point sprites with wind animation.
// Reuses the same VBO layout as VEGETATION (vec3 position + vec2 uv).
export const GRASS_VS = `#version 300 es
layout(location=0) in vec3 a_position;
layout(location=1) in vec2 a_uv;
uniform mat4 u_projectionMatrix, u_viewMatrix, u_modelMatrix;
uniform sampler2D u_topoMap;
uniform float u_topoScale, u_areaHalfX, u_areaHalfZ, u_time, u_vegIntensity;
out float v_density;

void main() {
    float dens = fract(sin(dot(a_uv, vec2(43.21, 89.57))) * 71491.3);
    v_density = dens;
    float threshold = 0.72 - u_vegIntensity * 0.35;
    if (dens < threshold) {
        gl_PointSize = 0.0;
        gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
        return;
    }
    vec2 uv = clamp(vec2(
        (a_position.x + u_areaHalfX) / (u_areaHalfX * 2.0),
        (a_position.z + u_areaHalfZ) / (u_areaHalfZ * 2.0)
    ), 0.0, 1.0);
    float h = texture(u_topoMap, uv).r * u_topoScale;
    // Wind sway: grass tips lean with the breeze
    float sway = sin(u_time * 2.2 + a_position.x * 0.005 + a_position.z * 0.004) * 6.0 * dens;
    vec3 pos = vec3(a_position.x + sway, h + 22.0 * dens, a_position.z);
    gl_PointSize = clamp(4.0 + dens * 8.0, 4.0, 14.0);
    gl_Position = u_projectionMatrix * u_viewMatrix * u_modelMatrix * vec4(pos, 1.0);
}`;

export const GRASS_FS = `#version 300 es
precision highp float;
in float v_density;
uniform float u_reveal;
out vec4 outColor;

void main() {
    vec2 pc = gl_PointCoord - vec2(0.5, 0.5);
    // Blade shape: tall narrow oval, wider at base, tapers at tip
    float tipY = gl_PointCoord.y; // 0=top, 1=bottom
    float bladeW = (1.0 - tipY) * 0.22 + 0.04;  // wider at base
    float inBlade = step(abs(pc.x), bladeW);
    if (inBlade < 0.5) discard;

    float t = v_density;
    // Green grass palette: dry ↔ fresh
    vec3 dry   = vec3(0.54, 0.50, 0.18);
    vec3 fresh = vec3(0.18, 0.44, 0.08);
    vec3 color = mix(dry, fresh, t);
    // Brighter tip (sun-lit)
    color = mix(color * 1.4, color, tipY);
    // Slight AO at base
    float baseAO = smoothstep(0.0, 0.4, tipY);
    color *= 0.55 + 0.45 * baseAO;

    float alpha = smoothstep(0.0, 0.06, gl_PointCoord.y) * 0.85;
    if (alpha < 0.04) discard;
    outColor = vec4(color, alpha * u_reveal);
}`;

// Named exports for backward compatibility
export const CITY_TERRAIN_VS    = SHADERS.TERRAIN.VS;
export const CITY_TERRAIN_FS    = SHADERS.TERRAIN.FS;
export const INFRASTRUCTURE_VS  = SHADERS.INFRASTRUCTURE.VS;
export const INFRASTRUCTURE_FS  = SHADERS.INFRASTRUCTURE.FS;
export const VEGETATION_VS      = SHADERS.VEGETATION.VS;
export const VEGETATION_FS      = SHADERS.VEGETATION.FS;
export const WATER_VS           = SHADERS.WATER.VS;
export const WATER_FS           = SHADERS.WATER.FS;
export const PARTICLE_VS        = SHADERS.PARTICLE.VS;
export const PARTICLE_FS        = SHADERS.PARTICLE.FS;
export const HIGHWAY_VS         = SHADERS.HIGHWAY.VS;
export const HIGHWAY_FS         = SHADERS.HIGHWAY.FS;
export const WATERWAY_VS        = SHADERS.WATERWAY.VS;
export const WATERWAY_FS        = SHADERS.WATERWAY.FS;

// Aliases for HydraEngine v4.0.0 layers
export const CITY_VS            = INFRASTRUCTURE_VS;
export const CITY_FS            = INFRASTRUCTURE_FS;
export const PRECIP_VS          = PARTICLE_VS;
export const PRECIP_FS          = PARTICLE_FS;
export const ROAD_VS            = SHADERS.ROAD.VS;
export const ROAD_FS            = SHADERS.ROAD.FS;
export const WATER_AREA_VS      = SHADERS.WATER_AREA.VS;
export const WATER_AREA_FS      = SHADERS.WATER_AREA.FS;
export const CHARACTER_VS       = SHADERS.CHARACTER.VS;
export const CHARACTER_FS       = SHADERS.CHARACTER.FS;
export const ZONE_VS            = SHADERS.ZONE.VS;
export const ZONE_FS            = SHADERS.ZONE.FS;
export const AMENITY_VS         = SHADERS.AMENITY.VS;
export const AMENITY_FS         = SHADERS.AMENITY.FS;

// ── FIRE OVERLAY SHADER ────────────────────────────────────────────────────────
// Renders wildfire spread as a terrain-conforming blended overlay.
// Reuses the terrain VBO layout: [pos3, normal3, uv2] at stride 8*4.
export const FIRE_VS = `#version 300 es
layout(location=0) in vec3 a_position;
layout(location=1) in vec3 a_normal;
layout(location=2) in vec2 a_uv;
uniform mat4 u_projectionMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_modelMatrix;
uniform sampler2D u_topoMap;
uniform float u_topoScale;
uniform float u_topoOffset;
out vec2 v_uv;
out vec3 v_worldPos;
void main() {
  v_uv = a_uv;
  float h = texture(u_topoMap, a_uv).r * u_topoScale + u_topoOffset + 0.4;
  vec3 pos = vec3(a_position.x, h, a_position.z);
  v_worldPos = (u_modelMatrix * vec4(pos, 1.0)).xyz;
  gl_Position = u_projectionMatrix * u_viewMatrix * vec4(v_worldPos, 1.0);
}`;

export const FIRE_FS = `#version 300 es
precision highp float;
in vec2 v_uv;
in vec3 v_worldPos;
out vec4 outColor;
uniform float u_time;
uniform float u_reveal;
uniform vec2  u_fireCenter;
uniform float u_fireRadius;
uniform vec2  u_windDir;
uniform float u_fireIntensity;
uniform float u_areaHalfX;
uniform float u_areaHalfZ;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }
float smoothN(vec2 p) {
  vec2 i=floor(p), f=fract(p);
  f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y);
}
float fbm(vec2 p) {
  float v=0.0, a=0.5;
  for(int i=0;i<4;i++){v+=a*smoothN(p); p=p*2.1+vec2(1.7,9.2); a*=0.5;}
  return v;
}

void main() {
  vec2 wPos  = vec2(v_worldPos.x, v_worldPos.z);
  vec2 delta = wPos - u_fireCenter;

  // Wind-elongated fire front
  vec2 wn     = normalize(u_windDir + vec2(0.001));
  float along = dot(delta, wn);
  float across= length(delta - wn * along);
  float elong  = u_fireRadius * (1.0 + max(0.0, along / u_fireRadius) * 0.6);
  float fireDist = sqrt(along*along / (u_fireRadius*u_fireRadius) + across*across / (elong*elong));

  // Animated turbulent fire boundary
  float noise = fbm(v_uv * 7.0 + u_time * 0.25);
  float animDist = fireDist - noise * 0.28;
  if (animDist > 1.0) discard;

  float flicker = fbm(v_uv * 14.0 - vec2(0.0, u_time * 1.8)) * 0.35 + 0.65;

  vec3  charColor   = vec3(0.04, 0.02, 0.01);
  vec3  scorchColor = vec3(0.18, 0.08, 0.03);
  vec3  fireColor   = vec3(0.96, 0.22, 0.02);
  vec3  flameColor  = vec3(1.00, 0.58, 0.04);
  vec3  hotColor    = vec3(1.00, 0.94, 0.68);
  vec3  smokeColor  = vec3(0.10, 0.08, 0.07);

  vec3  col; float alpha;
  if (animDist < 0.12) {
    col   = mix(charColor, hotColor * flicker, smoothstep(0.0, 0.12, animDist));
    alpha = 0.92;
  } else if (animDist < 0.38) {
    float t = (animDist - 0.12) / 0.26;
    col   = mix(hotColor * flicker, fireColor, t);
    alpha = 0.85 + 0.12 * flicker;
  } else if (animDist < 0.72) {
    float t = (animDist - 0.38) / 0.34;
    col   = mix(fireColor, mix(flameColor, scorchColor, fbm(v_uv*5.0 + u_time*0.4)), t);
    alpha = mix(0.78, 0.30, t) * u_fireIntensity;
  } else {
    float t = (animDist - 0.72) / 0.28;
    col   = mix(scorchColor, smokeColor, t * 0.6);
    alpha = mix(0.28, 0.04, t) * u_fireIntensity;
  }

  outColor = vec4(col, alpha * u_reveal);
}`;

// ── TORNADO FUNNEL CONE SHADER ────────────────────────────────────────────────
// Animated helical funnel: wide at cloud base, narrows to ground-contact tip.
// Mesh: a_uv.x = theta 0-1 (azimuth), a_uv.y = y_norm 0(tip/ground)→1(cloud base).
export const TORNADO_VS = `#version 300 es
layout(location=0) in vec2 a_uv; // [theta_norm 0-1, y_norm 0-1]

uniform mat4  u_projMatrix;
uniform mat4  u_viewMatrix;
uniform float u_time;
uniform float u_funnelBaseRadius; // cm — radius at cloud base (top, y_norm=1)
uniform float u_funnelHeight;     // cm — total funnel height
uniform float u_funnelCenterX;
uniform float u_funnelBaseY;      // cm — Y of cloud base (world)
uniform float u_funnelCenterZ;
uniform float u_windSpeed;        // m/s — slight tilt into wind

out float v_yNorm;
out float v_theta;
out float v_radius;

void main() {
  float yNorm  = a_uv.y;             // 0 = ground tip, 1 = cloud base
  float theta0 = a_uv.x * 6.2832;   // azimuth in radians

  // Funnel radius profile: r = r_base * (1 - yNorm)^0.5 * yNorm^0.12
  // → zero at tip (yNorm=0), max near cloud base
  float r = u_funnelBaseRadius * pow(max(0.0, 1.0 - yNorm), 0.55) * pow(yNorm, 0.08);

  // Helix rotation increases toward cloud base (faster at top)
  float rotRate  = 3.5 + u_windSpeed * 0.04;
  float angle    = theta0 + u_time * rotRate * (1.0 + yNorm * 2.2);

  // World position
  float wx = u_funnelCenterX + cos(angle) * r;
  float wz = u_funnelCenterZ + sin(angle) * r;
  // Y: tip at terrain level, base at cloud base
  float wy = u_funnelBaseY - (1.0 - yNorm) * u_funnelHeight;

  v_yNorm  = yNorm;
  v_theta  = theta0;
  v_radius = r;

  gl_Position = u_projMatrix * u_viewMatrix * vec4(wx, wy, wz, 1.0);
}`;

export const TORNADO_FS = `#version 300 es
precision highp float;
in float v_yNorm;
in float v_theta;
in float v_radius;
out vec4 outColor;
uniform float u_time;
uniform float u_reveal;
uniform float u_intensity;

float hash(float n) { return fract(sin(n) * 43758.5453); }

void main() {
  // Color: dark near tip (dense debris), lighter aloft (condensation funnel)
  vec3 debrisCol   = vec3(0.22, 0.16, 0.10);  // dark earth/debris at tip
  vec3 funnelCol   = vec3(0.42, 0.38, 0.34);  // mid grey funnel body
  vec3 cloudCol    = vec3(0.70, 0.68, 0.66);  // pale grey at cloud base
  vec3 col = v_yNorm < 0.25
    ? mix(debrisCol, funnelCol, v_yNorm / 0.25)
    : mix(funnelCol, cloudCol,  (v_yNorm - 0.25) / 0.75);

  // Turbulent surface variation
  float turb = 0.5 + 0.5 * sin(v_theta * 8.0 + u_time * 4.2 + v_yNorm * 12.0)
                   * sin(v_theta * 3.0 - u_time * 2.8 + v_yNorm * 5.0);
  col = mix(col, col * 0.65, turb * 0.40);

  // Alpha: opaque at tip/core, semi-transparent toward cloud merge
  float alpha = mix(0.88, 0.30, v_yNorm) * u_intensity * u_reveal;
  // Thin the walls at the cloud base merge zone
  alpha *= 1.0 - smoothstep(0.75, 1.0, v_yNorm) * 0.6;

  if (alpha < 0.02) discard;
  outColor = vec4(col, alpha);
}`;

// ── WILDFIRE SMOKE PLUME SHADER ───────────────────────────────────────────────
// Seed-based billboard particles rising from fire zone in a wind-bent plume.
// Each seed: vec3(x_norm 0-1, phase 0-1, z_norm 0-1)  — same layout as precipVBO.
export const SMOKE_VS = `#version 300 es
layout(location=0) in vec3 a_seeds; // [x_norm, phase, z_norm]

uniform mat4  u_projMatrix;
uniform mat4  u_viewMatrix;
uniform float u_time;
uniform float u_reveal;
uniform float u_areaHalfX;
uniform float u_areaHalfZ;
uniform float u_cloudBase;   // max smoke altitude (cm)
uniform float u_windX;       // wind drift X cm/s
uniform float u_windZ;       // wind drift Z cm/s
uniform float u_fireRadius;  // fire zone radius (cm)
uniform float u_fireCenterX;
uniform float u_fireCenterZ;
uniform sampler2D u_topoMap;
uniform float u_topoScale;
uniform float u_topoOffset;

out float v_age;     // 0=just emitted, 1=about to disappear
out float v_size;

void main() {
  float riseSpeed = 280.0;  // cm/s — slow convective rise
  float cycle = fract(a_seeds.y + u_time * riseSpeed / max(u_cloudBase, 1.0));
  v_age = cycle;

  // Horizontal seed: scatter within fire radius around fire center
  float angle = a_seeds.x * 6.2832;
  float r     = sqrt(a_seeds.z) * u_fireRadius; // sqrt for uniform disk distribution
  float wx    = u_fireCenterX + cos(angle) * r;
  float wz    = u_fireCenterZ + sin(angle) * r;

  // Wind drift proportional to height
  float height = cycle * u_cloudBase;
  float dt     = cycle * (u_cloudBase / max(riseSpeed, 0.1));
  wx += u_windX * dt * 0.65;
  wz += u_windZ * dt * 0.65;

  // Terrain-conform emitter base
  vec2 uv = clamp(vec2(
    (wx + u_areaHalfX) / (u_areaHalfX * 2.0),
    (wz + u_areaHalfZ) / (u_areaHalfZ * 2.0)
  ), 0.0, 1.0);
  float terrH = texture(u_topoMap, uv).r * u_topoScale + u_topoOffset;
  float wy = terrH + height;

  gl_Position = u_projMatrix * u_viewMatrix * vec4(wx, wy, wz, 1.0);

  // Puffs grow as they rise: 8px young → 48px old
  v_size = mix(8.0, 48.0, sqrt(cycle));
  gl_PointSize = v_size * u_reveal;
}`;

export const SMOKE_FS = `#version 300 es
precision highp float;
in float v_age;
in float v_size;
out vec4 outColor;
uniform float u_reveal;
uniform float u_intensity; // fire intensity 0-1

void main() {
  vec2 pc = gl_PointCoord - 0.5;
  float d = length(pc);
  if (d > 0.5) discard;

  // Soft circular puff with turbulent edge
  float puff   = smoothstep(0.50, 0.15, d);

  // Color: near-black smoke at birth → warm grey → pale silver as dispersed
  vec3 youngCol = vec3(0.09, 0.07, 0.06);  // dark sooty smoke
  vec3 midCol   = vec3(0.30, 0.27, 0.24);  // mid grey
  vec3 oldCol   = vec3(0.62, 0.60, 0.58);  // pale dispersed haze
  vec3 col = v_age < 0.35
    ? mix(youngCol, midCol, v_age / 0.35)
    : mix(midCol,   oldCol, (v_age - 0.35) / 0.65);

  // Alpha: rises from 0, peaks at ~25% age, fades out by 100%
  float alpha = smoothstep(0.0, 0.12, v_age) * smoothstep(1.0, 0.25, v_age);
  alpha *= puff * u_intensity * u_reveal * 0.62;

  if (alpha < 0.01) discard;
  outColor = vec4(col, alpha);
}`;
