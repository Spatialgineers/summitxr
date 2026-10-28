import React, { useEffect, useRef } from 'react';

/* A minimal full-screen-triangle WebGL2 canvas for one fragment shader.
   Uniforms always available: uTime (s), uRes (px), uMouse (0..1),
   uProgress (0..1 over `duration`, if given) plus any `uniforms` passed in.
   GPU-safe defaults: DPR capped, pauses when the tab is hidden, cleans up
   its context, and renders nothing (calls onUnsupported) without WebGL2. */

type U = number | [number, number] | [number, number, number] | [number, number, number, number];

interface Props {
  fragment: string;
  /** static values, or a function read every frame */
  uniforms?: Record<string, U> | (() => Record<string, U>);
  className?: string;
  style?: React.CSSProperties;
  /** ms; uProgress goes 0→1 and onDone fires at the end */
  duration?: number;
  onDone?: () => void;
  onUnsupported?: () => void;
  /** cap the frame rate for ambient backgrounds */
  fps?: number;
  maxDpr?: number;
  /** track the pointer over the window */
  pointer?: boolean;
}

const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

export type ShaderUniform = U;

export const ShaderCanvas: React.FC<Props> = ({ fragment, uniforms, className, style, duration, onDone, onUnsupported, fps = 60, maxDpr = 1.5, pointer = false }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const uniRef = useRef(uniforms);
  uniRef.current = uniforms;
  const cb = useRef({ onDone, onUnsupported });
  cb.current = { onDone, onUnsupported };

  useEffect(() => {
    const canvas = ref.current;
    const gl = canvas?.getContext('webgl2', { premultipliedAlpha: true, alpha: true, antialias: false, powerPreference: 'low-power' });
    if (!canvas || !gl || gl.isContextLost()) { cb.current.onUnsupported?.(); return; }

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.warn('[SGX shader]', gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, fragment);
    if (!vs || !fs) { cb.current.onUnsupported?.(); return; }
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs); gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.warn('[SGX shader]', gl.getProgramInfoLog(prog)); cb.current.onUnsupported?.(); return; }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const locs = new Map<string, WebGLUniformLocation | null>();
    const uloc = (n: string) => { if (!locs.has(n)) locs.set(n, gl.getUniformLocation(prog, n)); return locs.get(n)!; };
    const set = (n: string, v: U) => {
      const l = uloc(n); if (!l) return;
      if (typeof v === 'number') gl.uniform1f(l, v);
      else if (v.length === 2) gl.uniform2f(l, v[0], v[1]);
      else if (v.length === 3) gl.uniform3f(l, v[0], v[1], v[2]);
      else gl.uniform4f(l, v[0], v[1], v[2], v[3]);
    };

    let w = 0, h = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      const r = canvas.getBoundingClientRect();
      w = Math.max(1, Math.round(r.width * dpr)); h = Math.max(1, Math.round(r.height * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, w, h);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const mouse: [number, number] = [0.5, 0.5];
    const onMove = (e: PointerEvent) => { mouse[0] = e.clientX / window.innerWidth; mouse[1] = 1 - e.clientY / window.innerHeight; };
    if (pointer) window.addEventListener('pointermove', onMove, { passive: true });

    const start = performance.now();
    const minDt = 1000 / fps;
    let last = 0, raf = 0, done = false;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (document.hidden || now - last < minDt - 1) return;
      last = now;
      const t = (now - start) / 1000;
      set('uTime', t);
      set('uRes', [w, h]);
      set('uMouse', mouse);
      if (duration) {
        const p = Math.min(1, (now - start) / duration);
        set('uProgress', p);
        if (p >= 1 && !done) { done = true; cb.current.onDone?.(); }
      }
      const u = uniRef.current;
      const extra = typeof u === 'function' ? u() : u;
      if (extra) for (const k in extra) set(k, extra[k]);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      if (pointer) window.removeEventListener('pointermove', onMove);
      gl.deleteBuffer(buf); gl.deleteProgram(prog); gl.deleteShader(vs); gl.deleteShader(fs);
      // Free the context once the canvas is really gone (StrictMode remounts reuse it).
      window.setTimeout(() => { if (!canvas.isConnected) gl.getExtension('WEBGL_lose_context')?.loseContext(); }, 0);
    };
    // the program is built once per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fragment]);

  return <canvas ref={ref} className={className} style={{ display: 'block', width: '100%', height: '100%', ...style }} aria-hidden="true" />;
};

/** Effects respect reduced motion and the lite mode switch. */
export function canRunShaders(): boolean {
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    if (localStorage.getItem('sgx_lite_mode') === 'true') return false;
  } catch { /* ignore */ }
  return true;
}

export default ShaderCanvas;
