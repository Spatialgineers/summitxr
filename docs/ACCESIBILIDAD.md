# Auditoría de accesibilidad (28 oct 2026)

**Herramientas:** axe-core 4.10 (reglas WCAG 2.1 A y AA) y pruebas de teclado con Playwright.

**Alcance:** 16 pantallas, en escritorio (1366×900) y teléfono (390×844):
- inicio, pilares, agenda, speakers y sponsors;
- Forja, Hangar con pase, SGX Live y login de admin;
- networking, guild, mapa 360, broadcast, social, juegos y match.

Cómo correrla: `A11Y_STRICT=1 node scripts/e2e/a11y.cjs` (con emuladores y el servidor local). El detalle queda en `scripts/e2e/out/a11y.json`.

## Resultado

Ninguna violación crítica ni seria en las 32 combinaciones de pantalla y tamaño. Las pruebas de teclado pasan, en total 42/42.

## Lo que se encontró y se arregló

| Problema | Dónde | Arreglo |
|---|---|---|
| **Contraste del azul SGX como texto:** #32527B sobre oscuro da 2.2:1 | Agenda, social, mapa y todo texto en color de tema | La app calcula por tema una versión legible (≥4.5:1) de cada color usado como texto. Sobre un relleno de color, elige texto negro o blanco según el contraste. Sigue funcionando al cambiar de pilar. |
| **Texto negro sobre azul:** 2.6:1 | Botón "Línea de tiempo" | Pasa a texto blanco. |
| **Menús desplegables sin nombre** | Filtros de agenda (pilar, formato) y presupuesto del formulario de sponsors | Se añadió `aria-label`, o se asoció el `<label>` existente. |
| **Botones de solo icono sin nombre** | Cerrar aviso, cerrar perfil, publicar en el chat (móvil), indicadores de citas del Guild, sonido y ayuda del dron, "nueva pestaña" | Se añadió `aria-label` y, en los interruptores, `aria-pressed`. |
| **Pestañas mal formadas** | Botón "Reverso" metido dentro de las pestañas del Holo Card | Sale de las pestañas y queda como botón-interruptor. |
| **Foco invisible:** `focus:outline-none` en decenas de controles | Toda la app | Anillo de foco global visible. En los botones con esquinas cortadas va por dentro para que no se recorte. |
| **No había forma de saltar el encabezado** | Toda la app | Enlace "Saltar al contenido": es el primer Tab y lleva el foco al contenido. |
| **Los modales no tomaban el foco** | Hangar, Forja, constructor de avatar | El foco entra al abrir, Tab queda dentro, Escape cierra y el foco vuelve a donde estaba. |

## Pendiente (revisión manual)

- **Lector de pantalla real:** una pasada con VoiceOver (iPhone) y TalkBack (Android) por la Forja, el Hangar y SGX Live. axe no puede juzgar si el orden de lectura y los anuncios tienen sentido.
- **Núcleo 3D:** es un canvas WebGL. Las etiquetas de los pilares son botones accesibles, y la barra inferior con los 6 pilares es la alternativa completa por teclado. El contenido 3D en sí no es accesible para lectores de pantalla, como es de esperar.
- **Admin:** solo se auditó el login. El panel completo es de uso interno.
