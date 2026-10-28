/* Built-in visual assets for the stage presets (pure data, no three.js),
   so the preset list can load without pulling the 3D engine. */

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
  { id: 'grid_floor', name: '🌐 Cyber Grid Matrix', url: `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#0d0d0d"/><path d="M0 50 L100 50 M50 0 L50 100" stroke="#00ddff" stroke-width="0.5" opacity="0.4"/></svg>')}` },
  { id: 'hex_mesh', name: '⬢ Neon Hex Cell', url: `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"><polygon points="30,5 55,20 55,50 30,65 5,50 5,20" fill="none" stroke="#ff0055" stroke-width="1" opacity="0.4"/></svg>')}` },
  { id: 'nebula_space', name: '✨ Deep Cosmic Starfield', url: `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#090909"/><circle cx="30" cy="40" r="1.5" fill="#ffffff" opacity="0.8"/><circle cx="150" cy="80" r="2" fill="#00ddff" opacity="0.9"/><circle cx="90" cy="160" r="1" fill="#fdcc0d" opacity="0.7"/></svg>')}` },
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
        <polygon points="36,2 14,34 30,34 26,62 50,28 34,28" fill="#00ddff" stroke="#ffffff" stroke-width="1.5"/>
      </svg>
    `.trim())}`
  }
};
