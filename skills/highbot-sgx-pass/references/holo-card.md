# Holo Card

- Render en canvas (`holoCardCanvas.ts`), 1050×660 base: `drawCardFront(ctx, art)` (nombre, callsign, rol, organización, pilar, retrato del Highbot, serial, logo) y `drawCardBack` (programa del evento + QR del pase).
- Formatos (`renderFormat`): tarjeta (PNG a doble escala), **post 4:5** (1080×1350) y **story 9:16** (1080×1920) con fondo, glow del color del pilar y titular.
- Rol visible según credencial: CREADOR (visitante), SPEAKER, SPONSOR, PRENSA, INITIATE; "En revisión" mientras no se aprueba.
- Acciones: Descargar PNG, Compartir (Web Share con archivo; si no, copia el texto con los hashtags), **Video para stories** (`holoCardVideo.ts`: 6 s 1080×1920 grabados en el dispositivo con `canvas.captureStream` + `MediaRecorder`, MP4 si el navegador lo permite, si no WebM; empuje lento + dos barridos de luz + marco del color). Nada se sube.
- Exportar cumple la misión "Holo Card" y guarda la miniatura en `identity.holo` (aparece en la pared del cuarto).
- Visor de tarjetas ajenas (`sgx:view_holo_card`) para speakers publicados e initiates; inclinación 3D al pasar el dedo.
