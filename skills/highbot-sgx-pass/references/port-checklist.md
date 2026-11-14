# Checklist para portar a otro proyecto

## Decisiones (una ronda de preguntas)
- [ ] Nombre del pase y prefijo del código (`EVT26-XXXX-XXXX`).
- [ ] Categorías (equivalente a los 6 pilares), sus colores y orden.
- [ ] ¿Hay día presencial? (tier + check-in) · ¿Roles con aprobación? ¿cuáles?
- [ ] ¿IA? (presupuesto diario/mensual, voz de la persona, qué destinos puede abrir).
- [ ] Idioma(s) (el original es ES primero + EN).
- [ ] Avatar: ¿el Highbot tal cual, re-skin (otro GLB / otra cabeza) o solo 2D?

## Equivalentes si no es React + Firebase
| Original | Alternativa |
|---|---|
| React Context + localStorage | Zustand/Pinia/Svelte store + localStorage (mismo key/evento) |
| Firebase Auth (anónimo + Google) | Supabase/Auth0/Clerk: necesitas sesión anónima + OAuth con email verificado |
| Firestore + reglas | Supabase con RLS (mismas reglas como políticas) o tu API con las mismas validaciones |
| Express `/api/companion` | Cualquier backend/serverless; la llave nunca va al cliente |
| Three.js | Igual (agnóstico de framework); para Unity/Roblox reusa contratos y lógica de misiones |

## Pasos
1. Copiar `sgxIdentity.ts` (tipos, código, QR) y el provider; renombrar claves y prefijos.
2. Forja mínima → probar offline.
3. Highbot 2D + editor de presets.
4. Holo Card + compartir.
5. Misiones (5–10) + XP + sellos.
6. Backend: auth, `pass_emails`, registro, recuperación; reglas.
7. QR + Rolodex mutuo; roles + admin para aprobar.
8. 3D (Highbot GLB, Tu Estudio) con camino 2D.
9. Compañero IA en mock → real con topes (dueño de la cuenta configura la llave como secreto).

## Pruebas mínimas (e2e con emuladores, nada contra producción)
- Forjar → pase con código, callsign y QR; recarga conserva todo.
- Mismo correo en otro dispositivo → rechazado; con Google → restaura.
- Editar pase conserva el código.
- Escanear QR → contacto en los dos lados.
- Solicitar rol → "En revisión"; admin aprueba → la tarjeta cambia.
- Misión por visita suma XP una vez; pilar completo sella.
- IA: anónimo → 403 NEED_GOOGLE; código ajeno → 403; apagado → paused; `/stats` 401 sin admin.
- Accesibilidad (axe) de la Forja y de Tu Estudio; teclado; Modo Ligero.
