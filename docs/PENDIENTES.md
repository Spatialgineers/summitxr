# Pendientes · después del reset del jueves

1. **Pilares:** más información en el Manifiesto y en la página de cada pilar.
2. **Casos de uso:** solo 1 o 2 por pilar o página, y solo reales (nada inventado). Fuente: el portafolio (`src/lib/sgxPortfolio.ts`) y el skill de Spatialgineers.
3. **Infinite Galleries:** integrarla como webapp para presentar a la artista invitada. Falta que Danelson pase el enlace y los datos de la artista.
4. **Campaña:** semanas 3 (25 nov–1 dic) y 4 (2–8 dic) como paquetes del Publicador, con los videos a 1080×1920 nativos.
5. **Contenido extra** que haga falta para esas semanas.
6. **Agenda:** ✅ hecho (Programa completo + Mi agenda con ☆).
7. **Industry Day:** cuando se confirme, añadir a Ada Monzón (Ecoexploratorio) en "Sintetizando el Futuro", y a cada persona invitada en su conversación. Mientras no esté confirmado, no se publica el nombre.
8. **QA completo:** tsc, build y todas las e2e (`scripts/e2e/*.cjs`), más una pasada en el teléfono, para que todo funcione sin tropiezos antes del evento.

## En curso · ideas para elevar la app (11 nov)
- ✅ **Tu Estudio 3D** (`/estudio-3d`, `src/identity/studioRoom/`): cuarto 3D donde el Highbot camina (joystick o teclado), con computadora, pared de Holo Cards de contactos, sellos de pilares y portal al núcleo. Nivel 1 (solo). Falta probarlo en un teléfono real.
- ✅ **Estudio 3D vivo** (`src/identity/studioRoom/roomPlay.ts`): objetos para agarrar y tirar (física propia, sin descargas), aro con marcador de canastas y ayuda de puntería, dron, lámpara de anillos, polvo en la luz y ondas en el piso. Caminata real del Highbot (piernas y brazos alternos; el paso avanza con la distancia recorrida, `setWalk` en `highbot3d.ts`). El cuarto es el primer tab de Tu Estudio ("Estudio 3D") y su módulo vive en SGX.Synthesize. Falta verlo en un teléfono real: aquí no hay GPU y no se puede juzgar el movimiento.
- ⏳ **Nivel 2 del Estudio:** ver a otros Creadores en tiempo real (salas de 30–50, con prueba de carga).
- ✅ **Núcleo en vivo** (`src/lib/summitLive.ts`, barra `#sgx-live-bar` en `SummitExperienceHub.tsx`): durante el evento, una barra "EN VIVO · Ahora: <sesión>" sobre el núcleo, con botón al pilar de esa sesión y a la transmisión de YouTube (Días 1 y 2). Si el Creador no ha escogido pilar, se enciende el de la sesión. Se revisa cada 30 s, sin lecturas a Firestore. Para probarla: `localStorage.sgx_now` con una hora del evento.
- ✅ **Recorrido de 60 s** (`src/companion/SgxQuickTour.tsx`): en la primera visita, sin pase y en el núcleo, el Highbot ofrece un recorrido de 5 paradas (núcleo, programa, pilares, Tu Estudio 3D, "Forja tu pase"), 12 s cada una. No bloquea la página. Se guarda en `localStorage.sgx_tour60_done`; se puede relanzar con el evento `sgx:start_tour60`.
- ✅ **Holo Card en video** (`src/identity/holoCardVideo.ts`, botón "Video para stories" en el Holo Studio): graba en el dispositivo un video de 6 s a 1080×1920 (MP4 donde el navegador lo permite; si no, WebM). No se sube nada. Falta probarlo en iPhone y Android reales.
