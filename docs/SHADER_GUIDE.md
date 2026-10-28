# SGX shader effects

Five WebGL effects plus the hero smoke, all in the brand colors of the six pillars.
Code lives in `src/immersion/shaders/`.

| Effect | Where | File | Turns off with |
|---|---|---|---|
| Energy field (hero smoke) | Dome of the 3D core, behind everything | `effects.ts` → `DOME_ENERGY_FRAG`, wired in `SgxOrbitalCore3D.tsx` | Lite mode (the whole core is off); reduced motion freezes it |
| Holographic pillar | Active pillar's `.glb` (and its loading crystal) | `HOLO_PILLAR_VERT/FRAG`, wired in `SgxOrbitalCore3D.tsx` | Reduced motion keeps only the rim |
| Warp tunnel | Every section / station jump | `WARP_FRAG`, `WarpTransition` in `ImmersionFX.tsx` | No WebGL2, lite mode or reduced motion → the CSS streaks |
| XP sparks | Global layer on the summit/play pages | `SPARKS_FRAG`, `XpSparks` in `ImmersionFX.tsx` | Same → the existing "+XP" float only |
| Holo glass | Hangar, Forge, Holo Card Studio, pilot builder | `GLASS_FRAG`, `HoloGlass.tsx` | Same → the CSS panel background |

## The 3D core (main viewer)

`src/immersion/shaders/coreFx.ts`, wired in `SgxOrbitalCore3D.tsx`:

- **Post-processing.** EffectComposer runs bloom, then OutputPass (tone mapping + sRGB), then a grade pass (light chromatic aberration, film grain, vignette).
  - Adaptive quality: after a 2.5 s warm-up it averages 90 frames. Above 24 ms it drops the pixel ratio to 1; above 30 ms it turns bloom off.
  - Custom shaders output linear color (`SGX_LINEAR`), so the pipeline stays consistent.
- **Shader floor and faint ceiling.** They replace the GridHelpers: a grid with a distance fade in the energy-field colors and a slow radial pulse.
  - Up to 4 ripples at a time: one from the pillar when you dock on it, one from the core on every XP gain (`sgx:xp_sparks`).
- **Energy beams.** Flowing dashes run from the core to each pillar. The active one runs brighter, and pulses once docked.
- **Core shell.** A fresnel energy shell with flowing plasma bands around the SGX Icon .glb that pulses with the reactor.
- **Light shafts.** The pillar pedestals become noisy volumetric beams that are brighter on the active pillar.
- **Sponsor screens.** Holo glass: slow scanlines and a cyan edge glow, injected with `onBeforeCompile`.
- **Intro flythrough.** Once per session, after the splash, the camera flies in from deep space (2.8 s). Touching the screen skips it; it never runs with reduced motion.
- **SGX Guild easter egg.** `Sgxgs 1.glb` rides a slow, high orbit. The first click gives +50 XP; later clicks just show it was already found.

## How the colors work

`pillarFx.ts` holds two colors per pillar (A = pillar, lifted where the official color is too
dark to glow on #050505; B = brand accent). `fxPair(key)` returns them as GLSL vec3.

- The dome follows the pillar passing in front of the camera while the core orbits, so the
  hero smoke changes color on its own; once a pillar is docked it takes that pillar's colors.
- Sparks and glass use the last pillar the visitor docked or visited (`setFxPillar`, session
  only), or the pass affinity in the Hangar and Forge.

## Triggering effects from code

- Sparks fire on every XP gain automatically. To burst somewhere specific:
  `window.dispatchEvent(new CustomEvent('sgx:xp_sparks', { detail: { x, y } }))` (client px).
- Glass: put `<HoloGlass pillar={key} />` as the first child of a panel frame. It sets
  `isolation: isolate` on the frame and sits at `z-index: -1`, so it paints over the frame's
  CSS background and under its content, and follows the frame's own scroll.

## Rules that keep it cheap and safe

- Loops have constant bounds (FBM is 5 unrolled octaves, sparks loop 90 times) so drivers
  never see dynamic loop limits.
- Full-screen effects run in `ShaderCanvas` (one WebGL2 full-screen triangle): DPR capped,
  paused while the tab is hidden, context freed when the canvas leaves the page.
- The warp and sparks canvases exist only while the effect plays; glass runs at 30 fps.
- The dome shares the core's Three.js context (no extra canvas). On touch devices it uses one
  warp step less (`SGX_LITE` define).
- Every effect checks `canRunShaders()` (reduced motion + `sgx_lite_mode`) and falls back to
  what was there before.

## Credits

Techniques adapted (studied and rewritten, not installed) from:

- [MiniMax-AI/skills · shader-dev](https://github.com/MiniMax-AI/skills) (MIT): value noise,
  FBM, domain warping, polar UV tunnel, stateless particles, chromatic aberration,
  WebGL pitfalls.
- [martinholovsky/claude-skills-generator · glsl / webgl](https://github.com/martinholovsky/claude-skills-generator)
  (public domain): holographic panel, fresnel energy field, GPU safety rules.

The visual concept these were reviewed on is the "SGX Holo FX" artifact.
