import * as THREE from 'three';
import { loadSgxIcon, gearGeometry, boltGeometry } from '../../../../identity/sgxIcon3d';
import { playBolt, chargeHum, type BoltSfx } from './boltSfx';
import { PILLARS, ROUND_SECONDS, BOSS_AT, BOSS_HP, CHARGE_MIN, CHARGE_TIME, SHOT_COST, POINTS, ENERGY_REGEN, type GlyphKind } from './boltConfig';

/* "Rayo en tus manos" engine: a transparent Three.js layer over the camera
   (or the fallback backdrop). 3D scene = floating glyphs + shatter particles;
   screen-space overlay = lightning arcs, charge glow, reticle, emitter and
   the hand skeleton. React feeds input and reads the HUD through callbacks. */

export interface BoltHud {
  score: number;
  timeLeft: number;
  energy: number;
  shots: number;
  hits: number;
  seq: number;
  mult: number;
  charge: number;
  boss: number | null;
}

export interface BoltResult {
  score: number;
  shots: number;
  hits: number;
  accuracy: number;
  sets: number;
  bossDown: boolean;
  bestStreak: number;
  glitches: number;
}

export interface BoltCallbacks {
  onHud: (h: BoltHud) => void;
  onToast: (text: string, tone: 'cyan' | 'yellow' | 'alert') => void;
  onFlash: (tone: 'cyan' | 'yellow' | 'alert') => void;
  onEnd: (r: BoltResult) => void;
}

export interface BoltInput {
  /** aim in stage pixels */
  x: number;
  y: number;
  /** an aim source is active (hand in view, pointer over the stage) */
  present: boolean;
  /** charging (pinch held / pointer down / Space held) */
  down: boolean;
}

interface Glyph {
  kind: GlyphKind;
  pillar: number;
  obj: THREE.Object3D;
  mats: THREE.Material[];
  ring?: THREE.Mesh;
  pos: THREE.Vector3;
  vel: THREE.Vector2;
  radius: number;
  age: number;
  life: number;
  phase: number;
  dying: number;
  hp: number;
  color: THREE.Color;
}

interface Arc {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  from: THREE.Vector2;
  to: THREE.Vector2;
  age: number;
  life: number;
  big: boolean;
  jitter: number;
}

const FOV = 50;
const ARC_POINTS = 49;
const BRANCH_POINTS = 13;
const ARC_VERTS = (ARC_POINTS + BRANCH_POINTS * 2) * 2;
const MAX_PARTICLES = 720;
const TAN = Math.tan(THREE.MathUtils.degToRad(FOV / 2));

const rand = (a: number, b: number) => a + Math.random() * (b - a);

function canvasTexture(size: number, draw: (g: CanvasRenderingContext2D, s: number) => void) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d')!, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const glowTexture = () => canvasTexture(128, (g, s) => {
  const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, s, s);
});

const ringTexture = () => canvasTexture(128, (g, s) => {
  g.strokeStyle = '#fff';
  g.lineWidth = 6;
  g.beginPath();
  g.arc(s / 2, s / 2, s / 2 - 8, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 3;
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2;
    g.beginPath();
    g.moveTo(s / 2 + Math.cos(a) * (s / 2 - 22), s / 2 + Math.sin(a) * (s / 2 - 22));
    g.lineTo(s / 2 + Math.cos(a) * (s / 2 - 2), s / 2 + Math.sin(a) * (s / 2 - 2));
    g.stroke();
  }
});

function drawGlitch(g: CanvasRenderingContext2D, s: number) {
  g.clearRect(0, 0, s, s);
  g.save();
  g.beginPath();
  g.moveTo(s * 0.12, 0); g.lineTo(s, 0); g.lineTo(s, s * 0.88); g.lineTo(s * 0.88, s); g.lineTo(0, s); g.lineTo(0, s * 0.12);
  g.closePath();
  g.clip();
  g.fillStyle = 'rgba(20,0,4,0.85)';
  g.fillRect(0, 0, s, s);
  for (let i = 0; i < 22; i++) {
    g.fillStyle = Math.random() < 0.6 ? '#FF2E4D' : Math.random() < 0.5 ? '#FFFFFF' : '#00DDFF';
    g.globalAlpha = rand(0.35, 0.95);
    g.fillRect(rand(0, s), rand(0, s), rand(6, s * 0.5), rand(2, 9));
  }
  g.globalAlpha = 1;
  g.font = `700 ${Math.round(s * 0.3)}px monospace`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#00DDFF';
  g.fillText('ERR', s / 2 - 4, s / 2 + 2);
  g.fillStyle = '#FF2E4D';
  g.fillText('ERR', s / 2 + 3, s / 2 - 2);
  g.fillStyle = 'rgba(0,0,0,0.35)';
  for (let y = 0; y < s; y += 4) g.fillRect(0, y, s, 2);
  g.restore();
  g.strokeStyle = '#FF2E4D';
  g.lineWidth = 4;
  g.strokeRect(2, 2, s - 4, s - 4);
}

const ARC_VERT = /* glsl */ `
  attribute float side;
  varying float vSide;
  void main() { vSide = side; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const ARC_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uAlpha;
  varying float vSide;
  void main() {
    float k = 1.0 - abs(vSide);
    float core = smoothstep(0.55, 0.95, k);
    vec3 col = mix(uColor, vec3(1.0), core);
    gl_FragColor = vec4(col * (0.35 + 0.65 * k), pow(k, 1.4) * uAlpha);
  }
`;

export class BoltEngine {
  readonly input: BoltInput = { x: 0, y: 0, present: false, down: false };
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 50);
  private fx = new THREE.Scene();
  private ortho = new THREE.OrthographicCamera(0, 1, 0, 1, -10, 10);
  private w = 1;
  /** glyphs shrink on narrow (portrait) stages */
  private k = 1;
  private h = 1;
  private raf = 0;
  private lastT = 0;
  private running = false;
  private ended = false;
  private disposed = false;
  private reduced: boolean;
  private es = true;
  private cb: BoltCallbacks;
  private popLayer: HTMLElement;

  // shared resources
  private tex: Record<string, THREE.Texture> = {};
  private glitchCanvas: HTMLCanvasElement;
  private geo: Record<string, THREE.BufferGeometry> = {};
  private iconGeo: { bolt: THREE.BufferGeometry; gear: THREE.BufferGeometry; own: boolean } | null = null;

  // game state
  private glyphs: Glyph[] = [];
  private arcs: Arc[] = [];
  private boss: Glyph | null = null;
  private t = 0;
  private spawnIn = 0.6;
  private glitchTick = 0;
  private bossSpawnIn = 0;
  private score = 0;
  private energy = 100;
  private shots = 0;
  private hits = 0;
  private seq = 0;
  private sets = 0;
  private streak = 0;
  private bestStreak = 0;
  private glitchHits = 0;
  private bossDown = false;
  private charge = 0;
  private charging = false;
  private wasDown = false;
  private shake = 0;
  private hudAt = 0;

  // overlay objects
  private reticle: THREE.Sprite;
  private glow: THREE.Sprite;
  private emitter: THREE.Sprite;
  private emitterGlow: THREE.Sprite;
  private skeleton: THREE.LineSegments;
  private joints: THREE.Points;
  private waves: { s: THREE.Sprite; age: number; life: number; size: number }[] = [];

  // particles
  private particles: THREE.Points;
  private pPos: Float32Array;
  private pVel: Float32Array;
  private pCol: Float32Array;
  private pBase: Float32Array;
  private pLife: Float32Array;
  private pNext = 0;

  /** Makes its own canvas inside `host` (a fresh one per engine: a disposed context can't be reused). */
  constructor(host: HTMLElement, popLayer: HTMLElement, cb: BoltCallbacks) {
    const canvas = document.createElement('canvas');
    canvas.className = 'sgx-bolt__canvas';
    canvas.setAttribute('aria-hidden', 'true');
    this.cb = cb;
    this.popLayer = popLayer;
    this.reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    host.appendChild(canvas);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.autoClear = false;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(2, 3, 4);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x00ddff, 0.9);
    rim.position.set(-3, -1, 2);
    this.scene.add(rim);

    const loader = new THREE.TextureLoader();
    PILLARS.forEach((p) => {
      const t = loader.load(`/holo/${p.slug}.png`);
      t.colorSpace = THREE.SRGBColorSpace;
      this.tex[p.slug] = t;
    });
    const boltTex = loader.load('/holo/bolt.png');
    boltTex.colorSpace = THREE.SRGBColorSpace;
    this.tex.bolt = boltTex;
    this.tex.glow = glowTexture();
    this.tex.ring = ringTexture();
    this.glitchCanvas = document.createElement('canvas');
    this.glitchCanvas.width = this.glitchCanvas.height = 128;
    drawGlitch(this.glitchCanvas.getContext('2d')!, 128);
    const gt = new THREE.CanvasTexture(this.glitchCanvas);
    gt.colorSpace = THREE.SRGBColorSpace;
    this.tex.glitch = gt;

    this.geo.plane = new THREE.PlaneGeometry(1.25, 1.25);
    this.geo.ring = new THREE.RingGeometry(0.74, 0.8, 48);
    this.geo.ringOuter = new THREE.RingGeometry(0.9, 0.94, 48);
    this.geo.gear = gearGeometry(0.72, 0.56, 10, 0.2, 0.24);
    this.geo.crystal = new THREE.OctahedronGeometry(0.5, 0);

    const sprite = (map: THREE.Texture, color: THREE.ColorRepresentation, opacity = 1) =>
      new THREE.Sprite(new THREE.SpriteMaterial({ map, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, side: THREE.DoubleSide }));
    this.glow = sprite(this.tex.glow, 0x00ddff, 0);
    this.reticle = sprite(this.tex.ring, 0x00ddff, 0.9);
    this.emitterGlow = sprite(this.tex.glow, 0xfdcc0d, 0.35);
    this.emitter = new THREE.Sprite(new THREE.SpriteMaterial({ map: boltTex, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide }));
    // the overlay camera is y-flipped (pixels, y down): its frustum would cull everything
    [this.emitterGlow, this.emitter, this.glow, this.reticle].forEach((o) => { o.frustumCulled = false; });
    this.fx.add(this.emitterGlow, this.emitter, this.glow, this.reticle);

    const skelGeo = new THREE.BufferGeometry();
    skelGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(21 * 2 * 3), 3));
    this.skeleton = new THREE.LineSegments(skelGeo, new THREE.LineBasicMaterial({ color: 0x00ddff, transparent: true, opacity: 0.85, depthTest: false }));
    const jointGeo = new THREE.BufferGeometry();
    jointGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(21 * 3), 3));
    this.joints = new THREE.Points(jointGeo, new THREE.PointsMaterial({ color: 0x00ddff, size: 7 * this.renderer.getPixelRatio(), sizeAttenuation: false, transparent: true, opacity: 0.95, depthTest: false }));
    this.skeleton.visible = this.joints.visible = false;
    this.skeleton.frustumCulled = this.joints.frustumCulled = false;
    this.fx.add(this.skeleton, this.joints);

    for (let i = 0; i < 6; i++) {
      const s = sprite(this.tex.ring, 0xffffff, 0);
      s.visible = false;
      s.frustumCulled = false;
      this.fx.add(s);
      this.waves.push({ s, age: 1, life: 1, size: 100 });
    }

    // particle pool
    this.pPos = new Float32Array(MAX_PARTICLES * 3);
    this.pVel = new Float32Array(MAX_PARTICLES * 3);
    this.pCol = new Float32Array(MAX_PARTICLES * 3);
    this.pBase = new Float32Array(MAX_PARTICLES * 3);
    this.pLife = new Float32Array(MAX_PARTICLES);
    for (let i = 0; i < MAX_PARTICLES; i++) this.pPos[i * 3 + 2] = -100;
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(this.pPos, 3));
    pg.setAttribute('color', new THREE.BufferAttribute(this.pCol, 3));
    this.particles = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.16, map: this.tex.glow, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.particles.frustumCulled = false;
    this.scene.add(this.particles);

    loadSgxIcon().then((icon) => {
      if (this.disposed) return;
      this.iconGeo = icon ? { bolt: icon.bolt, gear: icon.gear, own: false } : { bolt: boltGeometry(0.8, 0.18), gear: gearGeometry(0.5, 0.38, 10, 0.16, 0.16), own: true };
    });
  }

  setLanguage(es: boolean) { this.es = es; }

  resize(w: number, h: number) {
    this.w = Math.max(1, w);
    this.h = Math.max(1, h);
    this.renderer.setSize(this.w, this.h, false);
    this.camera.aspect = this.w / this.h;
    this.k = Math.max(0.55, Math.min(1, this.camera.aspect / 1.2));
    this.camera.updateProjectionMatrix();
    this.ortho.right = this.w;
    this.ortho.bottom = this.h;
    this.ortho.updateProjectionMatrix();
    const size = Math.min(96, Math.max(64, this.w * 0.09));
    this.emitter.scale.set(size * 0.62, size * 0.62, 1);
    this.emitter.position.set(this.w / 2, this.h - size * 0.62, 0);
    this.emitterGlow.scale.set(size * 2, size * 2, 1);
    this.emitterGlow.position.copy(this.emitter.position);
    if (!this.running) this.render();
  }

  /** Hand landmarks in stage pixels (x, y pairs ×21), or null to hide the skeleton. */
  setSkeleton(px: Float32Array | null) {
    const on = !!px;
    this.skeleton.visible = this.joints.visible = on;
    if (!px) return;
    const sp = this.skeleton.geometry.getAttribute('position') as THREE.BufferAttribute;
    BONES.forEach(([a, b], i) => {
      sp.setXYZ(i * 2, px[a * 2], px[a * 2 + 1], 0);
      sp.setXYZ(i * 2 + 1, px[b * 2], px[b * 2 + 1], 0);
    });
    sp.needsUpdate = true;
    const jp = this.joints.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < 21; i++) jp.setXYZ(i, px[i * 2], px[i * 2 + 1], 0);
    jp.needsUpdate = true;
  }

  start() {
    this.clearRound();
    this.ended = false;
    this.resume();
  }

  resume() {
    if (this.running || this.ended) return;
    this.running = true;
    this.lastT = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - this.lastT) / 1000);
      this.lastT = now;
      this.update(dt);
      this.render();
    };
    this.raf = requestAnimationFrame(loop);
  }

  pause() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.charging = false;
    this.charge = 0;
    this.wasDown = this.input.down;
    chargeHum(null);
  }

  /** Starts a charge now, so a tap shorter than a frame still shoots. */
  press() {
    if (!this.running || this.charging) return;
    this.input.down = true;
    this.wasDown = true;
    this.charging = true;
    this.charge = 0;
  }

  /** Drops a charge without shooting (the hand left the camera). */
  cancelCharge() {
    if (!this.charging) return;
    this.charging = false;
    this.charge = 0;
    this.input.down = false;
    this.wasDown = false;
    chargeHum(null);
  }

  /** Ends the round now (e.g. the player quits); fires onEnd. */
  finish() { this.endRound(); }

  dispose() {
    this.pause();
    this.ended = true;
    this.disposed = true;
    this.clearRound();
    Object.values(this.tex).forEach((t) => t.dispose());
    Object.values(this.geo).forEach((g) => g.dispose());
    if (this.iconGeo?.own) { this.iconGeo.bolt.dispose(); this.iconGeo.gear.dispose(); }
    [this.glow, this.reticle, this.emitter, this.emitterGlow, ...this.waves.map((w) => w.s)].forEach((s) => s.material.dispose());
    this.skeleton.geometry.dispose();
    (this.skeleton.material as THREE.Material).dispose();
    this.joints.geometry.dispose();
    (this.joints.material as THREE.Material).dispose();
    this.particles.geometry.dispose();
    (this.particles.material as THREE.Material).dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }

  // ---------------------------------------------------------------- round

  private clearRound() {
    this.glyphs.forEach((g) => this.removeGlyph(g));
    this.glyphs = [];
    if (this.boss) this.removeGlyph(this.boss);
    this.boss = null;
    this.arcs.forEach((a) => { this.fx.remove(a.mesh); a.mesh.geometry.dispose(); a.mat.dispose(); });
    this.arcs = [];
    this.pLife.fill(0);
    for (let i = 0; i < MAX_PARTICLES; i++) this.pPos[i * 3 + 2] = -100;
    this.particles.geometry.getAttribute('position').needsUpdate = true;
    Object.assign(this, { t: 0, spawnIn: 0.6, score: 0, energy: 100, shots: 0, hits: 0, seq: 0, sets: 0, streak: 0, bestStreak: 0, glitchHits: 0, bossDown: false, charge: 0, charging: false, shake: 0, hudAt: 0, bossSpawnIn: 0 });
    this.wasDown = this.input.down;
    this.popLayer.replaceChildren();
  }

  private endRound() {
    if (this.ended) return;
    this.pause();
    this.ended = true;
    chargeHum(null);
    if (!this.bossDown) playBolt('end');
    this.emitHud(true);
    this.cb.onEnd({
      score: Math.max(0, Math.round(this.score)), shots: this.shots, hits: this.hits,
      accuracy: this.shots ? this.hits / this.shots : 0, sets: this.sets, bossDown: this.bossDown,
      bestStreak: this.bestStreak, glitches: this.glitchHits,
    });
  }

  // --------------------------------------------------------------- update

  private update(dt: number) {
    this.t += dt;
    const timeLeft = ROUND_SECONDS - this.t;
    if (timeLeft <= 0) { this.endRound(); return; }
    this.energy = Math.min(100, this.energy + ENERGY_REGEN * dt);

    // spawns
    if (this.t >= BOSS_AT && !this.boss && !this.bossDown) this.spawnBoss();
    this.spawnIn -= dt;
    const cap = this.boss ? 4 : Math.min(8, 5 + Math.floor(this.t / 18));
    if (this.spawnIn <= 0 && this.glyphs.length < cap) {
      this.spawnGlyph();
      this.spawnIn = this.boss ? rand(1.2, 1.8) : rand(0.65, 1.15) - Math.min(0.3, this.t / 200);
    }

    // input → charge / fire
    const inp = this.input;
    if (inp.down && !this.wasDown) { this.charging = true; this.charge = 0; }
    if (this.charging) {
      if (inp.down) { this.charge = Math.min(1, this.charge + dt / CHARGE_TIME); chargeHum(this.charge); }
      else { this.charging = false; chargeHum(null); this.fire(inp.x, inp.y, this.charge); this.charge = 0; }
    }
    this.wasDown = inp.down;

    this.updateGlyphs(dt);
    this.updateFx(dt);
    if (performance.now() - this.hudAt > 100) this.emitHud();
  }

  private emitHud(force = false) {
    this.hudAt = performance.now();
    void force;
    this.cb.onHud({
      score: Math.max(0, Math.round(this.score)), timeLeft: Math.max(0, ROUND_SECONDS - this.t), energy: this.energy,
      shots: this.shots, hits: this.hits, seq: this.seq, mult: this.mult(), charge: this.charge,
      boss: this.boss ? this.boss.hp / BOSS_HP : null,
    });
  }

  private mult() { return Math.min(3, 1 + Math.floor(this.streak / 5) * 0.5); }

  // ---------------------------------------------------------------- world

  private depthBox(z: number) {
    const hh = TAN * z;
    return { hw: hh * this.camera.aspect, hh };
  }

  private spawnGlyph() {
    const r = Math.random();
    const glitchP = 0.14 + Math.min(0.12, this.t / 500) + (this.boss ? 0.15 : 0);
    let kind: GlyphKind;
    if (r < glitchP) kind = 'glitch';
    else if (r < glitchP + 0.14) kind = 'gear';
    else if (r < glitchP + 0.25) kind = 'crystal';
    else kind = 'pillar';
    let pillar = 0;
    if (kind === 'pillar') {
      const nextShown = this.glyphs.some((g) => g.kind === 'pillar' && g.pillar === this.seq);
      pillar = !nextShown && Math.random() < 0.6 ? this.seq : Math.floor(Math.random() * 6);
    }
    const z = rand(6, 9);
    const { hw, hh } = this.depthBox(z);
    const pos = new THREE.Vector3(rand(-hw * 0.8, hw * 0.8), rand(-hh * 0.42, hh * 0.62), -z);
    this.glyphs.push(this.makeGlyph(kind, pillar, pos));
  }

  private makeGlyph(kind: GlyphKind, pillar: number, pos: THREE.Vector3): Glyph {
    const group = new THREE.Group();
    const mats: THREE.Material[] = [];
    const add = (m: THREE.Mesh) => { group.add(m); mats.push(m.material as THREE.Material); return m; };
    const additive = (color: THREE.ColorRepresentation, opacity = 1) =>
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    let color = new THREE.Color(0x00ddff);
    let radius = 0.7;
    let ring: THREE.Mesh | undefined;
    if (kind === 'pillar') {
      const p = PILLARS[pillar];
      color = new THREE.Color(p.color);
      add(new THREE.Mesh(this.geo.plane, new THREE.MeshBasicMaterial({ map: this.tex[p.slug], transparent: true, depthWrite: false })));
      ring = add(new THREE.Mesh(this.geo.ring, additive(p.glow, 0.9)));
      add(new THREE.Mesh(this.geo.ringOuter, additive(p.glow, 0.25)));
    } else if (kind === 'gear') {
      color = new THREE.Color(0xfdcc0d);
      radius = 0.78;
      add(new THREE.Mesh(this.geo.gear, new THREE.MeshStandardMaterial({ color: 0xfdcc0d, metalness: 0.55, roughness: 0.32, emissive: 0x3a2a00 })));
      ring = add(new THREE.Mesh(this.geo.ringOuter, additive(0xfdcc0d, 0.6)));
    } else if (kind === 'crystal') {
      radius = 0.55;
      add(new THREE.Mesh(this.geo.crystal, new THREE.MeshStandardMaterial({ color: 0x7ff0ff, emissive: 0x0090b0, metalness: 0.1, roughness: 0.15, flatShading: true, transparent: true, opacity: 0.92 })));
      ring = add(new THREE.Mesh(this.geo.ring, additive(0x00ddff, 0.5)));
      ring.scale.setScalar(0.85);
    } else {
      color = new THREE.Color(0xff2e4d);
      radius = 0.62;
      add(new THREE.Mesh(this.geo.plane, new THREE.MeshBasicMaterial({ map: this.tex.glitch, transparent: true, depthWrite: false })));
    }
    group.position.copy(pos);
    group.scale.setScalar(0.01);
    this.scene.add(group);
    return {
      kind, pillar, obj: group, mats, ring, pos: pos.clone(), vel: new THREE.Vector2(rand(-0.45, 0.45), rand(-0.12, 0.12)),
      radius, age: 0, life: kind === 'glitch' ? rand(5, 7) : rand(6.5, 9), phase: rand(0, Math.PI * 2), dying: 0, hp: 1, color,
    };
  }

  private spawnBoss() {
    const group = new THREE.Group();
    const mats: THREE.Material[] = [];
    const icon = this.iconGeo ?? { bolt: boltGeometry(0.8, 0.18), gear: gearGeometry(0.5, 0.38, 10, 0.16, 0.16), own: true };
    if (!this.iconGeo) this.iconGeo = icon;
    const gearMat = new THREE.MeshStandardMaterial({ color: 0x32527b, metalness: 0.7, roughness: 0.3, emissive: 0x06223a });
    const boltMat = new THREE.MeshStandardMaterial({ color: 0xfdcc0d, metalness: 0.4, roughness: 0.25, emissive: 0x5a4200 });
    group.add(new THREE.Mesh(icon.gear, gearMat), new THREE.Mesh(icon.bolt, boltMat));
    const halo = new THREE.Mesh(this.geo.ringOuter, new THREE.MeshBasicMaterial({ color: 0x00ddff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    halo.scale.setScalar(0.62);
    group.add(halo);
    mats.push(gearMat, boltMat, halo.material as THREE.Material);
    const pos = new THREE.Vector3(0, 0.6, -7.5);
    group.position.copy(pos);
    group.scale.setScalar(0.01);
    this.scene.add(group);
    this.boss = { kind: 'boss', pillar: 0, obj: group, mats, ring: halo, pos, vel: new THREE.Vector2(), radius: 1.35, age: 0, life: 1e9, phase: 0, dying: 0, hp: BOSS_HP, color: new THREE.Color(0xfdcc0d) };
    playBolt('boss');
    this.cb.onToast(this.es ? '¡Llegó el Jefe SGX! Derríbalo' : 'The SGX Boss is here! Take it down', 'yellow');
    this.cb.onFlash('yellow');
  }

  private removeGlyph(g: Glyph) {
    this.scene.remove(g.obj);
    g.mats.forEach((m) => m.dispose());
  }

  private updateGlyphs(dt: number) {
    const keep: Glyph[] = [];
    for (const g of this.glyphs) {
      g.age += dt;
      if (g.dying > 0) {
        g.dying -= dt;
        if (g.dying <= 0) { this.removeGlyph(g); continue; }
      }
      const z = -g.pos.z;
      const { hw, hh } = this.depthBox(z);
      g.pos.x += g.vel.x * dt;
      g.pos.y += g.vel.y * dt;
      if (Math.abs(g.pos.x) > hw * 0.85) g.vel.x = -Math.sign(g.pos.x) * Math.abs(g.vel.x);
      if (g.pos.y > hh * 0.65 || g.pos.y < -hh * 0.45) g.vel.y = -Math.sign(g.pos.y) * Math.abs(g.vel.y);
      const bob = Math.sin(g.age * 1.6 + g.phase) * 0.12;
      g.obj.position.set(g.pos.x, g.pos.y + bob, g.pos.z);
      const fadeOut = Math.min(1, (g.life - g.age) / 0.6);
      const s = Math.min(1, g.age / 0.35) * (g.dying > 0 ? 1 + (0.25 - g.dying) * 4 : 1);
      g.obj.scale.setScalar(Math.max(0.01, s * Math.max(0, fadeOut)) * this.k);
      if (g.kind === 'gear') g.obj.rotation.z += dt * 1.2;
      else if (g.kind === 'crystal') { g.obj.rotation.y += dt * 1.6; g.obj.rotation.x = Math.sin(g.age) * 0.3; }
      else if (g.kind === 'pillar') g.obj.rotation.y = Math.sin(g.age * 0.9 + g.phase) * 0.35;
      if (g.kind === 'glitch' && !this.reduced) {
        g.obj.position.x += (Math.random() - 0.5) * 0.06;
        g.obj.rotation.z = Math.random() < 0.08 ? rand(-0.2, 0.2) : 0;
      }
      if (g.ring) {
        const next = g.kind === 'pillar' && g.pillar === this.seq;
        g.ring.scale.setScalar(next ? 1 + Math.sin(this.t * 7) * 0.08 : g.kind === 'crystal' ? 0.85 : 1);
        (g.ring.material as THREE.MeshBasicMaterial).opacity = next ? 1 : g.kind === 'gear' ? 0.35 + this.charge * 0.6 : 0.6;
        if (g.kind === 'pillar') g.ring.rotation.z = this.t * (next ? 1.5 : 0.4);
      }
      if (g.age >= g.life) { this.removeGlyph(g); continue; }
      keep.push(g);
    }
    this.glyphs = keep;

    // glitch texture flicker
    this.glitchTick -= dt;
    if (this.glitchTick <= 0) {
      this.glitchTick = this.reduced ? 0.6 : 0.12;
      drawGlitch(this.glitchCanvas.getContext('2d')!, 128);
      this.tex.glitch.needsUpdate = true;
    }

    const b = this.boss;
    if (b) {
      b.age += dt;
      const { hw } = this.depthBox(7.5);
      const p = b.age * (1 + (1 - b.hp / BOSS_HP) * 0.6);
      b.pos.set(Math.sin(p * 0.55) * hw * 0.55, 0.5 + Math.sin(p * 0.9) * 0.7, -7.5);
      b.obj.position.copy(b.pos);
      if (b.dying > 0) {
        b.dying -= dt;
        b.obj.scale.setScalar(Math.max(0.01, 2.5 * this.k * (1 + (0.6 - b.dying))));
        b.obj.rotation.z += dt * 8;
        if (b.dying <= 0) { this.removeGlyph(b); this.boss = null; this.endRound(); return; }
      } else {
        b.obj.scale.setScalar(Math.min(1, b.age / 0.9) * 2.5 * this.k);
        b.obj.rotation.y = Math.sin(b.age * 0.8) * 0.5;
        b.obj.children[0].rotation.z += dt * 0.6;
      }
      const hitFlash = Math.max(0, b.phase);
      b.phase = Math.max(0, b.phase - dt * 4);
      (b.mats[1] as THREE.MeshStandardMaterial).emissive.setRGB(0.35 + hitFlash, 0.26 + hitFlash, hitFlash * 0.6);
      this.bossSpawnIn -= dt;
      if (this.bossSpawnIn <= 0 && b.dying <= 0) {
        this.bossSpawnIn = rand(2.2, 3.2);
        if (this.glyphs.length < 6) {
          const off = new THREE.Vector3(rand(-1.8, 1.8), rand(-1.4, 1), rand(-0.5, 1.5));
          this.glyphs.push(this.makeGlyph(Math.random() < 0.6 ? 'glitch' : 'crystal', 0, b.pos.clone().add(off)));
        }
      }
    }
  }

  // ----------------------------------------------------------------- shots

  private screenOf(v: THREE.Vector3, out = new THREE.Vector2()) {
    const p = v.clone().project(this.camera);
    return out.set((p.x + 1) * 0.5 * this.w, (1 - p.y) * 0.5 * this.h);
  }

  private pxPerUnit(z: number) { return this.h / (2 * TAN * Math.abs(z)); }

  private fire(x: number, y: number, charge: number) {
    const big = charge >= CHARGE_MIN;
    const cost = big ? SHOT_COST.charged : SHOT_COST.quick;
    if (this.energy < cost) {
      playBolt('fizzle');
      this.cb.onToast(this.es ? 'Sin energía: espera un momento' : 'Out of energy: wait a moment', 'alert');
      return;
    }
    this.energy -= cost;
    this.shots++;
    playBolt(big ? 'zapBig' : 'zap');

    const assist = this.input.present ? 26 : 12;
    const reach = big ? 30 + charge * 40 : 0;
    const candidates = [...this.glyphs, ...(this.boss && this.boss.dying <= 0 ? [this.boss] : [])].filter((g) => g.dying <= 0 && g.age > 0.15);
    let best: Glyph | null = null;
    let bestD = Infinity;
    const tmp = new THREE.Vector2();
    for (const g of candidates) {
      const s = this.screenOf(g.obj.position, tmp);
      const r = g.radius * this.pxPerUnit(g.pos.z) * (g.kind === 'boss' ? this.k : g.obj.scale.x);
      const d = Math.hypot(s.x - x, s.y - y) - r - assist - reach;
      if (d < 0 && d < bestD) { bestD = d; best = g; }
    }
    const from = new THREE.Vector2(this.emitter.position.x, this.emitter.position.y - this.emitter.scale.y * 0.3);
    const to = best ? this.screenOf(best.obj.position) : new THREE.Vector2(x, y);
    this.addArc(from, to, big);
    if (!best) {
      this.streak = 0;
      this.wave(to, 60, 0x00ddff);
      return;
    }
    this.strike(best, big, to);
    // a full charge chains to the nearest other glyph
    if (big && charge >= 0.98 && best.kind !== 'glitch') {
      let chain: Glyph | null = null;
      let cd = 280;
      for (const g of candidates) {
        if (g === best || g.dying > 0 || g.kind === 'glitch') continue;
        const d = this.screenOf(g.obj.position, tmp).distanceTo(to);
        if (d < cd) { cd = d; chain = g; }
      }
      if (chain) {
        const cto = this.screenOf(chain.obj.position);
        this.addArc(to.clone(), cto, false);
        this.strike(chain, true, cto, true);
      }
    }
  }

  private strike(g: Glyph, big: boolean, at: THREE.Vector2, chained = false) {
    const es = this.es;
    if (g.kind === 'glitch') {
      this.glitchHits++;
      this.streak = 0;
      this.score = Math.max(0, this.score - POINTS.glitch);
      this.energy = Math.max(0, this.energy - 25);
      this.kill(g, 0.25);
      this.pop(at, `−${POINTS.glitch}`, 'alert');
      this.cb.onToast(es ? 'Glitch: −25 de energía' : 'Glitch: −25 energy', 'alert');
      this.cb.onFlash('alert');
      this.shake = 0.35;
      playBolt('glitch');
      return;
    }
    if (g.kind === 'gear' && !big) {
      if (!chained) this.streak = 0;
      g.vel.x *= -1.4;
      this.burst(g.obj.position, g.color, 10, 1.5);
      this.pop(at, es ? '¡Carga!' : 'Charge!', 'yellow');
      playBolt('clank');
      return;
    }
    if (!chained) this.hits++;
    this.streak++;
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    const m = this.mult();
    if (g.kind === 'boss') {
      g.hp -= big ? 3 : 1;
      g.phase = 1;
      this.burst(g.obj.position, big ? new THREE.Color(0xfdcc0d) : new THREE.Color(0x00ddff), big ? 40 : 18, 2.2);
      this.score += POINTS.bossHit * m;
      this.pop(at, `+${Math.round(POINTS.bossHit * m)}`, 'yellow');
      playBolt('hit');
      this.shake = 0.2;
      if (g.hp <= 0) {
        const bonus = POINTS.bossDown + Math.round((ROUND_SECONDS - this.t) * 25);
        this.score += bonus;
        this.bossDown = true;
        g.dying = 0.6;
        this.burst(g.obj.position, new THREE.Color(0xfdcc0d), 160, 4.5);
        this.burst(g.obj.position, new THREE.Color(0x00ddff), 120, 3.5);
        this.wave(at, 420, 0xfdcc0d);
        this.pop(at, `+${bonus}`, 'yellow', true);
        this.cb.onToast(es ? '¡Jefe SGX derribado!' : 'SGX Boss down!', 'yellow');
        this.cb.onFlash('yellow');
        playBolt('bossDown');
        this.shake = 0.6;
      }
      return;
    }
    let pts = POINTS[g.kind] as number;
    if (g.kind === 'gear') { this.cb.onFlash('yellow'); }
    if (g.kind === 'crystal') {
      this.energy = Math.min(100, this.energy + 15);
      this.pop(new THREE.Vector2(at.x, at.y + 26), es ? '+15 energía' : '+15 energy', 'cyan');
    }
    if (g.kind === 'pillar') {
      if (g.pillar === this.seq) {
        pts += POINTS.pillarInOrder;
        this.seq++;
        if (this.seq === 6) {
          this.seq = 0;
          this.sets++;
          pts += POINTS.sixPillars;
          this.cb.onToast(es ? '¡Los 6 pilares en orden! +600' : 'All 6 pillars in order! +600', 'yellow');
          this.cb.onFlash('cyan');
          playBolt('combo');
        } else playBolt('pillar');
      } else {
        this.seq = g.pillar === 0 ? 1 : 0;
        playBolt('hit');
      }
    } else playBolt('hit');
    this.score += pts * m;
    this.pop(at, `+${Math.round(pts * m)}`, g.kind === 'gear' ? 'yellow' : 'cyan');
    this.kill(g, 0.25);
    if (this.streak > 0 && this.streak % 5 === 0 && this.mult() > 1) this.cb.onToast(`${es ? 'Racha' : 'Streak'} ×${this.mult()}`, 'cyan');
  }

  private kill(g: Glyph, dur: number) {
    g.dying = dur;
    this.burst(g.obj.position, g.color, g.kind === 'gear' ? 70 : 46, g.kind === 'gear' ? 3 : 2.4);
    this.wave(this.screenOf(g.obj.position), g.radius * this.pxPerUnit(g.pos.z) * 2.6, g.color.getHex());
  }

  // -------------------------------------------------------------- effects

  private burst(at: THREE.Vector3, color: THREE.Color, n: number, speed: number) {
    const count = this.reduced ? Math.ceil(n / 3) : n;
    for (let k = 0; k < count; k++) {
      const i = this.pNext;
      this.pNext = (this.pNext + 1) % MAX_PARTICLES;
      const th = Math.random() * Math.PI * 2, ph = Math.acos(rand(-1, 1)), v = speed * rand(0.35, 1);
      this.pPos.set([at.x, at.y, at.z], i * 3);
      this.pVel.set([Math.sin(ph) * Math.cos(th) * v, Math.sin(ph) * Math.sin(th) * v, Math.cos(ph) * v * 0.6], i * 3);
      const white = Math.random() < 0.25;
      this.pBase.set(white ? [1, 1, 1] : [color.r, color.g, color.b], i * 3);
      this.pLife[i] = rand(0.5, 1.1);
    }
  }

  private wave(at: THREE.Vector2, size: number, color: number) {
    const w = this.waves.find((x) => x.age >= x.life) ?? this.waves[0];
    w.age = 0;
    w.life = 0.4;
    w.size = size;
    w.s.visible = true;
    w.s.position.set(at.x, at.y, 0);
    w.s.material.color.setHex(color);
  }

  private pop(at: THREE.Vector2, text: string, tone: 'cyan' | 'yellow' | 'alert', big = false) {
    const el = document.createElement('span');
    el.className = `sgx-bolt__pop is-${tone}${big ? ' is-big' : ''}`;
    el.textContent = text;
    el.style.left = `${at.x}px`;
    el.style.top = `${at.y}px`;
    this.popLayer.appendChild(el);
    window.setTimeout(() => el.remove(), 900);
  }

  private addArc(from: THREE.Vector2, to: THREE.Vector2, big: boolean) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ARC_VERTS * 3), 3));
    const side = new Float32Array(ARC_VERTS);
    for (let i = 0; i < ARC_VERTS; i++) side[i] = i % 2 ? 1 : -1;
    geo.setAttribute('side', new THREE.BufferAttribute(side, 1));
    const idx: number[] = [];
    const strip = (start: number, n: number) => {
      for (let i = 0; i < n - 1; i++) {
        const a = (start + i) * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    };
    strip(0, ARC_POINTS);
    strip(ARC_POINTS, BRANCH_POINTS);
    strip(ARC_POINTS + BRANCH_POINTS, BRANCH_POINTS);
    geo.setIndex(idx);
    const mat = new THREE.ShaderMaterial({
      vertexShader: ARC_VERT, fragmentShader: ARC_FRAG, transparent: true, depthTest: false, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uColor: { value: new THREE.Color(big ? 0xfdcc0d : 0x00ddff) }, uAlpha: { value: 1 } },
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    this.fx.add(mesh);
    const arc: Arc = { mesh, mat, from, to, age: 0, life: big ? 0.38 : 0.24, big, jitter: 0 };
    this.shapeArc(arc);
    this.arcs.push(arc);
  }

  /** Midpoint-displaced zigzag from → to, plus two short branches, as ribbons. */
  private shapeArc(a: Arc) {
    const pos = a.mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
    const len = a.from.distanceTo(a.to);
    const pts: THREE.Vector2[] = [a.from.clone(), a.to.clone()];
    let rough = len * 0.22;
    while (pts.length < ARC_POINTS) {
      for (let i = pts.length - 1; i > 0; i--) {
        const p = pts[i - 1], q = pts[i];
        const mid = p.clone().add(q).multiplyScalar(0.5);
        const n = new THREE.Vector2(-(q.y - p.y), q.x - p.x).normalize();
        mid.addScaledVector(n, (Math.random() - 0.5) * rough);
        pts.splice(i, 0, mid);
      }
      rough *= 0.55;
    }
    const width = a.big ? 15 : 9;
    const writeStrip = (start: number, line: THREE.Vector2[], w0: number) => {
      for (let i = 0; i < line.length; i++) {
        const p = line[i];
        const prev = line[Math.max(0, i - 1)], next = line[Math.min(line.length - 1, i + 1)];
        const n = new THREE.Vector2(-(next.y - prev.y), next.x - prev.x).normalize();
        const taper = 0.35 + 0.65 * Math.sin((i / (line.length - 1)) * Math.PI * 0.5 + Math.PI * 0.5 * (i / (line.length - 1)));
        const w = w0 * taper * 0.5;
        pos.setXYZ((start + i) * 2, p.x + n.x * w, p.y + n.y * w, 0);
        pos.setXYZ((start + i) * 2 + 1, p.x - n.x * w, p.y - n.y * w, 0);
      }
    };
    writeStrip(0, pts.slice(0, ARC_POINTS), width);
    for (let b = 0; b < 2; b++) {
      const startIdx = Math.floor(rand(0.3, 0.75) * (ARC_POINTS - 1));
      const origin = pts[startIdx];
      const dir = pts[startIdx + 1].clone().sub(origin).normalize().rotateAround(new THREE.Vector2(), (b ? 1 : -1) * rand(0.4, 0.9));
      const bl = len * rand(0.12, 0.22);
      const line: THREE.Vector2[] = [];
      for (let i = 0; i < BRANCH_POINTS; i++) {
        const f = i / (BRANCH_POINTS - 1);
        line.push(origin.clone().addScaledVector(dir, f * bl).add(new THREE.Vector2(rand(-1, 1), rand(-1, 1)).multiplyScalar(bl * 0.06 * f)));
      }
      writeStrip(ARC_POINTS + b * BRANCH_POINTS, line, width * 0.45);
    }
    pos.needsUpdate = true;
  }

  private updateFx(dt: number) {
    // arcs: flicker + fade
    this.arcs = this.arcs.filter((a) => {
      a.age += dt;
      if (a.age >= a.life) { this.fx.remove(a.mesh); a.mesh.geometry.dispose(); a.mat.dispose(); return false; }
      a.jitter -= dt;
      if (a.jitter <= 0 && !this.reduced) { a.jitter = 0.035; this.shapeArc(a); }
      const k = 1 - a.age / a.life;
      a.mat.uniforms.uAlpha.value = k * (0.7 + Math.random() * 0.3);
      return true;
    });

    // particles
    const drag = Math.exp(-2.4 * dt);
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (this.pLife[i] <= 0) continue;
      this.pLife[i] -= dt;
      const j = i * 3;
      if (this.pLife[i] <= 0) { this.pPos[j + 2] = -100; this.pCol.fill(0, j, j + 3); continue; }
      this.pVel[j] *= drag; this.pVel[j + 1] = this.pVel[j + 1] * drag - dt * 0.8; this.pVel[j + 2] *= drag;
      this.pPos[j] += this.pVel[j] * dt; this.pPos[j + 1] += this.pVel[j + 1] * dt; this.pPos[j + 2] += this.pVel[j + 2] * dt;
      const f = Math.min(1, this.pLife[i] * 1.6);
      this.pCol[j] = this.pBase[j] * f; this.pCol[j + 1] = this.pBase[j + 1] * f; this.pCol[j + 2] = this.pBase[j + 2] * f;
    }
    this.particles.geometry.getAttribute('position').needsUpdate = true;
    this.particles.geometry.getAttribute('color').needsUpdate = true;

    for (const w of this.waves) {
      if (w.age >= w.life) { w.s.visible = false; continue; }
      w.age += dt;
      const k = w.age / w.life;
      const s = w.size * (0.4 + k * 0.9);
      w.s.scale.set(s, s, 1);
      w.s.material.opacity = (1 - k) * 0.9;
    }

    // reticle, charge glow, emitter
    const inp = this.input;
    const charged = this.charge >= CHARGE_MIN;
    this.reticle.visible = inp.present || inp.down;
    this.reticle.position.set(inp.x, inp.y, 0);
    const rs = 46 - this.charge * 12;
    this.reticle.scale.set(rs, rs, 1);
    this.reticle.material.rotation += dt * (1 + this.charge * 6);
    this.reticle.material.color.setHex(charged ? 0xfdcc0d : 0x00ddff);
    this.glow.position.set(inp.x, inp.y, 0);
    const gs = this.charging ? 40 + this.charge * 150 + (charged ? Math.sin(this.t * 40) * 8 : 0) : 0;
    this.glow.scale.set(gs, gs, 1);
    this.glow.material.opacity = this.charging ? 0.5 + this.charge * 0.5 : 0;
    this.glow.material.color.setHex(charged ? 0xfdcc0d : 0x00ddff);
    this.emitterGlow.material.opacity = 0.25 + this.charge * 0.65 + (this.arcs.length ? 0.3 : 0);
    const es = this.emitter.scale.x * 3.2 * (1 + this.charge * 0.5);
    this.emitterGlow.scale.set(es, es, 1);

    if (this.shake > 0 && !this.reduced) {
      this.shake = Math.max(0, this.shake - dt);
      this.camera.position.set((Math.random() - 0.5) * this.shake * 0.25, (Math.random() - 0.5) * this.shake * 0.25, 0);
    } else this.camera.position.set(0, 0, 0);
  }

  private render() {
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    this.renderer.clearDepth();
    this.renderer.render(this.fx, this.ortho);
  }
}

const BONES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];
