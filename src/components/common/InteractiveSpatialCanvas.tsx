import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface InteractiveSpatialCanvasProps {
  className?: string;
  particleCount?: number;
  interactive?: boolean;
}

type PillarPhysicsMode =
  | 'ASCENDING_EMBERS'
  | 'SONIC_WAVES'
  | 'KINETIC_VORTEX'
  | 'PRECISION_LATTICE'
  | 'HOLOGRAPHIC_GALLERY'
  | 'HARMONIC_CONVERGENCE';

interface PillarUniverseConfig {
  primaryHex: number;
  secondaryHex: number;
  fogHex: number;
  fogDensity: number;
  orbitalSpeed: number;
  waveIntensity: number;
  physicsMode: PillarPhysicsMode;
}

const PILLAR_UNIVERSE_PROFILES: Record<string, PillarUniverseConfig> = {
  STORY: {
    primaryHex: 0xFDCC0D,
    secondaryHex: 0x32527B,
    fogHex: 0x080C17,
    fogDensity: 0.0016,
    orbitalSpeed: 0.65,
    waveIntensity: 1.0,
    physicsMode: 'ASCENDING_EMBERS',
  },
  STAGE: {
    primaryHex: 0xFFFFFF,
    secondaryHex: 0x32527B,
    fogHex: 0x070B14,
    fogDensity: 0.0014,
    orbitalSpeed: 1.15,
    waveIntensity: 2.2,
    physicsMode: 'SONIC_WAVES',
  },
  SPARK: {
    primaryHex: 0xFF6B00,
    secondaryHex: 0xFDCC0D,
    fogHex: 0x0C0806,
    fogDensity: 0.0017,
    orbitalSpeed: 2.1,
    waveIntensity: 1.8,
    physicsMode: 'KINETIC_VORTEX',
  },
  SYSTEM: {
    primaryHex: 0x32527B,
    secondaryHex: 0x00FFFF,
    fogHex: 0x060A14,
    fogDensity: 0.0015,
    orbitalSpeed: 0.9,
    waveIntensity: 0.7,
    physicsMode: 'PRECISION_LATTICE',
  },
  SHOWCASE: {
    primaryHex: 0x00FFFF,
    secondaryHex: 0xFDCC0D,
    fogHex: 0x050D16,
    fogDensity: 0.0015,
    orbitalSpeed: 0.85,
    waveIntensity: 1.3,
    physicsMode: 'HOLOGRAPHIC_GALLERY',
  },
  SYNTHESIZE: {
    primaryHex: 0xFDCC0D,
    secondaryHex: 0x00FFFF,
    fogHex: 0x070B16,
    fogDensity: 0.0015,
    orbitalSpeed: 1.25,
    waveIntensity: 1.5,
    physicsMode: 'HARMONIC_CONVERGENCE',
  },
};

function resolvePillarKeyFromNameOrId(raw?: string): string {
  if (!raw) return 'STORY';
  const u = raw.toUpperCase();
  if (u.includes('SPARK')) return 'SPARK';
  if (u.includes('STAGE')) return 'STAGE';
  if (u.includes('SHOWCASE')) return 'SHOWCASE';
  if (u.includes('SYSTEM')) return 'SYSTEM';
  if (u.includes('SYNTH')) return 'SYNTHESIZE';
  return 'STORY';
}

export const InteractiveSpatialCanvas: React.FC<InteractiveSpatialCanvasProps> = ({
  className = '',
  particleCount = 900,
  interactive = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef<{ x: number; y: number; targetX: number; targetY: number }>({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
  });
  const reqIdRef = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Resolve initial active pillar
    let initialKey = 'STORY';
    try {
      const urlPillar = new URLSearchParams(window.location.search).get('theme') ||
                        new URLSearchParams(window.location.search).get('pillar') ||
                        localStorage.getItem('sgx_active_tenant_id') || 'STORY';
      initialKey = resolvePillarKeyFromNameOrId(urlPillar);
    } catch {}

    let activeProfile: PillarUniverseConfig = PILLAR_UNIVERSE_PROFILES[initialKey] || PILLAR_UNIVERSE_PROFILES.STORY;
    const currentPrimaryColor = new THREE.Color(activeProfile.primaryHex);
    const currentSecondaryColor = new THREE.Color(activeProfile.secondaryHex);
    const targetPrimaryColor = new THREE.Color(activeProfile.primaryHex);
    const targetSecondaryColor = new THREE.Color(activeProfile.secondaryHex);
    const targetFogColor = new THREE.Color(activeProfile.fogHex);

    let currentOrbitalSpeed = activeProfile.orbitalSpeed;
    let currentWaveIntensity = activeProfile.waveIntensity;
    let warpImpulse = 0;

    // Scene & Exponential Volumetric Fog (Zero grids)
    const scene = new THREE.Scene();
    const fog = new THREE.FogExp2(activeProfile.fogHex, activeProfile.fogDensity);
    scene.fog = fog;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1200);
    camera.position.z = 240;

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: false,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      container.appendChild(renderer.domElement);
    } catch (e) {
      console.warn('WebGL not supported or context lost for SpatialCanvas', e);
      return;
    }

    // WebGL Context Safety Listeners
    let lastTime = performance.now();
    const canvasEl = renderer.domElement;
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current);
    };
    const handleContextRestored = () => {
      lastTime = performance.now();
    };
    canvasEl.addEventListener('webglcontextlost', handleContextLost, false);
    canvasEl.addEventListener('webglcontextrestored', handleContextRestored, false);

    // Soft radial starlight sprite generator
    const createSoftGlowTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
        grad.addColorStop(0.25, 'rgba(255, 255, 255, 0.85)');
        grad.addColorStop(0.65, 'rgba(255, 255, 255, 0.2)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(32, 32, 32, 0, Math.PI * 2);
        ctx.fill();
      }
      return new THREE.CanvasTexture(canvas);
    };

    const glowSpriteTex = createSoftGlowTexture();

    // 1. Deep Space Starfield
    const deepStarGeo = new THREE.BufferGeometry();
    const deepStarCount = particleCount;
    const deepPositions = new Float32Array(deepStarCount * 3);
    for (let i = 0; i < deepStarCount; i++) {
      deepPositions[i * 3] = (Math.random() - 0.5) * 950;
      deepPositions[i * 3 + 1] = (Math.random() - 0.5) * 700;
      deepPositions[i * 3 + 2] = (Math.random() - 0.5) * 650 - 40;
    }
    deepStarGeo.setAttribute('position', new THREE.BufferAttribute(deepPositions, 3));

    const deepStarMat = new THREE.PointsMaterial({
      color: currentSecondaryColor,
      size: 2.5,
      map: glowSpriteTex,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const deepStarPoints = new THREE.Points(deepStarGeo, deepStarMat);
    scene.add(deepStarPoints);

    // 2. Reactive Pillar Physics Particles (Mutable Positions)
    const nodeCount = Math.floor(particleCount * 0.42);
    const nodeGeo = new THREE.BufferGeometry();
    const nodePositions = new Float32Array(nodeCount * 3);
    const nodeBaseCoords = new Float32Array(nodeCount * 3);
    const nodePhases = new Float32Array(nodeCount);

    for (let i = 0; i < nodeCount; i++) {
      const x = (Math.random() - 0.5) * 620;
      const y = (Math.random() - 0.5) * 460;
      const z = (Math.random() - 0.5) * 320 + 20;
      nodePositions[i * 3] = x;
      nodePositions[i * 3 + 1] = y;
      nodePositions[i * 3 + 2] = z;
      nodeBaseCoords[i * 3] = x;
      nodeBaseCoords[i * 3 + 1] = y;
      nodeBaseCoords[i * 3 + 2] = z;
      nodePhases[i] = Math.random() * Math.PI * 2;
    }
    const nodePosAttr = new THREE.BufferAttribute(nodePositions, 3);
    nodeGeo.setAttribute('position', nodePosAttr);

    const nodeMat = new THREE.PointsMaterial({
      color: currentPrimaryColor,
      size: 5.2,
      map: glowSpriteTex,
      transparent: true,
      opacity: 0.82,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const nodePoints = new THREE.Points(nodeGeo, nodeMat);
    scene.add(nodePoints);

    // 3. Volumetric Shader Aura Disc (GLSL ShaderMaterial — Smooth Cosmic Nebula & Energy Waves)
    const shaderUniforms = {
      uTime: { value: 0 },
      uPrimaryColor: { value: new THREE.Color(activeProfile.primaryHex) },
      uSecondaryColor: { value: new THREE.Color(activeProfile.secondaryHex) },
      uWaveIntensity: { value: activeProfile.waveIntensity },
    };

    const nebulaShaderMat = new THREE.ShaderMaterial({
      uniforms: shaderUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        uniform vec3 uPrimaryColor;
        uniform vec3 uSecondaryColor;
        uniform float uWaveIntensity;

        void main() {
          vec2 centered = vUv * 2.0 - 1.0;
          float dist = length(centered);
          float angle = atan(centered.y, centered.x);

          // Harmonic radial rings & volumetric nebula wave
          float wave1 = sin(dist * 10.0 - uTime * 0.8 + sin(angle * 3.0 + uTime * 0.4) * uWaveIntensity) * 0.5 + 0.5;
          float wave2 = cos(dist * 6.0 + uTime * 0.5 - cos(angle * 2.0) * uWaveIntensity) * 0.5 + 0.5;

          float falloff = smoothstep(1.0, 0.12, dist);
          vec3 mixedCol = mix(uSecondaryColor, uPrimaryColor, wave1 * 0.65 + wave2 * 0.35);
          float alpha = falloff * (0.045 + 0.045 * wave1 * wave2);

          gl_FragColor = vec4(mixedCol, alpha);
        }
      `,
    });

    const nebulaPlaneGeo = new THREE.PlaneGeometry(780, 780, 1, 1);
    const nebulaPlane = new THREE.Mesh(nebulaPlaneGeo, nebulaShaderMat);
    nebulaPlane.position.set(0, 0, -140);
    scene.add(nebulaPlane);

    // 4. Volumetric Cosmic Dust Layer
    const dustCount = Math.floor(particleCount * 0.45);
    const dustGeo = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPositions[i * 3] = (Math.random() - 0.5) * 900;
      dustPositions[i * 3 + 1] = (Math.random() - 0.5) * 700;
      dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 550 - 60;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));

    const dustMat = new THREE.PointsMaterial({
      color: currentSecondaryColor,
      size: 3.4,
      map: glowSpriteTex,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const cosmicDustPoints = new THREE.Points(dustGeo, dustMat);
    scene.add(cosmicDustPoints);

    // Listen for SGX Pillar / Tenant changes to mutate universe physics, colors, and shaders
    const applyPillarProfile = (rawIdentifier?: string) => {
      const pKey = resolvePillarKeyFromNameOrId(rawIdentifier);
      const nextProfile = PILLAR_UNIVERSE_PROFILES[pKey] || PILLAR_UNIVERSE_PROFILES.STORY;
      activeProfile = nextProfile;
      targetPrimaryColor.setHex(nextProfile.primaryHex);
      targetSecondaryColor.setHex(nextProfile.secondaryHex);
      targetFogColor.setHex(nextProfile.fogHex);
      warpImpulse = 1.6; // Trigger brief spatial warp surge on pillar docking
    };

    const handleTenantChanged = (e: Event) => {
      const custom = e as CustomEvent;
      const detail = custom.detail;
      const idOrPillar = detail?.pillarId || detail?.slug || detail?.id || 'STORY';
      applyPillarProfile(idOrPillar);
    };

    const handlePillarDocked = (e: Event) => {
      const custom = e as CustomEvent<{ pillarId?: string }>;
      if (custom.detail?.pillarId) {
        applyPillarProfile(custom.detail.pillarId);
      }
    };

    window.addEventListener('sgx_tenant_changed', handleTenantChanged);
    window.addEventListener('sgx:pillar_docked', handlePillarDocked);

    // Pointer events
    const handlePointerMove = (e: MouseEvent) => {
      if (!interactive || prefersReducedMotion) return;
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = -(e.clientY / window.innerHeight) * 2 + 1;
      mouseRef.current.targetX = nx * 36;
      mouseRef.current.targetY = ny * 26;
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });

    const handleResize = () => {
      if (!container || !renderer) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    let isTabVisible = !document.hidden;
    const handleVisibility = () => {
      isTabVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const timer = typeof (THREE as any).Timer === 'function' ? new (THREE as any).Timer() : null;
    let accumulatedElapsed = 0;

    const animate = (timestamp?: number) => {
      reqIdRef.current = requestAnimationFrame(animate);
      if (!isTabVisible) return;

      let delta = 0.016;
      let time = 0;

      if (timer) {
        timer.update(timestamp);
        delta = Math.min(timer.getDelta(), 0.1);
        time = timer.getElapsed();
      } else {
        const now = timestamp ?? performance.now();
        delta = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;
        accumulatedElapsed += delta;
        time = accumulatedElapsed;
      }

      // Smoothly interpolate colors & physics parameters toward active pillar
      currentPrimaryColor.lerp(targetPrimaryColor, 0.05);
      currentSecondaryColor.lerp(targetSecondaryColor, 0.05);
      fog.color.lerp(targetFogColor, 0.05);
      fog.density += (activeProfile.fogDensity - fog.density) * 0.05;

      currentOrbitalSpeed += (activeProfile.orbitalSpeed - currentOrbitalSpeed) * 0.05;
      currentWaveIntensity += (activeProfile.waveIntensity - currentWaveIntensity) * 0.05;
      warpImpulse = Math.max(0, warpImpulse - delta * 2.2);

      nodeMat.color.copy(currentPrimaryColor);
      deepStarMat.color.copy(currentSecondaryColor);
      dustMat.color.copy(currentSecondaryColor);

      shaderUniforms.uTime.value = time * currentOrbitalSpeed;
      shaderUniforms.uPrimaryColor.value.copy(currentPrimaryColor);
      shaderUniforms.uSecondaryColor.value.copy(currentSecondaryColor);
      shaderUniforms.uWaveIntensity.value = currentWaveIntensity + warpImpulse;

      if (!prefersReducedMotion) {
        mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.04;
        mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.04;

        camera.position.x = mouseRef.current.x;
        camera.position.y = mouseRef.current.y;
        camera.lookAt(0, 0, 0);

        const speedMult = currentOrbitalSpeed + warpImpulse;

        // Mutate particle kinematics based on active Pillar physicsMode
        const posArr = nodePosAttr.array as Float32Array;
        const mode = activeProfile.physicsMode;

        for (let i = 0; i < nodeCount; i++) {
          const ix = i * 3;
          const iy = i * 3 + 1;
          const iz = i * 3 + 2;
          const phase = nodePhases[i];
          const bx = nodeBaseCoords[ix];
          const by = nodeBaseCoords[iy];
          const bz = nodeBaseCoords[iz];

          if (mode === 'ASCENDING_EMBERS') {
            // Warm ascending embers for SGX.STORY
            posArr[ix] = bx + Math.sin(time * 0.6 + phase) * 14;
            posArr[iy] = ((by + 230 + time * 18 * speedMult) % 460) - 230;
            posArr[iz] = bz + Math.cos(time * 0.5 + phase) * 10;
          } else if (mode === 'SONIC_WAVES') {
            // Equalizer acoustic wave modulation for SGX.STAGE
            posArr[ix] = bx;
            posArr[iy] = by + Math.sin(bx * 0.025 + time * 2.6 + phase) * 28;
            posArr[iz] = bz + Math.cos(by * 0.02 + time * 2.0) * 18;
          } else if (mode === 'KINETIC_VORTEX') {
            // High-energy centrifugal spiral for SGX.SPARK
            const angle = phase + time * 0.45 * speedMult;
            const radius = Math.sqrt(bx * bx + by * by) * 0.85;
            posArr[ix] = Math.cos(angle) * radius;
            posArr[iy] = Math.sin(angle) * radius;
            posArr[iz] = bz + Math.sin(time * 3.0 + phase) * 22;
          } else if (mode === 'PRECISION_LATTICE') {
            // Synchronized quantized telemetry orbits for SGX.SYSTEM
            posArr[ix] = bx + Math.cos(time * 0.9 + phase) * 8;
            posArr[iy] = by + Math.sin(time * 0.9 + phase) * 8;
            posArr[iz] = bz;
          } else if (mode === 'HOLOGRAPHIC_GALLERY') {
            // Smooth panoramic depth shimmer for SGX.SHOWCASE
            posArr[ix] = bx + Math.sin(time * 0.4 + phase) * 18;
            posArr[iy] = by + Math.cos(time * 0.35 + phase) * 12;
            posArr[iz] = bz + Math.sin(time * 1.1 + phase) * 26;
          } else {
            // HARMONIC_CONVERGENCE for SGX.SYNTHESIZE
            const pulse = 1 + Math.sin(time * 1.2 + phase * 0.5) * 0.12;
            posArr[ix] = bx * pulse;
            posArr[iy] = by * pulse;
            posArr[iz] = bz + Math.cos(time * 1.4 + phase) * 16;
          }
        }
        nodePosAttr.needsUpdate = true;

        deepStarPoints.rotation.y += delta * 0.014 * speedMult;
        deepStarPoints.rotation.x = Math.sin(time * 0.1) * 0.05;

        nodePoints.rotation.y -= delta * 0.018 * speedMult;
        nebulaPlane.rotation.z = time * 0.04 * currentOrbitalSpeed;

        cosmicDustPoints.rotation.y += delta * 0.01 * speedMult;
        cosmicDustPoints.rotation.x -= delta * 0.006 * speedMult;
      }

      if (renderer) {
        renderer.render(scene, camera);
      }
    };

    animate();

    return () => {
      if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current);
      window.removeEventListener('sgx_tenant_changed', handleTenantChanged);
      window.removeEventListener('sgx:pillar_docked', handlePillarDocked);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      canvasEl.removeEventListener('webglcontextlost', handleContextLost);
      canvasEl.removeEventListener('webglcontextrestored', handleContextRestored);

      deepStarGeo.dispose();
      deepStarMat.dispose();
      nodeGeo.dispose();
      nodeMat.dispose();
      dustGeo.dispose();
      dustMat.dispose();
      glowSpriteTex.dispose();
      nebulaPlaneGeo.dispose();
      nebulaShaderMat.dispose();

      if (renderer && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
        renderer.dispose();
      }
    };
  }, [particleCount, interactive]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`fixed inset-0 pointer-events-none z-0 overflow-hidden ${className}`}
      style={{
        background: 'radial-gradient(ellipse at 50% 18%, rgba(14, 23, 42, 0.45) 0%, rgba(5, 8, 15, 0.96) 100%)',
      }}
    />
  );
};
