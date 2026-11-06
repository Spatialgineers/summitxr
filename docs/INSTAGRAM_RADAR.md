# Radar social · Instagram

El Radar social (`/social`) encuentra solo las publicaciones de Instagram con los hashtags del Summit y las que etiquetan a **@spatialgineers**. El equipo las modera en el admin y las aprobadas aparecen en el mural con la etiqueta "Instagram". El flujo de siempre sigue igual: un Creador pega el enlace de su publicación y gana XP.

Sin configurar, la función queda **apagada** (`disabled`) y todo lo demás funciona igual.

## Cómo funciona

- **Servidor** (`src/server/social/instagramRadar.ts`): cada 15 minutos, y también cuando un admin abre el panel (como mucho una vez cada 2 minutos), llama a la Instagram Graph API (versión fija `v23.0`, que se cambia con `IG_GRAPH_VERSION`):
  - `GET /ig_hashtag_search?user_id=…&q=<hashtag>`: el id de cada hashtag. Se guarda en memoria, porque Instagram permite **30 hashtags únicos cada 7 días** por cuenta.
  - `GET /{hashtag-id}/recent_media` y `/{hashtag-id}/top_media`: campos `id, caption, media_type, media_url, permalink, timestamp`. Instagram **no devuelve `username`** en las publicaciones de hashtag, y `recent_media` solo trae las de las últimas 24 horas.
  - `GET /{ig-user-id}/tags`: las publicaciones que nos etiquetan, con `username` y `thumbnail_url`.
- Todo se guarda **solo en memoria** y se reemplaza en cada ciclo, porque los enlaces de imagen de Instagram caducan. Si una publicación aprobada sale de la ventana de 24 horas, se queda en el mural con su enlace, pero sin imagen.
- Si Instagram falla, el servidor espera 1, 2, 4… y hasta 60 minutos antes de reintentar. El error aparece en el panel.
- **Moderación**: el documento `site_config/social` = `{ approvedIg: string[], hiddenIg: string[] }`. Lo escriben los botones del admin desde el navegador, con la sesión del admin. Las reglas actuales ya permiten que un admin escriba en `site_config`, así que **no hubo que cambiar las reglas**. El servidor solo lee ese documento, por REST, cada minuto.
- **Endpoints**:
  - `GET /api/social/instagram/candidates`: **solo admins** (`requireAdmin`; sin sesión de admin responde 401). Devuelve `status` (`disabled`, `mock`, `ok`, `error` o `syncing`), la última sincronización, el error, los hashtags y los candidatos.
  - `GET /api/social/instagram/approved`: **público**, con caché de 1 minuto. Solo las aprobadas que no están ocultas, con campos seguros: `permalink`, `mediaType`, `imageUrl`, `caption` (máximo 280 caracteres), `timestamp` y `username` (cuando se conoce).
- **Mural** (`InstagramRadarWall.tsx`): no pide nada hasta que la sección está en pantalla, y las imágenes cargan con `loading="lazy"`.

## 1. La cuenta de Instagram y la página de Facebook

1. La cuenta **@spatialgineers** tiene que ser **profesional** (Empresa o Creador): Instagram → Configuración → Tipo de cuenta.
2. Conéctala a la **página de Facebook** de Spatialgineers: en la página → Configuración → Cuentas vinculadas → Instagram → Conectar. También se puede hacer en Meta Business Suite.
3. La persona que va a crear el token tiene que ser admin de esa página.

## 2. La app de Meta

1. Entra a <https://developers.facebook.com/apps> → **Crear app** → tipo **Empresa (Business)**. Asóciala al portafolio comercial de Spatialgineers.
2. Añade el producto **Instagram** → "API de Instagram con inicio de sesión de Facebook" (*Instagram API with Facebook Login*).
3. **Permisos** que pide el radar:

   | Permiso o función | Para qué |
   |---|---|
   | `instagram_basic` | Leer la cuenta y las publicaciones (lo piden todos los endpoints) |
   | `pages_show_list` | Encontrar la página conectada a la cuenta de IG |
   | `pages_read_engagement` | Lo piden la búsqueda por hashtag y `/tags` |
   | `instagram_manage_comments` | Lo pide `/{ig-user-id}/tags` (las publicaciones que nos etiquetan) |
   | Función **Instagram Public Content Access** | Obligatoria para `ig_hashtag_search`, `recent_media` y `top_media` |
   | `business_management` | Solo si la página está dentro de un portafolio comercial |

4. **Revisión de la app (App Review)**: en modo desarrollo, todo funciona con las cuentas que tienen un rol en la app. Para usarlo en producción, pide **Advanced Access** a `instagram_basic`, `pages_read_engagement`, `instagram_manage_comments` y a la función **Instagram Public Content Access**. Explica el caso de uso: "Descubrir publicaciones de la campaña de hashtags del evento para moderarlas y mostrarlas en el mural del evento". Pide además la **verificación del negocio**.

> Revisa la lista contra la documentación de Meta del día en que lo hagas: Meta cambia los nombres de los permisos de vez en cuando. Desde este entorno no se pudo abrir developers.facebook.com para confirmarla.

## 3. El token de larga duración

1. En el **Explorador de la Graph API** (<https://developers.facebook.com/tools/explorer>), elige tu app, marca los permisos de arriba y pulsa **Generate Access Token** (token de usuario). Ese token dura alrededor de una hora.
2. Cámbialo por uno **de larga duración** (unos 60 días):
   ```
   https://graph.facebook.com/v23.0/oauth/access_token?grant_type=fb_exchange_token&client_id=APP_ID&client_secret=APP_SECRET&fb_exchange_token=TOKEN_CORTO
   ```
   Hazlo en tu computadora. El `APP_SECRET` nunca va al repositorio ni al cliente.
3. **El id de la cuenta de IG** (`IG_USER_ID`):
   ```
   https://graph.facebook.com/v23.0/me/accounts?fields=name,instagram_business_account&access_token=TOKEN_LARGO
   ```
   Copia el `instagram_business_account.id` de la página de Spatialgineers.
4. **Opcional y más estable**: con el token largo, pide `/me/accounts` y usa el `access_token` **de la página**. El token de página que sale de un token de usuario largo **no caduca** mientras sigas siendo admin y no cambies la contraseña.
5. **Renovarlo cada ~60 días**, si usas el token de usuario: repite los pasos 1 y 2 antes de que caduque y actualiza el secreto (paso 4). El panel del admin muestra el error (`Graph 400 190…`) cuando el token caduca. Pon un recordatorio en el calendario a los 50 días.

## 4. Las variables en Cloud Run

Se configuran igual que `ANTHROPIC_API_KEY` en `docs/HIGHBOT_COMPANION.md`. **Nunca** con prefijo `VITE_`.

1. **Secret Manager** → *Crear secreto* → `ig-graph-token` con el token como valor.
2. **Cloud Run** (el servicio que despliega AI Studio) → *Edit & deploy new revision* → *Variables & Secrets*:
   - `IG_GRAPH_TOKEN`: **Reference a secret** → `ig-graph-token`, versión `latest`, expuesto como variable de entorno. La cuenta de servicio de Cloud Run necesita el rol *Secret Manager Secret Accessor*.
   - `IG_USER_ID`: variable normal (el id del paso 3.3; no es secreto).
   - `IG_HASHTAGS` (opcional): `SpatialgineersSummit,RoadToSummit` por defecto, sin `#`, separados por coma. **Cada hashtag nuevo cuenta para el límite de 30 por semana**: no lo cambies a cada rato.
   - `IG_GRAPH_VERSION` (opcional): `v23.0` por defecto.
3. *Deploy*. Para renovar el token, crea una versión nueva del secreto y despliega una revisión.

Solo para pruebas locales: `IG_RADAR_MOCK=1` sirve publicaciones de ejemplo sin llamar a Instagram (no funciona en producción) y `IG_CONFIG_TTL_MS` acorta la caché de la moderación.

## 5. Comprobar que funciona

1. Entra al admin → **Contenido → Redes sociales**. La línea de estado debe decir **"Conectado a Instagram"** con la hora de la última sincronización. Si dice "Apagado", faltan variables. Si dice "Error", el mensaje dice cuál: `190` es un token caducado o inválido, y `10` o `200` son permisos que faltan.
2. Publica una prueba desde una cuenta cualquiera con `#SpatialgineersSummit`. Aparece como candidata en el siguiente ciclo (15 minutos, o al pulsar **Recargar** pasados 2 minutos).
3. Pulsa **Aprobar** y abre `/social`: en un minuto sale en "Visto en Instagram". Si pulsas **Ocultar**, desaparece.
4. Desde la terminal: `curl https://<tu-dominio>/api/social/instagram/approved` responde `{"status":"ok","posts":[…]}`. `/candidates` sin sesión de admin responde **401**.

## Pruebas (e2e)

`scripts/e2e/igradar.cjs`, contra los emuladores y un servidor con `IG_RADAR_MOCK=1 IG_CONFIG_TTL_MS=500`. Comprueba que el admin ve los candidatos, que aprobar los pone en el mural, que ocultar los quita, que `/candidates` le responde 401 a quien no es admin y que nada se pide antes de tiempo. Ver la cabecera del script.
