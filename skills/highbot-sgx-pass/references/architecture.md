# Arquitectura y orden de construcción

## Mapa de archivos (repo `spatialgineers/summitxr`)

| Capa | Archivo | Rol |
|---|---|---|
| Modelo | `src/identity/sgxIdentity.ts` | Tipos (`SgxPass`, `SgxIdentity`, `PassContact`, `PassQrPayload`), código del pase, callsign, QR (`passQrUrl`/`parsePassQr`), lectura/escritura en localStorage |
| Estado | `src/identity/SgxIdentityContext.tsx` | Provider único: `forge`, `checkIn`, misiones (`completeWhere`), XP, sellos, contactos, sincronía con la cuenta Google |
| Red | `src/identity/passNetwork.ts` | Firestore: `registerPass`, `claimEmail`/`checkEmailClaim` (1 pase por correo), `findMyRegistration` (recuperar), `sendExchange`/`subscribeExchanges` (Rolodex mutuo), `recordCheckin` |
| Roles | `src/identity/credentials.ts`, `SgxRoleRequests.tsx` | `credential_grants/{uid}` (solo admin), pendientes locales, solicitudes Guild |
| Forja | `src/identity/SgxForge.tsx` | Flujo de 4 pasos: identifícate → cómo vives el evento → pilar → Highbot → listo |
| Highbot | `pilotAvatar.ts` (config v2 + SVG), `SgxPilotGlyph.tsx`, `PilotBuilder.tsx`, `highbot3d.ts`, `highbotGear.ts`, `highbotStudio.ts`, `highbotPortrait.ts` | Config, render 2D toon, render 3D (GLB `public/characters/highbot/highbot.glb`), editor, retratos |
| Holo Card | `holoCardCanvas.ts`, `SgxHoloStudio.tsx`, `holoCardVideo.ts`, `SgxHoloViewer.tsx` | Canvas de la tarjeta (frente/reverso), formatos, video para stories, visor de otras tarjetas |
| Misiones | `reactor.ts`, `missionNav.ts` | Lista de misiones, disparadores, a dónde lleva cada una |
| Tu Estudio | `SgxHangar.tsx`, `studioRoom/roomScene.ts`, `roomPlay.ts`, `SgxStudioRoom.tsx` | Página personal = cuarto 3D con paneles |
| Compañero IA | `src/server/companion/companionRouter.ts`, `knowledge.ts`; cliente `src/companion/*` | API `/api/companion/*`, persona + conocimiento, herramientas `ir_a`/`senalar`, cabeza flotante y chat |
| Reglas | `firestore.rules` | Ver `security-rules.md` |
| Pruebas | `scripts/e2e/{pass,holo,pilot,companion,account,recover}.cjs` | Contra emuladores |

## Flujo de datos

```
Forja ──► SgxIdentity (localStorage sgx_identity_v1) ──► evento 'sgx:identity_changed'
   │                         │
   │                         ├─► UI (pase, Holo Card, Highbot, Estudio) re-renderiza
   │                         └─► misiones: visitas / quests / flags / sponsors → XP + sellos
   └─► registerPass + claimEmail (Firestore)   ◄── Google sign-in: findMyRegistration restaura el pase
QR del pase = URL /?pase=<base64url(JSON)> ──► otro teléfono: añade a Rolodex + sendExchange (mutuo)
Admin ──► credential_grants/{uid} ──► el pase cambia de rol (speaker/sponsor/prensa/initiate)
Compañero: cliente ──(idToken + email + code)──► servidor verifica pase+Google ──► Claude con herramientas
```

## Orden recomendado para portar (cada paso deja algo usable)

1. Modelo + provider local (sin red): pase forjado, callsign, QR. **Demo funcionando offline.**
2. Highbot 2D (SVG) + editor mínimo (presets + colores).
3. Holo Card (canvas) + descargar/compartir.
4. Reactor: 5–10 misiones por visita/flag; XP y sellos.
5. Firebase: auth anónima + Google, `pass_emails`, `ticket_inquiries`, recuperación por correo.
6. Rolodex por QR (escáner `jsQR` + intercambio mutuo).
7. Roles con aprobación del admin.
8. Highbot 3D (GLB) y Tu Estudio 3D.
9. Compañero IA (servidor) con modo mock, después la llave real con topes.
10. Día presencial: check-in con código del día.
