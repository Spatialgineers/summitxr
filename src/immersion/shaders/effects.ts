import { GLSL_NOISE } from './glslLib';

/* Fragment shaders for the SGX effects. The full-screen ones run in
   ShaderCanvas (WebGL2, premultiplied alpha); the dome and the holographic
   pillar run inside the Three.js core. Techniques adapted from
   MiniMax-AI/skills · shader-dev (MIT) and martinholovsky/
   claude-skills-generator · glsl (public domain); see docs/SHADER_GUIDE.md. */

const HEAD = /* glsl */ `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec3 uA;
uniform vec3 uB;
out vec4 fragColor;
${GLSL_NOISE}`;

/* Warp tunnel: polar UV + FBM streaks + chromatic aberration. uProgress 0→1
   over the jump; a dark veil keeps the page behind out of the way. */
export const WARP_FRAG = HEAD + /* glsl */ `
uniform float uProgress;
float tunnel(vec2 uv, float speed) {
  float r = max(length(uv), 1e-4);
  float a = atan(uv.y, uv.x);
  float depth = 0.32 / r + uTime * speed;
  float s = sgxFbm(vec2(a / 6.2831 * 26.0, depth * 0.7), uTime * 0.3);
  s = pow(smoothstep(0.5, 1.0, s), 1.6);
  float rings = smoothstep(0.9, 1.0, sin(depth * 9.42)) * 0.3;
  float fall = smoothstep(0.02, 0.3, r) * (1.0 - smoothstep(1.0, 1.9, r));
  return (s + rings) * fall;
}
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);
  float p = uProgress;
  float env = smoothstep(0.0, 0.15, p) * (1.0 - smoothstep(0.7, 1.0, p));
  float speed = mix(0.6, 9.0, smoothstep(0.0, 0.6, p) * (1.0 - smoothstep(0.85, 1.0, p)));
  uv *= mix(1.4, 0.55, smoothstep(0.0, 0.9, p));
  float ca = 0.01 + 0.05 * p * (1.0 - p) * 4.0;
  float r = tunnel(uv * (1.0 + ca), speed);
  float g = tunnel(uv, speed);
  float b = tunnel(uv * (1.0 - ca), speed);
  vec3 col = vec3(r, g, b) * mix(uA, vec3(1.0), 0.3) * 1.7;
  col += uB * b * 0.35;
  col += mix(uA, vec3(1.0), 0.6) * exp(-length(uv) * 5.0) * (0.3 + p);
  col = min(col * env, vec3(1.0));
  float veil = 0.82 * env;
  float a = clamp(max(veil, max(col.r, max(col.g, col.b))), 0.0, 1.0);
  fragColor = vec4(vec3(0.02, 0.022, 0.03) * veil + col, a);
}`;

/* XP sparks: 90 stateless particles, each derived from its index and the
   burst age (no buffers). uBurst is in 0..1 screen space. */
export const SPARKS_FRAG = HEAD + /* glsl */ `
uniform vec2 uBurst;
uniform float uAge;
void main() {
  vec2 px = gl_FragCoord.xy;
  vec2 origin = uBurst * uRes;
  float scale = min(uRes.x, uRes.y) * 0.9;
  float age = uAge;
  if (age <= 0.0 || age >= 1.4 || length(px - origin) > scale * 1.3) { fragColor = vec4(0.0); return; }
  vec3 col = vec3(0.0);
  for (int i = 0; i < 90; i++) {
    float fi = float(i);
    float h1 = sgxHash(vec2(fi, 1.7));
    float h2 = sgxHash(vec2(fi, 9.1));
    float h3 = sgxHash(vec2(fi, 4.3));
    float ang = 1.5708 + (h1 - 0.5) * 2.6;
    vec2 vel = vec2(cos(ang), sin(ang)) * (0.35 + h2 * 0.75) * scale * 0.55;
    vec2 pos = origin + vel * age + vec2(0.0, -0.9 * scale) * age * age * 0.5;
    float life = 1.0 - smoothstep(0.5 + h3 * 0.6, 1.1 + h3 * 0.3, age);
    float d = length(px - pos);
    float k = (2.2 + h3 * 2.0) / (d * d * 0.08 + 1.0);
    col += mix(vec3(0.99, 0.8, 0.05), uA, smoothstep(0.1, 0.8, age + h3 * 0.3)) * k * life;
  }
  col = 1.0 - exp(-col * 1.4);
  fragColor = vec4(col, clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0));
}`;

/* Holo glass: the background of the big panels. Scanlines, a slow light
   sweep, breathing interference and a soft edge glow in the pillar colors. */
export const GLASS_FRAG = HEAD + /* glsl */ `
void main() {
  vec2 px = gl_FragCoord.xy;
  vec2 uv = px / uRes;
  float edge = min(min(px.x, uRes.x - px.x), min(px.y, uRes.y - px.y));
  float halo = exp(-edge * 0.045);
  float scan = 0.5 + 0.5 * sin(px.y * 1.35 - uTime * 3.0);
  float sweep = exp(-pow((uv.y - fract(uTime * 0.08)) * 7.0, 2.0));
  float inter = sgxFbm(vec2(uv.x * 3.0, uv.y * 10.0 - uTime * 0.4), uTime * 0.15);
  vec3 col = vec3(0.035, 0.04, 0.052);
  col += uA * (0.05 * inter + 0.022 * scan);
  col += uB * 0.04 * sweep;
  col += uA * halo * 0.2;
  fragColor = vec4(col, 0.9);
}`;

/* ---- Three.js (core) ---------------------------------------------------- */

/* Energy field dome: the domain-warped smoke from the concept hero, in screen
   space so it reads the same at any camera angle, plus the old lat/lon grid
   and sonar ring in world space so the 3D room keeps its depth. */
export const DOME_ENERGY_FRAG = /* glsl */ `
uniform float uTime;
uniform float uPulse;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec2 uRes;
uniform vec2 uMouse;
uniform float uDrift;
uniform float uMotion;
uniform float uGain;
varying vec3 vWorldDirection;
${GLSL_NOISE}
void main() {
  vec3 dir = normalize(vWorldDirection);
  float y = dir.y;
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  vec2 m = (uMouse - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  float d = length(uv - m);
  vec2 p = uv * 2.3 + (uv - m) * 0.7 * exp(-d * 3.0) + vec2(uDrift, 0.0);
  float t = uTime * 0.05 * uMotion;
#ifdef SGX_LITE
  float v = sgxFbm(p + 1.5 * sgxFbm(p, t), t);
#else
  float v = sgxWarp(p, t, 1.5);
#endif
  float v2 = sgxFbm(p * 1.6 + vec2(v * 2.2, -v), t * 1.4);
  vec3 col = vec3(0.018, 0.02, 0.028);
  col = mix(col, uColorA * 0.58, smoothstep(0.38, 0.78, v));
  col = mix(col, uColorB * 0.85, smoothstep(0.64, 0.92, v2) * 0.65);
  float fil = 1.0 - smoothstep(0.0, 0.035, abs(fract(v * 7.0) - 0.5) - 0.43);
  col += uColorA * fil * 0.22 * smoothstep(0.45, 0.8, v);
  col += mix(uColorA, uColorB, 0.5) * (0.22 + uPulse * 0.3) * exp(-d * 7.0);

  float latLines = smoothstep(0.975, 0.995, abs(sin(y * 28.0 - uTime * 0.4 * uMotion)));
  float lonLines = smoothstep(0.985, 0.998, abs(sin(atan(dir.z, dir.x) * 18.0)));
  float grid = (latLines * 0.45 + lonLines * 0.35) * exp(-abs(y) * 2.2);
  float sonar = exp(-pow((y - mod(uTime * 0.22, 1.6) + 0.8) * 14.0, 2.0)) * 0.35 * uMotion;
  col += vec3(0.1, 0.6, 0.74) * grid * 0.22;
  col += vec3(0.992, 0.8, 0.051) * sonar * 0.15;

  col *= uGain + uPulse * 0.3;
  vec2 q = gl_FragCoord.xy / uRes;
  col *= 0.3 + 0.7 * pow(16.0 * q.x * q.y * (1.0 - q.x) * (1.0 - q.y), 0.22);
  gl_FragColor = vec4(col, 1.0);
}`;

/* Holographic pillar: an additive overlay drawn on the active pillar's own
   .glb meshes. Fresnel rim + rising scanlines + band glitch in the vertex. */
export const HOLO_PILLAR_VERT = /* glsl */ `
uniform float uTime;
uniform float uGlitch;
varying vec3 vN;
varying vec3 vV;
varying float vY;
float hh(vec2 p) { p = fract(p * 0.6180339887); p *= 25.0; return fract(p.x * p.y * (p.x + p.y)); }
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  float band = floor(wp.y * 0.9);
  float burst = step(0.72, hh(vec2(floor(uTime * 2.0), 3.1)));
  float g = step(0.86, hh(vec2(band, floor(uTime * 9.0)))) * burst * uGlitch;
  wp.x += g * (hh(vec2(band, floor(uTime * 17.0))) - 0.5) * 2.4;
  vY = wp.y;
  vec4 mv = viewMatrix * wp;
  vV = -mv.xyz;
  vN = normalize(mat3(viewMatrix) * mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * mv;
}`;

export const HOLO_PILLAR_FRAG = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uHolo;
uniform float uScan;
uniform float uTime;
varying vec3 vN;
varying vec3 vV;
varying float vY;
void main() {
  vec3 n = normalize(vN);
  float fres = pow(1.0 - abs(dot(n, normalize(vV))), 2.4);
  float scan = mix(1.0, 0.55 + 0.45 * sin(vY * 4.0 - uTime * 7.0), uScan);
  vec3 col = uColorA * (0.05 + fres * 1.6) * scan;
  col += vec3(1.0) * pow(fres, 7.0) * 0.6;
  col += uColorB * pow(fres, 3.0) * 0.35 * uScan;
  gl_FragColor = vec4(col * uHolo, 1.0);
}`;
