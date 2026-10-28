# Correos automáticos con Google Apps Script (gratis, desde info@)

El script vive en la cuenta **info@spatialgineers.com**. Cada minuto lee Firestore y envía estos correos, cada uno **una sola vez por persona**:

| Correo | Cuándo sale |
|---|---|
| ⚡ Tu SGX Pass está forjado | Alguien forja su pase |
| 🎟️ Estás invitado al Día 3 | En el admin (Personas → Inscritos y Día 3) cambias a alguien a **Invitado** |
| ✨ Tu Holo Card está lista | Apruebas a un speaker o sponsor en el admin |
| ⏳ Mañana empieza el Summit | 10 dic, 10:00 AM, a todos los inscritos (menos los rechazados) |
| 📍 Mañana nos vemos en Chroma | 12 dic, 10:00 AM, solo a los invitados al Día 3 |

Cada envío queda anotado en Firestore (`mail_log`). Así nunca se repite un correo, y el admin enseña ✉ junto a cada inscrito con lo que ya recibió.

- **Costo:** $0.
- **Límite:** ~1,500 correos al día (Workspace). Si un día se llena, el script para y sigue al otro día donde se quedó.
- **Seguridad:** no usa contraseñas ni llaves; usa el acceso que info@ ya tiene al proyecto de Firebase.

---

## Paso 1 · Publica las reglas de Firestore

Las reglas de este cambio añaden `mail_log`, que es lo que deja al admin ver las ✉. Publícalas como siempre: Firebase Console → Firestore → Reglas → pegar `firestore.rules` → Publicar.

## Paso 2 · Crea el proyecto de Apps Script

1. Entra a https://script.google.com con **info@spatialgineers.com**.
2. Pulsa **Nuevo proyecto** y renómbralo **SGX Mailer**.
3. A la izquierda, en ⚙️ **Configuración del proyecto**, marca **"Mostrar el archivo de manifiesto appsscript.json en el editor"**.
4. Vuelve al editor (`< >`):
   - Abre `appsscript.json`, borra todo y pega el contenido de `scripts/email/appsscript.json` del repo.
   - Abre `Código.gs`, borra todo y pega el contenido de `scripts/email/Code.gs`.
5. Pulsa 💾 **Guardar**.

## Paso 3 · Prueba antes de encender

1. Arriba, en el selector de funciones, escoge **`testAll`** y pulsa **▶ Ejecutar**.
2. Google pide permisos la primera vez: **Revisar permisos** → escoge info@ → **Permitir**.
   - Pide enviar correo, conectarse a servicios externos, ver y administrar Firestore y administrar los disparadores. Si sale "Google no verificó esta app", pulsa **Configuración avanzada → Ir a SGX Mailer**. Es tu propio script.
3. Te llegan **5 correos de muestra** a info@. Revisa que se vean bien, también en el teléfono.

## Paso 4 · Enciéndelo

1. Escoge la función **`setup`** y pulsa **▶ Ejecutar**.
2. En el registro de ejecución debe decir: *"Listo: el mailer revisa Firestore cada minuto…"*.

Desde ese momento, cada pase nuevo recibe su confirmación en un minuto o menos. **Los inscritos de antes de este momento no reciben la confirmación**, para no llenarles el correo con algo viejo. Las invitaciones, Holo Cards y recordatorios sí les llegan a todos.

## Paso 5 · Comprueba con un pase real

Forja un pase en summit.spatialgineers.com con un correo tuyo. En ~1 minuto llega la confirmación, y en el admin aparece ✉ Confirmación junto a ese inscrito.

---

## Funciones útiles

| Función | Para qué |
|---|---|
| `status` | Muestra en el registro la cuota de hoy, por dónde va cada cola y los disparadores activos |
| `stop` | Apaga el envío (quita el disparador). `setup` lo vuelve a encender sin repetir correos |
| `processQueue` | Corre una vuelta a mano, sin esperar al minuto |
| `testAll` | Te manda las muestras otra vez |

## Ajustes (al inicio de `Code.gs`, objeto `CONFIG`)

- `TEST_TO`: mientras pruebas, pon tu correo aquí y **todo** te llegará a ti en vez de a cada persona. Déjalo vacío (`''`) en producción.
- `REMIND_DAY1_AT` / `REMIND_DAY3_AT`: la hora de los recordatorios.
- `MAX_PER_RUN`: el máximo de correos por minuto (40).

## Si algo falla

Revisa **Ejecuciones** (el ícono de lista a la izquierda) en el editor del script.

| Mensaje | Qué hacer |
|---|---|
| `Firestore 403 … PERMISSION_DENIED` | info@ no tiene acceso al proyecto `gen-lang-client-0564995587`. Dale el rol **Editor** (o **Cloud Datastore User**) en Google Cloud Console → IAM con una cuenta que sea dueña |
| `… has not been used in project … / requires a quota project` | Pasa si la cuenta no puede usar el proyecto para la facturación de la API. Dale a info@ el rol **Service Usage Consumer** en ese mismo proyecto |
| `cuota diaria de Gmail casi agotada` | Normal en un día de muchísimos envíos: sigue solo al día siguiente |

Para probar los cambios del script sin tocar Google, `node scripts/email/test-emulator.cjs` lo corre contra el emulador de Firestore.
