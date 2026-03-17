/**
 * Hydra Core v3.2.1 — Mission-Critical Shader Library
 * Organized for GPU efficiency and tactical data-driven rendering.
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

out vec3 v_normal;
out vec2 v_uv;
out float v_height;

void main() {
  v_uv = a_uv;
  vec4 topoData = texture(u_topoMap, a_uv);
  float height = topoData.r * u_topoScale;
  v_height = height;
  
  vec3 pos = a_position;
  pos.y += height;
  
  v_normal = a_normal;
  gl_Position = u_projectionMatrix * u_viewMatrix * u_modelMatrix * vec4(pos, 1.0);
}
`,
    FS: `#version 300 es
precision highp float;

in vec3 v_normal;
in vec2 v_uv;
in float v_height;

out vec4 outColor;

uniform int u_satelliteMode;
uniform vec3 u_soilColor;

void main() {
  vec3 groundColor = mix(vec3(0.04, 0.06, 0.12), vec3(0.12, 0.18, 0.3), clamp(v_height / 15.0, 0.0, 1.0));
  
  if (u_satelliteMode == 1) {
    vec3 forest = vec3(0.05, 0.1, 0.05);
    vec3 urban = vec3(0.2, 0.22, 0.25);
    groundColor = mix(forest, urban, fract(sin(dot(v_uv, vec2(12.9898, 78.233))) * 43758.5453));
  }

  groundColor = mix(groundColor, u_soilColor, 0.15);

  vec2 streetMod = fract(v_uv * 15.0);
  float street = 0.0;
  if (streetMod.x < 0.08 || streetMod.y < 0.08) street = 0.6;
  
  vec2 subMod = fract(v_uv * 60.0);
  if (subMod.x < 0.05 || subMod.y < 0.05) street = max(street, 0.3);
  
  vec3 finalColor = mix(groundColor, vec3(0.25, 0.28, 0.35), street);
  
  vec2 grid = fract(v_uv * 100.0);
  float gridLine = (smoothstep(0.0, 0.04, grid.x) * smoothstep(1.0, 0.96, grid.x)) * 
                   (smoothstep(0.0, 0.04, grid.y) * smoothstep(1.0, 0.96, grid.y));
  
  finalColor = mix(vec3(0.0, 0.4, 0.8) * 0.3, finalColor, gridLine);
  
  if (street > 0.1) finalColor += vec3(0.0, 0.05, 0.1);

  vec3 lightDir = normalize(vec3(0.5, 0.8, 0.3));
  float diff = max(dot(v_normal, lightDir), 0.3);
  outColor = vec4(finalColor * diff, 1.0);
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

void main() {
    vec2 uv = (a_position.xz + 100.0) / 200.0;
    float height = texture(u_topoMap, uv).r * u_topoScale + 0.2;
    vec4 pos = u_modelMatrix * vec4(a_position.x, height, a_position.z, 1.0);
    gl_Position = u_projectionMatrix * u_viewMatrix * pos;
}
`,
    FS: `#version 300 es
precision highp float;
out vec4 outColor;
void main() {
    outColor = vec4(0.4, 0.45, 0.5, 1.0);
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

void main() {
    vec2 uv = (a_position.xz + 100.0) / 200.0;
    float height = texture(u_topoMap, uv).r * u_topoScale + 0.1;
    vec4 pos = u_modelMatrix * vec4(a_position.x, height, a_position.z, 1.0);
    gl_Position = u_projectionMatrix * u_viewMatrix * pos;
}
`,
    FS: `#version 300 es
precision highp float;
uniform float u_time;
out vec4 outColor;
void main() {
    float shine = 0.5 + 0.5 * sin(u_time * 2.0);
    outColor = vec4(0.0, 0.3, 0.6 + shine * 0.2, 0.9);
}
`
  },

  INFRASTRUCTURE: {
    VS: `#version 300 es
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec2 a_texCoord;

uniform mat4 u_projectionMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_modelMatrix;
uniform sampler2D u_heightMap;
uniform sampler2D u_topoMap;
uniform float u_heightScale;
uniform float u_topoScale;
uniform float u_urbanDensity;

out float v_floorCount;
out float v_isTop;
out vec3 v_worldPos;

void main() {
    vec4 heightData = texture(u_heightMap, a_texCoord);
    vec4 topoData = texture(u_topoMap, a_texCoord);
    v_floorCount = heightData.r * 255.0;

    if (v_floorCount < 0.1) {
       float noise = fract(sin(dot(a_texCoord, vec2(12.9898, 78.233))) * 43758.5453);
       if (noise < u_urbanDensity) {
          v_floorCount = 5.0 + noise * 15.0;
       }
    }

    float baseHeight = topoData.r * u_topoScale;
    float buildHeight = a_position.y > 0.0 ? v_floorCount * u_heightScale : 0.0;
    v_isTop = a_position.y > 0.0 ? 1.0 : 0.0;
    
    vec4 worldPos = u_modelMatrix * vec4(a_position.x, baseHeight + buildHeight, a_position.z, 1.0);
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
uniform int u_aiMode;
out vec4 outColor;

void main() {
    if (v_floorCount < 0.1) discard;
    vec3 baseColor = vec3(0.08, 0.1, 0.14);
    vec3 highlight = mix(vec3(0.0, 0.45, 1.0), vec3(1.0, 0.4, 0.15), clamp(v_floorCount / 30.0, 0.0, 1.0));
    vec3 color = mix(baseColor, highlight, v_isTop * 0.4 + 0.1);

    vec2 windowPattern = fract(vec2(v_worldPos.x + v_worldPos.z, v_worldPos.y) * vec2(4.0, 2.0));
    if (windowPattern.x > 0.4 && windowPattern.x < 0.6 && windowPattern.y > 0.3 && windowPattern.y < 0.7) {
       float noise = fract(sin(dot(floor(v_worldPos.yz * 2.0), vec2(12.9898, 78.233))) * 43758.5453);
       if (noise > 0.7) {
          color += vec3(0.3, 0.4, 0.5) * (0.5 + 0.5 * sin(u_time * 0.5 + noise));
       }
    }

    if (u_aiMode == 1) {
      float scan = sin(v_worldPos.y * 6.0 - u_time * 3.0);
      if (scan > 0.96) color = mix(color, vec3(0.0, 1.0, 1.0), 0.8);
      color += vec3(0.0, 0.04, 0.1) * (1.0 - abs(scan));
    }
    outColor = vec4(color, 0.95);
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

void main() {
    vec4 topoData = texture(u_topoMap, a_uv);
    float terrainHeight = topoData.r * u_topoScale;
    float surfaceHeight = u_waterLevel + sin(a_position.x * 0.2 + u_time) * 0.15;
    float finalHeight = max(surfaceHeight, terrainHeight);
    v_depth = surfaceHeight - terrainHeight;
    vec4 pos = u_modelMatrix * vec4(a_position.x, finalHeight, a_position.z, 1.0);
    gl_Position = u_projectionMatrix * u_viewMatrix * pos;
}
`,
    FS: `#version 300 es
precision highp float;
in float v_depth;
out vec4 outColor;
void main() {
    if (v_depth <= 0.0) discard;
    vec3 shallowColor = vec3(0.0, 0.6, 1.0);
    vec3 deepColor = vec3(0.0, 0.1, 0.3);
    vec3 color = mix(shallowColor, deepColor, clamp(v_depth / 5.0, 0.0, 1.0));
    outColor = vec4(color, 0.7);
}
`
  },

  PARTICLE: {
    VS: `#version 300 es
layout(location = 0) in vec3 a_position;
uniform mat4 u_projectionMatrix;
uniform mat4 u_viewMatrix;
uniform float u_time;
uniform int u_type;
out float v_life;

void main() {
    vec3 pos = a_position;
    if (u_type == 1) {
       float h = pos.y / 20.0;
       float angle = u_time * (8.0 + h * 5.0) + pos.x * 10.0;
       float radius = h * 6.0 + sin(u_time * 2.0) * 0.5;
       pos.x = cos(angle) * radius;
       pos.z = sin(angle) * radius;
       pos.x += sin(u_time * 0.5) * 5.0;
       pos.z += cos(u_time * 0.5) * 5.0;
    } else {
       pos.y = mod(pos.y - u_time * 15.0, 30.0);
    }
    gl_Position = u_projectionMatrix * u_viewMatrix * vec4(pos, 1.0);
    gl_PointSize = u_type == 1 ? 3.5 : 1.5;
    v_life = pos.y / 30.0;
}
`,
    FS: `#version 300 es
precision highp float;
in float v_life;
out vec4 outColor;
void main() {
    outColor = vec4(0.5, 0.8, 1.0, 0.8 * (1.0 - v_life));
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
uniform float u_urbanDensity;
out float v_density;

void main() {
    float density = fract(sin(dot(a_uv, vec2(12.9898, 78.233))) * 43758.5453);
    v_density = density;
    float height = density * 2.5; 
    gl_Position = u_projectionMatrix * u_viewMatrix * u_modelMatrix * vec4(a_position.x, height, a_position.z, 1.0);
}
`,
    FS: `#version 300 es
precision highp float;
in float v_density;
uniform float u_urbanDensity;
out vec4 outColor;
void main() {
    float threshold = 0.8 - (u_urbanDensity * 0.4); 
    if (v_density < threshold) discard;
    vec3 leafColor = mix(vec3(0.05, 0.1, 0.05), vec3(0.1, 0.2, 0.1), v_density);
    outColor = vec4(leafColor, 1.0);
}
`
  }
};

// Legacy exports for backward compatibility
export const CITY_TERRAIN_VS = SHADERS.TERRAIN.VS;
export const CITY_TERRAIN_FS = SHADERS.TERRAIN.FS;
export const INFRASTRUCTURE_VS = SHADERS.INFRASTRUCTURE.VS;
export const INFRASTRUCTURE_FS = SHADERS.INFRASTRUCTURE.FS;
export const VEGETATION_VS = SHADERS.VEGETATION.VS;
export const VEGETATION_FS = SHADERS.VEGETATION.FS;
export const WATER_VS = SHADERS.WATER.VS;
export const WATER_FS = SHADERS.WATER.FS;
export const PARTICLE_VS = SHADERS.PARTICLE.VS;
export const PARTICLE_FS = SHADERS.PARTICLE.FS;
export const HIGHWAY_VS = SHADERS.HIGHWAY.VS;
export const HIGHWAY_FS = SHADERS.HIGHWAY.FS;
export const WATERWAY_VS = SHADERS.WATERWAY.VS;
export const WATERWAY_FS = SHADERS.WATERWAY.FS;
