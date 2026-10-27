# Plan de cierre · Auditoría 2 (Spatialgineers Summit 2026)

Estado al 27 oct 2026. Todo el trabajo vive en la rama `claude/practical-maxwell-gdsdse`.
**Main no se ha tocado.** No se ha desplegado ninguna regla de Firestore.

---

## 1. Lo que ya está hecho (en la rama)

| Área | Qué se hizo | Cómo se verificó |
|---|---|---|
| Servidor de votación | Admin verificado con token de Google (info@ / support@) para dirigir; validación de preguntas; 1 voto por socket; límites de tamaño y de ritmo; sin crash con datos malos | 11/11 pruebas WebSocket + REST |
| Reglas de Firestore | Reescritas por colección (ver `docs/FIRESTORE_RULES.md`) | 133 casos en el emulador + check-in del Día 3 |
| Inscritos | Pestaña admin "0. INSCRITOS & DÍA 3": lista, estados, CSV, código y QR del check-in, solicitudes de speakers | Compila; falta prueba con admin real |
| Forja | Consentimiento de imagen obligatorio, se guarda en el registro | Navegador |
| Contenido en vivo | Lo que publica el admin en el CMS llega a todos (`summit_content`) | Compila; falta prueba con admin real |
| Anuncios, encuestas, analítica | Reales y compartidos; sin números inventados | Navegador |
| Sponsors / speakers | El formulario y el portal llegan al equipo (Firestore) | Navegador (con Firebase bloqueado) |
| Match, chat, premios, social | Sin perfiles de muestra, sin fotos de stock, sin datos ajenos expuestos | Emulador |
| Rendimiento | Carga inicial −32% (carga diferida) | Build |
| Móvil | Cabeceras compactas, botones ≥40 px, texto ≥11 px | Playwright 390 px |
| Inglés | Sitio completo ES/EN | 0 palabras en español en EN, 15 rutas |
| Limpieza | Código muerto, dependencias sin uso, documentos internos fuera de `public/` | Build |

---

## 2. Lo que falta (fallos confirmados por la revisión)

Ordenados por prioridad. Ya arreglados en el último commit WIP: anuncios rechazados por las reglas, premios agotados canjeables, reacciones del chat manipulables, límite de conexiones del venue, tamaño de mensajes del director, IP falsificable, verificación de admin que se quedaba en "no admin", analítica sin datos en vivo, aprobación de speaker que borraba la solicitud aunque fallara, formulario de sponsors rechazado por textos largos.

### A. Bloqueantes antes de subir a main
1. **Check-in del Día 3 con pase ya forjado no funciona.** `src/identity/SgxPassHost.tsx` (~líneas 125–162): el check-in se llama con un temporizador antes de que exista el usuario. Arreglo: siempre marcar `pendingCheckin.current = true` y ejecutarlo en el efecto que depende de `[isForged, myUid]` solo cuando `myUid` exista; mostrar el resultado en el Hangar (pestaña Día 3).
2. **El progreso del piloto (XP, nivel, logros) se reinicia al recargar.** `src/context/PilotProfileContext.tsx`: el documento `pilot_profiles/{uid}` se crea una vez y nunca se actualiza, pero al cargar pisa el progreso local. Arreglo: escribir con debounce (~3 s) cuando cambie el perfil, y al cargar fusionar con `Math.max` (XP, récords, contadores) en vez de pisar. Quitar valores `undefined` anidados (p. ej. `achievements[].unlockedAt`) antes de escribir.
3. **El CMS del admin puede republicar datos viejos.** `src/components/admin/AdminDashboard.tsx` y `SummitCMSManager.tsx` cargan el contenido una sola vez. Arreglo: escuchar el evento `storage` y recargar los 6 conjuntos; y que cada guardado parta de `loadAll*()` del momento, no del estado montado. Mostrar el resultado real de `publishContent` (ya devuelve `true/false`).
4. **Inscritos: registros viejos digitales salen como "Confirmado" y la Forja duplica registros al editar.** `SummitRegistrationsPanel.tsx`: tratar `DIGITAL + CONFIRMED + sin invitedAt` como `PENDING` y deduplicar por `referenceCode`. Mejor: en `passNetwork.registerPass` usar `setDoc(doc(db,'ticket_inquiries', pass.code))` y añadir en las reglas un update del dueño limitado a datos de perfil y consentimiento (sin `status`).
5. **Un módulo que falle al cargar deja la app en blanco.** Añadir un `ErrorBoundary` alrededor de cada `<Suspense>` (App.tsx y SummitLandingPage.tsx) con botón "Reintentar", y en `main.tsx` recargar una vez ante `vite:preloadError`.

### B. Importantes, pueden ir en el mismo push
6. **Match: quien conecta primero nunca ve el match.** `src/modules/match/matchData.ts`: al abrir Match, para cada intento enviado consultar `matches/{a__b}` y traer la tarjeta de `match_profiles`.
7. **El toggle de visibilidad del admin crea tarjetas de Match incompletas.** `toggleProfileVisibilityAdmin`: solo actualizar si la tarjeta existe; en el deck ignorar tarjetas sin `profile.pitch`.
8. **Premios que solo existen en el catálogo local fallan al canjear.** `rewardsStore.redeemPrize`: si el doc del premio no existe en Firestore, decir "este premio aún no está activo" en vez de intentar el batch.
9. **Importar preguntas rechazadas deja al director desincronizado.** `src/App.tsx`: escuchar el mensaje `ERROR` del servidor y mostrarlo; no actualizar la lista local hasta que el servidor confirme (`ROOM_STATE_SYNC`).
10. **El aviso de "almacenamiento lleno" dice que guardó cuando no guardó.** `SgxIdentityContext.tsx`: usar `detail.saved` para el texto.
11. **El ensayo con `?checkinTest=1` da el sello y 250 XP.** No otorgar el flag `checkin` en ensayo.
12. **CSV de inscritos: inyección de fórmulas.** En `csvCell`, anteponer `'` a valores que empiecen con `= + - @`.
13. **Los anuncios solo aparecen en la portada.** Mover `subscribeAnnouncement` a un nivel global (p. ej. `ImmersionLayer` o `App.tsx`).

### C. Menores (si sobra tiempo)
- Nombre del pase no llega al servidor en votos binarios.
- Textos sin traducir: errores de inicio de sesión, nombres de logros y rangos, "Versión".
- Draco: los decodificadores locales se emiten sin usarse (no afecta a visitantes).

---

## 3. Cómo no romper Firestore al desplegar (orden obligatorio)

Las reglas **no cambian ni borran datos**: solo deciden quién lee y escribe. El riesgo es rechazar escrituras legítimas. Por eso:

1. **Antes de desplegar**, correr la suite del emulador con las reglas finales y añadir un caso por cada payload real de la app que cambió en la sección 2 (pilot_profiles con debounce, ticket_inquiries por código, reacciones, premios). Harness: `scripts/rules-test/` (ver su README).
2. **Prueba de punta a punta contra el emulador** (recomendado): conectar la app al emulador de Firestore y Auth solo en desarrollo (`connectFirestoreEmulator` / `connectAuthEmulator` cuando `VITE_USE_EMULATORS=1`) y recorrer en Playwright: forjar pase → registro aparece; chat → mensaje y reacción; encuesta → voto; sponsor → solicitud; admin (token de prueba) → publicar speaker, anuncio, invitar inscrito, guardar código de check-in.
3. **Desplegar código y reglas el mismo día, en este orden:**
   1. Subir a main y hacer pull en AI Studio (desplegar la app).
   2. Inmediatamente después, publicar `firestore.rules` (consola de Firebase → Firestore → Rules → Publicar).
   - Si se invierte el orden, la app vieja seguiría escribiendo con formatos que las reglas nuevas rechazan (por ejemplo, el chat sin `authorUid`).
4. **Respaldo:** antes de publicar, copiar las reglas actuales de la consola a un archivo (`docs/firestore.rules.backup-2026-10-27`). Si algo falla, se restauran en 1 minuto.
5. **Después de desplegar**, entrar como admin con Google (info@ o support@) y:
   - guardar el código del check-in del Día 3 (pestaña Inscritos);
   - verificar que la lista de inscritos carga;
   - publicar un cambio pequeño en el CMS y verlo desde otra ventana en incógnito.
6. **Cloud Run:** min/max instancias = 1 y afinidad de sesión durante el evento (ver `docs/DEPLOY.md`).

---

## 4. Checklist para dar por terminado

- [ ] Arreglos A1–A5 hechos.
- [ ] B6–B13 hechos o descartados con razón.
- [ ] `npx tsc --noEmit -p .` limpio y `npx vite build` OK.
- [ ] Servidor: 11/11 pruebas (`scripts/server-test/wstest.mjs`).
- [ ] Reglas: suite del emulador en verde con los casos nuevos.
- [ ] Playwright: flujos clave en ES y EN, móvil y escritorio, 0 errores de página.
- [ ] `server.js` regenerado (`npx esbuild server.ts --bundle --platform=node --format=esm --packages=external --outfile=server.js`).
- [ ] Merge a main y push.
- [ ] Despliegue en el orden de la sección 3.
