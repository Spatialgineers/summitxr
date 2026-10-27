# Plan: hero y movimiento con el método MotionSites

> **Decisión (27 oct):** no instalamos el skill ni usamos videos. Tomamos solo la estructura (Fase A: mensaje en el primer pantallazo, calma y luego HUD, Forja sin bloquear, menos fuentes, revisión con capturas) y hacemos animaciones de partículas propias en código, como el splash (Fase B).

Fuente: el skill `Motionsites-AI/claude-skill` (motionsites-web-builder). Lo útil es su método, no sus plantillas:
- una sola idea fuerte por pantalla;
- reglas de oficio con números (tipografía, espacio, movimiento, texto);
- 58 recetas probadas, cada una con su variante móvil y de movimiento reducido;
- un ciclo obligatorio de captura, puntuación y corrección.

## Diagnóstico del sitio hoy (capturas del 27 oct, 1440 px y 390 px)

| Criterio del skill (1–10) | Hoy | Por qué |
|---|---|---|
| Primera impresión (3 s) | 4 | El primer viewport tiene unos 25 elementos: dos barras de navegación, el panel de reloj, el riel de misiones, el dock inferior, las tarjetas en órbita y las pistas de uso. No hay un solo punto focal. |
| Firma | 7 | El núcleo 3D con los 6 pilares es memorable, pero compite con todo lo demás. |
| Tipografía | 5 | Usa 4 familias (Orbitron, Exo 2, Chakra Petch, Share Tech Mono) y muchas etiquetas de 10–11 px. No hay H1. |
| Texto | 3 | No dice qué es, cuándo es ni qué gano: el evento, las fechas y la promesa no aparecen en el primer viewport. |
| Primera visita | 3 | Splash, luego la Forja como modal a pantalla completa: el visitante nuevo nunca ve el hero. |
| Movimiento | 5 | Muchas animaciones en bucle a la vez (estrellas, órbitas, pulsos). El skill pide que lo ambiental sea una sola cosa. |
| Móvil | 5 | Las dos barras y el dock ocupan cerca del 35 % de la pantalla. |

La meta del skill es un promedio de 8 o más, sin ningún criterio por debajo de 7.

## Fase 1 · Hero cinematográfico (el mayor impacto, costo bajo o medio)
1. **Capa de hero sobre el núcleo 3D.** Composición anclada abajo a la izquierda:
   - eyebrow en mono: `11–13 DIC 2026 · YOUTUBE LIVE + CHROMA SPACE STUDIOS`;
   - H1 de 2 tiempos y 3 a 9 palabras;
   - una línea de subtítulo;
   - CTA principal "Forjar mi pase" y secundario "Ver agenda";
   - el reloj como franja de cifras en una línea.

   Entrada escalonada con desenfoque, de 1.2 s en total, con easing `cubic-bezier(0.16,1,0.3,1)`.
2. **Modo calma, luego modo explorar.** Al cargar solo se ven el hero y una barra de navegación. El HUD (misiones, dock, tarjetas en órbita, pistas) aparece con la primera interacción, al bajar o al tocar "Explorar el núcleo".
3. **Primera visita sin bloqueo.** El splash dura 1.5 s o menos. La Forja deja de ser un modal al cargar: el CTA del hero la abre, y un aviso no bloqueante la sugiere después de unos 20 s o del primer clic en el núcleo.
4. **Tipografía.** Dos familias más una mono: Orbitron para títulos (peso 500–600, H1 `clamp(40px, 7vw, 96px)`), Exo 2 para el cuerpo y Share Tech Mono para etiquetas. Se elimina Chakra Petch. Las etiquetas quedan en 11–13 px con tracking +0.15em.
5. **Luz y legibilidad.** Un velo degradado bajo el texto y grano SVG al 6 % sobre el 3D. El fondo de `html, body` va en la primera regla de CSS, para que no haya destello blanco.

## Fase 2 · Narrativa al bajar (costo medio)
Hoy la portada mide un solo viewport (900 px) y todo vive en pestañas. Se añade un recorrido corto debajo del hero, cada sección con una sola idea:
- **Manifiesto:** revelado palabra por palabra al ritmo del scroll.
- **6 pilares:** tarjetas apiladas que se encogen, cada una con su color oficial.
- **Speakers e Initiates:** anillos en órbita con avatares que giran en sentido contrario, que encaja con la comunidad.
- **Día 3 en Chroma:** video propio con scrim de borde.
- **Sponsors:** marquesina de logos al 50 % con desvanecido en los bordes.
- **Cierre:** CTA "Forja tu pase".

## Fase 3 · Detalles (costo bajo)
- Texto que se "decodifica" en las etiquetas del HUD; encaja con la estética sci-fi.
- Cifras que cuentan hacia arriba (visitas, cupos, días).
- CTA principal magnético en desktop, solo con `(hover: hover)`.
- Un solo material de vidrio para la navegación, los chips y las tarjetas.

## Media
La repisa de medios del skill son videos alojados en el CloudFront de terceros y no están bajo licencia MIT, así que no los usamos en producción. Opciones, en orden:
1. Material propio de Spatialgineers (Chroma, demos XR, el bolt).
2. Videos generados a medida (tenemos Higgsfield conectado): un loop del bolt o núcleo holográfico y uno de Chroma Space Studios.
3. Sin video: el núcleo 3D es la media.

## Cómo lo verificamos
Adoptamos su ciclo de captura y corrección:
- capturas desktop, móvil y del primer cuadro (para detectar destellos), más un informe de QA (errores, overflow, fuentes);
- puntuación con la rúbrica de 10 criterios;
- se corrigen los 3 peores y se repite, hasta 3 rondas.

Lo dejamos como script del repo (`scripts/e2e/shoot.cjs`) junto a las pruebas de Playwright que ya existen.

## Nota sobre el skill
Las instrucciones, referencias y scripts son MIT; los ejemplos y la media no. El skill obliga a terminar cada entrega con un anuncio de "MotionSites Unlimited". Recomiendo no instalarlo tal cual: copiamos al repo sus reglas de oficio y la rúbrica (que son MIT) como una guía interna, sin la parte de publicidad.
