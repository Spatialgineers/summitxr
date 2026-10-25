import React, { useEffect, useRef, useState } from 'react';
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
import { getAllPresets, DEFAULT_PRESET, saveCustomPreset } from '../../lib/presets';
import { 
  getOrLoadTexture, 
  BUILTIN_PARTICLE_SPRITES, 
  BUILTIN_3D_SAMPLES, 
  BUILTIN_BG_SAMPLES 
} from '../../lib/assetCache';
import { 
  Gamepad2, 
  Sliders, 
  Sparkles, 
  Box, 
  Zap, 
  Image as ImageIcon, 
  Palette, 
  X, 
  Check, 
  Link as LinkIcon, 
  RefreshCw,
  Eye,
  Layers,
  Flame,
  Globe
} from 'lucide-react';

function createProcedural3DModel(type: string, themeColorHex?: string, accentColorHex?: string): THREE.Group {
  const modelGroup = new THREE.Group();
  const themeColor = new THREE.Color(themeColorHex || '#00ffff');
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
  onExitToGame?: () => void;
  onUpdateCustomPreset?: (preset: VisualizerPreset) => void;
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
  onExitToGame,
  onUpdateCustomPreset,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const particleVelocitiesRef = useRef<Float32Array | null>(null);
  const coreMeshRef = useRef<THREE.Mesh | THREE.Group | null>(null);
  const gridMeshRef = useRef<THREE.GridHelper | null>(null);
  const visualGroupRef = useRef<THREE.Group | null>(null);
  const barsGroupRef = useRef<THREE.Group | null>(null);
  const custom3dModelGroupRef = useRef<THREE.Group | null>(null);
  const electricArcsRef = useRef<THREE.LineSegments | null>(null);
  const animationFrameRef = useRef<number>(0);
  const activePresetRef = useRef<VisualizerPreset>(DEFAULT_PRESET);

  // Live Interactive Controls Drawer Overlay State
  const [showVisualControls, setShowVisualControls] = useState(false);
  const [controlTab, setControlTab] = useState<'3D_MODEL' | 'SHADERS' | 'PARTICLES' | 'EFFECTS' | 'ENVIRONMENT'>('3D_MODEL');
  const [livePreset, setLivePreset] = useState<VisualizerPreset>(() => {
    return customPresetOverride || getAllPresets()[presetId] || DEFAULT_PRESET;
  });
  const [customModelUrlInput, setCustomModelUrlInput] = useState<string>('');
  const [customBgInput, setCustomBgInput] = useState<string>('');
  const [modelLoadMsg, setModelLoadMsg] = useState<string | null>(null);

  // Cached asset URL references to prevent endless reload loops
  const loadedBgUrlRef = useRef<string | null>(null);
  const loadedLogoUrlRef = useRef<string | null>(null);
  const loadedParticleUrlRef = useRef<string | null>(null);
  const loadedModelUrlRef = useRef<string | null>(null);

  // Synchronized refs for zero-allocation 60fps render loop
  const voteSummaryRef = useRef<VoteSummary | null | undefined>(voteSummary);
  voteSummaryRef.current = voteSummary;
  const currentQuestionRef = useRef<Question | null | undefined>(currentQuestion);
  currentQuestionRef.current = currentQuestion;
  const customAssetsRef = useRef<CustomVisualAssets | undefined>(customAssets);
  customAssetsRef.current = customAssets;

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

    // Groups
    const visualGroup = new THREE.Group();
    scene.add(visualGroup);
    visualGroupRef.current = visualGroup;

    const barsGroup = new THREE.Group();
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
        secondaryColor: tenant.branding.secondaryColor || '#64748B',
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
      if (settings.cameraMotion && cameraRef.current) {
        let camX = Math.sin(t * 0.25) * 1.5;
        let camY = 5 + Math.cos(t * 0.3) * 0.8;
        let camZ = 22;

        if (cameraShake > 0 || glitchIntensity > 0.4) {
          const jitter = (cameraShake + glitchIntensity * 0.5) * (Math.sin(t * 40.0) * 0.08);
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

      // 2. Rotate Main Visual Group
      if (visualGroupRef.current) {
        const rotSpeed = curPreset.coreRotationSpeed !== undefined ? curPreset.coreRotationSpeed : 1.0;
        visualGroupRef.current.rotation.y = t * 0.12 * rotSpeed;
      }

      // 3. Animate Custom 3D Model if present
      if (custom3dModelGroupRef.current && custom3dModelGroupRef.current.children.length > 0) {
        const rotSpeed = (customAssetsRef.current?.customModelRotationSpeed ?? curPreset.modelRotationSpeed) ?? 1.0;
        custom3dModelGroupRef.current.rotation.y += delta * 0.8 * rotSpeed;
        custom3dModelGroupRef.current.position.y = 4.5 + Math.sin(t * 1.8) * 0.4;
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
          const jitterStep = Math.sin(t * 60) > 0.8 ? (Math.random() - 0.5) * 0.3 * glitchIntensity : 0;
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

      // Render Scene
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('sgx_tenant_changed', handleTenantChange);
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
        }
      } else if (sceneRef.current && !isTransparent && !settings.transparentBackground) {
        sceneRef.current.background = new THREE.Color(0x0a0c10);
        sceneRef.current.environment = null;
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
      group.scale.set(modelScale, modelScale, modelScale);
      return;
    }

    if (modelUrl !== loadedModelUrlRef.current) {
      loadedModelUrlRef.current = modelUrl;

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
                  color: new THREE.Color(currentPreset.themeColor || '#00ffff'),
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
    const spacing = 4.5;
    const startX = -((optionCount - 1) * spacing) / 2;

    currentQuestion.options.forEach((opt, idx) => {
      const container = new THREE.Group();
      container.position.set(startX + idx * spacing, 0, 0);

      const percent = voteSummary?.optionPercentages[opt.id] ?? 0;
      const targetHeight = Math.max(0.6, (percent / 100) * 24);

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
        color: new THREE.Color(opt.color),
        emissive: new THREE.Color(opt.color).multiplyScalar(0.6),
        metalness: 0.4,
        roughness: 0.1,
        transparent: true,
        opacity: 0.92,
      });
      const pillarMesh = new THREE.Mesh(pillarGeo, pillarMat);
      pillarMesh.name = 'barMesh';
      pillarMesh.scale.y = 0.1;
      pillarMesh.position.y = 0.05;
      container.add(pillarMesh);

      // Wireframe overlay
      const wireGeo = new THREE.BoxGeometry(1.42, 1, 1.42);
      const wireMat = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        wireframe: true,
        transparent: true,
        opacity: 0.5,
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

  // Master Rebuild Function for All Shaders, UberShaders, Glitches, Warps, & Particles
  function rebuildPresetVisuals(preset: VisualizerPreset, group: THREE.Group) {
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    coreMeshRef.current = null;
    gridMeshRef.current = null;
    particlesRef.current = null;
    electricArcsRef.current = null;

    const pCount = Math.min(preset.particleDensity || 5000, 10000);
    const themeColor = new THREE.Color(preset.themeColor || '#00ffff');
    const accentColor = new THREE.Color(preset.accentColor || '#fdcc0d');
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
    } else if (geomType !== 'none') {
      coreGeo = new THREE.IcosahedronGeometry(3, 2);
    }

    if (coreGeo) {
      const coreMat = new THREE.MeshStandardMaterial({
        color: themeColor,
        emissive: accentColor,
        emissiveIntensity: preset.bloomIntensity || 1.8,
        wireframe: isWire,
        roughness: 0.2,
        metalness: 0.8,
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      coreMesh.position.y = 3.5;
      group.add(coreMesh);
      coreMeshRef.current = coreMesh;
    }

    // 2. Build Grid Helper if grid or terrain shader
    if (preset.shaderKey === 'grid' || preset.shaderKey === 'terrain') {
      const grid = new THREE.GridHelper(60, 40, themeColor.getHex(), 0x32527b);
      grid.position.y = -2;
      group.add(grid);
      gridMeshRef.current = grid;
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

  const updateLiveField = (key: keyof VisualizerPreset, value: any) => {
    const updated = { ...livePreset, [key]: value, updatedAt: Date.now() };
    setLivePreset(updated);
    activePresetRef.current = updated;

    if (onUpdateCustomPreset) {
      onUpdateCustomPreset(updated);
    }

    if (visualGroupRef.current) {
      rebuildPresetVisuals(updated, visualGroupRef.current);
    }
  };

  const handleApplyCustomModelUrl = (url: string) => {
    updateLiveField('model3dUrl', url);
    setModelLoadMsg(`Cargando modelo: ${url.slice(0, 30)}...`);
    setTimeout(() => setModelLoadMsg(null), 3000);
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-black select-none">
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full absolute inset-0" />

      {/* Floating Exit / Quick Return Button */}
      {onExitToGame && (
        <div className="absolute top-4 left-4 z-40 pointer-events-auto">
          <button
            onClick={onExitToGame}
            className="px-3.5 py-2 bg-[#121212]/90 hover:bg-[var(--sgx-neon)] text-[var(--sgx-neon)] hover:text-black border border-[var(--sgx-neon)]/60 hover:border-[var(--sgx-neon)] backdrop-blur-md text-xs font-mono font-bold uppercase transition-all shadow-2xl flex items-center space-x-2 group"
            style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
          >
            <Gamepad2 className="w-4 h-4 text-[var(--sgx-accent)] group-hover:text-black shrink-0" />
            <span>← VOLVER AL JUEGO</span>
          </button>
        </div>
      )}

      {/* Live Visual Controls & WebXR Action Bar */}
      <div className="absolute top-4 right-4 z-40 pointer-events-auto flex items-center space-x-2">
        <button
          onClick={() => {
            // Check if WebXR or Fullscreen VR is available
            if (navigator.xr) {
              navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
                if (supported && rendererRef.current) {
                  rendererRef.current.xr.enabled = true;
                  navigator.xr.requestSession('immersive-vr').then((session) => {
                    rendererRef.current?.xr.setSession(session);
                    setModelLoadMsg('¡Sesión WebXR VR Iniciada!');
                    setTimeout(() => setModelLoadMsg(null), 4000);
                  }).catch(() => {
                    // Fallback to fullscreen immersive
                    document.documentElement.requestFullscreen?.();
                    setModelLoadMsg('Modo Inmersivo 360 activado');
                    setTimeout(() => setModelLoadMsg(null), 3000);
                  });
                } else {
                  document.documentElement.requestFullscreen?.();
                  setModelLoadMsg('Vista Inmersiva 360 Pantalla Completa');
                  setTimeout(() => setModelLoadMsg(null), 3000);
                }
              }).catch(() => {
                document.documentElement.requestFullscreen?.();
              });
            } else {
              document.documentElement.requestFullscreen?.();
              setModelLoadMsg('Modo 360 Inmersivo Pantalla Completa');
              setTimeout(() => setModelLoadMsg(null), 3000);
            }
          }}
          className="px-3.5 py-2 bg-[#121212]/90 hover:bg-[var(--sgx-accent)] text-[var(--sgx-accent)] hover:text-black border border-[var(--sgx-accent)]/60 hover:border-[var(--sgx-accent)] backdrop-blur-md text-xs font-mono font-bold uppercase transition-all shadow-2xl flex items-center space-x-2"
          style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
          title="Entrar en modo WebXR / VR / Inmersivo 360"
        >
          <Globe className="w-4 h-4 text-[var(--sgx-accent)] group-hover:text-black shrink-0" />
          <span className="hidden sm:inline">WEBXR / VR 360</span>
        </button>

        <button
          onClick={() => setShowVisualControls(!showVisualControls)}
          className={`px-3.5 py-2 backdrop-blur-md text-xs font-mono font-bold uppercase transition-all shadow-2xl flex items-center space-x-2 border ${
            showVisualControls
              ? 'bg-[var(--sgx-neon)] text-black border-[var(--sgx-neon)]'
              : 'bg-[#121212]/90 hover:bg-[var(--sgx-neon)] text-[var(--sgx-neon)] hover:text-black border-[var(--sgx-neon)]/60'
          }`}
          style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
        >
          <Sliders className="w-4 h-4 text-[var(--sgx-accent)] shrink-0" />
          <span>CONTROLES VISUALES LIVE</span>
        </button>
      </div>

      {/* Slide-out Interactive Visual Controls Overlay Drawer */}
      {showVisualControls && (
        <div className="absolute top-16 right-4 z-50 w-96 max-h-[calc(100vh-5rem)] overflow-y-auto bg-[#0A0C10]/95 border-2 border-[var(--sgx-neon)] p-4 text-white font-mono shadow-2xl backdrop-blur-xl animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between border-b border-[var(--sgx-secondary)] pb-2 mb-3">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-[var(--sgx-neon)]" />
              <span className="text-xs font-bold uppercase text-[var(--sgx-neon)]">Ajustes de Renderizado Real-time</span>
            </div>
            <button
              onClick={() => setShowVisualControls(false)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab Selector */}
          <div className="grid grid-cols-5 gap-1 mb-3 text-[10px] font-bold">
            {[
              { id: '3D_MODEL', label: '3D', icon: Box },
              { id: 'SHADERS', label: 'FX', icon: Zap },
              { id: 'PARTICLES', label: 'PART', icon: Sparkles },
              { id: 'EFFECTS', label: 'TUNE', icon: Sliders },
              { id: 'ENVIRONMENT', label: 'COLOR', icon: Palette },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = controlTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setControlTab(tab.id as any)}
                  className={`py-1.5 flex flex-col items-center justify-center border transition-all ${
                    isActive
                      ? 'border-[var(--sgx-neon)] bg-[var(--sgx-neon)]/20 text-[var(--sgx-neon)]'
                      : 'border-[var(--sgx-secondary)]/40 bg-[#121212] text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 mb-0.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {modelLoadMsg && (
            <div className="p-2 mb-3 bg-[#32527B]/80 border border-[#FDCC0D] text-[10px] text-[#FDCC0D] font-bold animate-pulse">
              {modelLoadMsg}
            </div>
          )}

          {/* TAB 1: 3D MODEL (.GLB / .GLTF / .OBJ) */}
          {controlTab === '3D_MODEL' && (
            <div className="space-y-3">
              <div className="text-[11px] font-bold text-white uppercase flex items-center space-x-1.5 border-b border-[var(--sgx-secondary)] pb-1">
                <Box className="w-3.5 h-3.5 text-[var(--sgx-neon)]" />
                <span>Modelo 3D Link (.GLB / .GLTF / .OBJ)</span>
              </div>

              {/* Sample 1-Click Buttons */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 block font-bold">Modelos 3D de Muestra Precargados:</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {BUILTIN_3D_SAMPLES.map((sample) => (
                    <button
                      key={sample.id}
                      onClick={() => handleApplyCustomModelUrl(sample.url)}
                      className={`p-1.5 border text-left text-[10px] font-bold transition-all truncate ${
                        livePreset.model3dUrl === sample.url
                          ? 'border-[var(--sgx-neon)] bg-[var(--sgx-neon)]/20 text-[var(--sgx-neon)]'
                          : 'border-[var(--sgx-secondary)]/50 bg-[#121212] text-slate-300 hover:border-[var(--sgx-neon)]'
                      }`}
                    >
                      {sample.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Link Input */}
              <div className="pt-1">
                <label className="text-[10px] text-slate-400 block mb-1">Cargar Enlace 3D Custom (URL):</label>
                <div className="flex space-x-1">
                  <input
                    type="text"
                    value={customModelUrlInput}
                    onChange={(e) => setCustomModelUrlInput(e.target.value)}
                    placeholder="https://.../model.glb"
                    className="flex-1 bg-[#121212] border border-[var(--sgx-secondary)] p-1.5 text-xs text-white font-mono focus:outline-none focus:border-[var(--sgx-neon)]"
                  />
                  <button
                    onClick={() => {
                      if (customModelUrlInput.trim()) {
                        handleApplyCustomModelUrl(customModelUrlInput.trim());
                      }
                    }}
                    className="px-2.5 bg-[var(--sgx-neon)] text-black font-bold text-[10px] hover:bg-[var(--sgx-neon)]/80"
                  >
                    CARGAR
                  </button>
                </div>
              </div>

              {/* Model Sliders */}
              <div className="space-y-2 pt-1 border-t border-[var(--sgx-secondary)]">
                <div>
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span className="text-slate-300">Escala del Modelo:</span>
                    <span className="text-[var(--sgx-neon)] font-bold">{(livePreset.modelScale || 1.0).toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="4.0"
                    step="0.1"
                    value={livePreset.modelScale || 1.0}
                    onChange={(e) => updateLiveField('modelScale', parseFloat(e.target.value))}
                    className="w-full accent-[var(--sgx-neon)] cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span className="text-slate-300">Velocidad Rotación 3D:</span>
                    <span className="text-[var(--sgx-accent)] font-bold">{(livePreset.modelRotationSpeed || 1.0).toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="4.0"
                    step="0.1"
                    value={livePreset.modelRotationSpeed || 1.0}
                    onChange={(e) => updateLiveField('modelRotationSpeed', parseFloat(e.target.value))}
                    className="w-full accent-[var(--sgx-accent)] cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SHADERS & PRESETS */}
          {controlTab === 'SHADERS' && (
            <div className="space-y-3">
              <div className="text-[11px] font-bold text-white uppercase flex items-center space-x-1.5 border-b border-[var(--sgx-secondary)] pb-1">
                <Zap className="w-3.5 h-3.5 text-[var(--sgx-accent)]" />
                <span>Algoritmo de Shader & Geometría</span>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Shader Pipeline:</label>
                <select
                  value={livePreset.shaderKey || 'glitch'}
                  onChange={(e) => updateLiveField('shaderKey', e.target.value)}
                  className="w-full bg-[#121212] border border-[var(--sgx-secondary)] p-1.5 text-xs text-[var(--sgx-accent)] font-bold"
                >
                  <option value="glitch">👾 Cyberpunk Glitch & Aberración</option>
                  <option value="warp">🚀 Hyperspace Relativistic Warp</option>
                  <option value="matrix">🟢 Matrix Digital Stream</option>
                  <option value="volcano">🔥 Magma Lava Vortex</option>
                  <option value="vortex">🔮 Singularity Quantum Black Hole</option>
                  <option value="plasma">⚡ Tesla High-Voltage Plasma</option>
                  <option value="aurora">💎 Organic Prismatic Aurora</option>
                  <option value="grid">🕹️ Synthwave Wireframe Grid</option>
                  <option value="ubershader">✨ Master Multi-Pass UberShader</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Geometría Núcleo 3D:</label>
                <select
                  value={livePreset.coreGeometry || 'icosahedron'}
                  onChange={(e) => updateLiveField('coreGeometry', e.target.value)}
                  className="w-full bg-[#121212] border border-[var(--sgx-secondary)] p-1.5 text-xs text-[var(--sgx-neon)] font-bold"
                >
                  <option value="icosahedron">Icosaedro Cuántico</option>
                  <option value="sphere_sun">Sol Synthwave Esfera</option>
                  <option value="octahedron">Octaedro Prisma</option>
                  <option value="dodecahedron">Dodecaedro Singular</option>
                  <option value="torus_ring">Anillo Vórtice Toroidal</option>
                  <option value="cube_matrix">Cubo Matriz Digital</option>
                  <option value="none">Sin Geometría (Solo Modelo/Partículas)</option>
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="liveWireframe"
                  checked={livePreset.wireframe !== false}
                  onChange={(e) => updateLiveField('wireframe', e.target.checked)}
                  className="w-4 h-4 accent-[var(--sgx-neon)]"
                />
                <label htmlFor="liveWireframe" className="text-xs text-white font-bold cursor-pointer">
                  Modo Wireframe Holográfico
                </label>
              </div>
            </div>
          )}

          {/* TAB 3: PARTICLES & SPRITES */}
          {controlTab === 'PARTICLES' && (
            <div className="space-y-3">
              <div className="text-[11px] font-bold text-white uppercase flex items-center space-x-1.5 border-b border-[var(--sgx-secondary)] pb-1">
                <Sparkles className="w-3.5 h-3.5 text-[var(--sgx-neon)]" />
                <span>Motor de Partículas Vectorial</span>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Comportamiento del Flujo:</label>
                <select
                  value={livePreset.particleBehavior || 'ambient_float'}
                  onChange={(e) => updateLiveField('particleBehavior', e.target.value)}
                  className="w-full bg-[#121212] border border-[var(--sgx-secondary)] p-1.5 text-xs text-[var(--sgx-neon)] font-bold"
                >
                  <option value="vortex_spiral">🌀 Vórtice Espiral Gravitacional</option>
                  <option value="upward_fountain">🌋 Fuente Convectiva Eruptiva</option>
                  <option value="tunnel_stream">🚀 Túnel Acelerado Hiperspacial</option>
                  <option value="matrix_fall">🟢 Lluvia Digital Matrix Vertical</option>
                  <option value="orbital_galaxy">🌌 Galaxia Orbital Doble Brazo</option>
                  <option value="shockwave_pulse">⭕ Expansión de Ondas de Choque</option>
                  <option value="ambient_float">✨ Polvo Armónico Flotante</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-slate-300">Cantidad / Densidad:</span>
                  <span className="text-[var(--sgx-neon)] font-bold">{livePreset.particleDensity || 5000}</span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="10000"
                  step="500"
                  value={livePreset.particleDensity || 5000}
                  onChange={(e) => updateLiveField('particleDensity', parseInt(e.target.value))}
                  className="w-full accent-[var(--sgx-neon)] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-slate-300">Velocidad de Partículas:</span>
                  <span className="text-[var(--sgx-accent)] font-bold">{(livePreset.particleSpeed || 1.0).toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="4.0"
                  step="0.1"
                  value={livePreset.particleSpeed || 1.0}
                  onChange={(e) => updateLiveField('particleSpeed', parseFloat(e.target.value))}
                  className="w-full accent-[var(--sgx-accent)] cursor-pointer"
                />
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block mb-1 font-bold">Sprite de Partícula Vectorial:</span>
                <div className="grid grid-cols-4 gap-1">
                  {Object.entries(BUILTIN_PARTICLE_SPRITES).map(([key, sprite]) => (
                    <button
                      key={key}
                      onClick={() => {
                        updateLiveField('particleTextureUrl', sprite.dataUri);
                        updateLiveField('particleShape', key);
                      }}
                      className={`p-1 border text-[9px] font-bold flex flex-col items-center justify-center transition-all ${
                        livePreset.particleTextureUrl === sprite.dataUri || livePreset.particleShape === key
                          ? 'border-[var(--sgx-neon)] bg-[var(--sgx-neon)]/20 text-[var(--sgx-neon)]'
                          : 'border-[var(--sgx-secondary)]/40 bg-[#121212] text-slate-300 hover:border-[var(--sgx-neon)]'
                      }`}
                    >
                      <img src={sprite.dataUri} alt={key} className="w-5 h-5 mb-0.5 bg-black p-0.5" />
                      <span>{key}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: EFFECTS & SHADERS TUNING */}
          {controlTab === 'EFFECTS' && (
            <div className="space-y-3">
              <div className="text-[11px] font-bold text-white uppercase flex items-center space-x-1.5 border-b border-[var(--sgx-secondary)] pb-1">
                <Sliders className="w-3.5 h-3.5 text-[var(--sgx-neon)]" />
                <span>Post-Processing & Bloom</span>
              </div>

              <div>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-slate-300">Intensidad Glitch (RGB Split):</span>
                  <span className="text-[var(--sgx-neon)] font-bold">{Math.round((livePreset.glitchIntensity || 0) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={livePreset.glitchIntensity || 0}
                  onChange={(e) => updateLiveField('glitchIntensity', parseFloat(e.target.value))}
                  className="w-full accent-[var(--sgx-neon)] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-slate-300">Intensidad de Bloom Radiante:</span>
                  <span className="text-[var(--sgx-accent)] font-bold">{(livePreset.bloomIntensity || 1.2).toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="4.0"
                  step="0.1"
                  value={livePreset.bloomIntensity || 1.2}
                  onChange={(e) => updateLiveField('bloomIntensity', parseFloat(e.target.value))}
                  className="w-full accent-[var(--sgx-accent)] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-slate-300">Camera Shake (Vibración):</span>
                  <span className="text-[#FDCC0D] font-bold">{(livePreset.cameraShake || 0.2).toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="2.0"
                  step="0.1"
                  value={livePreset.cameraShake || 0.2}
                  onChange={(e) => updateLiveField('cameraShake', parseFloat(e.target.value))}
                  className="w-full accent-[#FDCC0D] cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* TAB 5: ENVIRONMENT & PALETTE */}
          {controlTab === 'ENVIRONMENT' && (
            <div className="space-y-3">
              <div className="text-[11px] font-bold text-white uppercase flex items-center space-x-1.5 border-b border-[var(--sgx-secondary)] pb-1">
                <Palette className="w-3.5 h-3.5 text-[#FDCC0D]" />
                <span>Paleta de Colores & Textura de Fondo</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Color Núcleo:</label>
                  <div className="flex items-center space-x-1">
                    <input
                      type="color"
                      value={livePreset.themeColor || '#00ffff'}
                      onChange={(e) => updateLiveField('themeColor', e.target.value)}
                      className="w-7 h-7 bg-transparent cursor-pointer border-[var(--sgx-neon)]"
                    />
                    <input
                      type="text"
                      value={livePreset.themeColor || '#00ffff'}
                      onChange={(e) => updateLiveField('themeColor', e.target.value)}
                      className="w-full bg-[#121212] border border-[var(--sgx-secondary)] p-1 text-[10px] text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Color Accent:</label>
                  <div className="flex items-center space-x-1">
                    <input
                      type="color"
                      value={livePreset.accentColor || '#ff0055'}
                      onChange={(e) => updateLiveField('accentColor', e.target.value)}
                      className="w-7 h-7 bg-transparent cursor-pointer border-[var(--sgx-neon)]"
                    />
                    <input
                      type="text"
                      value={livePreset.accentColor || '#ff0055'}
                      onChange={(e) => updateLiveField('accentColor', e.target.value)}
                      className="w-full bg-[#121212] border border-[var(--sgx-secondary)] p-1 text-[10px] text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block mb-1 font-bold">Panoramas 360° Espaciales (Spatialgineers Summit):</span>
                <div className="grid grid-cols-2 gap-1.5 mb-2">
                  {[
                    { name: 'Chroma Studios 360°', url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=2000&auto=format&fit=crop&q=80' },
                    { name: 'Roblox Arena 360°', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=2000&auto=format&fit=crop&q=80' },
                    { name: 'SGX Guild Gallery 360°', url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=2000&auto=format&fit=crop&q=80' },
                    { name: 'Industry Stage 360°', url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=2000&auto=format&fit=crop&q=80' },
                    { name: 'Drone Bay 360°', url: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=2000&auto=format&fit=crop&q=80' },
                    { name: 'Chroma VIP Lounge 360°', url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=2000&auto=format&fit=crop&q=80' },
                  ].map((pano, pIdx) => (
                    <button
                      key={pIdx}
                      onClick={() => updateLiveField('backgroundUrl', pano.url)}
                      className={`p-1.5 border text-[9px] font-bold text-left transition-all truncate flex items-center space-x-1 ${
                        livePreset.backgroundUrl === pano.url
                          ? 'border-[var(--sgx-accent)] bg-[var(--sgx-accent)]/20 text-[var(--sgx-accent)]'
                          : 'border-[var(--sgx-secondary)]/50 bg-[#121212] text-slate-300 hover:border-[var(--sgx-neon)]'
                      }`}
                    >
                      <Globe className="w-3 h-3 text-[var(--sgx-neon)] shrink-0" />
                      <span className="truncate">{pano.name}</span>
                    </button>
                  ))}
                </div>

                <span className="text-[10px] text-slate-400 block mb-1 font-bold">Fondo Personalizado (2D o 360° Equirrectangular):</span>
                <div className="flex space-x-1 mb-2">
                  <input
                    type="text"
                    value={customBgInput}
                    onChange={(e) => setCustomBgInput(e.target.value)}
                    placeholder="https://.../panorama360.jpg"
                    className="flex-1 bg-[#121212] border border-[var(--sgx-secondary)] p-1 text-[10px] text-white font-mono focus:outline-none focus:border-[var(--sgx-neon)]"
                  />
                  <button
                    onClick={() => {
                      if (customBgInput.trim()) {
                        updateLiveField('backgroundUrl', customBgInput.trim());
                        setModelLoadMsg('Fondo 360 aplicado');
                        setTimeout(() => setModelLoadMsg(null), 3000);
                      }
                    }}
                    className="px-2 bg-[var(--sgx-neon)] text-black font-bold text-[9px] hover:bg-[var(--sgx-neon)]/80"
                  >
                    APLICAR
                  </button>
                </div>

                <span className="text-[10px] text-slate-400 block mb-1 font-bold">Texturas Abstractas Estándar:</span>
                <div className="grid grid-cols-3 gap-1">
                  {BUILTIN_BG_SAMPLES.map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => updateLiveField('backgroundUrl', bg.url)}
                      className={`p-1 border text-[9px] font-bold transition-all truncate ${
                        livePreset.backgroundUrl === bg.url
                          ? 'border-[var(--sgx-neon)] bg-[var(--sgx-neon)]/20 text-[var(--sgx-neon)]'
                          : 'border-[var(--sgx-secondary)]/40 bg-[#121212] text-slate-300 hover:border-[var(--sgx-neon)]'
                      }`}
                    >
                      {bg.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="mt-4 pt-3 border-t border-[var(--sgx-secondary)] flex justify-between items-center">
            <button
              onClick={() => {
                saveCustomPreset(livePreset);
                setModelLoadMsg('¡Preset guardado localmente!');
                setTimeout(() => setModelLoadMsg(null), 3000);
              }}
              className="px-3 py-1.5 bg-[#32527B] hover:bg-[#B87000] text-white border border-[#FDCC0D] text-[10px] font-bold uppercase transition-all"
            >
              GUARDAR PRESET
            </button>
            <button
              onClick={() => setShowVisualControls(false)}
              className="px-3 py-1.5 bg-[var(--sgx-neon)] text-black text-[10px] font-bold uppercase hover:bg-[var(--sgx-neon)]/80 transition-all"
            >
              CERRAR
            </button>
          </div>
        </div>
      )}

      {/* Live Stage Status Watermark */}
      <div className="absolute bottom-4 right-4 z-30 pointer-events-none text-right font-mono">
        <div className="text-[10px] text-[var(--sgx-neon)] tracking-widest font-bold drop-shadow">
          SGX 3D STAGE ENGINE • 60 FPS
        </div>
        <div className="text-[9px] text-slate-400">
          PRESET: {(customPresetOverride?.name || livePreset.name || presetId).toString().replace('preset_', '').toUpperCase()}
        </div>
      </div>
    </div>
  );
};
