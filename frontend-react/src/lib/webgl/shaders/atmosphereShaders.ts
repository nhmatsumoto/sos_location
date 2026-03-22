/**
 * Atmosphere Engine v1.0.0
 * Physics-grounded weather rendering:
 *   SKY   — Rayleigh-inspired sky dome with moving FBM clouds, sun disk, stars
 *   PRECIP — Seed-based precipitation particles (rain streaks, hail, snowflakes, drizzle)
 *            with terrain-aware culling via topoMap sampling
 *   FOG   — Full-screen gradient haze overlay (ground fog + horizon haze + overcast ceiling)
 *
 * precipType codes:
 *   0 = clear  1 = drizzle  2 = moderate rain  3 = heavy rain/thunderstorm
 *   4 = hail   5 = snow     6 = blizzard/heavy snow
 */

// ── SKY SHADER ───────────────────────────────────────────────────────────────
export const SKY_VS = `#version 300 es
layout(location=0) in vec2 a_pos;
out vec2 v_ndc;
void main() {
  v_ndc = a_pos;
  gl_Position = vec4(a_pos, 0.9999, 1.0);
}`;

export const SKY_FS = `#version 300 es
precision highp float;
in vec2 v_ndc;
out vec4 outColor;

uniform mat4  u_invViewProj;
uniform vec3  u_sunDir;
uniform float u_cloudCover;
uniform int   u_precipType;
uniform float u_time;
uniform float u_reveal;
uniform float u_sunElevDeg;
// Disaster atmosphere
uniform int   u_disasterType;      // 0=clear 1=flood/tsunami 2=earthquake 3=hurricane 4=tornado 5=wildfire 6=snow/frost 7=drought 8=hail 9=mudslide
uniform float u_disasterIntensity; // 0-1

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float smoothN(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),
             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
}
float fbm(vec2 p) {
  float v=0.0, a=0.5;
  for (int i=0;i<5;i++) { v+=a*smoothN(p); p=p*2.17+vec2(1.7,9.2); a*=0.5; }
  return v;
}
float fbmTurb(vec2 p, float speed) {
  float v=0.0, a=0.5;
  for (int i=0;i<6;i++) { v+=a*smoothN(p); p=p*2.3+vec2(u_time*speed, u_time*speed*0.7); a*=0.45; }
  return v;
}
// Lightning flash: random bright spikes at storm time
float lightning() {
  float t1 = mod(u_time * 0.9 + 1.3, 5.2);
  float t2 = mod(u_time * 1.7 + 3.8, 7.1);
  float f1 = step(0.97, sin(t1 * 38.0)) * smoothstep(0.97, 1.0, sin(t1 * 38.0));
  float f2 = step(0.97, sin(t2 * 41.0)) * smoothstep(0.97, 1.0, sin(t2 * 41.0));
  return max(f1, f2);
}

void main() {
  // Reconstruct world-space ray from NDC via inverse view-projection
  vec4 nearH  = u_invViewProj * vec4(v_ndc, -1.0, 1.0);
  vec4 farH   = u_invViewProj * vec4(v_ndc,  1.0, 1.0);
  vec3 rayDir = normalize(farH.xyz/farH.w - nearH.xyz/nearH.w);
  float cosUp = rayDir.y;

  float sunEl  = clamp(u_sunElevDeg, -10.0, 90.0);
  float dayFac = smoothstep(-6.0, 14.0, sunEl);

  // ── Base sky gradient — tuned for 65° midday sun ──────────────────────────
  // Zenith: deep Rayleigh blue at noon. Horizon: bright white-blue (forward scatter).
  vec3 zenith  = mix(vec3(0.02,0.04,0.14), vec3(0.09,0.28,0.68), dayFac);
  vec3 horizon = mix(
    vec3(0.04,0.07,0.16),
    mix(vec3(0.88,0.45,0.12), vec3(0.62,0.78,0.94), smoothstep(4.0,32.0,sunEl)),
    dayFac
  );
  float hBlend  = pow(max(0.0, 1.0-cosUp), 3.5); // slightly wider horizon band
  vec3 skyColor = mix(zenith, horizon, hBlend);

  // ── Sun disk + Mie forward-scattering halo ────────────────────────────────
  float sunDot = dot(rayDir, normalize(u_sunDir));
  float disk   = smoothstep(0.9988, 0.9999, sunDot);              // sharp disk
  float corona = smoothstep(0.960,  0.9988, sunDot) * 0.22;       // tight corona
  float mie    = pow(max(0.0, sunDot), 6.0) * 0.40 * dayFac;     // forward Mie lobe
  // At 65° sun is nearly white-warm; minimal orange tint
  vec3  mieCol = mix(vec3(1.0,0.50,0.10), vec3(1.0,0.90,0.72), smoothstep(0.0,30.0,sunEl)/30.0);
  skyColor    += mieCol * mie * (1.0 - u_cloudCover * 0.55);
  vec3  sunCol = mix(vec3(1.0,0.82,0.32), vec3(1.05,0.98,0.88), smoothstep(0.0,40.0,sunEl)/40.0);
  skyColor    += sunCol * (disk + corona) * dayFac;

  // ── Rayleigh haze band at horizon (bright white-blue at noon) ────────────
  float limbH   = exp(-pow(cosUp / 0.07, 2.0)) * dayFac * 0.22;
  vec3  limbCol = mix(vec3(0.88,0.60,0.28), vec3(0.78,0.88,1.00), smoothstep(4.0,40.0,sunEl));
  skyColor     += limbCol * limbH;

  // ── Stars at night ────────────────────────────────────────────────────────
  if (dayFac < 0.7 && cosUp > 0.0) {
    vec2  sUV   = v_ndc * 180.0;
    float star  = step(0.985, hash(floor(sUV)));
    float twink = 0.55 + 0.45*sin(u_time*3.1 + hash(floor(sUV))*90.0);
    skyColor   += vec3(0.88,0.93,1.0) * star * twink * (1.0-dayFac) * max(0.0,cosUp);
  }

  // ── Cloud layer (FBM — turbulence varies by disaster) ─────────────────────
  float cFade = smoothstep(0.0, 0.22, cosUp);
  if (u_cloudCover > 0.01 && cFade > 0.0) {
    float turbSpeed = (u_disasterType == 3 || u_disasterType == 4) ? 0.014 : 0.008;
    vec2 cUV   = (rayDir.xz / max(cosUp,0.02)) * 0.28 + u_time * turbSpeed * vec2(1.0,0.25);
    float cloud = (u_disasterType == 3 || u_disasterType == 4)
      ? fbmTurb(cUV * 2.5, 0.006)   // storm: more chaotic, faster
      : fbm(cUV * 2.0 + 5.0);
    float thr = 1.0 - u_cloudCover * 0.88;
    float cA  = smoothstep(thr, thr+0.14, cloud) * cFade;
    vec3 cCol = mix(vec3(0.90,0.93,0.97), vec3(0.28,0.30,0.36), u_cloudCover*0.75);
    // Storm clouds darker + greenish for tornado
    if (u_disasterType == 4) cCol = mix(cCol, vec3(0.22,0.26,0.20), u_disasterIntensity*0.6);
    else if (u_disasterType == 3) cCol = mix(cCol, vec3(0.18,0.20,0.26), u_disasterIntensity*0.5);
    skyColor = mix(skyColor, cCol, cA * u_cloudCover);
  }

  // ── Overcast + precipitation attenuation ─────────────────────────────────
  skyColor *= 1.0 - u_cloudCover * 0.48;
  if (u_precipType >= 3) skyColor *= 0.70;
  else if (u_precipType >= 1) skyColor *= 0.85;

  // ── Disaster-specific sky tinting ─────────────────────────────────────────
  float di = u_disasterIntensity;

  if (u_disasterType == 1) {
    // Flood/Tsunami: dark stormy blue-gray sky
    skyColor = mix(skyColor, vec3(0.08,0.10,0.18), di * 0.35);
  } else if (u_disasterType == 2) {
    // Earthquake: dust & aerosol haze band at horizon
    float dustBand = exp(-pow((cosUp - 0.06) / 0.18, 2.0));
    skyColor = mix(skyColor, vec3(0.55,0.44,0.28), di * 0.28 * dustBand);
    skyColor *= 1.0 - di * 0.12;
  } else if (u_disasterType == 3) {
    // Hurricane: near-black storm wall, desaturated gray
    skyColor = mix(skyColor, vec3(0.06,0.07,0.10), di * 0.55);
    // Lightning flashes
    float lf = lightning() * di;
    skyColor += vec3(0.85,0.92,1.00) * lf * 0.35;
  } else if (u_disasterType == 4) {
    // Tornado: sickly green-gray supercell
    skyColor = mix(skyColor, vec3(0.14,0.20,0.12), di * 0.50);
    // Rotation hint in clouds
    float rotUV = atan(rayDir.z, rayDir.x) + u_time * 0.15 * di;
    float rotor = 0.5 + 0.5 * sin(rotUV * 4.0 + fbm(rayDir.xz * 3.0));
    skyColor = mix(skyColor, vec3(0.10,0.14,0.08), rotor * di * 0.30 * cFade);
    // Violent lightning
    skyColor += vec3(0.90,0.95,1.00) * lightning() * di * 0.50;
  } else if (u_disasterType == 5) {
    // Wildfire: thick orange-brown smoke canopy obscuring the sun
    float smokeLow  = smoothstep(0.40, 0.0, cosUp);  // dense smoke near horizon
    float smokeHigh = smoothstep(0.0, 0.55, cosUp) * (1.0 - smoothstep(0.55, 1.0, cosUp));
    vec3  smokeCol  = mix(vec3(0.42,0.22,0.06), vec3(0.28,0.16,0.05), smokeHigh);
    skyColor = mix(skyColor, smokeCol, di * 0.65 * (smokeLow + smokeHigh * 0.5));
    // Dim the sun through smoke
    skyColor *= 1.0 - di * 0.45;
    // Eerie orange glow at horizon
    float glow = exp(-pow(cosUp / 0.12, 2.0));
    skyColor += vec3(0.50, 0.18, 0.02) * di * glow * 0.55 * dayFac;
  } else if (u_disasterType == 6) {
    // Snow/Frost: flat white overcast
    skyColor = mix(skyColor, vec3(0.78,0.80,0.82), di * 0.55);
  } else if (u_disasterType == 7) {
    // Drought: washed-out pale straw haze
    skyColor = mix(skyColor, vec3(0.68,0.58,0.36), di * 0.42);
    skyColor *= 1.0 - di * 0.15;
  } else if (u_disasterType == 8) {
    // Hail: dark boiling cumulonimbus
    skyColor = mix(skyColor, vec3(0.10,0.10,0.14), di * 0.45);
    skyColor += vec3(0.88,0.94,1.00) * lightning() * di * 0.28;
  } else if (u_disasterType == 9) {
    // Mudslide / Deforestation: earthy dark haze + reduced visibility
    float mudBand = exp(-pow((cosUp - 0.10) / 0.22, 2.0));
    skyColor = mix(skyColor, vec3(0.40,0.30,0.16), di * 0.32 * mudBand);
  }

  // ── Below-horizon ground color ────────────────────────────────────────────
  if (cosUp < -0.01) skyColor = mix(vec3(0.02,0.02,0.03), skyColor, smoothstep(-0.06,0.0,cosUp));

  outColor = vec4(skyColor * u_reveal, 1.0);
}`;

// ── PRECIPITATION SHADER ─────────────────────────────────────────────────────
export const PRECIP_VS = `#version 300 es
layout(location=0) in vec3 a_seeds;  // [x_norm 0-1, phase 0-1, z_norm 0-1]

uniform mat4  u_projMatrix;
uniform mat4  u_viewMatrix;
uniform int   u_precipType;
uniform float u_cloudBase;
uniform float u_windX;
uniform float u_windZ;
uniform float u_turbulence;
uniform float u_time;
uniform float u_worldSpanX;
uniform float u_worldSpanZ;
uniform float u_areaHalfX;
uniform float u_areaHalfZ;
uniform sampler2D u_topoMap;
uniform float u_topoScale;
uniform float u_topoOffset;
uniform float u_reveal;

out float v_precipType;
out float v_life;
out float v_screenAngle;

// Fall speeds in cm/s (world unit = 1 cm). Original m/s values × 100.
float fallSpeed() {
  if (u_precipType == 1) return 250.0;   // drizzle  ~2.5 m/s
  if (u_precipType == 2) return 700.0;   // rain     ~7.0 m/s
  if (u_precipType == 3) return 1200.0;  // heavy    ~12 m/s
  if (u_precipType == 4) return 2000.0;  // hail     ~20 m/s
  if (u_precipType == 5) return 90.0;    // snow     ~0.9 m/s
  if (u_precipType == 6) return 450.0;   // blizzard ~4.5 m/s
  return 800.0;
}
float pSize() {
  if (u_precipType == 1) return 2.5;   // drizzle: small
  if (u_precipType == 2) return 16.0;  // rain: medium streak
  if (u_precipType == 3) return 28.0;  // heavy rain: long streak (FLOOD)
  if (u_precipType == 4) return 16.0;  // hail: ice sphere
  if (u_precipType == 5) return 14.0;  // snow: flake
  if (u_precipType == 6) return 10.0;  // blizzard: oval
  return 4.0;
}

void main() {
  v_precipType = float(u_precipType);
  v_life = 0.0; v_screenAngle = 0.0;

  if (u_precipType == 0) {
    gl_PointSize = 0.0;
    gl_Position  = vec4(0.0, 0.0, 2.0, 1.0);
    return;
  }

  float fs    = fallSpeed();
  float cycle = fract(a_seeds.y + u_time * fs / max(u_cloudBase, 1.0));

  float wx = (a_seeds.x - 0.5) * u_worldSpanX;
  float wz = (a_seeds.z - 0.5) * u_worldSpanZ;

  // Wind drift accumulated during fall
  float dt = cycle * (u_cloudBase / max(fs, 0.1));
  wx += u_windX * dt;
  wz += u_windZ * dt;

  // Turbulence (snow/drizzle)
  if (u_precipType == 5 || u_precipType == 6 || u_precipType == 1) {
    wx += sin(u_time*1.1 + a_seeds.x*37.0) * u_turbulence;
    wz += cos(u_time*0.8 + a_seeds.z*43.0) * u_turbulence;
  }

  // Wrap strictly within scene bounds [−areaHalf, +areaHalf]
  wx = mod(wx + u_areaHalfX, u_worldSpanX) - u_areaHalfX;
  wz = mod(wz + u_areaHalfZ, u_worldSpanZ) - u_areaHalfZ;

  // Terrain height
  vec2 uv = clamp(vec2(
    (wx + u_areaHalfX) / (u_areaHalfX * 2.0),
    (wz + u_areaHalfZ) / (u_areaHalfZ * 2.0)
  ), 0.0, 1.0);
  float terrH = texture(u_topoMap, uv).r * u_topoScale + u_topoOffset;

  float wy = terrH + u_cloudBase * (1.0 - cycle);
  v_life = cycle;

  // Screen-space angle for streak orientation
  vec4 p0 = u_projMatrix * u_viewMatrix * vec4(wx, wy, wz, 1.0);
  vec4 p1 = u_projMatrix * u_viewMatrix * vec4(
    wx + u_windX*0.05, wy - fs*0.05, wz + u_windZ*0.05, 1.0
  );
  if (p0.w > 0.0 && p1.w > 0.0) {
    vec2 sd = p1.xy/p1.w - p0.xy/p0.w;
    v_screenAngle = atan(sd.x, -sd.y);
  }

  if (wy < terrH - 150.0 || p0.w <= 0.0) {
    gl_PointSize = 0.0;
    gl_Position  = vec4(0.0, 0.0, 2.0, 1.0);
  } else {
    gl_Position  = p0;
    gl_PointSize = pSize();
  }
}`;

export const PRECIP_FS = `#version 300 es
precision highp float;
in float v_precipType;
in float v_life;
in float v_screenAngle;
out vec4 outColor;
uniform float u_reveal;
uniform float u_intensity;

void main() {
  int ptype = int(v_precipType + 0.5);
  if (ptype == 0) discard;

  vec2  pc    = gl_PointCoord - 0.5;
  float alpha = 0.0;
  vec3  col   = vec3(1.0);

  if (ptype == 1) {
    // Drizzle: soft diffuse droplet
    float d = length(pc);
    alpha = smoothstep(0.50, 0.08, d) * 0.28;
    col   = vec3(0.74, 0.84, 0.97);

  } else if (ptype == 2) {
    // Moderate rain: oriented streak with teardrop fade
    float ca = cos(v_screenAngle), sa = sin(v_screenAngle);
    vec2  rpc = vec2(ca*pc.x - sa*pc.y, sa*pc.x + ca*pc.y);
    float w   = smoothstep(0.10, 0.0, abs(rpc.x));
    float l   = smoothstep(0.5, -0.12, rpc.y) * smoothstep(-0.5, -0.35, rpc.y);
    float bright = mix(1.0, 0.5, rpc.y * 0.5 + 0.5); // brighter at front
    alpha = w * l * 0.55 * bright;
    col   = mix(vec3(0.68, 0.80, 0.98), vec3(0.50, 0.66, 0.95), v_life);

  } else if (ptype == 3) {
    // Heavy rain / thunderstorm: long thick streak, brighter
    float ca = cos(v_screenAngle), sa = sin(v_screenAngle);
    vec2  rpc = vec2(ca*pc.x - sa*pc.y, sa*pc.x + ca*pc.y);
    float w   = smoothstep(0.12, 0.0, abs(rpc.x));
    float l   = smoothstep(0.5, -0.15, rpc.y) * smoothstep(-0.5, -0.30, rpc.y);
    float head = smoothstep(0.12, 0.0, length(rpc - vec2(0.0, -0.18))); // drop head
    float bright = mix(1.0, 0.45, rpc.y * 0.5 + 0.5);
    alpha = max(w * l * bright, head * 0.7) * 0.72;
    col   = mix(vec3(0.55, 0.72, 0.98), vec3(0.40, 0.58, 0.92), v_life);

  } else if (ptype == 4) {
    // Hail: ice sphere with Lambertian shading + refraction caustic
    float d = length(pc);
    if (d > 0.48) discard;
    float sphere  = smoothstep(0.48, 0.15, d);
    float spec    = smoothstep(0.16, 0.0,  length(pc - vec2(-0.15, -0.15)));
    float caustic = smoothstep(0.30, 0.0,  length(pc - vec2( 0.10,  0.08))) * 0.45;
    col   = mix(vec3(0.72, 0.82, 0.97), vec3(0.90, 0.94, 0.99), spec + caustic);
    alpha = sphere * 0.94;

  } else if (ptype == 5) {
    // Snowflake: detailed 6-armed star with cross-branches
    float d     = length(pc);
    if (d > 0.50) discard;
    float angle = atan(pc.y, pc.x);
    float arms6 = pow(abs(cos(angle * 3.0)), 4.0);
    float cross6= pow(abs(cos(angle * 3.0 + 1.047)), 6.0); // 30° offset branches
    float core  = smoothstep(0.15, 0.0, d);
    float hex   = smoothstep(0.50, 0.25, d) * mix(0.25, 1.0, arms6);
    float tips  = smoothstep(0.50, 0.32, d) * arms6;
    float sub   = smoothstep(0.38, 0.22, d) * cross6 * 0.60;
    alpha = max(max(max(hex, tips), sub), core) * 0.90;
    col   = vec3(0.93, 0.97, 1.00);

  } else if (ptype == 6) {
    // Blizzard: wind-stretched oval with gust streak
    float ca = cos(v_screenAngle * 0.7), sa = sin(v_screenAngle * 0.7);
    vec2  rpc = vec2(ca*pc.x - sa*pc.y, sa*pc.x + ca*pc.y);
    float d   = length(vec2(rpc.x * 0.55, rpc.y));
    float streak = smoothstep(0.10, 0.0, abs(rpc.x)) * smoothstep(0.5, -0.1, rpc.y) * 0.45;
    alpha = max(smoothstep(0.46, 0.10, d), streak) * 0.78;
    col   = vec3(0.90, 0.94, 1.00);
  }

  alpha *= mix(0.50, 1.0, 1.0 - v_life * 0.35) * u_intensity * u_reveal;
  if (alpha < 0.015) discard;
  outColor = vec4(col, alpha);
}`;

// ── ATMOSPHERIC FOG / HAZE OVERLAY ───────────────────────────────────────────
export const FOG_VS = `#version 300 es
layout(location=0) in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

export const FOG_FS = `#version 300 es
precision mediump float;
in vec2 v_uv;
out vec4 outColor;
uniform float u_fogDensity;
uniform vec3  u_fogColor;
uniform float u_reveal;
uniform float u_cloudCover;
uniform int   u_disasterType;       // matches SKY_FS codes
uniform float u_disasterIntensity;  // 0-1

void main() {
  float h          = v_uv.y;
  float groundFog  = smoothstep(0.28, 0.0, h)         * u_fogDensity * 0.65;
  float horizonFog = exp(-pow((h - 0.38)/0.11, 2.0))  * u_fogDensity * 0.22;
  float ceiling    = smoothstep(0.62, 0.80, h)         * u_cloudCover * 0.10;
  float total      = clamp(groundFog + horizonFog + ceiling, 0.0, 0.75) * u_reveal;
  if (total < 0.006) discard;

  // Disaster-specific fog tint blended on top of weather fog color
  vec3 fogCol = u_fogColor;
  float di = u_disasterIntensity;
  if (u_disasterType == 1) {
    // Flood: murky blue-gray ground mist
    fogCol = mix(fogCol, vec3(0.22, 0.28, 0.42), di * 0.55);
    total  = min(0.75, total * (1.0 + di * 0.40));
  } else if (u_disasterType == 2) {
    // Earthquake: choking dust & debris haze
    fogCol = mix(fogCol, vec3(0.58, 0.48, 0.30), di * 0.65);
    total  = min(0.75, total * (1.0 + di * 0.60));
  } else if (u_disasterType == 3) {
    // Hurricane: dense gray storm mist
    fogCol = mix(fogCol, vec3(0.18, 0.20, 0.26), di * 0.60);
    total  = min(0.75, total * (1.0 + di * 0.50));
  } else if (u_disasterType == 4) {
    // Tornado: sickly green-gray vortex mist
    fogCol = mix(fogCol, vec3(0.20, 0.28, 0.16), di * 0.55);
    total  = min(0.75, total * (1.0 + di * 0.45));
  } else if (u_disasterType == 5) {
    // Wildfire: thick orange-brown smoke at ground level
    fogCol = mix(fogCol, vec3(0.48, 0.24, 0.06), di * 0.75);
    total  = min(0.75, total * (1.0 + di * 0.80));
  } else if (u_disasterType == 6) {
    // Snow/Frost: white whiteout mist
    fogCol = mix(fogCol, vec3(0.88, 0.91, 0.96), di * 0.70);
    total  = min(0.75, total * (1.0 + di * 0.35));
  } else if (u_disasterType == 7) {
    // Drought: dusty brown haze
    fogCol = mix(fogCol, vec3(0.72, 0.60, 0.36), di * 0.60);
    total  = min(0.75, total * (1.0 + di * 0.30));
  } else if (u_disasterType == 8) {
    // Hail: icy gray-blue mist
    fogCol = mix(fogCol, vec3(0.55, 0.62, 0.78), di * 0.45);
    total  = min(0.75, total * (1.0 + di * 0.40));
  } else if (u_disasterType == 9) {
    // Mudslide: earthy brown ground murk
    fogCol = mix(fogCol, vec3(0.44, 0.32, 0.14), di * 0.70);
    total  = min(0.75, total * (1.0 + di * 0.65));
  }

  outColor = vec4(fogCol, total);
}`;
