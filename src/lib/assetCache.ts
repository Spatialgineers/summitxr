import * as THREE from 'three';
import { VisualizerPreset } from '../types/engine';

// High-Performance Procedural SVG Particle Sprites (100% offline & local)
export const BUILTIN_3D_SAMPLES = [
  { id: 'sgx_icon_3d', name: '⚡ SGX Icon (Official 3D GLB)', url: 'https://cdn.spatialgineers.com/3D%20Branding/SGX%20Icon.glb' },
  { id: 'guild_logo_3d', name: '🛡️ SGX Guild Logo (Official 3D GLB)', url: 'https://cdn.spatialgineers.com/3D%20Branding/Sgxgs%201.glb' },
  { id: 'duck', name: '🦆 Duck (Khronos GLB)', url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Duck/glTF-Binary/Duck.glb' },
  { id: 'helmet', name: '🪖 Damaged Helmet (PBR GLB)', url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb' },
  { id: 'box', name: '📦 Cyber Box (GLB)', url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Box/glTF-Binary/Box.glb' },
  { id: 'avocado', name: '🥑 Avocado (PBR GLB)', url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Avocado/glTF-Binary/Avocado.glb' },
  { id: 'boombox', name: '📻 BoomBox (Audio GLB)', url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/BoomBox/glTF-Binary/BoomBox.glb' },
  { id: 'proc_crystal', name: '💎 Quantum Crystal (Procedural 3D)', url: 'model_crystal' },
  { id: 'proc_skull', name: '💀 Cyber Skull (Procedural 3D)', url: 'model_cyber_skull' },
  { id: 'proc_torus', name: '🍩 Hyper Torus (Procedural 3D)', url: 'model_torus_hyper' },
  { id: 'proc_cube', name: '🧊 Matrix Tesseract (Procedural 3D)', url: 'model_quantum_cube' },
];

export const BUILTIN_BG_SAMPLES = [
  { id: 'grid_floor', name: '🌐 Cyber Grid Matrix', url: `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#0a0c10"/><path d="M0 50 L100 50 M50 0 L50 100" stroke="#00ffff" stroke-width="0.5" opacity="0.4"/></svg>')}` },
  { id: 'hex_mesh', name: '⬢ Neon Hex Cell', url: `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"><polygon points="30,5 55,20 55,50 30,65 5,50 5,20" fill="none" stroke="#ff0055" stroke-width="1" opacity="0.4"/></svg>')}` },
  { id: 'nebula_space', name: '✨ Deep Cosmic Starfield', url: `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#050510"/><circle cx="30" cy="40" r="1.5" fill="#ffffff" opacity="0.8"/><circle cx="150" cy="80" r="2" fill="#00ffff" opacity="0.9"/><circle cx="90" cy="160" r="1" fill="#fdcc0d" opacity="0.7"/></svg>')}` },
];

export const BUILTIN_PARTICLE_SPRITES: Record<string, { name: string; description: string; dataUri: string }> = {
  ember: {
    name: '🔥 Magma Ember',
    description: 'Hot turbulent thermal ember with high-density glowing core',
    dataUri: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
        <defs>
          <radialGradient id="emberGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
            <stop offset="25%" stop-color="#ffcc00" stop-opacity="0.95"/>
            <stop offset="60%" stop-color="#ff3b30" stop-opacity="0.8"/>
            <stop offset="85%" stop-color="#ff1a00" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="#ff0000" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <circle cx="32" cy="32" r="30" fill="url(#emberGrad)"/>
      </svg>
    `.trim())}`
  },
  spark: {
    name: '⚡ Cyber Spark',
    description: '4-point neon diamond spark with intense pinpoint center',
    dataUri: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
        <defs>
          <radialGradient id="sparkGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
            <stop offset="35%" stop-color="#00ffff" stop-opacity="0.9"/>
            <stop offset="70%" stop-color="#0088ff" stop-opacity="0.4"/>
            <stop offset="100%" stop-color="#0022ff" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <path d="M32 2 Q32 32 62 32 Q32 32 32 62 Q32 32 2 32 Q32 32 32 2 Z" fill="url(#sparkGrad)"/>
        <circle cx="32" cy="32" r="6" fill="#ffffff"/>
      </svg>
    `.trim())}`
  },
  star: {
    name: '✨ Quantum Star',
    description: '8-point relativistic cosmic starburst with chromatic glow',
    dataUri: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
        <defs>
          <radialGradient id="starGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
            <stop offset="40%" stop-color="#e0aaff" stop-opacity="0.9"/>
            <stop offset="75%" stop-color="#9d4edd" stop-opacity="0.4"/>
            <stop offset="100%" stop-color="#3c096c" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <path d="M32 0 L36 28 L64 32 L36 36 L32 64 L28 36 L0 32 L28 28 Z" fill="url(#starGrad)"/>
        <circle cx="32" cy="32" r="7" fill="#ffffff"/>
      </svg>
    `.trim())}`
  },
  rune: {
    name: '🟩 Matrix Glyph',
    description: 'Cyberpunk digital stream data cell with holographic halo',
    dataUri: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
        <rect x="14" y="14" width="36" height="36" rx="4" fill="none" stroke="#00ff66" stroke-width="4"/>
        <rect x="22" y="22" width="20" height="20" fill="#00ff66" opacity="0.6"/>
        <line x1="14" y1="32" x2="50" y2="32" stroke="#ffffff" stroke-width="2"/>
        <line x1="32" y1="14" x2="32" y2="50" stroke="#ffffff" stroke-width="2"/>
      </svg>
    `.trim())}`
  },
  orb: {
    name: '🔮 Energy Orb',
    description: 'Smooth ethereal spherical energy node with soft Gaussian dropoff',
    dataUri: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
        <defs>
          <radialGradient id="orbGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
            <stop offset="30%" stop-color="#38bdf8" stop-opacity="0.9"/>
            <stop offset="70%" stop-color="#0284c7" stop-opacity="0.4"/>
            <stop offset="100%" stop-color="#0369a1" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <circle cx="32" cy="32" r="30" fill="url(#orbGrad)"/>
      </svg>
    `.trim())}`
  },
  crystal: {
    name: '💎 Prismatic Shard',
    description: 'Refractive quartz shard crystal facet with aurora tint',
    dataUri: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
        <defs>
          <linearGradient id="crystGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="50%" stop-color="#ec4899"/>
            <stop offset="100%" stop-color="#38bdf8"/>
          </linearGradient>
        </defs>
        <polygon points="32,4 58,24 48,58 16,58 6,24" fill="url(#crystGrad)" opacity="0.85" stroke="#ffffff" stroke-width="1.5"/>
      </svg>
    `.trim())}`
  },
  ring: {
    name: '⭕ Plasma Shockwave',
    description: 'Expanding holographic radial shockwave ring',
    dataUri: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="26" fill="none" stroke="#fdcc0d" stroke-width="5" opacity="0.85"/>
        <circle cx="32" cy="32" r="16" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.9"/>
        <circle cx="32" cy="32" r="6" fill="#ff9500"/>
      </svg>
    `.trim())}`
  },
  lightning: {
    name: '⚡ Tesla Bolt',
    description: 'High-voltage electric discharge tendril',
    dataUri: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
        <polygon points="36,2 14,34 30,34 26,62 50,28 34,28" fill="#00ffff" stroke="#ffffff" stroke-width="1.5"/>
      </svg>
    `.trim())}`
  }
};

export interface PreloadProgress {
  total: number;
  loaded: number;
  failed: number;
  percentage: number;
  isComplete: boolean;
  cachedBytes: number;
  activeItems: string[];
}

// In-Memory Three.js Texture Cache & Object Cache
const textureCache = new Map<string, THREE.Texture>();
const blobCache = new Map<string, Blob>();
const failedUrls = new Set<string>();

// Preload state management
let preloadProgress: PreloadProgress = {
  total: 0,
  loaded: 0,
  failed: 0,
  percentage: 100,
  isComplete: true,
  cachedBytes: 0,
  activeItems: []
};

type ProgressListener = (progress: PreloadProgress) => void;
const listeners = new Set<ProgressListener>();

function notifyListeners() {
  listeners.forEach(l => {
    try {
      l({ ...preloadProgress });
    } catch (e) {
      console.warn('Progress listener error:', e);
    }
  });
}

export function subscribePreloadProgress(listener: ProgressListener) {
  listeners.add(listener);
  listener({ ...preloadProgress });
  return () => {
    listeners.delete(listener);
  };
}

export function getPreloadStatus(): PreloadProgress {
  return { ...preloadProgress };
}

// IndexedDB Persistent Asset Storage Helper
const DB_NAME = 'sgx_asset_ecosystem_v1';
const STORE_NAME = 'assets_cache';

function openAssetDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'url' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getAssetFromIDB(url: string): Promise<{ blob: Blob; timestamp: number } | null> {
  try {
    const db = await openAssetDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(url);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function saveAssetToIDB(url: string, blob: Blob): Promise<void> {
  try {
    const db = await openAssetDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({ url, blob, size: blob.size, timestamp: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Ignore IndexedDB write errors gracefully
  }
}

// Helper to detect 3D model files or procedural model IDs that are NOT 2D image textures
export function isNonTextureAssetUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return true;
  const clean = url.split('?')[0].split('#')[0].toLowerCase().trim();
  if (clean.startsWith('model_')) return true;
  if (
    clean.endsWith('.glb') ||
    clean.endsWith('.gltf') ||
    clean.endsWith('.obj') ||
    clean.endsWith('.fbx') ||
    clean.endsWith('.bin') ||
    clean.endsWith('.mp3') ||
    clean.endsWith('.wav') ||
    clean.endsWith('.ogg') ||
    clean.endsWith('.mp4') ||
    clean.endsWith('.webm')
  ) {
    return true;
  }
  return false;
}

// Create a procedural 1x1 fallback texture so Three.js materials never break
function createFallbackCanvasTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.5, 'rgba(0, 255, 255, 0.6)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// Preload and retrieve Texture from cache
export function getOrLoadTexture(url: string): THREE.Texture {
  if (textureCache.has(url)) {
    return textureCache.get(url)!;
  }

  // Never pass 3D .glb/.gltf models or procedural IDs into THREE.TextureLoader
  if (isNonTextureAssetUrl(url)) {
    const fallback = createFallbackCanvasTexture();
    textureCache.set(url, fallback);
    return fallback;
  }

  const textureLoader = new THREE.TextureLoader();
  textureLoader.setCrossOrigin('anonymous');
  const texture = textureLoader.load(
    url,
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
    },
    undefined,
    () => {
      // Silently swap in procedural fallback canvas image if a remote texture fails
      const fallback = createFallbackCanvasTexture();
      texture.image = fallback.image as any;
      texture.needsUpdate = true;
    }
  );

  textureCache.set(url, texture);
  return texture;
}

// Fetch and precache an image or 3D asset into memory & IndexedDB
export async function precacheAsset(url: string): Promise<boolean> {
  if (!url || typeof url !== 'string' || failedUrls.has(url)) return false;

  // Procedural built-in 3D identifiers require no network fetch
  if (url.startsWith('model_')) {
    return true;
  }

  // If already in memory
  if (textureCache.has(url) || blobCache.has(url)) {
    return true;
  }

  // Handle Data URIs directly
  if (url.startsWith('data:')) {
    try {
      getOrLoadTexture(url);
      preloadProgress.cachedBytes += url.length;
      return true;
    } catch {
      return false;
    }
  }

  const is3DOrBinary = isNonTextureAssetUrl(url);

  try {
    // Check IndexedDB first
    const cached = await getAssetFromIDB(url);
    if (cached && cached.blob) {
      blobCache.set(url, cached.blob);
      preloadProgress.cachedBytes += cached.blob.size;
      // Only decode as 2D Texture if it is an actual 2D image and not a 3D .glb model
      if (!is3DOrBinary && cached.blob.type.startsWith('image/')) {
        const blobUrl = URL.createObjectURL(cached.blob);
        const tex = getOrLoadTexture(blobUrl);
        textureCache.set(url, tex);
      }
      return true;
    }

    // Fetch over network and store in IDB
    const res = await fetch(url, { mode: 'cors' });
    if (res.ok) {
      const blob = await res.blob();
      blobCache.set(url, blob);
      preloadProgress.cachedBytes += blob.size;
      await saveAssetToIDB(url, blob);
      if (!is3DOrBinary && blob.type.startsWith('image/')) {
        const blobUrl = URL.createObjectURL(blob);
        const tex = getOrLoadTexture(blobUrl);
        textureCache.set(url, tex);
      }
      return true;
    } else {
      failedUrls.add(url);
      return false;
    }
  } catch {
    // Network or CORS issue, fall back to standard HTML Image / Three Loader only for 2D textures
    if (!is3DOrBinary) {
      try {
        getOrLoadTexture(url);
        return true;
      } catch {
        failedUrls.add(url);
        return false;
      }
    }
    return false;
  }
}

// Master Preloader: Preloads all standard and custom assets for all presets
export async function preloadAllPresetAssets(presets: VisualizerPreset[]): Promise<PreloadProgress> {
  // Collect all asset URLs across presets
  const assetSet = new Set<string>();

  // Add built-in sprite data URIs
  Object.values(BUILTIN_PARTICLE_SPRITES).forEach(sprite => {
    assetSet.add(sprite.dataUri);
  });

  presets.forEach(p => {
    if (p.particleTextureUrl) assetSet.add(p.particleTextureUrl);
    if (p.model3dUrl && !p.model3dUrl.startsWith('model_')) assetSet.add(p.model3dUrl);
    if (p.backgroundUrl) assetSet.add(p.backgroundUrl);
    if (p.logoUrl) assetSet.add(p.logoUrl);
  });

  const assetList = Array.from(assetSet).filter(Boolean);
  preloadProgress.total = assetList.length;
  preloadProgress.loaded = 0;
  preloadProgress.failed = 0;
  preloadProgress.isComplete = false;
  preloadProgress.percentage = 0;
  preloadProgress.activeItems = [...assetList];
  notifyListeners();

  for (const url of assetList) {
    try {
      const ok = await precacheAsset(url);
      if (ok) {
        preloadProgress.loaded++;
      } else {
        preloadProgress.failed++;
      }
    } catch {
      preloadProgress.failed++;
    }

    preloadProgress.percentage = Math.round(
      ((preloadProgress.loaded + preloadProgress.failed) / (preloadProgress.total || 1)) * 100
    );
    notifyListeners();
  }

  preloadProgress.isComplete = true;
  preloadProgress.percentage = 100;
  preloadProgress.activeItems = [];
  notifyListeners();

  return { ...preloadProgress };
}

// Clear all caches
export async function clearAssetCache(): Promise<void> {
  textureCache.clear();
  blobCache.clear();
  failedUrls.clear();
  preloadProgress.cachedBytes = 0;

  try {
    const db = await openAssetDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
  } catch {
    // Ignore
  }
}
