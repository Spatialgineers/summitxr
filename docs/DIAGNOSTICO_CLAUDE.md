# Diagnóstico de solo lectura para Claude

`GET https://summit.spatialgineers.com/api/diag`, con el header `Authorization: Bearer <llave>`.

## Qué devuelve
- Estado del servidor: tiempo encendido y memoria.
- Highbot: modo, gasto de hoy, mensajes y bloqueos.
- Radar de Instagram: estado y última sincronización.
- Publicador: conexión con Meta y con la base de datos, y el último error.
- Los **últimos 40 errores** de la app (`client_errors`): mensaje, componente, ruta sin parámetros, navegador y las primeras líneas del stack.
- Los posts del Publicador: estado, fecha, enlaces o error de Meta.

## Seguridad
- **Solo lectura.** Solo acepta `GET`, y ninguna ruta escribe ni dispara acciones.
- **Sin datos personales.** No devuelve correos, uid, nombres, pases ni contenido de chats.
- **Invisible sin la llave.** Sin la llave, con una llave equivocada o si la variable no está puesta, responde `404`.
- **Límite de uso:** 10 consultas seguidas y después 1 cada 6 segundos.
- Si la llave se filtra, quien la tenga solo puede leer esto. Para cortarla, cambia o borra la variable en AI Studio.

## Configuración
1. Genera una llave larga, de 32 caracteres o más. Por ejemplo, con un generador de contraseñas: 40 caracteres, solo letras y números.
2. **AI Studio** → secretos de la app: añade `CLAUDE_DIAG_TOKEN` con esa llave y publica.
3. **El entorno de Claude Code**: menú del entorno en el título de la sesión → Edit → Network secrets (o variables de entorno). Añade la misma llave con el mismo nombre, `CLAUDE_DIAG_TOKEN`. Una sesión nueva la toma.
4. Nunca pegues la llave en el chat.
5. Para leer la base de datos (errores y posts), el servidor usa el mismo acceso que el Publicador: la cuenta de servicio o el usuario robot.
