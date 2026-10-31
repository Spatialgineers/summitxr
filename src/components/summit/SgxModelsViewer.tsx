import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Box } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { SgxDialog } from '../common/SgxDialog';
import { SGX_PILLARS } from '../../lib/sgxPillars';
import { DRACO_DECODERS, PILLAR_GLB, SGX_GUILD_GLB, SGX_ICON_GLB } from '../../lib/sgxModels';
import { studioEnvironment, studioLights, studioRenderer } from '../../identity/highbotStudio';
import { HIGHBOT_PRESETS } from '../../identity/pilotAvatar';
import { playUiChirp } from '../../lib/cyberAudioEngine';
import './sgxModelsViewer.css';

/* MODELOS 3D: the Summit's 3D brand pieces in one viewer: the Spatialgineers
   icon, the SGX Guild emblem, the six pillar sculptures (the same .glb as
   the core, with their own materials) and the Highbot. Lit in the same
   neutral studio as the avatar (identity/highbotStudio.ts). Drag to turn,
   pinch or scroll to get closer; it turns on its own while you look. */

type Bi = { es: string; en: string };
interface ViewerModel {
  id: string;
  name: string;
  desc: Bi;
  color: string;
  url?: string;
  /** Built in code instead of loaded (the Highbot). */
  highbot?: boolean;
}

const MODELS: ViewerModel[] = [
  { id: 'sgx', name: 'SGX Icon', color: '#FDCC0D', url: SGX_ICON_GLB, desc: { es: 'El engranaje y el rayo de Spatialgineers.', en: 'The Spatialgineers gear and bolt.' } },
  ...SGX_PILLARS.map((p) => ({ id: p.slug, name: p.name, color: p.color, url: PILLAR_GLB[p.key], desc: p.scope })),
  { id: 'guild', name: 'SGX Guild', color: '#00DDFF', url: SGX_GUILD_GLB, desc: { es: 'El emblema del SGX Guild, la comunidad de iniciados.', en: 'The SGX Guild emblem, the initiates community.' } },
  { id: 'highbot', name: 'Highbot', color: '#FF4040', highbot: true, desc: { es: 'El avatar del Summit: Highcoon en su forma de robot. Ármalo a tu gusto en Tu Estudio.', en: 'The Summit avatar: Highcoon in robot form. Build yours in Your Studio.' } },
];

/** Centers a model and scales it to fit a 2-unit box. */
function fit(obj: THREE.Object3D) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const k = 2 / Math.max(size.x, size.y, size.z, 1e-6);
  obj.position.sub(center.multiplyScalar(k));
  obj.scale.multiplyScalar(k);
}

function disposeTree(obj: THREE.Object3D) {
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.geometry?.dispose();
    (Array.isArray(m.material) ? m.material : [m.material]).forEach((mat) => {
      Object.values(mat as unknown as Record<string, unknown>).forEach((v) => { if (v instanceof THREE.Texture) v.dispose(); });
      mat.dispose();
    });
  });
}

export const SgxModelsViewer: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const hostRef = useRef<HTMLDivElement | null>(null);
  const showRef = useRef<((m: ViewerModel) => void) | null>(null);
  const [current, setCurrent] = useState<ViewerModel>(MODELS[0]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [noGl, setNoGl] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch {
      setNoGl(true);
      return;
    }
    const size = () => ({ w: host.clientWidth || 320, h: host.clientHeight || 320 });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(size().w, size().h);
    studioRenderer(renderer, true);
    host.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-hidden', 'true');

    const scene = new THREE.Scene();
    const env = studioEnvironment(renderer);
    scene.environment = env;
    // the sculptures are dark navy and black: a little more of the studio in them
    scene.environmentIntensity = 1.35;
    scene.add(studioLights(true));
    // a soft shadow under the piece
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.ShadowMaterial({ opacity: 0.32 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.08;
    floor.receiveShadow = true;
    scene.add(floor);

    const camera = new THREE.PerspectiveCamera(35, size().w / size().h, 0.1, 100);
    camera.position.set(0, 0.5, 5);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 2.4;
    controls.maxDistance = 9;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    controls.autoRotate = !reduce;
    controls.autoRotateSpeed = 1.4;
    let idleTimer = 0;
    controls.addEventListener('start', () => { controls.autoRotate = false; window.clearTimeout(idleTimer); });
    controls.addEventListener('end', () => { idleTimer = window.setTimeout(() => { controls.autoRotate = !reduce; }, 4000); });

    const loader = new GLTFLoader();
    const draco = new DRACOLoader().setDecoderPath(DRACO_DECODERS);
    loader.setDRACOLoader(draco);

    const stage = new THREE.Group();
    scene.add(stage);
    let piece: THREE.Object3D | null = null;
    let tick: ((t: number) => void) | null = null;
    let dropPiece: (() => void) | null = null;
    let token = 0;

    const show = (m: ViewerModel) => {
      const mine = ++token;
      setStatus('loading');
      if (piece) { stage.remove(piece); dropPiece?.(); piece = null; tick = null; dropPiece = null; }
      const place = (obj: THREE.Object3D, drop: () => void, update?: (t: number) => void) => {
        if (mine !== token) { drop(); return; }
        obj.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        piece = obj;
        dropPiece = drop;
        tick = update || null;
        stage.add(obj);
        controls.reset();
        setStatus('ready');
      };
      if (m.highbot) {
        import('../../identity/highbot3d').then(({ buildHighbot3D }) => buildHighbot3D(HIGHBOT_PRESETS[0].config)).then((bot) => {
          const holder = new THREE.Group();
          holder.add(bot.group);
          bot.update(0);
          fit(holder);
          place(holder, () => bot.dispose(), bot.update);
        }).catch(() => { if (mine === token) setStatus('error'); });
        return;
      }
      loader.load(m.url!, (gltf) => {
        const obj = gltf.scene;
        fit(obj);
        place(obj, () => disposeTree(obj));
      }, undefined, () => { if (mine === token) setStatus('error'); });
    };
    showRef.current = show;
    show(MODELS[0]);

    const ro = new ResizeObserver(() => {
      const { w, h } = size();
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    ro.observe(host);

    let raf = 0;
    const t0 = performance.now();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      controls.update();
      if (!reduce) tick?.((performance.now() - t0) / 1000);
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(idleTimer);
      ro.disconnect();
      token++;
      showRef.current = null;
      if (piece) { stage.remove(piece); dropPiece?.(); }
      controls.dispose();
      draco.dispose();
      env.dispose();
      floor.geometry.dispose();
      (floor.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  const pick = (m: ViewerModel) => {
    if (m.id === current.id) return;
    playUiChirp(760);
    setCurrent(m);
    showRef.current?.(m);
  };

  return (
    <SgxDialog
      onClose={onClose}
      size="lg"
      className="sgx-models"
      icon={<Box className="w-5 h-5 text-[#FDCC0D] shrink-0" aria-hidden="true" />}
      title={es ? 'Modelos 3D' : '3D models'}
      kicker={es ? 'Los logos y las esculturas de los seis pilares, en 3D' : 'The logos and the six pillar sculptures, in 3D'}
    >
      <div className="sgx-models__body">
        <div className="sgx-models__stage" style={{ ['--model-accent' as string]: current.color }}>
          <div ref={hostRef} className="sgx-models__canvas" role="img" aria-label={`${current.name}: ${current.desc[es ? 'es' : 'en']}`} />
          {noGl && <p className="sgx-models__state">{es ? 'Tu navegador no puede mostrar 3D.' : 'Your browser can’t show 3D.'}</p>}
          {!noGl && status === 'loading' && <p className="sgx-models__state" role="status">{es ? 'Cargando modelo…' : 'Loading model…'}</p>}
          {!noGl && status === 'error' && <p className="sgx-models__state" role="alert">{es ? 'No se pudo cargar este modelo. Prueba otro.' : 'This model could not load. Try another one.'}</p>}
          <p className="sgx-models__hint">{es ? 'Arrastra para girar · pellizca o usa la rueda para acercarte' : 'Drag to turn · pinch or scroll to zoom'}</p>
        </div>
        <div className="sgx-models__info">
          <h3 className="sgx-models__name">{current.name}</h3>
          <p className="sgx-models__desc">{current.desc[es ? 'es' : 'en']}</p>
        </div>
        <div className="sgx-models__picker" role="group" aria-label={es ? 'Elige un modelo' : 'Pick a model'}>
          {MODELS.map((m) => (
            <button key={m.id} type="button" aria-pressed={m.id === current.id} className={m.id === current.id ? 'is-on' : ''}
              style={{ ['--model-color' as string]: m.color }} onClick={() => pick(m)}>
              <span className="sgx-models__dot" aria-hidden="true" />{m.name}
            </button>
          ))}
        </div>
      </div>
    </SgxDialog>
  );
};

export default SgxModelsViewer;
