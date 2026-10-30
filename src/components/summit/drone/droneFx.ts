import * as THREE from 'three';

/* Effects for the drone game, all pooled so a run allocates nothing per frame:
   light trails, one particle system for sparks/bursts/speed dust, ring
   shockwaves and the chevron that points at the next ring. */

/** Camera-facing ribbon behind an emitter. The drone flies down −z fast, so the
    ribbon keeps a fixed depth and takes its sway from the recent x/y history. */
export class Trail {
  readonly mesh: THREE.Mesh;
  private pts: THREE.Vector3[];
  private pos: Float32Array;
  private col: Float32Array;
  private color: THREE.Color;
  private tmp = new THREE.Vector3();
  private side = new THREE.Vector3();
  private seg = new THREE.Vector3();

  constructor(color: number, private n = 18, private width = 0.11, private step = 0.09) {
    this.pts = Array.from({ length: n }, () => new THREE.Vector3());
    this.pos = new Float32Array(n * 2 * 3);
    this.col = new Float32Array(n * 2 * 3);
    this.color = new THREE.Color(color);
    const idx: number[] = [];
    for (let i = 0; i < n - 1; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setIndex(idx);
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
  }

  reset(at: THREE.Vector3) {
    this.pts.forEach((p) => p.copy(at));
  }

  update(head: THREE.Vector3, camPos: THREE.Vector3, boost: number) {
    for (let i = this.n - 1; i > 0; i--) this.pts[i].copy(this.pts[i - 1]);
    this.pts[0].copy(head);
    for (let i = 0; i < this.n; i++) this.pts[i].z = head.z + i * this.step * (1 + boost * 0.5);
    const w = this.width * (1 + boost * 0.5);
    for (let i = 0; i < this.n; i++) {
      const p = this.pts[i];
      const q = this.pts[Math.min(i + 1, this.n - 1)];
      this.seg.subVectors(p, q);
      if (this.seg.lengthSq() < 1e-6) this.seg.set(0, 0, 1);
      this.tmp.subVectors(camPos, p);
      this.side.crossVectors(this.seg, this.tmp).normalize().multiplyScalar(w * (1 - i / this.n));
      this.pos.set([p.x + this.side.x, p.y + this.side.y, p.z + this.side.z, p.x - this.side.x, p.y - this.side.y, p.z - this.side.z], i * 6);
      const f = Math.pow(1 - i / this.n, 1.6) * (0.45 + boost * 0.35);
      const r = this.color.r * f;
      const g = this.color.g * f;
      const b = this.color.b * f;
      this.col.set([r, g, b, r, g, b], i * 6);
    }
    const geo = this.mesh.geometry;
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  }

  dispose() {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

const PARTICLE_VERT = /* glsl */ `
attribute float life;
attribute float size;
attribute vec3 color;
uniform float scale;
varying vec3 vColor;
void main() {
  vColor = color * min(life * 2.0, 1.0);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = life > 0.0 ? min(size * scale / max(-mv.z, 0.1), 28.0) : 0.0;
  gl_Position = projectionMatrix * mv;
}
`;
const PARTICLE_FRAG = /* glsl */ `
varying vec3 vColor;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(vColor * a, 1.0);
}
`;

/** One pooled point cloud for every spark, burst and speed dust mote. */
export class Particles {
  readonly points: THREE.Points;
  private pos: Float32Array;
  private vel: Float32Array;
  private col: Float32Array;
  private life: Float32Array;
  private decay: Float32Array;
  private size: Float32Array;
  private next = 0;
  private c = new THREE.Color();

  constructor(private cap = 700) {
    this.pos = new Float32Array(cap * 3);
    this.vel = new Float32Array(cap * 3);
    this.col = new Float32Array(cap * 3);
    this.life = new Float32Array(cap);
    this.decay = new Float32Array(cap);
    this.size = new Float32Array(cap);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('life', new THREE.BufferAttribute(this.life, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.ShaderMaterial({
      uniforms: { scale: { value: 300 } },
      vertexShader: PARTICLE_VERT,
      fragmentShader: PARTICLE_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
  }

  setScale(viewportHeight: number) {
    (this.points.material as THREE.ShaderMaterial).uniforms.scale.value = viewportHeight * 0.9;
  }

  emit(x: number, y: number, z: number, vx: number, vy: number, vz: number, color: THREE.ColorRepresentation, size: number, seconds: number) {
    const i = this.next;
    this.next = (this.next + 1) % this.cap;
    this.pos.set([x, y, z], i * 3);
    this.vel.set([vx, vy, vz], i * 3);
    this.c.set(color);
    this.col.set([this.c.r, this.c.g, this.c.b], i * 3);
    this.life[i] = 1;
    this.decay[i] = 1 / seconds;
    this.size[i] = size;
  }

  /** Radial burst; `ring` spreads it in the XY plane like a ring flash. */
  burst(at: THREE.Vector3, color: THREE.ColorRepresentation, count: number, speed: number, ring = false, radius = 0) {
    for (let k = 0; k < count; k++) {
      const a = Math.random() * Math.PI * 2;
      if (ring) {
        const cx = Math.cos(a);
        const cy = Math.sin(a);
        const s = speed * (0.6 + Math.random() * 0.6);
        this.emit(at.x + cx * radius, at.y + cy * radius, at.z, cx * s, cy * s, (Math.random() - 0.5) * 6, color, 0.9 + Math.random() * 0.8, 0.5 + Math.random() * 0.3);
      } else {
        const u = Math.random() * 2 - 1;
        const r = Math.sqrt(1 - u * u);
        const s = speed * (0.4 + Math.random() * 0.8);
        this.emit(at.x, at.y, at.z, Math.cos(a) * r * s, u * s, Math.sin(a) * r * s, color, 0.7 + Math.random() * 0.7, 0.45 + Math.random() * 0.35);
      }
    }
  }

  update(dt: number) {
    const drag = Math.pow(0.12, dt);
    for (let i = 0; i < this.cap; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] = Math.max(0, this.life[i] - this.decay[i] * dt);
      const j = i * 3;
      this.pos[j] += this.vel[j] * dt;
      this.pos[j + 1] += this.vel[j + 1] * dt;
      this.pos[j + 2] += this.vel[j + 2] * dt;
      this.vel[j] *= drag;
      this.vel[j + 1] *= drag;
      this.vel[j + 2] *= drag;
    }
    const a = this.points.geometry.attributes;
    a.position.needsUpdate = true;
    a.color.needsUpdate = true;
    a.life.needsUpdate = true;
    a.size.needsUpdate = true;
  }

  clear() {
    this.life.fill(0);
    this.points.geometry.attributes.life.needsUpdate = true;
  }

  dispose() {
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
  }
}

/** Expanding ring flashes when a ring is cleared. */
export class Shockwaves {
  readonly group = new THREE.Group();
  private items: Array<{ mesh: THREE.Mesh; t: number }> = [];
  private geo = new THREE.RingGeometry(5.2, 5.9, 48);

  constructor(n = 6) {
    for (let i = 0; i < n; i++) {
      const mesh = new THREE.Mesh(this.geo, new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      mesh.visible = false;
      this.group.add(mesh);
      this.items.push({ mesh, t: 1 });
    }
  }

  spawn(at: THREE.Vector3, color: THREE.ColorRepresentation) {
    const it = this.items.reduce((a, b) => (b.t > a.t ? b : a));
    it.t = 0;
    it.mesh.position.copy(at);
    it.mesh.visible = true;
    (it.mesh.material as THREE.MeshBasicMaterial).color.set(color);
  }

  update(dt: number) {
    this.items.forEach((it) => {
      if (it.t >= 1) return;
      it.t = Math.min(1, it.t + dt / 0.45);
      it.mesh.scale.setScalar(1 + it.t * 1.6);
      (it.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - it.t) * 0.9;
      if (it.t >= 1) it.mesh.visible = false;
    });
  }

  clear() {
    this.items.forEach((it) => { it.t = 1; it.mesh.visible = false; });
  }

  dispose() {
    this.geo.dispose();
    this.items.forEach((it) => (it.mesh.material as THREE.Material).dispose());
  }
}

/** Flat chevron that floats ahead of the drone and points at the next ring. */
export function createGuide(): THREE.Mesh {
  const s = new THREE.Shape();
  s.moveTo(0, 1.1);
  s.lineTo(0.9, -0.5);
  s.lineTo(0, -0.05);
  s.lineTo(-0.9, -0.5);
  s.closePath();
  const geo = new THREE.ShapeGeometry(s);
  geo.rotateX(-Math.PI / 2);
  geo.rotateY(Math.PI);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  return new THREE.Mesh(geo, mat);
}
