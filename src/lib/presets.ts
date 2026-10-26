import { VisualizerPreset, VisualizerPresetId } from '../types/engine';
import { BUILTIN_PARTICLE_SPRITES } from './assetCache';

export const BUILTIN_PRESETS: Record<string, VisualizerPreset> = {
  preset_sgx_icon_3d: {
    id: 'preset_sgx_icon_3d',
    name: 'SGX.STAGE — SGX Icon Holographic 3D',
    category: 'Abstract',
    description: 'Modelo 3D oficial del icono de Spatialgineers rotando en escenario espacial holográfico con partículas de alta energía.',
    themeColor: '#FDCC0D',
    accentColor: '#00DDFF',
    shaderKey: 'grid',
    glitchIntensity: 0.12,
    warpSpeed: 1.0,
    distortionAmount: 1.2,
    bloomIntensity: 2.0,
    wireframe: false,
    coreGeometry: 'custom_model',
    model3dUrl: 'https://cdn.spatialgineers.com/3D%20Branding/SGX%20Icon.glb',
    coreRotationSpeed: 1.0,
    cameraShake: 0.08,
    particleTextureUrl: BUILTIN_PARTICLE_SPRITES.spark.dataUri,
    particleShape: 'spark',
    particleDensity: 5000,
    particleSize: 0.18,
    particleSpeed: 1.2,
    particleBehavior: 'orbital_ring',
    particleBlending: 'additive',
  },
  preset_guild_logo_3d: {
    id: 'preset_guild_logo_3d',
    name: 'SGX.SYSTEM — SGX Guild 3D Emblem Stage',
    category: 'Abstract',
    description: 'Emblema 3D oficial del SGX Guild con iluminación reactiva y halo holográfico para los Ranked Trials.',
    themeColor: '#32527B',
    accentColor: '#FDCC0D',
    shaderKey: 'ubershader',
    glitchIntensity: 0.15,
    warpSpeed: 1.2,
    distortionAmount: 1.4,
    bloomIntensity: 2.2,
    wireframe: false,
    coreGeometry: 'custom_model',
    model3dUrl: 'https://cdn.spatialgineers.com/3D%20Branding/Sgxgs%201.glb',
    coreRotationSpeed: 0.8,
    cameraShake: 0.1,
    particleTextureUrl: BUILTIN_PARTICLE_SPRITES.rune.dataUri,
    particleShape: 'rune',
    particleDensity: 6000,
    particleSize: 0.2,
    particleSpeed: 1.0,
    particleBehavior: 'vortex_spiral',
    particleBlending: 'additive',
  },
  preset_story_float: {
    id: 'preset_story_float',
    name: 'SGX.STORY — Ambient Gold Wireframe',
    category: 'Abstract',
    description: 'Calm, structured narrative wireframe with gentle yellow grid noise and golden ember runes (Erratic Level 1/6)',
    themeColor: '#FDCC0D',
    accentColor: '#767676',
    shaderKey: 'grid',
    glitchIntensity: 0.08,
    warpSpeed: 0.8,
    distortionAmount: 1.0,
    bloomIntensity: 1.6,
    wireframe: true,
    coreGeometry: 'sphere_sun',
    coreRotationSpeed: 0.6,
    cameraShake: 0.05,
    particleTextureUrl: BUILTIN_PARTICLE_SPRITES.rune.dataUri,
    particleShape: 'rune',
    particleDensity: 4000,
    particleSize: 0.14,
    particleSpeed: 0.8,
    particleBehavior: 'ambient_float',
    particleBlending: 'additive',
  },
  preset_synthesize_chaos: {
    id: 'preset_synthesize_chaos',
    name: 'SGX.SYNTHESIZE — Full Spectrum Hyper-Chaos',
    category: 'UberShaders',
    description: 'Maximum erratic multi-color spectrum swirl, extreme relativistic warp 4.5, CRT glitch split, and 12,000-particle vortex (Erratic Level 6/6)',
    themeColor: '#FDCC0D',
    accentColor: '#00DDFF',
    shaderKey: 'ubershader',
    glitchIntensity: 0.98,
    warpSpeed: 4.5,
    distortionAmount: 3.8,
    bloomIntensity: 3.8,
    wireframe: true,
    coreGeometry: 'torus_knot',
    coreRotationSpeed: 4.2,
    cameraShake: 0.9,
    particleTextureUrl: BUILTIN_PARTICLE_SPRITES.spark.dataUri,
    particleShape: 'spark',
    particleDensity: 12000,
    particleSize: 0.25,
    particleSpeed: 4.5,
    particleBehavior: 'vortex_spiral',
    particleBlending: 'additive',
  },
  preset_glitch_cyber: {
    id: 'preset_glitch_cyber',
    name: 'Cyberpunk Glitch & RGB Split',
    category: 'UberShaders',
    description: 'High-frequency chromatic aberration split, CRT scanline jitter, strobe displacement, and cybernetic glyph stream',
    themeColor: '#32527B',
    accentColor: '#333333',
    shaderKey: 'glitch',
    glitchIntensity: 0.75,
    warpSpeed: 1.2,
    distortionAmount: 1.8,
    bloomIntensity: 2.2,
    wireframe: true,
    coreGeometry: 'icosahedron',
    coreRotationSpeed: 1.8,
    cameraShake: 0.6,
    particleTextureUrl: BUILTIN_PARTICLE_SPRITES.rune.dataUri,
    particleShape: 'rune',
    particleDensity: 6500,
    particleSize: 0.18,
    particleSpeed: 1.8,
    particleBehavior: 'matrix_fall',
    particleBlending: 'additive',
  },
  preset_hyper_warp: {
    id: 'preset_hyper_warp',
    name: 'Hyperspace Relativistic Warp',
    category: 'Cosmic',
    description: 'Lightspeed star-stretching relativistic hyperspace tunnel with spacetime curvature and relativistic Doppler shift',
    themeColor: '#0070f3',
    accentColor: '#00dfd8',
    shaderKey: 'warp',
    glitchIntensity: 0.1,
    warpSpeed: 3.5,
    distortionAmount: 2.2,
    bloomIntensity: 2.4,
    wireframe: true,
    coreGeometry: 'torus_ring',
    coreRotationSpeed: 2.5,
    cameraShake: 0.4,
    particleTextureUrl: BUILTIN_PARTICLE_SPRITES.star.dataUri,
    particleShape: 'star',
    particleDensity: 8500,
    particleSize: 0.15,
    particleSpeed: 3.2,
    particleBehavior: 'tunnel_stream',
    particleBlending: 'additive',
  },
  preset_volcano_fire: {
    id: 'preset_volcano_fire',
    name: 'Inferno Magma Core',
    category: 'Elements',
    description: 'Turbulent molten lava vortex with erupting high-velocity thermal ember particles and convective heat ripples',
    themeColor: '#ff3b30',
    accentColor: '#ff9500',
    shaderKey: 'volcano',
    glitchIntensity: 0.2,
    warpSpeed: 0.8,
    distortionAmount: 1.5,
    bloomIntensity: 2.0,
    wireframe: true,
    coreGeometry: 'torus_knot',
    coreRotationSpeed: 1.2,
    cameraShake: 0.3,
    particleTextureUrl: BUILTIN_PARTICLE_SPRITES.ember.dataUri,
    particleShape: 'ember',
    particleDensity: 7000,
    particleSize: 0.22,
    particleSpeed: 1.6,
    particleBehavior: 'upward_fountain',
    particleBlending: 'additive',
  },
  preset_neon_grid: {
    id: 'preset_neon_grid',
    name: 'Synthwave Wireframe Terrain',
    category: 'Cyber',
    description: 'Retro-futuristic infinite perspective wireframe terrain with undulating mountain noise and a pulsing synthwave sun',
    themeColor: '#00ddff',
    accentColor: '#ff007f',
    shaderKey: 'grid',
    glitchIntensity: 0.15,
    warpSpeed: 1.0,
    distortionAmount: 1.2,
    bloomIntensity: 1.8,
    wireframe: true,
    coreGeometry: 'sphere_sun',
    coreRotationSpeed: 0.5,
    cameraShake: 0.1,
    particleTextureUrl: BUILTIN_PARTICLE_SPRITES.spark.dataUri,
    particleShape: 'spark',
    particleDensity: 4500,
    particleSize: 0.12,
    particleSpeed: 1.0,
    particleBehavior: 'ambient_float',
    particleBlending: 'additive',
  },
  preset_quantum_vortex: {
    id: 'preset_quantum_vortex',
    name: 'Singularity Quantum Vortex',
    category: 'Cosmic',
    description: 'Black hole event horizon gravitational lensing with dual orbital spiral arms and relativistic accretion disk',
    themeColor: '#9d4edd',
    accentColor: '#e0aaff',
    shaderKey: 'vortex',
    glitchIntensity: 0.35,
    warpSpeed: 2.0,
    distortionAmount: 2.5,
    bloomIntensity: 2.6,
    wireframe: true,
    coreGeometry: 'dodecahedron',
    coreRotationSpeed: 2.0,
    cameraShake: 0.5,
    particleTextureUrl: BUILTIN_PARTICLE_SPRITES.orb.dataUri,
    particleShape: 'orb',
    particleDensity: 9000,
    particleSize: 0.16,
    particleSpeed: 2.4,
    particleBehavior: 'vortex_spiral',
    particleBlending: 'additive',
  },
  preset_plasma_bloom: {
    id: 'preset_plasma_bloom',
    name: 'Tesla Plasma Bloom Generator',
    category: 'Elements',
    description: 'Radiant high-voltage plasma tendrils, electric arcs, and dynamic pulsing holographic bloom discharges',
    themeColor: '#fdcc0d',
    accentColor: '#00ddff',
    shaderKey: 'plasma',
    glitchIntensity: 0.45,
    warpSpeed: 1.4,
    distortionAmount: 2.0,
    bloomIntensity: 3.0,
    wireframe: true,
    coreGeometry: 'octahedron',
    coreRotationSpeed: 1.6,
    cameraShake: 0.35,
    particleTextureUrl: BUILTIN_PARTICLE_SPRITES.lightning.dataUri,
    particleShape: 'lightning',
    particleDensity: 6000,
    particleSize: 0.2,
    particleSpeed: 2.0,
    particleBehavior: 'shockwave_pulse',
    particleBlending: 'additive',
  },
  preset_aurora_crystal: {
    id: 'preset_aurora_crystal',
    name: 'Prismatic Aurora Realm',
    category: 'Abstract',
    description: 'Organic refractive floating quartz crystals enveloped in dynamic waving atmospheric curtains and chromatic dispersion',
    themeColor: '#38bdf8',
    accentColor: '#ec4899',
    shaderKey: 'aurora',
    glitchIntensity: 0.05,
    warpSpeed: 0.9,
    distortionAmount: 1.4,
    bloomIntensity: 1.9,
    wireframe: false,
    coreGeometry: 'icosahedron',
    coreRotationSpeed: 0.8,
    cameraShake: 0.1,
    particleTextureUrl: BUILTIN_PARTICLE_SPRITES.crystal.dataUri,
    particleShape: 'crystal',
    particleDensity: 5500,
    particleSize: 0.16,
    particleSpeed: 1.1,
    particleBehavior: 'orbital_galaxy',
    particleBlending: 'additive',
  },
  preset_hologram_ubershader: {
    id: 'preset_hologram_ubershader',
    name: 'Master SGX UberShader',
    category: 'UberShaders',
    description: 'Full-spectrum UberShader with customizable vertex noise displacement, Fresnel edge luminescence, and chromatic split',
    themeColor: '#00ffaa',
    accentColor: '#ff00aa',
    shaderKey: 'ubershader',
    glitchIntensity: 0.5,
    warpSpeed: 1.5,
    distortionAmount: 2.0,
    bloomIntensity: 2.5,
    wireframe: true,
    coreGeometry: 'torus_knot',
    coreRotationSpeed: 1.4,
    cameraShake: 0.25,
    particleTextureUrl: BUILTIN_PARTICLE_SPRITES.spark.dataUri,
    particleShape: 'spark',
    particleDensity: 7500,
    particleSize: 0.18,
    particleSpeed: 1.5,
    particleBehavior: 'vortex_spiral',
    particleBlending: 'additive',
  }
};

export const VISUALIZER_PRESETS: Record<VisualizerPresetId, VisualizerPreset> = {
  ...BUILTIN_PRESETS,
  preset_particle_storm: BUILTIN_PRESETS.preset_quantum_vortex,
  preset_cyber_matrix: BUILTIN_PRESETS.preset_glitch_cyber,
};

export const DEFAULT_PRESET: VisualizerPreset = BUILTIN_PRESETS.preset_glitch_cyber;

// Local Storage Key for Custom Presets
const CUSTOM_PRESETS_STORAGE_KEY = 'sgx_custom_fx_presets_v2';

export function loadCustomPresets(): Record<string, VisualizerPreset> {
  try {
    const raw = localStorage.getItem(CUSTOM_PRESETS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading custom presets from storage:', e);
    return {};
  }
}

export function saveCustomPreset(preset: VisualizerPreset): void {
  try {
    const existing = loadCustomPresets();
    const updated = {
      ...existing,
      [preset.id]: {
        ...preset,
        isCustom: true,
        updatedAt: Date.now(),
        createdAt: preset.createdAt || Date.now(),
      }
    };
    localStorage.setItem(CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('sgx_presets_updated'));
  } catch (e) {
    console.warn('Error saving custom preset:', e);
  }
}

export function deleteCustomPreset(presetId: string): void {
  try {
    const existing = loadCustomPresets();
    delete existing[presetId];
    localStorage.setItem(CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(existing));
    window.dispatchEvent(new CustomEvent('sgx_presets_updated'));
  } catch (e) {
    console.warn('Error deleting custom preset:', e);
  }
}

export function getAllPresets(): Record<string, VisualizerPreset> {
  const custom = loadCustomPresets();
  return {
    ...BUILTIN_PRESETS,
    ...custom,
  };
}

export function exportPresetsJSON(): string {
  const all = getAllPresets();
  return JSON.stringify(all, null, 2);
}

export function importPresetsJSON(jsonStr: string): number {
  try {
    const parsed = JSON.parse(jsonStr);
    if (typeof parsed !== 'object' || parsed === null) throw new Error('Invalid JSON');
    
    const existing = loadCustomPresets();
    let count = 0;

    Object.entries(parsed).forEach(([id, preset]) => {
      if (typeof preset === 'object' && preset !== null && (preset as any).name) {
        existing[id] = {
          ...(preset as VisualizerPreset),
          isCustom: true,
          updatedAt: Date.now(),
        };
        count++;
      }
    });

    localStorage.setItem(CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(existing));
    window.dispatchEvent(new CustomEvent('sgx_presets_updated'));
    return count;
  } catch (e) {
    console.warn('Error importing presets JSON:', e);
    return 0;
  }
}
