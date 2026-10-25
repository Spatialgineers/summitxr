# Implementation Plan: App Architecture Clean-Up & Adaptive Responsive Optimization

Reorganize the Spatialgineers Summit 2026 web application into a cohesive, uncluttered, and mobile-adaptive experience with a clean 100dvh 3D Orbital Core viewport, slide-up modal drawers, and streamlined pillar-grouped navigation.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were confirmed by the user during interactive alignment (Phase 1):

- **Confirmed Choice 1 (3D Core OVERVIEW Viewport)**: Clean 100% unobstructed 3D hero canvas on mobile and desktop. Information panels, module details, and sponsor showcases open in slide-up modal drawers under demand rather than overcrowding the viewport.
- **Confirmed Choice 2 (Sub-Page Navigation)**: Unified top navigation bar with a pillar-categorized dropdown selector (`SummitSectionsDropdown`) grouping all 12 modules cleanly under the 6 SGX Pillars, eliminating multi-row chip clutter.
- **Confirmed Choice 3 (Visual Density & Mobile Discipline)**: Prioritize 3D viewport canvas area on mobile screens by hiding secondary text watermarks, floating banner buttons, and stacked labels until an object or pillar is explicitly tapped.

---

## 1. Overview & Core Concept

- **Goal**: Eliminate visual chaos ("revolú"), stacked navigation bars, and viewport-blocking footers so that the application is intuitive, elegant, and highly responsive across all mobile, tablet, and desktop screens.
- **Core Strategy**:
  - **OVERVIEW (3D Core)**: A strict `100dvh` full-bleed spatial cockpit. The 3D Three.js canvas is the star of the landing page, bounded only by a slim top HUD and a compact 6-pillar bottom dock.
  - **Sub-Pages (Agenda, Guild, Map 360, etc.)**: Dedicated scrollable content pages with a clean top bar (`← Volver al Núcleo 3D` + Pillar badge + Section dropdown) and the global footer rendered strictly at the bottom of these content sub-pages.

---

## 2. User Experience & Visual Design

### A. Responsive Layout Hierarchy

```
┌────────────────────────────────────────────────────────────────────────┐
│ [Brand Logo]       [Summit 2026]       [ES|EN] [Pilot Profile / Login] │  ← HeaderNav (48px)
├────────────────────────────────────────────────────────────────────────┤
│ [Pillar Badge]  NÚCLEO 3D SPATIALGINEERS  [Boleto PDF] [Orbit] [Settings] │  ← Core Top HUD (40px)
│────────────────────────────────────────────────────────────────────────│
│                                                                        │
│                                                                        │
│                      HERO 3D ORBITAL CORE REACTOR                      │
│                    (100% Clean Canvas Viewport)                        │
│                                                                        │
│                                                                        │
│                    [ ▴ Panel Story (6 Módulos) ]                       │  ← Compact Floating Pill
├────────────────────────────────────────────────────────────────────────┤
│  01.STORY │ 02.STAGE │ 03.SPARK │ 04.SYSTEM │ 05.SHOWCASE │ 06.SYNTH    │  ← Bottom Dock (36px)
└────────────────────────────────────────────────────────────────────────┘
```

### B. Viewport & Modal Behavior
- **Mobile Viewport (< 768px)**:
  - Height fixed to `calc(100dvh - 124px)` with `min-height: 440px`.
  - Floating controls inside viewport reduced to a single compact pill (`w-auto mx-auto`).
  - Slide-up inspection drawer opens as a full-height sheet (`h-[90vh]`) with a top grabber bar and explicit "✕ Volver al 3D" button.
- **Desktop Viewport (≥ 1024px)**:
  - Full-bleed 3D scene with 6-column bottom dock.
  - Inspection drawer slides in as a sleek right-hand cybernetic side panel (`w-[500px]`) with dark glassmorphic styling and angled clip-paths.

---

## 3. Key Product Decisions & Trade-Offs

1. **Isolation of Global Footer**:
   - *Decision*: Render the 250px global footer strictly on scrollable content sub-pages (Agenda, Guild, Map 360, Sponsors Hub, etc.), and hide it completely on `OVERVIEW`.
   - *Rationale*: Eliminates page overflow on the 3D cockpit landing view, preventing the footer from covering or pushing the WebGL canvas out of sight.

2. **Single-Row Section Bar for Sub-Pages**:
   - *Decision*: Replace the multi-row wrapped grid of 12 section chips with a single-line horizontal scroll bar paired with `SummitSectionsDropdown`.
   - *Rationale*: Prevents navigation bars from taking up more than 15% of vertical screen height on mobile devices.

3. **Touch-First 3D Canvas Protection**:
   - *Decision*: Ensure all floating overlays on top of the Three.js canvas use `pointer-events-none` on outer wrappers and `pointer-events-auto` strictly on button elements.
   - *Rationale*: Guarantees smooth, uninterrupted touch-drag orbit rotation and pinch-zoom without accidental button clicks.

---

## 4. Technical Architecture & Data Strategy

### System Component Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                                App.tsx                                 │
│      (Height Chain: h-[100dvh] overflow-hidden when on 'summit')       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
               ┌────────────────────┴────────────────────┐
               ▼                                         ▼
      [ HeaderNav (48px) ]                    [ SummitLandingPage ]
                                                         │
                                        ┌────────────────┴────────────────┐
                                        ▼                                 ▼
                                activeSection === 'OVERVIEW'     activeSection !== 'OVERVIEW'
                                        │                                 │
                            [ SummitExperienceHub ]            [ Scrollable Sub-Page ]
                                        │                                 │
                              [ SgxOrbitalCore3D ]             [ Section Banner / Cards ]
                                (100dvh Cockpit)                          │
                                                                   [ Global Footer ]
```

### Key Refactoring Steps

1. **`src/App.tsx`**:
   - Maintain unbroken `h-[100dvh] overflow-hidden` container chain for `currentPage === 'summit'`.

2. **`src/components/summit/SummitLandingPage.tsx`**:
   - Keep global `<footer>` conditional on `activeSection !== 'OVERVIEW'`.
   - Streamline secondary sticky header into a single line with `SummitSectionsDropdown` and `overflow-x-auto`.

3. **`src/components/summit/SgxOrbitalCore3D.tsx`**:
   - Ensure `viewportRef` computes height dynamically with `calc(100dvh - 124px)` and `minHeight: 440px`.
   - Maintain compact floating launcher pill for mobile sheet.
   - Ensure clean event listener cleanup on unmount.

---

## Verification & Acceptance Criteria

1. **Zero Layout Overlap**: On mobile (< 768px) and desktop (1440px), the 3D Orbital Core renders with full height and zero footer or navigation overlap.
2. **Smooth Touch Orbit**: Touch drag and orbit controls on mobile operate smoothly with no lag or UI traps.
3. **Clean Compilation**: `compile_applet` and `lint_applet` complete with zero errors.
