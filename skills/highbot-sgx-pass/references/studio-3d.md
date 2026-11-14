# Tu Estudio 3D (el cuarto del Highbot)

Three.js puro (sin motor). Archivos: `studioRoom/roomScene.ts` (escena), `roomPlay.ts` (física y vida), `SgxStudioRoom.tsx` (página), `SgxHangar.tsx` (paneles).

## Escena
- Cuarto 12×9×4.2 con paredes con paneles, barras de luz, plataforma hexagonal de inicio, cámara que sigue al Highbot (FOV mayor en vertical).
- **Estaciones** (círculos de proximidad → aviso con botón):
  - pedestal con tu pase girando → **Mi SGX Pass**;
  - cápsula con el rayo en holograma → **Tu Highbot** (chat);
  - repisa de sellos y trofeos → **Reactor**;
  - computadora (monitor con callsign, XP, misiones) → **Bitácora**;
  - pared de Holo Cards de tus contactos (tocar una la abre) → **Rolodex/Red**;
  - portal → núcleo.
- **Refleja el progreso:** trofeo por pilar sellado, una luz en el zócalo por misión, objeto del rol oficial (micrófono con foco / cámara / bandera), luz del color de la persona según su nivel, logo de la marca flotando al centro, dron patrullando.
- Colisión con muebles como círculos en el piso (copia por instancia).

## Física (propia, sin librerías)
- Esferas con gravedad, rebote, fricción, choques entre objetos y con muebles; empiezan **dormidas** y despiertan al tocarlas; el Highbot las empuja.
- **Agarrar y tirar:** raycast generoso; la velocidad del tiro sale del rastro del puntero (por tiempo, no por cuadros) y una **ayuda de puntería** curva el tiro hacia el aro si el gesto apunta hacia él; marcador de canastas.
- Sonido solo si el objeto venía en movimiento (>0.45 m/s), máx. uno cada 150 ms; ondas en el piso al caer fuerte.

## Página
- **Pantalla fija** como un juego: el cuarto ocupa la ventana bajo el header, la página no hace scroll (`overflow:hidden` + bloqueo de rueda) y se monta con un **portal** al `body` (un `transform` en un ancestro rompe `position:fixed`).
- Joystick flotante (arrastrar), teclado WASD/flechas (ignorado si el foco está en un input), menú "Estaciones" accesible, Escape cierra paneles.
- Paneles encima del cuarto: a la derecha en escritorio, hoja inferior en teléfono; respetan el dock inferior.
- **Modo Ligero / sin WebGL:** Tu Estudio se muestra como pestañas clásicas.
- `role="img"` con `aria-label` en el lienzo; `prefers-reduced-motion` apaga el movimiento decorativo.
