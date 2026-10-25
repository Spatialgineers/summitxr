// server.ts
import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

// src/server/engine/wsHandler.ts
import { WebSocketServer, WebSocket } from "ws";

// src/lib/assetCache.ts
import * as THREE from "three";
var BUILTIN_BG_SAMPLES = [
  { id: "grid_floor", name: "\u{1F310} Cyber Grid Matrix", url: `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#0a0c10"/><path d="M0 50 L100 50 M50 0 L50 100" stroke="#00ffff" stroke-width="0.5" opacity="0.4"/></svg>')}` },
  { id: "hex_mesh", name: "\u2B22 Neon Hex Cell", url: `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"><polygon points="30,5 55,20 55,50 30,65 5,50 5,20" fill="none" stroke="#ff0055" stroke-width="1" opacity="0.4"/></svg>')}` },
  { id: "nebula_space", name: "\u2728 Deep Cosmic Starfield", url: `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#050510"/><circle cx="30" cy="40" r="1.5" fill="#ffffff" opacity="0.8"/><circle cx="150" cy="80" r="2" fill="#00ffff" opacity="0.9"/><circle cx="90" cy="160" r="1" fill="#fdcc0d" opacity="0.7"/></svg>')}` }
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
        <polygon points="36,2 14,34 30,34 26,62 50,28 34,28" fill="#00ffff" stroke="#ffffff" stroke-width="1.5"/>
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
    accentColor: "#00FFFF",
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
    accentColor: "#64748B",
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
    accentColor: "#00FFFF",
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
    themeColor: "#00f0ff",
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
    accentColor: "#00ffff",
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
    vibe: "Amarillo & Gris (Narrativa & Lore)",
    description: "Preset enfocado en desarrollo conceptual, worldbuilding y est\xE9tica amarillo/gris.",
    erraticRating: 1,
    presetId: "preset_story_float",
    branding: {
      primaryColor: "#FDCC0D",
      secondaryColor: "#64748B",
      accentColor: "#CBD5E1",
      backgroundColor: "#0B0F17",
      cardBgColor: "#151D2A",
      borderColor: "#475569",
      neonHighlightColor: "#FFE066",
      glowShadow: "rgba(253, 204, 13, 0.35)",
      gradientCss: "linear-gradient(135deg, #FDCC0D 0%, #64748B 100%)"
    }
  },
  {
    id: "tenant_sgx_showcase",
    name: "SGX.SHOWCASE \u2014 Brand & Exhibition",
    slug: "showcase",
    pillarId: "SGX.SHOWCASE",
    vibe: "Anaranjado & Blanco (Showroom de Marcas)",
    description: "Preset de alta claridad pensado para exhibici\xF3n de patrocinadores y marcas tecnocreativas.",
    erraticRating: 2,
    presetId: "preset_aurora_crystal",
    branding: {
      primaryColor: "#FF6B00",
      secondaryColor: "#FFFFFF",
      accentColor: "#FF9944",
      backgroundColor: "#140904",
      cardBgColor: "#1F1008",
      borderColor: "#FF6B00",
      neonHighlightColor: "#FF8533",
      glowShadow: "rgba(255, 107, 0, 0.45)",
      gradientCss: "linear-gradient(135deg, #FF6B00 0%, #FFFFFF 100%)"
    }
  },
  {
    id: "tenant_sgx_spark",
    name: "SGX.SPARK \u2014 Gamification & Logic",
    slug: "spark",
    pillarId: "SGX.SPARK",
    vibe: "Cyan & Amarillo (Alto Voltaje L\xF3gico)",
    description: "Preset para mec\xE1nicas de gamificaci\xF3n, votaci\xF3n cyoa y simulaciones interactivas.",
    erraticRating: 3,
    presetId: "preset_plasma_bloom",
    branding: {
      primaryColor: "#00FFFF",
      secondaryColor: "#FDCC0D",
      accentColor: "#33FFFF",
      backgroundColor: "#041219",
      cardBgColor: "#09222E",
      borderColor: "#00FFFF",
      neonHighlightColor: "#00FFFF",
      glowShadow: "rgba(0, 255, 255, 0.5)",
      gradientCss: "linear-gradient(135deg, #00FFFF 0%, #FDCC0D 100%)"
    }
  },
  {
    id: "tenant_sgx_stage",
    name: "SGX.STAGE \u2014 Virtual Production Arena",
    slug: "stage",
    pillarId: "SGX.STAGE",
    vibe: "Blanco & Amarillo (Luces de Escenario & Spotlights)",
    description: "Preset de escenario en vivo con strobes de alta intensidad y bloom \xE1mbar.",
    erraticRating: 4,
    presetId: "preset_volcano_fire",
    branding: {
      primaryColor: "#FFFFFF",
      secondaryColor: "#FDCC0D",
      accentColor: "#F8FAFC",
      backgroundColor: "#14120B",
      cardBgColor: "#242013",
      borderColor: "#E2E8F0",
      neonHighlightColor: "#FFF5C0",
      glowShadow: "rgba(255, 255, 255, 0.6)",
      gradientCss: "linear-gradient(135deg, #FFFFFF 0%, #FDCC0D 100%)"
    }
  },
  {
    id: "tenant_sgx_system",
    name: "SGX.SYSTEM \u2014 Core Matrix Infrastructure",
    slug: "system",
    pillarId: "SGX.SYSTEM",
    vibe: "Azul Met\xE1lico & Gris (#32527B & #333333)",
    description: "Preset t\xE9cnico de bajo nivel con arquitectura en azul met\xE1lico y tonos gris industrial.",
    erraticRating: 5,
    presetId: "preset_glitch_cyber",
    branding: {
      primaryColor: "#32527B",
      secondaryColor: "#333333",
      accentColor: "#888888",
      backgroundColor: "#1A1A1A",
      cardBgColor: "#121927",
      borderColor: "#32527B",
      neonHighlightColor: "#32527B",
      glowShadow: "rgba(50, 82, 123, 0.75)",
      gradientCss: "linear-gradient(135deg, #32527B 0%, #333333 100%)"
    }
  },
  {
    id: "tenant_sgx_synthesize",
    name: "SGX.SYNTHESIZE \u2014 Full Spectrum Hyper-Overdrive",
    slug: "synthesize",
    pillarId: "SGX.SYNTHESIZE",
    vibe: "Todos los Colores SGX (Amarillo, Anaranjado, Cyan & Azul Met\xE1lico)",
    description: "Preset sin\xE9rgico total que armoniza todos los pilares con reactividad 3D espectral de alto voltaje.",
    erraticRating: 6,
    presetId: "preset_synthesize_chaos",
    branding: {
      primaryColor: "#FDCC0D",
      secondaryColor: "#00FFFF",
      accentColor: "#B87333",
      backgroundColor: "#1A1A1A",
      cardBgColor: "#121927",
      borderColor: "#00FFFF",
      neonHighlightColor: "#FFAA00",
      glowShadow: "rgba(0, 255, 255, 0.75)",
      gradientCss: "linear-gradient(135deg, #FDCC0D 0%, #FFAA00 25%, #B87333 50%, #00FFFF 75%, #32527B 100%)"
    }
  }
];
var SAMPLE_QUESTIONS = [
  {
    id: "q_001",
    tenantId: "tenant_spatialgineers",
    eventId: "event_live_main",
    order: 1,
    prompt: "Which dimensional timeline should our live stage warp towards next?",
    subtitle: "Audience CYOA choice determines the live visual world & stage lighting in real-time!",
    category: "CYOA Dimension Shift",
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
        label: "A: Synthwave Neon Grid",
        description: "Retro 80s perspective wireframe mountains and glowing cyber sun",
        presetId: "preset_neon_grid",
        color: "#00f0ff",
        effectType: "cyber_grid_pulse",
        effectName: "Onda Ne\xF3n Rejilla Synthwave",
        effectMultiplier: 1.5,
        effectTargetParam: "Malla 3D & Pulsaci\xF3n Sol Cyber"
      },
      {
        id: "opt_b",
        index: 1,
        code: 2,
        label: "B: Inferno Magma Volcano",
        description: "Turbulent volcanic lava vortex with burning thermal ember eruptive bursts",
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
        label: "C: Quantum Particle Storm",
        description: "Cosmic 8,000-particle gravitational attractor vortex",
        presetId: "preset_particle_storm",
        color: "#a855f7",
        effectType: "quantum_vortex",
        effectName: "V\xF3rtice Cu\xE1ntico Orbital",
        effectMultiplier: 1.4,
        effectTargetParam: "Giro Orbital & Gravitaci\xF3n"
      },
      {
        id: "opt_d",
        index: 3,
        code: 4,
        label: "D: Neural Matrix Rain",
        description: "Digital data streams with rotating 3D holographic quantum core",
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
    prompt: "TRIVIA CHALLENGE: What rendering pipeline power WebGL shaders directly in the browser?",
    subtitle: "Speed + Correctness unlocks highest streak multipliers and VIP points!",
    category: "Spatial Knowledge",
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
        label: "A: OpenGL ES & GLSL GPU Shaders",
        description: "Direct GPU programmable vertex & fragment pipelines",
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
        label: "B: Static HTML Canvas 2D Bitmap",
        description: "Pure CPU rasterization on main thread",
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
        label: "C: Server-Side Video JPEG Stream",
        description: "Remote cloud streaming buffer",
        presetId: "preset_neon_grid",
        isCorrect: false,
        color: "#00f0ff",
        effectType: "cyber_grid_pulse",
        effectName: "Malla Ne\xF3n Distorsionada",
        effectMultiplier: 1,
        effectTargetParam: "Velocidad Plano Rejilla"
      },
      {
        id: "opt_d",
        index: 3,
        code: 4,
        label: "D: CSS Transitions Only",
        description: "DOM style transform engine",
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
    prompt: "CYOA CLIMAX: Choose the ultimate climax stage effect for the grand finale!",
    subtitle: "Your vote triggers real-time 3D particle physics on the main OBS broadcast canvas.",
    category: "Finale Climax",
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
        label: "A: Prismatic Aurora Realm",
        description: "Refractive quartz crystals with iridescent atmosphere wave curtains",
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
        label: "B: Lightspeed Hyperspace Warp",
        description: "Relativistic starfield acceleration warp speed",
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
        label: "C: Cosmic Quantum Storm",
        description: "High-energy galactic vortex with dual gravity wells",
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
        label: "D: Inferno Lava Eruption",
        description: "Volcanic magma eruption with fiery thermal glow",
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

// src/server/engine/votingEngine.ts
function computeVoteSummary(room, question) {
  const totalVotes = room.votes.size;
  const optionCounts = {};
  const optionPercentages = {};
  question.options.forEach((opt) => {
    optionCounts[opt.id] = 0;
    optionPercentages[opt.id] = 0;
  });
  room.votes.forEach((vote) => {
    if (optionCounts[vote.optionId] !== void 0) {
      optionCounts[vote.optionId]++;
    }
  });
  let highestCount = -1;
  let winningOptionId = question.options[0]?.id || "";
  let winningPresetId = question.options[0]?.presetId || DEFAULT_PRESET.id;
  question.options.forEach((opt) => {
    const count = optionCounts[opt.id] || 0;
    optionPercentages[opt.id] = totalVotes > 0 ? Math.round(count / totalVotes * 100) : 0;
    if (count > highestCount) {
      highestCount = count;
      winningOptionId = opt.id;
      winningPresetId = opt.presetId;
    }
  });
  const correctOption = question.options.find((o) => o.isCorrect);
  return {
    questionId: question.id,
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
  }, 1e3);
  return question;
}
function processVoteSubmission(room, payload, broadcast) {
  const currentQ = room.questions[room.currentQuestionIndex];
  if (!currentQ || room.session.status !== "VOTING_ACTIVE") return null;
  const voterId = payload.userId;
  const optionId = payload.optionId || currentQ.options.find((o) => o.code === payload.optionCode)?.id || currentQ.options[0].id;
  const opt = currentQ.options.find((o) => o.id === optionId) || currentQ.options[0];
  const isCorrect = currentQ.answerType === "OPINION_CYOA" ? true : opt?.isCorrect ?? false;
  const responseTimeMs = payload.responseTimeMs || 2e3;
  let user = room.users.get(voterId);
  if (!user) {
    user = {
      id: voterId,
      nickname: payload.nickname || `User #${voterId.slice(-4)}`,
      avatar: payload.avatar || "\u{1F680}",
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
  }
  const calc = calculatePoints(
    currentQ.answerType,
    opt?.isCorrect ?? false,
    responseTimeMs,
    (currentQ.durationSeconds || 30) * 1e3,
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
  room.votes.set(voterId, {
    optionId: opt.id,
    optionCode: opt.code || payload.optionCode || 1,
    responseTimeMs,
    isCorrect: calc.isCorrect,
    points: calc.totalPointsEarned
  });
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
      users: Array.from(room.users.values())
    }
  });
  return { calc, user, summary: liveSummary };
}
function simulateAudienceVotes(room, count, broadcast) {
  const currentQ = room.questions[room.currentQuestionIndex];
  if (!currentQ) return null;
  const firstNames = ["Kai", "Nova", "Zephyr", "Echo", "Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Avery", "Sam", "Cameron", "Dakota", "Skylar", "Quinn", "Harper", "Rowan"];
  for (let i = 0; i < count; i++) {
    const mockUserId = `sim_user_${Math.random().toString(36).substring(2, 9)}`;
    const randomOpt = currentQ.options[Math.floor(Math.random() * currentQ.options.length)];
    const responseTimeMs = Math.floor(Math.random() * ((currentQ.durationSeconds || 30) * 1e3 * 0.75)) + 600;
    const nickname = `${firstNames[Math.floor(Math.random() * firstNames.length)]}_${Math.floor(Math.random() * 899 + 100)}`;
    const calc = calculatePoints(
      currentQ.answerType,
      randomOpt.isCorrect ?? false,
      responseTimeMs,
      (currentQ.durationSeconds || 30) * 1e3,
      currentQ.basePoints,
      currentQ.maxSpeedBonus,
      currentQ.participationWeight,
      Math.floor(Math.random() * 3)
    );
    const userProfile = {
      id: mockUserId,
      nickname,
      avatar: ["\u{1F680}", "\u26A1", "\u{1F525}", "\u{1F48E}", "\u{1F3AE}", "\u{1F31F}"][Math.floor(Math.random() * 6)],
      avatarSeed: mockUserId,
      tenantId: room.tenantId,
      eventId: room.eventId,
      score: calc.totalPointsEarned * Math.floor(Math.random() * 3 + 1),
      totalScore: calc.totalPointsEarned * Math.floor(Math.random() * 3 + 1),
      accuracyRate: Math.floor(Math.random() * 25 + 75),
      multiplier: 1 + Math.random() * 1.5,
      streak: calc.newStreak,
      currentStreak: calc.newStreak,
      highestStreak: Math.max(calc.newStreak, Math.floor(Math.random() * 4)),
      totalInteractions: Math.floor(Math.random() * 5 + 1),
      activeSeconds: Math.floor(Math.random() * 300 + 60),
      prizeTier: "Silver Specialist",
      unlockedPrizeIds: [],
      choiceHistory: [{
        questionId: currentQ.id,
        selectedOptionId: randomOpt.id,
        isCorrect: calc.isCorrect,
        pointsEarned: calc.totalPointsEarned,
        responseTimeMs,
        timestamp: Date.now()
      }]
    };
    room.users.set(mockUserId, userProfile);
    room.votes.set(mockUserId, {
      optionId: randomOpt.id,
      optionCode: randomOpt.code,
      responseTimeMs,
      isCorrect: calc.isCorrect,
      points: calc.totalPointsEarned
    });
  }
  const updatedSummary = computeVoteSummary(room, currentQ);
  broadcast(room.tenantId, room.eventId, {
    type: "VOTE_UPDATE",
    tenantId: room.tenantId,
    eventId: room.eventId,
    timestamp: Date.now(),
    payload: updatedSummary
  });
  broadcast(room.tenantId, room.eventId, {
    type: "STATE_SYNC",
    tenantId: room.tenantId,
    eventId: room.eventId,
    timestamp: Date.now(),
    payload: {
      voteSummary: updatedSummary,
      totalVotes: room.votes.size,
      connectedAudienceCount: room.users.size + 1,
      users: Array.from(room.users.values())
    }
  });
  return updatedSummary;
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
    emoji: reaction.emoji || "\u{1F525}",
    userId: reaction.userId || "anon",
    timestamp: Date.now(),
    color: reaction.color || "#00ffff"
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

// src/server/engine/wsHandler.ts
function setupWebSocketEngine(server) {
  const wss = new WebSocketServer({ server, path: "/ws" });
  const clientMap = /* @__PURE__ */ new Map();
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
  wss.on("connection", (ws, req) => {
    const url = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
    const tenantId = url.searchParams.get("tenantId") || "tenant_spatialgineers";
    const eventId = url.searchParams.get("eventId") || "event_live_main";
    const role = url.searchParams.get("role") || "audience";
    const userId = url.searchParams.get("userId") || `user_${Math.random().toString(36).substring(2, 9)}`;
    const room = getOrCreateRoom(tenantId, eventId);
    clientMap.set(ws, { tenantId, eventId, userId, role });
    const currentQ = room.questions[room.currentQuestionIndex];
    const initialSummary = currentQ ? computeVoteSummary(room, currentQ) : void 0;
    const count = Array.from(clientMap.values()).filter((c) => c.tenantId === tenantId && c.eventId === eventId).length;
    const initStatePayload = {
      session: room.session,
      currentQuestion: currentQ,
      currentQuestionIndex: room.currentQuestionIndex,
      questions: room.questions,
      voteSummary: initialSummary,
      activePreset: VISUALIZER_PRESETS[room.session.activePresetId] || DEFAULT_PRESET,
      connectedAudienceCount: count,
      users: Array.from(room.users.values())
    };
    ws.send(JSON.stringify({
      type: "INIT_STATE",
      tenantId,
      eventId,
      timestamp: Date.now(),
      payload: initStatePayload
    }));
    ws.send(JSON.stringify({
      type: "ROOM_STATE_SYNC",
      tenantId,
      eventId,
      timestamp: Date.now(),
      payload: initStatePayload
    }));
    broadcastToRoom(tenantId, eventId, {
      type: "STATE_SYNC",
      tenantId,
      eventId,
      timestamp: Date.now(),
      payload: {
        connectedAudienceCount: count
      }
    });
    ws.on("message", (data, isBinary) => {
      try {
        const currentRoom = getOrCreateRoom(tenantId, eventId);
        let messageType = "";
        let payload = {};
        if (isBinary) {
          const buffer = Buffer.from(data);
          const optionCode = buffer[0];
          const curQ = currentRoom.questions[currentRoom.currentQuestionIndex];
          if (curQ) {
            const matchedOpt = curQ.options.find((o) => o.code === optionCode) || curQ.options[optionCode - 1];
            if (matchedOpt) {
              messageType = "SUBMIT_VOTE";
              payload = {
                userId,
                nickname: "Mobile Attendee",
                questionId: curQ.id,
                optionId: matchedOpt.id,
                optionCode: matchedOpt.code,
                responseTimeMs: 1800
              };
            }
          }
        } else {
          const parsed = JSON.parse(data.toString());
          messageType = parsed.type;
          payload = parsed.payload || {};
        }
        switch (messageType) {
          case "BROADCAST_QUESTION":
          case "START_VOTING": {
            const index = payload.index ?? payload.questionIndex ?? 0;
            startQuestionVoting(currentRoom, index, broadcastToRoom);
            break;
          }
          case "CLOSE_VOTING":
          case "END_VOTING": {
            const curQ = currentRoom.questions[currentRoom.currentQuestionIndex];
            if (curQ) {
              endVotingAndReveal(currentRoom, curQ, broadcastToRoom);
            }
            break;
          }
          case "TRIGGER_PRESET":
          case "STAGE_OVERRIDE": {
            const presetId = payload.presetId;
            if (presetId) {
              triggerPresetOverride(currentRoom, presetId, "MANUAL_DIRECTOR", broadcastToRoom);
            }
            break;
          }
          case "SUBMIT_VOTE":
          case "VOTE_SUBMIT": {
            const result = processVoteSubmission(
              currentRoom,
              { ...payload, userId: payload.userId || userId },
              broadcastToRoom
            );
            if (result) {
              ws.send(JSON.stringify({
                type: "SCORE_UPDATE",
                tenantId,
                eventId,
                timestamp: Date.now(),
                payload: {
                  calculation: result.calc,
                  user: result.user
                }
              }));
            }
            break;
          }
          case "SIMULATE_VOTES": {
            const simCount = payload.count || 25;
            simulateAudienceVotes(currentRoom, simCount, broadcastToRoom);
            break;
          }
          case "CREATE_QUESTION": {
            if (Array.isArray(payload)) {
              const newQuestions = payload.map((q, idx) => ({
                ...q,
                id: q.id || `q_${Date.now()}_${idx}`,
                tenantId,
                eventId,
                order: currentRoom.questions.length + idx + 1
              }));
              currentRoom.questions.push(...newQuestions);
            } else {
              const newQ = {
                ...payload,
                id: payload.id || `q_${Date.now()}`,
                tenantId,
                eventId,
                order: currentRoom.questions.length + 1
              };
              currentRoom.questions.push(newQ);
            }
            broadcastToRoom(tenantId, eventId, {
              type: "ROOM_STATE_SYNC",
              tenantId,
              eventId,
              timestamp: Date.now(),
              payload: {
                session: currentRoom.session,
                currentQuestionIndex: currentRoom.currentQuestionIndex,
                currentQuestion: currentRoom.questions[currentRoom.currentQuestionIndex],
                questions: currentRoom.questions,
                voteSummary: computeVoteSummary(currentRoom, currentRoom.questions[currentRoom.currentQuestionIndex]),
                connectedAudienceCount: Array.from(clientMap.values()).filter((c) => c.tenantId === tenantId && c.eventId === eventId).length,
                users: Array.from(currentRoom.users.values())
              }
            });
            break;
          }
          case "UPDATE_QUESTIONS": {
            if (Array.isArray(payload)) {
              currentRoom.questions = payload.map((q, idx) => ({
                ...q,
                id: q.id || `q_${Date.now()}_${idx}`,
                tenantId,
                eventId,
                order: idx + 1
              }));
            }
            broadcastToRoom(tenantId, eventId, {
              type: "ROOM_STATE_SYNC",
              tenantId,
              eventId,
              timestamp: Date.now(),
              payload: {
                session: currentRoom.session,
                currentQuestionIndex: currentRoom.currentQuestionIndex,
                currentQuestion: currentRoom.questions[currentRoom.currentQuestionIndex],
                questions: currentRoom.questions,
                voteSummary: computeVoteSummary(currentRoom, currentRoom.questions[currentRoom.currentQuestionIndex]),
                connectedAudienceCount: Array.from(clientMap.values()).filter((c) => c.tenantId === tenantId && c.eventId === eventId).length,
                users: Array.from(currentRoom.users.values())
              }
            });
            break;
          }
          case "SEND_REACTION":
          case "REACTION_BURST": {
            processAudienceReaction(currentRoom, { ...payload, userId }, broadcastToRoom);
            break;
          }
        }
      } catch (err) {
        console.error("[WebSocket Engine Error]:", err);
      }
    });
    ws.on("close", () => {
      clientMap.delete(ws);
      broadcastToRoom(tenantId, eventId, {
        type: "STATE_SYNC",
        tenantId,
        eventId,
        timestamp: Date.now(),
        payload: {
          connectedAudienceCount: Array.from(clientMap.values()).filter((c) => c.tenantId === tenantId && c.eventId === eventId).length
        }
      });
    });
  });
  return { wss, clientMap, broadcastToRoom };
}

// src/server/routes/apiRouter.ts
import { Router } from "express";
function createApiRouter(broadcastToRoom) {
  const router = Router();
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
    const tenantId = req.query.tenantId || "tenant_spatialgineers";
    const eventId = req.query.eventId || "event_live_main";
    const room = getOrCreateRoom(tenantId, eventId);
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
      users: Array.from(room.users.values())
    });
  });
  router.get("/questions", (req, res) => {
    const tenantId = req.query.tenantId || "tenant_spatialgineers";
    const eventId = req.query.eventId || "event_live_main";
    const room = getOrCreateRoom(tenantId, eventId);
    res.json({ questions: room.questions });
  });
  router.post("/questions", (req, res) => {
    const tenantId = req.body.tenantId || "tenant_spatialgineers";
    const eventId = req.body.eventId || "event_live_main";
    const room = getOrCreateRoom(tenantId, eventId);
    const newQ = {
      ...req.body,
      id: `q_${Date.now()}`,
      tenantId,
      eventId,
      order: room.questions.length + 1
    };
    room.questions.push(newQ);
    res.json({ success: true, question: newQ });
  });
  router.post("/action/broadcast-question", (req, res) => {
    const tenantId = req.body.tenantId || "tenant_spatialgineers";
    const eventId = req.body.eventId || "event_live_main";
    const questionIndex = req.body.questionIndex ?? req.body.index ?? 0;
    const room = getOrCreateRoom(tenantId, eventId);
    const question = startQuestionVoting(room, questionIndex, broadcastToRoom);
    if (!question) {
      return res.status(400).json({ error: "Question not found" });
    }
    res.json({ success: true, session: room.session, question });
  });
  router.post("/vote", (req, res) => {
    const { tenantId = "tenant_spatialgineers", eventId = "event_live_main" } = req.body;
    const room = getOrCreateRoom(tenantId, eventId);
    const result = processVoteSubmission(room, req.body, broadcastToRoom);
    if (!result) {
      return res.status(400).json({ error: "Voting is not active" });
    }
    res.json({ success: true, calculation: result.calc, summary: result.summary, user: result.user });
  });
  router.post("/reaction", (req, res) => {
    const { tenantId = "tenant_spatialgineers", eventId = "event_live_main" } = req.body;
    const room = getOrCreateRoom(tenantId, eventId);
    const reaction = processAudienceReaction(room, req.body, broadcastToRoom);
    res.json({ success: true, reaction });
  });
  router.post("/action/close-voting", (req, res) => {
    const tenantId = req.body.tenantId || "tenant_spatialgineers";
    const eventId = req.body.eventId || "event_live_main";
    const room = getOrCreateRoom(tenantId, eventId);
    const question = room.questions[room.currentQuestionIndex];
    if (question) {
      endVotingAndReveal(room, question, broadcastToRoom);
    }
    res.json({ success: true, session: room.session });
  });
  router.post("/action/trigger-preset", (req, res) => {
    const { tenantId = "tenant_spatialgineers", eventId = "event_live_main", presetId } = req.body;
    const room = getOrCreateRoom(tenantId, eventId);
    const success = triggerPresetOverride(room, presetId, "MANUAL_DIRECTOR", broadcastToRoom);
    if (success) {
      res.json({ success: true, activePresetId: presetId });
    } else {
      res.status(400).json({ error: "Invalid preset ID" });
    }
  });
  router.post("/action/simulate-votes", (req, res) => {
    const { tenantId = "tenant_spatialgineers", eventId = "event_live_main", count = 100 } = req.body;
    const room = getOrCreateRoom(tenantId, eventId);
    const updatedSummary = simulateAudienceVotes(room, count, broadcastToRoom);
    if (!updatedSummary) {
      return res.status(400).json({ error: "No active question" });
    }
    res.json({ success: true, simulatedCount: count, totalVotes: room.votes.size, summary: updatedSummary });
  });
  router.get("/analytics", (req, res) => {
    const tenantId = req.query.tenantId || "tenant_spatialgineers";
    const eventId = req.query.eventId || "event_live_main";
    const room = getOrCreateRoom(tenantId, eventId);
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
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  const server = http.createServer(app);
  const { broadcastToRoom } = setupWebSocketEngine(server);
  app.use("/api", createApiRouter(broadcastToRoom));
  app.get("/healthz", (req, res) => {
    res.status(200).send("OK");
  });
  const distPath = path.join(process.cwd(), "dist");
  const hasDist = fs.existsSync(path.join(distPath, "index.html"));
  if (process.env.NODE_ENV === "production" || hasDist) {
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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
