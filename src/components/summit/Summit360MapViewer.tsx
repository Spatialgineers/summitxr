import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { 
  Compass, 
  Eye, 
  MapPin, 
  Radio, 
  Maximize2, 
  Minimize2, 
  Layers, 
  RotateCcw, 
  Sparkles, 
  ExternalLink,
  ChevronRight,
  Tv,
  Users,
  Smartphone,
  Info,
  Loader2
} from 'lucide-react';
import { Map360Node, Map360Hotspot } from '../../types/summit';
import { usePilotProfile } from '../../context/PilotProfileContext';
import { playUiChirp } from '../../lib/cyberAudioEngine';

interface Summit360MapViewerProps {
  nodes: Map360Node[];
  selectedNodeId?: string;
  onSelectNode?: (nodeId: string) => void;
  onOpenSessionDetails?: (nodeId: string) => void;
}

export const Summit360MapViewer: React.FC<Summit360MapViewerProps> = ({
  nodes,
  selectedNodeId,
  onSelectNode,
  onOpenSessionDetails,
}) => {
  const { recordActivity } = usePilotProfile();
  const [activeNodeId, setActiveNodeId] = useState<string>(selectedNodeId || nodes[0]?.id || 'node_chroma_studios');
  const [viewMode, setViewMode] = useState<'360_PANORAMA' | 'TACTICAL_2D'>('360_PANORAMA');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAutoRotate, setIsAutoRotate] = useState(true);
  const [isGyroActive, setIsGyroActive] = useState<boolean>(false);
  const [isTextureLoading, setIsTextureLoading] = useState<boolean>(true);
  const [activeHotspot, setActiveHotspot] = useState<Map360Hotspot | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sphereMeshRef = useRef<THREE.Mesh | null>(null);
  const textureLoaderRef = useRef<THREE.TextureLoader>(new THREE.TextureLoader());

  const isDraggingRef = useRef<boolean>(false);
  const previousMousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lonRef = useRef<number>(0);
  const latRef = useRef<number>(0);

  const activeNode = nodes.find(n => n.id === activeNodeId) || nodes[0];

  useEffect(() => {
    if (selectedNodeId && selectedNodeId !== activeNodeId) {
      setActiveNodeId(selectedNodeId);
    }
  }, [selectedNodeId]);

  // Fullscreen event listener sync
  useEffect(() => {
    const onFullscreenChange = () => {
      const isFS = Boolean(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isFS);
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
    };
  }, []);

  // Gyroscope DeviceOrientation listener
  useEffect(() => {
    if (!isGyroActive) return;

    let initialAlpha: number | null = null;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (event.alpha === null || event.beta === null || event.gamma === null) return;
      
      if (initialAlpha === null) {
        initialAlpha = event.alpha;
      }

      const alphaDelta = event.alpha - initialAlpha;
      lonRef.current = -alphaDelta * 1.5;
      
      const targetLat = (event.beta - 45) * 1.2;
      latRef.current = Math.max(-85, Math.min(85, targetLat));
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [isGyroActive]);

  // Request Gyroscope Permission handler
  const toggleGyroscope = async () => {
    if (isGyroActive) {
      setIsGyroActive(false);
      return;
    }

    if (typeof (DeviceOrientationEvent as any)?.requestPermission === 'function') {
      try {
        const permissionState = await (DeviceOrientationEvent as any).requestPermission();
        if (permissionState === 'granted') {
          setIsGyroActive(true);
        } else {
          alert('Permiso de giroscopio denegado por el navegador.');
        }
      } catch (err) {
        console.warn('Error al solicitar giroscopio:', err);
        alert('No se pudo acceder al giroscopio en este dispositivo.');
      }
    } else if ('DeviceOrientationEvent' in window) {
      setIsGyroActive(true);
    } else {
      alert('El giroscopio no está soportado en este navegador o dispositivo.');
    }
  };

  // Initialize Three.js 360 Spherical Panorama with Strict ResizeObserver
  useEffect(() => {
    if (!mountRef.current || viewMode !== '360_PANORAMA') return;

    const mountEl = mountRef.current;
    let initialW = mountEl.clientWidth || 800;
    let initialH = mountEl.clientHeight || 500;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, initialW / initialH, 1, 1100);
    const cameraTarget = new THREE.Vector3(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(initialW, initialH);
    rendererRef.current = renderer;

    mountEl.innerHTML = '';
    mountEl.appendChild(renderer.domElement);

    // Create 360 Inverted Sphere
    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1); // Invert normals so texture is visible inside

    // Fallback Canvas Texture in case image is loading
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 1024, 512);
      grad.addColorStop(0, '#0d0d0d');
      grad.addColorStop(0.5, '#1a1a1a');
      grad.addColorStop(1, '#0A0A0A');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1024, 512);
    }
    const defaultTex = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({ map: defaultTex });

    const sphereMesh = new THREE.Mesh(geometry, material);
    scene.add(sphereMesh);
    sphereMeshRef.current = sphereMesh;

    // Load panorama texture with proper aspect ratio & color space
    setIsTextureLoading(true);
    if (activeNode?.panorama360Url) {
      textureLoaderRef.current.load(
        activeNode.panorama360Url,
        (loadedTexture) => {
          loadedTexture.colorSpace = THREE.SRGBColorSpace;
          loadedTexture.generateMipmaps = false;
          loadedTexture.minFilter = THREE.LinearFilter;
          loadedTexture.magFilter = THREE.LinearFilter;
          loadedTexture.mapping = THREE.EquirectangularReflectionMapping;
          material.map = loadedTexture;
          material.needsUpdate = true;
          setIsTextureLoading(false);
        },
        undefined,
        (err) => {
          console.warn('Could not load 360 panorama texture, using fallback mesh', err);
          setIsTextureLoading(false);
        }
      );
    } else {
      setIsTextureLoading(false);
    }

    // Precise continuous ResizeObserver to eliminate image stretching completely
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height, false);
        }
      }
    });
    resizeObserver.observe(mountEl);

    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (isAutoRotate && !isDraggingRef.current && !isGyroActive) {
        lonRef.current += 0.1;
      }

      latRef.current = Math.max(-85, Math.min(85, latRef.current));
      const phi = THREE.MathUtils.degToRad(90 - latRef.current);
      const theta = THREE.MathUtils.degToRad(lonRef.current);

      cameraTarget.x = 500 * Math.sin(phi) * Math.cos(theta);
      cameraTarget.y = 500 * Math.cos(phi);
      cameraTarget.z = 500 * Math.sin(phi) * Math.sin(theta);

      camera.lookAt(cameraTarget);
      renderer.render(scene, camera);
    };

    animate();

    // Native touch handling
    const onNativeTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDraggingRef.current = true;
        previousMousePositionRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        e.preventDefault();
      }
    };

    const onNativeTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - previousMousePositionRef.current.x;
      const deltaY = e.touches[0].clientY - previousMousePositionRef.current.y;

      lonRef.current -= deltaX * 0.22;
      latRef.current += deltaY * 0.22;

      previousMousePositionRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      e.preventDefault();
    };

    const onNativeTouchEnd = () => {
      isDraggingRef.current = false;
    };

    mountEl.addEventListener('touchstart', onNativeTouchStart, { passive: false });
    mountEl.addEventListener('touchmove', onNativeTouchMove, { passive: false });
    mountEl.addEventListener('touchend', onNativeTouchEnd, { passive: false });

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      mountEl.removeEventListener('touchstart', onNativeTouchStart);
      mountEl.removeEventListener('touchmove', onNativeTouchMove);
      mountEl.removeEventListener('touchend', onNativeTouchEnd);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, [viewMode, activeNodeId, isAutoRotate, isGyroActive]);

  // Mouse Controls for 360 Pan
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - previousMousePositionRef.current.x;
    const deltaY = e.clientY - previousMousePositionRef.current.y;

    lonRef.current -= deltaX * 0.18;
    latRef.current += deltaY * 0.18;

    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      try {
        const el = containerRef.current as any;
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
          await el.webkitRequestFullscreen();
        } else if (el.msRequestFullscreen) {
          await el.msRequestFullscreen();
        } else {
          setIsFullscreen(true);
        }
      } catch (e) {
        console.warn('Native fullscreen fallback to CSS fullscreen:', e);
        setIsFullscreen(true);
      }
    } else {
      try {
        const doc = document as any;
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        } else if (doc.msExitFullscreen) {
          await doc.msExitFullscreen();
        }
      } catch (e) {
        console.warn('Exit fullscreen fallback:', e);
      }
      setIsFullscreen(false);
    }
  };

  const handleNodeSelect = (nodeId: string) => {
    setActiveNodeId(nodeId);
    if (onSelectNode) onSelectNode(nodeId);
    try {
      const selected = nodes.find(n => n.id === nodeId);
      recordActivity(`Exploración 360°: ${selected?.title || 'Recinto Chroma'}`, 30, 'summit');
      playUiChirp(840);
    } catch {}
  };

  return (
    <div 
      ref={containerRef} 
      id="summit-section-map"
      className={`relative bg-[#0d0d0d] border border-[var(--sgx-secondary)] overflow-hidden flex flex-col shadow-2xl transition-all ${
        isFullscreen ? 'fixed inset-0 z-[100] h-screen w-screen' : 'w-full h-[520px] md:h-[620px]'
      }`}
      style={{
        clipPath: isFullscreen ? 'none' : 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
      }}
    >
      {/* Top HUD Bar */}
      <div className="bg-[var(--sgx-card-bg)]/95 backdrop-blur-md border-b border-[var(--sgx-secondary)] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 z-20">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-[var(--sgx-bg)] border border-[var(--sgx-neon)] flex items-center justify-center text-[var(--sgx-neon)] shadow-md shadow-[var(--sgx-neon)]/20">
            <Compass className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider font-['Orbitron',sans-serif]">
                {activeNode?.title}
              </span>
              <span className="text-[9px] px-1.5 py-0.5 bg-[var(--sgx-neon)]/20 border border-[var(--sgx-neon)]/60 text-[var(--sgx-neon)] font-mono uppercase font-bold">
                {activeNode?.liveStatus === 'HYBRID_LIVE' ? '🔴 HYBRID LIVE' : '🟢 360° ACTIVE'}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono block">
              {activeNode?.spatialCoords} • {activeNode?.category}
            </span>
          </div>
        </div>

        {/* View Controls & Action Toggles */}
        <div className="flex items-center space-x-1.5 flex-wrap">
          {/* Mode Switcher */}
          <div className="flex items-center bg-[#0A0A0A] p-0.5 border border-slate-700/80 rounded">
            <button
              onClick={() => setViewMode('360_PANORAMA')}
              className={`px-2 py-1 text-[10px] font-mono uppercase font-bold transition-all cursor-pointer ${
                viewMode === '360_PANORAMA'
                  ? 'bg-[var(--sgx-primary)] text-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              360° Panorama
            </button>
            <button
              onClick={() => setViewMode('TACTICAL_2D')}
              className={`px-2 py-1 text-[10px] font-mono uppercase font-bold transition-all cursor-pointer ${
                viewMode === 'TACTICAL_2D'
                  ? 'bg-[var(--sgx-primary)] text-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Mapa Táctico 2D
            </button>
          </div>

          {/* Auto Rotate Toggle */}
          {viewMode === '360_PANORAMA' && (
            <button
              onClick={() => setIsAutoRotate(prev => !prev)}
              className={`px-2 py-1 border text-[10px] font-mono uppercase transition-all cursor-pointer ${
                isAutoRotate
                  ? 'bg-[var(--sgx-neon)]/20 border-[var(--sgx-neon)] text-[var(--sgx-neon)]'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
              title="Giro automático continuo"
            >
              <RotateCcw className="w-3 h-3 inline mr-1" />
              Auto-Giro
            </button>
          )}

          {/* Gyroscope Trigger */}
          {viewMode === '360_PANORAMA' && (
            <button
              onClick={toggleGyroscope}
              className={`px-2 py-1 border text-[10px] font-mono uppercase transition-all cursor-pointer ${
                isGyroActive
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
              title="Activar sensor de movimiento en móviles"
            >
              <Smartphone className="w-3 h-3 inline mr-1" />
              Giroscopio
            </button>
          )}

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main 360 Viewport Container */}
      <div className="relative flex-1 w-full h-full min-h-0 bg-black overflow-hidden">
        {viewMode === '360_PANORAMA' ? (
          <div 
            ref={mountRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="w-full h-full cursor-grab active:cursor-grabbing select-none"
          />
        ) : (
          /* Tactical 2D Floorplan Matrix */
          <div className="w-full h-full p-4 md:p-6 bg-[#0f0f0f] flex flex-col justify-between overflow-y-auto">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-mono text-[var(--sgx-neon)] font-bold uppercase tracking-wider">
                  DISTRIBUCIÓN ESPACIAL — CHROMA SPACE STUDIOS
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  SAN JUAN, PUERTO RICO • VENUE PRINCIPAL
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {nodes.map(node => (
                  <div
                    key={node.id}
                    onClick={() => handleNodeSelect(node.id)}
                    className={`p-3 border transition-all cursor-pointer flex flex-col justify-between ${
                      node.id === activeNodeId
                        ? 'bg-[var(--sgx-card-bg)] border-[var(--sgx-neon)] shadow-lg'
                        : 'bg-[#171717] border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white font-['Orbitron',sans-serif]">
                          {node.title}
                        </span>
                        <span className="text-[9px] font-mono text-[var(--sgx-neon)]">
                          {node.spatialCoords}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono line-clamp-2">
                        {node.description}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNodeSelect(node.id);
                        setViewMode('360_PANORAMA');
                      }}
                      className="mt-2.5 py-1 px-2 text-[10px] font-mono font-bold bg-[var(--sgx-primary)]/15 border border-[var(--sgx-primary)] text-[var(--sgx-primary)] hover:bg-[var(--sgx-primary)] hover:text-black transition-all flex items-center justify-center space-x-1"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Ver en 360°</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Loading Radar Skeleton Overlay */}
        {isTextureLoading && viewMode === '360_PANORAMA' && (
          <div className="absolute inset-0 z-10 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center p-4">
            <div className="relative w-16 h-16 flex items-center justify-center mb-3">
              <div className="absolute inset-0 rounded-full border-2 border-[var(--sgx-neon)]/30 animate-ping" />
              <div className="w-12 h-12 rounded-full border-2 border-[var(--sgx-neon)] border-t-transparent animate-spin" />
              <Compass className="w-5 h-5 text-[var(--sgx-neon)]" />
            </div>
            <p className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              Calibrando Nodo Espacial 360°...
            </p>
            <span className="text-[10px] font-mono text-[var(--sgx-neon)] mt-1">
              {activeNode?.title}
            </span>
          </div>
        )}

        {/* Floating Spatial Node Selector HUD (Bottom Bar) */}
        <div className="absolute bottom-3 left-3 right-3 z-20 pointer-events-none flex items-end justify-between gap-3">
          {/* Node Selector Pills */}
          <div className="pointer-events-auto bg-[#0d0d0d]/90 backdrop-blur-md border border-[var(--sgx-secondary)] p-1.5 flex items-center gap-1.5 overflow-x-auto max-w-full">
            {nodes.map(node => {
              const isSel = node.id === activeNodeId;
              return (
                <button
                  key={node.id}
                  onClick={() => handleNodeSelect(node.id)}
                  className={`px-2.5 py-1 text-[10px] font-mono uppercase font-bold shrink-0 transition-all cursor-pointer flex items-center space-x-1.5 border ${
                    isSel
                      ? 'bg-[var(--sgx-primary)] text-black border-[var(--sgx-primary)] shadow-md'
                      : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:text-white hover:border-slate-500'
                  }`}
                >
                  <MapPin className={`w-3 h-3 ${isSel ? 'text-black' : 'text-[var(--sgx-neon)]'}`} />
                  <span>{node.title}</span>
                </button>
              );
            })}
          </div>

          {/* Hotspot details trigger if node has live sessions */}
          {activeNode?.currentSessionId && onOpenSessionDetails && (
            <button
              onClick={() => onOpenSessionDetails(activeNode.currentSessionId!)}
              className="pointer-events-auto shrink-0 px-3 py-1.5 bg-[var(--sgx-primary)] text-black text-xs font-mono font-bold hover:brightness-110 transition-all flex items-center space-x-1.5 shadow-lg cursor-pointer"
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Ver Sesión en Vivo</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
