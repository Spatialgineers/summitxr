/* Self-contained HTML for the two built-in sandboxes of the games hub.
   They run in an iframe with sandbox="allow-scripts" only (opaque origin), so
   they cannot touch the Summit page. The hub sets <html lang> to the visitor's
   language; each page reads it to pick its own Spanish or English labels. */

const SANDBOX_BASE_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; }
  body { background: #050505; color: #fff; font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace; overflow: hidden; }
  .cut { clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px); }
  .kicker { font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: #00DDFF; }
  h1 { font-size: 15px; letter-spacing: 0.12em; text-transform: uppercase; color: #FDCC0D; }
  button { font: inherit; font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; color: #FDCC0D; background: rgba(253, 204, 13, 0.06); border: 1px solid #FDCC0D; padding: 7px 12px; cursor: pointer; }
  button:hover, button[aria-pressed="true"] { background: #FDCC0D; color: #050505; }
  button:focus-visible, input:focus-visible { outline: 2px solid #00DDFF; outline-offset: 2px; }
  label { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #9aa4b2; }
  input[type=range] { width: 100%; accent-color: #FDCC0D; }
  .readout { text-transform: none; letter-spacing: 0; font-size: 12px; color: #00DDFF; font-variant-numeric: tabular-nums; }
`;

const LANG_JS = `
  var ES = (document.documentElement.lang || 'es').toLowerCase().indexOf('en') !== 0;
  function applyText(T) {
    document.querySelectorAll('[data-t]').forEach(function (n) { n.textContent = T[n.getAttribute('data-t')]; });
    document.querySelectorAll('[data-al]').forEach(function (n) { n.setAttribute('aria-label', T[n.getAttribute('data-al')]); });
  }
`;

/** A real GLSL fragment shader (WebGL) in SGX colors, with a measured FPS readout. */
export const SHADER_LAB_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>${SANDBOX_BASE_CSS}
  canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; touch-action: none; cursor: crosshair; }
  .hud { position: absolute; left: 12px; bottom: 12px; right: 12px; max-width: 420px; padding: 14px 16px; display: grid; gap: 10px;
    background: rgba(5, 5, 5, 0.82); box-shadow: inset 0 0 0 1px rgba(0, 221, 255, 0.45); }
  .row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
  .speed { display: grid; gap: 4px; }
  .fallback { position: absolute; inset: 0; display: none; place-items: center; padding: 24px; text-align: center; color: #9aa4b2; font-size: 13px; }
</style>
</head>
<body>
<canvas id="c" data-al="canvas"></canvas>
<p class="fallback" id="nogl" data-t="nogl"></p>
<div class="hud cut">
  <div>
    <p class="kicker" data-t="kicker"></p>
    <h1 data-t="title"></h1>
  </div>
  <div class="row" role="group" data-al="palette">
    <button type="button" data-pal="0" aria-pressed="true" data-t="cyan"></button>
    <button type="button" data-pal="1" aria-pressed="false" data-t="yellow"></button>
    <button type="button" data-pal="2" aria-pressed="false" data-t="amber"></button>
    <button type="button" id="pause" aria-pressed="false" data-t="pause"></button>
  </div>
  <div class="speed">
    <label for="speed"><span data-t="speed"></span> <span class="readout" id="speedv">1.0×</span></label>
    <input id="speed" type="range" min="0" max="2" step="0.1" value="1">
  </div>
  <p class="readout" id="stats" aria-live="off">…</p>
</div>
<script>
${LANG_JS}
  var T = ES ? {
    kicker: 'Fragment shader GLSL · WebGL', title: 'Campo SGX', cyan: 'Cian', yellow: 'Amarillo', amber: 'Ámbar',
    pause: 'Pausa', play: 'Seguir', speed: 'Velocidad', palette: 'Paleta de color',
    canvas: 'Shader animado: mueve el cursor o el dedo para deformar el campo',
    nogl: 'Tu navegador no tiene WebGL activo, así que el shader no puede correr aquí.', paused: 'en pausa'
  } : {
    kicker: 'GLSL fragment shader · WebGL', title: 'SGX field', cyan: 'Cyan', yellow: 'Yellow', amber: 'Amber',
    pause: 'Pause', play: 'Resume', speed: 'Speed', palette: 'Color palette',
    canvas: 'Animated shader: move the cursor or your finger to bend the field',
    nogl: 'WebGL is not available in this browser, so the shader cannot run here.', paused: 'paused'
  };
  applyText(T);

  var canvas = document.getElementById('c');
  var gl = canvas.getContext('webgl', { antialias: false, preserveDrawingBuffer: false });
  if (!gl) {
    document.getElementById('nogl').style.display = 'grid';
    document.getElementById('stats').textContent = 'WebGL —';
  } else {
    var VS = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
    var FS = [
      'precision mediump float;',
      'uniform vec2 u_res; uniform float u_time; uniform vec2 u_mouse; uniform vec3 u_a; uniform vec3 u_b;',
      'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
      'float noise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);',
      '  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y); }',
      'float fbm(vec2 p){ float v = 0.0; float a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; } return v; }',
      'void main(){',
      '  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;',
      '  vec2 m = (u_mouse - 0.5 * u_res) / u_res.y;',
      '  vec2 dm = uv - m; float d = length(dm);',
      '  vec2 q = uv * 2.2 + vec2(fbm(uv * 1.6 + u_time * 0.08), fbm(uv * 1.6 - u_time * 0.06));',
      '  q += 0.45 * exp(-d * 4.0) * dm / (d + 0.001);',
      '  float f = fbm(q * 1.8 + u_time * 0.05);',
      '  vec3 col = mix(vec3(0.02), vec3(0.196, 0.322, 0.482), smoothstep(0.25, 0.6, f));',
      '  col = mix(col, u_a, smoothstep(0.55, 0.75, f));',
      '  col = mix(col, u_b, 0.9 * smoothstep(0.74, 0.92, f));',
      '  vec2 g = abs(fract(uv * 8.0) - 0.5);',
      '  col += smoothstep(0.47, 0.5, max(g.x, g.y)) * 0.07 * u_a;',
      '  col += 0.22 * exp(-d * 9.0) * u_b;',
      '  col *= 1.0 - 0.3 * length(uv);',
      '  gl_FragColor = vec4(col, 1.0);',
      '}'
    ].join('\\n');
    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
    var prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var U = {};
    ['u_res', 'u_time', 'u_mouse', 'u_a', 'u_b'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });

    var PALETTES = [
      [[0, 0.867, 1], [0.992, 0.8, 0.051]],
      [[0.992, 0.8, 0.051], [0, 0.867, 1]],
      [[0.722, 0.439, 0], [0.992, 0.8, 0.051]]
    ];
    var pal = 0, speed = 1, t = 0, last = performance.now();
    var paused = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var mouse = [0, 0];
    function resize() {
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      mouse = [canvas.width * 0.62, canvas.height * 0.55];
    }
    window.addEventListener('resize', resize);
    resize();
    canvas.addEventListener('pointermove', function (e) {
      var r = canvas.getBoundingClientRect();
      mouse = [(e.clientX - r.left) * dpr, (r.bottom - e.clientY) * dpr];
    });

    var pauseBtn = document.getElementById('pause');
    function syncPause() { pauseBtn.textContent = paused ? T.play : T.pause; pauseBtn.setAttribute('aria-pressed', String(paused)); }
    syncPause();
    pauseBtn.addEventListener('click', function () { paused = !paused; syncPause(); });
    document.querySelectorAll('[data-pal]').forEach(function (b) {
      b.addEventListener('click', function () {
        pal = Number(b.getAttribute('data-pal'));
        document.querySelectorAll('[data-pal]').forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
      });
    });
    var speedIn = document.getElementById('speed');
    speedIn.addEventListener('input', function () { speed = Number(speedIn.value); document.getElementById('speedv').textContent = speed.toFixed(1) + '×'; });

    var frames = 0, windowStart = performance.now(), stats = document.getElementById('stats');
    function frame(now) {
      var dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (!paused) t += dt * speed;
      gl.uniform2f(U.u_res, canvas.width, canvas.height);
      gl.uniform1f(U.u_time, t);
      gl.uniform2f(U.u_mouse, mouse[0], mouse[1]);
      gl.uniform3fv(U.u_a, PALETTES[pal][0]);
      gl.uniform3fv(U.u_b, PALETTES[pal][1]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      frames++;
      if (now - windowStart >= 500) {
        var fps = Math.round(frames * 1000 / (now - windowStart));
        stats.textContent = 'FPS ' + fps + ' · ' + canvas.width + '×' + canvas.height + ' px' + (paused ? ' · ' + T.paused : '');
        frames = 0; windowStart = now;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
</script>
</body>
</html>`;

/** Web Audio synth: oscillator → envelope → real low-pass BiquadFilter → AnalyserNode (oscilloscope + spectrum). */
export const SYNTH_LAB_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>${SANDBOX_BASE_CSS}
  body { display: grid; place-items: center; padding: 12px; overflow-y: auto;
    background: radial-gradient(80% 70% at 50% 30%, rgba(50, 82, 123, 0.35), #050505 70%); }
  .panel { width: 100%; max-width: 640px; padding: 16px; display: grid; gap: 12px;
    background: rgba(18, 20, 24, 0.92); box-shadow: inset 0 0 0 1px rgba(0, 221, 255, 0.45); }
  .head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: end; gap: 8px; }
  .led { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #888; margin-right: 6px; vertical-align: middle; }
  .led.on { background: #00DDFF; box-shadow: 0 0 6px #00DDFF; }
  canvas { width: 100%; height: 130px; display: block; background: #050505; box-shadow: inset 0 0 0 1px rgba(50, 82, 123, 0.8); }
  .row { display: flex; flex-wrap: wrap; gap: 6px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .grid2 > div { display: grid; gap: 4px; }
  .keys { display: grid; grid-template-columns: repeat(8, 1fr); gap: 4px; }
  .key { padding: 18px 0 8px; display: grid; gap: 4px; justify-items: center; color: #00DDFF; border-color: #00DDFF; background: rgba(0, 221, 255, 0.05); touch-action: none; user-select: none; -webkit-user-select: none; }
  .key small { font-size: 10px; color: #9aa4b2; }
  .key.down, .key:hover { background: #00DDFF; color: #050505; }
  .key.down small, .key:hover small { color: #050505; }
  .hint { font-size: 11px; color: #9aa4b2; }
  @media (max-width: 420px) { .grid2 { grid-template-columns: 1fr; } .panel { padding: 12px; } }
</style>
</head>
<body>
<div class="panel cut">
  <div class="head">
    <div>
      <p class="kicker" data-t="kicker"></p>
      <h1 data-t="title"></h1>
    </div>
    <p class="readout"><span class="led" id="led"></span><span id="state"></span></p>
  </div>
  <canvas id="scope" data-al="scope"></canvas>
  <div class="row" role="group" data-al="wave">
    <button type="button" data-w="sine" aria-pressed="false" data-t="sine"></button>
    <button type="button" data-w="square" aria-pressed="false" data-t="square"></button>
    <button type="button" data-w="sawtooth" aria-pressed="true" data-t="saw"></button>
    <button type="button" data-w="triangle" aria-pressed="false" data-t="tri"></button>
  </div>
  <div class="grid2">
    <div>
      <label for="cut"><span data-t="cutoff"></span> <span class="readout" id="cutv"></span></label>
      <input id="cut" type="range" min="0" max="1" step="0.001" value="0.55">
    </div>
    <div>
      <label for="q"><span data-t="res"></span> <span class="readout" id="qv"></span></label>
      <input id="q" type="range" min="0.1" max="18" step="0.1" value="4">
    </div>
  </div>
  <div class="keys" id="keys"></div>
  <p class="hint" data-t="hint"></p>
</div>
<script>
${LANG_JS}
  var T = ES ? {
    kicker: 'Web Audio · filtro paso bajo', title: 'Sintetizador SGX', sine: 'Seno', square: 'Cuadrada', saw: 'Sierra', tri: 'Triángulo',
    cutoff: 'Corte', res: 'Resonancia', wave: 'Forma de onda', scope: 'Osciloscopio: dibuja la señal que suena',
    hint: 'Toca las teclas o usa A S D F G H J K. El osciloscopio y el espectro leen la señal real después del filtro.',
    idle: 'Audio en espera: toca una tecla', live: 'Audio activo', voices: 'voces'
  } : {
    kicker: 'Web Audio · low-pass filter', title: 'SGX synth', sine: 'Sine', square: 'Square', saw: 'Saw', tri: 'Triangle',
    cutoff: 'Cutoff', res: 'Resonance', wave: 'Waveform', scope: 'Oscilloscope: draws the signal you hear',
    hint: 'Tap the keys or use A S D F G H J K. The oscilloscope and spectrum read the real signal after the filter.',
    idle: 'Audio idle: play a key', live: 'Audio on', voices: 'voices'
  };
  applyText(T);

  var NOTES = [['C4', 261.63, 'A'], ['D4', 293.66, 'S'], ['E4', 329.63, 'D'], ['F4', 349.23, 'F'], ['G4', 392.0, 'G'], ['A4', 440.0, 'H'], ['B4', 493.88, 'J'], ['C5', 523.25, 'K']];
  var keysEl = document.getElementById('keys');
  NOTES.forEach(function (n, i) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'key'; b.dataset.i = String(i);
    b.innerHTML = n[0] + '<small>' + n[2] + '</small>';
    b.setAttribute('aria-label', n[0] + ' (' + n[2] + ')');
    keysEl.appendChild(b);
  });

  var ctx = null, filter, analyser, master, wave = 'sawtooth';
  var voices = {};
  var cutIn = document.getElementById('cut'), qIn = document.getElementById('q');
  function cutoffHz() { return Math.round(80 * Math.pow(100, Number(cutIn.value))); }
  function syncReadouts() {
    document.getElementById('cutv').textContent = cutoffHz() + ' Hz';
    document.getElementById('qv').textContent = 'Q ' + Number(qIn.value).toFixed(1);
    var live = ctx && ctx.state === 'running';
    var n = Object.keys(voices).length;
    document.getElementById('led').className = 'led' + (live ? ' on' : '');
    document.getElementById('state').textContent = live ? T.live + ' · ' + n + ' ' + T.voices : T.idle;
  }
  function ensureAudio() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      master = ctx.createGain();
      master.gain.value = 0.22;
      filter.connect(analyser); analyser.connect(master); master.connect(ctx.destination);
      applyFilter();
      ctx.onstatechange = syncReadouts;
    }
    if (ctx.state === 'suspended') ctx.resume();
  }
  function applyFilter() {
    if (!filter) return;
    filter.frequency.setTargetAtTime(cutoffHz(), ctx.currentTime, 0.02);
    filter.Q.setTargetAtTime(Number(qIn.value), ctx.currentTime, 0.02);
  }
  cutIn.addEventListener('input', function () { applyFilter(); syncReadouts(); });
  qIn.addEventListener('input', function () { applyFilter(); syncReadouts(); });

  function noteOn(i) {
    ensureAudio();
    if (voices[i]) return;
    var osc = ctx.createOscillator(), env = ctx.createGain(), now = ctx.currentTime;
    osc.type = wave; osc.frequency.value = NOTES[i][1];
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.9, now + 0.012);
    env.gain.setTargetAtTime(0.6, now + 0.012, 0.15);
    osc.connect(env); env.connect(filter); osc.start();
    voices[i] = { osc: osc, env: env };
    keysEl.children[i].classList.add('down');
    syncReadouts();
  }
  function noteOff(i) {
    var v = voices[i]; if (!v) return;
    var now = ctx.currentTime;
    v.env.gain.cancelScheduledValues(now);
    v.env.gain.setValueAtTime(v.env.gain.value, now);
    v.env.gain.setTargetAtTime(0, now, 0.08);
    v.osc.stop(now + 0.6);
    delete voices[i];
    keysEl.children[i].classList.remove('down');
    syncReadouts();
  }
  keysEl.addEventListener('pointerdown', function (e) {
    var k = e.target.closest('.key'); if (!k) return;
    e.preventDefault(); k.setPointerCapture(e.pointerId); noteOn(Number(k.dataset.i));
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (ev) {
    keysEl.addEventListener(ev, function (e) { var k = e.target.closest('.key'); if (k) noteOff(Number(k.dataset.i)); });
  });
  keysEl.addEventListener('keydown', function (e) {
    var k = e.target.closest('.key'); if (!k || e.repeat || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault(); noteOn(Number(k.dataset.i));
  });
  keysEl.addEventListener('keyup', function (e) { var k = e.target.closest('.key'); if (k && (e.key === 'Enter' || e.key === ' ')) noteOff(Number(k.dataset.i)); });
  var LETTERS = NOTES.map(function (n) { return n[2]; });
  window.addEventListener('keydown', function (e) {
    if (e.repeat || e.target.tagName === 'INPUT') return;
    var i = LETTERS.indexOf(e.key.toUpperCase()); if (i >= 0) noteOn(i);
  });
  window.addEventListener('keyup', function (e) { var i = LETTERS.indexOf(e.key.toUpperCase()); if (i >= 0) noteOff(i); });
  window.addEventListener('blur', function () { Object.keys(voices).forEach(function (i) { noteOff(Number(i)); }); });

  document.querySelectorAll('[data-w]').forEach(function (b) {
    b.addEventListener('click', function () {
      wave = b.getAttribute('data-w');
      document.querySelectorAll('[data-w]').forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
      Object.keys(voices).forEach(function (i) { voices[i].osc.type = wave; });
    });
  });

  var scope = document.getElementById('scope'), g = scope.getContext('2d');
  var timeBuf = new Float32Array(2048), freqBuf = new Uint8Array(1024);
  function draw() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.round(scope.clientWidth * dpr), h = Math.round(scope.clientHeight * dpr);
    if (scope.width !== w || scope.height !== h) { scope.width = w; scope.height = h; }
    g.fillStyle = '#050505'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(50, 82, 123, 0.6)'; g.lineWidth = 1;
    for (var x = 0; x <= 8; x++) { g.beginPath(); g.moveTo(x * w / 8, 0); g.lineTo(x * w / 8, h); g.stroke(); }
    g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
    if (analyser) {
      analyser.getByteFrequencyData(freqBuf);
      g.fillStyle = 'rgba(253, 204, 13, 0.28)';
      var bins = 96, bw = w / bins;
      for (var b = 0; b < bins; b++) { var v = freqBuf[Math.floor(Math.pow(b / bins, 2) * 700)] / 255; g.fillRect(b * bw, h - v * h, bw - 1, v * h); }
      analyser.getFloatTimeDomainData(timeBuf);
    } else timeBuf.fill(0);
    g.strokeStyle = '#00DDFF'; g.lineWidth = 2 * dpr / 1.5; g.beginPath();
    var start = 0;
    for (var s = 1; s < 1024; s++) { if (timeBuf[s - 1] < 0 && timeBuf[s] >= 0) { start = s; break; } }
    for (var p = 0; p < 1024; p++) {
      var y = h / 2 - timeBuf[start + p] * h * 0.45, px = p / 1023 * w;
      if (p === 0) g.moveTo(px, y); else g.lineTo(px, y);
    }
    g.stroke();
    requestAnimationFrame(draw);
  }
  syncReadouts();
  requestAnimationFrame(draw);
</script>
</body>
</html>`;
