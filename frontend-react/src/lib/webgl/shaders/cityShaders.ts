/**
 * City-Scale Guardian Shaders v2.0.0
 * Core GLSL for the pure WebGL GIS engine.
 */

export const CITY_TERRAIN_VS = `#version 300 es
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;
layout(location = 2) in vec2 a_uv;

uniform mat4 u_projectionMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_modelMatrix;

out vec3 v_normal;
out vec2 v_uv;
out float v_height;

void main() {
  v_normal = a_normal;
  v_uv = a_uv;
  v_height = a_position.y;
  gl_Position = u_projectionMatrix * u_viewMatrix * u_modelMatrix * vec4(a_position, 1.0);
}
`;

export const CITY_TERRAIN_FS = `#version 300 es
precision highp float;

in vec3 v_normal;
in vec2 v_uv;
in float v_height;

out vec4 outColor;

void main() {
  vec3 groundColor = mix(vec3(0.06, 0.09, 0.16), vec3(0.1, 0.15, 0.25), clamp(v_height / 10.0, 0.0, 1.0));
  
  // Subtle tactical grid
  vec2 grid = fract(v_uv * 50.0);
  float gridLine = (smoothstep(0.0, 0.02, grid.x) * smoothstep(1.0, 0.98, grid.x)) * 
                   (smoothstep(0.0, 0.02, grid.y) * smoothstep(1.0, 0.98, grid.y));
  
  vec3 finalColor = mix(vec3(0.2, 0.4, 0.8) * 0.3, groundColor, gridLine);
  
  // Lighting
  vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
  float diff = max(dot(v_normal, lightDir), 0.2);
  
  outColor = vec4(finalColor * diff, 1.0);
}
`;

export const INFRASTRUCTURE_VS = `#version 300 es
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec2 a_texCoord; // Map UV

uniform mat4 u_projectionMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_modelMatrix;
uniform sampler2D u_heightMap;
uniform float u_heightScale;

out float v_floorCount;
out float v_isTop;

void main() {
    vec4 heightData = texture(u_heightMap, a_texCoord);
    v_floorCount = heightData.r * 255.0; // Intensity to Floors
    
    float height = a_position.y > 0.0 ? v_floorCount * u_heightScale : 0.0;
    v_isTop = a_position.y > 0.0 ? 1.0 : 0.0;
    
    gl_Position = u_projectionMatrix * u_viewMatrix * u_modelMatrix * vec4(a_position.x, height, a_position.z, 1.0);
}
`;

export const INFRASTRUCTURE_FS = `#version 300 es
precision highp float;

in float v_floorCount;
in float v_isTop;
out vec4 outColor;

void main() {
    if (v_floorCount < 0.1) discard;
    
    vec3 baseColor = vec3(0.05, 0.1, 0.2);
    vec3 highlight = mix(vec3(0.2, 0.5, 1.0), vec3(1.0, 0.4, 0.2), clamp(v_floorCount / 20.0, 0.0, 1.0));
    
    vec3 color = mix(baseColor, highlight, v_isTop * 0.4 + 0.2);
    outColor = vec4(color, 0.8);
}
`;

export const VEGETATION_VS = `#version 300 es
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec2 a_uv;

uniform mat4 u_projectionMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_modelMatrix;

out float v_density;

void main() {
    float density = fract(sin(dot(a_uv, vec2(12.9898, 78.233))) * 43758.5453);
    v_density = density;
    
    // Simple vertical displacement to simulate canopy height
    float height = density * 2.5; 
    gl_Position = u_projectionMatrix * u_viewMatrix * u_modelMatrix * vec4(a_position.x, height, a_position.z, 1.0);
}
`;

export const VEGETATION_FS = `#version 300 es
precision highp float;

in float v_density;
out vec4 outColor;

void main() {
    if (v_density < 0.6) discard; // Sparse vegetation
    vec3 leafColor = mix(vec3(0.05, 0.15, 0.05), vec3(0.1, 0.3, 0.1), v_density);
    outColor = vec4(leafColor, 0.9);
}
`;
