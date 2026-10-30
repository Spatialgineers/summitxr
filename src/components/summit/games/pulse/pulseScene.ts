import * as THREE from 'three';
import type { Judgment, Note } from './pulseChart';

/* Pulso SGX scene: one WebGL canvas. A full-screen GLSL background (SGX rays,
   beat rings, a pillar-colored equalizer skyline and a floor grid, all driven
   by the analyser), a neon 3-lane track, notes as SGX gems (bolt / gear /
   gear G marks) in a single point batch, hold beams, additive particles and
   the SGX logo pulsing on the beat at the end of the track. */

export const LANE_X = [-1.6, 0, 1.6];
const HALF_W = 2.4;
const LEN = 60;
export const LANE_COLORS = ['#00DDFF', '#FDCC0D', '#00DDFF'];
const PILLARS = ['#32527B', '#00DDFF', '#B87000', '#FDCC0D', '#888888', '#FFFFFF'];
const MAX_NOTES = 200;
const MAX_PARTS = 520;
const HOLD_POOL = 8;

export interface FrameInput {
  /** Visual song time (song time minus the calibration offset). */
  vt: number;
  dt: number;
  notes: Note[];
  first: number;
  speed: number;
  /** 1 on the beat, decays to 0. */
  beat: number;
  beatLen: number;
  levels: { bass: number; mid: number; high: number };
  eq: number[];
  fever: number;
  pressed: boolean[];
  playing: boolean;
}

export interface PulseLayout { lanes: { x0: number; x1: number }[]; hitY: number }

export interface PulseScene {
  resize: () => void;
  frame: (f: FrameInput) => void;
  hitFx: (lane: number, j: Judgment) => void;
  feverFx: () => void;
  layout: () => PulseLayout;
  dispose: () => void;
}

const BG_FRAG = /* glsl */ `
precision highp float;
uniform vec2 uRes; uniform float uTime, uBass, uMid, uHigh, uBeat, uFever, uHorizon, uCalm;
uniform float uEq[6]; uniform vec3 uPillar[6];
const vec3 CYAN = vec3(0.0, 0.867, 1.0);
const vec3 YEL = vec3(0.992, 0.8, 0.051);
float hash(float n) { return fract(sin(n) * 43758.5453); }
float hexDist(vec2 p) { p = abs(p); return max(dot(p, normalize(vec2(1.0, 1.732))), p.x); }
void main() {
  vec2 p = (gl_FragCoord.xy - vec2(0.5 * uRes.x, uHorizon * uRes.y)) / uRes.y;
  float t = uTime * mix(1.0, 0.35, uCalm);
  vec3 col = mix(vec3(0.02), vec3(0.03, 0.06, 0.11), smoothstep(-0.1, 0.9, p.y));
  float r = length(p);
  float a = atan(p.y, p.x);
  // SGX rays from the vanishing point.
  float rays = pow(abs(sin(a * 7.0 + t * (0.12 + uFever * 0.5))), 22.0) + 0.6 * pow(abs(sin(a * 13.0 - t * 0.2)), 40.0);
  col += mix(CYAN, YEL, uFever * 0.8) * rays * smoothstep(1.6, 0.05, r) * (0.06 + 0.3 * uBass + 0.25 * uFever) * step(0.0, p.y + 0.02);
  // Beat ring (hex) growing out of the horizon.
  float hr = hexDist(p * vec2(1.0, 1.6));
  float ringR = (1.0 - uBeat) * 1.3;
  col += YEL * exp(-abs(hr - ringR) * 55.0) * uBeat * (0.5 + uFever * 0.6) * step(0.0, p.y);
  // Hex lattice in the sky, shimmering with the highs.
  vec2 hp = p * 9.0 + vec2(0.0, t * 0.08);
  vec2 g = vec2(1.0, 1.732);
  vec2 h1 = mod(hp, g) - g * 0.5; vec2 h2 = mod(hp - g * 0.5, g) - g * 0.5;
  vec2 hc = dot(h1, h1) < dot(h2, h2) ? h1 : h2;
  float edge = smoothstep(0.03, 0.0, abs(hexDist(hc) - 0.48));
  col += CYAN * edge * smoothstep(0.0, 0.5, p.y) * (0.035 + 0.12 * uHigh);
  // Equalizer skyline in pillar colors, mirrored on both sides of the track.
  if (p.y > 0.0) {
    float ax = abs(p.x);
    float id = floor(ax * 22.0);
    float k = mod(id, 6.0);
    float eq = uEq[0];
    for (int i = 1; i < 6; i++) if (float(i) == k) eq = uEq[i];
    float hgt = (0.03 + eq * (0.12 + 0.18 * hash(id))) * smoothstep(0.08, 0.25, ax);
    float inBar = step(p.y, hgt) * step(0.12, fract(ax * 22.0)) * step(0.3, fract(p.y * 90.0));
    vec3 pc = uPillar[0];
    for (int i = 1; i < 6; i++) if (float(i) == k) pc = uPillar[i];
    col = mix(col, pc * (0.55 + 0.6 * uFever), inBar * 0.75);
    col += pc * exp(-abs(p.y - hgt) * 160.0) * 0.5 * smoothstep(0.08, 0.25, ax);
  }
  // Floor grid on the sides.
  if (p.y < 0.0) {
    float z = 0.35 / max(-p.y, 0.003);
    vec2 fg = vec2(p.x * z, z + t * (1.5 + uFever * 2.5));
    vec2 gl = abs(fract(fg) - 0.5);
    float line = smoothstep(0.06, 0.0, min(gl.x, gl.y) * (0.6 + z * 0.05) * 3.0);
    col += mix(vec3(0.0, 0.45, 0.6), YEL * 0.7, uFever) * line * smoothstep(9.0, 0.0, z) * (0.35 + 0.5 * uBass);
  }
  // Horizon glow.
  col += mix(CYAN, YEL, uFever) * exp(-abs(p.y) * 18.0) * (0.25 + 0.6 * uBass + 0.4 * uBeat);
  // Fever: warm wash and pulsing vignette.
  col += YEL * uFever * 0.05 * (0.5 + 0.5 * sin(t * 6.0));
  vec2 q = gl_FragCoord.xy / uRes - 0.5;
  col *= 1.0 - dot(q, q) * (1.1 - 0.4 * uBeat * uFever);
  gl_FragColor = vec4(col, 1.0);
}`;

const TRACK_VERT = /* glsl */ `
varying vec3 vPos;
void main() { vec4 w = modelMatrix * vec4(position, 1.0); vPos = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;

const TRACK_FRAG = /* glsl */ `
precision highp float;
varying vec3 vPos;
uniform float uScroll, uBeatLen, uBeat, uFever, uTime, uLen;
uniform vec3 uPress; uniform vec3 uLaneCol[3];
const vec3 CYAN = vec3(0.0, 0.867, 1.0);
const vec3 YEL = vec3(0.992, 0.8, 0.051);
float lineAt(float x, float c, float w) { return smoothstep(w, 0.0, abs(x - c)); }
void main() {
  float x = vPos.x, z = vPos.z;
  float far = smoothstep(-uLen, -uLen * 0.55, z);
  float halfW = 2.4;
  float inside = step(abs(x), halfW);
  vec3 col = vec3(0.02, 0.03, 0.045);
  float alpha = 0.82 * inside;
  // Beat lines scrolling toward the hit line (brighter on the bar).
  float bz = (z - uScroll) / uBeatLen;
  float bl = smoothstep(0.035, 0.0, abs(fract(bz) - 0.5) - 0.465);
  col += mix(CYAN, YEL, uFever) * bl * 0.22 * inside;
  // Chevrons in fever.
  float chev = smoothstep(0.1, 0.0, abs(fract((z - uScroll * 1.5) * 0.35 + abs(x) * 0.25) - 0.5) - 0.38);
  col += YEL * chev * uFever * 0.12 * inside;
  // Lane press glow.
  for (int i = 0; i < 3; i++) {
    float cx = -1.6 + 1.6 * float(i);
    float m = smoothstep(0.8, 0.55, abs(x - cx)) * exp(z * 0.12) * step(z, 0.6);
    col += uLaneCol[i] * m * uPress[i] * 0.55;
  }
  // Lane dividers and edges.
  float div = lineAt(abs(x), 0.8, 0.03);
  col += CYAN * div * (0.55 + 0.4 * uBeat);
  float edge = lineAt(abs(x), halfW, 0.06) + 0.5 * lineAt(abs(x), halfW, 0.25);
  col += mix(CYAN, YEL, 0.35 + 0.65 * uFever) * edge * (0.9 + 0.6 * uBeat);
  alpha = max(alpha, edge * 0.9);
  // Hit line.
  float hit = lineAt(z, 0.0, 0.07) * inside;
  col += vec3(1.0) * hit * (0.8 + 0.5 * uBeat) + CYAN * lineAt(z, 0.0, 0.45) * inside * 0.35;
  col += YEL * lineAt(z, 0.0, 0.03) * inside * uFever;
  gl_FragColor = vec4(col, alpha * far * step(z, 1.5) * smoothstep(5.5, 1.5, z));
}`;

const POINT_VERT = /* glsl */ `
attribute float aSize, aCell, aAlpha; attribute vec3 aColor;
uniform float uScale;
varying float vCell, vAlpha; varying vec3 vColor;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uScale / -mv.z;
  vCell = aCell; vAlpha = aAlpha; vColor = aColor;
  gl_Position = projectionMatrix * mv;
}`;

const POINT_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uAtlas;
varying float vCell, vAlpha; varying vec3 vColor;
void main() {
  vec2 cell = vec2(mod(vCell, 4.0), floor(vCell / 4.0));
  vec4 tx = texture2D(uAtlas, (cell + gl_PointCoord) / vec2(4.0, 2.0));
  gl_FragColor = vec4(tx.rgb * vColor, tx.a * vAlpha);
  if (gl_FragColor.a < 0.01) discard;
}`;

const BEAM_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec3 uColor; uniform float uOn, uTime;
void main() {
  float core = smoothstep(0.5, 0.0, abs(vUv.x - 0.5));
  float flow = 0.6 + 0.4 * sin(vUv.y * 40.0 - uTime * 18.0);
  float a = core * (0.35 + 0.45 * uOn) * mix(1.0, flow, 0.5);
  gl_FragColor = vec4(uColor * (0.8 + uOn * 0.8), a);
}`;
const BEAM_VERT = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** 4×2 atlas, 128 px cells: 0 bolt gem, 1 gear gem, 2 gear-G gem, 3 receptor, 4 glow, 5 spark, 6 ring. */
function buildAtlas(tex: THREE.CanvasTexture, canvas: HTMLCanvasElement) {
  const c = canvas.getContext('2d');
  if (!c) return;
  const S = 128;
  const hex = (cx: number, cy: number, r: number) => {
    c.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i + Math.PI / 6;
      c[i ? 'lineTo' : 'moveTo'](cx + r * Math.cos(a), cy + r * Math.sin(a));
    }
    c.closePath();
  };
  const gem = (i: number, mark: HTMLImageElement | null) => {
    const cx = (i % 4) * S + S / 2;
    const cy = Math.floor(i / 4) * S + S / 2;
    c.save();
    c.shadowColor = 'rgba(255,255,255,0.9)';
    c.shadowBlur = 14;
    hex(cx, cy, 50);
    const g = c.createLinearGradient(cx, cy - 50, cx, cy + 50);
    g.addColorStop(0, '#FFFFFF');
    g.addColorStop(0.55, '#D8D8D8');
    g.addColorStop(1, '#9A9A9A');
    c.fillStyle = g;
    c.fill();
    c.restore();
    c.lineWidth = 4;
    c.strokeStyle = 'rgba(20,20,20,0.85)';
    hex(cx, cy, 41);
    c.stroke();
    if (mark) {
      const m = document.createElement('canvas');
      m.width = m.height = 72;
      const mc = m.getContext('2d');
      if (mc) {
        mc.drawImage(mark, 0, 0, 72, 72);
        mc.globalCompositeOperation = 'source-in';
        mc.fillStyle = '#0B0B0B';
        mc.fillRect(0, 0, 72, 72);
        c.drawImage(m, cx - 36, cy - 36);
      }
    }
  };
  return Promise.all(['/holo/bolt.png', '/holo/gear.png', '/holo/gearG.png'].map(loadImage)).then((imgs) => {
    c.clearRect(0, 0, canvas.width, canvas.height);
    imgs.forEach((img, i) => gem(i, img));
    // Receptor: hollow hex.
    c.save();
    c.shadowColor = '#FFFFFF';
    c.shadowBlur = 12;
    c.lineWidth = 6;
    c.strokeStyle = '#FFFFFF';
    hex(3 * S + S / 2, S / 2, 46);
    c.stroke();
    c.lineWidth = 2;
    hex(3 * S + S / 2, S / 2, 34);
    c.stroke();
    c.restore();
    // Glow.
    const gl = c.createRadialGradient(S / 2, S + S / 2, 0, S / 2, S + S / 2, S / 2);
    gl.addColorStop(0, 'rgba(255,255,255,1)');
    gl.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    gl.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gl;
    c.fillRect(0, S, S, S);
    // Spark: 4-point star.
    const sx = S + S / 2;
    const sy = S + S / 2;
    c.fillStyle = '#FFFFFF';
    c.beginPath();
    c.moveTo(sx, sy - 56);
    c.quadraticCurveTo(sx + 6, sy - 6, sx + 56, sy);
    c.quadraticCurveTo(sx + 6, sy + 6, sx, sy + 56);
    c.quadraticCurveTo(sx - 6, sy + 6, sx - 56, sy);
    c.quadraticCurveTo(sx - 6, sy - 6, sx, sy - 56);
    c.fill();
    // Shockwave ring.
    c.save();
    c.shadowColor = '#FFFFFF';
    c.shadowBlur = 10;
    c.lineWidth = 5;
    c.strokeStyle = '#FFFFFF';
    hex(2 * S + S / 2, S + S / 2, 52);
    c.stroke();
    c.restore();
    tex.needsUpdate = true;
  });
}

export function createPulseScene(canvas: HTMLCanvasElement, container: HTMLElement, reduced: boolean): PulseScene {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: window.devicePixelRatio < 2, alpha: false, powerPreference: 'high-performance' });
  const maxRatio = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(maxRatio);
  renderer.setClearColor(0x050505, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(o: T) => { disposables.push(o); return o; };

  // Background.
  const bgUniforms = {
    uRes: { value: new THREE.Vector2(1, 1) }, uTime: { value: 0 }, uBass: { value: 0 }, uMid: { value: 0 }, uHigh: { value: 0 },
    uBeat: { value: 0 }, uFever: { value: 0 }, uHorizon: { value: 0.75 }, uCalm: { value: reduced ? 1 : 0 },
    uEq: { value: [0, 0, 0, 0, 0, 0] }, uPillar: { value: PILLARS.map((c) => new THREE.Color(c)) },
  };
  const bg = new THREE.Mesh(
    track(new THREE.PlaneGeometry(2, 2)),
    track(new THREE.ShaderMaterial({ uniforms: bgUniforms, vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.9999, 1.0); }', fragmentShader: BG_FRAG, depthTest: false, depthWrite: false })),
  );
  bg.frustumCulled = false;
  bg.renderOrder = -10;
  scene.add(bg);

  // Track.
  const trackUniforms = {
    uScroll: { value: 0 }, uBeatLen: { value: 8 }, uBeat: { value: 0 }, uFever: { value: 0 }, uTime: { value: 0 }, uLen: { value: LEN },
    uPress: { value: new THREE.Vector3() }, uLaneCol: { value: LANE_COLORS.map((c) => new THREE.Color(c)) },
  };
  const trackGeo = track(new THREE.PlaneGeometry(HALF_W * 2 + 0.6, LEN + 6));
  trackGeo.rotateX(-Math.PI / 2);
  trackGeo.translate(0, 0, (6 - LEN) / 2);
  const trackMesh = new THREE.Mesh(trackGeo, track(new THREE.ShaderMaterial({ uniforms: trackUniforms, vertexShader: TRACK_VERT, fragmentShader: TRACK_FRAG, transparent: true, depthWrite: false })));
  trackMesh.renderOrder = 0;
  scene.add(trackMesh);

  // Atlas shared by notes and particles.
  const atlasCanvas = document.createElement('canvas');
  atlasCanvas.width = 512;
  atlasCanvas.height = 256;
  const atlas = track(new THREE.CanvasTexture(atlasCanvas));
  atlas.flipY = false;
  atlas.colorSpace = THREE.SRGBColorSpace;
  buildAtlas(atlas, atlasCanvas);

  const makePoints = (cap: number, additive: boolean, order: number) => {
    const geo = track(new THREE.BufferGeometry());
    const attrs = {
      position: new THREE.BufferAttribute(new Float32Array(cap * 3), 3),
      aColor: new THREE.BufferAttribute(new Float32Array(cap * 3), 3),
      aSize: new THREE.BufferAttribute(new Float32Array(cap), 1),
      aCell: new THREE.BufferAttribute(new Float32Array(cap), 1),
      aAlpha: new THREE.BufferAttribute(new Float32Array(cap), 1),
    };
    Object.entries(attrs).forEach(([k, a]) => { a.setUsage(THREE.DynamicDrawUsage); geo.setAttribute(k, a); });
    const mat = track(new THREE.ShaderMaterial({
      uniforms: { uAtlas: { value: atlas }, uScale: { value: 400 } },
      vertexShader: POINT_VERT, fragmentShader: POINT_FRAG, transparent: true, depthTest: false, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    }));
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    pts.renderOrder = order;
    scene.add(pts);
    return { geo, attrs, mat };
  };
  const notePts = makePoints(MAX_NOTES, false, 3);
  const partPts = makePoints(MAX_PARTS, true, 4);
  const laneCol = LANE_COLORS.map((c) => new THREE.Color(c));
  const white = new THREE.Color('#FFFFFF');
  const yellow = new THREE.Color('#FDCC0D');

  // Hold beams.
  const beamGeo = track(new THREE.PlaneGeometry(1, 1));
  beamGeo.rotateX(-Math.PI / 2);
  beamGeo.translate(0, 0.02, -0.5);
  const beams = Array.from({ length: HOLD_POOL }, () => {
    const mat = track(new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color() }, uOn: { value: 0 }, uTime: { value: 0 } },
      vertexShader: BEAM_VERT, fragmentShader: BEAM_FRAG, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    const m = new THREE.Mesh(beamGeo, mat);
    m.renderOrder = 2;
    m.visible = false;
    scene.add(m);
    return m;
  });

  // SGX logo at the end of the track.
  const logoTex = track(new THREE.TextureLoader().load('/holo/sgxLogo.png'));
  logoTex.colorSpace = THREE.SRGBColorSpace;
  const logo = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: logoTex, depthTest: false, depthWrite: false, transparent: true })));
  logo.renderOrder = 1;
  scene.add(logo);
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = glowCanvas.height = 64;
  const gc = glowCanvas.getContext('2d');
  if (gc) {
    const g = gc.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.3, 'rgba(255,255,255,0.4)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    gc.fillStyle = g;
    gc.fillRect(0, 0, 64, 64);
  }
  const halo = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: track(new THREE.CanvasTexture(glowCanvas)), color: 0x00ddff, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, transparent: true, opacity: 0.5 })));
  halo.renderOrder = 0;
  scene.add(halo);

  // Particles.
  const P = {
    n: 0,
    pos: new Float32Array(MAX_PARTS * 3), vel: new Float32Array(MAX_PARTS * 3),
    life: new Float32Array(MAX_PARTS), max: new Float32Array(MAX_PARTS), size: new Float32Array(MAX_PARTS), grow: new Float32Array(MAX_PARTS),
    col: new Float32Array(MAX_PARTS * 3), cell: new Float32Array(MAX_PARTS),
  };
  const spawn = (x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, size: number, grow: number, color: THREE.Color, cell: number) => {
    if (P.n >= MAX_PARTS) return;
    const i = P.n++;
    P.pos.set([x, y, z], i * 3);
    P.vel.set([vx, vy, vz], i * 3);
    P.life[i] = life;
    P.max[i] = life;
    P.size[i] = size;
    P.grow[i] = grow;
    P.col.set([color.r, color.g, color.b], i * 3);
    P.cell[i] = cell;
  };
  const kill = (i: number) => {
    const j = --P.n;
    if (i === j) return;
    P.pos.copyWithin(i * 3, j * 3, j * 3 + 3);
    P.vel.copyWithin(i * 3, j * 3, j * 3 + 3);
    P.col.copyWithin(i * 3, j * 3, j * 3 + 3);
    P.life[i] = P.life[j]; P.max[i] = P.max[j]; P.size[i] = P.size[j]; P.grow[i] = P.grow[j]; P.cell[i] = P.cell[j];
  };

  const press = [0, 0, 0];
  const hitPulse = [0, 0, 0];
  let shake = 0;
  let time = 0;
  let width = 1;
  let height = 1;
  let camDist = 10;
  // Dynamic resolution: slow devices drop pixels before they drop frames.
  const perf = { ratio: maxRatio, time: 0, frames: 0 };

  const resize = () => {
    width = Math.max(1, container.clientWidth);
    height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height, false);
    const aspect = width / height;
    camera.aspect = aspect;
    camera.fov = 50;
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(25));
    camDist = Math.max(8.5, (HALF_W + 0.35) / (tanHalf * aspect * 0.97));
    const el = THREE.MathUtils.degToRad(28);
    camera.position.set(0, camDist * Math.sin(el), camDist * Math.cos(el));
    camera.lookAt(0, 0, -camDist);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    const pr = renderer.getPixelRatio();
    bgUniforms.uRes.value.set(width * pr, height * pr);
    const horizon = new THREE.Vector3(0, 0, -2000).project(camera);
    bgUniforms.uHorizon.value = (horizon.y + 1) / 2;
    const scale = (height * pr) / (2 * tanHalf);
    notePts.mat.uniforms.uScale.value = scale;
    partPts.mat.uniforms.uScale.value = scale;
    logo.position.set(0, camDist * 0.3 + 4, -LEN - 6);
    halo.position.copy(logo.position);
  };
  resize();

  const zOf = (t: number, vt: number, speed: number) => -(t - vt) * speed;

  const frame = (f: FrameInput) => {
    time += f.dt;
    const fever = f.fever;
    for (let i = 0; i < 3; i++) {
      press[i] = f.pressed[i] ? Math.min(1, press[i] + f.dt * 14) : Math.max(0, press[i] - f.dt * 5);
      hitPulse[i] = Math.max(0, hitPulse[i] - f.dt * 4);
    }

    bgUniforms.uTime.value = time;
    bgUniforms.uBass.value = f.levels.bass;
    bgUniforms.uMid.value = f.levels.mid;
    bgUniforms.uHigh.value = f.levels.high;
    bgUniforms.uBeat.value = f.beat;
    bgUniforms.uFever.value = fever;
    for (let i = 0; i < 6; i++) bgUniforms.uEq.value[i] = f.eq[i] || 0;

    const scroll = f.playing ? f.vt * f.speed : time * 6;
    trackUniforms.uScroll.value = -scroll;
    trackUniforms.uBeatLen.value = f.beatLen * f.speed;
    trackUniforms.uBeat.value = f.beat;
    trackUniforms.uFever.value = fever;
    trackUniforms.uTime.value = time;
    trackUniforms.uPress.value.set(Math.max(press[0], hitPulse[0]), Math.max(press[1], hitPulse[1]), Math.max(press[2], hitPulse[2]));

    // Notes (far first so near gems draw on top) + receptors.
    const A = notePts.attrs;
    let n = 0;
    const put = (x: number, y: number, z: number, size: number, cell: number, c: THREE.Color, alpha: number, boost = 1) => {
      if (n >= MAX_NOTES) return;
      A.position.setXYZ(n, x, y, z);
      A.aColor.setXYZ(n, c.r * boost, c.g * boost, c.b * boost);
      A.aSize.setX(n, size);
      A.aCell.setX(n, cell);
      A.aAlpha.setX(n, alpha);
      n++;
    };
    for (let i = 0; i < 3; i++) {
      const s = 1.5 + press[i] * 0.25 + hitPulse[i] * 0.4 + f.beat * 0.08;
      put(LANE_X[i], 0.05, 0, s, 3, laneCol[i], 0.55 + press[i] * 0.45);
    }
    let beam = 0;
    const horizonT = f.vt + LEN / f.speed;
    let last = f.first;
    while (last < f.notes.length && f.notes[last].t < horizonT) last++;
    for (let k = last - 1; k >= f.first; k--) {
      const note = f.notes[k];
      if (note.state === 1 || note.state === 4 || note.state === 5) continue;
      const holding = note.state === 3;
      const z = holding ? 0 : zOf(note.t, f.vt, f.speed);
      if (note.dur > 0 && beam < HOLD_POOL) {
        const tail = zOf(note.t + note.dur, f.vt, f.speed);
        const len = Math.max(0, z - Math.max(tail, -LEN));
        if (len > 0.02) {
          const b = beams[beam++];
          b.visible = true;
          b.position.set(LANE_X[note.lane], 0, z);
          b.scale.set(0.62, 1, len);
          const u = (b.material as THREE.ShaderMaterial).uniforms;
          u.uColor.value.copy(note.state === 2 ? white : laneCol[note.lane]).multiplyScalar(note.state === 2 ? 0.25 : 1);
          u.uOn.value = holding ? 1 : 0;
          u.uTime.value = time;
        }
      }
      if (z < -LEN || z > 3) continue;
      const fade = THREE.MathUtils.smoothstep(z, -LEN, -LEN * 0.8);
      const missed = note.state === 2;
      const c = missed ? white : fever > 0.5 && note.lane !== 1 ? yellow : laneCol[note.lane];
      put(LANE_X[note.lane], 0.42, z, 1.25 + fever * 0.12, note.mark, c, (missed ? 0.25 : 1) * fade, missed ? 0.4 : holding ? 1.3 : 1);
    }
    for (let b = beam; b < HOLD_POOL; b++) beams[b].visible = false;
    notePts.geo.setDrawRange(0, n);
    Object.values(A).forEach((a) => { a.needsUpdate = true; });

    // Fever stream along the edges.
    if (fever > 0.5 && f.playing && Math.random() < (reduced ? 0.2 : 0.8)) {
      const side = Math.random() < 0.5 ? -1 : 1;
      spawn(side * HALF_W, 0.1, -LEN * 0.6, 0, 0.3, f.speed * 0.9, 2.2, 0.5, 0, yellow, 5);
    }
    // Particles update.
    const B = partPts.attrs;
    for (let i = P.n - 1; i >= 0; i--) {
      P.life[i] -= f.dt;
      if (P.life[i] <= 0) { kill(i); continue; }
      P.vel[i * 3 + 1] -= 6 * f.dt * (P.cell[i] === 5 ? 1 : 0);
      for (let a = 0; a < 3; a++) P.pos[i * 3 + a] += P.vel[i * 3 + a] * f.dt;
      P.size[i] += P.grow[i] * f.dt;
    }
    for (let i = 0; i < P.n; i++) {
      const k = P.life[i] / P.max[i];
      B.position.setXYZ(i, P.pos[i * 3], P.pos[i * 3 + 1], P.pos[i * 3 + 2]);
      B.aColor.setXYZ(i, P.col[i * 3], P.col[i * 3 + 1], P.col[i * 3 + 2]);
      B.aSize.setX(i, P.size[i]);
      B.aCell.setX(i, P.cell[i]);
      B.aAlpha.setX(i, Math.min(1, k * 1.6));
    }
    partPts.geo.setDrawRange(0, P.n);
    Object.values(B).forEach((a) => { a.needsUpdate = true; });

    // Logo pulse.
    const ls = 9 * (1 + f.beat * (reduced ? 0.04 : 0.12) + fever * 0.08);
    logo.scale.set(ls, ls * (346 / 360), 1);
    halo.scale.setScalar(ls * 2.2);
    halo.material.opacity = 0.25 + f.beat * 0.4 + fever * 0.25;
    halo.material.color.set(fever > 0.5 ? 0xfdcc0d : 0x00ddff);

    // Camera shake.
    shake = Math.max(0, shake - f.dt * 3);
    const el = THREE.MathUtils.degToRad(28);
    const sx = reduced ? 0 : (Math.random() - 0.5) * shake * 0.25;
    const sy = reduced ? 0 : (Math.random() - 0.5) * shake * 0.25;
    camera.position.set(sx, camDist * Math.sin(el) + sy, camDist * Math.cos(el));
    camera.lookAt(sx * 0.5, 0, -camDist);

    renderer.render(scene, camera);

    if (f.playing) {
      perf.time += f.dt;
      if (++perf.frames === 60) {
        const avg = perf.time / perf.frames;
        const next = avg > 0.026 ? Math.max(0.5, perf.ratio * 0.75) : avg < 0.015 ? Math.min(maxRatio, perf.ratio * 1.15) : perf.ratio;
        if (Math.abs(next - perf.ratio) > 0.01) {
          perf.ratio = next;
          renderer.setPixelRatio(next);
          resize();
        }
        perf.time = 0;
        perf.frames = 0;
      }
    }
  };

  const hitFx = (lane: number, j: Judgment) => {
    const x = LANE_X[lane];
    const c = laneCol[lane];
    if (j === 'miss') {
      spawn(x, 0.4, 0, 0, 0.6, 0, 0.3, 1.1, 1, new THREE.Color(0.35, 0.35, 0.38), 6);
      return;
    }
    hitPulse[lane] = 1;
    const perfect = j === 'perfect';
    spawn(x, 0.4, 0, 0, 0, 0, 0.2, perfect ? 2.2 : 1.7, 3, c, 4);
    spawn(x, 0.3, 0, 0, 0, 0, 0.28, 1.1, perfect ? 5 : 3.5, perfect ? white : c, 6);
    const count = reduced ? 3 : perfect ? 14 : 7;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 2 + Math.random() * 4;
      spawn(x, 0.4, 0, Math.cos(a) * s * 0.6, 2 + Math.random() * 4, Math.sin(a) * s * 0.4 - 1, 0.35 + Math.random() * 0.3, 0.22 + Math.random() * 0.22, -0.3, Math.random() < 0.3 ? white : c, 5);
    }
    if (perfect && bgUniforms.uFever.value > 0.5) shake = Math.min(1, shake + 0.35);
  };

  const feverFx = () => {
    const count = reduced ? 8 : 40;
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * HALF_W * 2;
      spawn(x, 0.2, -Math.random() * 6, (Math.random() - 0.5) * 2, 3 + Math.random() * 5, 2, 0.8 + Math.random() * 0.5, 0.5, 0, yellow, 5);
    }
    shake = reduced ? 0 : 1;
  };

  const layout = (): PulseLayout => {
    const sx = (x: number) => (new THREE.Vector3(x, 0, 0).project(camera).x + 1) / 2;
    const hitY = 1 - (new THREE.Vector3(0, 0, 0).project(camera).y + 1) / 2;
    const edges = [-HALF_W, -0.8, 0.8, HALF_W].map(sx);
    return { lanes: [0, 1, 2].map((i) => ({ x0: edges[i], x1: edges[i + 1] })), hitY };
  };

  return {
    resize,
    frame,
    hitFx,
    feverFx,
    layout,
    dispose() {
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
    },
  };
}
