import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { runAnime } from '../../lib/animeHelper';
import { 
  VisualizerPresetId, 
  VisualizerPreset,
  VoteSummary, 
  StageRenderSettings, 
  Question, 
  ReactionBurst, 
  CustomVisualAssets 
} from '../../types/engine';
import { getAllPresets, DEFAULT_PRESET } from '../../lib/presets';
import { getOrLoadTexture, BUILTIN_PARTICLE_SPRITES } from '../../lib/assetCache';
import { DOME_ENERGY_FRAG } from '../../immersion/shaders/effects';
import { createCorePost, createFloor, type CorePost, type CoreFloor } from '../../immersion/shaders/coreFx';
import { hexToVec3 } from '../../immersion/shaders/glslLib';

// Inside of a big sphere around the stage: the energy smoke of the main 3D core.
const BACKDROP_VERT = /* glsl */ `
  varying vec3 vWorldDirection;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldDirection = normalize(wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;

const BAR_SPACING = 5.5;
const BAR_Z = 3;
const FLOOR_Y = -0.6;

function createProcedural3DModel(type: string, themeColorHex?: string, accentColorHex?: string): THREE.Group {
  const modelGroup = new THREE.Group();
  const themeColor = new THREE.Color(themeColorHex || '#00ddff');
  const accentColor = new THREE.Color(accentColorHex || '#ff0055');

  if (type === 'model_crystal') {
    const mat = new THREE.MeshStandardMaterial({
      color: themeColor,
      emissive: accentColor,
      emissiveIntensity: 0.6,
      metalness: 0.9,
      roughness: 0.1,
      side: THREE.DoubleSide,
    });
    const mainShard = new THREE.Mesh(new THREE.ConeGeometry(2.5, 6, 6), mat);
    mainShard.position.y = 1;
    modelGroup.add(mainShard);

    for (let i = 0; i < 6; i++) {
      const subShard = new THREE.Mesh(new THREE.ConeGeometry(1.0, 3.5, 5), mat);
      const angle = (i / 6) * Math.PI * 2;
      subShard.position.set(Math.cos(angle) * 2.2, -0.5, Math.sin(angle) * 2.2);
      subShard.rotation.z = (Math.random() - 0.5) * 0.8;
      subShard.rotation.x = (Math.random() - 0.5) * 0.8;
      modelGroup.add(subShard);
    }
  } else if (type === 'model_cyber_skull') {
    const skullMat = new THREE.MeshStandardMaterial({
      color: themeColor,
      emissive: accentColor,
      emissiveIntensity: 0.8,
      wireframe: true,
      metalness: 0.9,
      roughness: 0.1,
    });
    const head = new THREE.Mesh(new THREE.DodecahedronGeometry(3.0, 1), skullMat);
    modelGroup.add(head);

    const eyeMat = new THREE.MeshBasicMaterial({ color: accentColor });
    const eye1 = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 16), eyeMat);
    const eye2 = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 16), eyeMat);
    eye1.position.set(-1.0, 0.4, 2.2);
    eye2.position.set(1.0, 0.4, 2.2);
    modelGroup.add(eye1);
    modelGroup.add(eye2);
  } else if (type === 'model_torus_hyper') {
    const mat1 = new THREE.MeshStandardMaterial({ color: themeColor, emissive: themeColor, emissiveIntensity: 0.8, wireframe: true });
    const mat2 = new THREE.MeshStandardMaterial({ color: accentColor, emissive: accentColor, emissiveIntensity: 0.8, wireframe: false });
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(3.5, 0.6, 24, 64), mat1);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.8, 0.4, 24, 64), mat2);
    ring2.rotation.x = Math.PI / 2;
    modelGroup.add(ring1);
    modelGroup.add(ring2);
  } else {
    // Hyper-cube tesseract
    const outerMat = new THREE.MeshStandardMaterial({ color: themeColor, wireframe: true });
    const innerMat = new THREE.MeshStandardMaterial({ color: accentColor, emissive: accentColor, emissiveIntensity: 1.2 });
    const outer = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 4), outerMat);
    const inner = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), innerMat);
    modelGroup.add(outer);
    modelGroup.add(inner);
  }

  return modelGroup;
}

interface StageVisualizerProps {
  presetId: VisualizerPresetId;
  customPresetOverride?: VisualizerPreset | null;
  voteSummary?: VoteSummary | null;
  currentQuestion?: Question | null;
  timeRemaining?: number;
  totalDuration?: number;
  sessionStatus?: string;
  reactions?: ReactionBurst[];
  settings?: StageRenderSettings;
  isTransparent?: boolean;
  isCompact?: boolean;
  isMasterCanvasOnly?: boolean;
  autoHideUIOnVoteEnd?: boolean;
  customAssets?: CustomVisualAssets;
}

export const StageVisualizer: React.FC<StageVisualizerProps> = ({
  presetId,
  customPresetOverride,
  voteSummary,
  currentQuestion,
  timeRemaining = 0,
  totalDuration = 30,
  sessionStatus = 'IDLE',
  reactions = [],
  settings = {
    transparentBackground: false,
    showHUD: true,
    show3DVotingBars: true,
    cameraMotion: true,
    particleDensityMultiplier: 1.0,
    resolutionQuality: 'high',
    bloomIntensity: 1.2,
  },
  isTransparent = false,
  isCompact = false,
  isMasterCanvasOnly = false,
  autoHideUIOnVoteEnd = true,
  customAssets,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const particleVelocitiesRef = useRef<Float32Array | null>(null);
  const coreMeshRef = useRef<THREE.Mesh | THREE.Group | null>(null);
  const visualGroupRef = useRef<THREE.Group | null>(null);
  const barsGroupRef = useRef<THREE.Group | null>(null);
  const custom3dModelGroupRef = useRef<THREE.Group | null>(null);
  const electricArcsRef = useRef<THREE.LineSegments | null>(null);
  const animationFrameRef = useRef<number>(0);
  const activePresetRef = useRef<VisualizerPreset>(DEFAULT_PRESET);

  // Stage atmosphere: energy backdrop + shader floor take the preset's colors; bloom when the device allows.
  const floorRef = useRef<CoreFloor | null>(null);
  const backdropRef = useRef<THREE.ShaderMaterial | null>(null);
  const targetColorsRef = useRef<{ a: THREE.Vector3; b: THREE.Vector3 }>({ a: new THREE.Vector3(0, 0.87, 1), b: new THREE.Vector3(0.99, 0.8, 0.05) });
  const pulseRef = useRef(0);
  const postRef = useRef<CorePost | null>(null);

  // Cached asset URL references to prevent endless reload loops
  const loadedBgUrlRef = useRef<string | null>(null);
  const loadedLogoUrlRef = useRef<string | null>(null);
  const loadedParticleUrlRef = useRef<string | null>(null);
  const loadedModelUrlRef = useRef<string | null>(null);
  const modelGroupScaleRef = useRef(1);

  // Synchronized refs for zero-allocation 60fps render loop
  const voteSummaryRef = useRef<VoteSummary | null | undefined>(voteSummary);
  voteSummaryRef.current = voteSummary;
  const currentQuestionRef = useRef<Question | null | undefined>(currentQuestion);
  currentQuestionRef.current = currentQuestion;
  const customAssetsRef = useRef<CustomVisualAssets | undefined>(customAssets);
  customAssetsRef.current = customAssets;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Main Three.js Scene Setup & Render Loop
  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth || window.innerWidth;
    const height = mountRef.current.clientHeight || window.innerHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    if (!isTransparent && !settings.transparentBackground) {
      scene.background = new THREE.Color(0x0a0c10);
      scene.fog = new THREE.FogExp2(0x0a0c10, 0.015);
    } else {
      scene.background = null;
    }

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 5, 22);
    camera.lookAt(0, 2, 0);
    cameraRef.current = camera;

    // 3. Renderer with high performance profile
    const renderer = new THREE.WebGLRenderer({
      antialias: settings.resolutionQuality === 'ultra',
      alpha: true,
      powerPreference: 'high-performance',
      precision: 'mediump',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, settings.resolutionQuality === 'ultra' ? 2 : 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;

    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x00ffff, 2.0);
    dirLight1.position.set(10, 20, 15);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xff007f, 1.5);
    dirLight2.position.set(-10, -10, -10);
    scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0xfdcc0d, 2.5, 50);
    pointLight.position.set(0, 6, 0);
    scene.add(pointLight);

    // Atmosphere: energy backdrop + shader floor in the preset's colors, bloom + grade on top.
    // A transparent (OBS) stage skips the backdrop and the post-processing so the alpha survives.
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const transparentBg = isTransparent || settings.transparentBackground;
    const post = transparentBg ? null : createCorePost(renderer, scene, camera, width, height, { coarse: false, reduceMotion });
    postRef.current = post;
    const linear = !!post;
    const colorA = { value: targetColorsRef.current.a.clone() };
    const colorB = { value: targetColorsRef.current.b.clone() };
    let backdrop: THREE.Mesh | null = null;
    if (!transparentBg) {
      const drawSize = renderer.getDrawingBufferSize(new THREE.Vector2());
      const backdropMat = new THREE.ShaderMaterial({
        vertexShader: BACKDROP_VERT,
        fragmentShader: DOME_ENERGY_FRAG,
        defines: linear ? { SGX_LINEAR: 1 } : {},
        uniforms: {
          uTime: { value: 0 },
          uPulse: { value: 0 },
          uColorA: colorA,
          uColorB: colorB,
          uRes: { value: new THREE.Vector2(drawSize.x, drawSize.y) },
          uMouse: { value: new THREE.Vector2(0.5, 0.42) },
          uDrift: { value: 0 },
          uMotion: { value: reduceMotion ? 0 : 1 },
          uGain: { value: 0.55 },
        },
        side: THREE.BackSide,
        depthWrite: false,
      });
      backdrop = new THREE.Mesh(new THREE.SphereGeometry(300, 48, 32), backdropMat);
      backdrop.name = 'stageBackdrop';
      scene.add(backdrop);
      backdropRef.current = backdropMat;
    }
    const floor = createFloor(colorA, colorB, FLOOR_Y, 0.9, linear, 4);
    scene.add(floor.mesh);
    floorRef.current = floor;

    // Groups
    const visualGroup = new THREE.Group();
    scene.add(visualGroup);
    visualGroupRef.current = visualGroup;

    // Vote towers stand on the floor in front; while they show, the core rises and shrinks above them.
    const barsGroup = new THREE.Group();
    barsGroup.position.set(0, FLOOR_Y, BAR_Z);
    scene.add(barsGroup);
    barsGroupRef.current = barsGroup;

    const modelGroup = new THREE.Group();
    modelGroup.position.set(0, 4, 0);
    scene.add(modelGroup);
    custom3dModelGroupRef.current = modelGroup;

    // Build initial preset visuals
    const initialPreset = customPresetOverride || getAllPresets()[presetId] || DEFAULT_PRESET;
    activePresetRef.current = initialPreset;
    rebuildPresetVisuals(initialPreset, visualGroup);

    // Resize Observer
    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
      postRef.current?.setSize(w, h);
      if (backdropRef.current) {
        const ds = rendererRef.current.getDrawingBufferSize(new THREE.Vector2());
        backdropRef.current.uniforms.uRes.value.set(ds.x, ds.y);
      }
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(mountRef.current);
    window.addEventListener('resize', handleResize);

    // Listen for global tenant vibe preset changes
    const handleTenantChange = (evt: Event) => {
      const customEvt = evt as CustomEvent;
      const tenant = customEvt.detail;
      if (!tenant || !tenant.branding) return;

      const tPresetId = tenant.presetId || 'preset_story_float';
      const basePreset = getAllPresets()[tPresetId] || DEFAULT_PRESET;
      const customPreset: VisualizerPreset = {
        ...basePreset,
        themeColor: tenant.branding.primaryColor,
        secondaryColor: tenant.branding.secondaryColor || '#767676',
        accentColor: tenant.branding.accentColor,
        neonHighlightColor: tenant.branding.neonHighlightColor,
        glitchIntensity: Math.min(1.0, (tenant.erraticRating || 1) * 0.15),
        cameraShake: Math.min(1.0, (tenant.erraticRating || 1) * 0.1),
        warpSpeed: 0.8 + (tenant.erraticRating || 1) * 0.25,
      };

      activePresetRef.current = customPreset;
      if (visualGroupRef.current) {
        rebuildPresetVisuals(customPreset, visualGroupRef.current);
      }
      if (sceneRef.current && tenant.branding.backgroundColor && !settings.transparentBackground) {
        sceneRef.current.background = new THREE.Color(tenant.branding.backgroundColor);
      }
    };

    window.addEventListener('sgx_tenant_changed', handleTenantChange);

    // 5. Optimized 60 FPS Render Loop
    let lastTime = performance.now();
    const startTime = lastTime;
    let focus = 0;

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      const now = performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      const t = (now - startTime) / 1000;
      const curPreset = activePresetRef.current;

      const glitchIntensity = curPreset.glitchIntensity || 0;
      const cameraShake = curPreset.cameraShake || 0;
      const warpSpeed = curPreset.warpSpeed || 1.0;
      const behavior = curPreset.particleBehavior || 'ambient_float';

      // 1. Camera Floating Drift & Glitch / Shake Simulation
      if (settingsRef.current.cameraMotion && cameraRef.current) {
        let camX = Math.sin(t * 0.25) * 1.5;
        let camY = 5 + Math.cos(t * 0.3) * 0.8;
        let camZ = 22;

        if (cameraShake > 0 || glitchIntensity > 0.4) {
          // Kept small: this runs on a venue screen.
          const jitter = (cameraShake + glitchIntensity * 0.5) * (Math.sin(t * 40.0) * 0.03);
          camX += (Math.random() - 0.5) * jitter;
          camY += (Math.random() - 0.5) * jitter;
        }

        // Hyperspace FOV compression effect
        if (curPreset.shaderKey === 'warp' && warpSpeed > 2.0) {
          cameraRef.current.fov = 60 + Math.sin(t * 2.0) * 3;
          cameraRef.current.updateProjectionMatrix();
        }

        cameraRef.current.position.set(camX, camY, camZ);
        cameraRef.current.lookAt(0, 2, 0);
      }

      // 1b. Make room for the vote towers: lift and shrink the core while they show.
      const towers = (barsGroupRef.current?.children.length ?? 0) > 0;
      focus += ((towers ? 1 : 0) - focus) * Math.min(1, delta * 2.5);
      const lift = focus * 4.5;
      const shrink = 1 - focus * 0.38;
      if (visualGroupRef.current) {
        visualGroupRef.current.position.y = lift;
        visualGroupRef.current.scale.setScalar(shrink);
      }
      if (custom3dModelGroupRef.current) custom3dModelGroupRef.current.scale.setScalar(shrink * modelGroupScaleRef.current);

      // 2. Rotate Main Visual Group
      if (visualGroupRef.current) {
        const rotSpeed = curPreset.coreRotationSpeed !== undefined ? curPreset.coreRotationSpeed : 1.0;
        visualGroupRef.current.rotation.y = t * 0.12 * rotSpeed;
      }

      // 3. Animate Custom 3D Model if present
      if (custom3dModelGroupRef.current && custom3dModelGroupRef.current.children.length > 0) {
        const rotSpeed = (customAssetsRef.current?.customModelRotationSpeed ?? curPreset.modelRotationSpeed) ?? 1.0;
        custom3dModelGroupRef.current.rotation.y += delta * 0.8 * rotSpeed;
        custom3dModelGroupRef.current.position.y = 4.5 + lift + Math.sin(t * 1.8) * 0.4;
      }

      // 4. Advanced High-Performance Particle Engine (Direct Buffer Update)
      if (particlesRef.current && particlesRef.current.geometry) {
        const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
        const count = positions.length / 3;
        const pLen = Math.min(count, 5000); // Process max 5000 particles per frame for solid 60fps
        const speed = (curPreset.particleSpeed || 1.0);

        if (behavior === 'tunnel_stream' || curPreset.shaderKey === 'warp') {
          // Hyperspace Tunnel Stream: Particles rush along Z towards camera
          for (let i = 0; i < pLen; i++) {
            const idx = i * 3;
            positions[idx + 2] += delta * 45 * speed * warpSpeed;
            if (positions[idx + 2] > 25) {
              positions[idx + 2] = -40;
              positions[idx] = (Math.random() - 0.5) * 35;
              positions[idx + 1] = (Math.random() - 0.5) * 35;
            }
          }
        } else if (behavior === 'upward_fountain' || curPreset.shaderKey === 'volcano') {
          // Convective Rising Embers Fountain
          for (let i = 0; i < pLen; i++) {
            const idx = i * 3;
            positions[idx + 1] += delta * 8 * speed;
            positions[idx] += Math.sin(t * 3.0 + i) * 0.03 * speed;
            positions[idx + 2] += Math.cos(t * 3.0 + i) * 0.03 * speed;
            if (positions[idx + 1] > 22) {
              positions[idx + 1] = -4;
              positions[idx] = (Math.random() - 0.5) * 12;
              positions[idx + 2] = (Math.random() - 0.5) * 12;
            }
          }
        } else if (behavior === 'matrix_fall' || curPreset.shaderKey === 'matrix') {
          // Digital Matrix Rain Streams
          for (let i = 0; i < pLen; i++) {
            const idx = i * 3;
            positions[idx + 1] -= delta * 15 * speed;
            if (positions[idx + 1] < -6) {
              positions[idx + 1] = 22;
              positions[idx] = (Math.random() - 0.5) * 32;
              positions[idx + 2] = (Math.random() - 0.5) * 32;
            }
          }
        } else if (behavior === 'vortex_spiral' || curPreset.shaderKey === 'vortex') {
          // Gravitational Singular Swirl
          for (let i = 0; i < pLen; i++) {
            const idx = i * 3;
            const x = positions[idx];
            const z = positions[idx + 2];
            const dist = Math.sqrt(x * x + z * z) + 0.1;
            const angle = Math.atan2(z, x) + (0.8 / dist) * delta * 4 * speed;
            positions[idx] = Math.cos(angle) * dist;
            positions[idx + 2] = Math.sin(angle) * dist;
            positions[idx + 1] += Math.sin(t * 2.0 + dist) * 0.02;
          }
        } else if (behavior === 'shockwave_pulse' || curPreset.shaderKey === 'plasma') {
          // Radial Shockwave Expansion
          for (let i = 0; i < pLen; i++) {
            const idx = i * 3;
            const factor = 1 + (Math.sin(t * 4.0 + i * 0.05) * 0.02 * speed);
            positions[idx] *= factor;
            positions[idx + 2] *= factor;
            if (Math.abs(positions[idx]) > 20) {
              positions[idx] = (Math.random() - 0.5) * 4;
              positions[idx + 2] = (Math.random() - 0.5) * 4;
            }
          }
        } else {
          // Ambient Harmonic Wave Float
          for (let i = 0; i < pLen; i++) {
            const idx = i * 3;
            positions[idx + 1] += Math.sin(t * 2.0 + i * 0.1) * 0.015 * speed;
            if (positions[idx + 1] > 20) positions[idx + 1] = -5;
            if (positions[idx + 1] < -5) positions[idx + 1] = 20;
          }
        }

        particlesRef.current.geometry.attributes.position.needsUpdate = true;
      }

      // 5. Core Geometry Animation
      if (coreMeshRef.current) {
        const rot = delta * 0.6 * (curPreset.coreRotationSpeed || 1.0);
        coreMeshRef.current.rotation.y += rot;
        coreMeshRef.current.rotation.x += rot * 0.4;

        // Dynamic Glitch Strobe Jitter on Core Mesh
        if (glitchIntensity > 0.3) {
          const jitterStep = Math.sin(t * 60) > 0.9 ? (Math.random() - 0.5) * 0.12 * glitchIntensity : 0;
          coreMeshRef.current.position.x = jitterStep;
        } else {
          coreMeshRef.current.position.x = 0;
        }
      }

      // 6. Animate Electric Tesla Arcs for Plasma Preset
      if (electricArcsRef.current) {
        const pos = electricArcsRef.current.geometry.attributes.position.array as Float32Array;
        const lineCount = pos.length / 6;
        for (let i = 0; i < lineCount; i++) {
          const idx = i * 6;
          // Endpoint 2 jitter
          pos[idx + 3] = (Math.random() - 0.5) * 12;
          pos[idx + 4] = 4 + (Math.random() - 0.5) * 8;
          pos[idx + 5] = (Math.random() - 0.5) * 12;
        }
        electricArcsRef.current.geometry.attributes.position.needsUpdate = true;
      }

      // 7. Custom Floating Logo Animation
      const logoMesh = visualGroupRef.current?.getObjectByName('customLogoMesh');
      if (logoMesh) {
        logoMesh.rotation.y = Math.sin(t * 0.8) * 0.25;
        logoMesh.position.y = 7.0 + Math.sin(t * 1.5) * 0.35;
      }

      // 8. Atmosphere: ease toward the preset colors, decay the pulse, move the smoke.
      const target = targetColorsRef.current;
      colorA.value.lerp(target.a, 0.03);
      colorB.value.lerp(target.b, 0.03);
      pulseRef.current *= 0.96;
      if (backdropRef.current) {
        const u = backdropRef.current.uniforms;
        u.uTime.value = t;
        u.uPulse.value = pulseRef.current;
        u.uDrift.value = reduceMotion ? 0 : t * 0.01;
      }
      floor.update(t);

      // Render Scene
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        if (postRef.current) {
          postRef.current.tick(delta * 1000, t);
          postRef.current.render();
        } else {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
      }
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('sgx_tenant_changed', handleTenantChange);
      postRef.current?.dispose();
      postRef.current = null;
      floor.dispose();
      floorRef.current = null;
      if (backdrop) {
        backdrop.geometry.dispose();
        (backdrop.material as THREE.Material).dispose();
      }
      backdropRef.current = null;
      renderer.dispose();
    };
  }, []);

  // Update preset visuals whenever presetId or customPresetOverride changes
  useEffect(() => {
    const preset = customPresetOverride || getAllPresets()[presetId] || DEFAULT_PRESET;
    activePresetRef.current = preset;

    if (visualGroupRef.current) {
      rebuildPresetVisuals(preset, visualGroupRef.current);
    }

    // Camera Warp Impulse on Preset Change
    if (cameraRef.current) {
      runAnime({
        targets: cameraRef.current.position,
        z: [28, 22],
        duration: 900,
        easing: 'easeOutExpo',
      });
    }
  }, [presetId, customPresetOverride]);

  // Dynamically load Custom 2D Assets (Background, Logo, Particle Sprites)
  useEffect(() => {
    const currentPreset = customPresetOverride || getAllPresets()[presetId] || DEFAULT_PRESET;
    const bgUrl = customAssets?.customBackgroundUrl || currentPreset.backgroundUrl || null;
    const logoUrl = customAssets?.customLogoUrl || currentPreset.logoUrl || null;
    const particleUrl = customAssets?.customParticleTextureUrl || currentPreset.particleTextureUrl || null;

    // 1. Custom 2D / 360 Background (Equirectangular Skybox Mapping)
    if (bgUrl !== loadedBgUrlRef.current) {
      loadedBgUrlRef.current = bgUrl;
      if (bgUrl) {
        const tex = getOrLoadTexture(bgUrl);
        tex.mapping = THREE.EquirectangularReflectionMapping;
        tex.colorSpace = THREE.SRGBColorSpace;
        if (sceneRef.current) {
          sceneRef.current.background = tex;
          sceneRef.current.environment = tex;
          const smoke = sceneRef.current.getObjectByName('stageBackdrop');
          if (smoke) smoke.visible = false;
        }
      } else if (sceneRef.current && !isTransparent && !settings.transparentBackground) {
        sceneRef.current.background = new THREE.Color(0x0a0c10);
        sceneRef.current.environment = null;
        const smoke = sceneRef.current.getObjectByName('stageBackdrop');
        if (smoke) smoke.visible = true;
      }
    }

    // 2. Custom 2D Floating Logo Mesh
    if (logoUrl !== loadedLogoUrlRef.current) {
      loadedLogoUrlRef.current = logoUrl;
      if (visualGroupRef.current) {
        const existingLogo = visualGroupRef.current.getObjectByName('customLogoMesh');
        if (existingLogo) visualGroupRef.current.remove(existingLogo);

        if (logoUrl) {
          const tex = getOrLoadTexture(logoUrl);
          const logoGeo = new THREE.PlaneGeometry(6, 6);
          const logoMat = new THREE.MeshStandardMaterial({
            map: tex,
            transparent: true,
            side: THREE.DoubleSide,
            roughness: 0.2,
            metalness: 0.8,
            emissive: new THREE.Color(0xffffff),
            emissiveMap: tex,
            emissiveIntensity: 0.2,
          });
          const logoMesh = new THREE.Mesh(logoGeo, logoMat);
          logoMesh.name = 'customLogoMesh';
          logoMesh.position.set(0, 7.5, -4);
          visualGroupRef.current.add(logoMesh);
        }
      }
    }

    // 3. Custom Particle Texture Sprite
    if (particleUrl !== loadedParticleUrlRef.current) {
      loadedParticleUrlRef.current = particleUrl;
      if (particlesRef.current && particlesRef.current.material) {
        const mat = particlesRef.current.material as THREE.PointsMaterial;
        mat.map = particleUrl ? getOrLoadTexture(particleUrl) : null;
        mat.needsUpdate = true;
      }
    }
  }, [
    presetId, 
    customPresetOverride, 
    customAssets?.customBackgroundUrl, 
    customAssets?.customLogoUrl, 
    customAssets?.customParticleTextureUrl
  ]);

  // Dynamically load Custom 3D Model (.glb / .gltf / .obj or procedural keyword)
  useEffect(() => {
    const currentPreset = customPresetOverride || getAllPresets()[presetId] || DEFAULT_PRESET;
    const modelUrl = customAssets?.customModel3dUrl || currentPreset.model3dUrl || null;
    const modelScale = (customAssets?.customModelScale ?? currentPreset.modelScale) ?? 1.0;

    if (!custom3dModelGroupRef.current) return;
    const group = custom3dModelGroupRef.current;

    if (modelUrl === loadedModelUrlRef.current && group.children.length > 0) {
      modelGroupScaleRef.current = modelScale;
      return;
    }

    if (modelUrl !== loadedModelUrlRef.current) {
      loadedModelUrlRef.current = modelUrl;
      modelGroupScaleRef.current = 1;

      while (group.children.length > 0) {
        group.remove(group.children[0]);
      }

      if (!modelUrl) return;

      const addModelToGroup = (model: THREE.Object3D) => {
        // Calculate exact bounding box to normalize pivot & dimensions
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1.0;

        // Center pivot at (0, 0, 0)
        model.position.sub(center);

        // Normalize scale to fit 5.5 units height
        const normalizedScale = (5.5 / maxDim) * modelScale;
        model.scale.set(normalizedScale, normalizedScale, normalizedScale);

        // Enforce DoubleSide materials and PBR lighting compatibility
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.castShadow = true;
            m.receiveShadow = true;
            if (m.material) {
              if (Array.isArray(m.material)) {
                m.material.forEach((mat) => {
                  mat.side = THREE.DoubleSide;
                  mat.needsUpdate = true;
                });
              } else {
                m.material.side = THREE.DoubleSide;
                m.material.needsUpdate = true;
              }
            }
          }
        });

        group.add(model);
      };

      // 1. Procedural 3D Model Fallback Keywords
      if (modelUrl.startsWith('model_')) {
        const procModel = createProcedural3DModel(modelUrl, currentPreset.themeColor, currentPreset.accentColor);
        addModelToGroup(procModel);
        return;
      }

      // 2. OBJ Loader
      const isObj = modelUrl.toLowerCase().includes('.obj') || modelUrl.startsWith('data:model/obj') || modelUrl.startsWith('data:text/plain');

      if (isObj) {
        const objLoader = new OBJLoader();
        objLoader.load(
          modelUrl,
          (obj) => {
            obj.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                mesh.material = new THREE.MeshStandardMaterial({
                  color: new THREE.Color(currentPreset.themeColor || '#00ddff'),
                  emissive: new THREE.Color(currentPreset.accentColor || '#0088ff').multiplyScalar(0.4),
                  metalness: 0.8,
                  roughness: 0.2,
                  side: THREE.DoubleSide,
                });
              }
            });
            addModelToGroup(obj);
          },
          undefined,
          (err) => console.warn('OBJ 3D Model load notice:', err)
        );
      } else {
        // 3. GLTF / GLB Loader with DRACO Loader & ArrayBuffer fetch fallback
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');

        const gltfLoader = new GLTFLoader();
        gltfLoader.setDRACOLoader(dracoLoader);

        fetch(modelUrl, { mode: 'cors' })
          .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.arrayBuffer();
          })
          .then((buffer) => {
            gltfLoader.parse(
              buffer,
              '',
              (gltf) => {
                const model = gltf.scene || gltf.scenes[0];
                addModelToGroup(model);
              },
              (parseErr) => {
                console.warn('GLTF ArrayBuffer parse fallback notice:', parseErr);
                gltfLoader.load(modelUrl, (gltf) => addModelToGroup(gltf.scene || gltf.scenes[0]));
              }
            );
          })
          .catch((fetchErr) => {
            console.warn('Fetch GLB notice, using direct loader:', fetchErr);
            gltfLoader.load(
              modelUrl,
              (gltf) => {
                const model = gltf.scene || gltf.scenes[0];
                addModelToGroup(model);
              },
              undefined,
              (loadErr) => {
                console.warn('GLTF load notice, utilizing procedural crystal fallback:', loadErr);
                const procFallback = createProcedural3DModel('model_crystal', currentPreset.themeColor, currentPreset.accentColor);
                addModelToGroup(procFallback);
              }
            );
          });
      }
    }
  }, [presetId, customPresetOverride, customAssets?.customModel3dUrl, customAssets?.customModelScale]);

  // Smoothly Tween 3D Voting Pillar Towers
  useEffect(() => {
    if (!barsGroupRef.current || !currentQuestion) return;

    const barsGroup = barsGroupRef.current;
    
    while (barsGroup.children.length > 0) {
      barsGroup.remove(barsGroup.children[0]);
    }

    if (!settings.show3DVotingBars || sessionStatus === 'IDLE') return;

    const optionCount = currentQuestion.options.length;
    const spacing = BAR_SPACING;
    const startX = -((optionCount - 1) * spacing) / 2;

    const revealed = sessionStatus === 'RESULT_REVEALED' && !!voteSummary?.winningOptionId;

    currentQuestion.options.forEach((opt, idx) => {
      const container = new THREE.Group();
      container.position.set(startX + idx * spacing, 0, 0);

      const percent = voteSummary?.optionPercentages[opt.id] ?? 0;
      const targetHeight = Math.max(0.6, (percent / 100) * 8);
      const isWinner = revealed && voteSummary?.winningOptionId === opt.id;
      const dim = revealed && !isWinner;

      // Base Pedestal
      const baseGeo = new THREE.CylinderGeometry(1.2, 1.4, 0.4, 32);
      const baseMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(opt.color).multiplyScalar(0.4),
        metalness: 0.8,
        roughness: 0.2,
      });
      const baseMesh = new THREE.Mesh(baseGeo, baseMat);
      baseMesh.position.y = 0.2;
      container.add(baseMesh);

      // Glowing Pillar Bar
      const pillarGeo = new THREE.BoxGeometry(1.4, 1, 1.4);
      const pillarMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(opt.color).multiplyScalar(dim ? 0.35 : 1),
        emissive: new THREE.Color(opt.color).multiplyScalar(isWinner ? 1.1 : dim ? 0.12 : 0.5),
        metalness: 0.4,
        roughness: 0.1,
        transparent: true,
        opacity: dim ? 0.45 : 0.88,
      });
      const pillarMesh = new THREE.Mesh(pillarGeo, pillarMat);
      pillarMesh.name = 'barMesh';
      pillarMesh.scale.y = 0.1;
      pillarMesh.position.y = 0.05;
      container.add(pillarMesh);

      // Wireframe overlay
      const wireGeo = new THREE.BoxGeometry(1.42, 1, 1.42);
      const wireMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(opt.color).lerp(new THREE.Color(0xffffff), 0.5),
        wireframe: true,
        transparent: true,
        opacity: dim ? 0.15 : 0.45,
      });
      const wireMesh = new THREE.Mesh(wireGeo, wireMat);
      pillarMesh.add(wireMesh);

      barsGroup.add(container);

      runAnime({
        targets: pillarMesh.scale,
        y: targetHeight,
        duration: 900,
        easing: 'easeOutElastic(1, .7)',
        update: () => {
          pillarMesh.position.y = pillarMesh.scale.y / 2;
        }
      });
    });
  }, [voteSummary, currentQuestion, sessionStatus, settings.show3DVotingBars]);

  // The room reacts: a ripple and a glow for each reaction, a big one when the result is revealed.
  const lastReactionRef = useRef<string | null>(null);
  useEffect(() => {
    const last = reactions[reactions.length - 1];
    if (!last || last.id === lastReactionRef.current) return;
    lastReactionRef.current = last.id;
    floorRef.current?.ripple((Math.random() - 0.5) * 18, (Math.random() - 0.5) * 8, 0.45);
    pulseRef.current = Math.min(1, pulseRef.current + 0.2);
  }, [reactions]);

  useEffect(() => {
    if (sessionStatus === 'RESULT_REVEALED') {
      const opts = currentQuestion?.options || [];
      const idx = Math.max(0, opts.findIndex((o) => o.id === voteSummary?.winningOptionId));
      const x = -((opts.length - 1) * BAR_SPACING) / 2 + idx * BAR_SPACING;
      floorRef.current?.ripple(x, BAR_Z, 1.4);
      pulseRef.current = 1;
    } else if (sessionStatus === 'VOTING_ACTIVE') {
      floorRef.current?.ripple(0, 0, 0.9);
      pulseRef.current = Math.max(pulseRef.current, 0.5);
    }
  }, [sessionStatus]);

  // Master Rebuild Function for All Shaders, UberShaders, Glitches, Warps, & Particles
  function rebuildPresetVisuals(preset: VisualizerPreset, group: THREE.Group) {
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    coreMeshRef.current = null;
    particlesRef.current = null;
    electricArcsRef.current = null;

    const pCount = Math.min(preset.particleDensity || 5000, 10000);
    const themeColor = new THREE.Color(preset.themeColor || '#00ddff');
    const accentColor = new THREE.Color(preset.accentColor || '#fdcc0d');
    targetColorsRef.current = {
      a: new THREE.Vector3(...hexToVec3(preset.themeColor || '#00ddff')),
      b: new THREE.Vector3(...hexToVec3(preset.accentColor || '#fdcc0d')),
    };
    pulseRef.current = Math.max(pulseRef.current, 0.6);
    floorRef.current?.ripple(0, 0, 1);
    const isWire = preset.wireframe !== false;

    // 1. Build Core Geometry based on preset config
    let coreGeo: THREE.BufferGeometry | null = null;
    const geomType = preset.coreGeometry || 'icosahedron';

    if (geomType === 'torus_knot') {
      coreGeo = new THREE.TorusKnotGeometry(3, 0.8, 128, 32);
    } else if (geomType === 'sphere_sun') {
      coreGeo = new THREE.SphereGeometry(4.5, 32, 32);
    } else if (geomType === 'octahedron') {
      coreGeo = new THREE.OctahedronGeometry(3.5, 2);
    } else if (geomType === 'dodecahedron') {
      coreGeo = new THREE.DodecahedronGeometry(3.2, 1);
    } else if (geomType === 'torus_ring') {
      coreGeo = new THREE.TorusGeometry(4.5, 1.2, 30, 80);
    } else if (geomType === 'cube_matrix') {
      coreGeo = new THREE.BoxGeometry(4, 4, 4);
    } else if (geomType !== 'none' && geomType !== 'custom_model') {
      coreGeo = new THREE.IcosahedronGeometry(3, 2);
    }

    if (coreGeo) {
      const coreMat = new THREE.MeshStandardMaterial({
        color: themeColor,
        emissive: accentColor,
        // Bloom does the glow now; very high values would blow out the projection.
        emissiveIntensity: Math.min(preset.bloomIntensity || 1.8, 1.3),
        wireframe: isWire,
        roughness: 0.2,
        metalness: 0.8,
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      coreMesh.position.y = 3.5;
      group.add(coreMesh);
      coreMeshRef.current = coreMesh;
    }

    // 3. Build Tesla Plasma Arcs for Plasma Preset
    if (preset.shaderKey === 'plasma') {
      const arcCount = 18;
      const arcPos = new Float32Array(arcCount * 6);
      for (let i = 0; i < arcCount; i++) {
        const idx = i * 6;
        arcPos[idx] = 0;
        arcPos[idx + 1] = 3.5;
        arcPos[idx + 2] = 0;
        arcPos[idx + 3] = (Math.random() - 0.5) * 12;
        arcPos[idx + 4] = 4 + (Math.random() - 0.5) * 8;
        arcPos[idx + 5] = (Math.random() - 0.5) * 12;
      }
      const arcGeo = new THREE.BufferGeometry();
      arcGeo.setAttribute('position', new THREE.BufferAttribute(arcPos, 3));
      const arcMat = new THREE.LineBasicMaterial({
        color: 0x00ffff,
        linewidth: 2,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
      });
      const arcs = new THREE.LineSegments(arcGeo, arcMat);
      group.add(arcs);
      electricArcsRef.current = arcs;
    }

    // 4. Build Particle Cloud Geometry & Attributes
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(pCount * 3);
    const colors = new Float32Array(pCount * 3);

    for (let i = 0; i < pCount; i++) {
      const idx = i * 3;
      const radius = Math.random() * 20 + 2;
      const angle = Math.random() * Math.PI * 2;
      const spread = (Math.random() - 0.5) * 10;

      if (preset.particleBehavior === 'tunnel_stream' || preset.shaderKey === 'warp') {
        pos[idx] = (Math.random() - 0.5) * 35;
        pos[idx + 1] = (Math.random() - 0.5) * 35;
        pos[idx + 2] = (Math.random() - 0.5) * 60 - 10;
      } else if (preset.particleBehavior === 'upward_fountain' || preset.shaderKey === 'volcano') {
        pos[idx] = (Math.random() - 0.5) * 14;
        pos[idx + 1] = Math.random() * 26 - 4;
        pos[idx + 2] = (Math.random() - 0.5) * 14;
      } else if (preset.particleBehavior === 'matrix_fall' || preset.shaderKey === 'matrix') {
        pos[idx] = (Math.random() - 0.5) * 30;
        pos[idx + 1] = Math.random() * 28 - 6;
        pos[idx + 2] = (Math.random() - 0.5) * 30;
      } else {
        pos[idx] = Math.cos(angle) * radius;
        pos[idx + 1] = spread + Math.sin(radius) * 1.5;
        pos[idx + 2] = Math.sin(angle) * radius;
      }

      // Color Gradient interpolation between themeColor and accentColor
      const ratio = Math.random();
      colors[idx] = themeColor.r * (1 - ratio) + accentColor.r * ratio;
      colors[idx + 1] = themeColor.g * (1 - ratio) + accentColor.g * ratio;
      colors[idx + 2] = themeColor.b * (1 - ratio) + accentColor.b * ratio;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Resolve particle texture sprite
    let spriteTex: THREE.Texture | null = null;
    if (preset.particleTextureUrl) {
      spriteTex = getOrLoadTexture(preset.particleTextureUrl);
    } else if (preset.particleShape && BUILTIN_PARTICLE_SPRITES[preset.particleShape]) {
      spriteTex = getOrLoadTexture(BUILTIN_PARTICLE_SPRITES[preset.particleShape].dataUri);
    }

    const blending = preset.particleBlending === 'multiply' 
      ? THREE.MultiplyBlending 
      : preset.particleBlending === 'normal' 
      ? THREE.NormalBlending 
      : THREE.AdditiveBlending;

    const pMat = new THREE.PointsMaterial({
      size: preset.particleSize || 0.16,
      vertexColors: true,
      map: spriteTex,
      blending: blending,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });

    const points = new THREE.Points(geo, pMat);
    group.add(points);
    particlesRef.current = points;
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-black select-none">
      <div ref={mountRef} className="w-full h-full absolute inset-0" />
    </div>
  );
};
