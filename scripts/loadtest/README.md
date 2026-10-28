# Prueba de carga del motor en vivo (WebSocket)

`ws-load.mjs` simula entre cientos y miles de teléfonos de audiencia conectados
al motor en vivo (SGX Live, votaciones de los Días 1–2) y un director que abre y
cierra las preguntas. Mide conexiones, latencias, rendimiento, CPU/RAM del
servidor y si los totales de votos que anuncia el servidor coinciden con los
votos enviados.

**Solo para instancias LOCALES.** Por defecto empaqueta `server.ts` (mismos
flags de esbuild que `npm run build`, pero en `scripts/loadtest/out/`, sin tocar
`server.js`) y lo levanta en un puerto libre de `127.0.0.1`. Rechaza cualquier
`--url` que no sea `localhost`/`127.x`.

No añade nada a la app ni al servidor: no hay simulador de votos (el mensaje
`SIMULATE_VOTES` sigue respondiendo `ERROR NOT_AVAILABLE`). Cada voto viene de
un socket real abierto por el script.

## Uso

```bash
# 1000 teléfonos, rampa de 10 s, 3 preguntas (valores por defecto)
node scripts/loadtest/ws-load.mjs

# 500 teléfonos
node scripts/loadtest/ws-load.mjs --clients 500

# contra un servidor local ya levantado (el director necesita el token de prueba)
SGX_TEST_ADMIN_TOKEN=mi_token_local PORT=3999 node server.js   # otra terminal, NODE_ENV != production
node scripts/loadtest/ws-load.mjs --url ws://127.0.0.1:3999 --admin-token mi_token_local --server-pid <pid>
```

Requisitos: `npm install` hecho (usa `ws` y `esbuild` del proyecto, sin
dependencias nuevas). Para 1000 clientes hace falta `ulimit -n` ≥ ~2500 (el
script avisa si es bajo; `ulimit -n 65535` lo resuelve).

## Qué hace un "teléfono"

Exactamente lo que hace `src/App.tsx`:

1. Conecta a `/ws?tenantId=…&eventId=…&userId=…&nickname=…`.
2. Al recibir `QUESTION_START` decide una sola vez si vota (`--vote-rate`) y,
   tras un tiempo de reacción aleatorio, envía **el voto binario de 1 byte**
   (código de opción), **`SUBMIT_VOTE` JSON** y **`POST /api/vote`** (fallback
   REST), igual que `handleCastVote`.
3. Envía reacciones (`SEND_REACTION` por WS + `POST /api/reaction`) a
   `--reaction-rate` toques por segundo por persona.
4. No envía token de App Check (los clientes reales tampoco mientras
   `recaptchaSiteKey` esté vacío). El servidor local corre con
   `SGX_APPCHECK=monitor` (cuenta, no bloquea). Con `--appcheck enforce` todos
   los votos simulados serían rechazados.

Para no compartir un solo límite por IP (600 sockets por IP), cada cliente
manda una `X-Forwarded-For` distinta (`--clients-per-ip 1`). Con
`--clients-per-ip 0` todos salen de 127.0.0.1, como un Wi-Fi con NAT único.

## El director

Un socket `role=admin` se autentica con `AUTH` usando el token de prueba
`SGX_TEST_ADMIN_TOKEN` (aleatorio, solo para el servidor local, que corre con
`NODE_ENV=development`; en producción ese token no existe). Carga las preguntas
con `UPDATE_QUESTIONS` y por cada ronda envía `BROADCAST_QUESTION`, a mitad de
ronda `TRIGGER_PRESET` y al final `CLOSE_VOTING`. Como la consola real, repite
cada acción por REST (`/api/action/*`) justo después; `--no-admin-rest` lo
desactiva y `--admin-rest-delay-ms` simula que el REST llega tarde.

El servidor local arranca con `FIREBASE_API_KEY` inválida y una lista de admins
vacía: no habla con Firebase/Firestore de producción.

## Opciones

| Opción | Defecto | Descripción |
|---|---|---|
| `--clients N` | 1000 | Teléfonos simulados |
| `--ramp-ms` | 10000 | Tiempo en el que se conectan todos |
| `--workers` | min(3, CPUs-1) | Hilos generadores de carga |
| `--rounds` | 3 | Preguntas que se abren y cierran |
| `--round-ms` | 12000 | Duración de cada votación (la cierra el director) |
| `--vote-min-ms` / `--vote-window-ms` | 300 / 8000 | Tiempo de reacción para votar |
| `--vote-rate` | 0.9 | Fracción que vota en cada pregunta |
| `--reaction-rate` | 0.03 | Reacciones por segundo por persona |
| `--no-rest` | — | Sin fallbacks REST (solo WS) |
| `--no-admin-rest` | — | El director no repite por REST |
| `--admin-rest-delay-ms` | 0 | Retraso del REST del director |
| `--clients-per-ip` | 1 | Clientes por IP simulada (0 = todos 127.0.0.1) |
| `--slow` | 0 | Fracción de teléfonos que dejan de leer (Wi-Fi mala) |
| `--appcheck` | monitor | `SGX_APPCHECK` del servidor local |
| `--server-js` | — | Usar el `server.js` del repo en vez de empaquetar |
| `--url` / `--admin-token` / `--server-pid` | — | Servidor local ya levantado |
| `--label` | — | Sufijo del archivo de resultados |

## Qué mide

- Conexiones: éxitos/fallos, tiempo de handshake y hasta `INIT_STATE` (p50/p95/p99), cierres inesperados (códigos).
- Latencia de difusión: desde que el director envía la acción hasta que cada teléfono recibe `QUESTION_START`, `PRESET_TRIGGER` y `VOTING_CLOSED` (p50/p95/p99), y recepciones duplicadas.
- Retraso servidor→cliente de todos los mensajes (`timestamp` del servidor vs. llegada).
- Rendimiento: mensajes y MB recibidos por segundo (media y pico) por fase, por tipo de mensaje y tamaño medio.
- Servidor: RSS, CPU (de `/proc/<pid>`, cada 500 ms; `ps` si no hay `/proc`), descriptores abiertos y la latencia de `/healthz` como termómetro del event loop.
- Integridad: votos enviados vs. `totalVotes` y conteo por opción del `VOTING_CLOSED`, votos aceptados por WS (`SCORE_UPDATE`) y por REST, y dobles conteos.
- El propio generador: lag del event loop de cada worker (si fuera alto, las latencias estarían infladas).

El resumen sale por consola y el detalle completo en
`scripts/loadtest/out/ws-load-<N>c-<label>-<fecha>.json` (carpeta ignorada por git),
junto al log del servidor.
