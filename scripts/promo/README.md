# Promo reel (portrait 9:16)

Records the app in slow motion against the Firebase emulators and builds a 30 fps, 1080x1920 MP4 with the voiceover.

1. Start the emulators and the dev server, as in `scripts/e2e/README.md`, on port 3200.
2. Voiceover: put the ElevenLabs MP3 at `scripts/promo/out/vo.mp3`.
   - Current take: voice "Lizardo - Latin Social Media", model eleven_v4.
   - The line timings in `build.cjs` match this take. A new take needs new timings (measure them with `ffmpeg -af silencedetect`).
3. Optional check: `SCOUT=1 node scripts/promo/record.cjs` runs at normal speed and saves one screenshot per step.
4. Record: `node scripts/promo/record.cjs` takes about 17 minutes. Frames go to `out/frames`.
5. Build: `node scripts/promo/build.cjs` writes `out/sgx_promo_reel_9x16.mp4`.

How it stays smooth without a GPU: the app's clocks, timers, frames and CSS animations run at `SLOW` (0.08×). Every screencast frame keeps its virtual time, and the build re-times them to 30 fps.

Captions, the end card and the hidden toasts are injected into the page during the take. The app itself does not change.
