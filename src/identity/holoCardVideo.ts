/* The Holo Card as a short video for stories: the 1080×1920 story frame with a
   slow push-in and a light sweeping across the card, recorded in the browser.
   Nothing is uploaded; the file is made on the Creador's device. */

const SECONDS = 6;
const FPS = 30;

function pickMime(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  const options = ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  return options.find((m) => MediaRecorder.isTypeSupported(m)) || null;
}

export const canRecordHoloVideo = () =>
  !!pickMime() && typeof HTMLCanvasElement !== 'undefined' && 'captureStream' in HTMLCanvasElement.prototype;

export function recordHoloVideo(story: HTMLCanvasElement, accent: string): Promise<{ blob: Blob; ext: 'mp4' | 'webm' }> {
  return new Promise((resolve, reject) => {
    const mime = pickMime();
    if (!mime) { reject(new Error('unsupported')); return; }
    const W = story.width, H = story.height;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d')!;
    const stream = (c as any).captureStream(FPS) as MediaStream;
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    rec.onerror = () => reject(new Error('record'));
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      resolve({ blob: new Blob(chunks, { type: mime.split(';')[0] }), ext: mime.startsWith('video/mp4') ? 'mp4' : 'webm' });
    };

    const frame = (t: number) => {
      const p = Math.min(1, t / SECONDS);
      const ease = 1 - Math.pow(1 - p, 3);
      const zoom = 1.08 - 0.08 * ease; // settles into the full frame
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.scale(zoom, zoom);
      ctx.drawImage(story, -W / 2, -H / 2);
      ctx.restore();
      // two passes of light across the frame
      [0.18, 0.62].forEach((at) => {
        const q = (p - at) / 0.26;
        if (q <= 0 || q >= 1) return;
        const x = -W * 0.6 + q * W * 2.2;
        const g = ctx.createLinearGradient(x - 220, 0, x + 220, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(0.5, 'rgba(255,255,255,0.22)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.transform(1, 0, -0.35, 1, H * 0.175, 0);
        ctx.fillStyle = g;
        ctx.fillRect(x - 220, 0, 440, H);
        ctx.restore();
      });
      // a frame in the Creador's color that breathes
      ctx.strokeStyle = accent;
      ctx.globalAlpha = 0.35 + 0.3 * Math.sin(p * Math.PI * 4);
      ctx.lineWidth = 6;
      ctx.strokeRect(24, 24, W - 48, H - 48);
      ctx.globalAlpha = 1;
      // fade in and out
      const fade = p < 0.08 ? 1 - p / 0.08 : p > 0.94 ? (p - 0.94) / 0.06 : 0;
      if (fade > 0) { ctx.fillStyle = `rgba(5,5,5,${fade})`; ctx.fillRect(0, 0, W, H); }
    };

    frame(0);
    rec.start();
    const t0 = performance.now();
    // A timer, not requestAnimationFrame: the recording keeps going if the tab loses focus.
    const timer = window.setInterval(() => {
      const t = (performance.now() - t0) / 1000;
      frame(t);
      if (t >= SECONDS) { window.clearInterval(timer); window.setTimeout(() => rec.stop(), 120); }
    }, 1000 / FPS);
  });
}
