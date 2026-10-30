import * as THREE from 'three';
import { SGX_PILLARS } from '../../../../lib/sgxPillars';

/* Torre de Pilares engine: Three.js scene + rules. A slab slides over the top
   of the tower; dropping it slices whatever hangs over (the slice falls with a
   simple tween physics). Slabs wear the SGX Tile Lab textures of the 6 pillars
   in the official order; power slabs (gear, G gear, bolt, night bolt, shield)
   show up every few floors. UVs are laid out in world units so the tile keeps
   the same scale on every slab and slices keep their pattern. */

export const PILLARS = SGX_PILLARS.map((p) => ({ key: p.key, name: p.name, color: p.color, slug: p.slug }));

export type PowerKind = 'gear' | 'magnet' | 'slow' | 'double' | 'shield';

export const POWERS: Record<PowerKind, { tex: string; color: string; mark: string }> = {
  gear: { tex: 'engranajes-sgx', color: '#FDCC0D', mark: '/holo/gear.png' },
  magnet: { tex: 'engranaje-g', color: '#FFB347', mark: '/holo/gearG.png' },
  slow: { tex: 'rayos-sgx', color: '#00DDFF', mark: '/holo/bolt.png' },
  double: { tex: 'rayos-nocturnos', color: '#FFE45C', mark: '/holo/bolt.png' },
  shield: { tex: 'escudo-de-energia', color: '#8FF3FF', mark: '' },
};

/** How many floors each timed power lasts. */
export const POWER_SPAN = { magnet: 2, slow: 4, double: 5 } as const;

export type Skin = { kind: 'pillar'; index: number } | { kind: 'power'; power: PowerKind };

export interface StackHud {
  score: number;
  height: number;
  combo: number;
  perfects: number;
  /** Clean pillars in a row in the official order (0–5). */
  chain: number;
  current: Skin | null;
  magnet: number;
  slow: number;
  double: number;
  shield: boolean;
}

export type StackPopKind = 'perfect' | 'pillars' | 'power' | 'shield_used' | 'grow';
export interface StackPop { kind: StackPopKind; power?: PowerKind; combo?: number; points?: number }

export interface StackSummary {
  score: number;
  height: number;
  perfects: number;
  maxCombo: number;
  bonus: number;
  sixPillars: number;
  powers: number;
}

export type StackSound = 'drop' | 'perfect' | 'cut' | 'miss' | 'power' | 'pillars' | 'shield' | 'grow' | 'over';

interface Options {
  reducedMotion: boolean;
  onHud: (hud: StackHud) => void;
  onPop: (pop: StackPop) => void;
  onOver: (summary: StackSummary) => void;
  onSound: (sound: StackSound, combo: number) => void;
}

interface Slab {
  mesh: THREE.Mesh;
  edges: THREE.LineSegments;
  w: number;
  d: number;
  x: number;
  z: number;
  y: number;
  /** Texture origin, fixed when the slab spawns so slices keep the pattern. */
  ux: number;
  uz: number;
  skin: Skin;
}

interface Falling { slab: Slab; vel: THREE.Vector3; spin: THREE.Vector3; life: number }
interface Burst { points: THREE.Points; vel: Float32Array; life: number; max: number }
interface Ring { line: THREE.LineLoop; life: number }

const H = 0.6;
const BASE = 3.2;
const TILE = 1.6;
const RANGE = 5.2;
const PERFECT = 0.12;
const TEX = '/pilot/tex/';

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const randInt = (a: number, b: number) => Math.floor(rand(a, b + 1));

/** Box with UVs in world units (tile = TILE) offset by the slab's texture origin. */
function slabGeometry(w: number, d: number, ux: number, uy: number, uz: number): THREE.BoxGeometry {
  const g = new THREE.BoxGeometry(w, H, d);
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + ux;
    const y = pos.getY(i) + uy;
    const z = pos.getZ(i) + uz;
    const nx = nor.getX(i);
    const ny = nor.getY(i);
    if (Math.abs(nx) > 0.5) uv.setXY(i, (nx > 0 ? -z : z) / TILE, y / TILE);
    else if (Math.abs(ny) > 0.5) uv.setXY(i, x / TILE, -z / TILE);
    else uv.setXY(i, (nor.getZ(i) > 0 ? x : -x) / TILE, y / TILE);
  }
  uv.needsUpdate = true;
  return g;
}

function tileTexture(name: string, tint: string | null, strength: number, aniso: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 160;
  const g = c.getContext('2d')!;
  g.fillStyle = '#16181c';
  g.fillRect(0, 0, 160, 160);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = aniso;
  const img = new Image();
  img.onload = () => {
    g.drawImage(img, 0, 0, 160, 160);
    if (tint) {
      g.globalCompositeOperation = 'screen';
      g.globalAlpha = strength;
      g.fillStyle = tint;
      g.fillRect(0, 0, 160, 160);
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
    }
    tex.needsUpdate = true;
  };
  img.src = TEX + name + '.png';
  return tex;
}

/** Floating badge over a power slab: clipped plate + SGX mark. */
function badgeTexture(kind: PowerKind): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const color = POWERS[kind].color;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const plate = () => {
    g.clearRect(0, 0, 128, 128);
    g.beginPath();
    g.moveTo(22, 6); g.lineTo(122, 6); g.lineTo(122, 106); g.lineTo(106, 122); g.lineTo(6, 122); g.lineTo(6, 22); g.closePath();
    g.fillStyle = 'rgba(5,5,5,0.86)';
    g.fill();
    g.lineWidth = 5;
    g.strokeStyle = color;
    g.stroke();
  };
  const label = (text: string) => {
    g.font = '700 30px "Chakra Petch", monospace';
    g.textAlign = 'right';
    g.fillStyle = color;
    g.fillText(text, 114, 112);
  };
  plate();
  if (kind === 'shield') {
    g.beginPath();
    g.moveTo(64, 24); g.lineTo(98, 36); g.lineTo(96, 66); g.quadraticCurveTo(90, 92, 64, 106); g.quadraticCurveTo(38, 92, 32, 66); g.lineTo(30, 36); g.closePath();
    g.lineWidth = 7;
    g.strokeStyle = color;
    g.stroke();
    g.fillStyle = 'rgba(143,243,255,0.25)';
    g.fill();
  } else {
    const img = new Image();
    img.onload = () => {
      plate();
      const s = kind === 'double' || kind === 'slow' ? 70 : 84;
      g.drawImage(img, 64 - s / 2 - (s === 70 ? 8 : 0), 60 - s / 2 - (s === 70 ? 4 : 0), s, s);
      if (kind === 'double') label('x2');
      if (kind === 'slow') label('½');
      tex.needsUpdate = true;
    };
    img.src = POWERS[kind].mark;
  }
  return tex;
}

export class StackEngine {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 200);
  private sun = new THREE.DirectionalLight(0xffffff, 2.1);
  private opts: Options;
  private raf = 0;
  private last = 0;
  private aspect = 1;
  private view = 14;
  private viewNow = 14;
  private camY = 2;
  private side = 0;

  private pillarMats: THREE.MeshStandardMaterial[] = [];
  private powerMats = {} as Record<PowerKind, THREE.MeshStandardMaterial>;
  private edgeMats = new Map<string, THREE.LineBasicMaterial>();
  private badges = {} as Record<PowerKind, THREE.SpriteMaterial>;
  private badge: THREE.Sprite;
  private disposables: { dispose: () => void }[] = [];

  private slabs: Slab[] = [];
  private falling: Falling[] = [];
  private bursts: Burst[] = [];
  private rings: Ring[] = [];
  private cur: Slab | null = null;
  private axis: 'x' | 'z' = 'x';
  private dir = 1;
  private topSlab = { w: BASE, d: BASE, x: 0, z: 0 };

  private phase: 'idle' | 'playing' | 'over' = 'idle';
  private paused = false;
  private time = 0;
  private n = 0;
  private score = 0;
  private combo = 0;
  private maxCombo = 0;
  private perfects = 0;
  private bonus = 0;
  private chain = 0;
  private cycle = 0;
  private sixPillars = 0;
  private powersUsed = 0;
  private nextPower = 5;
  private magnet = 0;
  private slow = 0;
  private double = 0;
  private shield = false;
  private overTimer = 0;
  private shake = 0;

  constructor(canvas: HTMLCanvasElement, opts: Options) {
    this.opts = opts;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.setClearColor(0x000000, 0);
    const aniso = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());

    for (const p of PILLARS) {
      const map = tileTexture('sgx-' + p.slug, p.color, p.key === 'STORY' ? 0.42 : 0.3, aniso);
      const mat = new THREE.MeshStandardMaterial({ map, roughness: 0.55, metalness: 0.2, emissive: new THREE.Color(p.color), emissiveMap: map, emissiveIntensity: 0.32 });
      this.pillarMats.push(mat);
      this.disposables.push(map, mat);
    }
    (Object.keys(POWERS) as PowerKind[]).forEach((k) => {
      const map = tileTexture(POWERS[k].tex, null, 0, aniso);
      const mat = new THREE.MeshStandardMaterial({ map, roughness: 0.45, metalness: 0.3, emissive: new THREE.Color(POWERS[k].color), emissiveMap: map, emissiveIntensity: 0.45 });
      this.powerMats[k] = mat;
      const bt = badgeTexture(k);
      this.badges[k] = new THREE.SpriteMaterial({ map: bt, transparent: true, depthTest: false });
      this.disposables.push(map, mat, bt, this.badges[k]);
    });
    this.badge = new THREE.Sprite(this.badges.gear);
    this.badge.scale.set(1.3, 1.3, 1);
    this.badge.renderOrder = 10;
    this.badge.visible = false;
    this.scene.add(this.badge);

    this.scene.add(new THREE.HemisphereLight(0xcfe9ff, 0x14161a, 1.25));
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.radius = 4;
    this.sun.shadow.bias = -0.0008;
    const sc = this.sun.shadow.camera;
    sc.left = -7; sc.right = 7; sc.top = 7; sc.bottom = -7; sc.near = 1; sc.far = 40;
    this.scene.add(this.sun, this.sun.target);
    const rim = new THREE.DirectionalLight(0x00ddff, 0.6);
    rim.position.set(-6, 4, -8);
    this.scene.add(rim);

    this.buildPedestal(aniso);
    this.spawn();
    this.emitHud();
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  private buildPedestal(aniso: number) {
    const map = tileTexture('circuito-futurista', null, 0, aniso);
    const mat = new THREE.MeshStandardMaterial({ map, roughness: 0.7, metalness: 0.35, emissive: new THREE.Color('#B87000'), emissiveMap: map, emissiveIntensity: 0.25 });
    const depth = 14;
    const geo = new THREE.BoxGeometry(BASE, depth, BASE);
    const uv = geo.attributes.uv;
    const pos = geo.attributes.position;
    const nor = geo.attributes.normal;
    for (let i = 0; i < pos.count; i++) {
      const nx = nor.getX(i);
      const ny = nor.getY(i);
      const a = Math.abs(nx) > 0.5 ? pos.getZ(i) : pos.getX(i);
      uv.setXY(i, a / TILE, (Math.abs(ny) > 0.5 ? pos.getZ(i) : pos.getY(i)) / TILE);
    }
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = -depth / 2;
    mesh.receiveShadow = true;
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x00ddff, transparent: true, opacity: 0.55 }));
    mesh.add(edges);
    this.scene.add(mesh);
    this.disposables.push(map, mat, geo, edges.geometry, edges.material as THREE.Material);
  }

  private edgeMat(color: string, opacity: number) {
    const key = color + opacity;
    let m = this.edgeMats.get(key);
    if (!m) {
      m = new THREE.LineBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
      this.edgeMats.set(key, m);
    }
    return m;
  }

  private skinColor(s: Skin) { return s.kind === 'pillar' ? PILLARS[s.index].color : POWERS[s.power].color; }

  private makeSlab(w: number, d: number, x: number, y: number, z: number, ux: number, uz: number, skin: Skin, moving = false): Slab {
    const geo = slabGeometry(w, d, ux, y, uz);
    let mat = skin.kind === 'pillar' ? this.pillarMats[skin.index] : this.powerMats[skin.power];
    if (moving && skin.kind === 'power') mat = mat.clone();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), this.edgeMat(this.skinColor(skin), moving ? 1 : 0.6));
    mesh.add(edges);
    this.scene.add(mesh);
    return { mesh, edges, w, d, x, z, y, ux, uz, skin };
  }

  private removeSlab(s: Slab) {
    this.scene.remove(s.mesh);
    s.mesh.geometry.dispose();
    s.edges.geometry.dispose();
    const mat = s.mesh.material as THREE.MeshStandardMaterial;
    if (!this.pillarMats.includes(mat) && !Object.values(this.powerMats).includes(mat)) mat.dispose();
  }

  private pickSkin(): Skin {
    if (this.phase === 'playing' && this.n + 1 >= this.nextPower) {
      this.nextPower = this.n + 1 + randInt(6, 9);
      const narrow = Math.min(this.topSlab.w, this.topSlab.d) < BASE * 0.6;
      const pool: [PowerKind, number][] = [
        ['gear', narrow ? 4 : 1.5], ['magnet', 1.5], ['slow', this.n > 12 ? 2 : 1], ['double', 1.5], ['shield', this.shield ? 0 : 1.2],
      ];
      const total = pool.reduce((a, [, w]) => a + w, 0);
      let r = Math.random() * total;
      for (const [k, w] of pool) { r -= w; if (r <= 0) return { kind: 'power', power: k }; }
      return { kind: 'power', power: 'gear' };
    }
    const index = this.cycle % 6;
    this.cycle++;
    return { kind: 'pillar', index };
  }

  private spawn() {
    const t = this.topSlab;
    this.axis = this.n % 2 === 0 ? 'x' : 'z';
    const side = Math.floor(this.n / 2) % 2 === 0 ? -1 : 1;
    this.dir = -side;
    const y = this.n * H + H / 2;
    const x = this.axis === 'x' ? t.x + side * RANGE : t.x;
    const z = this.axis === 'z' ? t.z + side * RANGE : t.z;
    const skin = this.pickSkin();
    this.cur = this.makeSlab(t.w, t.d, x, y, z, x, z, skin, true);
    if (skin.kind === 'power') {
      this.badge.material = this.badges[skin.power];
      this.badge.visible = true;
    } else this.badge.visible = false;
  }

  private speed() {
    const base = Math.min(7.4, 2.9 + this.n * 0.085);
    return this.phase === 'idle' ? 1.8 : base * (this.slow > 0 ? 0.5 : 1);
  }

  start() {
    for (const s of this.slabs) this.removeSlab(s);
    for (const f of this.falling) this.removeSlab(f.slab);
    if (this.cur) this.removeSlab(this.cur);
    this.slabs = [];
    this.falling = [];
    this.cur = null;
    this.topSlab = { w: BASE, d: BASE, x: 0, z: 0 };
    Object.assign(this, { n: 0, score: 0, combo: 0, maxCombo: 0, perfects: 0, bonus: 0, chain: 0, cycle: 0, sixPillars: 0, powersUsed: 0, magnet: 0, slow: 0, double: 0, shield: false, overTimer: 0 });
    this.nextPower = randInt(5, 7);
    this.phase = 'playing';
    this.paused = false;
    this.spawn();
    this.emitHud();
  }

  setPaused(p: boolean) { this.paused = p; }

  /** Offset of the sliding slab from the tower axis (used by automated play tests). */
  probe() {
    if (!this.cur) return null;
    const t = this.topSlab;
    return { offset: this.axis === 'x' ? this.cur.x - t.x : this.cur.z - t.z, dir: this.dir, n: this.n };
  }

  drop() {
    if (this.phase !== 'playing' || this.paused || !this.cur) return;
    const cur = this.cur;
    const t = this.topSlab;
    const along = this.axis;
    const size = along === 'x' ? cur.w : cur.d;
    let delta = along === 'x' ? cur.x - t.x : cur.z - t.z;
    const magnetOn = this.magnet > 0;
    if (magnetOn) { delta = 0; this.magnet--; }
    const abs = Math.abs(delta);
    this.badge.visible = false;

    if (abs >= size) { this.miss(cur); return; }

    const perfect = abs <= PERFECT;
    if (perfect) delta = 0;
    const keep = size - Math.abs(delta);
    const px = along === 'x' ? t.x + delta / 2 : cur.x;
    const pz = along === 'z' ? t.z + delta / 2 : cur.z;
    let w = along === 'x' ? keep : cur.w;
    let d = along === 'z' ? keep : cur.d;
    const offX = cur.ux - cur.x;
    const offZ = cur.uz - cur.z;

    if (!perfect) {
      const sgn = Math.sign(delta);
      const cx = along === 'x' ? px + sgn * size / 2 : cur.x;
      const cz = along === 'z' ? pz + sgn * size / 2 : cur.z;
      const cw = along === 'x' ? Math.abs(delta) : cur.w;
      const cd = along === 'z' ? Math.abs(delta) : cur.d;
      const chunk = this.makeSlab(cw, cd, cx, cur.y, cz, cx + offX, cz + offZ, cur.skin);
      const push = sgn * rand(1.2, 2.2);
      this.falling.push({
        slab: chunk,
        vel: new THREE.Vector3(along === 'x' ? push : 0, rand(0.5, 1.5), along === 'z' ? push : 0),
        spin: new THREE.Vector3(along === 'z' ? sgn * rand(2, 4) : rand(-0.5, 0.5), 0, along === 'x' ? -sgn * rand(2, 4) : rand(-0.5, 0.5)),
        life: 0,
      });
    }

    // Long perfect streaks give width back (classic stack reward).
    if (perfect) {
      this.combo++;
      this.perfects++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      if (this.combo >= 5) {
        if (along === 'x') w = Math.min(BASE, w + 0.12);
        else d = Math.min(BASE, d + 0.12);
      }
    } else this.combo = 0;

    // Gear: restore most of the lost width right on this slab.
    const skin = cur.skin;
    if (skin.kind === 'power' && skin.power === 'gear') {
      w = Math.min(BASE, w + Math.max(0.6, (BASE - w) * 0.6));
      d = Math.min(BASE, d + Math.max(0.6, (BASE - d) * 0.6));
    }

    this.removeSlab(cur);
    this.cur = null;
    const placed = this.makeSlab(w, d, px, cur.y, pz, px + offX, pz + offZ, skin);
    this.slabs.push(placed);
    this.topSlab = { w, d, x: px, z: pz };
    this.n++;

    // Scoring: 1 per floor, perfect bonus grows every 5 in a row; night bolt doubles.
    const mult = this.double > 0 ? 2 : 1;
    const pts = 1 + (perfect ? 1 + Math.floor(this.combo / 5) : 0);
    this.score += pts * mult;
    if (this.double > 0) this.double--;
    if (this.slow > 0) this.slow--;

    if (perfect) {
      this.effects(placed, true);
      this.opts.onSound('perfect', this.combo);
      this.opts.onPop({ kind: 'perfect', combo: this.combo, points: pts * mult });
    } else {
      this.effects(placed, false);
      this.opts.onSound('cut', 0);
    }

    // Pillar chain in the official order.
    if (skin.kind === 'pillar') {
      const clean = perfect || Math.abs(delta) <= size * 0.1;
      if (clean && skin.index === this.chain) this.chain++;
      else this.chain = clean && skin.index === 0 ? 1 : 0;
      if (this.chain === 6) {
        const b = 20 * mult;
        this.bonus += b;
        this.score += b;
        this.sixPillars++;
        this.chain = 0;
        this.opts.onPop({ kind: 'pillars', points: b });
        this.opts.onSound('pillars', 0);
        this.shake = 0.25;
      }
    } else {
      this.powersUsed++;
      const k = skin.power;
      if (k === 'magnet') this.magnet = POWER_SPAN.magnet;
      if (k === 'slow') this.slow = POWER_SPAN.slow;
      if (k === 'double') this.double = POWER_SPAN.double;
      if (k === 'shield') this.shield = true;
      this.opts.onPop({ kind: 'power', power: k });
      this.opts.onSound(k === 'gear' ? 'grow' : 'power', 0);
    }

    this.spawn();
    this.emitHud();
  }

  private miss(cur: Slab) {
    const along = this.axis;
    const sgn = Math.sign(along === 'x' ? cur.x - this.topSlab.x : cur.z - this.topSlab.z) || 1;
    this.falling.push({
      slab: cur,
      vel: new THREE.Vector3(along === 'x' ? sgn * 1.5 : 0, 0.5, along === 'z' ? sgn * 1.5 : 0),
      spin: new THREE.Vector3(along === 'z' ? sgn * 2.5 : 0, 0, along === 'x' ? -sgn * 2.5 : 0),
      life: 0,
    });
    cur.edges.material = this.edgeMat(this.skinColor(cur.skin), 0.6);
    this.cur = null;
    this.combo = 0;
    if (this.shield) {
      this.shield = false;
      this.chain = 0;
      this.opts.onPop({ kind: 'shield_used' });
      this.opts.onSound('shield', 0);
      this.spawn();
      this.emitHud();
      return;
    }
    this.phase = 'over';
    this.overTimer = 1.1;
    this.shake = 0.3;
    this.opts.onSound('miss', 0);
    this.emitHud();
  }

  private effects(s: Slab, perfect: boolean) {
    const reduced = this.opts.reducedMotion;
    const color = new THREE.Color(this.skinColor(s.skin));
    if (perfect) {
      const top = s.y + H / 2 + 0.02;
      const hw = s.w / 2;
      const hd = s.d / 2;
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-hw, 0, -hd), new THREE.Vector3(hw, 0, -hd), new THREE.Vector3(hw, 0, hd), new THREE.Vector3(-hw, 0, hd),
      ]);
      const line = new THREE.LineLoop(geo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      line.position.set(s.x, top - H, s.z);
      this.scene.add(line);
      this.rings.push({ line, life: 0 });
    }
    const count = perfect ? (reduced ? 18 : 46) : (reduced ? 0 : 10);
    if (!count) return;
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Start on the slab rim so the burst traces its outline.
      const e = Math.random() * 4;
      const f = e % 1;
      const ex = e < 1 ? -s.w / 2 + f * s.w : e < 2 ? s.w / 2 : e < 3 ? s.w / 2 - f * s.w : -s.w / 2;
      const ez = e < 1 ? -s.d / 2 : e < 2 ? -s.d / 2 + f * s.d : e < 3 ? s.d / 2 : s.d / 2 - f * s.d;
      pos.set([s.x + ex, s.y, s.z + ez], i * 3);
      vel.set([ex * rand(0.4, 1.2), rand(1.5, 4), ez * rand(0.4, 1.2)], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color, size: perfect ? 0.16 : 0.1, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const points = new THREE.Points(geo, mat);
    this.scene.add(points);
    this.bursts.push({ points, vel, life: 0, max: perfect ? 0.9 : 0.5 });
  }

  private emitHud() {
    this.opts.onHud({
      score: this.score, height: this.n, combo: this.combo, perfects: this.perfects, chain: this.chain,
      current: this.cur ? this.cur.skin : null, magnet: this.magnet, slow: this.slow, double: this.double, shield: this.shield,
    });
  }

  resize(w: number, h: number) {
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.aspect = w / h;
    // Keep the whole slide range on screen in portrait.
    this.view = Math.max(12.5, 12.2 / this.aspect);
    if (this.phase !== 'over') this.viewNow = this.view;
    this.applyFrustum(this.viewNow);
  }

  private applyFrustum(v: number) {
    const c = this.camera;
    c.top = v / 2;
    c.bottom = -v / 2;
    c.left = (-v * this.aspect) / 2;
    c.right = (v * this.aspect) / 2;
    c.updateProjectionMatrix();
  }

  private loop(now: number) {
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, (now - (this.last || now)) / 1000);
    this.last = now;
    if (!this.paused) this.update(dt);
    this.renderer.render(this.scene, this.camera);
  }

  private update(dt: number) {
    this.time += dt;
    const cur = this.cur;
    if (cur && this.phase !== 'over') {
      const t = this.topSlab;
      const center = this.axis === 'x' ? t.x : t.z;
      let p = (this.axis === 'x' ? cur.x : cur.z) + this.dir * this.speed() * dt;
      if (p > center + RANGE) { p = center + RANGE; this.dir = -1; }
      if (p < center - RANGE) { p = center - RANGE; this.dir = 1; }
      if (this.axis === 'x') cur.x = p; else cur.z = p;
      cur.mesh.position.set(cur.x, cur.y, cur.z);
      if (cur.skin.kind === 'power') {
        const m = cur.mesh.material as THREE.MeshStandardMaterial;
        m.emissiveIntensity = 0.45 + 0.35 * Math.sin(this.time * 6);
        this.badge.position.set(cur.x, cur.y + 1.25 + Math.sin(this.time * 3) * 0.1, cur.z);
      }
    }

    for (let i = this.falling.length - 1; i >= 0; i--) {
      const f = this.falling[i];
      f.life += dt;
      f.vel.y -= 22 * dt;
      const m = f.slab.mesh;
      m.position.addScaledVector(f.vel, dt);
      m.rotation.x += f.spin.x * dt;
      m.rotation.z += f.spin.z * dt;
      if (f.life > 2.2) { this.removeSlab(f.slab); this.falling.splice(i, 1); }
    }
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.life += dt;
      const attr = b.points.geometry.attributes.position as THREE.BufferAttribute;
      const a = attr.array as Float32Array;
      for (let j = 0; j < a.length; j += 3) {
        b.vel[j + 1] -= 6 * dt;
        a[j] += b.vel[j] * dt;
        a[j + 1] += b.vel[j + 1] * dt;
        a[j + 2] += b.vel[j + 2] * dt;
      }
      attr.needsUpdate = true;
      (b.points.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - b.life / b.max);
      if (b.life >= b.max) {
        this.scene.remove(b.points);
        b.points.geometry.dispose();
        (b.points.material as THREE.Material).dispose();
        this.bursts.splice(i, 1);
      }
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life += dt / 0.55;
      const s = 1 + r.life * 0.45;
      r.line.scale.set(s, 1, s);
      r.line.position.y += dt * 0.6;
      (r.line.material as THREE.LineBasicMaterial).opacity = Math.max(0, 1 - r.life);
      if (r.life >= 1) {
        this.scene.remove(r.line);
        r.line.geometry.dispose();
        (r.line.material as THREE.Material).dispose();
        this.rings.splice(i, 1);
      }
    }

    // Camera: rises with the tower; zooms out to show the whole tower at the end.
    const topY = this.n * H;
    let targetY = topY + 1.2;
    let targetView = this.view;
    if (this.phase === 'over') {
      if (this.aspect < 0.9) {
        // Portrait: the end card takes the top, the whole tower stands below it.
        targetView = Math.max(this.view, topY * 2.8 + 4);
        targetY = targetView * 0.6 - 1;
      } else {
        targetView = Math.max(this.view, (topY + 5) * 1.25);
        targetY = Math.max(topY / 2, 1.2);
      }
      if (this.overTimer > 0) {
        this.overTimer -= dt;
        if (this.overTimer <= 0) this.finish();
      }
    }
    const k = 1 - Math.exp(-dt * 3.2);
    this.camY += (targetY - this.camY) * k;
    if (Math.abs(targetView - this.viewNow) > 0.01) {
      this.viewNow += (targetView - this.viewNow) * (1 - Math.exp(-dt * 1.6));
      this.applyFrustum(this.viewNow);
    }
    let sx = 0;
    if (this.shake > 0 && !this.opts.reducedMotion) {
      this.shake = Math.max(0, this.shake - dt);
      sx = (Math.random() - 0.5) * this.shake * 0.5;
    }
    // On wide screens the end card sits on the left, so the tower slides right.
    const goal = this.phase === 'over' && this.aspect > 1.2 ? -this.viewNow * this.aspect * 0.2 : 0;
    this.side += (goal - this.side) * k;
    const ox = this.side / Math.SQRT2 + sx;
    this.camera.position.set(9 + ox, this.camY + 8, 9 - ox);
    this.camera.lookAt(ox, this.camY, -ox);
    this.sun.position.set(5, this.camY + 12, 7);
    this.sun.target.position.set(0, this.camY - 2, 0);

    // Floors far below the view are not drawn.
    const floor = this.camY - this.viewNow * 1.1;
    for (const s of this.slabs) s.mesh.visible = s.y > floor;
  }

  private finish() {
    this.opts.onSound('over', 0);
    this.opts.onOver({
      score: this.score, height: this.n, perfects: this.perfects, maxCombo: this.maxCombo,
      bonus: this.bonus, sixPillars: this.sixPillars, powers: this.powersUsed,
    });
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    for (const s of this.slabs) this.removeSlab(s);
    for (const f of this.falling) this.removeSlab(f.slab);
    if (this.cur) this.removeSlab(this.cur);
    for (const b of this.bursts) { b.points.geometry.dispose(); (b.points.material as THREE.Material).dispose(); }
    for (const r of this.rings) { r.line.geometry.dispose(); (r.line.material as THREE.Material).dispose(); }
    this.edgeMats.forEach((m) => m.dispose());
    this.disposables.forEach((d) => d.dispose());
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
