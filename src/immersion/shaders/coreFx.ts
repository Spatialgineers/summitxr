import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { GLSL_NOISE } from './glslLib';

/* Three.js effects for the 3D core: post-processing with adaptive quality,
   the shader floor with ripples, flowing energy beams, the energy shell around
   the SGX core and volumetric light shafts. Custom shaders output linear color
   (SGX_LINEAR) because the composer's OutputPass does tone mapping + sRGB.
   Techniques adapted from MiniMax-AI/skills · shader-dev (MIT) and
   martinholovsky/claude-skills-generator · glsl (public domain). */

export const LINEAR_OUT = /* glsl */ `
#ifdef SGX_LINEAR
  gl_FragColor.rgb = pow(max(gl_FragColor.rgb, vec3(0.0)), vec3(2.2));
#endif
`;

/* ---------- post-processing ---------- */

const GRADE_SHADER = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    uGrain: { value: 0.02 },
    uAberration: { value: 0.0003 },
    uRes: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uGrain;
    uniform float uAberration;
    varying vec2 vUv;
    float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    void main() {
      vec2 c = vUv - 0.5;
      float r2 = dot(c, c);
      vec2 off = c * uAberration * (1.0 + r2 * 6.0);
      vec3 col;
      col.r = texture2D(tDiffuse, vUv + off).r;
      col.g = texture2D(tDiffuse, vUv).g;
      col.b = texture2D(tDiffuse, vUv - off).b;
      col *= 1.0 - smoothstep(0.22, 0.8, r2) * 0.16;
      col += (hash(vUv * 1024.0 + fract(uTime)) - 0.5) * uGrain;
      gl_FragColor = vec4(col, 1.0);
    }`,
};

export interface CorePost {
  render: () => void;
  setSize: (w: number, h: number) => void;
  /** Call once per frame with the frame time; steps quality down if the device struggles. */
  tick: (dtMs: number, time: number) => void;
  dispose: () => void;
}

export function createCorePost(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, w: number, h: number, opts: { coarse: boolean; reduceMotion: boolean }): CorePost | null {
  try {
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), opts.coarse ? 0.12 : 0.16, 0.18, 0.95);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    const grade = new ShaderPass(GRADE_SHADER);
    grade.uniforms.uGrain.value = 0;
    grade.uniforms.uAberration.value = 0;
    composer.addPass(grade);
    composer.setSize(w, h);

    // Adaptive quality: after warm-up, average ~90 frames; step down twice at most.
    let level = 0;
    let frames = 0;
    let sum = 0;
    let warm = 0;
    const tick = (dtMs: number, time: number) => {
      grade.uniforms.uTime.value = opts.reduceMotion ? 0 : time;
      if (level >= 2) return;
      warm += dtMs;
      if (warm < 2500) return;
      frames++;
      sum += dtMs;
      if (frames < 90) return;
      const avg = sum / frames;
      frames = 0; sum = 0;
      if (avg > 24 && level === 0) {
        level = 1;
        renderer.setPixelRatio(1);
        composer.setPixelRatio(1);
      } else if (avg > 30 && level === 1) {
        level = 2;
        bloom.enabled = false;
      }
    };

    return {
      render: () => composer.render(),
      setSize: (nw, nh) => { composer.setSize(nw, nh); bloom.resolution.set(nw, nh); },
      tick,
      dispose: () => { bloom.dispose(); composer.dispose(); },
    };
  } catch (err) {
    console.warn('[SGX core] post-processing unavailable:', err);
    return null;
  }
}

/* ---------- shader floor with ripples ---------- */

const FLOOR_VERT = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;

const FLOOR_FRAG = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uTime;
  uniform float uOpacity;
  uniform float uScale;
  uniform vec4 uRipples[4];
  varying vec3 vWorld;
  float gridLine(vec2 p, float size) {
    vec2 q = p / size;
    vec2 g = abs(fract(q - 0.5) - 0.5) / max(fwidth(q), vec2(1e-4));
    return 1.0 - min(min(g.x, g.y), 1.0);
  }
  void main() {
    vec2 p = vWorld.xz * uScale;
    float d = length(p);
    float fade = 1.0 - smoothstep(70.0, 330.0, d);
    float minor = gridLine(p, 8.0) * 0.4;
    float major = gridLine(p, 40.0);
    vec3 tint = mix(uColorB, uColorA, smoothstep(20.0, 220.0, d));
    float lines = (minor + major * 0.9) * fade;
    float pulse = smoothstep(0.92, 1.0, sin(d * 0.07 - uTime * 1.1)) * 0.35 * fade;
    float rip = 0.0;
    for (int i = 0; i < 4; i++) {
      vec4 r = uRipples[i];
      float age = uTime - r.z;
      if (age > 0.0 && age < 3.0) {
        float rad = age * 75.0;
        float w = 2.5 + age * 2.5;
        float k = (length(p - r.xy) - rad) / w;
        rip += exp(-k * k) * (1.0 - age / 3.0) * r.w;
      }
    }
    vec3 col = tint * (lines * 0.38 + pulse * 0.7) + mix(uColorA, vec3(1.0), 0.35) * rip * 0.6;
    float a = clamp(lines * 0.55 + pulse + rip * 0.7, 0.0, 1.0) * uOpacity;
    gl_FragColor = vec4(col * uOpacity, a);
    ${LINEAR_OUT}
  }`;

export interface CoreFloor {
  mesh: THREE.Mesh;
  ripple: (x: number, z: number, strength?: number) => void;
  update: (time: number) => void;
  dispose: () => void;
}

/** `scale` > 1 packs the grid tighter for smaller scenes (the stage uses 4). */
export function createFloor(colorA: { value: THREE.Vector3 }, colorB: { value: THREE.Vector3 }, y: number, opacity: number, linear: boolean, scale = 1): CoreFloor {
  const ripples = [0, 1, 2, 3].map(() => new THREE.Vector4(0, 0, -99, 0));
  const uniforms = { uColorA: colorA, uColorB: colorB, uTime: { value: 0 }, uOpacity: { value: opacity }, uScale: { value: scale }, uRipples: { value: ripples } };
  const geo = new THREE.PlaneGeometry(900 / scale, 900 / scale, 1, 1);
  const mat = new THREE.ShaderMaterial({
    vertexShader: FLOOR_VERT, fragmentShader: FLOOR_FRAG, uniforms, defines: linear ? { SGX_LINEAR: 1 } : {},
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  mesh.renderOrder = -1;
  let next = 0;
  return {
    mesh,
    ripple: (x, z, strength = 1) => { ripples[next].set(x * scale, z * scale, uniforms.uTime.value, strength); next = (next + 1) % 4; },
    update: (t) => { uniforms.uTime.value = t; },
    dispose: () => { geo.dispose(); mat.dispose(); },
  };
}

/* ---------- flowing energy beam (core → pillar) ---------- */

const BEAM_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const BEAM_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uActive;
  varying vec2 vUv;
  void main() {
    float flow = fract(vUv.y * 7.0 - uTime * (0.5 + uActive * 1.8));
    float dash = smoothstep(0.0, 0.12, flow) * (1.0 - smoothstep(0.35, 0.8, flow));
    float ends = smoothstep(0.0, 0.08, vUv.y) * (1.0 - smoothstep(0.92, 1.0, vUv.y));
    float pulse = 1.0 + uActive * 0.35 * sin(uTime * 6.0);
    float a = (0.14 + uActive * 0.2 + dash * (0.25 + uActive * 0.5)) * ends * pulse;
    gl_FragColor = vec4(uColor * a, a);
    ${LINEAR_OUT}
  }`;

export function createBeam(from: THREE.Vector3, to: THREE.Vector3, color: number, linear: boolean) {
  const dir = new THREE.Vector3().subVectors(to, from);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(0.22, 0.22, len, 6, 1, true);
  const c = new THREE.Color(color);
  const mat = new THREE.ShaderMaterial({
    vertexShader: BEAM_VERT, fragmentShader: BEAM_FRAG, defines: linear ? { SGX_LINEAR: 1 } : {},
    uniforms: { uColor: { value: new THREE.Vector3(c.r, c.g, c.b) }, uTime: { value: 0 }, uActive: { value: 0 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(from).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return { mesh, material: mat, dispose: () => { geo.dispose(); mat.dispose(); } };
}

/* ---------- energy shell around the SGX core ---------- */

const SHELL_VERT = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vP;
  void main() {
    vP = position;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vV = -mv.xyz;
    vN = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mv;
  }`;

const SHELL_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uPulse;
  uniform vec3 uColorA;
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vP;
  ${GLSL_NOISE}
  void main() {
    float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.6);
    float flow = sgxFbm(vP.xy * 0.11 + vec2(vP.z * 0.05, uTime * 0.18), uTime * 0.2);
    float bands = smoothstep(0.55, 0.85, flow);
    vec3 gold = vec3(0.99, 0.8, 0.05);
    vec3 col = mix(gold, uColorA, 0.35) * (fres * 1.1 + bands * (0.15 + fres * 0.9));
    col *= 0.5 + uPulse * 0.7;
    gl_FragColor = vec4(col, 1.0);
    ${LINEAR_OUT}
  }`;

export function createCoreShell(radius: number, colorA: { value: THREE.Vector3 }, linear: boolean) {
  const geo = new THREE.SphereGeometry(radius, 48, 32);
  const uniforms = { uTime: { value: 0 }, uPulse: { value: 0 }, uColorA: colorA };
  const mat = new THREE.ShaderMaterial({
    vertexShader: SHELL_VERT, fragmentShader: SHELL_FRAG, uniforms, defines: linear ? { SGX_LINEAR: 1 } : {},
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(geo, mat);
  return { mesh, uniforms, dispose: () => { geo.dispose(); mat.dispose(); } };
}

/* ---------- volumetric light shaft (pillar pedestal) ---------- */

const SHAFT_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vV = -mv.xyz;
    vN = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mv;
  }`;

const SHAFT_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vV;
  ${GLSL_NOISE}
  void main() {
    float facing = abs(dot(normalize(vN), normalize(vV)));
    float body = 0.35 + facing * 0.65;
    float fadeY = smoothstep(0.0, 0.55, vUv.y) * (1.0 - smoothstep(0.9, 1.0, vUv.y));
    float streak = sgxNoise(vec2(vUv.x * 14.0, vUv.y * 2.5 - uTime * 0.7));
    float a = uOpacity * body * fadeY * (0.4 + 0.8 * streak);
    gl_FragColor = vec4(uColor * a, a);
    ${LINEAR_OUT}
  }`;

export function createShaftMaterial(color: number, linear: boolean) {
  const c = new THREE.Color(color);
  return new THREE.ShaderMaterial({
    vertexShader: SHAFT_VERT, fragmentShader: SHAFT_FRAG, defines: linear ? { SGX_LINEAR: 1 } : {},
    uniforms: { uColor: { value: new THREE.Vector3(c.r, c.g, c.b) }, uOpacity: { value: 0.07 }, uTime: { value: 0 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
}
