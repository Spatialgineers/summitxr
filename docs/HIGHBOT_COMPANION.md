# Highbot compañero: cómo conectar Claude de forma segura

El Highbot contesta con Claude a través del servidor de la app (`/api/companion`).
La llave de Anthropic vive **solo en el servidor**: el navegador nunca la ve.

## Las capas de protección

| Capa | Qué evita | Dónde se cambia |
|---|---|---|
| Límite de gasto del workspace en la Console de Anthropic | Que una llave filtrada o un abuso pase de un monto al mes. Es el techo duro. | platform.claude.com → workspace → Limits |
| Solo con SGX Pass **y** cuenta Google (email verificado) | Que alguien cree pases anónimos en cadena con un script para gastar el presupuesto | Código (servidor) |
| Tope de gasto por día (USD) | Que un mal día se coma el mes | Admin → Contenido → Highbot (o `COMPANION_DAILY_USD`) |
| Botón para apagar el Highbot | Cortar todo al instante, sin redeploy | Admin → Contenido → Highbot |
| Límites por persona (ráfaga y 60 mensajes al día), por red (IP) y 25 respuestas a la vez | Abuso de una sola cuenta o una sola red | Código (servidor) / `COMPANION_USER_DAILY` |
| Tamaño máximo de pregunta, historial y respuesta | Peticiones infladas que cuestan más | Código (servidor) |
| El Highbot solo puede navegar y señalar en la app | Que un "jailbreak" haga algo más que hablar: no lee ni escribe datos | Código (servidor) |

Los logs del servidor guardan solo un hash del usuario y el costo de cada respuesta, nunca lo que la persona escribió.

## Configurarlo (una vez)

1. **Console de Anthropic** (platform.claude.com):
   - Crea un workspace solo para esto, por ejemplo **"Summit Highbot"**.
   - En *Limits* del workspace pon el **límite de gasto mensual: $400**.
   - Dentro de ese workspace crea una **API key** llamada `summit-highbot-prod`. Cópiala una sola vez.
2. **Cloud Run** (el servicio que despliega AI Studio) → *Edit & deploy new revision* → *Variables & Secrets*:
   - `ANTHROPIC_API_KEY`: mejor como **secreto** ("Reference a secret" → crea uno en Secret Manager con la llave). Si no, como variable normal.
   - `COMPANION_MODEL`: el ID del modelo Claude Opus 5.5 (aparece en la documentación de modelos de Anthropic).
   - Opcionales: `COMPANION_DAILY_USD` (tope diario del servidor; por defecto 30) y `COMPANION_USER_DAILY` (mensajes por persona al día; por defecto 60).
3. **Prueba**: abre `https://<tu-dominio>/api/companion/status`. Debe decir `"mode":"live"`. Luego, con un pase forjado y Google conectado, hazle una pregunta al Highbot. En Admin → Contenido → Highbot debes ver el mensaje y el gasto.

## Reglas de oro

- **Nunca** pongas la llave con prefijo `VITE_` (todo lo `VITE_` va al navegador), ni en el repo, ni en un chat, ni en un email.
- Después de **cada deploy desde AI Studio**, revisa que `/api/companion/status` siga diciendo `live` (si un deploy borra las variables, dice `off` y el Highbot solo muestra las respuestas de ejemplo; no se rompe nada).
- Mira el uso en la Console los primeros días. Un mensaje cuesta más o menos $0.02–0.04.
- Los días del evento puedes subir el tope diario desde el admin y bajarlo después.

## Si algo huele mal

1. Admin → Contenido → Highbot → **Apagar el Highbot** (tarda menos de un minuto en aplicar).
2. En la Console, **revoca** la llave y crea otra; cámbiala en Cloud Run.
3. Revisa en el admin los "Bloqueados hoy" para ver de dónde vino.

## Notas técnicas

- El servicio corre en **una instancia** (ver `docs/DEPLOY.md`), así que los contadores del día valen para toda la app; vuelven a cero con cada deploy. Por eso el límite mensual de la Console es el respaldo.
- El interruptor y el tope del admin viven en `site_config/companion` (`enabled`, `dailyUsd`). No hacen falta reglas nuevas de Firestore.
- Para pruebas locales sin gastar: `COMPANION_MOCK=1` (no funciona en producción) y `scripts/e2e/companion.cjs`.
