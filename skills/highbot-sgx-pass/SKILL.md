---
name: highbot-sgx-pass
description: Replica el sistema Highbot + SGX Pass de Spatialgineers en cualquier proyecto web (evento, comunidad, curso, marca, app). Cubre el pase digital forjado en un minuto (Holo Card con QR), el avatar Highbot configurable en 2D y 3D, el compañero con IA (Claude) blindado en el servidor, las misiones con XP y sellos (Reactor), el networking por QR (Rolodex), los roles con aprobación (speaker, sponsor, prensa, Guild), el check-in presencial y Tu Estudio 3D (el cuarto del Highbot con física). Úsalo cuando pidan "un pase como el del Summit", "el Highbot para otro evento", "gamificar con pase y avatar", "un compañero IA dentro de la app", "Holo Card", "replicar el SGX Pass" o portar cualquier pieza de este sistema a otro stack.
---

# Highbot + SGX Pass · sistema portable

Este es el sistema de identidad del Spatialgineers Summit 2026, en piezas que se pueden llevar a cualquier otro proyecto. Se escribió a partir del código real (`spatialgineers/summitxr`, noviembre 2026).

## Qué es, en una frase por pieza

| Pieza | Qué hace | Por qué funciona |
|---|---|---|
| **SGX Pass** | Credencial gratis que se "forja" en ~1 minuto: nombre, correo, pilar y avatar. Da un código `SGX26-XXXX-XXXX` y un QR. | Vive en el dispositivo (local-first), así que funciona sin cuenta y sin señal. Con Google se sincroniza y vuelve en cualquier teléfono. |
| **Holo Card** | La tarjeta del pase. Al frente va la persona con su Highbot; al reverso, el programa y el QR. Se comparte como tarjeta 3D, post 4:5, story 9:16 o video de 6 s. | Es el pase mismo, no una pieza aparte. Cambia sola cuando la persona cambia de rol. |
| **Highbot** | Avatar robot configurable por piezas: cara, colores, placas, motivo, accesorios y emblema de pilar. Se ve en 2D (SVG toon) y en 3D (GLB). | Es la cara de la persona en toda la app. Los speakers no envían fotos: su imagen es su Highbot. |
| **Compañero IA** | El Highbot conversa (Claude) y puede **abrir páginas** y **señalar elementos** de la app con herramientas. | La llave vive solo en el servidor. Pide pase + Google verificado, tiene topes de gasto y un interruptor en el admin. |
| **Reactor** | Misiones por pilar que dan XP. Completar todas las de un pilar sella ese pilar en el pase. | Las misiones se cumplen solas al visitar lugares, terminar juegos o hacer acciones. Nadie llena formularios. |
| **Rolodex / Red** | Networking: escaneas el QR de otro pase y quedan conectados los dos. | El QR es una URL, así que cualquier cámara lo abre. |
| **Roles** | Desde el pase se pide ser speaker, sponsor, prensa o Guild, con fecha límite. El admin aprueba y el pase cambia de rol. | Las concesiones viven en Firestore y solo las escribe un admin. |
| **Día 3 / check-in** | El QR del pase es la entrada presencial; el check-in se hace con un código del día. | La misma credencial sirve para todo. |
| **Tu Estudio 3D** | El cuarto del Highbot (Three.js): se camina, se tiran objetos al aro y cada estación abre una parte del pase. Muestra trofeos y el objeto del rol. | Convierte el perfil en un lugar al que se quiere volver. |

## Cómo usar este skill

1. **Pregunta primero lo que cambia el diseño** (una sola ronda):
   - nombre del evento o marca;
   - sus "pilares" o categorías (aquí son 6);
   - el prefijo del código del pase;
   - si habrá día presencial;
   - si quieren IA;
   - el stack (React o no, Firebase o no);
   - idioma.
2. Lee la referencia que toca, según la pieza:
   - `references/architecture.md`: mapa de archivos, flujo de datos y orden de construcción. **Léela siempre primero.**
   - `references/data-model.md`: tipos exactos (pase, identidad, QR, credenciales), formato del código y del QR, y almacenamiento.
   - `references/forge-and-pass.md`: la Forja paso a paso, una sola cuenta por correo, recuperar el pase, roles y Día 3.
   - `references/highbot.md`: el avatar (configuración v2, 2D toon, 3D GLB, caminata, editor).
   - `references/companion-ai.md`: el compañero con Claude (servidor, herramientas, seguridad, costos, modo sin IA).
   - `references/reactor-xp.md`: misiones, disparadores, XP, sellos, tienda y leaderboard.
   - `references/holo-card.md`: el render de la tarjeta, sus formatos, el video y el visor 3D.
   - `references/studio-3d.md`: el cuarto 3D con estaciones, física, trofeos y paneles.
   - `references/security-rules.md`: las reglas de Firestore esenciales, copiables.
   - `references/port-checklist.md`: lista para portar a otro proyecto y pruebas mínimas.
3. Si el código fuente original está disponible (repo `spatialgineers/summitxr`), **cópialo y adáptalo en vez de reescribir**. Cada referencia da la ruta exacta.
4. Si el destino no es React o Firebase, conserva los **contratos** (tipos, formato del QR, reglas de acceso, API del compañero) y cambia solo la plomería. `port-checklist.md` trae los equivalentes.

## Reglas que no se rompen

- **Local-first.** El pase y la identidad viven en `localStorage` (`sgx_identity_v1`) y se reflejan a la nube cuando hay sesión. La app nunca se bloquea esperando la red.
- **Una cuenta por correo.** El correo se guarda como SHA-256 en `pass_emails/{hash}`; un segundo pase con el mismo correo se rechaza.
- **La llave de la IA solo en el servidor.** Nunca con prefijo de cliente (`VITE_`, `NEXT_PUBLIC_`). Nunca en el repo ni en un chat. Usa un modo de prueba (`COMPANION_MOCK=1`) para desarrollar.
- **La IA pide pase + Google verificado.** Con sesión anónima se responde 403 `NEED_GOOGLE`. Además lleva tope diario en USD, tope por persona, límites por IP y concurrencia, interruptor en el admin y un límite mensual en la consola del proveedor.
- **Los roles solo los concede un admin.** El cliente pide; la regla de Firestore impide que alguien se otorgue un rol a sí mismo.
- **Pruebas sin tocar producción.** Usa los emuladores de Firebase y bloquea en las pruebas cualquier llamada al proyecto real.
- **Accesibilidad y Modo Ligero.** Todo lo 3D tiene un camino 2D o de pestañas, y se respeta `prefers-reduced-motion`.
- **Marca.** Cambia nombres, colores y textos del Summit por los del nuevo proyecto. No arrastres "SGX", "Summit" ni los pilares si no aplican.
