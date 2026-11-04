# Admin guide

The admin console (`?page=admin`) has 5 areas, a left-side menu and a search box (Ctrl/Cmd+K).

| Area | Sections |
|---|---|
| En vivo | Consola del director, Anuncios, Encuestas del keynote |
| Contenido | Agenda / Run of Show, Speakers, Sponsors, Niveles de auspicio, Guild Initiates, Mapa 360, Apps embebidas, Cápsulas semanales, Galería, Redes sociales |
| Personas | Inscritos y Día 3, Prensa, Audiencia y leads, Entrepreneur Match |
| Juego | Tienda del Reactor, Misiones, Preguntas en vivo |
| Sistema | Analítica, Marca y tenants, Efectos visuales, Funciones y QA, Admins, Respaldo y restauración |

Each section shows whether its last change was **Publicado** (live for everyone) or **Solo en este equipo** (the publish failed, with the reason).

## CSV

Every content section has **Exportar · Plantilla · Importar**.

- **Exportar** downloads what is live now.
  - Row 1 holds the column names (the real field names).
  - Row 2 is a help row that starts with `#`. Rows like that are ignored on import, so you can leave it in.
- **Plantilla** gives the same columns with one example row.
- **Importar** never applies blindly. It shows how many rows are new, updated, unchanged or removed, plus any errors (with row numbers). Nothing is saved until you press Apply.
  - **Combinar**: updates rows by `id` and adds new ones; everything else stays.
  - **Reemplazar todo**: the list becomes exactly the file. A backup CSV of what was live downloads first.

### Filling the cells

| Cell | How to write it |
|---|---|
| Lists | `a | b | c` |
| Yes/no | `true` / `false` (also `sí`, `no`, `1`, `0`) |
| Pillars | `SGX.Story` … `SGX.Synthesize` (`story` also works) |
| English text | The column with the same name plus `En`, e.g. `titleEn`. Empty means the Spanish text is shown. |
| Complex data | JSON in one cell: map hotspots, the brands inside a sponsorship tier |
| New row | Leave `id` empty to create a new one. |
| Missing column | A column missing from the file keeps its current values. A column that is present but empty clears that field. |

### Data sets

Agenda, speakers, sponsorship tiers, approved sponsors (showcases), Guild Initiates (including their private claim email), map 360, embedded apps, Reactor store prizes, keynote polls, weekly capsules, gallery and missions (text and XP only).

People data is export-only:
- leads
- sponsor inquiries
- registrations, from their own panels

## Fechas límite

All dates are Puerto Rico time. They live in one file, `src/lib/summitDeadlines.ts`: the forms, the welcome portal, the Highbot, the offline guide, the invite emails and the press kit all read them from there. Change a date there, then run `npm run build` (and `node scripts/press-kit/build.cjs` for the fact sheet).

| Qué | Fecha límite | Qué pasa después |
|---|---|---|
| Perfiles de speakers y artistas | hasta el 21 de noviembre de 2026 | El Portal de speakers se cierra solo (desde el 22 nov): "El portal de speakers cerró el 21 de noviembre. Escríbenos a info@spatialgineers.com". El admin sigue pudiendo añadir y editar speakers en el CMS. |
| Solicitudes de auspicio | hasta el 28 de noviembre de 2026 | El formulario de sponsors se cierra solo (desde el 29 nov) y apunta a info@spatialgineers.com. |
| Pago total de sponsors | a más tardar el 30 de noviembre de 2026 | Aviso en el formulario, la página de sponsors y los correos. |
| Materiales de la marca | a más tardar el 30 de noviembre de 2026 | Igual que el pago. |
| Invitaciones al Día 3 | a más tardar el 5 de diciembre de 2026 | Nota en Inscritos y Día 3; desde el 6 dic sale un aviso suave si quedan pendientes (no bloquea). |
| Acreditación de prensa | antes del 1 de diciembre de 2026 | La Sala de prensa se cierra sola; el kit sigue disponible. |

To check a closed state without waiting, set `localStorage.sgx_now` to a time in ms in the browser console (e.g. `localStorage.sgx_now = Date.parse('2026-11-23T12:00:00-04:00')`) and reload; remove it afterwards. It only affects that browser.

## Prensa (press accreditation)

Requests come from `/prensa` (the Sala de prensa, under SGX.Stage). They close on December 1, 2026. There are **10 press slots** (no per-outlet rule); the panel shows `aprobados X/10` and asks for confirmation before you approve past 10.

- **Aprobar**: the person's SGX Pass becomes the **PRENSA** Holo Card (`credential_grants/{uid}.press`) and their pass is invited to Day 3 in Inscritos (status `INVITED`, so the mailer sends the Day 3 invitation and their QR is their entrance at Chroma).
- **No aprobar** / **Pendiente**: removes PRENSA from their card and, if the approval was what invited them, puts their Day 3 status back to `PENDING`.
- **Exportar CSV**: the list with outlet, links, days and pass code.

The press kit (`public/press/`) is rebuilt with `node scripts/press-kit/build.cjs` (see the script header).

## Other tools

- **Admins**: super admins (`info@` / `support@spatialgineers.com` with Google) can add an admin by email. The person must have opened the app once with that Google account. Roles are DIRECTOR, OPERATOR or SUPER_ADMIN.
- **Respaldo y restauración**:
  - Download every data set as CSV.
  - Restore the original agenda, speakers, map, apps and tiers. You have to type `RESTAURAR`, and a backup downloads first.

## Venue screen (live stage)

- Open `summit.spatialgineers.com/?page=stage` on the venue screen. It shows the question, live percentages, the countdown, the winner, a QR to vote and the audience's reactions.
- Visitors can only watch. Nothing on that page changes the visual. You change it from the admin (FX Presets) and by running the votes.
- Signed in as admin, the **Proyección** button opens: transparent background, HUD on/off, 3D vote towers, camera motion, sounds, and **Copiar enlace para OBS**.
- OBS link options: `&clean=1` hides every button, `&transparent=1` gives a transparent background, `&hud=0` shows only the 3D scene.

## What needs an SGX Pass

The SGX Pass is the player profile and the key to the app. There is no separate SGX Live profile: the pass callsign is the name on the stage, and votes and reactions add XP to the pass.

| Open to everyone | Needs an SGX Pass |
|---|---|
| 3D core, pillars, agenda, speakers, sponsors, Guild, visit radar, broadcast rooms, watching the stage | SGX Live (voting and reactions), drone simulator and games, SGX.Match, networking forums and chat, 360° tour of Chroma |

- Admins always get through.
- The section banner stays visible as a teaser. The content shows a "Forja tu SGX Pass" card instead.
- To change the list, edit `PASS_GATED_SECTIONS` in `src/identity/PassGate.tsx`.
- **Restoring a pass on another device:** sign in with the same Google account in the Forge. It finds the earlier registration and keeps the same pass code. This only works for passes forged while signed in with Google.
