# SGX Immersion Engine

The platform-wide game layer for the Spatialgineers Summit. It runs on top of every page
without changing how pages route or render, so the app keeps working in Google AI Studio
exactly as before (same `npm run dev` / `npm run build`, no new dependencies, no server changes).

## What it adds

| Mechanic | Where | How to trigger |
| --- | --- | --- |
| Quests (Main, Side, Secret) | `quests.ts` | Visiting sections, docking pillars, using the terminal… |
| Energy cells | `EnergyCell.tsx` | A hidden SGX Bolt appears near the edge of each Summit section |
| Reactor energy + Overdrive | `ImmersionContext.tsx` | Any interaction charges it; at 100% XP on cells doubles for 12 s |
| Command terminal | `CommandTerminal.tsx` | `Ctrl/Cmd+K`, `/` or `` ` `` |
| Mission Control rail | `MissionRail.tsx` | Right edge of the screen |
| Pulse | `ImmersionFX.tsx` | `P`; the 3D core answers with shockwaves |
| Stage mode | `ImmersionContext.tsx` | `F` (fullscreen, hides the HUD) |
| Warp, reticle, atmosphere, XP ticker | `ImmersionFX.tsx` | Automatic; turn off with `FX OFF` |

Shortcuts follow the SGX HUD spec: `1–8` sections · `P` pulse · `M` audio · `F` stage · `/` terminal · `Esc` exit.
They stand down while typing and while the drone game is flying (`body[data-sgx-game]`).
`?embed=true` hides the whole layer; the `stage` and `multiview` pages only show toasts.

## How it connects

- XP goes through `PilotProfileContext.recordActivity` (categories `quest_complete`, `energy_cell`),
  so it shows up in the pilot profile, activity log and leaderboard.
- It listens to the existing event bus: `sgx:switch_summit_section`, `sgx:pillar_docked`,
  `sgx:route_changed` (fired by `syncAppUrl`) and `popstate`.
- It emits `sgx:pulse`, `sgx:overdrive`, `sgx:quest_complete`, `sgx:level_up` and
  `sgx:navigate_page` (handled in `App.tsx`). Any module can listen to these.
- Progress persists in `localStorage` (`sgx_immersion_v1`, `sgx_immersion_settings_v1`).

## Adding a quest

1. Add a `QuestDef` to `QUESTS` in `quests.ts` (Spanish and English copy, XP, target).
2. Call `completeQuest('your_id')` from any component via `useImmersion()`, or derive its
   progress in `derivedProgress()` inside `ImmersionContext.tsx`.

## Design system

All visuals use the tokens and `sgx-*` components in `src/styles/sgx-design-system.css`,
ported from the "Spatialgineers SGX" design system: Orbitron (display), Chakra Petch (HUD),
Exo 2 (body), Share Tech Mono (telemetry), 45° cuts, glass panels, yellow for action and cyan
for live data. The official SGX Bolt and Gear SVGs live in `public/brand/`.
