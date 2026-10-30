/* "La canción del Summit". Drop the file in public/games/pulse/ and set
   SONG_URL = '/games/pulse/<file>.mp3' (or a CDN URL that allows CORS). The
   chart is generated from the audio the first time and cached. Empty: the
   game plays the built-in SGX beat. `?song=<url>` overrides it for testing. */
export const SONG_URL = '';

/** Shown on the start screen when a real song is loaded. */
export const SONG_TITLE = { es: 'La canción del Summit', en: 'The Summit song' };

export function songUrl(): string {
  try {
    const q = new URLSearchParams(window.location.search).get('song');
    if (q && /^(https?:\/\/|\/)/i.test(q)) return q;
  } catch { /* no window */ }
  return SONG_URL;
}
