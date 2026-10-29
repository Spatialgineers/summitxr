import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildPilot3D, type Pilot3D } from './pilot3d';
import type { PilotConfig } from './pilotAvatar';

/* The visitor's XR avatar as a 3D figure on a hex podium (same as the
   pillars in the core). It turns slowly on its own; drag to turn it. */

interface Props {
  config: PilotConfig;
  /** Pixel height; width follows the container. */
  height?: number;
  className?: string;
  label?: string;
}

export const SgxPilot3D: React.FC<Props> = ({ config, height = 280, className, label }) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [failed, setFailed] = useState(false);
  const key = JSON.stringify(config);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let alive = true;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch {
      setFailed(true);
      return;
    }
    const w = () => host.clientWidth || 280;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w(), height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    host.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = 'pan-y';

    const scene = new THREE.Scene();
    // studio reflections for the clearcoat shell and metal trim
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    scene.environmentIntensity = 0.55;

    const camera = new THREE.PerspectiveCamera(30, w() / height, 0.1, 100);
    camera.position.set(0, 1.0, 7.4);
    camera.lookAt(0, 0.62, 0);

    const accent = new THREE.Color(config.glow);
    scene.add(new THREE.HemisphereLight(0xfff9e2, 0x0b0f16, 0.7));
    const key = new THREE.DirectionalLight(0xffffff, 2.0); key.position.set(-3, 4, 5); scene.add(key);
    const rim = new THREE.DirectionalLight(accent, 3.0); rim.position.set(4, 1.5, -3); scene.add(rim);
    const rim2 = new THREE.DirectionalLight(new THREE.Color(config.primary), 1.4); rim2.position.set(-4, 2, -3); scene.add(rim2);

    // hex podium, like the pillars in the core
    const podium = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.3, 0.22, 6), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.85, roughness: 0.38, flatShading: true }));
    const rimMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(config.primary) });
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.165, 1.165, 0.035, 6, 1, true), rimMat);
    ring.position.y = 0.09;
    const padMat = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false });
    const pad = new THREE.Mesh(new THREE.CircleGeometry(1.0, 6), padMat);
    pad.rotation.x = -Math.PI / 2; pad.position.y = 0.115;
    podium.add(base, ring, pad);
    podium.rotation.y = Math.PI / 6;
    podium.position.y = -0.88;
    scene.add(podium);

    const turn = new THREE.Group();
    scene.add(turn);
    let avatar: Pilot3D | null = null;
    buildPilot3D(config).then((p) => {
      if (!alive) { p.dispose(); return; }
      turn.add(p.group);
      avatar = p;
    }).catch(() => setFailed(true));

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let drag: { x: number; a: number } | null = null;
    let angle = 0;
    let target = 0;
    let lastInput = -1e9;
    const down = (e: PointerEvent) => { drag = { x: e.clientX, a: target }; lastInput = performance.now(); renderer.domElement.setPointerCapture(e.pointerId); };
    const move = (e: PointerEvent) => { if (drag) { target = drag.a + (e.clientX - drag.x) * 0.012; lastInput = performance.now(); } };
    const up = () => { drag = null; };
    renderer.domElement.addEventListener('pointerdown', down);
    renderer.domElement.addEventListener('pointermove', move);
    renderer.domElement.addEventListener('pointerup', up);
    renderer.domElement.addEventListener('pointercancel', up);

    const onResize = () => { renderer.setSize(w(), height); camera.aspect = w() / height; camera.updateProjectionMatrix(); };
    const ro = new ResizeObserver(onResize);
    ro.observe(host);

    let raf = 0;
    const t0 = performance.now();
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const t = (performance.now() - t0) / 1000;
      // idle: a slow sway after 2.5 s without input
      if (!reduce && !drag && performance.now() - lastInput > 2500) target += (Math.sin(t * 0.45) * 0.55 - target) * 0.02;
      angle += (target - angle) * 0.12;
      turn.rotation.y = angle;
      if (!reduce) avatar?.update(t);
      padMat.opacity = reduce ? 0.22 : 0.18 + Math.sin(t * 2.2) * 0.06;
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', down);
      renderer.domElement.removeEventListener('pointermove', move);
      renderer.domElement.removeEventListener('pointerup', up);
      renderer.domElement.removeEventListener('pointercancel', up);
      avatar?.dispose();
      envTex.dispose();
      pmrem.dispose();
      [base, ring, pad].forEach((m) => { m.geometry.dispose(); (m.material as THREE.Material).dispose(); });
      renderer.dispose();
      renderer.domElement.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, height]);

  if (failed) return null;
  return <div ref={hostRef} className={`sgx-pilot3d ${className || ''}`} style={{ height, width: '100%', cursor: 'grab' }} role="img" aria-label={label || 'Avatar XR en 3D'} />;
};

export default SgxPilot3D;
