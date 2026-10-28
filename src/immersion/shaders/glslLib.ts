/* Shared GLSL chunks for the SGX effects.
   Noise, FBM and domain warping adapted from MiniMax-AI/skills · shader-dev
   (MIT, https://github.com/MiniMax-AI/skills); holographic panel and
   fresnel energy-field patterns adapted from martinholovsky/
   claude-skills-generator · glsl (public domain). See docs/SHADER_GUIDE.md. */

export const GLSL_NOISE = /* glsl */ `
float sgxHash(vec2 p) {
  p = fract(p * 0.6180339887);
  p *= 25.0;
  return fract(p.x * p.y * (p.x + p.y));
}
float sgxNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(sgxHash(i), sgxHash(i + vec2(1.0, 0.0)), f.x),
    mix(sgxHash(i + vec2(0.0, 1.0)), sgxHash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}
const mat2 SGX_ROT = mat2(0.80, 0.60, -0.60, 0.80);
// 5 constant octaves: no dynamic loop bounds (GPU-safe), cheap enough for phones.
float sgxFbm(vec2 p, float t) {
  float f = 0.0;
  f += 0.5000 * sgxNoise(p + t);          p = SGX_ROT * p * 2.02;
  f += 0.2500 * sgxNoise(p);              p = SGX_ROT * p * 2.03;
  f += 0.1250 * sgxNoise(p);              p = SGX_ROT * p * 2.01;
  f += 0.0625 * sgxNoise(p);              p = SGX_ROT * p * 2.04;
  f += 0.03125 * sgxNoise(p + sin(t));
  return f / 0.96875;
}
// Classic domain warping: fbm(p + fbm(p + fbm(p)))
float sgxWarp(vec2 p, float t, float strength) {
  float v = sgxFbm(p, t);
  v = sgxFbm(p + strength * v, t);
  return sgxFbm(p + strength * v, t);
}
`;

/** Pillar / brand colors as GLSL vec3 (linear-ish sRGB). */
export function hexToVec3(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
