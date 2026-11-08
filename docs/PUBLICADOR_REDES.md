# Publicador de redes · Instagram y Facebook

Publica en Instagram (Reels, imágenes y carruseles) y en la página de Facebook directamente desde la app, sin Symphony. Usa la API oficial de Meta.

- **Dónde está:** Admin → Redes sociales → "Publicador · Instagram y Facebook".
- **Cómo se usa:**
  1. Claude sube cada semana como un **paquete listo** (`public/social/batches/`). Lo eliges en "Paquetes listos" y tocas **"Cargar al calendario"**.
  2. Cada post dice **qué día y a qué hora** publicarlo. Arriba sale **"Toca publicar hoy"** con los posts del día.
  3. Ese día, toca **"Publicar ahora"** y sale en Instagram y Facebook al momento, con tu sesión de admin. No hay robot ni horario automático (se puede encender con `SOCIAL_AUTOPUBLISH=1`, que necesita el usuario robot).
  2. Revisa cada post: miniatura, caption, fecha y redes.
  3. Toca **"Aprobar la semana"**. Ese es tu único clic.
  4. El servidor revisa cada minuto y publica cada post a su hora en Instagram y Facebook. Cuando sale, el post pasa a **Publicado** con sus enlaces "ver post". Si algo falla, pasa a **Falló** con el error de Meta y el botón "Reintentar ahora".
- **Horas:** son hora de Puerto Rico (UTC-4). Un post aprobado que no salga en 6 horas (por ejemplo, porque el servidor estuvo caído) queda como "No salió" y no se publica tarde.
- **Archivos:** Instagram y Facebook descargan el video o la imagen desde un enlace `https` público y directo. Por ahora, los videos van a la biblioteca de Wix y las láminas a `public/social/`. A futuro van a bunny.net, el storage de Spatialgineers. Google Drive no sirve: sus enlaces abren una página, no el archivo.
- **Captions:** todo caption termina con `#SpatialgineersSummit #RoadToSummit #Spatialgineers`. El panel no deja importar un caption que no los tenga.
- **TikTok:** este módulo no publica en TikTok. TikTok sigue por Symphony.

## Configuración (una vez)

### 1. Permisos del token de Meta
El Publicador usa el mismo token que el Radar (`IG_GRAPH_TOKEN`, ver `docs/INSTAGRAM_RADAR.md`), pero con más permisos. En el Graph API Explorer o en tu app de Meta, genera el token de usuario del sistema (o el de larga duración) con estos permisos:
- `instagram_basic`
- `instagram_content_publish`
- `pages_show_list`
- `pages_read_engagement`
- `pages_manage_posts`
- `business_management`

Después actualiza el secreto `ig-graph-token` en Secret Manager.

### 2. Variables nuevas en el servidor (AI Studio / Cloud Run)
- `FB_PAGE_ID`: el id de la página de Facebook de Spatialgineers. Lo ves en la página → Información → Transparencia, o en el Graph API Explorer con `me/accounts`.
- `FB_PAGE_TOKEN` (opcional): si no lo pones, el servidor lo saca del token de Meta.

### 3. Acceso del servidor a la base de datos
Los posts viven en `social_posts`, que solo pueden leer los admins. El servidor entra de una de estas dos formas:
- **Automática (Cloud Run):** usa la cuenta de servicio del servicio. Si el panel dice "Base de datos ✅", no tienes que hacer nada.
- **Si dice ❌, crea un usuario robot:**
  1. Firebase Console → Authentication → Sign-in method → activa **Email/Password**.
  2. En Authentication → Users → Add user, crea por ejemplo `publicador@spatialgineers.com` con una contraseña larga.
  3. En Firestore, crea el doc `admins/{uid de ese usuario}` (puede estar vacío).
  4. En el servidor, añade `SOCIAL_BOT_EMAIL` y `SOCIAL_BOT_PASSWORD`. La contraseña va como secreto, nunca con prefijo `VITE_`.

### 4. Reglas de Firestore
Publica `firestore.rules` en la consola de Firebase. Trae el bloque nuevo `social_posts`.

### 5. Probar
Abre el panel. La línea "Servidor" tiene que decir Instagram ✅ · Facebook ✅ · Base de datos ✅. Crea un post de prueba para dentro de 2 minutos, apruébalo y toca "Revisar ahora" cuando sea la hora.

## Para pruebas locales
`SOCIAL_PUBLISH_MOCK=1` (fuera de producción) simula a Meta. La prueba e2e es `scripts/e2e/publisher.cjs`.
