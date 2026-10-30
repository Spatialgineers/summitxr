import * as THREE from 'three';

/* Shaders and textures for the drone world. Facades are one instanced box
   shader: the SGX tile from public/pilot/tex mapped by world position (so it
   never stretches), a height gradient and neon edges per instance, all in a
   single draw call. Textures are cached for the page and flagged shared so
   zone disposal leaves them alone. */

const cache = new Map<string, THREE.Texture>();
let maxAniso = 4;

export function setMaxAnisotropy(n: number) {
  maxAniso = Math.min(8, n);
}

export function tileTexture(name: string): THREE.Texture {
  let tex = cache.get(name);
  if (!tex) {
    tex = new THREE.TextureLoader().load(`/pilot/tex/${name}.png`);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = maxAniso;
    tex.userData.shared = true;
    cache.set(name, tex);
  }
  return tex;
}

export function disposeTileTextures() {
  cache.forEach((t) => t.dispose());
  cache.clear();
}

const FACADE_VERT = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
varying vec3 vWorld;
varying vec3 vLocal;
varying vec3 vHalf;
varying vec3 vEdge;
void main() {
  vec3 scale = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
  vLocal = position * scale;
  vHalf = scale * 0.5;
  #ifdef USE_INSTANCING_COLOR
    vEdge = instanceColor;
  #else
    vEdge = vec3(0.0, 0.87, 1.0);
  #endif
  vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vec4 mvPosition = viewMatrix * world;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const FACADE_FRAG = /* glsl */ `
uniform sampler2D map;
uniform vec3 baseColor;
uniform vec3 texGlow;
uniform float tileSize;
uniform float time;
#include <common>
#include <fog_pars_fragment>
varying vec3 vWorld;
varying vec3 vLocal;
varying vec3 vHalf;
varying vec3 vEdge;
void main() {
  vec3 e = vHalf - abs(vLocal);
  vec2 uv;
  float edge;
  float roof = 0.0;
  if (e.x < e.y && e.x < e.z) { uv = vWorld.zy; edge = min(e.y, e.z); }
  else if (e.y < e.z) { uv = vWorld.xz; edge = min(e.x, e.z); roof = 1.0; }
  else { uv = vWorld.xy; edge = min(e.x, e.y); }
  vec3 tex = texture2D(map, uv / tileSize).rgb;
  float h = clamp(vLocal.y / max(vHalf.y * 2.0, 0.001) + 0.5, 0.0, 1.0);
  vec3 col = baseColor * (0.25 + 0.9 * tex);
  col += tex * tex * texGlow;
  col *= 0.45 + 0.75 * h + roof * 0.3;
  float glow = smoothstep(0.5, 0.0, edge);
  col += vEdge * glow * 1.7;
  float band = smoothstep(0.96, 1.0, sin(vWorld.y * 0.22 - time * 1.4) * 0.5 + 0.5);
  col += vEdge * band * 0.18 * (1.0 - roof);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

export function facadeMaterial(texName: string, base: number, glow: number, tileSize = 7): THREE.ShaderMaterial {
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        map: { value: null },
        baseColor: { value: new THREE.Color(base) },
        texGlow: { value: new THREE.Color(glow) },
        tileSize: { value: tileSize },
        time: { value: 0 },
      },
    ]),
    vertexShader: FACADE_VERT,
    fragmentShader: FACADE_FRAG,
    fog: true,
  });
  // Bound after merge(), which would otherwise clone the shared texture.
  mat.uniforms.map.value = tileTexture(texName);
  return mat;
}

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}
`;

const SKY_FRAG = /* glsl */ `
uniform vec3 top;
uniform vec3 horizon;
uniform vec3 accent;
varying vec3 vDir;
void main() {
  float h = vDir.y;
  vec3 c = mix(horizon, top, smoothstep(-0.05, 0.5, h));
  c += horizon * 0.9 * exp(-abs(h - 0.02) * 18.0);
  float bands = smoothstep(0.985, 1.0, sin(h * 160.0) * 0.5 + 0.5) * smoothstep(0.35, 0.05, h) * step(0.0, h);
  c += accent * bands * 0.08;
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}
`;

export function skyMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() }, accent: { value: new THREE.Color() } },
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
}
