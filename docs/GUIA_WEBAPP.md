# Guía de la webapp · Spatialgineers Summit 2026

Referencia maestra de la app del Spatialgineers Summit 2026 (`summit.spatialgineers.com`). Sirve para dos cosas:

- el registro del equipo;
- el contexto de cualquier IA que trabaje en este código.

Todo lo que dice aquí sale del código del repo (rama `main`, noviembre 2026). Si el código y esta guía no coinciden, gana el código, y hay que actualizar la guía en el mismo cambio.

> **Para agentes de IA:** lee esta guía completa antes de tocar el código. Después lee `docs/highbot/spatialgineers-summit-app/SKILL.md` (los hechos del evento y la voz de la marca) y, según la tarea, el documento específico del índice `docs/README.md`.

---

## Índice

1. [Resumen](#1-resumen)
2. [Arquitectura y stack](#2-arquitectura-y-stack)
3. [Mapa de rutas](#3-mapa-de-rutas)
4. [Página por página](#4-página-por-página)
5. [Identidad y SGX Pass](#5-identidad-y-sgx-pass)
6. [Gamificación](#6-gamificación)
7. [En vivo](#7-en-vivo)
8. [Highbot con Claude](#8-highbot-con-claude)
9. [Roles y flujos](#9-roles-y-flujos)
10. [Admin / Centro de mando](#10-admin--centro-de-mando)
11. [Portal de bienvenida y campaña](#11-portal-de-bienvenida-y-campaña)
12. [Fechas límite](#12-fechas-límite)
13. [Datos y seguridad](#13-datos-y-seguridad)
14. [Correos automáticos](#14-correos-automáticos)
15. [Pruebas y operación](#15-pruebas-y-operación)
16. [Lo que hace esta app de otro nivel](#16-lo-que-hace-esta-app-de-otro-nivel)
17. [Glosario e índice de archivos clave](#17-glosario-e-índice-de-archivos-clave)

---

## 1. Resumen

### Qué es

Es la webapp oficial del **Spatialgineers Summit 2026**, la segunda edición del evento anual de Spatialgineers LLC, el estudio de ingeniería creativa y computación espacial de Puerto Rico. Spatialgineers lo fundaron dos socios:

- **Danelson Maldonado González, "The Highgineer"**;
- **Ricardo A. Hernández Díaz, "Lightning Fingers"**.

La app sigue la idea de la casa, "From passive spectators to active participants". Es una experiencia 3D gamificada que corre en el navegador, sin descargas, y se puede instalar como PWA.

### El evento

| Dato | Valor |
|---|---|
| Fechas | 11, 12 y 13 de diciembre de 2026, en español, hora de Puerto Rico (AST, UTC-4) |
| Días 1 y 2 | Digitales y gratis por YouTube Live (canal principal `@spatialgineers`), con LinkedIn y Facebook Live. Los Mismos TV transmite junto a Spatialgineers. |
| Día 3 (domingo 13) | SGX Showcase presencial en **Chroma Space Studios, San Juan**, por invitación y con cupo limitado. Se entra con el QR del SGX Pass. |
| URL | `https://summit.spatialgineers.com` |
| Edición anterior | Spatialgineers Summit 2025, híbrido, 19–21 dic 2025 en Aguadilla. (Se hizo con Spatial, una plataforma que ya cerró; se cuenta en pasado.) |

### Para quién

| Público | Qué hace en la app |
|---|---|
| **Creadores** (cada visitante) | Forja su SGX Pass, arma su Highbot, gana XP, vota en vivo, hace networking, ve la agenda y entra al Día 3 con su QR |
| **Speakers y artistas** | Envían su perfil en el Portal de speakers; cuando el equipo los aprueba, su pase se convierte en Holo Card de speaker |
| **Sponsors** | Ven los Paquetes 1–5 y los lugares de marca, solicitan un paquete y, al ser aprobados, aparecen dentro de la experiencia |
| **Prensa** | Pide acreditación en la Sala de prensa (10 cupos), descarga el kit y recibe la Holo Card PRENSA y la invitación al Día 3 |
| **Equipo** | Opera todo desde el Centro de mando (`/admin`): contenido, inscritos, prensa, en vivo, Highbot, correos |

### El principio: "el SGX Pass es la llave"

El SGX Pass es el perfil del Creador y su llave de la app. La información está abierta para todos; lo interactivo pide pase. Los admins siempre entran.

| Abierto para todos | Pide SGX Pass |
|---|---|
| Núcleo 3D, páginas de pilar, manifiesto, agenda, speakers, sponsors y paquetes, Guild, radar de visitas, salas de transmisión, modelos 3D, mirar `/stage`, Sala de prensa (leer y descargar el kit), portal de bienvenida | SGX Live (`/play`: votar y reaccionar), Juegos y laboratorios, SGX.Match, Foros y chat, recorrido 360° de Chroma, Avatar Studio |
| | Además, desde el pase: Portal de speakers, solicitud de auspicio y acreditación de prensa (muestran "Forja tu pase primero") |
| | El chat con Highbot por Claude pide **pase + cuenta Google con email verificado** (sin eso, contesta con la guía local) |

- La lista de secciones con candado vive en `PASS_GATED_SECTIONS`, en `src/identity/PassGate.tsx`.
- El portal de speakers, el formulario de sponsors y la acreditación de prensa muestran `ForgeFirst` cuando no hay pase.
- Con candado, el banner de la sección sigue visible como adelanto, y en lugar del contenido sale la tarjeta "Forja tu SGX Pass".

---

## 2. Arquitectura y stack

### Diagrama

```
                 Navegador (PWA · React 19 + Vite + Three.js)
   ┌──────────────────────────────────────────────────────────────────┐
   │ App.tsx  → HeaderNav · SummitLandingPage (secciones) · /play     │
   │            /stage · /admin · SgxPassHost · CompanionDock         │
   │            ImmersionLayer (HUD, misiones, terminal, FX)          │
   │ Contextos: Auth · Language · PilotProfile (XP) · SummitFeature   │
   │            Immersion · SgxIdentity (pase) · TenantTheme          │
   │ sw.js: shell + pase sin conexión                                 │
   └──────┬───────────────────────┬────────────────────────┬──────────┘
          │ Firestore SDK         │ WebSocket /ws          │ HTTPS /api
          │ Auth (anónimo/Google) │ (votos, presets)       │ (REST, Highbot SSE)
          ▼                       ▼                        ▼
   ┌──────────────┐   ┌──────────────────────────────────────────────┐
   │ Firebase     │   │ Cloud Run · 1 instancia · server.js (Express)│
   │ Auth         │◄──┤  - Motor en vivo en memoria (salas, votos)   │
   │ Firestore    │   │  - /api (REST, admin con ID token)           │
   │ (BD con      │   │  - /api/companion → Anthropic (Claude)       │
   │  nombre)     │   │  - head SEO de /bienvenida y /prensa         │
   └──────▲───────┘   │  - estáticos de dist/ (br/gzip)              │
          │           └──────────────────────────────────────────────┘
          │ REST (cuenta info@, cada 5 minutos)
   ┌──────┴──────────────┐
   │ Apps Script mailer  │ → Gmail (confirmación, invitación, Holo Card, recordatorios)
   └─────────────────────┘
```

### Frontend

| Pieza | Detalle |
|---|---|
| Framework | React 19, TypeScript 5.8, Vite 6 (`vite.config.ts`) |
| Estilos | Tailwind 4 (`@tailwindcss/vite`) más el design system SGX: `src/styles/sgx-design-system.css` y `sgx-platform.css`, y CSS por módulo. Fuentes Orbitron, Exo 2, Chakra Petch y Share Tech Mono; cortes de 45°, paneles de vidrio, amarillo para acción y cian para datos en vivo. |
| 3D | **Three.js 0.185 directo**, sin React Three Fiber. Carga los `.glb` del CDN (`cdn.spatialgineers.com`) con GLTFLoader y Draco. El globo de visitas usa `globe.gl` y el mapa de PR usa Leaflet. |
| Shaders | GLSL propios en `src/immersion/shaders/` (ver `docs/SHADER_GUIDE.md`) |
| Otras librerías | `animejs`, `canvas-confetti`, `qrcode` (generar QR), `jsqr` (leer QR), `jspdf` (PDF del pase), `lucide-react` (íconos) |
| Juegos con cámara | "Rayo en tus manos" usa MediaPipe Tasks Vision (HandLandmarker) en un worker (`public/games/bolt/hand-worker.js`), cargado desde jsDelivr. El video no sale del dispositivo. |
| i18n | Español e inglés. `src/context/LanguageContext.tsx` y `src/lib/localize.ts` (`loc()`). Los textos bilingües van como `{ es, en }`, y los CSV usan columnas `…En`. |
| Modo ligero | `src/lib/lite.ts`: un solo interruptor para toda la app que apaga el 3D, los shaders y las animaciones. Se enciende solo con "ahorro de datos" o con poca memoria. |
| División del bundle | Rutas y módulos con `React.lazy` (`App.tsx`, `SummitLandingPage.tsx`), envueltos en `LazyBoundary` (error boundary con "Reintentar"). En `main.tsx`, ante `vite:preloadError` la página recarga, pero por el **guardia de recargas** (`src/lib/reloadGuard.ts`): como mucho una recarga automática por sesión y ninguna si hubo otra en los últimos 2 minutos, sea cual sea el motivo (chunk, cambio de cuenta u otra pestaña). |
| Monitoreo de errores | Propio, sin terceros. `src/lib/errorMonitor.ts` manda errores, promesas rechazadas, fallos de React, de chunks y de WebGL a `client_errors`, deduplicados y con tope por sesión. El admin los ve en "Errores en vivo". |

### Backend

| Pieza | Detalle |
|---|---|
| Servidor | `server.ts` (Express 4 + `http`). `npm run build` corre `vite build` y luego esbuild empaqueta `server.ts` en **`server.js`, que va en el repo**. `npm start` ejecuta `node server.js`. En desarrollo, `npm run dev` (`tsx server.ts`) monta Vite como middleware. |
| Motor en vivo | WebSocket en `/ws` (`src/server/engine/wsHandler.ts`, `roomManager.ts`, `votingEngine.ts`, `visualizerBridge.ts`). El estado vive **en memoria**. |
| REST | `/api/*` (`src/server/routes/apiRouter.ts`), con límite por IP (token bucket de 120 y 40/s). Las acciones del director piden `requireAdmin`. |
| Highbot | `/api/companion/*` (`src/server/companion/`). Ver la sección 8. |
| Radar de Instagram | `/api/social/instagram/candidates` (admin) y `/approved` (público), en `src/server/social/instagramRadar.ts`. Lee la Instagram Graph API cada 15 min y guarda los resultados solo en memoria. Ver `docs/INSTAGRAM_RADAR.md`. |
| SEO | `src/server/welcomeMeta.ts` inyecta el `<head>` de `/bienvenida*` y `/prensa`. |
| Producción | Comprime con brotli o gzip y guarda en memoria. `/assets/*` va inmutable por un año, y un archivo de `/assets/` que no existe (un chunk del deploy anterior) responde **404**, nunca la página; `sw.js`, `index.html` y el manifest van con `no-cache`. Cabeceras `nosniff`, `Referrer-Policy` y HSTS. `trust proxy = 1`, para que `X-Forwarded-For` no se pueda falsificar. |
| Salud | `/healthz` y `/api/health` |
| Instancias | **Una sola instancia de Cloud Run, con afinidad de sesión** durante el evento (mín. 1, máx. 1). Dos instancias partirían la audiencia en salas que no se ven. Ver `docs/DEPLOY.md`. |

### Firebase

- **Auth**: todo visitante entra como anónimo. Google (`signInWithPopup`, `prompt: select_account`) sirve para recuperar el pase en otro equipo, para chatear con el Highbot y para ser admin.
- **Firestore**: una base de datos con nombre (`firestoreDatabaseId` en `firebase-applet-config.json`). Las reglas están en `firestore.rules`.
- **App Check**: **no está implementado.** No hay código de App Check ni de reCAPTCHA. La protección viene de las reglas, la validación de forma, los límites de ritmo y los topes del servidor (ver la sección 13).

### Hosting, despliegue y PWA

- El proyecto vive en Google AI Studio, que despliega en Cloud Run. Se sube a `main`, se hace pull en AI Studio y se despliega. Ver la sección 15.
- **PWA**: `public/manifest.webmanifest` (standalone, vertical, atajos "Mi SGX Pass", "Agenda" y "SGX Live") y `public/sw.js`. El build le pone a `sw.js` un id de build y escribe `dist/sw-precache.json` con los chunks pequeños y el arte del pase (el plugin `swBuildStamp` en `vite.config.ts`). Ver "Pase sin conexión" en la sección 5.

---

## 3. Mapa de rutas

### Cómo se resuelve una ruta

`src/lib/summitUrlSync.ts` resuelve la URL en este orden:

1. `?tab=`/`?page=` que apunta a una página propia (`play`, `stage`, `admin`…).
2. `?section=`/`?tab=` que apunta a una sección.
3. `#hash`.
4. La ruta limpia: `/agenda`, `/pilar/spark`, `/bienvenida/speaker`…

Otras reglas:

- `upgradeLegacyUrl()` convierte una sola vez los enlaces viejos con query en rutas limpias.
- `?tab=story|showcase|spark|system|synthesize` se reescribe a `/pilar/<slug>`. `?tab=stage` sigue siendo la página del escenario.
- `?pillar=` solo se conserva en `/`, `/pilares`, `/play` y `/stage`.
- `syncAppUrl()` hace `pushState` y emite `sgx:route_changed`.

### Páginas propias (`PageRoute`)

| Ruta | Alias | Qué es | Componente | Acceso |
|---|---|---|---|---|
| `/` | `/summit`, `/event`, `/portal`, `/overview`, `/home`, `/resumen`, `/general` | Núcleo 3D (sección `OVERVIEW`) | `SummitLandingPage.tsx` → `SummitExperienceHub` → `SgxOrbitalCore3D.tsx` | Abierto |
| `/play` | `/vote`, `/audience`, `/pwa` | Arena de votación en vivo (SGX Live) | `src/components/audience/AudiencePWA.tsx` | **Pase** (`PassGate feature="live"`) |
| `/stage` | `/3d`, `/screen` | Escenario en vivo (pantallas del venue, OBS) | `src/components/stage/StagePage.tsx` | Abierto (solo mirar); los ajustes de proyección son solo para admin |
| `/admin` | `/director`, `/cms` | Centro de mando | `src/components/admin/AdminDashboard.tsx` | **Admin** (`AdminAuthGuard`) |
| `/analytics` | `/telemetry`, `/metrics` | Analítica del motor en vivo | `src/components/analytics/AnalyticsDashboard.tsx` | Admin |
| `/schema` | `/database`, `/firestore` | Visor del esquema de datos | `src/components/schema/DatabaseSchemaViewer.tsx` | Admin |
| `/multiview` | `/master` | Director + teléfono de audiencia en una vista | inline en `App.tsx` | Admin. A quien no es admin le muestra `/play` (con pase). |

### Secciones del Summit (`SummitSectionKey`)

La columna "Pase" indica lo que pide un SGX Pass forjado.

| Ruta limpia | Alias | Sección | Pilar · módulo | Componente | Pase |
|---|---|---|---|---|---|
| `/pilares` | `pillars`, `manifesto`, `manifiesto`, `sgx_pillars` | `PILLARS_MANIFESTO` | Story 01.1 | `SgxPillarsManifestoSection.tsx` | No |
| `/social` | `stream`, `feed`, `comunidad`, `instagram`, `social_stream` | `SOCIAL_STREAM` | Story 01.2 | `LiveSocialStream.tsx` | No (publicar pide sesión) |
| `/avatar` | `highbot` | `AVATAR_STUDIO` | Story 01.3 | `PilotBuilderModal.tsx` → `PilotBuilder.tsx` | **Sí** (`avatar`) |
| `/mapa` | `map`, `venue`, `360`, `tour`, `chroma`, `map_360` | `MAP_360` | Showcase 02.1 | `SgxChromaArrival.tsx` + `Summit360MapViewer.tsx` | **Sí** (`tour360`) |
| `/sponsors` | `patrocinadores`, `marcas`, `alianzas`, `brands`, `sponsors_hub` | `SPONSORS_HUB` | Showcase 02.2 | `SummitSponsorshipMatrix.tsx` (+ `sponsors/*`) | No |
| `/modelos-3d` | `modelos`, `models` | `MODELS_3D` | Showcase 02.3 | `SgxModelsViewer.tsx` | No |
| `/patrocina` | `patrocinar`, `sponsor` | `SPONSOR` | Showcase 02.4 | `SummitSponsorInquiryForm.tsx` | Para enviar (`ForgeFirst`) |
| `/juegos` | `games`, `dron`, `drone`, `simulador`, `embeds`, `embeds_games` | `EMBEDS_GAMES` | Spark 03.1 | `SummitEmbedsHub.tsx` | **Sí** (`games`) |
| `/tienda` | `recompensas`, `rewards` | `REWARDS` | Spark 03.2 | `SummitRewardsStoreModal.tsx` | No para mirar; canjear necesita XP |
| `/agenda` | `schedule`, `cronograma`, `runofshow`, `itinerario`, `programa`, `timeline` | `AGENDA` | Stage 04.1 | `SummitRunOfShowTimeline.tsx` / `SummitAgendaBuilder.tsx` | No |
| `/broadcast` | `salas`, `salones`, `rooms`, `streaming`, `broadcast_rooms` | `BROADCAST_ROOMS` | Stage 04.2 | inline en `SummitLandingPage.tsx` | No |
| `/speakers` | `speaker`, `ponentes`, `conferencistas`, `oradores`, `artistas` | `SPEAKERS` | Stage 04.3 | `SummitSpeakersDeck.tsx` | No |
| `/portal-speakers` | `speaker-portal` | `SPEAKER_PORTAL` | Stage 04.4 | `SummitSpeakerPortalModal.tsx` | Para enviar (`ForgeFirst`) |
| `/prensa` | `press`, `media`, `sala-de-prensa`, `kit-de-prensa`, `press-kit`, `acreditacion` | `PRESS` | Stage 04.5 | `press/SgxPressRoom.tsx` | Para acreditarse |
| `/visitas` | `visits`, `radar`, `visitantes` | `VISITS` | System 05.1 | `SummitVisitRadar.tsx` (+ `SgxVisitGlobe.tsx`) | No |
| `/pase` | `sgx-pass`, `pass`, `hangar`, `estudio`, `studio`, `credencial(es)`, `credential(s)`, `credential-generator`, `holo`, `holocard`, `holo-card` | `CREDENTIAL_GENERATOR` (Tu Estudio) | System 05.2 | `SgxHangar.tsx` (`asPage`) | Sin pase muestra la invitación a forjar |
| `/escaner` | `scanner`, `rolodex` | `PASS_SCANNER` | System 05.3 | `NetworkingQrScannerModal.tsx` | No para abrir; el intercambio pide pase |
| `/terminal` | — | `TERMINAL` | System 05.4 | `src/immersion/CommandTerminal.tsx` | No |
| `/match` | `sgx_match`, `entrepreneur_match`, `speed_pitch`, `citas`, `pitch`, `matchmaking` | `ENTREPRENEUR_MATCH` | Synthesize 06.1 | `src/modules/match/MatchModule.tsx` | **Sí** (`match`) |
| `/networking` | `foros`, `forums`, `chat`, `comunidades` | `NETWORKING` | Synthesize 06.2 | `SummitNetworkingChat.tsx` | **Sí** (`networking`) |
| `/guild` | `initiates`, `iniciados`, `cohorte`, `cohort`, `sgx_guild` | `GUILD` | Synthesize 06.3 | `SgxGuildShowcaseSection.tsx` | No |
| `/pilar/<slug>` | `pillar`, `estacion`, `station` (+ slug) | `PILLAR` | página de cada pilar | `SgxPillarStation.tsx` | No |
| `/bienvenida` y `/bienvenida/<rol>` | `welcome` | `WELCOME` | portal de bienvenida | `welcome/SgxWelcomePage.tsx` | No |

Notas:

- Slugs de pilar: `story`, `showcase`, `spark`, `stage`, `system` (también `systems`) y `synthesize`.
- Roles de `/bienvenida/<rol>`: `visitante`, `speaker`, `sponsor`, `prensa` y `equipo`. Tienen alias como `creador`, `artista`, `marca`, `medios`, `staff` o `team` (`ROLE_ALIASES` en `src/lib/welcomePortal.ts`).
- Los módulos que antes abrían como diálogo ahora son páginas (`SgxModulePage.tsx`): Avatar Studio, Tienda, Escáner, Terminal, Modelos 3D, Patrocina y Portal de speakers. Al salir, vuelven a la sección o pilar de donde vino el Creador.

### Parámetros de URL que hacen algo

| Parámetro | Dónde | Efecto |
|---|---|---|
| `?pase=<token>` | cualquier ruta | Es el QR del SGX Pass de otra persona: abre "añadir este contacto" (`parsePassQr`, `src/identity/sgxIdentity.ts`) |
| `?checkin=<código>` | `/` | El QR de la puerta de Chroma: hace el check-in del Día 3 (`SgxPassHost.tsx`) |
| `?checkinTest=1` | con `checkin` | Ensayo local: abre la ventana del Día 3 sin dar el sello ni el XP |
| `?estudio=pass\|day3\|reactor\|red` | `/` | Abre Tu Estudio en esa pestaña (lo usan los botones de los correos y el atajo de la PWA). `?hangar=` también funciona. |
| `?day=1\|2\|3`, `?subtab=`, `?view=` | agenda y otras | Día y vista |
| `?pillar=<slug>` | `/`, `/pilares`, `/play`, `/stage` | Tema y pilar del motor en vivo |
| `?embed=true` | cualquiera | Se salta el arranque y oculta la capa de inmersión |
| `?clean=1`, `&transparent=1`, `&hud=0` | `/stage` | Para OBS: sin botones, fondo transparente o sin HUD |
| `?n=&s=&d=&h=&t=&p=&k=` | `/bienvenida/<rol>` | Invitación personalizada (sección 11) |
| `?source=pwa` | atajos del manifest | Solo marca de origen |

### Fuera del SPA

| Ruta | Qué |
|---|---|
| `/api/*` | REST del motor y del Highbot (sección 7 y sección 8) |
| `/ws` | WebSocket del motor en vivo |
| `/healthz` | Sonda de salud |
| `/press/*` | Kit de prensa estático (`public/press/`) |
| `/sitemap.xml`, `/robots.txt` | SEO. `robots.txt` excluye `/admin` y `/api/`. |

---

## 4. Página por página

### Controles que se ven siempre

**Header** (`src/components/common/HeaderNav.tsx`):

- el logo, que lleva al inicio;
- la tarjeta del sponsor del momento (`TransientSponsorSlot`) con "Patrocina el Summit";
- idioma ES/EN, sonido y **FX/Ligero**;
- el chip del Creador (`AccountMenu`: Tu Estudio, pase, sesión Google; "FORJAR PASE" si no tiene);
- compartir/copiar enlace y el **Menú** (los 6 pilares con todos sus módulos);
- para admins, "Herramientas de administración" (Panel, Módulos y visibilidad, Analíticas).

**En el teléfono**, `SgxMobileDock` pone una barra al alcance del pulgar con Núcleo, Agenda, Pase/Forjar, Reactor y Menú. Con el dock en pantalla, el header no repite su botón de Menú.

**Capa de inmersión** (`src/immersion/ImmersionLayer.tsx`):

- `MissionRail`: el riel "Misiones x/N", que abre el Reactor;
- toasts de XP (`HudToasts`) y "Presentado por" (`SponsorXpPop`);
- celdas de energía escondidas (`EnergyCell`) y la barra de energía con Overdrive;
- la terminal (`Ctrl/Cmd+K`, `/` o `` ` ``) y los efectos (`ImmersionFX`).

**Atajos de teclado**: `1–6` estaciones de pilar · `0` núcleo · `P` pulso · `M` audio · `F` modo escenario · `/` terminal · `Esc` salir. No responden mientras se escribe ni mientras el dron vuela (`body[data-sgx-game]`).

**Otros elementos fijos:**

- La cabecita del Highbot (`CompanionDock`) en la esquina inferior derecha, en todas las páginas menos `/stage`, `/multiview`, `/admin`, `/analytics` y `/schema`.
- El **Pulso en vivo** (`KeynotePulseReactions.tsx`), solo durante los días del Summit: reacciones y la encuesta del keynote (`summit_poll_votes`).
- Los **anuncios** del equipo (`site_config/announcement`): toast en todas las páginas (`SummitPushAlertToast`).
- La **cinta de sponsors** (`SummitSponsorTicker`) sobre las secciones, el **banner** de cada sección (`SummitSectionBanner`) y la **barra HUD** de sección (`SgxSectionHudBar`).
- Las secciones con `FeatureStatus` `MAINTENANCE` o `DISABLED` (en `site_config/feature_toggles`) muestran `SgxStandby` ("Señal en espera") en vez del módulo.

### Arranque y primera visita

- **`SgxBootSequence.tsx`** (~5 s, una vez por sesión, se salta con una tecla o un toque): un enjambre de partículas arma el logo del Summit, que se enciende con una onda. Aparecen "Spatialgineers LLC presenta", el wordmark y la fila de partners de Paquete 3 en adelante, con los lugares "Tu marca aquí" abiertos.
- **Modo calma** (`src/immersion/calmMode.ts`): el primer pantallazo muestra solo el núcleo y el hero (`SgxHeroOverlay.tsx`), con:
  - "Regresa el Spatialgineers Summit · segunda edición";
  - "11–13 dic 2026 · YouTube Live + San Juan, PR";
  - la cuenta regresiva;
  - los botones "Forjar mi pase" (o "Ver mi pase") y "Explorar el núcleo".

  El HUD llega con la primera interacción. El título del hero lo dibujan partículas que salen del núcleo, una vez por sesión (`ParticleForm.tsx`).
- La Forja no bloquea: se abre desde el hero, el dock o el header.

### Núcleo 3D (`/`)

**Archivos:** `src/components/summit/SgxOrbitalCore3D.tsx` (~2300 líneas), `SummitExperienceHub.tsx`, `SgxClocksBanner.tsx`, `SgxCoreDrawer.css`, `src/immersion/shaders/coreFx.ts` y `effects.ts`.

**Qué es:** una escena Three.js con el ícono SGX (`SGX Icon.glb`) al centro, los seis pilares (`.glb` optimizados del CDN) en anillo, pedestales con haces de luz, cuatro estaciones de sponsors en el arco de atrás, el Highbot del Creador girando alrededor y el emblema del SGX Guild dando vueltas alto y lento.

**Qué puede hacer el Creador:**

- Tocar un pilar: la cámara va hacia él y abre su panel ("Qué cubre", módulos, "Visitar pilar"). En el teléfono el panel es una hoja inferior; en escritorio va al lado.
- Usar la barra del núcleo:
  - la fecha y los relojes del Summit;
  - las visitas totales (`VisitCounterChip`);
  - "Ver Run of Show y Agenda de 3 Días";
  - "Toca un pilar 3D" / "Explorar";
  - Ajustes: girar o pausar el núcleo, zoom, restablecer la vista, navegar sponsors 3D (4 áreas), modo inmersión total y modo ligero.
- Tocar una estación de sponsor: la cámara viaja y abre la ficha de la marca (+25 XP, una vez por estación).
- Encontrar los orbes SGX (+25 XP cada uno) y el logo del Guild (+50 XP, una vez).
- Girar la cámara: cumple la misión "Inicia el núcleo" (quest `q_core_boot`).

**Técnica:**

- Post-proceso con bloom, tone mapping y un pase de grade (aberración cromática, grano y viñeta).
- Calidad adaptativa: pasados 2.5 s mide 90 cuadros. Si superan 24 ms baja el pixel ratio; si superan 30 ms apaga el bloom.
- Piso de shader con ondas al fijar un pilar o ganar XP, haces de energía núcleo→pilar y una capa fresnel en el núcleo.
- La cúpula de "humo" toma el color del pilar que pasa frente a la cámara.
- Un vuelo de entrada, una vez por sesión (se salta al tocar y no corre con movimiento reducido).
- Sin WebGL o en modo ligero, el núcleo no carga.

**Datos:** los pilares vienen de `src/lib/sgxPillars.ts`, los sponsors aprobados de `summit_content/approved_sponsors` y los check-ins de Chroma de `summit_checkins`.

**Pie:** `SummitCoreFooterBar` (privacidad y contacto).

### Páginas de pilar (`/pilar/<slug>`)

**Archivos:** `SgxPillarStation.tsx`, más los datos de `src/lib/sgxPillars.ts`, `src/lib/sgxPortfolio.ts` y `pillar_showcase` (admin "Pilares: casos y proyectos").

**Qué muestra:**

- el selector de los seis pilares arriba;
- el título, la frase y lo que cubre el pilar;
- su programa en el Summit (los `program` de cada pilar por día);
- casos de uso y proyectos de Spatialgineers del pilar;
- sus módulos, con captura de vista previa (`public/previews/<key>.webp`, generadas con `scripts/make-previews.cjs`);
- el equipo del Guild del pilar (Storytellers, Showcasers, Sparkers, Stagers, Systematizers, Synthesizers).

Entrar a las seis estaciones cumple la quest "Los Seis Pilares".

**Colores oficiales:**

| Pilar | Color |
|---|---|
| Story | `#32527B` |
| Showcase | `#00DDFF` |
| Spark | `#B87000` |
| Stage | `#FDCC0D` |
| System | `#888888` |
| Synthesize | `#FFFFFF` |

`pillarInk()` aclara el azul y el cobre cuando se usan como texto, para que cumplan contraste.

### SGX.Story

| Módulo | Qué es y qué se hace | Datos | Pase | XP / misión | Archivo |
|---|---|---|---|---|---|
| **01.1 Manifiesto de los 6 pilares** (`/pilares`) | El SGX Framework y la historia de cada pilar, con casos reales | estático (`sgxPillars`, `sgxPortfolio`) | No | "Lee el manifiesto" 60 XP | `SgxPillarsManifestoSection.tsx` |
| **01.2 Radar social** (`/social`) | Las historias de la comunidad con #SpatialgineersSummit. Embeds de Instagram/X/Threads/TikTok, publicar, me gusta y comentar. El admin importa publicaciones en lote. | `social_posts` | Publicar pide sesión | — | `LiveSocialStream.tsx`, `InstagramEmbedCard.tsx`, `src/lib/realSocialStreamApi.ts`, `InstagramRadarWall.tsx`, admin `BulkInstagramImportModal.tsx` e `InstagramRadarPanel.tsx`, servidor `src/server/social/instagramRadar.ts` |
| **01.3 Avatar Studio** (`/avatar`) | Arma tu Highbot (ver la sección 5) | el pase local más `ticket_inquiries.avatar` | **Sí** | "Diseña tu Highbot" 80 XP | `PilotBuilderModal.tsx`, `PilotBuilder.tsx`, `SgxPilot3D.tsx`, `pilotAvatar.ts`, `highbot3d.ts`, `highbotGear.ts`, `highbotStudio.ts` |

### SGX.Showcase

| Módulo | Qué es y qué se hace | Datos | Pase | XP / misión | Archivo |
|---|---|---|---|---|---|
| **02.1 Recorrido 360° de Chroma Space Studios** (`/mapa`) | Primero, la animación de llegada: pases que forman "Chroma Space Studios · Día 3". Luego, el recorrido 360° por nodos (sets, escenario, networking) con hotspots. | `summit_content/map_nodes` (admin "Mapa 360") | **Sí** | "Recorre Chroma Space Studios" 60 XP; +30 XP por cada punto 360° la primera vez | `SgxChromaArrival.tsx`, `Summit360MapViewer.tsx` |
| **02.2 Partners & Brand Showcases** (`/sponsors`) | Hero para marcas, muro de partners confirmados (cada logo abre su showcase), "Dónde aparece tu marca", los Paquetes 1–5, **Términos y logística** (`/sponsors#terminos`: pago, IVU, materiales, categorías, licencia y reporte de los Paquetes 4 y 5, cancelación, fuerza mayor, Día 3 y contrato), el proceso y las preguntas frecuentes | `summit_content/approved_sponsors`, `sponsorship_tiers` | No | "Visita el pabellón de partners" 60 XP; cada partner de Paquete 3+ suma "Reto <marca>" 90 XP y su sello | `SummitSponsorshipMatrix.tsx`, `SummitSponsorsGrid.tsx`, `SummitBrandShowcaseModal.tsx`, `sponsors/SponsorsHero.tsx`, `SponsorTiers.tsx`, `SponsorTerms.tsx`, `SponsorPlacements.tsx`, `SponsorProcess.tsx`, `sponsorPlacements.ts`, `src/lib/sponsorTerms.ts` |
| **02.3 Modelos 3D** (`/modelos-3d`) | El ícono de Spatialgineers, el emblema del Guild, las seis esculturas de pilar y el Highbot en un visor con la luz del estudio. Se arrastra para girar y se pellizca para acercar. | `.glb` del CDN | No | — | `SgxModelsViewer.tsx` |
| **02.4 Patrocina el Summit** (`/patrocina`) | Solicitud de paquete (sección 9) | crea `sponsor_inquiries` | Para enviar | — | `SummitSponsorInquiryForm.tsx` |

### SGX.Spark

| Módulo | Qué es y qué se hace | Datos | Pase | XP / misión | Archivo |
|---|---|---|---|---|---|
| **03.1 Juegos y laboratorios** (`/juegos`) | Hub de apps embebidas: juegos nativos, HTML en sandbox, sitios enmarcados o enlaces | `summit_content/embeds` (admin "Apps embebidas") | **Sí** | "Juega en el Spark" 60 XP | `SummitEmbedsHub.tsx`, `EmbedArt.tsx` |
| · Dron SGX | Una corrida de 60–90 s por tres zonas de San Juan. La "Ruta del día" tiene semilla y es igual para todos ese día. Anillos en los colores de los pilares con combo, cajas de partners, minas, cuatro poderes y batería. Ranking propio. | récord del día en el equipo; ranking `DroneRanking` sobre `pilot_leaderboard` | Sí | "Ruta de los 6 pilares" (secreta) 150 XP | `SummitDroneMiniGame.tsx`, `drone/*` |
| · Torre de Pilares | Apilar losas: lo que sobresale se corta, los aciertos perfectos hacen combo y hay losas de poder. Los seis pilares en orden pagan un bono. | `game_scores/stack` | Sí | "Torre de los 6 pilares" 120 XP | `games/stack/*` |
| · Pulso SGX | Juego de ritmo sobre la canción del Summit (`public/games/pulse/spatialgineers-summit.mp3`), con notas por análisis de audio y ranking top 10 | `game_scores/pulse` | Sí | "Pulso perfecto" (nota S o combo completo) 120 XP | `games/pulse/*` |
| · Rayo en tus manos | Pellizca para cargar un rayo SGX y suelta para dispararlo a glifos sobre tu cámara (MediaPipe). Sin cámara se juega con toque, mouse o teclado. | `game_scores/bolt` | Sí | "Derriba al Jefe SGX" 150 XP | `games/bolt/*`, `public/games/bolt/hand-worker.js` |
| **Arena de votación en vivo** (`/play`) | Ver la sección 7 | motor WS | **Sí** | "Juega en el Spark" también se cumple aquí | `AudiencePWA.tsx` |
| **Reactor de misiones** (acción `sgx:open_passport`) | Un pop-up con las misiones por pilar; cada misión tiene un botón que lleva a donde se hace | local más `players` | — | ver la sección 6 | `SgxHangar.tsx` (`reactorOnly`), `src/identity/reactor.ts` |
| **03.2 Tienda del Reactor** (`/tienda`) | Gastar XP en premios sin bajar de rango, ver el ranking del fin de semana y los vales propios | `gamification_rewards`, `redeemed_prizes` | Canjear | — | `SummitRewardsStoreModal.tsx`, `src/lib/rewardsStore.ts` |

### SGX.Stage

| Módulo | Qué es y qué se hace | Datos | Pase | XP / misión | Archivo |
|---|---|---|---|---|---|
| **04.1 Run of Show** (`/agenda`) | Dos vistas: **Línea de tiempo** (el programa minuto a minuto por día, con detalle de cada sesión) y **Mi Agenda** (guardar sesiones). **Alertar** baja un `.ics` con aviso 15 min antes o abre una plantilla de Google Calendar; también exporta toda la agenda guardada. Filtros por pilar y formato. | `summit_content/sessions` (default `src/lib/summitProgram.ts`) | No | "Arma tu Run of Show" 60 XP | `SummitRunOfShowTimeline.tsx`, `SummitAgendaBuilder.tsx` |
| **04.2 Salas de transmisión** (`/broadcast`) | Tarjetas de sala: EN VIVO con el embed de YouTube, o inactiva. Sin salas sale "Señal en espera". | `tenants` (salas del tenant, admin "Marca y tenants") | No | "Sintoniza una sala" 60 XP | `SummitLandingPage.tsx`, admin `TenantRoomManager.tsx` |
| **04.3 Speakers & artistas** (`/speakers`) | Un deck con solo los confirmados por escrito; cada tarjeta abre la ficha y su Holo Card | `summit_content/speakers` | No | "Conoce el line-up" 60 XP | `SummitSpeakersDeck.tsx`, `SgxHoloViewer.tsx` |
| **Escenario en vivo** (`/stage`) | Ver la sección 7 | motor WS | No | — | `StagePage.tsx` |
| **04.4 Portal de speakers** (`/portal-speakers`) | Solicitud propia (sección 9) con la **Guía del speaker** (antes de enviar, después de enviar y, ya aprobado, como próximos pasos). Cierra sola después del 21 nov. | crea `speaker_submissions` | Para enviar | — | `SummitSpeakerPortalModal.tsx`, `speakers/SpeakerGuide.tsx`, `src/lib/speakerGuide.ts` |
| **04.5 Sala de prensa** (`/prensa`) | Acreditación, la ficha del Summit, las biografías de los fundadores y el kit de descargas (sección 9) | crea `sponsor_inquiries` con `selectedTierId: "PRESS"`; datos de `src/lib/pressKit.ts` | Para acreditarse | — | `press/SgxPressRoom.tsx`, `src/lib/pressRequests.ts` |

### SGX.System

| Módulo | Qué es y qué se hace | Datos | Pase | XP / misión | Archivo |
|---|---|---|---|---|---|
| **05.1 Radar de visitas** (`/visitas`) | Desde dónde visitan la app, en vivo: mapa de PR por municipio (Leaflet), globo 3D con arcos hacia Chroma (globe.gl), contadores y leaderboards de regiones. Solo guarda la región aproximada, nunca la IP. La región se pide a `get.geojs.io` o `ipapi.co`. | `summit_visit_stats`, `summit_visit_regions`, `summit_visitors`, `summit_checkins` | No | "Lee el radar" 60 XP | `SummitVisitRadar.tsx`, `SgxVisitGlobe.tsx`, `visitRadarStore.ts`, `src/lib/visitTracker.ts`, `src/lib/prMunicipios.ts`, `public/data/*.geojson` |
| **05.2 SGX Pass / Tu Estudio** (`/pase`) | Ver la sección 5 | local más Firestore | Sin pase invita a forjar | "Holo Card" 60 XP | `SgxHangar.tsx`, `SgxHoloStudio.tsx` |
| **05.3 Escáner de pases & Rolodex** (`/escaner`) | Escanear con la cámara (jsQR), mostrar el QR propio y una libreta privada de contactos que se exporta como `.vcf` o CSV | `summit_pass_exchanges`, local | El intercambio pide pase | "Intercambia pases" 100 XP; +50 XP por cada contacto nuevo | `NetworkingQrScannerModal.tsx`, `src/identity/passNetwork.ts` |
| **05.4 Terminal de mando** (`/terminal` o `Ctrl+K`) | Navegar escribiendo: busca secciones, pilares y comandos ("ayuda"). Acepta códigos secretos (`wepa`, `highgineer`, `lightningfingers`, `technocore`, `borikua`) y el código Konami. | local | No | "Terminal de mando" 40 XP; quests secretas | `src/immersion/CommandTerminal.tsx`, `quests.ts` |

### SGX.Synthesize

| Módulo | Qué es y qué se hace | Datos | Pase | XP / misión | Archivo |
|---|---|---|---|---|---|
| **06.1 SGX.Match** (`/match`) | Conecta creadores y marcas. Asistente de perfil, un deck para pasar o conectar, "mis matches", la hoja de conexión y reportes. Un match nace cuando los dos conectan. | `match_profiles`, `match_intents`, `match_passes`, `matches`, `match_reports` | **Sí** | "Entra a SGX.Match" 60 XP; bonos propios (+250 XP de squad al llegar a 3 matches) | `src/modules/match/*` |
| **06.2 Foros & chat** (`/networking`) | Salas por tema, preguntas para speakers y código. Reacciones con emoji. El admin fija y modera. | `chat_messages` | **Sí** | — | `SummitNetworkingChat.tsx` |
| **06.3 SGX Guild Initiates** (`/guild`) | Los 8 Initiates activos y sus portafolios; cada uno tiene su Holo Card oficial | `summit_content/initiates` | No | — | `SgxGuildShowcaseSection.tsx` |

El SGX Guild es un privilegio: no hay convocatoria abierta, y la app celebra a sus miembros sin reclutar. Un Initiate también puede pedir su credencial desde el pase (`initiate_requests`), y el admin la aprueba en "Guild Initiates".

### Páginas sueltas

| Página | Qué es | Archivo |
|---|---|---|
| **Agenda / Run of Show** | La misma `/agenda` (SGX.Stage 04.1). El programa base de 3 días está en `src/lib/summitProgram.ts`; el admin lo edita y publica (`summit_content/sessions`). El bloque del Día 3 de 2:00 a 3:30 p.m. es **Entrepreneurship Match** (`d3_05`, según el Run of Show del 25 oct): si la agenda ya estaba publicada en Firestore con "Interacción libre", se edita aquí (Contenido → Agenda). | ver arriba |
| **Bienvenida** (`/bienvenida[/rol]`) | Ver la sección 11 | `welcome/SgxWelcomePage.tsx` |
| **Sala de prensa** (`/prensa`) | Ver la sección 9 | `press/SgxPressRoom.tsx` |
| **Play / Arena** (`/play`) | Ver la sección 7 | `AudiencePWA.tsx` |
| **Stage** (`/stage`) | Ver la sección 7 | `StagePage.tsx`, `StageHud.tsx` |
| **Admin** (`/admin`) | Ver la sección 10 | `AdminDashboard.tsx` |
| **Multiview** (`/multiview`) | Solo admins: consola del director a la izquierda y un teléfono de audiencia simulado a la derecha | `App.tsx` |
| **Política de privacidad** | Modal desde el pie | `SummitPrivacyPolicyModal.tsx` |

---

## 5. Identidad y SGX Pass

### Datos y almacenamiento

- El pase local es `sgx_identity_v1` (`src/identity/sgxIdentity.ts`): código, nombre, `callsign`, email, tipo (`DIGITAL` o `SHOWCASE`), afinidad de pilar, avatar, contactos, misiones, sellos y canjes.
- Contexto: `SgxIdentityContext.tsx` (forjar, misiones, check-in, intercambio). Host de diálogos y parámetros de URL: `SgxPassHost.tsx`.
- En el servidor:
  - `ticket_inquiries/{códigoDelPase}` guarda el registro: nombre, email, organización, rol, tipo, afinidad, consentimiento de imagen, estado y el Highbot como JSON de hasta 3000 caracteres.
  - `pass_emails/{sha256(email)}` → `{ code, userId }` hace cumplir **un pase por email** sin guardar el email.
- XP, nivel y logros: `PilotProfileContext.tsx`. Escribe `pilot_profiles/{uid}` con debounce y, al cargar, fusiona con `Math.max`. Mantiene `pilot_leaderboard/{uid}`.

### La Forja, paso a paso (`src/identity/SgxForge.tsx`)

Pasos: `intro → name → pillar → pilot → print → done`.

1. **Intro.** Explica para qué sirve el pase: Días 1 y 2 por YouTube Live; Día 3, si te invitan, este mismo QR es tu entrada; cada pilar completado deja un sello.
   - **"Continuar con Google"** (recomendado): llena el nombre y el correo, y el pase sigue al Creador a cualquier dispositivo. Si esa cuenta ya tiene un pase, la Forja lo encuentra y lo trae solo ("Encontramos tu pase…").
   - "Seguir sin cuenta" o "Ahora no".
2. **Identifícate.** Nombre completo, correo, organización y rol (opcionales) y "¿Cómo vives el Summit?":
   - "Digital global";
   - "Día 3 presencial" (por invitación, cupo limitado).

   El **consentimiento de imagen** es obligatorio. Al seguir, la Forja revisa el correo en `pass_emails`:
   - libre: sigue;
   - es tuyo: reusa tu código;
   - es de otra persona: "Este correo ya tiene un SGX Pass. Entra con Google con ese correo…".
3. **Afinidad.** "¿Qué pilar te mueve?": uno de los seis. Define el color del pase y del Highbot.
4. **Tu Highbot.** El constructor en modo compacto ("Lo puedes cambiar cuando quieras desde tu Estudio").
5. **Print.** La animación de impresión del pase (vidrio holográfico en el color del pilar).
6. **Done.** "Pase forjado": "Abrir mi Estudio", "Canal de YouTube", "Seguir explorando".

Al forjar:

- se crea `ticket_inquiries/{code}` con estado `PENDING` y se reclama `pass_emails`;
- se cumple "Forja tu SGX Pass" (120 XP);
- el mailer manda "Tu SGX Pass está forjado".

Para **editar** los datos se usa la misma Forja, en modo `editing`: un solo formulario, mismo código.

### Roles y cómo se otorgan

La **Holo Card ES el SGX Pass**: una sola tarjeta. Todos forjan primero; desde el pase se pide un rol (`SgxRoleRequests.tsx`, "Tu rol en el Summit"). Mientras el equipo no apruebe, el rol sale "En revisión" (`sgx_pending_credentials_v1`, en el equipo). Al aprobar, el admin escribe `credential_grants/{uid}.<rol>` y la misma tarjeta cambia de banda y talón (`src/identity/credentials.ts`).

| Rol | Etiqueta | Banda de la Holo Card | Cómo se pide | Quién aprueba |
|---|---|---|---|---|
| `visitor` | Creador | — | Forjar el pase | automático |
| `speaker` | Speaker | SPEAKER OFICIAL · SGX STAGE | Portal de speakers (`speaker_submissions`) | Admin → Inscritos y Día 3 ("Publicar") |
| `sponsor` | Sponsor | SPONSOR OFICIAL · SUMMIT 2026 | Formulario de Patrocina (`sponsor_inquiries`) | Admin → Sponsors (aprobar crea el showcase) |
| `initiate` | Initiate | SGX GUILD · INITIATE 2026 | La lista del equipo con su email privado (`summit_private/initiate_emails` más `initiate_claims/{email}`), o la solicitud desde el pase (`initiate_requests`) | Admin → Guild Initiates. Quien entra con Google con ese email lleva la tarjeta de Initiate. |
| `press` | Prensa | PRENSA ACREDITADA · SUMMIT 2026 | Sala de prensa (`sponsor_inquiries` con `PRESS`) | Admin → Prensa (también invita al Día 3) |

### Holo Card

**Archivos:** `SgxHoloStudio.tsx` (Holo Card Studio), `holoCardCanvas.ts` (dibujo en canvas) y `SgxHoloViewer.tsx` (la de otra persona, solo lectura).

**Frente:** la ventana con el retrato (siempre el Highbot), el pilar bajo la ventana y la columna de datos según el rol. Por ejemplo, el Initiate lleva "SGX GUILD · PRE-SHOWCASE · 2:30–4:00 PM", y la prensa lleva "DÍAS 1–2 YOUTUBE LIVE · DÍA 3 CHROMA · ACCESO 3 DÍAS". Cada tarjeta muestra el chip "EN REVISIÓN" u "OFICIAL/ACREDITADO", el nombre, cargo y organización, y los días que le tocan.

**Reverso:** el QR del pase, que sirve de entrada al Día 3, tarjeta de contacto y ficha de premios.

**Formatos:**

| Formato | Uso |
|---|---|
| **Tarjeta 3D** | Con inclinación y brillo de foil que sigue la inclinación; el botón "Reverso/Frente" la voltea |
| **Post 4:5** | Para redes |
| **Story 9:16** | Para redes |

Los formatos de redes llevan el título "SPATIALGINEERS SUMMIT 2026", la línea "11–13 DIC · YOUTUBE LIVE · DÍA 3 CHROMA SPACE STUDIOS" y el pie "summit.spatialgineers.com · #SpatialgineersSummit".

**Controles:**

- la intensidad del foil y tres fondos;
- **Descargar** (PNG, a doble escala para la tarjeta);
- **Compartir** (Web Share con archivo).

Exportar cumple "Holo Card" (60 XP) y registra +150 XP de actividad, una vez.

### Tu Estudio (`SgxHangar.tsx`)

Es la página personal del Creador (`/pase`), y el modal desde el chip. Su cabecera muestra el XP total, el XP para gastar y el rango.

| Pestaña | Qué tiene |
|---|---|
| **Pase** | La Holo Card y su estudio, el QR, "Pase en PDF" (`passPdf.ts`, jspdf), "Copiar código", "Escanear pase", editar datos y "Tu rol en el Summit" |
| **Tu Highbot** | El Highbot en 3D (se arrastra para girar), el chat con el Highbot (`CompanionStudio.tsx`) y las estadísticas en vivo (votos, reacciones, XP) con "Ir a SGX Live" |
| **Reactor x/N** | Las misiones por pilar con sus sellos (sección 6) |
| **Red N** | La constelación de contactos (`SgxConstellation.tsx`, `constellation.ts`): estrellas por pilar. Los seis pilares dan "Red completa". |
| **Rolodex N** | Los pases escaneados ("te escaneó" / "escaneado"), "Escanear un pase" y "Exportar vCard" |
| **Día 3** | "Tu pase es la llave del Día 3": el QR de entrada, "Hacer check-in" (o "Check-in abre el 13 de diciembre"), el sello "PRESENTE EN CHROMA", el bloque de networking (1:00–2:00 PM), premios y códigos de canje |
| **Telemetría** | La bitácora de actividad, el leaderboard de creadores y el enlace al radar |

### Constructor del Highbot

**Archivos:** `PilotBuilder.tsx`, `pilotAvatar.ts`, `highbotGear.ts` y `highbot3d.ts`.

Todo Highbot es Highcoon en forma de robot: siempre lleva las orejas y los bigotes, el antifaz y la nariz.

**Pestañas:** `bots · parts · face · plates · colors · texture`.

| Pestaña | Opciones |
|---|---|
| **Bots (presets)** | Highbot, Narrador · Story, Curador · Showcase, Gamer · Spark, Performer · Stage, Ingeniero · System, Conector · Synthesize y Creador Dorado |
| **Piezas** | Banda de la cabeza, discos laterales y detalles del pecho (opcionales). Un accesorio de cabeza a la vez: audífonos, headset con mic, antena, antena rayo SGX, halo, halo engranaje SGX, aletas mecha, diadema LED, auricular rayo, ícono SGX flotante. Agrupados por dónde se enganchan: sockets laterales, botón de arriba, sobre y detrás de la cabeza. Visor: VR clásico, VR slim, gafas AR, visor MR, visor gaming, goggles, banda LED, T-visor mecha. |
| **Cara** | Párpados (la expresión): High, Medio, Bajo, Sospechoso, Chill |
| **Placas** | El pilar en el pecho (logo en el engrane o pilar grande al centro) y un emblema 3D extra (sin emblema, núcleo en la espalda, compañero alrededor del cuerpo o punta de antena) |
| **Colores** | Por grupo (cuerpo, detalles, articulaciones, antifaz, ojos, zapatos), con paletas de la marca |
| **Textura** | Motivo grabado en el torso: liso, engranajes SGX, engranaje G, rayos SGX, panel HUD, holodeck, red de energía, líneas de energía, circuito, escudo hex, zigzag SGX, logo del Summit. Tinta grabada, de acento o de luz. Tamaño fino, medio, grande o XL. |

**Acciones:** "Sorpresa", "Variar" y "Deshacer". Hay una vista 2D/3D.

**Dónde aparece:**

- **En 3D**: en Tu Estudio, girando alrededor del núcleo (`pilotOrbit3D.ts`) y en Modelos 3D. Todos los Highbots usan la misma luz de estudio (`highbotStudio.ts`).
- **En 2D toon con contorno negro** (`SgxPilotGlyph.tsx`, `highbotPortrait.ts`): en el header, el chat, el pase y la Holo Card.

Diseñarlo cumple "Diseña tu Highbot" (80 XP). Queda guardado en `ticket_inquiries.avatar`, así que vuelve con el pase restaurado.

### Cuentas, recuperación y un pase por email

`src/identity/accountSlots.ts` guarda **un slot por cuenta**. El pase, el XP, el avatar, el Rolodex y la agenda viven en `localStorage`, en la lista de `ACCOUNT_KEYS`:

- Al cambiar de cuenta o cerrar sesión, guarda los datos bajo su dueño, carga el slot de la otra cuenta y recarga. La recarga pasa por el guardia de recargas (`src/lib/reloadGuard.ts`): un cambio que el Creador pidió (entrar o salir, marcado con `markAccountAction`) siempre recarga; uno automático (por ejemplo, la sesión de Google que no carga al abrir) solo si no hubo otra recarga automática en la sesión, y si no, no cambia nada y se reintenta la próxima vez. Otra pestaña que cambia de cuenta hace que esta deje de escribir y recargue una vez.
- Un invitado anónimo que entra con Google conserva su progreso. La excepción es una cuenta que ya tiene su propio pase en el servidor: entonces el pase de invitado queda guardado aparte y la Forja ofrece traer el de la cuenta.
- Los ajustes del dispositivo (idioma, audio, modo ligero) se comparten entre cuentas.

**Recuperar en otro equipo:** se entra con Google con el mismo email y el pase, el Highbot y el progreso aparecen solos (`findMyRegistration`, `checkEmailClaim` en `passNetwork.ts`). También funciona con un pase forjado como invitado, si el email de Google es el mismo (verificado).

### Pase sin conexión

`public/sw.js` guarda en caché:

- al instalarse, solo lo mínimo: la página (network first), su script y su estilo de entrada, el manifest y los íconos;
- después, cuando la página está quieta (8 s tras `load` y en un momento ocioso; no con "Ahorro de datos" ni en 2G), `src/lib/swRegister.ts` le pide (`SGX_PRECACHE`) que guarde el arte del pase (`/holo/*`) y los chunks pequeños de `dist/sw-precache.json`, de dos en dos. Así la primera carga y el splash no compiten con esa descarga.
- nunca guarda una respuesta HTML en lugar de un script o una imagen.

Un worker nuevo (otro deploy) **no toca la página abierta**: se instala, espera a que se cierren todas las ventanas de la app y solo entonces se activa y borra las cachés viejas (sin `skipWaiting` ni `clients.claim` en las actualizaciones; el primer worker sí se activa de una vez). Nada en la app recarga por `controllerchange`.

Así, el pase y su QR se abren sin señal en Chroma. Los prueba `scripts/e2e/pwa.cjs`. El atajo "Mi SGX Pass" del manifest abre `/?estudio=pass`.

### Check-in del Día 3

1. El admin genera el código ("Generar", aleatorio) y lo guarda en `summit_private/checkin`. Imprime el QR de `https://summit.spatialgineers.com/?checkin=<código>` para la puerta de Chroma.
2. El Creador escanea ese QR. `SgxPassHost` guarda el código y hace el check-in cuando hay pase y usuario.
3. En el mismo batch se escriben `summit_checkin_proofs/{uid}` (con el código, que las reglas comparan con `summit_private/checkin`, ilegible para visitantes) y `summit_checkins/{uid}` (solo la región, público).
4. La ventana de las reglas va del 13 dic 00:00 al 14 dic 06:00, hora de PR (`isDay3Window()`; en el cliente, `isDay3Open()`).
5. Resultado: el sello "PRESENTE EN CHROMA", la misión "Presente en Chroma" (250 XP) y el municipio encendido en el radar.
6. `?checkinTest=1` ensaya en local sin pagar XP ni dar el sello.

---

## 6. Gamificación

### Economía de XP

- Todo XP pasa por `recordActivity(category, title, details, xp)` en `PilotProfileContext.tsx`.
- **Anti-farm:** `claimXpOnce(\`${category}|${title}\`)` guarda un libro (`sgx_xp_ledger_v1`, los últimos 800 registros) y **cada acción paga una sola vez por dispositivo**. Tocar otra vez la misma estación, orbe, punto 360° o botón no da nada.
- `recordActivity` acepta un sexto argumento, `onceKey`, para pagar una vez por un id estable en lugar del título: los votos (`live_vote|<id de la pregunta>`, `poll_vote|<id de la encuesta>`) y los puntos 360° (`tour_complete|360|<id del punto>`).
- Nivel: `floor(XP/500) + 1`.

| Nivel | Rango |
|---|---|
| 1 | Visitante |
| 2 | Explorador XR |
| 3 | Creador |
| 5 | Creador Pro |
| 7 | Director Creativo |
| 10 | Visionario |

- **XP para gastar** = XP total menos lo canjeado. La Tienda gasta sin bajar el rango.
- `pilot_profiles` y `pilot_leaderboard` aceptan como máximo 100,000 XP por regla.

### Reactor de misiones (`src/identity/reactor.ts`)

Es el único sistema de misiones del Summit. Cada pilar completo **queda sellado** en el pase. Para el sello cuentan las misiones núcleo: ni las secretas, ni las del Día 3, ni las de sponsor. El admin puede cambiar el texto y el XP ("Juego → Misiones", `summit_content/mission_overrides`).

| Pilar | Misión | XP | Disparador | Dónde |
|---|---|---|---|---|
| Story | Forja tu SGX Pass | 120 | `forged` | La Forja |
| Story | Lee el manifiesto | 60 | visita `PILLARS_MANIFESTO` | `/pilares` |
| Story | Diseña tu Highbot | 80 | `avatar` | `/avatar` |
| Showcase | Recorre Chroma Space Studios | 60 | visita `MAP_360` | `/mapa` |
| Showcase | Visita el pabellón de partners | 60 | visita `SPONSORS_HUB` | `/sponsors` |
| Showcase | Reto <marca> (una por partner de Paquete 3–5) | 90 | abrir su showcase | ficha de la marca; deja el sello de la marca |
| Spark | Juega en el Spark | 60 | visita `EMBEDS_GAMES` o `/play` | `/juegos` |
| Spark | Ruta de los 6 pilares (**secreta**) | 150 | `drone_route` | Dron SGX |
| Spark | Torre de los 6 pilares | 120 | `stack_pillars` | Torre de Pilares |
| Spark | Pulso perfecto | 120 | `pulse_s` | Pulso SGX |
| Spark | Derriba al Jefe SGX | 150 | `bolt_boss` | Rayo en tus manos |
| Spark | Carga 6 celdas | 120 | quest `q_cells_6` | rayos escondidos en las secciones |
| Spark | Overdrive | 200 | quest `q_overdrive` | barra de energía al 100 % |
| Stage | Arma tu Run of Show | 60 | visita `AGENDA` | `/agenda` |
| Stage | Sintoniza una sala | 60 | visita `BROADCAST_ROOMS` | `/broadcast` |
| Stage | Conoce el line-up | 60 | visita `SPEAKERS` | `/speakers` |
| System | Inicia el núcleo | 50 | quest `q_core_boot` | girar la cámara del núcleo |
| System | Terminal de mando | 40 | quest `q_terminal` | `Ctrl+K` o `/` |
| System | Lee el radar | 60 | visita `VISITS` | `/visitas` |
| System | Holo Card | 60 | `holo` | compartir o descargar la Holo Card |
| Synthesize | Entra a SGX.Match | 60 | visita `ENTREPRENEUR_MATCH` | `/match` |
| Synthesize | Intercambia pases | 100 | `contact` | escanear el QR de otro pase |
| Synthesize | Presente en Chroma (**Día 3**) | 250 | `checkin` | QR de la puerta de Chroma |
| Synthesize | Red completa (**secreta**) | 300 | `constellation` | contactos de los 6 pilares |

Son 23 misiones fijas (`REACTOR_MISSIONS.length`) más una por cada partner aprobado de Paquete 3–5, así que el total cambia con los partners. Ningún texto da un número fijo: el riel y Tu Estudio muestran el total real (`missions.length`), la guía del Highbot calcula las fijas de `REACTOR_MISSIONS`, y el hub del núcleo calcula cuántas misiones de sello tiene cada pilar (de 2 a 6) y el rango de XP.

Las misiones que vienen de una quest de la plataforma no pagan dos veces: el XP lo paga la quest (`completeMission`, `SgxIdentityContext.tsx`).

### Quests de la plataforma (`src/immersion/quests.ts`)

| Tipo | Quest | XP |
|---|---|---|
| Main | Iniciar Sistema (girar el núcleo) | 50 |
| Main | Ruta de Exploración (6 secciones) | 150 |
| Main | Cartógrafo SGX (todas las secciones) | 300 |
| Main | Los Seis Pilares (6 estaciones) | 250 |
| Side | Cazador de Energía (6 celdas) | 120 |
| Side | Reactor Completo (todas las celdas) | 400 |
| Side | Terminal de Mando | 40 |
| Side | Pulso SGX (5 pulsos con `P`) | 30 |
| Side | Overdrive | 200 |
| Side | Modo Escenario (`F`) | 40 |
| Secret | Códigos de Ingeniería (3 palabras en la terminal; cada código paga de 40 a 60 XP) | 100 |
| Secret | Modo Highgineer (código Konami) | 250 |

### Energía y Overdrive (`ImmersionContext.tsx`)

- Cualquier interacción carga la barra; cada quest completada suma 10.
- Al llegar al 100 %, el **Overdrive** dura 12 s: el XP de las celdas se duplica, el cuerpo de la página lleva la clase `sgx-overdrive` y se emite `sgx:overdrive`.
- Cada sección esconde una **celda de energía** (un rayo SGX) en un lugar propio, calculado con un hash (`EnergyCell.tsx`).

### Sellos

- `stamps['pillar:<KEY>']` al completar el pilar;
- `stamps['sponsor:<id>']` al hacer el reto de un partner;
- el sello del Día 3 con el check-in.

Se ven en el pase y en el Reactor.

### Tienda del Reactor (`/tienda`)

- Premios en `gamification_rewards`, que el admin edita en "Juego → Tienda del Reactor" (`AdminRewardsManager.tsx`).
- Canjear crea un vale `redeemed_prizes`, uno por premio y persona, y en el **mismo batch** baja el inventario en 1. Las reglas no permiten bajar de 0 (−1 = ilimitado) ni canjear premios inactivos.
- Si el premio solo existe en el catálogo local: "este premio aún no está activo".
- El staff verifica el pase y los códigos de canje el Día 3.

### Sponsors en la economía

- **"Presentado por"** (`SponsorXpPop.tsx`): al ganar XP, una marca aparece unos segundos, como mucho una vez cada 5 minutos. Las marcas rotan en orden aleatorio, incluidos los lugares "Tu marca aquí". Al tocarla se queda abierta y lleva al showcase.
- Las estaciones 3D del núcleo dan +25 XP cada una.
- Las cajas de partners del Dron SGX.
- El reto del Reactor (Paquete 3+).

### Leaderboards

- **Creadores**: `pilot_leaderboard`, en Tu Estudio → Telemetría y en la Tienda.
- **Juegos**: `game_scores/{stack|pulse|bolt}/players/{uid}`, con top 10 y tu lugar (`src/lib/gameScores.ts`). El dron tiene su `DroneRanking`.
- **Regiones**: en el Radar de visitas. **Constelaciones**: el tablero de `summit_constellations` en Tu Estudio → Red.
- **SGX Live**: el puntaje del motor en vivo, con velocidad y rachas. El multiplicador es `1 + min(3, racha × 0.25)`.

### Networking

- **Escáner** (`/escaner`): leer el QR de otro pase (`?pase=<token>` con código, nombre, callsign, pilar, rol, organización y uid) guarda a las dos personas en el **Rolodex** de ambas. Escribe `summit_pass_exchanges` en el buzón del otro (`subscribeExchanges`). Paga +50 XP por contacto y la misión "Intercambia pases" (100).
- **Rolodex**: la lista con exportar vCard o CSV.
- **Constelación**: los contactos como estrellas por pilar. Se publica `summit_constellations/{uid}` (solo los conteos por pilar). Los seis pilares dan la misión secreta "Red completa".

---

## 7. En vivo

### Motor en vivo (WebSocket)

**Archivos:** `src/server/engine/*`, `src/App.tsx` (cliente).

- **Conexión:** `/ws?tenantId=&eventId=&userId=&nickname=[&role=admin|stage]`. El cliente solo se conecta en `admin`, `play`, `stage`, `multiview` y `analytics`. Reconecta con espera exponencial y aleatoria.
- **Sala:** `tenantId` + `eventId` (por defecto `tenant_spatialgineers` / `event_live_main`). El estado está en memoria: sesión, preguntas, índice, votos, usuarios y puntajes.
- **El director** se autentica con `AUTH` y su ID token de Firebase. El servidor lo verifica contra Identity Toolkit y lo compara con `SGX_ADMIN_EMAILS` (`src/server/security/adminAuth.ts`). En local existe `SGX_TEST_ADMIN_TOKEN`, que no funciona en producción.
- **Mensajes del director:** `BROADCAST_QUESTION`/`START_VOTING`, `CLOSE_VOTING`/`END_VOTING`, `TRIGGER_PRESET`/`STAGE_OVERRIDE`, `CREATE_QUESTION` y `UPDATE_QUESTIONS` (hasta 200 preguntas validadas, de 2 a 8 opciones). `SIMULATE_VOTES` responde `NOT_AVAILABLE`.
- **Mensajes de la audiencia:** `SUBMIT_VOTE` (con `questionId`) y `SEND_REACTION`.
- **Mensajes del servidor:** `INIT_STATE`, `ROOM_STATE_SYNC`, `QUESTION_START`, `TIMER_TICK`, `VOTE_UPDATE`, `VOTING_CLOSED` (solo el top 50), `PRESET_TRIGGER`, `REACTION_BURST` (agrupado cada 250 ms, máximo 24), `SCORE_UPDATE`, `USER_SCORES_SYNC`, `ERROR` y `AUTH_RESULT`.
- **Límites:**
  - 1500 sockets por IP;
  - 64 KB por mensaje de audiencia y 12 MB para admin;
  - un voto por socket y por pregunta (uno tardío de otra pregunta se rechaza);
  - un preset repetido en menos de 2 s se ignora;
  - un cliente con más de 512 KB pendientes pierde los mensajes decorativos, y con más de 8 MB se le cierra la conexión.
- **REST de respaldo** (el cliente solo lo usa con el socket caído): `POST /api/vote` y `POST /api/reaction`. Quién vota no sale del cuerpo: al conectar, el servidor firma el id del socket (HMAC, `src/server/security/voterToken.ts`) y lo manda en `INIT_STATE.voterToken`; el teléfono lo devuelve en `X-SGX-Voter`. Sin token válido, `401`. Además del límite por IP, hay un límite por esa identidad (votos: 6 seguidos y 1 cada 2 s; reacciones: 30 y 5/s). Para el director, para el director, `POST /api/action/broadcast-question`, `/close-voting`, `/trigger-preset` y `POST /api/questions`. También `GET /api/state`, `/api/questions`, `/api/tenants`, `/api/engine/status` y `/api/analytics` (admin). Un inicio o cierre duplicado (socket + REST) no borra votos.

### Arena de votación (`/play`, SGX Live)

**Archivo:** `src/components/audience/AudiencePWA.tsx`. Pide pase.

- Es una votación estilo Kahoot durante la transmisión, con dos modos: "1. Votar" y "2. Visual en vivo" (en inglés, "1. Vote" y "2. Live visual").
- **+25 XP por voto**: cada pregunta paga una vez, por su id (`live_vote|<id>`). Volver a votar la misma pregunta (o una que el director relanza) no paga; cambiar de idioma tampoco. Las encuestas del Pulso en vivo pagan igual, +25 XP por encuesta (`poll_vote|<id>`).
- Las preguntas son de conocimiento (`KNOWLEDGE`, con respuesta correcta, bono de velocidad y rachas) u opinión (`OPINION_CYOA`, donde la audiencia elige qué pasa en el escenario).
- Hay reacciones, una guía de 3 pasos, PREMIOS y BITÁCORA, y un indicador OFFLINE.
- El nombre en el escenario es el callsign del pase. Los votos y las reacciones suman XP al pase (no existe un perfil aparte de SGX Live).

### Consola del director

**Ubicación:** Admin → En vivo → Consola del director.

- Elegir y lanzar la pregunta, ver los votos en vivo y la audiencia conectada, cerrar la votación y revelar el resultado.
- Lanzar presets visuales (FX): los efectos de cada opción se configuran por pregunta (preset, tipo de efecto y multiplicador).
- Cargar preguntas en lote (`BulkQuestionUploadModal.tsx`), en modo añadir o reemplazar. El servidor confirma con `ROOM_STATE_SYNC` y, si las rechaza, la consola muestra el `ERROR`.
- **Preguntas en vivo** (Juego) son el banco de escenarios CYOA. **Efectos visuales** (Sistema, `FXPresetsStudio.tsx`) y **Marca y tenants** (`AdminThemeStudio.tsx`, `TenantRoomManager.tsx`) definen los presets, el tema y las salas.

### Pantalla del escenario (`/stage`)

**Archivos:** `src/components/stage/StagePage.tsx`, `StageHud.tsx` y `src/components/visualizer/*`.

- Muestra la pregunta, los porcentajes en vivo, la cuenta regresiva, la ganadora, un QR para votar y las reacciones de la audiencia.
- Los visitantes solo miran: el visual lo dirige el director.
- Admin → botón **Proyección**: fondo transparente, HUD sí o no, torres de votos en 3D, movimiento de cámara, sonido y **"Copiar enlace para OBS"** (`/stage?clean=1[&transparent=1][&hud=0]`). Los botones se desvanecen cuando el puntero está quieto.

### Anuncios

Admin → En vivo → Anuncios escribe `site_config/announcement`:

- `title` (≤120), `message` (≤600) y `priority` (`LOW`, `NORMAL`, `HIGH` o `CRITICAL`);
- `actionUrl` y `actionLabel` opcionales.

Todos los visitantes lo ven como toast, en cualquier página.

### Encuestas del keynote

Las crea Admin → En vivo → Encuestas del keynote (`summit_content/polls`). Se votan en el **Pulso en vivo**: `summit_poll_votes`, un voto por persona y encuesta, sin ediciones. Los conteos son públicos.

### Salas de transmisión

Las salas del tenant (YouTube Live embebido, estado `LIVE`, `UPCOMING` u `OFF_AIR`) se editan en Admin → Sistema → Marca y tenants.

### Prueba de carga (`scripts/loadtest/`)

Resultados del 28 oct 2026, en una máquina de 4 vCPU con Node 22:

| Medida (1000 teléfonos) | Antes | Después |
|---|---|---|
| Inicio de votación llega (p99) | 3929 ms | 25 ms |
| Cierre llega (p99) | 3352 ms | 48 ms |
| CPU media en votación | 94 % | 14 % |
| `/healthz` p99 | 10 s (timeout) | 52 ms |
| Votos contados vs enviados | 912 vs 909 | 3/3 rondas exactas |
| `VOTING_CLOSED` por teléfono | 455–738 KB | 21 KB |
| 2000 teléfonos | — | p99 ≤ 102 ms, CPU 27 %, votos exactos |

`POST /api/vote` ya no acepta el `userId` del cuerpo: el votante sale del token firmado del socket (ver "REST de respaldo" arriba). `scripts/loadtest/ws-load.mjs --rest` lo usa igual que el teléfono.

---

## 8. Highbot con Claude

El Highbot es Highcoon en forma de robot: el compañero de cada Creador. Vive en Tu Estudio ("Tu Highbot") y flota como una cabecita en las demás páginas (`src/companion/CompanionDock.tsx`, `CompanionPanel.tsx`, `CompanionStudio.tsx`, `companionStore.ts`, `companionApi.ts`). Contesta con Claude a través del servidor (`POST /api/companion/chat`, por SSE con los eventos `text`, `action`, `done` y `error`).

### Quién puede chatear

En el servidor, `verifyPass` en `src/server/companion/companionRouter.ts`:

1. El navegador manda su ID token de Firebase, el email y el código del pase.
2. Se rechaza a los invitados anónimos y a las cuentas sin `email_verified` (`NEED_GOOGLE`).
3. El servidor lee `pass_emails/{sha256(email)}` **con el token del usuario**, así que Firestore valida el token. El código debe coincidir, y el pase debe ser de esa cuenta o llevar su email de Google. Si no, `NO_PASS`.
4. El resultado se recuerda 30 min (una negativa, 3 s).

Sin pase o sin Google, el panel muestra "modo muestra" y contesta desde la guía local.

### Topes, presupuesto y límites

| Capa | Valor | Dónde se cambia |
|---|---|---|
| Límite mensual del workspace en la Console de Anthropic | El techo duro (recomendado $400) | Console |
| Tope diario del servidor | `COMPANION_DAILY_USD` (por defecto 30), o lo que fije el admin | Admin → Contenido → Highbot (`site_config/companion.dailyUsd`, de 0 a 1000) |
| Interruptor | `site_config/companion.enabled`; el servidor lo relee cada 60 s | Admin → "Apagar/Encender el Highbot" |
| Mensajes por persona al día | `COMPANION_USER_DAILY` (60) | entorno |
| Ráfaga por persona | 6 mensajes, y uno nuevo cada 15 s | código |
| Por IP | 30, y uno nuevo cada 20 s | código |
| Respuestas a la vez | 25 (`BUSY`) | código |
| Tamaño | Pregunta ≤600 caracteres, respuesta previa ≤1200, últimos 12 turnos y ≤8000 caracteres de historial, salida ≤2000 tokens | código |
| Precio por token para el cálculo del gasto | `COMPANION_PRICES` | entorno |

Los contadores son del proceso. El servicio corre en una instancia y vuelven a cero con cada deploy; por eso el límite de la Console es el respaldo.

### Modos y estado

`GET /api/companion/status` devuelve `mode`:

| Modo | Cuándo |
|---|---|
| `live` | Hay clave y modelo configurados |
| `mock` | `COMPANION_MOCK=1`, solo fuera de producción |
| `off` | Falta la clave o el modelo |
| `paused` | Lo apagó el admin |

`GET /api/companion/stats` (admin) devuelve:

- el modo, el estado del interruptor y si el modelo está configurado (`set`/`missing`; nunca el nombre);
- el día, el tope y de dónde sale (`capFrom` = admin o env);
- el gasto, las personas, las respuestas activas, los mensajes, las negativas y los errores;
- **"Bloqueados hoy"** por causa: IP, ocupado, sin pase, sin Google, ráfaga, diario, presupuesto, pausa.

La clave (`ANTHROPIC_API_KEY`) y el modelo (`COMPANION_MODEL`) viven **solo en el entorno del servidor**. Nunca van con prefijo `VITE_` ni en el código ni en los documentos.

### Conocimiento (`src/server/companion/knowledge.ts`)

Un prompt de sistema largo y estable, en caché por 1 h, con:

- la persona y las reglas (marca, nada inventado, los dos fundadores, Spatial en pasado, Highcoon solo con sus enlaces, sin precios de servicios, Guild sin reclutar, sin datos personales);
- el evento y Spatialgineers;
- los pilares (`sgxPillars`) y el portafolio (`sgxPortfolio`);
- las misiones (`REACTOR_MISSIONS`);
- el mapa de la app (`COMPANION_DESTINATIONS`) y la guía de la app (`src/companion/appGuide.ts`);
- las fechas de `summitDeadlines.ts`;
- los **Términos y logística** de sponsors (`sponsorTermsPrompt()` de `sponsorTerms.ts`) y la **Guía del speaker** (`speakerGuidePrompt()` de `speakerGuide.ts`), con dónde encontrarlos (`/sponsors#terminos`, el Portal de speakers y `/bienvenida/speaker#guia`). La guía local (`appGuide.ts`) tiene sus respuestas cortas (`sponsor-terms` y `speaker-guide`).

**En vivo**, cada 10 min se leen de Firestore `summit_content/sessions`, `speakers`, `approved_sponsors` y **`companion_kb`**: las preguntas y respuestas propias del equipo (Admin → Highbot: control y preguntas), hasta 120.

### Herramientas

Solo puede navegar y señalar: no lee ni escribe datos.

- **`ir_a`**: abre una página. Su `enum` son los ids de `src/companion/destinations.ts`, que se arman solos a partir de los módulos de los pilares: `inicio`, `pilar-<slug>`, cada slug de sección, `play`, `stage` y las pestañas de Tu Estudio (`tu-highbot`, `reactor`, `red`, `rolodex`, `dia-3`).
- **`senalar`**: resalta un elemento de la página actual, solo de los ids que manda el cliente en `context.targets`.

### Respaldo sin conexión (`src/companion/localKb.ts`)

Si Claude está apagado, en pausa o sin presupuesto, o el Creador no tiene pase o Google, el Highbot contesta **en el dispositivo**. Usa palabras clave sobre la misma guía (`APP_FAQ`), los pilares, las misiones y el mapa, y puede dar un botón "ir". No necesita red.

### Privacidad

Los logs del servidor guardan solo un hash corto del uid y el costo de cada respuesta. **Nunca lo que la persona escribió.**

### Configuración

Ver `docs/HIGHBOT_COMPANION.md` (el workspace y la clave, las variables de Cloud Run, la prueba de `/status`, qué hacer si algo huele mal). Después de cada deploy desde AI Studio, hay que comprobar que `/api/companion/status` siga en `live`.

Para otros agentes: el prompt está en `docs/highbot/HIGHBOT_AGENT.md` y el conocimiento en `docs/highbot/spatialgineers-summit-app/SKILL.md`.

---

## 9. Roles y flujos

### Speaker o artista

1. Forja su SGX Pass. Sin pase, el portal muestra `ForgeFirst`.
2. Abre **Portal de speakers** (`/portal-speakers`, SGX.Stage 04.4) y llena su ficha: nombre, título, organización, pilar, tema y enlaces. Su imagen es siempre su Highbot (`avatarUrl`, un JPEG pequeño), nunca una foto subida; el logo de marca o proyecto va como enlace. Las reglas no le dejan marcarse como keynote.
3. El envío crea `speaker_submissions` y deja su rol "En revisión" en el pase.
4. El equipo lo revisa en **Admin → Personas → Inscritos y Día 3** (solicitudes de speakers: "Publicar" o "Descartar"). Al publicar:
   - entra a `summit_content/speakers`;
   - se otorga `credential_grants/{uid}.speaker`;
   - el mailer manda "Tu Holo Card está lista".
5. Su pase se vuelve la **Holo Card de speaker**. Sale en `/speakers` y su sesión en la agenda, que el admin edita en Contenido → Agenda.
6. El portal **se cierra solo** al terminar el 21 nov (sección 12). Después, el admin sigue pudiendo añadir y editar desde el CMS.
7. **Guía del speaker** (`src/lib/speakerGuide.ts`, `src/components/summit/speakers/SpeakerGuide.tsx`; fuente: el kit para speakers "Media-Kit-D-Speakers-Summit v2026.10.4"). Sale en el portal (desplegable en el formulario, abierta después de enviar y, cuando `credential_grants/{uid}.speaker` existe, como "Ya eres speaker oficial"), en `/bienvenida/speaker#guia` y en el correo de invitación del speaker. Dice:
   - qué enviar: bio de 50 a 80 palabras, redes y logo (en el portal, con contador de palabras en la bio); foto de 1500 px o más y datos técnicos (ciudad, zona horaria, equipo y conexión) **por correo a info@**, porque el portal no guarda fotos ni tiene esos campos (las reglas de `speaker_submissions` solo aceptan sus campos actuales y no hay Storage);
   - la sesión del Día 2: 45 minutos por pilar, 5 de presentación, 30 de conversación guiada y 10 de preguntas del chat, 100% remoto;
   - la prueba técnica antes del 8 dic (`speakerTechCheck`) y conectarse 30 minutos antes;
   - las reglas de tono: casos reales, sin pitch de ventas, spatial computing, lenguaje inclusivo, sin música con derechos de autor ni datos confidenciales de clientes.

### Sponsor

1. Llega a **Partners & Brand Showcases** (`/sponsors`): el hero, los partners confirmados, **Paquetes 1–5** (tarjetas y comparación), **Dónde aparece tu marca** y el proceso (solicitud → confirmación → materiales → en vivo).
2. **Patrocina** (`/patrocina`) pide pase. Ahí elige paquete, empresa, contacto, activaciones y mensaje. Crea `sponsor_inquiries` (con `submittedBy` = su uid) y le da un **código de seguimiento** `SGX-SPONSOR-2026-<n>`, que puede copiar y descargar como `.txt` de recibo.
3. El equipo lo ve en **Admin → Contenido → Sponsors** (el CRM de solicitudes). **Aprobar**:
   - crea el showcase en `approved_sponsors` (publicado);
   - pone el estado `APPROVED`;
   - otorga `credential_grants/{uid}.sponsor` (Holo Card de sponsor y correo).
4. **Términos y logística** (`src/lib/sponsorTerms.ts`, `sponsors/SponsorTerms.tsx`; fuente: el Dossier de Auspicio ES-EN y el Kit de Patrocinio v2026.10.2, con las fechas de `summitDeadlines.ts`). Vive en `/sponsors#terminos` y en `/bienvenida/sponsor#terminos`; lo enlazan el hero de sponsors, el formulario (nota de fechas, confirmación y nota de cerrado), el `.txt` de recibo y la invitación del sponsor (texto y correo). Dice:
   - pago total a más tardar el 30 nov por ATH Móvil Business ("SpatialgineersLLC"), cheque o transferencia (cuenta a solicitud), con el comentario "Spatialgineers Summit Auspicio [marca] Paquete [N]" (botón para copiarlo); Paquetes 4 y 5 en dos plazos coordinados con el equipo, con el total a más tardar el 30 nov;
   - precio dentro del rango según presupuesto y sin IVU por separado;
   - materiales a más tardar el 30 nov, aprobados o comentados en 4 días calendario; integración final después;
   - no se aceptan sponsors de política partidista ni de alcohol; exclusividad por categoría solo en Paquetes 4 y 5;
   - licencia de Paquetes 4 y 5 del 1 nov 2026 al 31 oct 2027, sin transferencia de código; primera renovación del Paquete 4; reporte final alrededor del 12 ene 2027, sin datos personales; no se garantizan cifras;
   - cancelación y reembolso, fuerza mayor, el Día 3 que se pospone o se hace virtual, y que la página no es una oferta vinculante (rige el contrato firmado).
   - Se dejó fuera, a propósito: la dirección postal, presupuestos y metas, costos, seguro, la plantilla del contrato y todo lo "por confirmar".
5. **Lugares de marca** (`sponsorPlacements.ts`; "todos" = Paquetes 1–5):

| Lugar | Paquetes |
|---|---|
| Estación en el núcleo 3D | 3, 4, 5 |
| Cabecera y cinta de partners | todos |
| Intro del Summit (splash) | 3, 4, 5 |
| Cajas del Dron SGX | 2, 3, 4, 5 |
| Reto de marca en el Reactor | 3, 4, 5 |
| Ficha de marca (showcase) | todos |
| Holo Card de sponsor | todos |
| Transmisión en YouTube Live (Días 1 y 2) | todos |
| Día 3 en Chroma Space Studios | 4, 5 |

6. **Paquetes** (`summit_content/sponsorship_tiers`; el id interno es `tier_N`, pero en pantalla siempre se lee "Paquete N"):

| Paquete | Nombre | Precio | Cupos |
|---|---|---|---|
| 1 | Digital Presence | $50–$100 | 10 |
| 2 | Gamified | $250–$500 | 6 |
| 3 | Experience | $750–$1,000 | 6 |
| 4 | Signature Experience | $1,500–$2,500 | 3 |
| 5 | Alianza de servicios esenciales | A convenir | 3 |

6. **Fechas:** solicitudes hasta el 28 nov (el formulario se cierra solo); pago total y materiales a más tardar el 30 nov.

Chroma Space Studios es la sede del Día 3 (Paquete 5) y Los Mismos TV es el medio aliado de la transmisión.

### Prensa

1. **Sala de prensa** (`/prensa`, SGX.Stage 04.5). Pública: las reglas de acreditación, la ficha del Summit, las biografías de los fundadores y el kit (`/press/…`): logos, fotos, capturas de la app, la ficha PDF de 2 páginas y el ZIP.
2. Para **acreditarse**, forja su pase y llena el formulario:
   - medio, tipo de medio, cargo, email y teléfono;
   - web o redes;
   - qué piensa cubrir, qué días (1, 2 o 3) y un clip de muestra;
   - consentimiento.

   Se guarda como `sponsor_inquiries` con `selectedTierId: "PRESS"`, y los `goals` llevan etiquetas `TYPE:`, `DAY:`, `CLIP:`, `PASS:` y `CONSENT:`. La persona recibe un código de seguimiento.
3. **10 cupos de prensa**, sin regla por medio. Cierra antes del 1 dic: la Sala se cierra sola y el kit sigue disponible.
4. **Admin → Personas → Prensa** (`PressRequestsPanel.tsx`) muestra "aprobados X/10" y pide confirmación para pasar de 10.
   - **Aprobar**: estado `APPROVED`, `credential_grants/{uid}.press` (Holo Card **PRENSA**) y `ticket_inquiries/{códigoDelPase}.status = INVITED`. El mailer manda la invitación al Día 3, y su QR es su entrada.
   - **No aprobar** o **Pendiente**: quita PRENSA y, si la aprobación fue lo que la invitó, devuelve su Día 3 a `PENDING`.
   - **Exportar CSV**: medio, enlaces, días y código del pase.
5. La Holo Card PRENSA dice "DÍAS 1–2 YOUTUBE LIVE · DÍA 3 CHROMA · ACCESO 3 DÍAS".
6. El kit se reconstruye con `node scripts/press-kit/build.cjs` (y `--shots` para retomar las capturas desde un servidor con emuladores). Los datos del kit viven en `src/lib/pressKit.ts`.

### Equipo / Admin

- Entra a `/admin` con **Google**.
  - Super admins: `info@spatialgineers.com` y `support@spatialgineers.com` (verificados o con Google).
  - Otros admins: un uid en `admins/{uid}` con rol `DIRECTOR`, `OPERATOR` o `SUPER_ADMIN`. Solo un super admin los añade, en Sistema → Admins, y la persona tiene que haber abierto la app antes con esa cuenta de Google.
- El servidor verifica a los directores con su ID token contra `SGX_ADMIN_EMAILS`.
- Su portal de bienvenida es `/bienvenida/equipo` (interno, `noindex`), con un video no listado del Centro de mando.

---

## 10. Admin / Centro de mando

**Archivos:** `src/components/admin/AdminDashboard.tsx` (shell, menú y secciones), `AdminPanels.tsx` (marco de sección, tabla, admins, respaldo), `CsvBar.tsx`, `src/lib/csv/*` (definición de cada data set) y `admin.css`.

- Cinco áreas, con menú a la izquierda y búsqueda (`Ctrl/Cmd+K`).
- Cada sección indica si su último cambio quedó **Publicado** (en vivo para todos) o **Solo en este equipo** (falló la publicación, con el motivo).

### En vivo

| Sección | Qué hace | Archivo / datos |
|---|---|---|
| **Consola del director** | Lanza y cierra preguntas, presets, FX por opción, carga en lote, audiencia conectada (sección 7) | `AdminDashboard.tsx`, `BulkQuestionUploadModal.tsx`; WS |
| **Anuncios** | Toast para todos con prioridad y botón opcional | `site_config/announcement` |
| **Encuestas del keynote** | Crea, edita, importa y exporta encuestas; ve los votos | `summit_content/polls`, `summit_poll_votes` |
| **Errores en vivo** | Lo que falló en los teléfonos, agrupado y lo más nuevo primero, con un badge de recientes | `ClientErrorsPanel.tsx`, `client_errors` |

### Contenido

| Sección | Qué hace | Datos |
|---|---|---|
| **Agenda / Run of Show** | Sesiones por día, pilar, formato y speakers | `summit_content/sessions` |
| **Speakers** | Fichas publicadas; abre el portal en `adminMode`, que nunca se bloquea | `summit_content/speakers` |
| **Sponsors** | CRM de solicitudes (aprobar, borrar, ⭐ lead) y showcases aprobados | `sponsor_inquiries`, `summit_content/approved_sponsors` |
| **Paquetes de auspicio** | Paquetes 1–5: precio, cupos, contenido y marcas | `summit_content/sponsorship_tiers` |
| **Guild Initiates** | Lista pública, email privado y solicitudes de Initiate (aprobar otorga la credencial) | `summit_content/initiates`, `summit_private/initiate_emails`, `initiate_claims`, `initiate_requests` (`SummitInitiatesPanel.tsx`) |
| **Mapa 360** | Nodos y hotspots (JSON) | `summit_content/map_nodes` |
| **Apps embebidas** | Juegos y apps del hub: URL, HTML en sandbox, nativo o enlace | `summit_content/embeds` |
| **Redes sociales** | Importa publicaciones de Instagram en lote y modera. **Radar social · Instagram**: candidatos del servidor, Aprobar / Ocultar y la línea de estado | `social_posts` (`BulkInstagramImportModal.tsx`), `site_config/social` (`InstagramRadarPanel.tsx`) |
| **Pilares: casos y proyectos** | Casos de uso y proyectos que muestran las páginas de pilar (incluido el bloque del Día 1) | `summit_content/pillar_showcase` |
| **Highbot: control y preguntas** | Apagar o encender, tope diario ("Guardar tope", "Usar el del servidor"), gasto de hoy, "Bloqueados hoy", y el banco de preguntas y respuestas que lee el Highbot | `CompanionControlPanel.tsx`, `site_config/companion`, `summit_content/companion_kb` |
| **Portal de bienvenida** | IDs de YouTube por rol (acepta el id o cualquier enlace), copiar el enlace de cada rol y el **generador de invitaciones**: mensaje por rol con nombre, sesión (escrita o tomada de la agenda) y enlace personal. Se copia, se manda por WhatsApp o correo, y sale también como **correo HTML** (copiar con formato, vista previa, descargar). | `WelcomePortalPanel.tsx`, `WelcomeInvitePanel.tsx`, `site_config/welcome`, `src/lib/welcomeInvites.ts` |

### Personas

| Sección | Qué hace | Datos |
|---|---|---|
| **Inscritos y Día 3** | Lista de pases con filtros por tipo y estado; ✉ con los correos que ya recibió cada uno; ⭐ lead. Estados `PENDING`, `INVITED`, `CONFIRMED` y `DECLINED`; marcar `INVITED` dispara el correo de invitación. Nota "invitaciones a más tardar el 5 dic" y, desde el 6 dic, aviso suave si quedan pendientes (no bloquea). CSV (con protección contra inyección de fórmulas). Solicitudes de speakers (Publicar/Descartar). **Código de check-in del Día 3**: "Generar", "Guardar código", enlace y "Descargar QR". | `SummitRegistrationsPanel.tsx`, `ticket_inquiries`, `speaker_submissions`, `summit_private/checkin`, `mail_log` |
| **Prensa** | Acreditaciones con aprobados X/10, Aprobar / No aprobar / Pendiente y CSV | `PressRequestsPanel.tsx`, `src/lib/pressRequests.ts` |
| **Clientes potenciales** | Todos los marcados con ⭐ en Inscritos, Sponsors o el Rolodex: estado, pilares de interés, nota y CSV para el CRM | `LeadsPanel.tsx`, `LeadFlag.tsx`, `leads` |
| **Audiencia y leads** | Audiencia del motor en vivo y su exportación | `AdminDashboard.tsx` |
| **Entrepreneur Match** | Perfiles de SGX.Match, visibilidad y reportes | `src/modules/match/admin/*` |

### Juego

| Sección | Qué hace | Datos |
|---|---|---|
| **Tienda del Reactor** | Premios, inventario (−1 = ilimitado), activo o inactivo y canjes | `AdminRewardsManager.tsx`, `gamification_rewards`, `redeemed_prizes` |
| **Misiones** | Texto y XP de las misiones del Reactor | `summit_content/mission_overrides` |
| **Preguntas en vivo** | Banco de preguntas y escenarios CYOA del motor | WS (`UPDATE_QUESTIONS`) |

### Sistema

| Sección | Qué hace | Datos |
|---|---|---|
| **Analítica** | Visitas, pases, votos y retención con datos reales de Firestore | `SummitAnalyticsView.tsx` |
| **Marca y tenants** | Tema, colores y salas de transmisión por tenant | `AdminThemeStudio.tsx`, `TenantRoomManager.tsx`, `tenants` |
| **Efectos visuales** | Laboratorio de presets FX del escenario | `FXPresetsStudio.tsx`, `src/lib/presets.ts` |
| **Funciones y QA** | Estado de cada módulo (`ACTIVE`, `MAINTENANCE` o `DISABLED`) y auditoría de contenido | `SummitContentAuditModal.tsx`, `site_config/feature_toggles` |
| **Admins** | Añadir o quitar admins por email, con rol (solo super admins) | `admins` |
| **Respaldo y restauración** | Descargar cada data set en CSV. Restaurar la agenda, speakers, mapa, apps y paquetes originales: hay que escribir `RESTAURAR` y antes se baja un respaldo. | `AdminPanels.tsx` |

### CSV en todo

Cada data set de contenido tiene **Exportar · Plantilla · Importar** (`CsvBar.tsx`):

- La fila 1 lleva los nombres reales de los campos y la fila 2, una ayuda que empieza con `#` y que el import ignora.
- Celdas:
  - listas: `a | b | c`;
  - sí/no: `true`/`false`, `sí`/`no`, `1`/`0`;
  - pilares: `SGX.Story`… o `story`;
  - inglés: una columna con el mismo nombre más `En`;
  - datos complejos: JSON en una celda;
  - `id` vacío crea una fila nueva;
  - una columna ausente conserva el valor actual y una columna vacía lo borra.
- **Importar** nunca aplica a ciegas: primero muestra cuántas filas son nuevas, cuáles cambian, cuáles siguen igual, cuáles se quitan y los errores por fila.
  - **Combinar**: actualiza por `id` y añade las nuevas.
  - **Reemplazar todo**: la lista queda igual al archivo, y antes se baja un CSV de respaldo de lo que está en vivo.
- Los datos de personas (leads, solicitudes de sponsors, inscritos) solo se exportan.

Más detalle: `docs/ADMIN_GUIDE.md`.

### Contenido en vivo (cómo publica el CMS)

`publishContent(key, items)` (`src/lib/summitData.ts`) escribe `summit_content/{key}` (`{ items, updatedAt }`). `startLiveContentSync()` (en `main.tsx`) escucha toda la colección y vuelca cada set en la misma clave de `localStorage` que leen los cargadores. Sin documento publicado, el visitante ve los valores por defecto del bundle.

Claves:

- `sessions`, `speakers`, `map_nodes`, `embeds`, `sponsorship_tiers`, `approved_sponsors`, `initiates`;
- con `makeLiveList`: `polls`, `gallery`, `mission_overrides`, `companion_kb`, `pillar_showcase`. (`gallery` ya no se edita en el admin ni se muestra en la app; sus datos quedan como están.)

---

## 11. Portal de bienvenida y campaña

### El portal (`/bienvenida` y `/bienvenida/<rol>`)

**Archivos:** `src/components/summit/welcome/SgxWelcomePage.tsx` y `src/lib/welcomePortal.ts`, que comparten cliente y servidor.

- **Hub** (`/bienvenida`): el video del recorrido completo y una tarjeta por rol público.
- **Roles:** `visitante`, `speaker`, `sponsor`, `prensa` y `equipo` (interno, `noindex`, fuera del hub).
- Cada página de rol tiene su video guía (YouTube, vertical para los roles), los pasos y fechas que importan a ese rol (de `summitDeadlines.ts`), preguntas frecuentes y accesos directos a la app.
- `/bienvenida/speaker` trae la **Guía del speaker** completa (`#guia`) y `/bienvenida/sponsor` los **Términos y logística** (`#terminos`), con su atajo en los botones de arriba. Así basta con mandar el enlace: no hace falta adjuntar el kit ni el dossier.
- Las invitaciones del speaker y del sponsor (texto y correo HTML) llevan una línea y una tarjeta con el resumen y el enlace a esa guía (`INVITE_GUIDES` en `welcomeInvites.ts`).
- **Videos extra:** `tour` (horizontal), `pass` y `build`.
- **IDs de YouTube** en `site_config/welcome`, uno por clave (`visitante`, `speaker`, `sponsor`, `prensa`, `equipo`, `pass`, `tour`, `build`). Se editan en Admin → Contenido → Portal de bienvenida y salen al instante, sin redeploy. El embed usa `youtube-nocookie.com`.

### Enlaces personalizados

`src/lib/welcomeInvites.ts` arma enlaces como `/bienvenida/<rol>?n=<nombre>&s=<idDeSesión>`. Sin sesión se usan los campos sueltos:

| Parámetro | Valor |
|---|---|
| `n` | nombre (≤60) |
| `s` | id de sesión de la agenda; si existe, sus datos ganan |
| `d` | día (1–3) |
| `h` | hora (≤20) |
| `t` | título (≤120) |
| `p` | pilar |
| `k` | paquete (1–5, para sponsors) |

- La página saluda ("Hola <nombre>") y muestra "Tu sesión" como texto plano.
- Los enlaces no llevan secretos. El servidor los marca `noindex` y el canonical sigue siendo el URL limpio del rol.
- **Plantillas de mensaje** por rol, en `INVITE_TEMPLATES`: cortas, cálidas y en español. Una línea que empieza con `?` es opcional y desaparece cuando sus campos están vacíos.

### SEO y GEO

`src/server/welcomeMeta.ts` en producción:

- Para `/bienvenida*` y `/prensa` (y sus alias) inyecta en `index.html`:
  - título, descripción y canonical por ruta;
  - Open Graph y Twitter;
  - **JSON-LD** con `Event` (el Summit, organizado por Spatialgineers LLC), `VideoObject` (cuando hay video) y `FAQPage`;
  - una copia en texto plano dentro de `<noscript>`, para buscadores y motores de respuesta que no corren JavaScript.
- `/prensa` también lleva la ficha del Summit en HTML.
- Lee `site_config/welcome` por REST, con caché de 60 s.
- **noindex** para cualquier URL con query y para `/bienvenida/equipo`.
- `public/sitemap.xml` lista la portada, el portal, los roles públicos, `/prensa` y las secciones públicas principales. `robots.txt` excluye `/admin` y `/api/`.
- La imagen OG por defecto es `public/og-image.jpg`.

### Videos de la campaña (`docs/campaign/YOUTUBE_KIT.md`)

| Video | Formato | Visibilidad | Portal |
|---|---|---|---|
| Recorrido completo (con capítulos por pilar) | 16:9, 3:36 | Público | `/bienvenida` (`tour`) |
| Recorrido completo vertical | 9:16, 3:36 | Público (Short) | — |
| Creadores (visitante) | 9:16, ~1 min | Público | `/bienvenida/visitante` |
| Speakers | 9:16, ~45 s | Público | `/bienvenida/speaker` |
| Sponsors | 9:16, ~55 s | Público | `/bienvenida/sponsor` |
| SGX Pass | 9:16, ~1 min | Público | `/bienvenida` (`pass`) |
| Cómo se construyó la app | 9:16, ~1 min | Público | `/bienvenida` (`build`) |
| Prensa | 9:16, ~56 s | Público | `/bienvenida/prensa` |
| Equipo | 9:16, ~55 s | **No listado** | `/bienvenida/equipo` |

El kit trae el título, la descripción y los tags de cada video. Las voces se hicieron con ElevenLabs y las imágenes son grabaciones reales de la app. El reel promocional vertical se graba y arma con `scripts/promo/` (ver su README).

---

## 12. Fechas límite

Una sola fuente: **`src/lib/summitDeadlines.ts`**. Todas las fechas son hora de Puerto Rico (UTC-4, sin horario de verano). "Hasta el X" significa abierto todo el día X, así que `closesAt` es el primer instante del día siguiente.

| Clave | Qué | Último día abierto | `closesAt` | Qué pasa después |
|---|---|---|---|---|
| `speakerProfiles` | Perfiles de speakers y artistas | 21 nov 2026 | 2026-11-22 00:00 | El Portal de speakers muestra "El portal de speakers cerró el 21 de noviembre. Escríbenos a info@spatialgineers.com". El admin sigue editando en el CMS. |
| `sponsorApplications` | Solicitudes de auspicio | 28 nov 2026 | 2026-11-29 00:00 | El formulario de Patrocina se cierra y apunta a info@ |
| `sponsorPayment` | Pago total de sponsors | 30 nov 2026 | 2026-12-01 00:00 | Aviso en el formulario, la página de sponsors y los correos |
| `sponsorMaterials` | Materiales de la marca | 30 nov 2026 | 2026-12-01 00:00 | Igual que el pago |
| `day3Requests` | Solicitudes para el Día 3 (la Forja: "solicítalo hasta el 1 de diciembre") | 1 dic 2026 | 2026-12-02 00:00 | Texto de la Forja, el Highbot y la guía local (no cierra ningún formulario) |
| `day3Invitations` | El equipo envía las invitaciones al Día 3 | 5 dic 2026 | 2026-12-06 00:00 | Nota en Inscritos; desde el 6 dic, aviso suave si quedan pendientes |
| `pressAccreditation` | Acreditación de prensa (antes del 1 dic) | 30 nov 2026 | 2026-12-01 00:00 | La Sala de prensa cierra el formulario; el kit sigue |
| `speakerTechCheck` | Prueba técnica de los speakers (antes del 8 dic, el ensayo general) | 7 dic 2026 | 2026-12-08 00:00 | Solo informativa: la Guía del speaker, el Highbot y la invitación la muestran; nada se cierra |

**Quién las lee:** los formularios, las páginas de sponsors y speakers, el portal de bienvenida, el Highbot (prompt y guía local), las plantillas de invitación y el kit de prensa (`scripts/press-kit/build.cjs` regenera la ficha). También hay frases hechas en `DEADLINE_COPY`.

**Helpers:** `isOpen(key)`, `isClosed(key)`, `deadlineLabel`, `deadlineShort` y `deadlineDay`.

**Para cambiar una fecha:**

1. Edítala en `summitDeadlines.ts`.
2. Corre `npm run build` (actualiza también `server.js`).
3. Corre `node scripts/press-kit/build.cjs` para regenerar la ficha de prensa.

**Para probar el estado cerrado sin esperar:** en la consola del navegador, `localStorage.sgx_now = Date.parse('2026-11-23T12:00:00-04:00')`, recargar y borrarlo después. Solo afecta a ese navegador. Lo usa `scripts/e2e/deadlines.cjs`.

**Otras fechas fijas** (fuera de `summitDeadlines.ts`):

- la ventana del check-in del Día 3 (13 dic 00:00 → 14 dic 06:00 PR), en `firestore.rules` y `reactor.ts`;
- los recordatorios del mailer (10 dic y 12 dic, 10:00 AM), en `scripts/email/Code.gs`.

---

## 13. Datos y seguridad

### Colecciones de Firestore

Las reglas están en `firestore.rules` (todo lo no listado se niega: `match /{document=**} { allow read, write: if false; }`).

**Admin** = un super admin (`info@` o `support@`, con email verificado o Google) o un uid en `admins/{uid}`.

| Colección | Qué guarda | Lee | Escribe |
|---|---|---|---|
| `admins/{uid}` | Lista de admins (email, rol) | super admin; cada uno el suyo | super admin |
| `site_config/{id}` | `announcement`, `feature_toggles`, `companion`, `welcome` | todos | admins (la forma de `announcement` está validada) |
| `summit_content/{key}` | Contenido del CMS (sección 10) | todos | admins |
| `summit_speakers`, `summit_sessions`, `approved_sponsors`, `gamification_tiers`, `tenants`, `questions`, `sessions` | Catálogos heredados y del motor | todos | admins |
| `summit_private/{doc}` | `checkin` (código de la puerta), `initiate_emails` | admins | admins |
| `credential_grants/{uid}` | Roles de Holo Card aprobados (`speaker`, `sponsor`, `initiate`, `press`) | dueño, admins | admins |
| `initiate_requests/{uid}` | Solicitud de Initiate desde el pase | dueño, admins | el dueño crea y edita; los admins listan y borran |
| `initiate_claims/{email}` | Qué Initiate es cada email | la persona con ese email verificado, admins | admins |
| `pass_emails/{sha256}` | Un pase por email: `{ code, userId, at }` (sin el email) | cualquiera con sesión | crear: el propio uid. Actualizar: el dueño o quien tenga ese email verificado. |
| `ticket_inquiries/{código}` | Registros del SGX Pass | dueño, admins | crear: con forma válida, uid propio, estado `PENDING`. El dueño edita sus datos, consentimiento, pilar y `avatar` (≤3000), nunca el estado. Estado e invitación: admins. |
| `sponsor_inquiries` | Solicitudes de auspicio y de prensa (`PRESS`) | admins | crear: cualquiera, con forma válida y `submittedBy` = uid propio; editar y borrar: admins |
| `speaker_submissions` | Solicitudes del Portal de speakers | admins | crear: cualquiera, validado, sin marcarse keynote |
| `leads` | Clientes potenciales (⭐) | admins | admins (validado) |
| `players/{uid}` | Perfil de jugador (con email) | dueño, admins | dueño, admins |
| `pilot_profiles/{uid}`, `pilot_leaderboard/{uid}` | Progreso y leaderboard del Creador | todos | dueño, campos permitidos, XP ≤ 100,000 |
| `game_scores/{stack\|pulse\|bolt}/players/{uid}` | Puntajes de los juegos | todos | dueño (crear y mejorar) |
| `gamification_rewards` | Premios de la Tienda | todos | admins; un Creador solo puede bajar el inventario en 1, junto con su vale |
| `redeemed_prizes` | Vales (nombre, email) | dueño, admins | crear: el vale propio, uno por premio, en el mismo batch |
| `chat_messages` | Foros y chat | todos | crear: con sesión, como uno mismo. Reacciones: +1 emoji por escritura. Fijar y moderar: admins. |
| `social_posts` | Radar social | todos | crear: uno mismo, nunca "verified"; solo likes +1 y añadir comentarios |
| `match_profiles` | Tarjeta pública de Match (sin email) | todos | dueño |
| `match_intents`, `match_passes` | Intenciones y pases de Match | las dos personas | crear los propios |
| `matches` | Matches | las dos personas | se crea solo cuando existen las dos intenciones |
| `match_reports` | Reportes | admins | crear los propios |
| `summit_poll_votes` | Votos de encuestas | todos (conteos) | un voto por persona y encuesta, sin editar |
| `summit_visit_stats`, `summit_visit_regions`, `summit_visitors` | Radar de visitas | todos (`summit_visitors`: solo `get`) | contadores +1; nombres de región en texto plano |
| `summit_pass_exchanges` | Buzón del Rolodex | dueño del buzón | crear tu tarjeta en el buzón de otro |
| `summit_constellations/{uid}` | Conteos por pilar de la Red | todos | dueño (solo conteos) |
| `summit_checkin_proofs/{uid}` | Prueba de check-in con el código | admins | solo el Día 3, con el código de la puerta |
| `summit_checkins/{uid}` | Check-in (solo la región) | todos | solo el Día 3, junto a una prueba válida |
| `client_errors` | Reportes de errores | admins | crear: cualquiera, con forma estricta (≤500 caracteres de mensaje, ≤4000 de stack) |
| `mail_log/{kind}_{id}` | Correos enviados | admins | nadie desde la app (lo escribe el mailer) |
| `telemetry_events`, `telemetry_aggregates`, `leaderboard_scores` | Telemetría heredada | admins | admins |

Pruebas: `scripts/rules-test/` (175 casos más la ventana del Día 3) y `scripts/e2e/`. Más contexto en `docs/FIRESTORE_RULES.md` y `docs/security_spec.md`.

### Seguridad, en resumen

- **App Check**: no está implementado (ver la sección 2).
- **Admin del cliente** (`AuthContext.tsx`): la misma definición que `isAdmin()` en las reglas. **Admin del servidor**: ID token verificado contra Identity Toolkit más la lista `SGX_ADMIN_EMAILS`.
- **Límites de ritmo**:
  - REST: 120 por IP, 40/s;
  - WS: 1500 sockets por IP y tope de tamaño;
  - Highbot: por persona, por IP, simultáneos y presupuesto (sección 8).
- **Validación**: todas las preguntas y todos los payloads del motor pasan por `src/server/security/validation.ts`, y las reglas validan la forma de cada escritura de visitante.
- **Privacidad**:
  - el radar guarda solo la región aproximada, nunca la IP;
  - `pass_emails` guarda solo el hash del email;
  - el QR del pase no lleva el email;
  - `match_profiles` no lleva email;
  - el Highbot no registra lo que se escribe;
  - el consentimiento de imagen es obligatorio al forjar;
  - el CSV de inscritos está protegido contra fórmulas.
- **Lo que nunca va al cliente**: `ANTHROPIC_API_KEY`, `COMPANION_MODEL`, `IG_GRAPH_TOKEN`, `SGX_TEST_ADMIN_TOKEN` y el código de check-in (`summit_private`). Nada secreto va con prefijo `VITE_`. `.env*` está en `.gitignore` (salvo `.env.example`).
- **Correos**: los manda el Apps Script de info@ con su propio acceso IAM al proyecto, sin contraseñas ni claves (sección 14).

### Variables de entorno del servidor

| Variable | Para qué |
|---|---|
| `PORT` | Puerto (3000 por defecto) |
| `NODE_ENV` | `production` activa la compresión, HSTS y el head SEO, y desactiva el mock y el token de prueba |
| `SGX_ADMIN_EMAILS` | Admins del motor en vivo (por defecto info@ y support@) |
| `FIREBASE_API_KEY` | Opcional; si falta, usa la del config para Identity Toolkit |
| `ANTHROPIC_API_KEY`, `COMPANION_MODEL` | Highbot (secreto en Cloud Run) |
| `IG_GRAPH_TOKEN` (secreto en Cloud Run), `IG_USER_ID`, `IG_HASHTAGS`, `IG_GRAPH_VERSION` | Radar de Instagram (`docs/INSTAGRAM_RADAR.md`) |
| `COMPANION_DAILY_USD`, `COMPANION_USER_DAILY`, `COMPANION_PRICES`, `COMPANION_FALLBACKS` | Ajustes del Highbot |
| `COMPANION_MOCK`, `COMPANION_SETTINGS_TTL_MS`, `IG_RADAR_MOCK`, `IG_CONFIG_TTL_MS`, `SGX_TEST_ADMIN_TOKEN` | Solo para pruebas locales |
| `VITE_USE_EMULATORS`, `VITE_EMULATOR_FIRESTORE_PORT`, `VITE_EMULATOR_AUTH_PORT`, `DISABLE_HMR` | Desarrollo y e2e |

---

## 14. Correos automáticos

**Archivos:** `scripts/email/Code.gs` y `appsscript.json`. Configuración en `docs/EMAIL_SETUP.md`.

Un proyecto de Google Apps Script ("SGX Mailer") en la cuenta **info@spatialgineers.com** lee Firestore por REST **cada 5 minutos** y manda cada correo **una sola vez por persona**:

| Tipo (`kind`) | Asunto | Disparador |
|---|---|---|
| `confirm` | "Tu SGX Pass está forjado" | Registro nuevo en `ticket_inquiries`, creado después del `setup()` |
| `invite` | "Estás invitado al Día 3" | El admin marca `INVITED` (a mano o al aprobar prensa) |
| `holo` | "Tu Holo Card está lista" | Se aprueba un speaker, sponsor o prensa (`credential_grants`) |
| `remind1` | "Mañana empieza el Summit" | 10 dic, 10:00 AM, a todos los inscritos (menos los rechazados) |
| `remind3` | "Mañana nos vemos en Chroma" | 12 dic, 10:00 AM, solo a `INVITED` o `CONFIRMED` |

- Cada envío queda en `mail_log/{kind}_{id}`. Así nada se repite, y el admin muestra ✉ junto a cada inscrito.
- Los botones del correo usan `?estudio=…` para abrir Tu Estudio en la pestaña correcta.
- **Costo** $0. **Cuota** de unos 1,500 correos al día (Workspace): guarda `QUOTA_RESERVE` = 25 y, si se acaba, sigue al día siguiente donde se quedó.
- **Funciones:** `setup` (instala el disparador), `stop`, `status`, `processQueue` y `testAll` (5 muestras a info@).
- **`CONFIG`:** `TEST_TO` (mientras se prueba, todo llega ahí), `REMIND_DAY1_AT`/`REMIND_DAY3_AT` y `MAX_PER_RUN` = 40.
- **Probar sin Google:** `node scripts/email/test-emulator.cjs`, contra el emulador de Firestore.

---

## 15. Pruebas y operación

### Correr en local con emuladores

Nunca contra producción. La app solo se conecta a los emuladores con `VITE_USE_EMULATORS=1` **y** corriendo en localhost (`src/lib/firebase.ts`).

```bash
npm install
cd scripts/e2e && cp ../../firestore.rules .
npx -y firebase-tools@13.29.1 emulators:start --only firestore,auth --project <id-del-proyecto> &
# en la raíz, otra terminal:
VITE_USE_EMULATORS=1 DISABLE_HMR=true PORT=3200 npx tsx server.ts
# Highbot sin gastar: añade COMPANION_MOCK=1
```

- Puertos por defecto: Firestore 8085 y Auth 9099.
- Para una **segunda pila** que no toque esos puertos:
  - levanta los emuladores en otros puertos con tu propio `firebase.json`;
  - arranca con `VITE_EMULATOR_FIRESTORE_PORT=8185 VITE_EMULATOR_AUTH_PORT=9199 … PORT=3300`;
  - corre los scripts con `APP_URL=http://localhost:3300 FS_PORT=8185`.

### Suites e2e (`scripts/e2e/`, Playwright)

Las capturas van a `scripts/e2e/out/`. Hay que correr `visitor.cjs` antes que `admin.cjs`.

| Script | Qué cubre |
|---|---|
| `visitor.cjs` | Forjar pase, perfil, encuesta, chat, formulario de sponsors, visitas, todas las pestañas; cero llamadas a Firebase real |
| `admin.cjs` | Google emulado como info@: invitar, código del Día 3, anuncio, publicar en el CMS |
| `holo.cjs` | Holo Card = pase; speaker en revisión → aprobado; Initiate por email de Google; visor |
| `pilot.cjs` | El constructor del Highbot en la Forja y en Avatar Studio (escritorio y 390 px) |
| `pass.cjs` | Editar es un solo formulario; un email = un pase |
| `recover.cjs` | Un pase de invitado vuelve en otro equipo al entrar con Google con el mismo email; la Forja no se queda en "Verificando" |
| `account.cjs` | Cambio de cuenta: cada cuenta Google conserva su pase, XP y avatar; nunca hereda los de otra |
| `agenda.cjs` | El `.ics` con aviso de 15 min, el enlace de Google Calendar y la exportación de "Mi Agenda" |
| `companion.cjs` | Highbot con `COMPANION_MOCK=1`: respuestas de muestra sin pase, la cabecita, pase de invitado → pide Google, interruptor del admin, y el bloque del Día 1 de las páginas de pilar |
| `deadlines.cjs` | Portal de speakers y formulario de sponsors se cierran solos (`sgx_now`); fechas del portal de bienvenida (también en el HTML del servidor, vía `deadlinesHtml.ts`); nota del Día 3 en Inscritos |
| `press.cjs` | `/prensa`: forja → acreditación → código; el admin aprueba (X/10, CSV); el pase pasa a PRENSA y queda invitado; `/bienvenida/prensa`; estado cerrado |
| `leads.cjs` | ⭐ en Inscritos, Sponsors y Rolodex; seguimiento; un visitante nunca ve la estrella |
| `errors.cjs` | Un error en la página llega a `client_errors` (deduplicado y con tope) y se ve en "Errores en vivo" |
| `pwa.cjs` | Manifest, íconos, service worker y el SGX Pass sin red (build con emuladores servido en :3400) |
| `fixes.cjs` | El recorrido 360° paga XP una vez por punto; `/play` paga +25 XP por pregunta (no al relanzarla); `POST /api/vote` toma al votante del token firmado (401 sin él, 409 duplicado, 429 por ritmo); `/studio` y `/estudio` abren Tu Estudio y `/multiview` no. Necesita el servidor con `SGX_TEST_ADMIN_TOKEN` y `ADMIN_TOKEN` igual en el script. |
| `a11y.cjs` | axe-core WCAG 2.1 A/AA en 16 pantallas × 2 tamaños más teclado (`A11Y_STRICT=1`; ver `docs/ACCESIBILIDAD.md`) |
| `prod-readonly.cjs` | Humo de **solo lectura** contra producción: bloquea toda escritura antes de que salga |

### Otras pruebas

| Qué | Cómo |
|---|---|
| Reglas de Firestore | `scripts/rules-test/`: `npm install`, copiar las reglas y `npx -y firebase-tools@13.29.1 emulators:exec --only firestore --project demo-sgx "node all.mjs"`. Para la ventana del Día 3, `day3.mjs` con una copia de las reglas con la ventana abierta (ver su README). |
| Servidor WS/REST | `SGX_TEST_ADMIN_TOKEN=testadmin123 PORT=3000 npx tsx server.ts`, y luego `node scripts/server-test/wstest.mjs` |
| Carga | `node scripts/loadtest/ws-load.mjs [--clients N]`, solo local (rechaza cualquier URL que no sea localhost). Ver `scripts/loadtest/README.md`. |
| Tipos y build | `npm run lint` (`tsc --noEmit`) y `npm run build` |
| Mailer | `node scripts/email/test-emulator.cjs` |

### Herramientas de contenido

- `scripts/press-kit/build.cjs` reconstruye el kit de prensa (`public/press/`). Necesita Playwright, Python con Pillow, curl y zip.
- `scripts/make-previews.cjs` hace las capturas de los módulos para las páginas de pilar (`public/previews/`).
- `scripts/promo/` arma el reel vertical (grabación en cámara lenta y armado a 30 fps).
- `scripts/pilot-etch-masks.py` genera las máscaras del grabado del torso del Highbot (`public/pilot/tex/etch/`).

### Desplegar

1. `npm run lint` y `npm run build`. El build regenera `dist/` y **`server.js`**, y `server.js` se sube al repo.
2. Subir a `main` y hacer pull en Google AI Studio, que despliega en Cloud Run.
3. **Inmediatamente después**, publicar `firestore.rules`: `firebase deploy --only firestore:rules`, o Firebase Console → Firestore → Reglas → pegar → Publicar.
   - Primero el código y después las reglas, el mismo día. Si se invierte el orden, la app vieja puede escribir formatos que las reglas nuevas rechazan.
   - Antes de publicar, respaldar las reglas actuales.
4. En Cloud Run, durante el evento: **mín. 1 y máx. 1 instancia** más **afinidad de sesión**. Revisar que las variables (`ANTHROPIC_API_KEY` como secreto, `COMPANION_MODEL`…) sigan puestas y que `/api/companion/status` diga `live`.
5. Entrar como admin y comprobar:
   - que la lista de Inscritos carga;
   - que un cambio pequeño del CMS se ve desde otra ventana en incógnito;
   - que el código del Día 3 está guardado antes del 13 dic.

### Errores comunes

- **Dos instancias en Cloud Run** parten las votaciones en salas separadas, y **un reinicio** borra el estado en vivo.
- **Un deploy de AI Studio puede borrar las variables**: el Highbot pasa a `off` y responde con la guía local. No se rompe nada, pero hay que revisarlo.
- **Olvidar regenerar `server.js`**: los cambios del servidor no llegan a producción.
- **Reglas sin publicar** o publicadas antes que el código: escrituras rechazadas (chat, registros, premios).
- **Sin código de check-in guardado**, el check-in del Día 3 no abre.
- **`/sponsors`** es a la vez página y carpeta de logos (`public/sponsors/`): `express.static` corre con `redirect: false` para no redirigir a `/sponsors/`.
- **Una pestaña abierta tras un deploy** pide chunks que ya no existen: el servidor responde 404 y la app recarga sola, una vez como mucho (`vite:preloadError` por el guardia de recargas). Si ya recargó en esa sesión, la sección muestra "Reintentar".
- **`sgx_now`** se queda en el navegador: hay que borrarlo después de probar.
- **El XP es por dispositivo** (el libro está en `localStorage`) y se sincroniza al perfil con Google. Al probar, usar ventanas limpias.

---

## 16. Lo que hace esta app de otro nivel

| Rasgo | Por qué importa |
|---|---|
| **Núcleo 3D en tiempo real con shaders propios** (bloom, piso con ondas, haces de energía, capa fresnel, humo que sigue al pilar, calidad adaptativa) | La portada es la marca: el SGX Framework se toca y se recorre, y aguanta teléfonos modestos |
| **Holo Card = SGX Pass**, con foil que sigue la inclinación, reverso con QR y formatos tarjeta, post 4:5 y story 9:16 | Una sola credencial que sirve de entrada, de tarjeta de contacto y de pieza para compartir, y que cambia sola al rol aprobado |
| **Highbot propio**, armable pieza por pieza (presets, accesorios, placas, texturas grabadas), en 3D y en 2D toon | Cada Creador tiene un personaje suyo que aparece en su pase, en el núcleo y en el chat |
| **Compañero con Claude**, con pase + Google, topes de gasto, interruptor en el admin, herramientas solo para navegar y respaldo local sin red | Ayuda real dentro de la app, con costo controlado y sin riesgo de que haga algo más que hablar y guiar |
| **Escenario dirigido por la audiencia**: votos estilo Kahoot y CYOA que cambian el visual en vivo, con salida limpia para OBS | La transmisión deja de ser pasiva; probado con 2000 teléfonos simulados y p99 ≤ 102 ms |
| **Economía de pase gamificada**: Reactor por pilar con sellos, quests, Overdrive, celdas escondidas, Tienda que no baja rango, anti-farm | Da una razón para recorrer cada módulo y para volver los tres días |
| **Networking por QR con Rolodex mutuo y constelación** | Un escaneo guarda a las dos personas; el Día 3 se convierte en un juego de conexiones |
| **PWA sin instalación, con pase sin conexión** | Funciona desde un enlace, y el QR abre aunque no haya señal en la puerta de Chroma |
| **Portal de bienvenida por rol con enlaces personalizados**, generador de invitaciones (WhatsApp, correo HTML) y SEO/GEO inyectado por el servidor | Cada speaker, sponsor y medio recibe su propia guía; los buscadores y los motores de respuesta leen el evento sin JavaScript |
| **Kit de prensa generado desde los datos** (ficha PDF, ZIP, logos, fotos, capturas reales) | La prensa tiene todo en un clic y nunca se desalinea con la app |
| **Fechas límite en una sola fuente**, con cierre automático de formularios | Ninguna página, correo o respuesta del Highbot da una fecha distinta |
| **Centro de mando sin código**: CSV en todo con vista previa, publicado vs. local, kill switch del Highbot, errores en vivo, check-in con QR, leads ⭐ | El equipo opera el evento sin tocar el repo ni redeployar |
| **Monitoreo de errores propio** | Se ve lo que falla en los teléfonos durante el evento, sin terceros |
| **Accesibilidad auditada** (axe WCAG 2.1 AA, foco visible, saltar al contenido, modales con foco atrapado, contraste por tema) | La experiencia 3D no deja fuera a nadie; el dock de pilares es la alternativa completa por teclado |
| **Bilingüe ES/EN de punta a punta** | Lista para audiencias fuera de Puerto Rico sin una segunda app |

---

### Novedades del 11 de noviembre
- **Tu Estudio 3D:** el cuarto del Highbot es el primer tab de Tu Estudio ("Estudio 3D"). Se entra desde el núcleo ("Entrar a Tu Estudio 3D"), desde SGX.Synthesize o por `/estudio-3d`. Tiene objetos para agarrar y tirar, un aro con marcador y el Highbot camina con pasos reales. Código en `src/identity/studioRoom/` (`roomScene.ts`, `roomPlay.ts`).
- **Núcleo en vivo:** durante el evento aparece la barra "EN VIVO · Ahora: <sesión>" sobre el núcleo (`src/lib/summitLive.ts`). Usa las horas del programa en hora de Puerto Rico.
- **Recorrido de 60 segundos:** el Highbot lo ofrece en la primera visita (`src/companion/SgxQuickTour.tsx`) y termina en "Forja tu pase".
- **Holo Card en video:** botón "Video para stories" en el Holo Studio (`src/identity/holoCardVideo.ts`); 6 s, 1080×1920, grabado en el dispositivo.

## 17. Glosario e índice de archivos clave

### Glosario

| Término | Significado |
|---|---|
| **Creador** | Cada visitante de la app |
| **Tu Estudio** | La página personal del Creador: pase, Highbot, Reactor, Red, Rolodex, Día 3, telemetría. En código: `SgxHangar` / `CREDENTIAL_GENERATOR`. |
| **SGX Pass** | La credencial gratis del Summit; es lo mismo que la Holo Card. Se forja en la Forja. |
| **Forja** | El flujo para crear o editar el pase (`SgxForge.tsx`) |
| **Holo Card** | La tarjeta visual del pase, con frente, reverso, foil y formatos para compartir; cambia según el rol aprobado |
| **Highbot** | El avatar y compañero de cada Creador: Highcoon en forma de robot. En código, varios nombres heredados llevan "pilot" (`PilotBuilder`, `pilot_profiles`). |
| **Highcoon** | La IP propia de Spatialgineers; solo se presenta, con sus enlaces (@Highcoonvibes) |
| **Pilares** | Los seis del SGX Framework: SGX.Story, SGX.Showcase, SGX.Spark, SGX.Stage, SGX.System, SGX.Synthesize (siempre con punto) |
| **Módulo** | Cada página o función del Menú dentro de un pilar (código `0P.N`, p. ej. 04.1 Agenda) |
| **Estación de pilar** | La página `/pilar/<slug>` |
| **Núcleo** | La escena 3D de la portada |
| **Reactor** | El sistema de misiones por pilar; cada pilar completo deja un sello |
| **Sello** | La marca en el pase por un pilar completo, un reto de sponsor o el Día 3 |
| **XP** | Los puntos que se ganan participando; el rango sube con el XP total y la Tienda gasta sin bajar rango |
| **Overdrive** | 12 s con XP doble en las celdas al llenar la barra de energía |
| **Celda de energía** | Un rayo SGX escondido en cada sección |
| **Tienda del Reactor** | El canje de XP por premios |
| **SGX Live** | Votar y reaccionar en vivo (`/play`) y el escenario (`/stage`) |
| **CYOA** | Preguntas de opinión donde la audiencia decide qué pasa en el escenario |
| **Paquete 1–5** | Los niveles de patrocinio del Summit (nunca "Tier"; el id interno es `tier_N`) |
| **Tu marca aquí** | Lugares de marca abiertos a propósito para invitar sponsors |
| **Rolodex** | La libreta mutua de contactos escaneados |
| **Red / constelación** | Los contactos dibujados como estrellas por pilar |
| **Initiate** | Miembro del SGX Guild en el Summit (8 presentan portafolio el Día 1; los top 6 hacen pitch el Día 3) |
| **SGX Guild** | La red de talento creativo de Spatialgineers; sin convocatoria abierta |
| **Centro de mando** | El admin (`/admin`) |
| **Publicado / Solo en este equipo** | Si un cambio del admin llegó a Firestore o se quedó local |
| **Modo ligero** | Sin 3D, shaders ni animaciones; ahorra batería y datos |
| **Modo calma** | El primer pantallazo, solo con el núcleo y el hero, antes de que llegue el HUD |

### Índice de archivos clave

| Área | Archivos |
|---|---|
| Arranque | `src/main.tsx`, `src/App.tsx`, `index.html`, `vite.config.ts` |
| Rutas | `src/lib/summitUrlSync.ts`, `src/components/summit/sectionKeys.ts`, `src/components/common/HeaderNav.tsx` |
| Pilares y menú | `src/lib/sgxPillars.ts`, `src/immersion/sections.ts`, `src/immersion/navigation.ts` |
| Secciones | `src/components/summit/SummitLandingPage.tsx`, `SgxModulePage.tsx`, `SummitSectionBanner.tsx`, `SgxSectionHudBar.tsx` |
| Núcleo 3D | `src/components/summit/SgxOrbitalCore3D.tsx`, `SummitExperienceHub.tsx`, `SgxHeroOverlay.tsx`, `SgxClocksBanner.tsx` |
| Shaders | `src/immersion/shaders/*`, `docs/SHADER_GUIDE.md` |
| Inmersión | `src/immersion/ImmersionContext.tsx`, `ImmersionLayer.tsx`, `quests.ts`, `MissionRail.tsx`, `EnergyCell.tsx`, `CommandTerminal.tsx`, `SgxBootSequence.tsx`, `SgxMobileDock.tsx`, `calmMode.ts`, `SponsorXpPop.tsx` |
| Identidad | `src/identity/SgxIdentityContext.tsx`, `SgxPassHost.tsx`, `SgxForge.tsx`, `SgxHangar.tsx`, `SgxHoloStudio.tsx`, `holoCardCanvas.ts`, `credentials.ts`, `accountSlots.ts`, `passNetwork.ts`, `reactor.ts`, `PassGate.tsx`, `ForgeFirst.tsx`, `SgxRoleRequests.tsx` |
| Highbot (avatar) | `src/identity/PilotBuilder.tsx`, `pilotAvatar.ts`, `highbot3d.ts`, `highbotGear.ts`, `highbotStudio.ts`, `SgxPilot3D.tsx`, `SgxPilotGlyph.tsx`, `pilotOrbit3D.ts` |
| Highbot (compañero) | `src/companion/*`, `src/server/companion/companionRouter.ts`, `knowledge.ts`, `docs/HIGHBOT_COMPANION.md`, `docs/highbot/*` |
| XP y perfil | `src/context/PilotProfileContext.tsx`, `src/lib/gamification.ts`, `src/lib/rewardsStore.ts`, `src/lib/gameScores.ts` |
| Contenido | `src/lib/summitData.ts`, `src/lib/summitProgram.ts`, `src/lib/sgxPortfolio.ts`, `src/lib/content/liveLists.ts`, `src/lib/csv/*` |
| Fechas | `src/lib/summitDeadlines.ts` |
| Términos de sponsors y guía del speaker | `src/lib/sponsorTerms.ts`, `src/lib/speakerGuide.ts`, `src/components/summit/sponsors/SponsorTerms.tsx`, `src/components/summit/speakers/SpeakerGuide.tsx`, `src/components/summit/sgxGuides.css`, `src/lib/anchorScroll.ts` |
| Bienvenida, prensa y SEO | `src/lib/welcomePortal.ts`, `src/lib/welcomeInvites.ts`, `src/lib/pressKit.ts`, `src/lib/pressRequests.ts`, `src/server/welcomeMeta.ts`, `src/components/summit/welcome/*`, `src/components/summit/press/*` |
| Sponsors | `src/components/summit/sponsors/*`, `SummitSponsorInquiryForm.tsx`, `SummitBrandShowcaseModal.tsx`, `TransientSponsorSlot.tsx`, `src/immersion/splashSponsors.ts` |
| En vivo | `server.ts`, `src/server/engine/*`, `src/server/routes/apiRouter.ts`, `src/server/security/*`, `src/components/audience/AudiencePWA.tsx`, `src/components/stage/*`, `src/components/visualizer/*`, `src/lib/presets.ts` |
| Admin | `src/components/admin/*`, `docs/ADMIN_GUIDE.md` |
| Firebase | `src/lib/firebase.ts`, `src/context/AuthContext.tsx`, `firestore.rules`, `firebase-applet-config.json`, `docs/FIRESTORE_RULES.md` |
| PWA y estáticos | `public/manifest.webmanifest`, `public/sw.js`, `public/sitemap.xml`, `public/robots.txt`, `public/press/`, `public/previews/` |
| Errores | `src/lib/errorMonitor.ts`, `src/components/admin/ClientErrorsPanel.tsx`, `src/components/common/AppCrashBoundary.tsx`, `LazyBoundary.tsx` |
| Correo | `scripts/email/*`, `docs/EMAIL_SETUP.md` |
| Pruebas | `scripts/e2e/*`, `scripts/rules-test/*`, `scripts/server-test/wstest.mjs`, `scripts/loadtest/*` |
| Despliegue | `docs/DEPLOY.md`, `docs/PLAN_CIERRE.md` (sección 3: orden obligatorio) |
