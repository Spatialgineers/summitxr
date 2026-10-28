# Admin guide

The admin console (`?page=admin`) has 5 areas, a left-side menu and a search box (Ctrl/Cmd+K).

| Area | Sections |
|---|---|
| En vivo | Consola del director, Anuncios, Encuestas del keynote |
| Contenido | Agenda / Run of Show, Speakers, Sponsors, Niveles de auspicio, Guild Initiates, Mapa 360, Apps embebidas, Cápsulas semanales, Galería, Redes sociales |
| Personas | Inscritos y Día 3, Audiencia y leads, Entrepreneur Match |
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

## Other tools

- **Admins**: super admins (`info@` / `support@spatialgineers.com` with Google) can add an admin by email. The person must have opened the app once with that Google account. Roles are DIRECTOR, OPERATOR or SUPER_ADMIN.
- **Respaldo y restauración**:
  - Download every data set as CSV.
  - Restore the original agenda, speakers, map, apps and tiers. You have to type `RESTAURAR`, and a backup downloads first.
