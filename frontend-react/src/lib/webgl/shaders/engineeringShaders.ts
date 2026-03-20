/**
 * Engineering overlay shaders for civil/urban analysis.
 * Two shader programs:
 *   SLOPE_OVERLAY — slope risk analysis (Horn algorithm DEM → 4-band color map)
 *   DENSITY_OVERLAY — population density heatmap
 * Both use a terrain-conforming quad that displaces Y via the topo texture.
 */

// ─── Shared terrain-conforming vertex shader ─────────────────────────────────
const ENGINEERING_VS = `#version 300 es
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;
layout(location = 2) in vec2 a_uv;

uniform mat4 u_projectionMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_modelMatrix;
uniform sampler2D u_topoMap;
uniform float u_topoScale;

out vec2 v_uv;
out float v_height;

void main() {
  v_uv = a_uv;
  float height = texture(u_topoMap, a_uv).r * u_topoScale;
  v_height = height;
  vec3 pos = a_position;
  pos.y += height;
  gl_Position = u_projectionMatrix * u_viewMatrix * u_modelMatrix * vec4(pos, 1.0);
}
`;

// ─── SLOPE_OVERLAY fragment shader ───────────────────────────────────────────
/**
 * Reads a slope texture (R channel = slope_degrees / 90, packed as 0-1).
 * Renders a 4-band risk color map used in civil engineering slope analysis:
 *   < 15°  →  green  (stable, buildable)
 *   15-30° →  yellow (caution, limited construction)
 *   30-45° →  orange-red (critical, landslide prone)
 *   > 45°  →  dark red (very critical, no construction)
 * Blended over terrain with u_opacity.
 */
const SLOPE_FS = `#version 300 es
precision mediump float;

in vec2 v_uv;
in float v_height;

uniform sampler2D u_slopeMap;
uniform float u_opacity;

out vec4 outColor;

void main() {
  float slopeDeg = texture(u_slopeMap, v_uv).r * 90.0;

  vec3 color;
  if (slopeDeg < 15.0) {
    // Stable — green gradient
    color = mix(vec3(0.10, 0.72, 0.20), vec3(0.85, 0.80, 0.10), slopeDeg / 15.0);
  } else if (slopeDeg < 30.0) {
    // Caution — yellow to orange
    color = mix(vec3(0.85, 0.80, 0.10), vec3(0.95, 0.40, 0.05), (slopeDeg - 15.0) / 15.0);
  } else if (slopeDeg < 45.0) {
    // Critical — orange to red
    color = mix(vec3(0.95, 0.40, 0.05), vec3(0.80, 0.05, 0.05), (slopeDeg - 30.0) / 15.0);
  } else {
    // Very critical
    color = vec3(0.72, 0.00, 0.18);
  }

  outColor = vec4(color, u_opacity * 0.80);
}
`;

// ─── DENSITY_OVERLAY fragment shader ─────────────────────────────────────────
/**
 * Reads a population density texture (R channel = normalized density 0-1, log scale).
 * Renders a heat map: low → transparent blue → cyan → yellow → high → red.
 */
const DENSITY_FS = `#version 300 es
precision mediump float;

in vec2 v_uv;
in float v_height;

uniform sampler2D u_densityMap;
uniform float u_opacity;

out vec4 outColor;

void main() {
  float d = texture(u_densityMap, v_uv).r;
  if (d < 0.02) discard; // hide empty areas

  vec3 color;
  if (d < 0.25) {
    color = mix(vec3(0.02, 0.10, 0.45), vec3(0.02, 0.65, 0.85), d / 0.25);
  } else if (d < 0.50) {
    color = mix(vec3(0.02, 0.65, 0.85), vec3(0.18, 0.85, 0.25), (d - 0.25) / 0.25);
  } else if (d < 0.75) {
    color = mix(vec3(0.18, 0.85, 0.25), vec3(0.95, 0.85, 0.05), (d - 0.50) / 0.25);
  } else {
    color = mix(vec3(0.95, 0.85, 0.05), vec3(0.90, 0.10, 0.05), (d - 0.75) / 0.25);
  }

  outColor = vec4(color, d * u_opacity * 0.85);
}
`;

export const ENGINEERING_SHADERS = {
  SLOPE: {
    VS: ENGINEERING_VS,
    FS: SLOPE_FS,
  },
  DENSITY: {
    VS: ENGINEERING_VS,
    FS: DENSITY_FS,
  },
};
