/**
 * Semantic Rendering Shaders
 *
 * Renders the semantic classification grid as a color-coded 3D scene.
 * No texture mapping — each cell is a solid color determined by its semantic class.
 *
 * Vertex layout (8 floats per vertex):
 *   [x, y, z, semanticClass, intensity, u, v, isFace]
 *
 *   isFace = 0 → terrain quad: y=0, displaced by topo texture in VS
 *   isFace = 1 → building/bridge face: y is already in world units, no topo displacement
 */

export const SEMANTIC_VS = /* glsl */ `#version 300 es
precision mediump float;

in vec3  a_position;
in float a_semanticClass;
in float a_intensity;
in vec2  a_uv;
in float a_isFace;

uniform mat4 u_projectionMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_modelMatrix;

uniform sampler2D u_topoMap;
uniform float     u_topoScale;
uniform float     u_topoOffset;
uniform float     u_texelOffset;

out vec3  v_worldPos;
out float v_semanticClass;
out float v_intensity;
out vec3  v_normal;

void main() {
  vec3 pos = a_position;

  if (a_isFace < 0.5) {
    // ── Terrain cell: displace Y by elevation from topo texture ───────────────
    float h  = texture(u_topoMap, a_uv).r * u_topoScale + u_topoOffset;
    pos.y   += h;

    // Compute surface normal from neighbouring texel heights
    float o  = u_texelOffset;
    float hL = texture(u_topoMap, a_uv + vec2(-o,  0.0)).r * u_topoScale;
    float hR = texture(u_topoMap, a_uv + vec2( o,  0.0)).r * u_topoScale;
    float hD = texture(u_topoMap, a_uv + vec2( 0.0,-o)).r  * u_topoScale;
    float hU = texture(u_topoMap, a_uv + vec2( 0.0, o)).r  * u_topoScale;
    v_normal = normalize(vec3(hL - hR, 2.0, hD - hU));

  } else {
    // ── Building / bridge face: normal computed from geometry (approximate) ───
    // Use upward normal for roofs; side walls get lit by diffuse angle
    float isRoof = step(0.9, a_uv.y); // uv.y==1 marks rooftop in buildGeometry
    v_normal = mix(vec3(0.0, 0.0, 1.0), vec3(0.0, 1.0, 0.0), isRoof);
  }

  v_worldPos       = pos;
  v_semanticClass  = a_semanticClass;
  v_intensity      = a_intensity;

  gl_Position = u_projectionMatrix * u_viewMatrix * u_modelMatrix * vec4(pos, 1.0);
}
`;

export const SEMANTIC_FS = /* glsl */ `#version 300 es
precision mediump float;

in vec3  v_worldPos;
in float v_semanticClass;
in float v_intensity;
in vec3  v_normal;

uniform float u_time;
uniform float u_reveal;
uniform vec3  u_lightDir;
uniform vec3  u_lightColor;
uniform float u_lightIntensity;

out vec4 outColor;

// ── Per-class base colors (min/max intensity lerp) ───────────────────────────
vec3 semanticColor(int cls, float t) {
  if (cls == 1) // VEGETATION: dark → bright green
    return mix(vec3(0.04, 0.28, 0.04), vec3(0.18, 0.72, 0.12), t);
  if (cls == 2) // WATER: deep → shallow blue
    return mix(vec3(0.02, 0.08, 0.48), vec3(0.06, 0.38, 0.90), t);
  if (cls == 3) // ROAD: asphalt gray
    return vec3(0.36 + t * 0.08, 0.36 + t * 0.08, 0.38 + t * 0.06);
  if (cls == 4) // BUILDING_LOW: dark charcoal
    return mix(vec3(0.10, 0.10, 0.10), vec3(0.24, 0.22, 0.20), t);
  if (cls == 5) // BUILDING_HIGH: purple
    return mix(vec3(0.28, 0.04, 0.46), vec3(0.64, 0.18, 0.92), t);
  if (cls == 6) // BRIDGE: warm amber
    return vec3(0.82, 0.55 + t * 0.1, 0.06);
  if (cls == 7) // BARE_GROUND: tan to light brown
    return mix(vec3(0.42, 0.32, 0.18), vec3(0.72, 0.58, 0.38), t);
  if (cls == 8) // SLUM: brick red-orange
    return mix(vec3(0.52, 0.16, 0.04), vec3(0.78, 0.28, 0.10), t);
  if (cls == 9) // SPORTS: lime green
    return mix(vec3(0.16, 0.62, 0.10), vec3(0.34, 0.92, 0.22), t);
  return vec3(0.10, 0.10, 0.10); // UNKNOWN
}

void main() {
  int   cls  = int(v_semanticClass + 0.5);
  float t    = clamp(v_intensity, 0.0, 1.0);
  vec3  base = semanticColor(cls, t);

  vec3  N    = normalize(v_normal);
  vec3  L    = normalize(u_lightDir);
  float diff = max(dot(N, L), 0.20) * u_lightIntensity;

  // Water: subtle animated shimmer
  if (cls == 2) {
    float wave = sin(v_worldPos.x * 0.28 + u_time * 1.4) * 0.05
               + cos(v_worldPos.z * 0.22 + u_time * 1.0) * 0.04;
    base += vec3(wave * 0.25, wave * 0.45, wave * 0.90);
  }

  // Vegetation: slight wind sway modulation on intensity
  if (cls == 1) {
    float sway = sin(v_worldPos.x * 0.15 + u_time * 0.6 + v_worldPos.z * 0.12) * 0.04;
    base = semanticColor(cls, clamp(t + sway, 0.0, 1.0));
  }

  outColor = vec4(base * diff * u_lightColor, u_reveal * 0.94);
}
`;
