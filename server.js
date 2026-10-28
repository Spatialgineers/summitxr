// server.ts
import express from "express";
import http from "http";
import path from "path";
import { createServer as createViteServer } from "vite";

// src/server/engine/wsHandler.ts
import { WebSocketServer, WebSocket } from "ws";

// src/lib/assetCache.ts
import * as THREE from "three";
var BUILTIN_BG_SAMPLES = [
  { id: "grid_floor", name: "\u{1F310} Cyber Grid Matrix", url: `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#0d0d0d"/><path d="M0 50 L100 50 M50 0 L50 100" stroke="#00ddff" stroke-width="0.5" opacity="0.4"/></svg>')}` },
  { id: "hex_mesh", name: "\u2B22 Neon Hex Cell", url: `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"><polygon points="30,5 55,20 55,50 30,65 5,50 5,20" fill="none" stroke="#ff0055" stroke-width="1" opacity="0.4"/></svg>')}` },
  { id: "nebula_space", name: "\u2728 Deep Cosmic Starfield", url: `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#090909"/><circle cx="30" cy="40" r="1.5" fill="#ffffff" opacity="0.8"/><circle cx="150" cy="80" r="2" fill="#00ddff" opacity="0.9"/><circle cx="90" cy="160" r="1" fill="#fdcc0d" opacity="0.7"/></svg>')}` }
];
var BUILTIN_PARTICLE_SPRITES = {
  ember: {
    name: "\u{1F525} Magma Ember",
    description: "Hot turbulent thermal ember with high-density glowing core",
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
    name: "\u26A1 Cyber Spark",
    description: "4-point neon diamond spark with intense pinpoint center",
    dataUri: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
        <defs>
          <radialGradient id="sparkGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
            <stop offset="35%" stop-color="#00ddff" stop-opacity="0.9"/>
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
    name: "\u2728 Quantum Star",
    description: "8-point relativistic cosmic starburst with chromatic glow",
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
    name: "\u{1F7E9} Matrix Glyph",
    description: "Cyberpunk digital stream data cell with holographic halo",
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
    name: "\u{1F52E} Energy Orb",
    description: "Smooth ethereal spherical energy node with soft Gaussian dropoff",
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
    name: "\u{1F48E} Prismatic Shard",
    description: "Refractive quartz shard crystal facet with aurora tint",
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
    name: "\u2B55 Plasma Shockwave",
    description: "Expanding holographic radial shockwave ring",
    dataUri: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="26" fill="none" stroke="#fdcc0d" stroke-width="5" opacity="0.85"/>
        <circle cx="32" cy="32" r="16" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.9"/>
        <circle cx="32" cy="32" r="6" fill="#ff9500"/>
      </svg>
    `.trim())}`
  },
  lightning: {
    name: "\u26A1 Tesla Bolt",
    description: "High-voltage electric discharge tendril",
    dataUri: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
        <polygon points="36,2 14,34 30,34 26,62 50,28 34,28" fill="#00ddff" stroke="#ffffff" stroke-width="1.5"/>
      </svg>
    `.trim())}`
  }
};

// src/lib/presets.ts
var BUILTIN_PRESETS = {
  preset_sgx_icon_3d: {
    id: "preset_sgx_icon_3d",
    name: "SGX.STAGE \u2014 SGX Icon Holographic 3D",
    category: "Abstract",
    description: "Modelo 3D oficial del icono de Spatialgineers rotando en escenario espacial hologr\xE1fico con part\xEDculas de alta energ\xEDa.",
    themeColor: "#FDCC0D",
    accentColor: "#00DDFF",
    shaderKey: "grid",
    glitchIntensity: 0.12,
    warpSpeed: 1,
    distortionAmount: 1.2,
    bloomIntensity: 2,
    wireframe: false,
    coreGeometry: "custom_model",
    model3dUrl: "https://cdn.spatialgineers.com/3D%20Branding/SGX%20Icon.glb",
    coreRotationSpeed: 1,
    cameraShake: 0.08,
    particleTextureUrl: BUILTIN_PARTICLE_SPRITES.spark.dataUri,
    particleShape: "spark",
    particleDensity: 5e3,
    particleSize: 0.18,
    particleSpeed: 1.2,
    particleBehavior: "orbital_ring",
    particleBlending: "additive"
  },
  preset_guild_logo_3d: {
    id: "preset_guild_logo_3d",
    name: "SGX.SYSTEM \u2014 SGX Guild 3D Emblem Stage",
    category: "Abstract",
    description: "Emblema 3D oficial del SGX Guild con iluminaci\xF3n reactiva y halo hologr\xE1fico para los Ranked Trials.",
    themeColor: "#32527B",
    accentColor: "#FDCC0D",
    shaderKey: "ubershader",
    glitchIntensity: 0.15,
    warpSpeed: 1.2,
    distortionAmount: 1.4,
    bloomIntensity: 2.2,
    wireframe: false,
    coreGeometry: "custom_model",
    model3dUrl: "https://cdn.spatialgineers.com/3D%20Branding/Sgxgs%201.glb",
    coreRotationSpeed: 0.8,
    cameraShake: 0.1,
    particleTextureUrl: BUILTIN_PARTICLE_SPRITES.rune.dataUri,
    particleShape: "rune",
    particleDensity: 6e3,
    particleSize: 0.2,
    particleSpeed: 1,
    particleBehavior: "vortex_spiral",
    particleBlending: "additive"
  },
  preset_story_float: {
    id: "preset_story_float",
    name: "SGX.STORY \u2014 Ambient Gold Wireframe",
    category: "Abstract",
    description: "Calm, structured narrative wireframe with gentle yellow grid noise and golden ember runes (Erratic Level 1/6)",
    themeColor: "#FDCC0D",
    accentColor: "#767676",
    shaderKey: "grid",
    glitchIntensity: 0.08,
    warpSpeed: 0.8,
    distortionAmount: 1,
    bloomIntensity: 1.6,
    wireframe: true,
    coreGeometry: "sphere_sun",
    coreRotationSpeed: 0.6,
    cameraShake: 0.05,
    particleTextureUrl: BUILTIN_PARTICLE_SPRITES.rune.dataUri,
    particleShape: "rune",
    particleDensity: 4e3,
    particleSize: 0.14,
    particleSpeed: 0.8,
    particleBehavior: "ambient_float",
    particleBlending: "additive"
  },
  preset_synthesize_chaos: {
    id: "preset_synthesize_chaos",
    name: "SGX.SYNTHESIZE \u2014 Full Spectrum Hyper-Chaos",
    category: "UberShaders",
    description: "Maximum erratic multi-color spectrum swirl, extreme relativistic warp 4.5, CRT glitch split, and 12,000-particle vortex (Erratic Level 6/6)",
    themeColor: "#FDCC0D",
    accentColor: "#00DDFF",
    shaderKey: "ubershader",
    glitchIntensity: 0.98,
    warpSpeed: 4.5,
    distortionAmount: 3.8,
    bloomIntensity: 3.8,
    wireframe: true,
    coreGeometry: "torus_knot",
    coreRotationSpeed: 4.2,
    cameraShake: 0.9,
    particleTextureUrl: BUILTIN_PARTICLE_SPRITES.spark.dataUri,
    particleShape: "spark",
    particleDensity: 12e3,
    particleSize: 0.25,
    particleSpeed: 4.5,
    particleBehavior: "vortex_spiral",
    particleBlending: "additive"
  },
  preset_glitch_cyber: {
    id: "preset_glitch_cyber",
    name: "Cyberpunk Glitch & RGB Split",
    category: "UberShaders",
    description: "High-frequency chromatic aberration split, CRT scanline jitter, strobe displacement, and cybernetic glyph stream",
    themeColor: "#32527B",
    accentColor: "#333333",
    shaderKey: "glitch",
    glitchIntensity: 0.75,
    warpSpeed: 1.2,
    distortionAmount: 1.8,
    bloomIntensity: 2.2,
    wireframe: true,
    coreGeometry: "icosahedron",
    coreRotationSpeed: 1.8,
    cameraShake: 0.6,
    particleTextureUrl: BUILTIN_PARTICLE_SPRITES.rune.dataUri,
    particleShape: "rune",
    particleDensity: 6500,
    particleSize: 0.18,
    particleSpeed: 1.8,
    particleBehavior: "matrix_fall",
    particleBlending: "additive"
  },
  preset_hyper_warp: {
    id: "preset_hyper_warp",
    name: "Hyperspace Relativistic Warp",
    category: "Cosmic",
    description: "Lightspeed star-stretching relativistic hyperspace tunnel with spacetime curvature and relativistic Doppler shift",
    themeColor: "#0070f3",
    accentColor: "#00dfd8",
    shaderKey: "warp",
    glitchIntensity: 0.1,
    warpSpeed: 3.5,
    distortionAmount: 2.2,
    bloomIntensity: 2.4,
    wireframe: true,
    coreGeometry: "torus_ring",
    coreRotationSpeed: 2.5,
    cameraShake: 0.4,
    particleTextureUrl: BUILTIN_PARTICLE_SPRITES.star.dataUri,
    particleShape: "star",
    particleDensity: 8500,
    particleSize: 0.15,
    particleSpeed: 3.2,
    particleBehavior: "tunnel_stream",
    particleBlending: "additive"
  },
  preset_volcano_fire: {
    id: "preset_volcano_fire",
    name: "Inferno Magma Core",
    category: "Elements",
    description: "Turbulent molten lava vortex with erupting high-velocity thermal ember particles and convective heat ripples",
    themeColor: "#ff3b30",
    accentColor: "#ff9500",
    shaderKey: "volcano",
    glitchIntensity: 0.2,
    warpSpeed: 0.8,
    distortionAmount: 1.5,
    bloomIntensity: 2,
    wireframe: true,
    coreGeometry: "torus_knot",
    coreRotationSpeed: 1.2,
    cameraShake: 0.3,
    particleTextureUrl: BUILTIN_PARTICLE_SPRITES.ember.dataUri,
    particleShape: "ember",
    particleDensity: 7e3,
    particleSize: 0.22,
    particleSpeed: 1.6,
    particleBehavior: "upward_fountain",
    particleBlending: "additive"
  },
  preset_neon_grid: {
    id: "preset_neon_grid",
    name: "Synthwave Wireframe Terrain",
    category: "Cyber",
    description: "Retro-futuristic infinite perspective wireframe terrain with undulating mountain noise and a pulsing synthwave sun",
    themeColor: "#00ddff",
    accentColor: "#ff007f",
    shaderKey: "grid",
    glitchIntensity: 0.15,
    warpSpeed: 1,
    distortionAmount: 1.2,
    bloomIntensity: 1.8,
    wireframe: true,
    coreGeometry: "sphere_sun",
    coreRotationSpeed: 0.5,
    cameraShake: 0.1,
    particleTextureUrl: BUILTIN_PARTICLE_SPRITES.spark.dataUri,
    particleShape: "spark",
    particleDensity: 4500,
    particleSize: 0.12,
    particleSpeed: 1,
    particleBehavior: "ambient_float",
    particleBlending: "additive"
  },
  preset_quantum_vortex: {
    id: "preset_quantum_vortex",
    name: "Singularity Quantum Vortex",
    category: "Cosmic",
    description: "Black hole event horizon gravitational lensing with dual orbital spiral arms and relativistic accretion disk",
    themeColor: "#9d4edd",
    accentColor: "#e0aaff",
    shaderKey: "vortex",
    glitchIntensity: 0.35,
    warpSpeed: 2,
    distortionAmount: 2.5,
    bloomIntensity: 2.6,
    wireframe: true,
    coreGeometry: "dodecahedron",
    coreRotationSpeed: 2,
    cameraShake: 0.5,
    particleTextureUrl: BUILTIN_PARTICLE_SPRITES.orb.dataUri,
    particleShape: "orb",
    particleDensity: 9e3,
    particleSize: 0.16,
    particleSpeed: 2.4,
    particleBehavior: "vortex_spiral",
    particleBlending: "additive"
  },
  preset_plasma_bloom: {
    id: "preset_plasma_bloom",
    name: "Tesla Plasma Bloom Generator",
    category: "Elements",
    description: "Radiant high-voltage plasma tendrils, electric arcs, and dynamic pulsing holographic bloom discharges",
    themeColor: "#fdcc0d",
    accentColor: "#00ddff",
    shaderKey: "plasma",
    glitchIntensity: 0.45,
    warpSpeed: 1.4,
    distortionAmount: 2,
    bloomIntensity: 3,
    wireframe: true,
    coreGeometry: "octahedron",
    coreRotationSpeed: 1.6,
    cameraShake: 0.35,
    particleTextureUrl: BUILTIN_PARTICLE_SPRITES.lightning.dataUri,
    particleShape: "lightning",
    particleDensity: 6e3,
    particleSize: 0.2,
    particleSpeed: 2,
    particleBehavior: "shockwave_pulse",
    particleBlending: "additive"
  },
  preset_aurora_crystal: {
    id: "preset_aurora_crystal",
    name: "Prismatic Aurora Realm",
    category: "Abstract",
    description: "Organic refractive floating quartz crystals enveloped in dynamic waving atmospheric curtains and chromatic dispersion",
    themeColor: "#38bdf8",
    accentColor: "#ec4899",
    shaderKey: "aurora",
    glitchIntensity: 0.05,
    warpSpeed: 0.9,
    distortionAmount: 1.4,
    bloomIntensity: 1.9,
    wireframe: false,
    coreGeometry: "icosahedron",
    coreRotationSpeed: 0.8,
    cameraShake: 0.1,
    particleTextureUrl: BUILTIN_PARTICLE_SPRITES.crystal.dataUri,
    particleShape: "crystal",
    particleDensity: 5500,
    particleSize: 0.16,
    particleSpeed: 1.1,
    particleBehavior: "orbital_galaxy",
    particleBlending: "additive"
  },
  preset_hologram_ubershader: {
    id: "preset_hologram_ubershader",
    name: "Master SGX UberShader",
    category: "UberShaders",
    description: "Full-spectrum UberShader with customizable vertex noise displacement, Fresnel edge luminescence, and chromatic split",
    themeColor: "#00ffaa",
    accentColor: "#ff00aa",
    shaderKey: "ubershader",
    glitchIntensity: 0.5,
    warpSpeed: 1.5,
    distortionAmount: 2,
    bloomIntensity: 2.5,
    wireframe: true,
    coreGeometry: "torus_knot",
    coreRotationSpeed: 1.4,
    cameraShake: 0.25,
    particleTextureUrl: BUILTIN_PARTICLE_SPRITES.spark.dataUri,
    particleShape: "spark",
    particleDensity: 7500,
    particleSize: 0.18,
    particleSpeed: 1.5,
    particleBehavior: "vortex_spiral",
    particleBlending: "additive"
  }
};
var VISUALIZER_PRESETS = {
  ...BUILTIN_PRESETS,
  preset_particle_storm: BUILTIN_PRESETS.preset_quantum_vortex,
  preset_cyber_matrix: BUILTIN_PRESETS.preset_glitch_cyber
};
var DEFAULT_PRESET = BUILTIN_PRESETS.preset_glitch_cyber;

// src/lib/schemas.ts
var INITIAL_TENANTS = [
  {
    id: "tenant_sgx_story",
    name: "SGX.STORY \u2014 Lore & Craft",
    slug: "story",
    pillarId: "SGX.STORY",
    vibe: "Amarillo Ne\xF3n & Oro (Narrativa & Lore)",
    description: "Preset enfocado en desarrollo conceptual, worldbuilding y est\xE9tica amarillo ne\xF3n.",
    erraticRating: 1,
    presetId: "preset_story_float",
    branding: {
      primaryColor: "#FDCC0D",
      secondaryColor: "#32527B",
      accentColor: "#FFE566",
      backgroundColor: "#101010",
      cardBgColor: "#1B1B1B",
      borderColor: "#FDCC0D",
      neonHighlightColor: "#FFE566",
      glowShadow: "rgba(253, 204, 13, 0.45)",
      gradientCss: "linear-gradient(135deg, #FDCC0D 0%, #32527B 100%)"
    }
  },
  {
    id: "tenant_sgx_spark",
    name: "SGX.SPARK \u2014 Gamification & Logic",
    slug: "spark",
    pillarId: "SGX.SPARK",
    vibe: "Naranja Ne\xF3n & Fuego (Alto Voltaje L\xF3gico)",
    description: "Preset para mec\xE1nicas de gamificaci\xF3n, simulador de dron y dinamismo interactivo.",
    erraticRating: 3,
    presetId: "preset_plasma_bloom",
    branding: {
      primaryColor: "#FFBB00",
      secondaryColor: "#FDCC0D",
      accentColor: "#FF8800",
      backgroundColor: "#140904",
      cardBgColor: "#1F1008",
      borderColor: "#FFBB00",
      neonHighlightColor: "#FFAA33",
      glowShadow: "rgba(255, 187, 0, 0.55)",
      gradientCss: "linear-gradient(135deg, #FFBB00 0%, #FDCC0D 100%)"
    }
  },
  {
    id: "tenant_sgx_showcase",
    name: "SGX.SHOWCASE \u2014 Brand & Exhibition",
    slug: "showcase",
    pillarId: "SGX.SHOWCASE",
    vibe: "Cyan Ne\xF3n & WebXR (Showroom de Marcas)",
    description: "Preset de alta claridad pensado para exhibici\xF3n de patrocinadores, 3D y marcas.",
    erraticRating: 2,
    presetId: "preset_aurora_crystal",
    branding: {
      primaryColor: "#00DDFF",
      secondaryColor: "#32527B",
      accentColor: "#33FFFF",
      backgroundColor: "#101010",
      cardBgColor: "#1E1E1E",
      borderColor: "#00DDFF",
      neonHighlightColor: "#00DDFF",
      glowShadow: "rgba(0, 221, 255, 0.55)",
      gradientCss: "linear-gradient(135deg, #00DDFF 0%, #32527B 100%)"
    }
  },
  {
    id: "tenant_sgx_stage",
    name: "SGX.STAGE \u2014 Virtual Production Arena",
    slug: "stage",
    pillarId: "SGX.STAGE",
    vibe: "Blanco Puro & Spotlights (Luces de Escenario)",
    description: "Preset de escenario en vivo con strobes de alta intensidad y presencia esc\xE9nica.",
    erraticRating: 4,
    presetId: "preset_volcano_fire",
    branding: {
      primaryColor: "#FFFFFF",
      secondaryColor: "#32527B",
      accentColor: "#F8FAFC",
      backgroundColor: "#1B1B1B",
      cardBgColor: "#2B2B2B",
      borderColor: "#FFFFFF",
      neonHighlightColor: "#F8FAFC",
      glowShadow: "rgba(255, 255, 255, 0.65)",
      gradientCss: "linear-gradient(135deg, #FFFFFF 0%, #32527B 100%)"
    }
  },
  {
    id: "tenant_sgx_system",
    name: "SGX.SYSTEM \u2014 Core Matrix Infrastructure",
    slug: "system",
    pillarId: "SGX.SYSTEM",
    vibe: "Azul Oficial SGX & Cian (#32527B & #00DDFF)",
    description: "Preset t\xE9cnico de bajo nivel con arquitectura en Azul Oficial SGX (#32527B) e infraestructura cloud.",
    erraticRating: 5,
    presetId: "preset_glitch_cyber",
    branding: {
      primaryColor: "#32527B",
      secondaryColor: "#00DDFF",
      accentColor: "#FDCC0D",
      backgroundColor: "#0F0F0F",
      cardBgColor: "#191919",
      borderColor: "#32527B",
      neonHighlightColor: "#00DDFF",
      glowShadow: "rgba(50, 82, 123, 0.75)",
      gradientCss: "linear-gradient(135deg, #32527B 0%, #00DDFF 100%)"
    }
  },
  {
    id: "tenant_sgx_synthesize",
    name: "SGX.SYNTHESIZE \u2014 Full Spectrum SGX",
    slug: "synthesize",
    pillarId: "SGX.SYNTHESIZE",
    vibe: "Gradiente Amarillo / Azul SGX (#FDCC0D & #32527B)",
    description: "Preset sin\xE9rgico total que armoniza todos los pilares con el gradiente oficial SGX.",
    erraticRating: 6,
    presetId: "preset_synthesize_chaos",
    branding: {
      primaryColor: "#FDCC0D",
      secondaryColor: "#32527B",
      accentColor: "#00DDFF",
      backgroundColor: "#0F0F0F",
      cardBgColor: "#1E1E1E",
      borderColor: "#FDCC0D",
      neonHighlightColor: "#FFE566",
      glowShadow: "rgba(253, 204, 13, 0.65)",
      gradientCss: "linear-gradient(135deg, #FDCC0D 0%, #32527B 100%)"
    }
  }
];
var SAMPLE_QUESTIONS = [
  {
    id: "q_001",
    tenantId: "tenant_spatialgineers",
    eventId: "event_live_main",
    order: 1,
    prompt: "\xBFHacia qu\xE9 mundo viaja el escenario ahora?",
    subtitle: "La audiencia decide: tu voto cambia el visual y las luces del escenario en vivo.",
    category: "Decisi\xF3n en vivo",
    answerType: "OPINION_CYOA",
    durationSeconds: 30,
    basePoints: 200,
    maxSpeedBonus: 150,
    participationWeight: 50,
    options: [
      {
        id: "opt_a",
        index: 0,
        code: 1,
        label: "A: Rejilla ne\xF3n",
        description: "Monta\xF1as de malla y un sol ne\xF3n al horizonte",
        presetId: "preset_neon_grid",
        color: "#00ddff",
        effectType: "cyber_grid_pulse",
        effectName: "Onda Ne\xF3n Rejilla Synthwave",
        effectMultiplier: 1.5,
        effectTargetParam: "Malla 3D & Pulsaci\xF3n Sol Cyber"
      },
      {
        id: "opt_b",
        index: 1,
        code: 2,
        label: "B: Volc\xE1n de magma",
        description: "Remolino de lava con brasas que suben",
        presetId: "preset_volcano_fire",
        color: "#ff3b30",
        effectType: "magma_eruption",
        effectName: "Erupci\xF3n Magma & Brasas T\xE9rmicas",
        effectMultiplier: 1.8,
        effectTargetParam: "Velocidad Part\xEDculas de Fuego"
      },
      {
        id: "opt_c",
        index: 2,
        code: 3,
        label: "C: Tormenta de part\xEDculas",
        description: "8,000 part\xEDculas atra\xEDdas por un n\xFAcleo de gravedad",
        presetId: "preset_particle_storm",
        color: "#5f86b4",
        effectType: "quantum_vortex",
        effectName: "V\xF3rtice Cu\xE1ntico Orbital",
        effectMultiplier: 1.4,
        effectTargetParam: "Giro Orbital & Gravitaci\xF3n"
      },
      {
        id: "opt_d",
        index: 3,
        code: 4,
        label: "D: Lluvia de datos",
        description: "Columnas de datos alrededor de un n\xFAcleo hologr\xE1fico",
        presetId: "preset_cyber_matrix",
        color: "#22c55e",
        effectType: "matrix_rain",
        effectName: "Lluvia Digital Matrix",
        effectMultiplier: 1.6,
        effectTargetParam: "Velocidad de Ca\xEDda Matrix"
      }
    ],
    storyPathOutcome: {
      narrative: "The collective consensus has unlocked a hyperspace jump into the selected cyber dimension!",
      stageTitle: "DIMENSION WARP INITIATED"
    }
  },
  {
    id: "q_002",
    tenantId: "tenant_spatialgineers",
    eventId: "event_live_main",
    order: 2,
    prompt: "TRIVIA: \xBFQu\xE9 hace posible que el navegador dibuje 3D en tiempo real?",
    subtitle: "Responde r\xE1pido y bien: sumas m\xE1s XP.",
    category: "Trivia espacial",
    answerType: "KNOWLEDGE",
    durationSeconds: 20,
    basePoints: 300,
    maxSpeedBonus: 200,
    participationWeight: 50,
    options: [
      {
        id: "opt_a",
        index: 0,
        code: 1,
        label: "A: WebGL y shaders en la GPU",
        description: "Programas que corren directo en la tarjeta gr\xE1fica",
        presetId: "preset_hyper_warp",
        isCorrect: true,
        color: "#0070f3",
        effectType: "hyper_warp_streak",
        effectName: "Aceleraci\xF3n T\xFAnel H\xEDper-Warp",
        effectMultiplier: 2,
        effectTargetParam: "Estiramiento Estelar Hyperspace"
      },
      {
        id: "opt_b",
        index: 1,
        code: 2,
        label: "B: Im\xE1genes 2D est\xE1ticas",
        description: "Todo dibujado por el procesador, cuadro a cuadro",
        presetId: "preset_volcano_fire",
        isCorrect: false,
        color: "#ff3b30",
        effectType: "magma_eruption",
        effectName: "Fuego & Brasas de Calor CPU",
        effectMultiplier: 1.2,
        effectTargetParam: "Emisi\xF3n T\xE9rmica Lava"
      },
      {
        id: "opt_c",
        index: 2,
        code: 3,
        label: "C: Un video desde el servidor",
        description: "Im\xE1genes que llegan de la nube",
        presetId: "preset_neon_grid",
        isCorrect: false,
        color: "#00ddff",
        effectType: "cyber_grid_pulse",
        effectName: "Malla Ne\xF3n Distorsionada",
        effectMultiplier: 1,
        effectTargetParam: "Velocidad Plano Rejilla"
      },
      {
        id: "opt_d",
        index: 3,
        code: 4,
        label: "D: Solo animaciones CSS",
        description: "Transformaciones de estilo en la p\xE1gina",
        presetId: "preset_aurora_crystal",
        isCorrect: false,
        color: "#ec4899",
        effectType: "aurora_crystal_wave",
        effectName: "Atm\xF3sfera Prism\xE1tica Aurora",
        effectMultiplier: 1.3,
        effectTargetParam: "Ondulaci\xF3n Cristales Quartz"
      }
    ]
  },
  {
    id: "q_003",
    tenantId: "tenant_spatialgineers",
    eventId: "event_live_main",
    order: 3,
    prompt: "GRAN FINAL: \xBFCon qu\xE9 efecto cerramos el escenario?",
    subtitle: "Tu voto dispara el efecto final en la pantalla y en la transmisi\xF3n.",
    category: "Gran final",
    answerType: "OPINION_CYOA",
    durationSeconds: 30,
    basePoints: 250,
    maxSpeedBonus: 150,
    participationWeight: 100,
    options: [
      {
        id: "opt_a",
        index: 0,
        code: 1,
        label: "A: Aurora de cristal",
        description: "Cristales que refractan y cortinas de aurora",
        presetId: "preset_aurora_crystal",
        color: "#38bdf8",
        effectType: "aurora_crystal_wave",
        effectName: "Onda Prism\xE1tica de Cristal Quartz",
        effectMultiplier: 1.7,
        effectTargetParam: "Brote de Luz & Refracci\xF3n"
      },
      {
        id: "opt_b",
        index: 1,
        code: 2,
        label: "B: Salto al hiperespacio",
        description: "Las estrellas se estiran a la velocidad de la luz",
        presetId: "preset_hyper_warp",
        color: "#6366f1",
        effectType: "hyper_warp_streak",
        effectName: "Impulso H\xEDper-Warp Relativista",
        effectMultiplier: 2.2,
        effectTargetParam: "Aceleraci\xF3n T\xFAnel de Estrellas"
      },
      {
        id: "opt_c",
        index: 2,
        code: 3,
        label: "C: Tormenta c\xF3smica",
        description: "Un v\xF3rtice gal\xE1ctico con dos pozos de gravedad",
        presetId: "preset_particle_storm",
        color: "#9d4edd",
        effectType: "quantum_vortex",
        effectName: "V\xF3rtice Gal\xE1ctico Espiral",
        effectMultiplier: 1.8,
        effectTargetParam: "Densidad y Giro Gal\xE1ctico"
      },
      {
        id: "opt_d",
        index: 3,
        code: 4,
        label: "D: Erupci\xF3n de lava",
        description: "Magma y fuego que iluminan la escena",
        presetId: "preset_volcano_fire",
        color: "#f97316",
        effectType: "magma_eruption",
        effectName: "Erupci\xF3n Magma T\xE9rmica Explosiva",
        effectMultiplier: 2.5,
        effectTargetParam: "Impulso Vertical de Brasas"
      }
    ]
  }
];

// src/server/engine/roomManager.ts
var DEFAULT_TENANT_ID = "tenant_spatialgineers";
var DEFAULT_EVENT_ID = "event_live_main";
var MAX_ROOMS = 20;
var ROOM_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
var KNOWN_TENANT_IDS = /* @__PURE__ */ new Set([DEFAULT_TENANT_ID, ...INITIAL_TENANTS.map((t) => t.id)]);
var rooms = /* @__PURE__ */ new Map();
function getOrCreateRoom(tenantId = "tenant_spatialgineers", eventId = "event_live_main") {
  const key = `${tenantId}:${eventId}`;
  if (!rooms.has(key)) {
    const defaultQuestions = JSON.parse(JSON.stringify(SAMPLE_QUESTIONS));
    rooms.set(key, {
      tenantId,
      eventId,
      session: {
        id: `sess_${Date.now()}`,
        tenantId,
        title: "SGX Live Visualizer Stage",
        description: "Interactive Choose Your Own Adventure Broadcast Engine",
        status: "IDLE",
        activePresetId: DEFAULT_PRESET.id,
        timeRemaining: 0
      },
      questions: defaultQuestions,
      currentQuestionIndex: 0,
      votes: /* @__PURE__ */ new Map(),
      users: /* @__PURE__ */ new Map(),
      recentReactions: []
    });
  }
  return rooms.get(key);
}
function resolveRoom(tenantIdRaw, eventIdRaw) {
  const tenantId = tenantIdRaw === void 0 || tenantIdRaw === null || tenantIdRaw === "" ? DEFAULT_TENANT_ID : tenantIdRaw;
  const eventId = eventIdRaw === void 0 || eventIdRaw === null || eventIdRaw === "" ? DEFAULT_EVENT_ID : eventIdRaw;
  if (typeof tenantId !== "string" || !ROOM_ID_RE.test(tenantId) || typeof eventId !== "string" || !ROOM_ID_RE.test(eventId)) {
    return { ok: false, status: 400, error: "INVALID_ROOM_ID" };
  }
  const key = `${tenantId}:${eventId}`;
  const existing = rooms.get(key);
  if (existing) return { ok: true, room: existing };
  const alwaysAllowed = KNOWN_TENANT_IDS.has(tenantId) && eventId === DEFAULT_EVENT_ID;
  if (!alwaysAllowed && rooms.size >= MAX_ROOMS) {
    return { ok: false, status: 503, error: "ROOM_LIMIT_REACHED" };
  }
  return { ok: true, room: getOrCreateRoom(tenantId, eventId) };
}

// src/lib/gamification.ts
function calculatePoints(answerType, isCorrectOption, responseTimeMs, totalDurationMs, basePoints = 200, maxSpeedBonus = 150, participationWeight = 50, currentStreak = 0) {
  const isCorrect = answerType === "OPINION_CYOA" ? true : isCorrectOption;
  const accuracyFactor = isCorrect ? 1 : 0;
  const basePointsEarned = accuracyFactor * basePoints;
  const clampedResponseTime = Math.max(0, Math.min(responseTimeMs, totalDurationMs));
  const speedRatio = Math.max(0, 1 - clampedResponseTime / Math.max(1, totalDurationMs));
  const rawSpeedBonus = Math.floor(speedRatio * maxSpeedBonus);
  const participationBonus = participationWeight;
  let newStreak = currentStreak;
  if (isCorrect) {
    newStreak += 1;
  } else {
    newStreak = 0;
  }
  let streakMultiplier = 1;
  if (newStreak >= 5) streakMultiplier = 2;
  else if (newStreak === 4) streakMultiplier = 1.75;
  else if (newStreak === 3) streakMultiplier = 1.5;
  else if (newStreak === 2) streakMultiplier = 1.25;
  const preMultiplierTotal = basePointsEarned + rawSpeedBonus + participationBonus;
  const totalPointsEarned = Math.round(preMultiplierTotal * streakMultiplier);
  return {
    accuracyFactor,
    basePointsEarned,
    speedRatio,
    rawSpeedBonus,
    participationWeight: participationBonus,
    streakMultiplier,
    totalPointsEarned,
    isCorrect,
    newStreak
  };
}

// src/server/security/validation.ts
var LIMITS = {
  MAX_QUESTIONS: 200,
  MIN_OPTIONS: 2,
  MAX_OPTIONS: 8,
  PROMPT_MAX: 300,
  LABEL_MAX: 120,
  TEXT_MAX: 500,
  SHORT_MAX: 80,
  ID_MAX: 64,
  NICKNAME_MAX: 40,
  SIMULATE_MAX: 500
};
var ID_RE = /^[A-Za-z0-9_.:-]{1,64}$/;
var HEX_COLOR_RE = /^#[0-9a-fA-F]{3,8}$/;
function isValidId(v) {
  return typeof v === "string" && ID_RE.test(v);
}
function cleanText(v, max) {
  if (typeof v !== "string") return "";
  return v.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
}
function optText(v, max) {
  const s = cleanText(v, max);
  return s ? s : void 0;
}
function clampInt(v, min, max, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}
function optNumber(v, min, max) {
  const n = Number(v);
  if (v === void 0 || v === null || !Number.isFinite(n)) return void 0;
  return Math.min(max, Math.max(min, n));
}
function validateOption(raw, idx, qIdx) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: `question[${qIdx}].options[${idx}] must be an object` };
  }
  const label = cleanText(raw.label, LIMITS.LABEL_MAX + 1);
  if (!label) return { ok: false, error: `question[${qIdx}].options[${idx}].label is required` };
  if (label.length > LIMITS.LABEL_MAX) {
    return { ok: false, error: `question[${qIdx}].options[${idx}].label exceeds ${LIMITS.LABEL_MAX} chars` };
  }
  if (raw.id !== void 0 && !isValidId(raw.id)) {
    return { ok: false, error: `question[${qIdx}].options[${idx}].id is invalid` };
  }
  const presetId = isValidId(raw.presetId) ? raw.presetId : "preset_neon_grid";
  const color = typeof raw.color === "string" && HEX_COLOR_RE.test(raw.color) ? raw.color : "#00DDFF";
  const opt = {
    id: raw.id || `opt_${idx + 1}`,
    index: idx,
    code: idx + 1,
    label,
    presetId,
    color
  };
  const description = optText(raw.description, LIMITS.TEXT_MAX);
  if (description) opt.description = description;
  if (typeof raw.isCorrect === "boolean") opt.isCorrect = raw.isCorrect;
  if (isValidId(raw.effectType)) opt.effectType = raw.effectType;
  const effectName = optText(raw.effectName, LIMITS.SHORT_MAX);
  if (effectName) opt.effectName = effectName;
  const effectMultiplier = optNumber(raw.effectMultiplier, 0, 5);
  if (effectMultiplier !== void 0) opt.effectMultiplier = effectMultiplier;
  const effectTargetParam = optText(raw.effectTargetParam, LIMITS.SHORT_MAX);
  if (effectTargetParam) opt.effectTargetParam = effectTargetParam;
  return { ok: true, value: opt };
}
function validateQuestion(raw, qIdx, fallbackId) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: `question[${qIdx}] must be an object` };
  }
  if (raw.id !== void 0 && !isValidId(raw.id)) return { ok: false, error: `question[${qIdx}].id is invalid` };
  const prompt = cleanText(raw.prompt ?? raw.text, LIMITS.PROMPT_MAX + 1);
  if (!prompt) return { ok: false, error: `question[${qIdx}].prompt is required` };
  if (prompt.length > LIMITS.PROMPT_MAX) {
    return { ok: false, error: `question[${qIdx}].prompt exceeds ${LIMITS.PROMPT_MAX} chars` };
  }
  if (!Array.isArray(raw.options)) return { ok: false, error: `question[${qIdx}].options must be an array` };
  if (raw.options.length < LIMITS.MIN_OPTIONS || raw.options.length > LIMITS.MAX_OPTIONS) {
    return { ok: false, error: `question[${qIdx}] needs ${LIMITS.MIN_OPTIONS}-${LIMITS.MAX_OPTIONS} options` };
  }
  const options = [];
  const seen = /* @__PURE__ */ new Set();
  for (let i = 0; i < raw.options.length; i++) {
    const r = validateOption(raw.options[i], i, qIdx);
    if (!r.ok) return r;
    if (seen.has(r.value.id)) return { ok: false, error: `question[${qIdx}] has duplicate option id ${r.value.id}` };
    seen.add(r.value.id);
    options.push(r.value);
  }
  const q = {
    id: raw.id || fallbackId,
    tenantId: "",
    eventId: "",
    order: 0,
    prompt,
    category: cleanText(raw.category, LIMITS.SHORT_MAX) || "AUDIENCE_POLL",
    answerType: raw.answerType === "KNOWLEDGE" ? "KNOWLEDGE" : "OPINION_CYOA",
    durationSeconds: clampInt(raw.durationSeconds, 5, 600, 30),
    basePoints: clampInt(raw.basePoints, 0, 1e4, 100),
    maxSpeedBonus: clampInt(raw.maxSpeedBonus, 0, 1e4, 50),
    participationWeight: clampInt(raw.participationWeight, 0, 1e4, 20),
    options
  };
  const subtitle = optText(raw.subtitle, LIMITS.PROMPT_MAX);
  if (subtitle) q.subtitle = subtitle;
  if (raw.storyPathOutcome && typeof raw.storyPathOutcome === "object") {
    q.storyPathOutcome = {
      narrative: cleanText(raw.storyPathOutcome.narrative, LIMITS.TEXT_MAX),
      stageTitle: cleanText(raw.storyPathOutcome.stageTitle, LIMITS.PROMPT_MAX)
    };
  }
  return { ok: true, value: q };
}
function validateQuestionList(rawList, maxCount, idPrefix) {
  if (!Array.isArray(rawList)) return { ok: false, error: "questions must be an array" };
  if (rawList.length === 0) return { ok: false, error: "questions must not be empty" };
  if (rawList.length > maxCount) return { ok: false, error: `at most ${maxCount} questions allowed` };
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (let i = 0; i < rawList.length; i++) {
    const r = validateQuestion(rawList[i], i, `${idPrefix}_${i}`);
    if (!r.ok) return r;
    if (seen.has(r.value.id)) return { ok: false, error: `duplicate question id ${r.value.id}` };
    seen.add(r.value.id);
    out.push(r.value);
  }
  return { ok: true, value: out };
}
function cleanNickname(v) {
  return cleanText(v, LIMITS.NICKNAME_MAX);
}
function cleanAvatar(v) {
  const s = cleanText(v, 16);
  return s && !s.includes(":") ? s : void 0;
}
function cleanColor(v) {
  return typeof v === "string" && HEX_COLOR_RE.test(v) ? v : void 0;
}

// src/server/engine/votingEngine.ts
var VOTE_BROADCAST_INTERVAL_MS = 500;
var LIVE_USERS_LIMIT = 50;
function computeVoteSummary(room, question) {
  const options = Array.isArray(question?.options) ? question.options.filter((o) => o && typeof o.id === "string") : [];
  const totalVotes = room.votes.size;
  const optionCounts = {};
  const optionPercentages = {};
  options.forEach((opt) => {
    optionCounts[opt.id] = 0;
    optionPercentages[opt.id] = 0;
  });
  room.votes.forEach((vote) => {
    if (optionCounts[vote.optionId] !== void 0) {
      optionCounts[vote.optionId]++;
    }
  });
  let highestCount = -1;
  let winningOptionId = options[0]?.id || "";
  let winningPresetId = options[0]?.presetId || DEFAULT_PRESET.id;
  options.forEach((opt) => {
    const count = optionCounts[opt.id] || 0;
    optionPercentages[opt.id] = totalVotes > 0 ? Math.round(count / totalVotes * 100) : 0;
    if (count > highestCount) {
      highestCount = count;
      winningOptionId = opt.id;
      winningPresetId = opt.presetId || DEFAULT_PRESET.id;
    }
  });
  const correctOption = options.find((o) => o.isCorrect);
  return {
    questionId: question?.id || "",
    totalVotes,
    optionCounts,
    optionPercentages,
    winningOptionId,
    winningPresetId,
    correctOptionId: correctOption?.id
  };
}
function endVotingAndReveal(room, question, broadcast) {
  if (room.timerInterval) {
    clearInterval(room.timerInterval);
    room.timerInterval = void 0;
  }
  cancelVoteBroadcast(room);
  const summary = computeVoteSummary(room, question);
  room.session.status = "RESULT_REVEALED";
  room.session.activePresetId = summary.winningPresetId;
  room.session.timeRemaining = 0;
  const winningPreset = VISUALIZER_PRESETS[summary.winningPresetId] || DEFAULT_PRESET;
  broadcast(room.tenantId, room.eventId, {
    type: "VOTING_CLOSED",
    tenantId: room.tenantId,
    eventId: room.eventId,
    timestamp: Date.now(),
    payload: {
      summary,
      winningPreset,
      winningPresetId: summary.winningPresetId,
      storyNarrative: question.storyPathOutcome?.narrative,
      users: Array.from(room.users.values())
    }
  });
  broadcast(room.tenantId, room.eventId, {
    type: "VOTE_SUMMARY",
    tenantId: room.tenantId,
    eventId: room.eventId,
    timestamp: Date.now(),
    payload: {
      summary,
      winningPreset,
      storyNarrative: question.storyPathOutcome?.narrative
    }
  });
  broadcast(room.tenantId, room.eventId, {
    type: "VISUALIZER_TRIGGER",
    tenantId: room.tenantId,
    eventId: room.eventId,
    timestamp: Date.now(),
    payload: {
      presetId: summary.winningPresetId,
      source: "WINNER_VOTE"
    }
  });
  broadcast(room.tenantId, room.eventId, {
    type: "PRESET_TRIGGER",
    tenantId: room.tenantId,
    eventId: room.eventId,
    timestamp: Date.now(),
    payload: {
      presetId: summary.winningPresetId,
      source: "WINNER_VOTE"
    }
  });
}
function startQuestionVoting(room, questionIndex, broadcast) {
  if (questionIndex >= 0 && questionIndex < room.questions.length) {
    room.currentQuestionIndex = questionIndex;
  }
  const question = room.questions[room.currentQuestionIndex];
  if (!question) return null;
  room.votes.clear();
  const duration = question.durationSeconds || 30;
  const endTime = Date.now() + duration * 1e3;
  room.session.status = "VOTING_ACTIVE";
  room.session.currentQuestionId = question.id;
  room.session.startedAt = Date.now();
  room.session.questionEndTime = endTime;
  room.session.timeRemaining = duration;
  if (room.timerInterval) {
    clearInterval(room.timerInterval);
  }
  cancelVoteBroadcast(room);
  const initialSummary = computeVoteSummary(room, question);
  broadcast(room.tenantId, room.eventId, {
    type: "QUESTION_START",
    tenantId: room.tenantId,
    eventId: room.eventId,
    timestamp: Date.now(),
    payload: {
      question,
      questionIndex: room.currentQuestionIndex,
      durationSeconds: duration,
      session: room.session,
      voteSummary: initialSummary,
      endTime
    }
  });
  broadcast(room.tenantId, room.eventId, {
    type: "STATE_SYNC",
    tenantId: room.tenantId,
    eventId: room.eventId,
    timestamp: Date.now(),
    payload: {
      session: room.session,
      currentQuestion: question,
      currentQuestionIndex: room.currentQuestionIndex,
      voteSummary: initialSummary,
      totalVotes: 0
    }
  });
  room.timerInterval = setInterval(() => {
    try {
      const now = Date.now();
      const remainingMs = Math.max(0, endTime - now);
      const remainingSec = Math.ceil(remainingMs / 1e3);
      room.session.timeRemaining = remainingSec;
      broadcast(room.tenantId, room.eventId, {
        type: "TIMER_TICK",
        tenantId: room.tenantId,
        eventId: room.eventId,
        timestamp: now,
        payload: {
          questionId: question.id,
          timeRemaining: remainingSec,
          totalDuration: duration
        }
      });
      broadcast(room.tenantId, room.eventId, {
        type: "COUNTDOWN_TICK",
        tenantId: room.tenantId,
        eventId: room.eventId,
        timestamp: now,
        payload: {
          questionId: question.id,
          timeRemaining: remainingSec,
          totalDuration: duration
        }
      });
      if (remainingSec <= 0) {
        endVotingAndReveal(room, question, broadcast);
      }
    } catch (err) {
      console.error("[Voting Engine] timer tick error:", err);
      if (room.timerInterval) clearInterval(room.timerInterval);
      room.timerInterval = void 0;
    }
  }, 1e3);
  return question;
}
function cancelVoteBroadcast(room) {
  if (room.voteBroadcastTimer) {
    clearTimeout(room.voteBroadcastTimer);
    room.voteBroadcastTimer = void 0;
  }
}
function topUsers(room) {
  return Array.from(room.users.values()).sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0)).slice(0, LIVE_USERS_LIMIT);
}
function scheduleVoteBroadcast(room, broadcast) {
  if (room.voteBroadcastTimer) return;
  room.voteBroadcastTimer = setTimeout(() => {
    room.voteBroadcastTimer = void 0;
    try {
      const currentQ = room.questions[room.currentQuestionIndex];
      if (!currentQ) return;
      const liveSummary = computeVoteSummary(room, currentQ);
      broadcast(room.tenantId, room.eventId, {
        type: "VOTE_UPDATE",
        tenantId: room.tenantId,
        eventId: room.eventId,
        timestamp: Date.now(),
        payload: liveSummary
      });
      broadcast(room.tenantId, room.eventId, {
        type: "STATE_SYNC",
        tenantId: room.tenantId,
        eventId: room.eventId,
        timestamp: Date.now(),
        payload: {
          voteSummary: liveSummary,
          totalVotes: room.votes.size,
          users: topUsers(room)
        }
      });
    } catch (err) {
      console.error("[Voting Engine] vote broadcast error:", err);
    }
  }, VOTE_BROADCAST_INTERVAL_MS);
}
function processVoteSubmission(room, voterId, payload, broadcast) {
  const currentQ = room.questions[room.currentQuestionIndex];
  if (!currentQ || room.session.status !== "VOTING_ACTIVE" || !Array.isArray(currentQ.options)) {
    return { status: "NOT_ACTIVE" };
  }
  if (room.votes.has(voterId)) return { status: "DUPLICATE" };
  const opt = typeof payload.optionId === "string" && currentQ.options.find((o) => o.id === payload.optionId) || typeof payload.optionCode === "number" && currentQ.options.find((o) => o.code === payload.optionCode) || null;
  if (!opt) return { status: "INVALID_OPTION" };
  const durationMs = (currentQ.durationSeconds || 30) * 1e3;
  const elapsed = room.session.startedAt ? Date.now() - room.session.startedAt : 2e3;
  const responseTimeMs = Math.min(durationMs, Math.max(250, elapsed));
  let user = room.users.get(voterId);
  if (!user) {
    user = {
      id: voterId,
      nickname: cleanNickname(payload.nickname) || `User #${voterId.slice(-4)}`,
      avatar: cleanAvatar(payload.avatar) || "\u{1F680}",
      avatarSeed: voterId,
      tenantId: room.tenantId,
      eventId: room.eventId,
      score: 0,
      totalScore: 0,
      accuracyRate: 100,
      streak: 0,
      currentStreak: 0,
      highestStreak: 0,
      multiplier: 1,
      totalInteractions: 0,
      activeSeconds: 120,
      prizeTier: "Bronze Contributor",
      unlockedPrizeIds: [],
      choiceHistory: []
    };
    room.users.set(voterId, user);
  } else {
    const nick = cleanNickname(payload.nickname);
    if (nick) user.nickname = nick;
  }
  const calc = calculatePoints(
    currentQ.answerType,
    opt.isCorrect ?? false,
    responseTimeMs,
    durationMs,
    currentQ.basePoints,
    currentQ.maxSpeedBonus,
    currentQ.participationWeight,
    user.currentStreak
  );
  user.totalScore += calc.totalPointsEarned;
  user.score = user.totalScore;
  user.currentStreak = calc.newStreak;
  user.streak = user.currentStreak;
  user.highestStreak = Math.max(user.highestStreak, user.currentStreak);
  user.totalInteractions += 1;
  user.multiplier = 1 + Math.min(3, user.currentStreak * 0.25);
  user.choiceHistory.push({
    questionId: currentQ.id,
    selectedOptionId: opt.id,
    isCorrect: calc.isCorrect,
    pointsEarned: calc.totalPointsEarned,
    responseTimeMs,
    timestamp: Date.now()
  });
  if (user.choiceHistory.length > LIMITS.MAX_QUESTIONS) user.choiceHistory.shift();
  room.votes.set(voterId, {
    optionId: opt.id,
    optionCode: opt.code || 1,
    responseTimeMs,
    isCorrect: calc.isCorrect,
    points: calc.totalPointsEarned
  });
  const liveSummary = computeVoteSummary(room, currentQ);
  scheduleVoteBroadcast(room, broadcast);
  return { status: "ACCEPTED", calc, user, summary: liveSummary };
}

// src/server/engine/visualizerBridge.ts
function triggerPresetOverride(room, presetId, source = "MANUAL_DIRECTOR", broadcast) {
  if (presetId && VISUALIZER_PRESETS[presetId]) {
    room.session.activePresetId = presetId;
    broadcast(room.tenantId, room.eventId, {
      type: "VISUALIZER_TRIGGER",
      tenantId: room.tenantId,
      eventId: room.eventId,
      timestamp: Date.now(),
      payload: {
        presetId,
        source
      }
    });
    broadcast(room.tenantId, room.eventId, {
      type: "PRESET_TRIGGER",
      tenantId: room.tenantId,
      eventId: room.eventId,
      timestamp: Date.now(),
      payload: {
        presetId,
        source
      }
    });
    return true;
  }
  return false;
}
function processAudienceReaction(room, reaction, broadcast) {
  const burst = {
    id: `rx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    emoji: cleanText(reaction.emoji, 8) || "\u{1F525}",
    userId: cleanText(reaction.userId, 64) || "anon",
    timestamp: Date.now(),
    color: cleanColor(reaction.color) || "#00ddff"
  };
  room.recentReactions.push(burst);
  if (room.recentReactions.length > 50) room.recentReactions.shift();
  broadcast(room.tenantId, room.eventId, {
    type: "AUDIENCE_REACTION",
    tenantId: room.tenantId,
    eventId: room.eventId,
    timestamp: Date.now(),
    payload: burst
  });
  broadcast(room.tenantId, room.eventId, {
    type: "REACTION_BURST",
    tenantId: room.tenantId,
    eventId: room.eventId,
    timestamp: Date.now(),
    payload: burst
  });
  return burst;
}

// firebase-applet-config.json
var firebase_applet_config_default = {
  projectId: "gen-lang-client-0564995587",
  appId: "1:820027070342:web:790508789793a2948a3e07",
  apiKey: "AIzaSyCe4suHK7La5ZFI_ex29yFO2_80fF_Oz9A",
  authDomain: "gen-lang-client-0564995587.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-sgxliveengine-630b78e7-0845-4046-9176-53bab53744ac",
  storageBucket: "gen-lang-client-0564995587.firebasestorage.app",
  messagingSenderId: "820027070342",
  measurementId: "G-REDR3QBK74",
  oAuthClientId: "820027070342-jdqa3bfnp43110cll3ro31t3qtqedfdr.apps.googleusercontent.com",
  recaptchaSiteKey: ""
};

// src/server/security/adminAuth.ts
var IS_PRODUCTION = process.env.NODE_ENV === "production";
var LOOKUP_URL = "https://identitytoolkit.googleapis.com/v1/accounts:lookup";
var MAX_TOKEN_LENGTH = 4096;
var NEGATIVE_CACHE_MS = 6e4;
var MAX_CACHE_ENTRIES = 1e3;
function adminAllowlist() {
  const raw = process.env.SGX_ADMIN_EMAILS || "info@spatialgineers.com,support@spatialgineers.com";
  return new Set(
    raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
  );
}
function decodeJwtPayload(token) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    return null;
  }
}
var cache = /* @__PURE__ */ new Map();
function cacheSet(token, identity, expiresAt) {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const now = Date.now();
    for (const [k, v] of cache) {
      if (v.expiresAt <= now) cache.delete(k);
    }
    while (cache.size >= MAX_CACHE_ENTRIES) {
      const oldest = cache.keys().next().value;
      if (oldest === void 0) break;
      cache.delete(oldest);
    }
  }
  cache.set(token, { identity, expiresAt });
}
async function identityToolkitVerifier(idToken) {
  const claims = decodeJwtPayload(idToken);
  if (!claims || typeof claims.exp !== "number") return null;
  const expMs = claims.exp * 1e3;
  if (expMs <= Date.now()) return null;
  if (firebase_applet_config_default.projectId && claims.aud !== firebase_applet_config_default.projectId) return null;
  const apiKey = process.env.FIREBASE_API_KEY || firebase_applet_config_default.apiKey;
  const res = await fetch(`${LOOKUP_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
    signal: AbortSignal.timeout(5e3)
  });
  if (!res.ok) throw new Error(`identitytoolkit ${res.status}`);
  const data = await res.json();
  const user = Array.isArray(data?.users) ? data.users[0] : null;
  if (!user || user.disabled) return null;
  const email = typeof user.email === "string" ? user.email.trim().toLowerCase() : "";
  if (!email || !adminAllowlist().has(email)) return null;
  const viaGoogle = Array.isArray(user.providerUserInfo) && user.providerUserInfo.some((p) => p?.providerId === "google.com");
  if (user.emailVerified !== true && !viaGoogle) return null;
  return { uid: String(user.localId || claims.sub || ""), email };
}
var verifierOverride = null;
async function verifyAdminToken(token) {
  if (typeof token !== "string" || token.length === 0 || token.length > MAX_TOKEN_LENGTH) return null;
  if (!IS_PRODUCTION) {
    const testToken = process.env.SGX_TEST_ADMIN_TOKEN;
    if (testToken && token === testToken) return { uid: "test_admin", email: "test-admin@localhost" };
  }
  const now = Date.now();
  const hit = cache.get(token);
  if (hit && hit.expiresAt > now) return hit.identity;
  try {
    const identity = await (verifierOverride || identityToolkitVerifier)(token);
    const claims = decodeJwtPayload(token);
    const tokenExp = claims && typeof claims.exp === "number" ? claims.exp * 1e3 : now + NEGATIVE_CACHE_MS;
    cacheSet(token, identity, identity ? tokenExp : Math.min(tokenExp, now + NEGATIVE_CACHE_MS));
    return identity;
  } catch (err) {
    console.warn("[SGX Auth] token verification failed:", err?.message || err);
    return null;
  }
}
function bearerToken(req) {
  const header = req.headers.authorization;
  if (typeof header !== "string") return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}
async function requireAdmin(req, res, next) {
  const token = bearerToken(req);
  if (!token) {
    res.status(401).json({ error: "AUTH_REQUIRED" });
    return;
  }
  const identity = await verifyAdminToken(token);
  if (!identity) {
    res.status(401).json({ error: "NOT_AUTHORIZED" });
    return;
  }
  res.locals.admin = identity;
  next();
}

// src/server/security/rateLimit.ts
var TokenBucket = class {
  constructor(capacity, refillPerSec) {
    this.capacity = capacity;
    this.refillPerSec = refillPerSec;
    this.tokens = capacity;
    this.last = Date.now();
  }
  take(cost = 1) {
    const now = Date.now();
    this.tokens = Math.min(this.capacity, this.tokens + (now - this.last) / 1e3 * this.refillPerSec);
    this.last = now;
    if (this.tokens < cost) return false;
    this.tokens -= cost;
    return true;
  }
  isFull() {
    const now = Date.now();
    return this.tokens + (now - this.last) / 1e3 * this.refillPerSec >= this.capacity;
  }
};
function ipRateLimit(opts) {
  const buckets = /* @__PURE__ */ new Map();
  const maxKeys = opts.maxKeys ?? 2e4;
  const sweep = setInterval(() => {
    for (const [k, b] of buckets) if (b.isFull()) buckets.delete(k);
  }, 6e4);
  sweep.unref?.();
  return (req, res, next) => {
    const key = req.ip || req.socket.remoteAddress || "unknown";
    let bucket = buckets.get(key);
    if (!bucket) {
      if (buckets.size >= maxKeys) buckets.clear();
      bucket = new TokenBucket(opts.capacity, opts.refillPerSec);
      buckets.set(key, bucket);
    }
    if (!bucket.take()) {
      res.setHeader("Retry-After", "5");
      res.status(429).json({ error: "RATE_LIMITED" });
      return;
    }
    next();
  };
}

// src/server/engine/wsHandler.ts
var DIRECTOR_MESSAGES = /* @__PURE__ */ new Set([
  "BROADCAST_QUESTION",
  "START_VOTING",
  "CLOSE_VOTING",
  "END_VOTING",
  "TRIGGER_PRESET",
  "STAGE_OVERRIDE",
  "SIMULATE_VOTES",
  "CREATE_QUESTION",
  "UPDATE_QUESTIONS"
]);
var MAX_SOCKETS_PER_IP = 600;
var MAX_PAYLOAD_BYTES = 12 * 1024 * 1024;
var MAX_AUDIENCE_PAYLOAD_BYTES = 64 * 1024;
function setupWebSocketEngine(server) {
  const wss = new WebSocketServer({ server, path: "/ws", maxPayload: MAX_PAYLOAD_BYTES });
  const clientMap = /* @__PURE__ */ new Map();
  const socketsPerIp = /* @__PURE__ */ new Map();
  function broadcastToRoom(tenantId, eventId, message) {
    const payloadStr = JSON.stringify(message);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        const meta = clientMap.get(client);
        if (meta && meta.tenantId === tenantId && meta.eventId === eventId) {
          client.send(payloadStr);
        }
      }
    });
  }
  const roomCount = (tenantId, eventId) => Array.from(clientMap.values()).filter((c) => c.tenantId === tenantId && c.eventId === eventId).length;
  function syncRoom(room) {
    const currentQ = room.questions[room.currentQuestionIndex];
    broadcastToRoom(room.tenantId, room.eventId, {
      type: "ROOM_STATE_SYNC",
      tenantId: room.tenantId,
      eventId: room.eventId,
      timestamp: Date.now(),
      payload: {
        session: room.session,
        currentQuestionIndex: room.currentQuestionIndex,
        currentQuestion: currentQ,
        questions: room.questions,
        voteSummary: computeVoteSummary(room, currentQ),
        connectedAudienceCount: roomCount(room.tenantId, room.eventId),
        users: Array.from(room.users.values()).slice(0, 200)
      }
    });
  }
  wss.on("connection", (ws, req) => {
    try {
      const xff = req.headers["x-forwarded-for"]?.split(",").map((s) => s.trim()).filter(Boolean) || [];
      const ip = xff[xff.length - 1] || req.socket.remoteAddress || "unknown";
      const open = socketsPerIp.get(ip) || 0;
      if (open >= MAX_SOCKETS_PER_IP) {
        ws.close(1013, "TOO_MANY_CONNECTIONS");
        return;
      }
      socketsPerIp.set(ip, open + 1);
      const url = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
      const lookup = resolveRoom(url.searchParams.get("tenantId"), url.searchParams.get("eventId"));
      if (lookup.ok === false) {
        ws.close(1008, lookup.error);
        socketsPerIp.set(ip, Math.max(0, (socketsPerIp.get(ip) || 1) - 1));
        return;
      }
      const room = lookup.room;
      const { tenantId, eventId } = room;
      const requestedRole = url.searchParams.get("role");
      const role = requestedRole === "admin" || requestedRole === "stage" ? requestedRole : "audience";
      const rawUserId = url.searchParams.get("userId");
      const userId = isValidId(rawUserId) ? rawUserId : `user_${Math.random().toString(36).substring(2, 11)}`;
      const nickname = cleanNickname(url.searchParams.get("nickname"));
      const meta = { tenantId, eventId, userId, role, isAdmin: false };
      clientMap.set(ws, meta);
      const limiter = new TokenBucket(30, 10);
      const authenticate = async (token) => {
        const identity = await verifyAdminToken(token);
        meta.isAdmin = !!identity;
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "AUTH_RESULT", tenantId, eventId, timestamp: Date.now(), payload: { isAdmin: meta.isAdmin } }));
        }
      };
      const urlToken = url.searchParams.get("token");
      if (urlToken) authenticate(urlToken).catch(() => {
      });
      const currentQ = room.questions[room.currentQuestionIndex];
      const initStatePayload = {
        session: room.session,
        currentQuestion: currentQ,
        currentQuestionIndex: room.currentQuestionIndex,
        questions: room.questions,
        voteSummary: currentQ ? computeVoteSummary(room, currentQ) : void 0,
        activePreset: VISUALIZER_PRESETS[room.session.activePresetId] || DEFAULT_PRESET,
        connectedAudienceCount: roomCount(tenantId, eventId),
        users: Array.from(room.users.values()).slice(0, 200)
      };
      ws.send(JSON.stringify({ type: "INIT_STATE", tenantId, eventId, timestamp: Date.now(), payload: initStatePayload }));
      ws.send(JSON.stringify({ type: "ROOM_STATE_SYNC", tenantId, eventId, timestamp: Date.now(), payload: initStatePayload }));
      broadcastToRoom(tenantId, eventId, {
        type: "STATE_SYNC",
        tenantId,
        eventId,
        timestamp: Date.now(),
        payload: { connectedAudienceCount: roomCount(tenantId, eventId) }
      });
      ws.on("message", (data, isBinary) => {
        try {
          if (!limiter.take()) return;
          const size = Array.isArray(data) ? data.reduce((n, b) => n + b.length, 0) : data.byteLength;
          if (!meta.isAdmin && size > MAX_AUDIENCE_PAYLOAD_BYTES) {
            ws.close(1009, "Message too big");
            return;
          }
          let messageType = "";
          let payload = {};
          if (isBinary) {
            const buffer = Buffer.from(data);
            const optionCode = buffer[0];
            const curQ = room.questions[room.currentQuestionIndex];
            if (curQ && Array.isArray(curQ.options)) {
              const matchedOpt = curQ.options.find((o) => o.code === optionCode) || curQ.options[optionCode - 1];
              if (matchedOpt) {
                messageType = "SUBMIT_VOTE";
                payload = { optionId: matchedOpt.id, nickname };
              }
            }
          } else {
            const parsed = JSON.parse(data.toString());
            if (!parsed || typeof parsed !== "object") return;
            messageType = typeof parsed.type === "string" ? parsed.type : "";
            payload = parsed.payload ?? {};
          }
          if (messageType === "AUTH") {
            authenticate(payload?.token).catch(() => {
            });
            return;
          }
          if (DIRECTOR_MESSAGES.has(messageType) && !meta.isAdmin) {
            ws.send(JSON.stringify({ type: "ERROR", tenantId, eventId, timestamp: Date.now(), payload: { error: "NOT_AUTHORIZED", for: messageType } }));
            return;
          }
          switch (messageType) {
            case "BROADCAST_QUESTION":
            case "START_VOTING": {
              const index = Number(payload?.index ?? payload?.questionIndex ?? 0);
              if (Number.isInteger(index) && index >= 0 && index < room.questions.length) {
                startQuestionVoting(room, index, broadcastToRoom);
              }
              break;
            }
            case "CLOSE_VOTING":
            case "END_VOTING": {
              const curQ = room.questions[room.currentQuestionIndex];
              if (curQ) endVotingAndReveal(room, curQ, broadcastToRoom);
              break;
            }
            case "TRIGGER_PRESET":
            case "STAGE_OVERRIDE": {
              const presetId = payload?.presetId;
              if (typeof presetId === "string" && VISUALIZER_PRESETS[presetId]) {
                triggerPresetOverride(room, presetId, "MANUAL_DIRECTOR", broadcastToRoom);
              }
              break;
            }
            case "SUBMIT_VOTE":
            case "VOTE_SUBMIT": {
              const result = processVoteSubmission(room, userId, { ...payload || {}, nickname: payload?.nickname || nickname }, broadcastToRoom);
              if (result.status === "ACCEPTED") {
                const ok = result;
                ws.send(JSON.stringify({
                  type: "SCORE_UPDATE",
                  tenantId,
                  eventId,
                  timestamp: Date.now(),
                  payload: { calculation: ok.calc, user: ok.user }
                }));
              }
              break;
            }
            case "SIMULATE_VOTES": {
              ws.send(JSON.stringify({ type: "ERROR", tenantId, eventId, timestamp: Date.now(), payload: { error: "NOT_AVAILABLE", for: messageType } }));
              break;
            }
            case "CREATE_QUESTION": {
              const list = Array.isArray(payload) ? payload : [payload];
              const room_left = LIMITS.MAX_QUESTIONS - room.questions.length;
              const v = validateQuestionList(list, Math.max(0, room_left), `q_${Date.now()}`);
              if (v.ok === false) {
                ws.send(JSON.stringify({ type: "ERROR", tenantId, eventId, timestamp: Date.now(), payload: { error: v.error } }));
                break;
              }
              const base = room.questions.length;
              room.questions.push(...v.value.map((q, idx) => ({ ...q, tenantId, eventId, order: base + idx + 1 })));
              syncRoom(room);
              break;
            }
            case "UPDATE_QUESTIONS": {
              const v = validateQuestionList(payload, LIMITS.MAX_QUESTIONS, `q_${Date.now()}`);
              if (v.ok === false) {
                ws.send(JSON.stringify({ type: "ERROR", tenantId, eventId, timestamp: Date.now(), payload: { error: v.error } }));
                break;
              }
              room.questions = v.value.map((q, idx) => ({ ...q, tenantId, eventId, order: idx + 1 }));
              if (room.currentQuestionIndex >= room.questions.length) room.currentQuestionIndex = 0;
              syncRoom(room);
              break;
            }
            case "SEND_REACTION":
            case "REACTION_BURST": {
              processAudienceReaction(room, { emoji: payload?.emoji, color: payload?.color, userId }, broadcastToRoom);
              break;
            }
          }
        } catch (err) {
          console.error("[WebSocket Engine Error]:", err);
        }
      });
      ws.on("close", () => {
        clientMap.delete(ws);
        socketsPerIp.set(ip, Math.max(0, (socketsPerIp.get(ip) || 1) - 1));
        if ((socketsPerIp.get(ip) || 0) === 0) socketsPerIp.delete(ip);
        try {
          broadcastToRoom(tenantId, eventId, {
            type: "STATE_SYNC",
            tenantId,
            eventId,
            timestamp: Date.now(),
            payload: { connectedAudienceCount: roomCount(tenantId, eventId) }
          });
        } catch (err) {
          console.error("[WebSocket Engine Error]:", err);
        }
      });
      ws.on("error", (err) => console.warn("[WebSocket Engine] socket error:", err?.message || err));
    } catch (err) {
      console.error("[WebSocket Engine] connection error:", err);
      try {
        ws.close(1011, "SERVER_ERROR");
      } catch {
      }
    }
  });
  return { wss, clientMap, broadcastToRoom };
}

// src/server/routes/apiRouter.ts
import { Router } from "express";
function createApiRouter(broadcastToRoom) {
  const router = Router();
  router.use(ipRateLimit({ capacity: 120, refillPerSec: 40 }));
  const roomFrom = (req, res) => {
    const src = req.method === "GET" ? req.query : req.body || {};
    const r = resolveRoom(src.tenantId, src.eventId);
    if (r.ok === false) {
      const bad = r;
      res.status(bad.status).json({ error: bad.error });
      return null;
    }
    return r.room;
  };
  router.get("/health", (req, res) => {
    res.json({ status: "ok", engine: "SGX Live Engine", timestamp: Date.now() });
  });
  router.get("/engine/status", (req, res) => {
    res.json({
      status: "ONLINE",
      mode: "INTERACTIVE_BROADCAST",
      version: "2026.12.0",
      activeFeatures: ["CYOA_VOTING", "WEBGL_SHADERS", "IMAGE_COMPRESSION_CLIENT", "MULTI_SPEAKER_CMS", "FIRESTORE_SYNC"]
    });
  });
  router.get("/tenants", (req, res) => {
    res.json({ tenants: INITIAL_TENANTS });
  });
  router.get("/state", (req, res) => {
    const room = roomFrom(req, res);
    if (!room) return;
    const currentQ = room.questions[room.currentQuestionIndex];
    const summary = currentQ ? computeVoteSummary(room, currentQ) : null;
    res.json({
      session: room.session,
      currentQuestion: currentQ,
      currentQuestionIndex: room.currentQuestionIndex,
      totalQuestions: room.questions.length,
      voteSummary: summary,
      connectedAudienceCount: room.users.size + 1,
      activePreset: VISUALIZER_PRESETS[room.session.activePresetId] || DEFAULT_PRESET,
      users: Array.from(room.users.values()).slice(0, 200)
    });
  });
  router.get("/questions", (req, res) => {
    const room = roomFrom(req, res);
    if (!room) return;
    res.json({ questions: room.questions });
  });
  router.post("/questions", requireAdmin, (req, res) => {
    const room = roomFrom(req, res);
    if (!room) return;
    const v = validateQuestionList([req.body], Math.max(0, LIMITS.MAX_QUESTIONS - room.questions.length), `q_${Date.now()}`);
    if (v.ok === false) return res.status(400).json({ error: v.error });
    const newQ = { ...v.value[0], tenantId: room.tenantId, eventId: room.eventId, order: room.questions.length + 1 };
    room.questions.push(newQ);
    res.json({ success: true, question: newQ });
  });
  router.post("/action/broadcast-question", requireAdmin, (req, res) => {
    const questionIndex = req.body.questionIndex ?? req.body.index ?? 0;
    const room = roomFrom(req, res);
    if (!room) return;
    const question = Number.isInteger(Number(questionIndex)) ? startQuestionVoting(room, Number(questionIndex), broadcastToRoom) : null;
    if (!question) {
      return res.status(400).json({ error: "Question not found" });
    }
    res.json({ success: true, session: room.session, question });
  });
  router.post("/vote", (req, res) => {
    const room = roomFrom(req, res);
    if (!room) return;
    const voterId = req.body?.userId;
    if (!isValidId(voterId)) return res.status(400).json({ error: "INVALID_USER_ID" });
    const result = processVoteSubmission(room, voterId, req.body || {}, broadcastToRoom);
    if (result.status !== "ACCEPTED") {
      return res.status(result.status === "DUPLICATE" ? 409 : 400).json({ error: result.status });
    }
    const ok = result;
    res.json({ success: true, calculation: ok.calc, summary: ok.summary, user: ok.user });
  });
  router.post("/reaction", (req, res) => {
    const room = roomFrom(req, res);
    if (!room) return;
    const reaction = processAudienceReaction(room, { emoji: req.body?.emoji, color: req.body?.color, userId: isValidId(req.body?.userId) ? req.body.userId : "anon" }, broadcastToRoom);
    res.json({ success: true, reaction });
  });
  router.post("/action/close-voting", requireAdmin, (req, res) => {
    const room = roomFrom(req, res);
    if (!room) return;
    const question = room.questions[room.currentQuestionIndex];
    if (question) {
      endVotingAndReveal(room, question, broadcastToRoom);
    }
    res.json({ success: true, session: room.session });
  });
  router.post("/action/trigger-preset", requireAdmin, (req, res) => {
    const { presetId } = req.body || {};
    const room = roomFrom(req, res);
    if (!room) return;
    const success = typeof presetId === "string" && !!VISUALIZER_PRESETS[presetId] && triggerPresetOverride(room, presetId, "MANUAL_DIRECTOR", broadcastToRoom);
    if (success) {
      res.json({ success: true, activePresetId: presetId });
    } else {
      res.status(400).json({ error: "Invalid preset ID" });
    }
  });
  router.get("/analytics", requireAdmin, (req, res) => {
    const room = roomFrom(req, res);
    if (!room) return;
    const userList = Array.from(room.users.values()).sort((a, b) => b.totalScore - a.totalScore);
    const topLeaderboard = userList.slice(0, 20);
    const totalInteractions = userList.reduce((acc, u) => acc + u.totalInteractions, 0);
    const avgScore = userList.length > 0 ? Math.round(userList.reduce((acc, u) => acc + u.totalScore, 0) / userList.length) : 0;
    res.json({
      totalUsers: userList.length,
      totalInteractions,
      avgScore,
      leaderboard: topLeaderboard,
      questions: room.questions.map((q) => ({
        id: q.id,
        prompt: q.prompt,
        category: q.category,
        answerType: q.answerType,
        options: q.options.map((o) => ({
          id: o.id,
          label: o.label,
          presetId: o.presetId
        }))
      }))
    });
  });
  return router;
}

// server.ts
var PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
async function startServer() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(express.json({ limit: "100kb" }));
  app.use(express.urlencoded({ extended: true, limit: "100kb" }));
  const server = http.createServer(app);
  const { broadcastToRoom } = setupWebSocketEngine(server);
  app.use("/api", createApiRouter(broadcastToRoom));
  app.get("/healthz", (req, res) => {
    res.status(200).send("OK");
  });
  const distPath = path.join(process.cwd(), "dist");
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction) {
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === "true" ? false : void 0
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
  }
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[SGX Live Engine] Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("[SGX Live Engine] Fatal server boot error:", err);
  process.exit(1);
});
