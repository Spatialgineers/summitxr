/* Camera + hand tracking for "Rayo en tus manos". The camera feed stays in
   the <video>; frames go to a worker (public/games/bolt/hand-worker.js) that
   runs MediaPipe HandLandmarker on-device. Nothing is recorded or uploaded.
   Pinch = thumb tip (4) near index tip (8), relative to the hand size, with
   smoothing and hysteresis so it doesn't flicker. */

export type Facing = 'user' | 'environment';

export interface HandState {
  /** a hand is in view (recently seen) */
  present: boolean;
  /** cursor in video-normalized coords (already mirrored for the front camera) */
  x: number;
  y: number;
  pinching: boolean;
  /** 0 = fingers apart, 1 = touching */
  pinchAmount: number;
  /** 21 landmarks (x, y in video-normalized, mirrored like the cursor) */
  points: Float32Array | null;
}

const WORKER_URL = '/games/bolt/hand-worker.js';
const PINCH_ON = 0.32;
const PINCH_OFF = 0.46;
const LOST_MS = 350;

/** One Euro filter: steady when still, responsive when moving fast. */
class OneEuro {
  private x: number | null = null;
  private dx = 0;
  constructor(private minCutoff = 1.4, private beta = 0.02, private dCutoff = 1) {}
  private alpha(cutoff: number, dt: number) {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }
  filter(v: number, dt: number) {
    if (this.x === null) { this.x = v; return v; }
    const d = (v - this.x) / dt;
    this.dx += this.alpha(this.dCutoff, dt) * (d - this.dx);
    const cutoff = this.minCutoff + this.beta * Math.abs(this.dx) * 1000;
    this.x += this.alpha(cutoff, dt) * (v - this.x);
    return this.x;
  }
  reset() { this.x = null; this.dx = 0; }
}

export class HandTracker {
  readonly hand: HandState = { present: false, x: 0.5, y: 0.5, pinching: false, pinchAmount: 0, points: null };
  facing: Facing = 'user';
  private stream: MediaStream | null = null;
  private worker: Worker | null = null;
  private busy = false;
  private raf = 0;
  private lastSeen = 0;
  private lastT = 0;
  private lastVideoTime = -1;
  private ratio = 1;
  private fx = new OneEuro();
  private fy = new OneEuro();

  constructor(private video: HTMLVideoElement) {}

  get mirrored() { return this.facing === 'user'; }
  get cameraOn() { return !!this.stream; }

  /** Opens the camera. Throws the getUserMedia error (NotAllowedError, NotFoundError…). */
  async startCamera(facing: Facing = this.facing) {
    this.stopCamera();
    if (!navigator.mediaDevices?.getUserMedia) throw new DOMException('No camera API', 'NotFoundError');
    this.facing = facing;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: facing, width: { ideal: 960 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 } },
    });
    this.stream = stream;
    this.video.srcObject = stream;
    this.video.muted = true;
    this.video.playsInline = true;
    await this.video.play().catch(() => undefined);
    this.lastVideoTime = -1;
  }

  stopCamera() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.video.srcObject = null;
    this.clearHand();
  }

  /** Loads the tracker (download happens here, once). Resolves when the model is ready. */
  loadModel(): Promise<void> {
    if (this.worker) return Promise.resolve();
    return new Promise((resolve, reject) => {
      let worker: Worker;
      try {
        worker = new Worker(WORKER_URL);
      } catch (err) {
        reject(err);
        return;
      }
      this.worker = worker;
      const onBoot = (e: MessageEvent) => {
        if (e.data?.type === 'ready') {
          worker.removeEventListener('message', onBoot);
          worker.addEventListener('message', this.onMessage);
          resolve();
        } else if (e.data?.type === 'error') {
          worker.removeEventListener('message', onBoot);
          this.dispose();
          reject(new Error(e.data.message));
        }
      };
      worker.addEventListener('message', onBoot);
      worker.addEventListener('error', () => { this.dispose(); reject(new Error('worker')); });
      worker.postMessage({ type: 'init' });
    });
  }

  /** Starts sending frames to the worker. */
  run() {
    cancelAnimationFrame(this.raf);
    const tick = () => {
      this.raf = requestAnimationFrame(tick);
      this.pump();
    };
    this.raf = requestAnimationFrame(tick);
  }

  pauseLoop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  dispose() {
    this.pauseLoop();
    this.stopCamera();
    this.worker?.terminate();
    this.worker = null;
    this.busy = false;
  }

  private clearHand() {
    const h = this.hand;
    h.present = false;
    h.pinching = false;
    h.pinchAmount = 0;
    h.points = null;
    this.fx.reset();
    this.fy.reset();
  }

  private pump() {
    const v = this.video;
    if (performance.now() - this.lastSeen > LOST_MS && this.hand.present) this.clearHand();
    if (!this.worker || this.busy || !this.stream || v.readyState < 2 || v.videoWidth === 0) return;
    if (v.currentTime === this.lastVideoTime) return;
    this.lastVideoTime = v.currentTime;
    this.busy = true;
    // a smaller frame is plenty for the 224px model and keeps the transfer cheap
    const w = Math.min(480, v.videoWidth);
    createImageBitmap(v, { resizeWidth: w, resizeHeight: Math.round((w * v.videoHeight) / v.videoWidth), resizeQuality: 'low' })
      .then((bitmap) => {
        if (!this.worker) { bitmap.close(); this.busy = false; return; }
        this.worker.postMessage({ type: 'frame', bitmap, ts: performance.now() }, [bitmap]);
      })
      .catch(() => { this.busy = false; });
  }

  private onMessage = (e: MessageEvent) => {
    if (e.data?.type !== 'hand') return;
    this.busy = false;
    const pts: Float32Array | null = e.data.points;
    if (!pts || !this.stream) return;
    const now = performance.now();
    const dt = Math.max(1 / 120, Math.min(0.2, (now - (this.lastT || now - 33)) / 1000));
    this.lastT = now;
    this.lastSeen = now;
    if (this.mirrored) for (let i = 0; i < pts.length; i += 3) pts[i] = 1 - pts[i];
    const px = (i: number) => pts[i * 3];
    const py = (i: number) => pts[i * 3 + 1];
    const dist = (a: number, b: number) => Math.hypot(px(a) - px(b), py(a) - py(b));
    const size = Math.max(1e-4, dist(0, 9));
    // pinch ratio, eased so a single noisy frame can't toggle it
    this.ratio += (dist(4, 8) / size - this.ratio) * 0.55;
    const h = this.hand;
    if (!h.present) this.ratio = dist(4, 8) / size;
    if (h.pinching ? this.ratio > PINCH_OFF : this.ratio < PINCH_ON) h.pinching = !h.pinching;
    h.pinchAmount = Math.max(0, Math.min(1, (0.9 - this.ratio) / (0.9 - PINCH_ON)));
    // cursor between thumb and index tips: it barely moves when the fingers close
    h.x = this.fx.filter((px(4) + px(8)) / 2, dt);
    h.y = this.fy.filter((py(4) + py(8)) / 2, dt);
    h.points = pts;
    h.present = true;
  };
}

/** Maps video-normalized coords to stage pixels for a `object-fit: cover` video. */
export function coverMap(video: HTMLVideoElement, w: number, h: number) {
  const vw = video.videoWidth || w, vh = video.videoHeight || h;
  const s = Math.max(w / vw, h / vh);
  const dw = vw * s, dh = vh * s;
  const ox = (w - dw) / 2, oy = (h - dh) / 2;
  return (x: number, y: number): [number, number] => [ox + x * dw, oy + y * dh];
}

/** Hand bones for the skeleton overlay. */
export const HAND_BONES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];
