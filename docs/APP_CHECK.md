# App Check (reCAPTCHA): cómo activarlo

App Check hace que solo la app real, en un navegador real, pueda escribir en el formulario de sponsors, el chat, las encuestas y los votos de SGX Live. Un script sin navegador no consigue el token y queda fuera.

El código ya está listo. Mientras no haya clave de sitio, App Check está apagado y todo funciona igual que antes.

## 1. Crear la clave (5 min)

1. Firebase console → proyecto `gen-lang-client-0564995587` → **App Check** → **Apps** → la app web.
2. Elige **reCAPTCHA Enterprise** y pulsa **Create key** (o usa una existente). Dominios: el dominio oficial del Summit y el de AI Studio/Cloud Run donde corre la app.
3. Copia la **site key** (es pública; no es un secreto).

## 2. Ponerla en la app

En `firebase-applet-config.json`, rellena:

```json
"recaptchaSiteKey": "TU_SITE_KEY"
```

Haz pull en AI Studio y vuelve a publicar.

Si prefieres reCAPTCHA v3 clásico en vez de Enterprise, pon también `VITE_RECAPTCHA_PROVIDER=v3` en el entorno de build.

## 3. Mirar antes de bloquear (1–2 días)

En **App Check → APIs → Cloud Firestore** verás las métricas: cuántas peticiones llegan con token válido. El servidor del live también cuenta (`/api/health` → `appCheck`: `verified`, `rejected`, `missing`). Por defecto el servidor está en modo `monitor`: verifica y cuenta, pero no bloquea.

## 4. Activar el bloqueo

- **Firestore** (chat, sponsors, encuestas, pases): App Check → APIs → Cloud Firestore → **Enforce**.
- **Votos y reacciones de SGX Live** (WebSocket): variable de entorno del servidor `SGX_APPCHECK=enforce` (Cloud Run / AI Studio). Valores: `off`, `monitor` (por defecto), `enforce`.

Ojo: con Firestore en *enforce*, la verificación de solo lectura en producción (`scripts/e2e/prod-readonly.cjs`) necesita un *debug token* registrado en App Check para seguir leyendo.

## Probar en local

`node scripts/server-test/appcheck.mjs` levanta un servidor en modo `enforce` con claves de prueba y comprueba que se rechaza un voto sin token, uno con firma falsa, uno caducado y uno de otro proyecto, y que se acepta uno válido.
