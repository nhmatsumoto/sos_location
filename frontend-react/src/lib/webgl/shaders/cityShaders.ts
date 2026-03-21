/**
 * Hydra Core v4.0.0 — Real-World City Rendering Shader Library
 * Dual-mode rendering: satellite imagery (real city) + tactical holographic overlay.
 */

export const SHADERS = {
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

in vec3 v_normal;
in vec2 v_uv;
in float v_height;

out vec4 outColor;

uniform int   u_topoMode;
uniform float u_topoScale;
uniform float u_lightIntensity;
uniform vec3  u_soilColor;
uniform float u_reveal;
uniform vec3  u_lightDir;
uniform vec3  u_lightColor;
uniform float u_wetness;
uniform float u_fireScorch;
uniform int   u_earthquakeMod;

// Satellite / map tile texture
uniform sampler2D u_satTex;
uniform int       u_satMode;   // 1 = texture loaded, show map imagery

// Land cover texture (SpectralAnalyzer output, one byte per cell = classId × 32)
// classId: 0=unknown 1=water 2=veg_dense 3=veg_sparse 4=bare_soil 5=urban 6=sand 7=snow
uniform sampler2D u_landCoverTex;
uniform int       u_landCoverMode;  // 1 = texture loaded, blend land cover tint

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
  float ambStr = 0.50;

  // ── Satellite / map tile mode ────────────────────────────────────────────
  if (u_satMode == 1) {
    vec3 sat = texture(u_satTex, vec2(v_uv.x, v_uv.y)).rgb;
    // Boost gamma slightly — tiles are web-sRGB, WebGL linear
    sat = pow(clamp(sat, 0.0, 1.0), vec3(0.9));
    // Optionally blend land cover tint over satellite for class visibility
    if (u_landCoverMode == 1) {
      float enc  = texture(u_landCoverTex, v_uv).r;
      vec3  tint = landCoverTint(enc);
      if (tint.r >= 0.0) sat = mix(sat, tint, 0.18); // subtle 18% tint
    }
    // Diffuse + strong ambient so the image is always legible
    vec3 lit = sat * (ambStr + diff * 0.65 * u_lightIntensity * u_lightColor);
    lit = clamp(lit, 0.0, 1.0);
    outColor = vec4(lit, u_reveal);
    return;
  }

  // ── Procedural elevation palette ─────────────────────────────────────────
  float normH   = clamp(v_height / max(u_topoScale, 1.0), 0.0, 1.0);
  float flatness = clamp(N.y, 0.0, 1.0);

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

  // Hemisphere ambient (sky + ground bounce)
  vec3 skyAmb  = vec3(0.42, 0.52, 0.68) * ambStr;
  vec3 gndAmb  = u_soilColor * 0.20;
  vec3 ambient = mix(gndAmb, skyAmb, N.y * 0.5 + 0.5);

  vec3 diffuse = terrainColor * diff * u_lightColor * u_lightIntensity;
  vec3 V = vec3(0.0, 1.0, 0.0);
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 32.0) * flatness * 0.08;
  float micro = fract(sin(dot(floor(v_uv * 256.0), vec2(127.1, 311.7))) * 43758.5) * 0.03 - 0.015;

  if (u_wetness > 0.01) {
    float wet = u_wetness * 0.72;
    terrainColor = mix(terrainColor, terrainColor * vec3(0.50, 0.52, 0.55), wet);
    spec += wet * 0.18;
  }

  if (u_earthquakeMod > 0) {
    vec2 cp = v_uv * 36.0;
    vec2 ci = floor(cp); vec2 cf = fract(cp);
    float md = 1.0;
    for (int dy=-1; dy<=1; dy++) for (int dx=-1; dx<=1; dx++) {
      vec2 nb = vec2(float(dx), float(dy));
      vec2 seed = ci + nb;
      vec2 rp = vec2(fract(sin(dot(seed, vec2(127.1,311.7)))*43758.5),
                     fract(sin(dot(seed, vec2(269.5,183.3)))*17371.3));
      md = min(md, length(cf - nb - rp));
    }
    float crack = 1.0 - smoothstep(0.0, 0.09, md);
    terrainColor = mix(terrainColor, vec3(0.01,0.01,0.01), crack * 0.88);
  }

  if (u_fireScorch > 0.01) {
    terrainColor = mix(terrainColor, vec3(0.04,0.02,0.01), u_fireScorch * 0.80);
  }

  vec3 finalColor = terrainColor * ambient + diffuse + spec + micro;
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
uniform float u_reveal;
uniform int u_realisticMode;
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

void main() {
    vec2 uv = clamp(vec2(
        (a_position.x + u_areaHalfX) / (u_areaHalfX * 2.0),
        (a_position.z + u_areaHalfZ) / (u_areaHalfZ * 2.0)
    ), 0.0, 1.0);
    float height = texture(u_topoMap, uv).r * u_topoScale + 0.2;
    vec4 pos = u_modelMatrix * vec4(a_position.x, height, a_position.z, 1.0);
    gl_Position = u_projectionMatrix * u_viewMatrix * pos;
}
`,
    FS: `#version 300 es
precision highp float;
uniform float u_time;
uniform float u_reveal;
out vec4 outColor;
void main() {
    float shine = 0.5 + 0.5 * sin(u_time * 2.0);
    outColor = vec4(0.05, 0.25, 0.55 + shine * 0.15, 0.88 * u_reveal);
}
`
  },

  INFRASTRUCTURE: {
    VS: `#version 300 es
layout(location = 0) in vec3 a_position; // x, z_coord, h_offset
layout(location = 1) in vec4 a_meta;     // is_top, levels, centroidU, centroidV

uniform mat4 u_projectionMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_modelMatrix;
uniform sampler2D u_topoMap;
uniform float u_topoScale;
uniform float u_areaHalfX; // half of world span in X (meters)
uniform float u_areaHalfZ; // half of world span in Z (meters)

out float v_floorCount;
out float v_isTop;
out vec3 v_worldPos;

void main() {
    float x = a_position.x;
    float z = a_position.y; // z stored in .y channel of a_position
    float hOffset = a_position.z;
    v_isTop = a_meta.x;
    v_floorCount = a_meta.y;

    // Use precomputed centroid UV: all corners of a building sample terrain at the same
    // point, giving a flat base even on sloped terrain (inclined buildings on hillsides).
    vec2 uv = clamp(a_meta.zw, 0.0, 1.0);
    float baseHeight = texture(u_topoMap, uv).r * u_topoScale;

    vec4 worldPos = u_modelMatrix * vec4(x, baseHeight + hOffset, z, 1.0);
    v_worldPos = worldPos.xyz;
    gl_Position = u_projectionMatrix * u_viewMatrix * worldPos;
}
`,
    FS: `#version 300 es
precision highp float;
in float v_floorCount;
in float v_isTop;
in vec3 v_worldPos;
uniform float u_time;
uniform float u_reveal;
uniform int u_aiMode;
uniform int u_realisticMode;
uniform int u_buildingType; // 0=residential, 1=commercial, 2=industrial
uniform vec3 u_lightDir;
uniform vec3 u_lightColor;
uniform float u_lightIntensity;
// Selection highlight: vec4(minX, minZ, maxX, maxZ) — sentinel (1e9,1e9,-1e9,-1e9) = none
uniform vec4 u_highlightAABB;

out vec4 outColor;

void main() {
    if (v_floorCount < 0.1) discard;

    vec3 normal = normalize(cross(dFdx(v_worldPos), dFdy(v_worldPos)));
    vec3 L = normalize(u_lightDir);

    // === REALISTIC MODE: Type-differentiated building appearance ===
    if (u_realisticMode == 1) {
        float floorBand = fract(v_worldPos.y * 0.003);
        float vertPane  = fract(v_worldPos.x * 0.0055 + v_worldPos.z * 0.0055);
        float isWindow  = step(0.12, floorBand) * step(floorBand, 0.84)
                        * step(0.18, vertPane)  * step(vertPane, 0.82);
        vec3 wallColor;

        if (u_buildingType == 1) {
            // Commercial / office: blue-steel, tall windows (65% glass ratio)
            wallColor = v_isTop > 0.5
                ? vec3(0.35, 0.35, 0.38)
                : vec3(0.45, 0.52, 0.60);
            float windowH = step(0.08, floorBand) * step(floorBand, 0.90)
                          * step(0.10, vertPane)  * step(vertPane, 0.90);
            wallColor = mix(wallColor, vec3(0.55, 0.68, 0.84), windowH * 0.65 * (1.0 - v_isTop));
        } else if (u_buildingType == 2) {
            // Industrial / warehouse: corrugated gray, horizontal ribbing
            wallColor = v_isTop > 0.5
                ? vec3(0.30, 0.30, 0.30)
                : vec3(0.44, 0.44, 0.42);
            float rib = step(0.5, fract(v_worldPos.y * 0.015));
            wallColor = mix(wallColor, wallColor * 0.78, rib * (1.0 - v_isTop) * 0.45);
        } else {
            // Residential: warm brick/beige, standard windows
            wallColor = v_isTop > 0.5
                ? vec3(0.48, 0.44, 0.40)
                : vec3(0.76, 0.65, 0.54);
            wallColor = mix(wallColor, vec3(0.38, 0.50, 0.68), isWindow * 0.28 * (1.0 - v_isTop));
        }

        float diff = max(dot(normal, L), 0.25);
        float fog  = smoothstep(15000.0, 50000.0, length(v_worldPos));
        vec3 color = wallColor * diff * u_lightColor * u_lightIntensity;
        color = mix(color, vec3(0.04, 0.06, 0.10), fog);

        // Selection highlight
        bool inAABB = v_worldPos.x >= u_highlightAABB.x && v_worldPos.x <= u_highlightAABB.z
                   && v_worldPos.z >= u_highlightAABB.y && v_worldPos.z <= u_highlightAABB.w;
        if (inAABB) {
            float pulse = 0.55 + 0.45 * sin(u_time * 4.0);
            color = mix(color, vec3(0.0, 0.85, 1.0), pulse * 0.45);
            // Edge glow on roof
            if (v_isTop > 0.5) color = mix(color, vec3(0.0, 1.0, 0.9), 0.6);
        }

        outColor = vec4(color, u_reveal);
        return;
    }

    // === TACTICAL / HOLOGRAPHIC MODE ===
    vec3 baseColor = vec3(0.02, 0.08, 0.15);
    vec3 edgeColor = vec3(0.0, 0.95, 1.0);

    float pulse = sin(v_worldPos.y * 0.015 - u_time * 3.0) * 0.5 + 0.5;
    pulse = pow(pulse, 8.0);

    float distToEdge = min(
        min(fract(v_worldPos.x * 0.01), fract(1.0 - v_worldPos.x * 0.01)),
        min(fract(v_worldPos.z * 0.01), fract(1.0 - v_worldPos.z * 0.01))
    );
    float edgeGlow = smoothstep(0.1, 0.0, distToEdge) * 0.8;

    vec3 color = mix(baseColor, edgeColor, edgeGlow + pulse * 0.4);
    if (v_isTop > 0.5) color += edgeColor * 0.3;

    float fog = smoothstep(15000.0, 60000.0, length(v_worldPos));
    color = mix(color, vec3(0.01, 0.02, 0.05), fog);

    float diff = max(dot(normal, L), 0.4);
    color *= (diff * u_lightIntensity + 0.5);

    if (u_aiMode == 1) {
        float aiScan = sin(v_worldPos.y * 0.10 + u_time * 5.0);
        if (aiScan > 0.95) color = mix(color, vec3(1.0, 1.0, 0.0), 0.8);
    }

    // Selection highlight (tactical mode)
    bool inAABBt = v_worldPos.x >= u_highlightAABB.x && v_worldPos.x <= u_highlightAABB.z
                && v_worldPos.z >= u_highlightAABB.y && v_worldPos.z <= u_highlightAABB.w;
    if (inAABBt) {
        float pulse = 0.55 + 0.45 * sin(u_time * 4.0);
        color = mix(color, vec3(1.0, 1.0, 0.0), pulse * 0.6);
    }

    outColor = vec4(color, 0.75 * u_reveal);
}
`
  },

  WATER: {
    VS: `#version 300 es
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec2 a_uv;
uniform mat4 u_projectionMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_modelMatrix;
uniform sampler2D u_topoMap;
uniform float u_waterLevel;
uniform float u_topoScale;
uniform float u_time;
out float v_depth;
out vec2 v_uv;
out vec3 v_worldPos;
out vec3 v_normal;

void main() {
    v_uv = a_uv;
    vec4 topoData = texture(u_topoMap, a_uv);
    float terrainHeight = topoData.r * u_topoScale;

    float wave1 = sin(a_position.x * 0.4 + u_time * 1.5) * 0.12;
    float wave2 = cos(a_position.z * 0.3 + u_time * 1.2) * 0.08;
    float surfaceHeight = u_waterLevel + wave1 + wave2;

    v_normal = vec3(wave1, 1.0, wave2);
    float finalHeight = max(surfaceHeight, terrainHeight);
    v_depth = surfaceHeight - terrainHeight;
    vec4 pos = u_modelMatrix * vec4(a_position.x, finalHeight, a_position.z, 1.0);
    v_worldPos = pos.xyz;
    gl_Position = u_projectionMatrix * u_viewMatrix * pos;
}
`,
    FS: `#version 300 es
precision highp float;
in float v_depth;
in vec2 v_uv;
in vec3 v_worldPos;
in vec3 v_normal;
uniform float u_time;
uniform float u_reveal;
uniform vec3 u_lightDir;
uniform vec3 u_lightColor;
out vec4 outColor;

void main() {
    if (v_depth <= 0.01) discard;

    vec3 shallowColor = vec3(0.05, 0.40, 0.65);
    vec3 deepColor    = vec3(0.02, 0.08, 0.18);
    vec3 color = mix(shallowColor, deepColor, clamp(v_depth / 8.0, 0.0, 1.0));

    // Tactical water grid
    vec2 waterGrid = fract(v_uv * 120.0);
    float gridLine = smoothstep(0.0, 0.05, waterGrid.x) * smoothstep(1.0, 0.95, waterGrid.x) *
                     smoothstep(0.0, 0.05, waterGrid.y) * smoothstep(1.0, 0.95, waterGrid.y);
    color = mix(vec3(0.0, 0.9, 1.0) * 0.6, color, gridLine);

    vec3 normal = normalize(v_normal);
    vec3 L = normalize(u_lightDir);
    float diff = max(dot(normal, L), 0.4);

    vec2 waveUV = v_uv * 40.0 + u_time * 0.4;
    float spec = pow(max(0.0, dot(reflect(-L, normal), vec3(0.0, 1.0, 0.0))), 64.0);

    color = (color * diff * u_lightColor) + (vec3(0.5, 0.8, 1.0) * spec * 0.5);

    float fog = smoothstep(150.0, 600.0, length(v_worldPos));
    color = mix(color, vec3(0.01, 0.02, 0.05), fog);

    float foam = smoothstep(0.4, 0.0, v_depth);
    color = mix(color, vec3(0.8, 0.9, 1.0), foam * 0.3 * (0.8 + 0.2 * sin(u_time * 4.0)));

    outColor = vec4(color, 0.75 * u_reveal);
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
void main() {
    float wave = sin(v_worldPos.x * 0.00012 + u_time * 2.0) * 0.04 + cos(v_worldPos.z * 0.00010 + u_time * 1.5) * 0.03;
    vec3 color = mix(vec3(0.16, 0.46, 0.72), vec3(0.05, 0.18, 0.42), 0.5) + wave;
    vec3 N = normalize(vec3(wave * 8.0, 1.0, wave * 6.0));
    float diff = max(dot(N, normalize(u_lightDir)), 0.45) * u_lightIntensity;
    float spec = pow(max(dot(reflect(-normalize(u_lightDir), N), vec3(0,0,-1)), 0.0), 64.0) * 0.3;
    color = color * diff * u_lightColor + spec;
    outColor = vec4(color, 0.90 * u_reveal);
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
out float v_density;

void main() {
    float density = fract(sin(dot(a_uv, vec2(12.9898, 78.233))) * 43758.5453);
    v_density = density;
    // Sample terrain height so vegetation sits on the actual terrain surface
    vec2 uv = clamp(vec2(
        (a_position.x + u_areaHalfX) / (u_areaHalfX * 2.0),
        (a_position.z + u_areaHalfZ) / (u_areaHalfZ * 2.0)
    ), 0.0, 1.0);
    float terrainH = texture(u_topoMap, uv).r * u_topoScale;
    float vegHeight = density * (2.0 + u_vegIntensity * 3.0);
    gl_Position = u_projectionMatrix * u_viewMatrix * u_modelMatrix * vec4(a_position.x, terrainH + vegHeight, a_position.z, 1.0);
}
`,
    FS: `#version 300 es
precision highp float;
in float v_density;
uniform float u_vegIntensity;
uniform float u_reveal;
out vec4 outColor;
void main() {
    float threshold = 0.9 - (u_vegIntensity * 0.6);
    if (v_density < threshold) discard;
    vec3 forestColor = vec3(0.06, 0.18, 0.06);
    vec3 lightLeaf   = vec3(0.18, 0.42, 0.12);
    vec3 leafColor = mix(forestColor, lightLeaf, v_density);
    outColor = vec4(leafColor, 0.9 * u_reveal);
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
out vec4 outColor;
void main() {
    int tid = int(v_typeId + 0.5);
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
