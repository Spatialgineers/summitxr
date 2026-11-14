# Compañero con IA (el Highbot que conversa)

## Arquitectura
- **Servidor** (Express): `POST /api/companion/chat`, `GET /api/companion/status` (`live`|`mock`|`off`|`paused`), `GET /api/companion/stats` (solo admin).
- **Modelo:** Claude vía SDK oficial `@anthropic-ai/sdk`, con la llave en `ANTHROPIC_API_KEY` (secreto del servidor). El modelo va en una variable `COMPANION_MODEL`; no se escribe el ID en el código ni en commits. `max_tokens` 2000.
- **Prompt de sistema** (`knowledge.ts`): persona + reglas de marca + mapa de la app + FAQ + contenido vivo (agenda, speakers publicados) refrescado cada pocos minutos; con **prompt caching** del bloque estático.
- **Herramientas** (la IA actúa dentro de la app):
  - `ir_a({ destino })` con `enum` de ids de destinos (`destinations.ts`), generado de los módulos.
  - `senalar({ elemento })`: resalta un elemento visible marcado con `data-guide="id"`; el cliente manda la lista de lo que está en pantalla.
  - Ambas con `strict: true` y `additionalProperties: false`. El cliente ejecuta la navegación/resaltado (`guide.ts`).

## Acceso (blindaje)
1. Cliente envía `idToken` de Firebase + email + code del pase.
2. Servidor verifica el token (aud = proyecto, no vencido); **rechaza anónimos o email no verificado → 403 `NEED_GOOGLE`**.
3. Lee `pass_emails/{sha256(email)}` con el token del usuario: el code debe coincidir y (uid dueño **o** email verificado = email del pase) → si no, 403 `NO_PASS`.
4. Límites: ritmo por usuario (TokenBucket 6, 1 cada 15 s), por IP solo en `/chat` (30, 1 cada 20 s), concurrencia máx. ~25 (503 `BUSY`), tope diario por persona (`COMPANION_USER_DAILY`), **tope diario global en USD** (`COMPANION_DAILY_USD`, def. 30) calculado con precios por token, y `site_config/companion {enabled, dailyUsd}` editable desde el admin (apagado → 503 "descansando", `/status` = `paused`).
5. Historial recortado (≤8 000 caracteres; turnos del asistente ≤1 200).
6. Logs sin contenido: uid en hash y costo.
7. Fuera de la app: workspace propio en la consola de Anthropic con **límite mensual** (p. ej. $400) y una llave solo para esto; rotarla en un clic.

## Modos
- `COMPANION_MOCK=1` (solo fuera de producción): respuestas fijas, herramientas incluidas, para pruebas sin costo.
- Sin IA o apagado: **respuestas locales** (`localKb.ts`/`appGuide.ts`) con chips de preguntas frecuentes; el chat nunca queda vacío.

## Cliente
- Cabeza flotante (`CompanionDock.tsx`) en todas las páginas de visitantes; se oculta donde el chat ya está a la vista.
- Chat completo (`CompanionStudio.tsx`) en la cápsula de Tu Estudio; el historial se conserva por pase.
- Con pase pero sesión anónima: botón "Conecta tu Google para hablar conmigo" en vez del cuadro de texto.
