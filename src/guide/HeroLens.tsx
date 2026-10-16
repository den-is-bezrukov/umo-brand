import { useEffect, useRef, type RefObject } from 'react'

/**
 * The hero's picture: the black UMO wordmark on white through Figma's «Lens distortion» effect (Figma 5204:5248), a
 * white layer in Difference over it, so white letters with a spectral fringe on black, over a soft glow round the
 * lens's centre. The centre follows the pointer half way, easing after it, and goes back to the middle when it
 * leaves. The lab's shader (lab/lens.html) with the settings Denis kept there on 2026-10-16: Distortion .25,
 * Aberration 3, Lateral, High, the edge stretched, Разрешение .5, Влияние and По вертикали .5, Плавность .75, Фон
 * Свечение at 1, Размер .75, Каналы 188°, Оттенок 0. Drawn only when the centre moves or the box changes size and
 * some of it is on screen; with reduced motion the centre stays in the middle; without WebGL2 the box stays black.
 */

const FRAG = `#version 300 es
precision highp float;
uniform vec2 dims;          // canvas size, px
uniform vec2 centre;        // px
uniform float radius;       // half-diagonal, px
uniform vec3 split;         // each channel's place in the glow (Каналы)
uniform sampler2D inputTex;
in vec2 uv;
out vec4 o;

const float AMOUNT = .25;   // Distortion
const float CHROMA = 3.;    // Aberration
const int TAPS = 64;        // the effect's kernel at High and this Aberration
const float INV = 1. / 63.;
const float WEIGHTS = 31.4920635;  // the kernel's weights summed
const float GLOW = .05 + .75 * .75 * .8;  // Размер фона .75
const vec2 JITTER[4] = vec2[4](vec2(0.), vec2(.5, -.333333), vec2(-.25, .333333), vec2(.25, -.111111));
const float SPREAD = 1.4;

vec4 at(vec2 p, float a) {
  vec2 c = p - centre, n = c / radius;
  float d2 = dot(n, n);
  return textureLod(inputTex, clamp((c * (1. + a * (d2 + d2 * d2)) + centre) / dims, 0., 1.), 0.);
}

void main() {
  vec2 local = uv * dims;
  float chroma = (1. + AMOUNT) * CHROMA;
  vec3 acc = vec3(0.);
  for (int j = 0; j < 4; j++) {
    vec2 tap = local + JITTER[j] * SPREAD;
    for (int i = 0; i < TAPS; i++) {
      float fi = float(i) * INV - .5;
      float w = 1. - abs(fi * 2.);
      acc += vec3(at(tap, AMOUNT + (fi + .5) * chroma).r, at(tap, AMOUNT + fi * chroma).g, at(tap, AMOUNT + (fi - .5) * chroma).b) * w;
    }
  }
  // The white Difference layer over the effect on white: the picture is opaque, so 1 - colour
  vec3 d = 1. - acc / (4. * WEIGHTS);
  // Свечение round the centre, warm inside, cool outside, each channel at its own radius, screened under the letters
  vec2 q = (local - centre) / radius;
  vec3 r2 = dot(q, q) / (GLOW * (1. + split * .6));
  vec3 back = mix(vec3(.55, .2, .5), vec3(.08, .15, .6), clamp(sqrt(r2), 0., 1.)) * exp(-r2);
  o = vec4(1. - (1. - d) * (1. - clamp(back, 0., 1.)), 1.);
}`

// The wordmark (Figma 5204:5250), cut to its own 2000×400 box
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="400" viewBox="0 300 2000 400"><path d="M910.003 445H759.994V700H610V444.478C610 341.851 658.732 300 759.994 300H910.003V445ZM1209.99 300C1311.22 300 1360 341.791 1360 444.478V700H1209.99V445H1060V700H910.003V445H1060V300H1209.99Z"/><path d="M410 555H150V300H0V555.522C0 658.209 48.8349 700 150.125 700H409.86C511.225 700 560 658.149 560 555.522V300H410V555Z"/><path fill-rule="evenodd" d="M1849.89 300C1951.18 300 2000 341.791 2000 444.478V555.522C2000 658.149 1951.24 700 1849.89 700H1560.13C1458.82 700 1410 658.209 1410 555.522V444.478C1410 341.851 1458.82 300 1560.13 300H1849.89ZM1560 555H1850V444.478L1560 445V555Z"/></svg>`

const RES = .5        // Разрешение: the share of the screen's pixels (up to 2×) it's computed at
const INFLUENCE = .5  // how far from the middle towards the pointer the centre goes
const VERTICAL = .5   // the same, scaled, for y
const EASE = .75      // the share of the way left the centre covers each frame
const SHIFT = 188     // Каналы, degrees

export default function HeroLens({ boxRef, bodyRef }: { boxRef: RefObject<HTMLElement | null>; bodyRef: RefObject<HTMLElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    const gl = canvas?.getContext('webgl2', { antialias: false, alpha: false })
    if (!canvas || !gl) return
    const shader = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      return s
    }
    const prog = gl.createProgram()
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, '#version 300 es\nin vec2 p; out vec2 uv; void main() { uv = vec2(p.x * .5 + .5, .5 - p.y * .5); gl_Position = vec4(p, 0, 1); }'))
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return
    gl.useProgram(prog)
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    const u = Object.fromEntries(['dims', 'centre', 'radius', 'split'].map((k) => [k, gl.getUniformLocation(prog, k)]))
    // Каналы: the three channels' places a third of a circle apart, turned by SHIFT
    const sh = (SHIFT * Math.PI) / 180, A = 0.5 / Math.sin(Math.PI / 3)
    gl.uniform3f(u.split, ...([0, 1, 2].map((c) => A * Math.sin(sh + ((2 - 2 * c) * Math.PI) / 3)) as [number, number, number]))

    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    const img = new Image()
    img.src = 'data:image/svg+xml,' + encodeURIComponent(SVG)
    const off = document.createElement('canvas')

    const shown = () => {
      const box = boxRef.current?.getBoundingClientRect()
      const below = bodyRef.current?.getBoundingClientRect().top ?? Infinity
      return !!box && Math.min(box.bottom, below) - Math.max(box.top, 0) > 0
    }
    let cx = 0.5, cy = 0.5, px = 0.5, py = 0.5, raf = 0, stale = true
    const draw = () => {
      if (!img.complete || !img.naturalWidth) return
      if (!shown()) { stale = true; return }
      stale = false
      const dpr = Math.min(devicePixelRatio, 2) * RES
      const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr)
      if (!w || !h) return
      if (off.width !== w || off.height !== h) {
        canvas.width = off.width = w
        canvas.height = off.height = h
        // On white, across the width inside the guide's page margins (16px, 24 from 768px), centred
        const m = (innerWidth >= 768 ? 24 : 16) * dpr
        const ctx = off.getContext('2d')!, lw = w - 2 * m, lh = lw / 5
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, w, h)
        ctx.drawImage(img, (w - lw) / 2, (h - lh) / 2, lw, lh)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, off)
      }
      gl.viewport(0, 0, w, h)
      gl.uniform2f(u.dims, w, h)
      gl.uniform2f(u.centre, cx * w, cy * h)
      gl.uniform1f(u.radius, Math.hypot(w, h) / 2)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    const tick = () => {
      const tx = 0.5 + (px - 0.5) * INFLUENCE, ty = 0.5 + (py - 0.5) * INFLUENCE * VERTICAL
      cx += (tx - cx) * EASE
      cy += (ty - cy) * EASE
      if (Math.abs(tx - cx) + Math.abs(ty - cy) < 1e-4) { cx = tx; cy = ty; raf = 0 } else raf = requestAnimationFrame(tick)
      draw()
    }
    const aim = (x: number, y: number) => {
      px = x
      py = y
      if (!raf) raf = requestAnimationFrame(tick)
    }
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      aim(Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1), Math.min(Math.max((e.clientY - r.top) / r.height, 0), 1))
    }
    const onLeave = () => aim(0.5, 0.5)
    if (!still) {
      window.addEventListener('pointermove', onMove, { passive: true })
      document.documentElement.addEventListener('pointerleave', onLeave)
    }
    // Redrawn when the box changes size, and on a scroll only when it was skipped while off screen
    const redraw = () => { if (!raf) raf = requestAnimationFrame(tick) }
    const onScroll = () => { if (stale) redraw() }
    const observer = new ResizeObserver(redraw)
    observer.observe(canvas)
    img.onload = redraw
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('scroll', onScroll)
      document.documentElement.removeEventListener('pointerleave', onLeave)
    }
  }, [boxRef, bodyRef])
  return <canvas ref={canvasRef} aria-hidden className="block size-full bg-black" />
}
