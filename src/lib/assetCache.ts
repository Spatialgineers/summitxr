import * as THREE from 'three';
import { VisualizerPreset } from '../types/engine';

// High-Performance Procedural SVG Particle Sprites (100% offline & local)
export { BUILTIN_3D_SAMPLES, BUILTIN_BG_SAMPLES, BUILTIN_PARTICLE_SPRITES } from './presetAssets';
import { BUILTIN_PARTICLE_SPRITES } from './presetAssets';

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
    grad.addColorStop(0.5, 'rgba(0, 221, 255, 0.6)');
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
