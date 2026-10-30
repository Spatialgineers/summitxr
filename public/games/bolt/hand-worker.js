/* Rayo en tus manos: on-device hand tracking worker (classic worker).
   Loads @mediapipe/tasks-vision (Apache-2.0) and the HandLandmarker model
   only when the game asks for the camera. Frames arrive as ImageBitmaps and
   never leave this device: only 21 landmarks go back to the page. */

const VERSION = '1.1.1';
const CDN = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}`;
const MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

let landmarker = null;

async function create(delegate) {
  const fileset = await self.Vision.FilesetResolver.forVisionTasks(`${CDN}/wasm`);
  return self.Vision.HandLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL, delegate },
    runningMode: 'VIDEO',
    numHands: 1,
    minHandDetectionConfidence: 0.5,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
}

async function init() {
  try {
    importScripts(`${CDN}/vision_bundle.js`);
    try {
      landmarker = await create('GPU');
    } catch {
      landmarker = await create('CPU');
    }
    self.postMessage({ type: 'ready' });
  } catch (err) {
    self.postMessage({ type: 'error', message: String((err && err.message) || err) });
  }
}

let lastTs = 0;

self.onmessage = (e) => {
  const msg = e.data;
  if (msg.type === 'init') { init(); return; }
  if (msg.type !== 'frame') return;
  const bitmap = msg.bitmap;
  if (!landmarker) { bitmap.close(); self.postMessage({ type: 'hand', points: null }); return; }
  // timestamps must grow strictly in VIDEO mode
  const ts = Math.max(lastTs + 1, Math.round(msg.ts));
  lastTs = ts;
  let points = null;
  try {
    const res = landmarker.detectForVideo(bitmap, ts);
    const hand = res.landmarks && res.landmarks[0];
    if (hand) {
      points = new Float32Array(hand.length * 3);
      hand.forEach((p, i) => { points[i * 3] = p.x; points[i * 3 + 1] = p.y; points[i * 3 + 2] = p.z; });
    }
  } catch {
    points = null;
  }
  bitmap.close();
  if (points) self.postMessage({ type: 'hand', points }, [points.buffer]);
  else self.postMessage({ type: 'hand', points: null });
};
