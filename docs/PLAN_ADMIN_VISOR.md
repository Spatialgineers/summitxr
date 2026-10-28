# Plan: CSV everywhere, admin redesign, main 3D viewer, new shader ideas

Based on a full read of the admin (16 tabs + 6 modals, about 10k lines) and of every data entity.

## Already fixed (this commit)

- Sponsor tab "EXPORTAR CSV" downloaded the audience leads; it now exports the sponsor inquiries (CRM).
- Rewards marked `active: false` could still be redeemed (the rule only checked `isActive`). The rule now checks both. **Needs a rules deploy.**
- Visitors adding sandbox apps in the Embeds hub tried to publish them to everyone (rules refused, but it fired a "publish failed" alert). Their apps now stay on their device; only admins publish.

## A. CSV import/export for every data set

What exists today does not match the real data types. For example, the speakers CSV writes `company` while the app reads `organization`, and the tiers CSV describes sponsors instead of tiers. Importing can therefore publish broken objects to every visitor. Prize tiers and broadcast rooms "import" with a success message but nothing happens.

Plan:

1. One typed definition per entity (columns ↔ real fields):
   - Arrays go as `a | b`, bilingual fields as `campo_en`, nested data as a JSON cell.
   - The template has an example row and a help row.
2. One reusable `CsvBar` in every data panel with Export · Template · Import.
3. Before applying an import, a preview shows new / updated / unchanged / errors per row.
   - Two modes: merge by id, or replace.
   - Replace downloads a backup automatically first.
4. Coverage: agenda/run of show, speakers, sponsorship tiers, approved showcases, Initiates, rewards (store), prize tiers, map 360, embeds, live questions, polls, weekly capsules, retrospective gallery, missions, registrations (export + status import), sponsor inquiries, speaker submissions, leads (export).
5. Polls, capsules, gallery and missions are hard-coded today. They move to `summit_content` so they can be edited and imported.

## B. Admin dashboard redesign

16 flat tabs become 5 areas with a side menu and search (Ctrl/Cmd+K):

| Area | Contains |
|---|---|
| En vivo | Director console, live question, announcements, polls |
| Contenido | Agenda, speakers, sponsors + showcases (one place, not two), Initiates, map, embeds, capsules, gallery |
| Personas | Inscritos, Day 3 check-in, speaker submissions, sponsor CRM, leads, Entrepreneur Match |
| Juego | Rewards store, prize tiers (wired to the app; today edits are ignored), missions, CYOA questions (one importer instead of three) |
| Sistema | Theme + tenants (merged), FX presets, feature toggles/QA, admin roster (add/remove admins; there is no UI today), analytics |

Also:
- Every section shows "Publicado" or "Solo en este equipo".
- "Reset to defaults" needs you to type a confirmation and makes a backup first.
- The fake Telemetry/Sync/Security tabs go away.
- Everything is in Spanish, with English where the public sees it.
- The admin gets the same holo glass and HUD look as the rest of the app.

Cleanup:
- Dead writes to `summit_sessions` / `summit_speakers`.
- The nonexistent "broadcast rooms" entity.
- Demo Khronos models (duck, helmet, avocado) in the asset list.

## C. Main 3D viewer (the core)

1. Post-processing: selective bloom, light chromatic aberration, film grain and vignette. Adaptive quality lowers resolution or turns bloom off on weak phones.
2. Shader floor: an infinite grid that reflects the pillar colors, with ripples when you dock or earn XP. It replaces the two GridHelpers.
3. Energy beams: the core → pillar lines become flowing energy, and the docked one pulses.
4. SGX core: a fresnel energy shell with plasma inside the SGX Icon .glb.
5. Light shafts: the pedestal cones become volumetric beams with noise.
6. Intro flythrough: after the splash, the camera flies in from space to the core. Light depth of field when docked.
7. Declutter: sponsor billboards and the Holo Card become holo glass panels, with less label noise.
8. The SGX Guild logo .glb (`Sgxgs 1.glb`) joins the scene as an easter egg orbit. More models can join if there are others on the CDN.

## D. New ideas with the shader skills

1. A visual signature per pillar station:
   - Story: flowing ink
   - Showcase: volumetric hologram
   - Spark: CRT/arcade
   - Stage: volumetric stage lights
   - System: data rain/circuits
   - Synthesize: raymarched fractal
2. Molten forge: the pass melts into existence (dissolve with a glowing edge + sparks) when it's forged.
3. Real foil Holo Card: a WebGL thin-film interference foil that follows the phone's gyroscope.
4. Attract mode for Day 3: full-screen generative visuals with sponsors and the QR, for the screens at Chroma Space Studios.
5. Plasma reactor: the energy cell becomes liquid plasma that fills with XP.
6. GPU constellation: networking as a nebula whose lines draw themselves.
7. Shader transitions for modals (dissolve/glitch in and out).
8. Day 3 portal: a vortex that grows as the date approaches.
9. Visit globe with atmosphere and light arcs per visit.
10. Personal recap: at the end of the event, an animated story of each visitor's pass and stats to share.

## Suggested order

A + B together (the CSV lives inside the new admin), then C, then 2–3 ideas from D.
