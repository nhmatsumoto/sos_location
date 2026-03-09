import * as THREE from 'three';

export const TerrainShader = {
    uniforms: {
        uHeightMap: { value: null },
        uPrevHeightMap: { value: null },
        uBlendFactor: { value: 1.0 }, // 0.0: prev, 1.0: current
        uSatelliteMap: { value: null },
        uIndicesMap: { value: null },
        uDisplacementScale: { value: 100.0 },
        uShowSatellite: { value: 1.0 },
        uShowRelief: { value: 1.0 },
        uShowStreets: { value: 0.0 },
        uShowVegetation: { value: 0.0 },
        uIndicesType: { value: 0.0 }, 
        uBaseColor: { value: new THREE.Color("#1e293b") },
        uSunDirection: { value: new THREE.Vector3(1, 1, 1).normalize() }
    },
    vertexShader: `
        varying vec2 vUv;
        varying float vHeight;
        varying vec3 vNormal;
        
        uniform sampler2D uHeightMap;
        uniform sampler2D uPrevHeightMap;
        uniform float uBlendFactor;
        uniform float uDisplacementScale;

        void main() {
            vUv = uv;
            
            float h1 = texture2D(uHeightMap, uv).r;
            float h0 = texture2D(uPrevHeightMap, uv).r;
            float h = mix(h0, h1, uBlendFactor);
            vHeight = h;
            
            vec3 displacedPosition = position + vec3(0.0, h * uDisplacementScale, 0.0);
            vNormal = normal; 
            gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
        }
    `,
    fragmentShader: `
        varying vec2 vUv;
        varying float vHeight;
        varying vec3 vNormal;

        uniform sampler2D uSatelliteMap;
        uniform sampler2D uIndicesMap;
        uniform float uShowSatellite;
        uniform float uShowRelief;
        uniform float uShowStreets;
        uniform float uShowVegetation;
        uniform float uIndicesType;
        uniform vec3 uBaseColor;
        uniform vec3 uSunDirection;

        void main() {
            vec3 color = uBaseColor;
            
            if (uShowSatellite > 0.5) {
                vec4 satColor = texture2D(uSatelliteMap, vUv);
                color = satColor.rgb;
            }
            
            // Multi-layer overlays
            if (uShowVegetation > 0.5) {
                // Blend green tint for vegetation areas (logic can be more complex with a veg mask)
                color = mix(color, vec3(0.1, 0.3, 0.1), 0.3);
            }

            if (uIndicesType > 0.5) {
                vec4 idxData = texture2D(uIndicesMap, vUv);
                if (uIndicesType < 1.5) { // NDVI
                    vec3 ndviColor = mix(vec3(0.8, 0.2, 0.1), vec3(0.1, 0.8, 0.2), idxData.r);
                    color = mix(color, ndviColor, 0.5);
                } else { // Soil
                    vec3 soilColor = mix(vec3(0.4, 0.2, 0.1), vec3(0.2, 0.1, 0.05), idxData.r);
                    color = mix(color, soilColor, 0.5);
                }
            }
            
            // Basic Lambertian lighting for relief
            if (uShowRelief > 0.5) {
                float diff = max(dot(vNormal, uSunDirection), 0.1);
                color *= (0.7 + diff * 0.3);
            }

            gl_FragColor = vec4(color, 1.0);
        }
    `
};
