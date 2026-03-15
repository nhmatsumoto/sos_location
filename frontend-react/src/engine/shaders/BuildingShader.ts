import * as THREE from 'three';

export const BuildingShader = {
  uniforms: {
    uTime: { value: 0 },
    uBaseColor: { value: new THREE.Color("#0f172a") },
    uLineColor: { value: new THREE.Color("#3b82f6") },
    uGlowColor: { value: new THREE.Color("#60a5fa") },
    uOpacity: { value: 0.7 }
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec2 vUv;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uBaseColor;
    uniform vec3 uLineColor;
    uniform vec3 uGlowColor;
    uniform float uOpacity;

    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec2 vUv;

    void main() {
      // Fresnel effect for tactical outlines
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 2.5);
      
      // Dynamic scanline effect
      float scanline = sin(vWorldPosition.y * 10.0 - uTime * 2.0) * 0.5 + 0.5;
      scanline = pow(scanline, 10.0) * 0.2;

      // Grid effect on top faces
      float grid = 0.0;
      if (vNormal.y > 0.8) {
        vec2 gUv = vWorldPosition.xz * 2.0;
        grid = (smoothstep(0.0, 0.05, fract(gUv.x)) + smoothstep(0.0, 0.05, fract(gUv.y))) * 0.1;
      }

      vec3 color = mix(uBaseColor, uLineColor, fresnel);
      color += uGlowColor * (scanline + grid);

      // Add a subtle top-lighting
      float topLight = max(vNormal.y, 0.0) * 0.2;
      color += uGlowColor * topLight;

      gl_FragColor = vec4(color, uOpacity);
    }
  `
};
