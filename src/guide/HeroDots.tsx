import { useEffect, useRef, type RefObject } from 'react'

/**
 * The hero's picture: the UMO wordmark drawn by points on a jittered grid over the whole box, the wordmark's points
 * bright, the background's dimmer, all twinkling, a wave breathing through their sizes. The pointer lights the points
 * round it, leaves a fading trail that brightens them as the wordmark's, and scatters them as it passes. A WebGL2
 * shader with the settings of Рой in the lab (lab/sky.html, as Denis set them on 2026-10-15), drawn at CSS pixels;
 * it runs only while some of the box is on screen, stands still with reduced motion, and leaves the box black
 * without WebGL2.
 */

const FRAG = `#version 300 es
precision highp float;
uniform vec2 R;          // the canvas, px
uniform float T;         // time, s
uniform float uWaveT;    // the wave's clock
uniform float uSeen;     // 0 until the pointer first moves over the page
uniform vec2 uPointer;   // the pointer, -1..1 over the canvas, y up
uniform vec3 uTrail[32]; // where it has just been and how many seconds ago, newest first
out vec4 o;

const float S = 9.;           // seed
const float DOTS = 250.;      // points per canvas height
const float SIZE = .5;        // a point's size, of its cell
const float BG = .5;          // the background points' brightness
const float HUE = 1.;         // the colour, as a place on the brand gradient
const float SAT = 1.;
const float JITTER = .75;     // how far the points stray off the grid
const float TWINKLE = 1.;
const float WAVE = 1.;
const float WAVE_W = 2.;
const float LIGHT = .5;       // the pointer's light
const float TRAIL = 1.;       // its trail
const float CHAOS = 2.;       // how far it scatters the points
const float RADIUS = 2.;      // how far all three reach

float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
// The brand gradient, black → maroon → red → peach (Figma 4667:3846)
vec3 pal(float t) {
  t = clamp(t, 0., 1.);
  vec3 c0 = vec3(0), c1 = vec3(46, 1, 1) / 255., c2 = vec3(128, 26, 0) / 255.,
       c3 = vec3(196, 49, 0) / 255., c4 = vec3(224, 112, 61) / 255., c5 = vec3(255, 205, 154) / 255.;
  if (t < .3) return mix(c0, c1, t / .3);
  if (t < .5) return mix(c1, c2, (t - .3) / .2);
  if (t < .65) return mix(c2, c3, (t - .5) / .15);
  if (t < .8) return mix(c3, c4, (t - .65) / .15);
  return mix(c4, c5, (t - .8) / .2);
}
// The wordmark as a distance field, in the units of umo-logo.svg (480×96, y down); radii: x bottom right,
// y top right, z bottom left, w top left
float box(vec2 p, vec2 c, vec2 b) { vec2 d = abs(p - c) - b; return length(max(d, 0.)) + min(max(d.x, d.y), 0.); }
float rbox(vec2 p, vec2 c, vec2 b, vec4 r) {
  p -= c;
  r.xy = p.x > 0. ? r.xy : r.zw;
  r.x = p.y > 0. ? r.x : r.y;
  vec2 q = abs(p) - b + r.x;
  return min(max(q.x, q.y), 0.) + length(max(q, 0.)) - r.x;
}
float logo(vec2 p) {
  float u = max(rbox(p, vec2(67.2, 48), vec2(67.2, 48), vec4(35, 0, 35, 0)), -box(p, vec2(67.2, 25.6), vec2(31.2, 35.6)));
  float m = max(rbox(p, vec2(182.4, 48), vec2(36, 48), vec4(0, 0, 0, 34.8)), -box(p, vec2(206.2, 72.4), vec2(23.8, 37.6)));
  m = min(m, box(p, vec2(236.4, 65.4), vec2(18, 30.6)));
  m = min(m, max(rbox(p, vec2(290.4, 48), vec2(36, 48), vec4(0, 36, 0, 0)), -box(p, vec2(267.4, 72.4), vec2(23, 37.6))));
  float o = max(rbox(p, vec2(409.2, 48), vec2(70.8, 48), vec4(36)), -box(p, vec2(409.2, 48), vec2(34.8, 13.2)));
  return min(u, min(m, o));
}

void main() {
  vec2 sp = (gl_FragCoord.xy - R * .5) / R.y;               // centred, y up, 1 = the canvas's height
  float cell = 1. / DOTS;
  vec2 gid = floor(sp / cell);
  vec2 c0 = (gid + .5) * cell;
  vec2 asp = vec2(R.x / R.y, 1.) * .5;
  float r = RADIUS * .1;
  vec2 pp = uPointer * asp;
  float lit = exp(-dot(c0 - pp, c0 - pp) / (r * r * 4.)) * uSeen;
  // The trail as segments, so it stays whole however fast the pointer moves
  float trail = 0.;
  for (int i = 0; i < 31; i++) {
    vec3 a = uTrail[i], b = uTrail[i + 1];
    if (b.z > 3.) break;
    vec2 pa = a.xy * asp, pb = b.xy * asp, ab = pb - pa;
    float f = clamp(dot(c0 - pa, ab) / max(dot(ab, ab), 1e-8), 0., 1.);
    float dt = length(c0 - pa - ab * f);
    trail = max(trail, exp(-dt * dt / (r * r)) * exp(-mix(a.z, b.z, f) * 1.6));
  }
  // Round the pointer and along its trail the points leave their places and shake
  float stir = CHAOS * max(lit, trail);
  vec2 shake = vec2(sin(T * 7. + h(gid + 1.) * 40.), cos(T * 6. + h(gid + 2.) * 40.)) * .5;
  vec2 jit = (vec2(h(gid + S), h(gid + S + 3.1)) - .5) * JITTER * .7;
  jit = clamp(jit + ((vec2(h(gid + S + 5.), h(gid + S + 9.)) - .5) * .8 + shake * .3) * stir, -.45, .45);
  vec2 home = (gid + .5 + jit) * cell;
  float dd = length(sp - home);
  // The wordmark: .72 of the width, no wider than 2.6 heights
  float k = 480. / min(R.x / R.y * .72, 2.6);
  float val = smoothstep(3., -3., logo(vec2(home.x, -home.y) * k + vec2(240, 48)));
  val = max(val, trail * TRAIL * .9);
  float tw = mix(1., .45 + .55 * sin(T * 3. + h(gid) * 30.), TWINKLE);
  float wave = 1. + WAVE * .45 * sin(length(home) * 9. / WAVE_W - uWaveT * 1.5);
  float rad = cell * .5 * SIZE * wave * (1. + TRAIL * trail * .4);
  float dotv = smoothstep(rad, rad * .55, dd) * mix(BG, 1., val) * tw * (1. + LIGHT * lit * 2.);
  float halo = exp(-dd / cell * 4.) * .35 * val * tw;
  vec3 c = pal(HUE - .1 + .1 * h(gid + 7.));
  c = clamp(mix(vec3(dot(c, vec3(.299, .587, .114))), c, SAT), 0., 1.);
  c *= dotv + halo;
  c += (h(gl_FragCoord.xy + fract(T * 7.) * 91.) - .5) * 1.5 / 255.;  // keeps the dark from banding
  o = vec4(c, 1);
}`

const WAVE_SPEED = 1.25

export default function HeroDots({ boxRef, bodyRef }: { boxRef: RefObject<HTMLElement | null>; bodyRef: RefObject<HTMLElement | null> }) {
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
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, '#version 300 es\nin vec2 p; void main() { gl_Position = vec4(p, 0, 1); }'))
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return
    gl.useProgram(prog)
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    const u = Object.fromEntries(['R', 'T', 'uWaveT', 'uSeen', 'uPointer', 'uTrail'].map((k) => [k, gl.getUniformLocation(prog, k)]))

    // The pointer over the canvas, -1..1, y up; its path one point every 25 ms, the newest kept on it
    const pointer = [0, 0]
    let seen = 0
    const trail: { x: number; y: number; t: number }[] = []
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      const x = ((e.clientX - r.left) / r.width) * 2 - 1
      const y = 1 - ((e.clientY - r.top) / r.height) * 2
      pointer[0] = x
      pointer[1] = y
      seen = 1
      const now = performance.now()
      if (!trail.length || now - trail[0].t > 25) {
        trail.unshift({ x, y, t: now })
        trail.length = Math.min(trail.length, 32)
      } else Object.assign(trail[0], { x, y })
    }
    window.addEventListener('pointermove', onMove, { passive: true })

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let t = 0, last = performance.now(), raf = 0
    const draw = (now: number) => {
      const dt = still ? 0 : Math.min(now - last, 100) / 1000
      last = now
      t += dt
      const w = canvas.clientWidth, h = canvas.clientHeight
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h }
      gl.viewport(0, 0, w, h)
      gl.uniform2f(u.R, w, h)
      gl.uniform1f(u.T, t + 3)
      gl.uniform1f(u.uWaveT, (t + 3) * WAVE_SPEED)
      gl.uniform1f(u.uSeen, seen)
      gl.uniform2f(u.uPointer, pointer[0], pointer[1])
      const tr = new Float32Array(96).fill(99)
      trail.forEach((p, i) => tr.set([p.x, p.y, (now - p.t) / 1000], i * 3))
      gl.uniform3fv(u.uTrail, tr)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    // Drawn only while some of the box is on screen: from lg the page slides over it, on a phone it scrolls away
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const box = boxRef.current?.getBoundingClientRect()
      const below = bodyRef.current?.getBoundingClientRect().top ?? Infinity
      if (box && Math.min(box.bottom, below) - Math.max(box.top, 0) > 0) draw(now)
      else last = now
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
    }
  }, [boxRef, bodyRef])
  return <canvas ref={canvasRef} aria-hidden className="block size-full bg-black" />
}
