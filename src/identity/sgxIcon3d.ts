import * as THREE from 'three';
import { BOLT_POINTS } from './pilotAvatar';

/* The SGX marks in 3D for the avatar: the real SGX icon (G gear + bolt) from
   the brand CDN, the same .glb the 3D core shows, plus procedural gear and
   bolt shapes (the fallback while it loads, or if it can't). The .glb loads
   once per page and is baked into shared geometries: callers make their own
   (tinted) materials and must not dispose these geometries. */

export const SGX_ICON_GLB_URL = 'https://cdn.spatialgineers.com/3D%20Branding/SGX%20Icon.glb';

export interface SgxIconGeometry {
  /** whole icon, centered, 1 unit across */
  bolt: THREE.BufferGeometry;
  gear: THREE.BufferGeometry;
  /** the bolt alone, centered, 1 unit tall */
  boltAlone: THREE.BufferGeometry;
}

let pending: Promise<SgxIconGeometry | null> | null = null;

/** Position + normal only (no UVs, no maps): the avatar tints the marks itself. */
function bake(m: THREE.Mesh): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', m.geometry.getAttribute('position').clone());
  const n = m.geometry.getAttribute('normal');
  if (n) g.setAttribute('normal', n.clone());
  if (m.geometry.index) g.setIndex(m.geometry.index.clone());
  g.applyMatrix4(m.matrixWorld);
  if (!n) g.computeVertexNormals();
  return g;
}

function fit(geos: THREE.BufferGeometry[], by: 'width' | 'height') {
  const box = new THREE.Box3();
  geos.forEach((g) => { g.computeBoundingBox(); box.union(g.boundingBox!); });
  const size = box.getSize(new THREE.Vector3());
  const c = box.getCenter(new THREE.Vector3());
  const s = 1 / Math.max(by === 'width' ? Math.max(size.x, size.y) : size.y, 1e-4);
  geos.forEach((g) => { g.translate(-c.x, -c.y, -c.z); g.scale(s, s, s); g.computeBoundingSphere(); });
}

export function loadSgxIcon(): Promise<SgxIconGeometry | null> {
  if (!pending) {
    pending = import('three/examples/jsm/loaders/GLTFLoader.js')
      .then(({ GLTFLoader }) => new GLTFLoader().loadAsync(SGX_ICON_GLB_URL))
      .then((gltf) => {
        gltf.scene.updateMatrixWorld(true);
        const meshes: THREE.Mesh[] = [];
        gltf.scene.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });
        if (meshes.length < 2) return null;
        // the bolt is the light mesh, the gear the heavy one
        meshes.sort((a, b) => a.geometry.getAttribute('position').count - b.geometry.getAttribute('position').count);
        const bolt = bake(meshes[0]);
        const gear = bake(meshes[meshes.length - 1]);
        const boltAlone = bolt.clone();
        fit([bolt, gear], 'width');
        fit([boltAlone], 'height');
        // the source maps and buffers are not needed any more
        gltf.scene.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh) return;
          m.geometry.dispose();
          (Array.isArray(m.material) ? m.material : [m.material]).forEach((mat) => {
            Object.values(mat).forEach((v) => { if (v instanceof THREE.Texture) v.dispose(); });
            mat.dispose();
          });
        });
        return { bolt, gear, boltAlone };
      })
      .catch(() => { pending = null; return null; });
  }
  return pending;
}

/** SGX gear: flat-topped teeth and a bore, extruded and centered (faces +z). */
export function gearGeometry(ro: number, ri: number, teeth: number, bore: number, depth: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;
  let first = true;
  for (let k = 0; k < teeth; k++) {
    const a = k * step + Math.PI / 2;
    for (const [da, r] of [[-0.3, ri], [-0.17, ro], [0.17, ro], [0.3, ri]]) {
      const x = Math.cos(a + da * step) * r, y = Math.sin(a + da * step) * r;
      if (first) { shape.moveTo(x, y); first = false; } else shape.lineTo(x, y);
    }
  }
  shape.closePath();
  if (bore > 0) {
    const hole = new THREE.Path();
    hole.absarc(0, 0, bore, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: depth * 0.25, bevelSize: Math.min(0.015, (ro - ri) * 0.25), bevelSegments: 1, curveSegments: 24 });
  g.translate(0, 0, -depth / 2);
  return g;
}

/** SGX bolt, extruded and centered, `h` tall (faces +z). */
export function boltGeometry(h: number, depth: number): THREE.BufferGeometry {
  const w = h * 0.62;
  const shape = new THREE.Shape(BOLT_POINTS.map(([px, py]) => new THREE.Vector2((px - 0.5) * w, (0.5 - py) * h)));
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: depth * 0.3, bevelSize: h * 0.02, bevelSegments: 1 });
  g.translate(0, 0, -depth / 2);
  return g;
}
