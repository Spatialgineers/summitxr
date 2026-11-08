# CLAUDE.md · Spatialgineers Summit 2026 web app

Antes de cualquier cosa, lee `docs/GUIA_WEBAPP.md`. Es la guía maestra de la app, ruta por ruta.

## Idioma y trato
- Con el equipo, escribe en español. Danelson prefiere actualizaciones cortas y frecuentes; no trabajes mucho rato en silencio.
- La app es bilingüe: el español primero y el inglés con el patrón `es` que ya existe.

## Reglas de marca (obligatorias en la UI, los textos y los documentos)
- El evento es **"Spatialgineers Summit"**. Nunca "SGX Summit".
- Los visitantes son **"Creadores"**. Su espacio es **"Tu Estudio"**.
- El auspicio se organiza en **"Paquete 1–5"**. Nunca "Tier" ni "nivel".
- **Prohibido el lenguaje de pilotos, aviación o espacio.** Nada de "piloto", "despegar", "galaxia", "cósmico", "nave" ni 🚀. "Cuántico" tampoco. "Computación espacial" sí está permitido, porque es el término de la industria.
- Siempre se nombra a los dos fundadores: Danelson Maldonado González ("The Highgineer") y Ricardo A. Hernández Díaz ("Lightning Fingers").
- Nunca menciones "The High Creators Group" ni a Marcos Berríos.
- Spatial (spatial.io) cerró. Se menciona en pasado y no se enlaza.
- Highcoon solo aparece con su intro y sus enlaces. Nada sobre virere ni terpenos.
- **Los speakers no envían fotos: su imagen es su Highbot.**
- Ningún ID de modelo de IA puede aparecer en el código, los commits ni los documentos.

## Hechos del evento
- **Fechas:** 11–13 dic 2026. Días 1 y 2 gratis por YouTube Live, junto a Los Mismos TV. Día 3 presencial en Chroma Space Studios, San Juan, por invitación.
- **Fechas límite:** viven solo en `src/lib/summitDeadlines.ts` y la app manda sobre cualquier documento.
  - Perfiles de speakers: hasta el 21 nov.
  - Solicitudes de sponsors: hasta el 28 nov.
  - Pago y materiales de sponsors: 30 nov.
  - Prensa: antes del 1 dic, 10 cupos, sin la regla de "uno por medio".
  - Solicitudes para el Día 3: hasta el 1 dic.
  - Invitaciones al Día 3: a más tardar el 5 dic.
  - Prueba técnica de speakers: antes del 8 dic.
- **Lo que no se publica:** los speakers sin confirmar, todo lo que esté "POR CONFIRMAR" en el Ground Truth (incluido su Anejo A), y los presupuestos o metas internas.

## Cómo trabajar
- **Ramas:** cada cambio se sube a las dos: `git push origin claude/practical-maxwell-gdsdse` y `git push origin claude/practical-maxwell-gdsdse:main`. Termina cada commit con las líneas de atribución de la sesión.
- **Pruebas sin tocar producción:** nunca escribas datos de prueba en el Firestore de producción. Usa los emuladores (Firestore 8085, Auth 9099; dentro de `scripts/e2e`: `npx -y firebase-tools@13.29.1 emulators:start --only firestore,auth`). Los puertos se cambian con `FS_PORT` y las variables `VITE_EMULATOR_*`.
- **Llave de Anthropic:** solo en el servidor. Nunca con prefijo `VITE_` y nunca le pidas al usuario que la pegue. Para probar el Highbot usa `COMPANION_MOCK=1`.
- **Build:** `npm run build` recompila `server.js`, que sí se sube al repo. `package-lock.json` no se sube.
- **Procesos:** mata cada proceso por su PID. Nunca uses `pkill -f` con un patrón que también coincida con tu propio comando.
- **Publicar:** el usuario publica desde Google AI Studio. Si AI Studio cambia código, esos cambios no llegan a GitHub; hay que pasarlos al repo a mano.
- **Reglas de Firestore:** cuando cambien, el usuario tiene que publicarlas en la consola de Firebase.
- **Antes de dar algo por hecho:** corre `npx tsc --noEmit -p .`, el build y las suites e2e afectadas (`scripts/e2e/*.cjs`).

## Documentos útiles
- `docs/CONTEXTO_SPATIALGINEERS.md`: brief general (estudio, Summit, campaña, Highcoon) para otros agentes. Actualízalo cuando cambie algo grande.
- `docs/DIAGNOSTICO_CLAUDE.md`: `GET /api/diag`, diagnóstico de solo lectura con la llave `CLAUDE_DIAG_TOKEN` (léela del entorno; nunca la pidas en el chat).
- `docs/GUIA_WEBAPP.md`: la guía maestra.
- `docs/guia/`: la guía en PDF; se regenera con `node scripts/guide-pdf/build.cjs`.
- `docs/ADMIN_GUIDE.md`, `docs/EMAIL_SETUP.md` (el mailer de Apps Script, todavía sin instalar), `docs/FIRESTORE_RULES.md` y `docs/HIGHBOT_COMPANION.md`.
- `docs/campaign/YOUTUBE_KIT.md`: los videos de la campaña.

## Redes sociales
- Todo post lleva al final: **#SpatialgineersSummit #RoadToSummit #Spatialgineers**. El Radar de Instagram de la app busca por esos hashtags.
- **Instagram y Facebook se publican con el Publicador de la app** (Admin → Redes sociales; `docs/PUBLICADOR_REDES.md`). Claude sube cada semana como paquete listo (`public/social/batches/`, con su entrada en `index.json`); Danelson lo carga al calendario y, el día que toca, publica cada post con "Publicar ahora". No hay publicación automática.
- **Videos para redes:** se graban a 1080×1920 nativos (Chromium con `--force-device-scale-factor=2.5`), nunca agrandados desde 432×768.
- **TikTok sigue por Symphony** (Symphony no puede publicar en IG/FB con la conexión actual). A Symphony se le pasa el caption final y completo, con los hashtags; nunca le digas "no uses hashtags". Nada sale sin la aprobación de Danelson en su tarjeta.
- **Archivos para redes:** hasta enero de 2027, los videos van a la biblioteca de Wix (con la subida de Symphony) y las láminas a `public/social/`. **A futuro, el almacenamiento es bunny.net** (el storage de Spatialgineers, con enlaces CDN directos). No uses enlaces de Google Drive para Meta: no son descargas directas.
- Los créditos de Symphony se reinician el 18 de cada mes.
- Plan y calendario: `docs/campaign/CAMPANA_REDES.md` y `docs/campaign/calendario_redes.csv`.
