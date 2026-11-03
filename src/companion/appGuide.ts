/* The app guide: how the Summit webapp works, in short bilingual answers.
   One source for both brains of the Highbot:
   - Claude reads it in its system prompt (server/companion/knowledge.ts);
   - with Claude off, paused or out of budget, the chat answers from it
     locally (localKb.ts), so the bot always knows the app.
   Pure data: safe to import on the server. `go` is a destination id
   (destinations.ts) the local answer can take the Creador to. */

export interface Bi { es: string; en: string }
export interface GuideEntry {
  id: string;
  /** words that point to this answer (lowercase, no accents; ES and EN) */
  keys: string[];
  q: Bi;
  a: Bi;
  go?: string;
}

export const APP_FAQ: GuideEntry[] = [
  { id: 'when', keys: ['cuando', 'fecha', 'fechas', 'donde', 'dia', 'dias', 'when', 'date', 'dates', 'where', 'summit', 'evento', 'event'],
    q: { es: '¿Cuándo y dónde es el Summit?', en: 'When and where is the Summit?' },
    a: { es: 'Del 11 al 13 de diciembre de 2026, en español. Los Días 1 y 2 son digitales y gratis por YouTube Live (también LinkedIn y Facebook Live). El Día 3 es el SGX Showcase presencial en Chroma Space Studios, San Juan, por invitación.', en: 'December 11 to 13, 2026, in Spanish. Days 1 and 2 are digital and free on YouTube Live (also LinkedIn and Facebook Live). Day 3 is the in-person SGX Showcase at Chroma Space Studios, San Juan, by invitation.' },
    go: 'agenda' },
  { id: 'cost', keys: ['cuesta', 'precio', 'gratis', 'pagar', 'boleto', 'entrada', 'cost', 'price', 'free', 'ticket', 'pay'],
    q: { es: '¿Cuánto cuesta?', en: 'How much is it?' },
    a: { es: 'Los Días 1 y 2 son gratis por YouTube Live. El Día 3 en Chroma Space Studios es por invitación, con cupo limitado. El SGX Pass también es gratis.', en: 'Days 1 and 2 are free on YouTube Live. Day 3 at Chroma Space Studios is by invitation, with limited capacity. The SGX Pass is free too.' } },
  { id: 'day3', keys: ['dia 3', 'presencial', 'chroma', 'showcase', 'invitacion', 'invitado', 'domingo', 'in person', 'invitation', 'invite', 'sunday', 'venue', 'sede'],
    q: { es: '¿Cómo voy al Día 3?', en: 'How do I get to Day 3?' },
    a: { es: 'El Día 3 (domingo 13) es el SGX Showcase en Chroma Space Studios, San Juan: demos en vivo de todos los pilares, artistas, networking y premios. Es por invitación y con cupo limitado (40 a 60 personas); las invitaciones las maneja el equipo (info@spatialgineers.com). Si tienes invitación, entras con el QR de tu SGX Pass.', en: 'Day 3 (Sunday the 13th) is the SGX Showcase at Chroma Space Studios, San Juan: live demos of every pillar, artists, networking and prizes. It is by invitation with limited capacity (40 to 60 people); the team handles invitations (info@spatialgineers.com). If invited, you get in with your SGX Pass QR.' },
    go: 'mapa' },
  { id: 'watch', keys: ['ver', 'transmision', 'stream', 'youtube', 'live', 'linkedin', 'facebook', 'watch', 'broadcast', 'canal', 'channel'],
    q: { es: '¿Dónde veo la transmisión?', en: 'Where do I watch it?' },
    a: { es: 'Por YouTube Live (youtube.com/@spatialgineers), el canal principal, y también por LinkedIn y Facebook Live. Los Mismos TV transmite junto a nosotros desde su canal. En la app, todo está en Salas de transmisión.', en: 'On YouTube Live (youtube.com/@spatialgineers), the main channel, plus LinkedIn and Facebook Live. Los Mismos TV streams alongside us from its channel. In the app, it is all in the broadcast rooms.' },
    go: 'broadcast' },
  { id: 'pass', keys: ['pase', 'sgx pass', 'pass', 'credencial', 'holo card', 'holocard', 'forjar', 'forja', 'registro', 'registrarme', 'credential', 'forge', 'register', 'sign up'],
    q: { es: '¿Qué es el SGX Pass?', en: 'What is the SGX Pass?' },
    a: { es: 'Tu credencial gratis del Summit, que también es tu Holo Card. Se forja en un minuto (nombre, email, pilar favorito y tu Highbot) y te da tu QR de networking, la entrada del Día 3, las misiones y el XP. Hay un pase por email.', en: 'Your free Summit credential, which is also your Holo Card. You forge it in a minute (name, email, favorite pillar and your Highbot) and it gives you your networking QR, your Day 3 entrance, missions and XP. One pass per email.' },
    go: 'pase' },
  { id: 'lost', keys: ['perdi', 'recuperar', 'otro telefono', 'cambie', 'nuevo telefono', 'otro dispositivo', 'lost', 'recover', 'new phone', 'another device', 'google', 'cuenta', 'account', 'login', 'entrar'],
    q: { es: 'Perdí mi pase o cambié de teléfono', en: 'I lost my pass or changed phones' },
    a: { es: 'Entra con Google usando el mismo email de tu pase: tu pase, tu Highbot y tu progreso aparecen solos, sin recuperar nada. Con Google todo queda atado a tu cuenta.', en: 'Sign in with Google using your pass email: your pass, your Highbot and your progress show up on their own, nothing to recover. With Google everything stays tied to your account.' },
    go: 'pase' },
  { id: 'xp', keys: ['xp', 'puntos', 'ganar', 'rango', 'nivel', 'points', 'earn', 'rank', 'level'],
    q: { es: '¿Cómo gano XP?', en: 'How do I earn XP?' },
    a: { es: 'Con las misiones del Reactor, los juegos del Spark, votando en vivo en la arena (+25 XP por voto), escaneando pases (+50 XP) y encontrando los rayos SGX escondidos en las secciones. Tu rango sube con el XP total.', en: 'With the Reactor missions, the Spark games, voting live in the arena (+25 XP per vote), scanning passes (+50 XP) and finding the SGX bolts hidden across the sections. Your rank grows with your total XP.' },
    go: 'reactor' },
  { id: 'reactor', keys: ['mision', 'misiones', 'reactor', 'sello', 'sellar', 'mission', 'missions', 'stamp', 'quest'],
    q: { es: '¿Qué es el Reactor de misiones?', en: 'What is the mission Reactor?' },
    a: { es: 'Son 24 misiones repartidas en los seis pilares. Cada pilar completo queda sellado en tu SGX Pass. Ábrelo desde el contador "Misiones x/24": cada misión tiene un botón que te lleva a donde se hace.', en: 'They are 24 missions across the six pillars. Every completed pillar is stamped on your SGX Pass. Open it from the "Missions x/24" counter: each mission has a button that takes you where it is done.' },
    go: 'reactor' },
  { id: 'store', keys: ['tienda', 'premios', 'canjear', 'gastar', 'store', 'shop', 'rewards', 'prize', 'redeem', 'spend'],
    q: { es: '¿Qué hago con mi XP?', en: 'What do I do with my XP?' },
    a: { es: 'Lo gastas en la Tienda del Reactor sin bajar de rango: el rango cuenta el XP total que has ganado.', en: 'You spend it in the Reactor store without losing rank: your rank counts all the XP you ever earned.' },
    go: 'tienda' },
  { id: 'games', keys: ['juego', 'juegos', 'jugar', 'dron', 'drone', 'torre', 'pulso', 'rayo', 'arcade', 'game', 'games', 'play', 'tower'],
    q: { es: '¿Qué juegos hay?', en: 'What games are there?' },
    a: { es: 'En Juegos y laboratorios (SGX.Spark): Dron SGX (cruza anillos), Torre de Pilares (apila los seis pilares en orden), Pulso SGX (ritmo) y Rayo en tus manos (derriba al Jefe SGX). Todos dan XP y tienen misiones.', en: 'In Games & labs (SGX.Spark): SGX Drone (fly through rings), Pillar Tower (stack the six pillars in order), SGX Pulse (rhythm) and Bolt in your hands (take down the SGX Boss). They all give XP and have missions.' },
    go: 'juegos' },
  { id: 'vote', keys: ['votar', 'voto', 'votos', 'votacion', 'votar en vivo', 'encuesta', 'trivia', 'kahoot', 'vote', 'voting', 'poll'],
    q: { es: '¿Cómo voto en vivo?', en: 'How do I vote live?' },
    a: { es: 'En la arena de votación en vivo, estilo Kahoot, durante las pausas de la transmisión (+25 XP por voto). Las encuestas solo aceptan votos mientras el equipo las tiene abiertas.', en: 'In the live voting arena, Kahoot style, during the stream breaks (+25 XP per vote). Polls only take votes while the team has them open.' },
    go: 'play' },
  { id: 'highbot', keys: ['highbot', 'avatar', 'robot', 'disenar', 'personalizar', 'colores', 'visor', 'accesorios', 'design', 'customize', 'colors'],
    q: { es: '¿Cómo diseño mi Highbot?', en: 'How do I design my Highbot?' },
    a: { es: 'En Avatar Studio. Todo Highbot es Highcoon (orejas, antifaz y nariz), y tú escoges el resto: colores, párpados, visor, accesorios de cabeza, el pilar en el pecho (logo en el engrane o pilar grande), un emblema 3D extra y un motivo SGX grabado en el torso. También hay presets.', en: 'In Avatar Studio. Every Highbot is Highcoon (ears, mask and nose) and you pick the rest: colors, eyelids, visor, headgear, the pillar on the chest (logo on the gear or a big pillar), an extra 3D emblem and an SGX motif on the torso. There are presets too.' },
    go: 'avatar' },
  { id: 'chat', keys: ['hablar', 'chat', 'conversar', 'preguntar', 'despertar', 'talk', 'ask', 'claude', 'ia', 'ai'],
    q: { es: '¿Cómo hablo contigo?', en: 'How do I talk to you?' },
    a: { es: 'Con tu SGX Pass forjado y tu cuenta de Google conectada, me preguntas lo que quieras y te llevo por la app. Si estoy descansando, igual te contesto lo esencial desde aquí.', en: 'With your SGX Pass forged and your Google account connected, ask me anything and I take you around the app. If I am resting, I still answer the essentials from here.' },
    go: 'tu-highbot' },
  { id: 'network', keys: ['networking', 'escanear', 'escaner', 'qr', 'contacto', 'contactos', 'rolodex', 'conectar', 'red', 'scan', 'contact', 'connect'],
    q: { es: '¿Cómo hago networking?', en: 'How do I network?' },
    a: { es: 'Escanea el QR del pase de otra persona: quedan en el Rolodex de los dos (+50 XP). Tu Red muestra tus contactos como una constelación; si conectas con creadores de los seis pilares, ganas un sello secreto. El Rolodex se exporta a tus contactos.', en: 'Scan someone\'s pass QR: you both land in each other\'s Rolodex (+50 XP). Your Network shows contacts as a constellation; link creators from all six pillars for a secret stamp. The Rolodex exports to your contacts.' },
    go: 'escaner' },
  { id: 'agenda', keys: ['agenda', 'programa', 'horario', 'run of show', 'itinerario', 'alerta', 'calendario', 'recordatorio', 'schedule', 'program', 'calendar', 'reminder'],
    q: { es: '¿Dónde está la agenda?', en: 'Where is the agenda?' },
    a: { es: 'En el Run of Show: el programa minuto a minuto de los tres días. Ahí armas "Mi Agenda" y pones alertas en tu calendario (.ics o Google Calendar) 15 minutos antes de cada bloque.', en: 'In the Run of Show: the minute-by-minute program for the three days. Build "My Agenda" there and add alerts to your calendar (.ics or Google Calendar) 15 minutes before each block.' },
    go: 'agenda' },
  { id: 'day1', keys: ['dia 1', 'viernes', 'day 1', 'friday', 'artistas', 'roblox', 'bloques'],
    q: { es: '¿Qué pasa el Día 1?', en: 'What happens on Day 1?' },
    a: { es: 'Viernes 11, digital: apertura a las 10:00 AM, luego seis bloques de 25 minutos (uno por pilar) con un artista invitado en Roblox antes de cada uno, los portafolios de los 8 Initiates del Guild y el cierre a las 4:30 PM con los 6 Initiates del Día 3.', en: 'Friday the 11th, digital: opening at 10:00 AM, then six 25-minute blocks (one per pillar) with a guest artist in Roblox before each, the portfolios of the 8 Guild Initiates and the close at 4:30 PM with the 6 Initiates for Day 3.' },
    go: 'agenda' },
  { id: 'day2', keys: ['dia 2', 'sabado', 'industria', 'conversaciones', 'conversatorio', 'day 2', 'saturday', 'industry', 'panel'],
    q: { es: '¿Qué pasa el Día 2?', en: 'What happens on Day 2?' },
    a: { es: 'Sábado 12, Día de la Industria (digital): seis conversaciones de 45 minutos, una por pilar, con personas invitadas (se anuncian al confirmarse), y entre cada una una pausa con votación gamificada (+25 XP).', en: 'Saturday the 12th, Industry Day (digital): six 45-minute conversations, one per pillar, with guests (announced once confirmed), and a gamified voting break between each (+25 XP).' },
    go: 'agenda' },
  { id: 'speakers', keys: ['speaker', 'speakers', 'ponentes', 'invitados', 'artista', 'artistas', 'quien', 'quienes', 'line-up', 'lineup', 'guests', 'who'],
    q: { es: '¿Quiénes son los speakers?', en: 'Who are the speakers?' },
    a: { es: 'Confirmados: Danelson Maldonado González "The Highgineer" y Ricardo A. Hernández Díaz "Lightning Fingers". Los artistas e invitados se anuncian solo cuando están confirmados por escrito; los verás en Speakers & artistas.', en: 'Confirmed: Danelson Maldonado González "The Highgineer" and Ricardo A. Hernández Díaz "Lightning Fingers". Artists and guests are announced only once confirmed in writing; you will see them in Speakers & artists.' },
    go: 'speakers' },
  { id: 'spatialgineers', keys: ['spatialgineers', 'estudio', 'empresa', 'quienes son', 'fundadores', 'danelson', 'ricardo', 'highgineer', 'lightning', 'company', 'founders', 'studio'],
    q: { es: '¿Quiénes son Spatialgineers?', en: 'Who are Spatialgineers?' },
    a: { es: 'Spatialgineers LLC es un estudio de ingeniería creativa y computación espacial en Puerto Rico: 3D, medios inmersivos, gamificación, WebXR, VR/AR e IA. Lo fundaron Danelson Maldonado González "The Highgineer" y Ricardo A. Hernández Díaz "Lightning Fingers", ingenieros mecánicos del RUM. Su lema: "Ingeniando imaginación, construyendo realidades."', en: 'Spatialgineers LLC is a creative engineering and spatial computing studio in Puerto Rico: 3D, immersive media, gamification, WebXR, VR/AR and AI. Founded by Danelson Maldonado González "The Highgineer" and Ricardo A. Hernández Díaz "Lightning Fingers", mechanical engineers from RUM. Motto: "Engineering Imagination, Building Reality."' },
    go: 'pilares' },
  { id: 'pillars', keys: ['pilar', 'pilares', 'framework', 'sgx', 'story', 'showcase', 'spark', 'stage', 'system', 'synthesize', 'pillar', 'pillars'],
    q: { es: '¿Qué son los seis pilares?', en: 'What are the six pillars?' },
    a: { es: 'El SGX Framework de Spatialgineers: Story (narrativa y cultura), Showcase (3D, XR y gemelos digitales), Spark (juegos y gamificación), Stage (shows y transmisiones), System (apps, IA y operaciones) y Synthesize (donde todo converge, con el SGX Guild). Cada uno tiene su bloque el Día 1 y su conversación el Día 2.', en: 'The Spatialgineers SGX Framework: Story (narrative and culture), Showcase (3D, XR and digital twins), Spark (games and gamification), Stage (shows and broadcasts), System (apps, AI and operations) and Synthesize (where it all converges, with the SGX Guild). Each has its block on Day 1 and its conversation on Day 2.' },
    go: 'pilares' },
  { id: 'sponsor', keys: ['patrocinar', 'patrocinio', 'patrocinador', 'paquete', 'paquetes', 'marca', 'auspicio', 'sponsor', 'sponsorship', 'package', 'brand'],
    q: { es: '¿Cómo patrocino el Summit?', en: 'How do I sponsor the Summit?' },
    a: { es: 'Con los Paquetes 1 a 5: Digital Presence ($50–$100), Gamified ($250–$500), Experience ($750–$1,000), Signature Experience ($1,500–$2,500) y Alianza de servicios esenciales (a convenir). Cada uno incluye lo del anterior. Todo está en Patrocina el Summit; dudas a info@spatialgineers.com.', en: 'With Packages 1 to 5: Digital Presence ($50–$100), Gamified ($250–$500), Experience ($750–$1,000), Signature Experience ($1,500–$2,500) and Essential services alliance (to agree). Each includes the one before. It is all in Sponsor the Summit; questions to info@spatialgineers.com.' },
    go: 'patrocina' },
  { id: 'partners', keys: ['partners', 'aliados', 'los mismos', 'chroma space', 'tu marca aqui', 'marcas'],
    q: { es: '¿Quiénes son los partners?', en: 'Who are the partners?' },
    a: { es: 'Chroma Space Studios (sede del Día 3) y Los Mismos TV (transmite junto a nosotros). Los espacios "Tu marca aquí" están abiertos a propósito para nuevas marcas.', en: 'Chroma Space Studios (Day 3 venue) and Los Mismos TV (streams alongside us). The "Your brand here" spots are open on purpose for new brands.' },
    go: 'sponsors' },
  { id: 'hire', keys: ['contratar', 'cotizar', 'cotizacion', 'servicios', 'proyecto', 'trabajar con', 'hire', 'quote', 'services', 'project', 'work with'],
    q: { es: 'Quiero trabajar con Spatialgineers', en: 'I want to work with Spatialgineers' },
    a: { es: '¡Brutal! Escríbele al equipo a info@spatialgineers.com con tu idea y te contestan con una propuesta. Los precios de servicios no los doy por aquí.', en: 'Awesome! Write to the team at info@spatialgineers.com with your idea and they will reply with a proposal. I do not give service prices here.' } },
  { id: 'guild', keys: ['guild', 'initiates', 'iniciados', 'unirme', 'talento', 'join', 'talent', 'trials'],
    q: { es: '¿Qué es el SGX Guild?', en: 'What is the SGX Guild?' },
    a: { es: 'El pipeline gamificado de talento creativo de Puerto Rico, con rangos, pilares y Trials. En el Summit, los 8 Initiates presentan portafolios el Día 1 y los top 6 hacen su pitch el Día 3. Ser parte es un privilegio; ahora no hay convocatoria abierta (sigue a @spatialgineers).', en: 'The gamified creative talent pipeline of Puerto Rico, with ranks, pillars and Trials. At the Summit, the 8 Initiates present portfolios on Day 1 and the top 6 pitch on Day 3. Being part of it is a privilege; there is no open call now (follow @spatialgineers).' },
    go: 'guild' },
  { id: 'highcoon', keys: ['highcoon', 'mapache', 'raccoon', 'highcade'],
    q: { es: '¿Quién es Highcoon?', en: 'Who is Highcoon?' },
    a: { es: 'Highcoon es la IP propia de Spatialgineers: un mapache científico creado por Danelson "The Highgineer". Yo soy Highcoon en mi forma de robot. Síguelo en @Highcoonvibes (Instagram, X y TikTok).', en: 'Highcoon is Spatialgineers\' own IP: a scientist raccoon created by Danelson "The Highgineer". I am Highcoon in robot form. Follow @Highcoonvibes (Instagram, X and TikTok).' } },
  { id: 'lite', keys: ['lento', 'bateria', 'ligero', 'lite', 'fx', 'datos', 'pesado', 'slow', 'battery', 'data', 'laggy'],
    q: { es: 'La app va lenta o gasta batería', en: 'The app is slow or drains battery' },
    a: { es: 'Toca FX en el header para pasar a modo Ligero: apaga el 3D, los shaders y las animaciones y me ves en 2D. Gasta mucha menos batería y datos. Se activa solo en teléfonos que piden ahorrar datos.', en: 'Tap FX in the header to switch to Lite mode: it turns off the 3D, shaders and animations and shows me in 2D. Much less battery and data. It turns on by itself on phones that ask to save data.' } },
  { id: 'install', keys: ['instalar', 'app', 'descargar', 'pwa', 'offline', 'sin internet', 'install', 'download'],
    q: { es: '¿Hay que descargar algo?', en: 'Do I need to download anything?' },
    a: { es: 'No: todo corre en el navegador. Si quieres, instálala como app (PWA) desde el menú del navegador, y el QR de tu pase funciona sin conexión.', en: 'No: it all runs in the browser. If you like, install it as an app (PWA) from the browser menu, and your pass QR works offline.' } },
  { id: 'press', keys: ['prensa', 'medio', 'medios', 'periodista', 'acreditacion', 'kit de prensa', 'press', 'media', 'journalist', 'press kit'],
    q: { es: 'Soy prensa', en: 'I am press' },
    a: { es: 'Solicita tu acreditación en la Sala de prensa (/prensa) antes del 1 de diciembre: 6 cupos, uno por medio, y primero forjas tu SGX Pass. Cubre los 3 días, con entrada al Día 3 en Chroma. Ahí mismo está el kit de prensa. Dudas: info@spatialgineers.com.', en: 'Request accreditation in the Press room (/prensa) before December 1: 6 spots, one per outlet, and you forge your SGX Pass first. It covers all 3 days, with Day 3 entry at Chroma. The press kit is right there too. Questions: info@spatialgineers.com.' },
    go: 'prensa' },
  { id: 'terminal', keys: ['terminal', 'comando', 'atajo', 'teclado', 'ctrl', 'command', 'shortcut', 'keyboard'],
    q: { es: '¿Qué es la terminal?', en: 'What is the terminal?' },
    a: { es: 'La Terminal de mando te deja navegar toda la plataforma escribiendo. Ábrela con Ctrl+K o la tecla /.', en: 'The command terminal lets you move around the whole platform by typing. Open it with Ctrl+K or the / key.' },
    go: 'terminal' },
  { id: 'contact', keys: ['contacto', 'email', 'correo', 'telefono', 'instagram', 'redes', 'contact', 'phone', 'social'],
    q: { es: '¿Cómo contacto al equipo?', en: 'How do I contact the team?' },
    a: { es: 'info@spatialgineers.com · +1 (787) 445-5284 · @spatialgineers en Instagram y YouTube.', en: 'info@spatialgineers.com · +1 (787) 445-5284 · @spatialgineers on Instagram and YouTube.' } },
];

/** Controls that are always on screen, for the prompt. */
export const APP_CONTROLS_ES = `- Header: logo del Summit (inicio), la tarjeta del sponsor del momento junto al logo con "Patrocina el Summit", idioma ES/EN, sonido, FX/Ligero, el chip del Creador (abre Tu Estudio), compartir y el Menú con todos los módulos.
- Barra del núcleo (portada): la fecha y los relojes del Summit (cuenta regresiva al Día 1), las visitas totales y Agenda. Los Ajustes del núcleo (girar, zoom, sponsors en 3D, inmersión total, modo ligero) están en el engranaje del header de arriba. Tocar un pilar 3D abre su tarjeta con "Visitar pilar".
- Riel "Misiones x/24": abre el Reactor como pop-up; cada misión tiene un botón a donde se hace.
- La cabecita del Highbot (abajo a la derecha) abre este chat.
- Pulso en vivo: reacciones y encuesta de la keynote, solo durante los días del Summit.
- Al ganar XP, a veces sale "Presentado por" con una marca por unos segundos (máximo cada 5 minutos); tocarlo la fija y lleva a su showcase.
- Modo Ligero (FX → Ligero): sin 3D ni animaciones, el Highbot en 2D; ahorra batería y datos.`;

/** The guide as prompt text (Spanish), for Claude. */
export function appGuidePrompt(): string {
  return APP_FAQ.map((e) => `- ${e.q.es} ${e.a.es}${e.go ? ` (ir_a: ${e.go})` : ''}`).join('\n');
}
