# Open-source skills for the immersive / 3D / gamified app (28 oct 2026)

Licenses checked from each repo's LICENSE file. Nothing installed yet.

## Recommended (adopt)
| Skill pack | License | Use here |
|---|---|---|
| [cloudai-x/threejs-skills](https://github.com/cloudai-x/threejs-skills) | MIT | asset-pipeline (Draco/meshopt/KTX2 for the GLB pillars), performance on mobile, loaders, raycast interaction, shaders/postprocessing |
| [addyosmani/web-quality-skills](https://github.com/addyosmani/web-quality-skills) | MIT | Core Web Vitals with a 3D hero, INP during live voting, accessibility (reduced motion, contrast, focus) |
| [anthropics/skills · webapp-testing](https://github.com/anthropics/skills/tree/main/skills/webapp-testing) | Apache-2.0 | Playwright screenshot-and-fix loop (ES/EN, 390 px) |
| [greensock/gsap-skills](https://github.com/greensock/gsap-skills) | MIT | Only if we adopt GSAP (timelines for XP/badge reveals, ScrollTrigger) |

## Copy ideas into a project guide (with attribution)
- [emalorenzo/three-agent-skills](https://github.com/emalorenzo/three-agent-skills): dispose and mobile rules (MIT stated in README, no LICENSE file).
- [dannyjpwilliams/ui-sound-design-skill](https://github.com/dannyjpwilliams/ui-sound-design-skill) (MIT): Web Audio recipes for XP and badge sounds.
- [omer-metin/skills-for-antigravity · game-design-core](https://github.com/omer-metin/skills-for-antigravity) (Apache-2.0): MDA, core loops, "juice".

## Skipped
- pbakaus/impeccable: telemetry and a remote API by default.
- vercel-labs web-design-guidelines: fetches its rules remotely on every run.
- Packs with no license we could verify.
- CC BY-NC-ND lists: read only, never copy.

## Skills de Scenario (3D "exótico") · 11 nov 2026
- Repo público: https://github.com/scenario-labs/skills (licencia MIT). El que aplica a Tu Estudio 3D es `skills/scenario-walkable-room`.
- **Lo que sirve sin su servicio** (`references/viewer.md`): three.js + Spark (splats por niveles de detalle) + Rapier (física); objetos que se agarran y se tiran, sonidos de impacto solo cuando el objeto venía en movimiento, objetos rígidos que empiezan dormidos, física cargada después de que el cuarto está en pantalla.
- **Lo que sí necesita un generador** (Scenario u otro): el mundo en Gaussian splats a partir de una foto, y los objetos 3D a partir de recortes. Sin generador, el cuarto sigue siendo geometría hecha a mano.
- Otros útiles del mismo repo: `scenario-3d-worlds`, `scenario-skyboxes`, `scenario-textures`, `scenario-3d`.
