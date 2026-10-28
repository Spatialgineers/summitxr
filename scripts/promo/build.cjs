// Builds the portrait reel from record.cjs output: maps each recorded scene onto
// its voiceover line (speeding it up or down a little), rebuilds a constant
// 30 fps sequence from the timestamped screencast frames and muxes the voiceover.
//
//   node scripts/promo/build.cjs   → out/sgx_promo_reel_9x16.mp4
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const OUT = path.join(__dirname, 'out');
const FPS = 30;
const { marks, frames } = JSON.parse(fs.readFileSync(path.join(OUT, 'frames.json'), 'utf8'));
const at = (name) => marks.find((m) => m.name === name).t;

// Video timeline (s) ← voiceover lines (pauses measured with silencedetect).
const SCENES = [
  { from: 'splash', to: 'core', skip: 0.6, start: 0, end: 4.24 },
  { from: 'core', to: 'days', start: 4.24, end: 12.33 },
  { from: 'days', to: 'forge', start: 12.33, end: 25.62 },
  { from: 'forge', to: 'agenda', start: 25.62, end: 35.76 },
  { from: 'agenda', to: 'explore', start: 35.76, end: 41.9 },
  { from: 'explore', to: 'end', start: 41.9, end: 47.3 },
  { from: 'end', to: 'done', start: 47.3, end: 57.0 },
];
const TOTAL = SCENES[SCENES.length - 1].end;

frames.sort((a, b) => a.t - b.t);
const frameAt = (t) => {
  let lo = 0, hi = frames.length - 1, best = 0;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (frames[mid].t <= t) { best = mid; lo = mid + 1; } else hi = mid - 1; }
  return frames[best].n;
};

const SEQ = path.join(OUT, 'seq');
fs.rmSync(SEQ, { recursive: true, force: true });
fs.mkdirSync(SEQ);
const report = [];
let f = 0;
for (const sc of SCENES) {
  const srcA = at(sc.from) + (sc.skip || 0);
  const srcB = at(sc.to);
  const speed = (srcB - srcA) / (sc.end - sc.start);
  report.push(`${sc.from.padEnd(8)} src ${(srcB - srcA).toFixed(2)}s → ${(sc.end - sc.start).toFixed(2)}s (x${speed.toFixed(2)})`);
  for (; f < Math.round(sc.end * FPS); f++) {
    const tOut = f / FPS;
    const n = frameAt(srcA + (tOut - sc.start) * speed);
    fs.symlinkSync(path.join(OUT, 'frames', `f${String(n).padStart(6, '0')}.jpg`), path.join(SEQ, `${String(f + 1).padStart(6, '0')}.jpg`));
  }
}
console.log(report.join('\n'));
const used = new Set(fs.readdirSync(SEQ).map((x) => fs.readlinkSync(path.join(SEQ, x)))).size;
console.log(`${f} output frames from ${used} distinct captured frames (${frames.length} captured)`);

const out = path.join(OUT, 'sgx_promo_reel_9x16.mp4');
execFileSync('ffmpeg', [
  '-y', '-loglevel', 'error',
  '-framerate', String(FPS), '-i', path.join(SEQ, '%06d.jpg'),
  '-i', path.join(OUT, 'vo.mp3'),
  '-filter_complex',
  `[0:v]scale=1080:1920:flags=lanczos,format=yuv420p,fade=in:st=0:d=0.3,fade=out:st=${(TOTAL - 0.9).toFixed(2)}:d=0.9[v];` +
  `[1:a]apad,afade=out:st=${(TOTAL - 1.2).toFixed(2)}:d=1.2,loudnorm=I=-14:TP=-1.5:LRA=11[a]`,
  '-map', '[v]', '-map', '[a]', '-t', String(TOTAL),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart',
  out,
], { stdio: 'inherit' });
console.log('wrote', out);
