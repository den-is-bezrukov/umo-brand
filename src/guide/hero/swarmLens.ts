/**
 * Рой в линзе: Рой's points and colours (HeroDots) drawing the UMO wordmark as the lens (Figma 5204:5248, HeroLens)
 * bends it. Each point lights where any of the aberration's three wordmarks falls and takes the brand gradient by how
 * far they agree (peach in the letters, redder on the fringe); Радуга mixes in the lens's own colours. The lens's
 * centre eases after the pointer; Рой's light, trail and scatter stay round it.
 *
 * One source for the guide's first screen (HeroSwarmLens.tsx, its settings in ../hero.json) and the lab
 * (lab/swarm-lens.html, the same picture with its sliders, whose «В гайд» writes hero.json on the dev server).
 */

export const FRAG = `#version 300 es
precision highp float;
uniform vec2 R;          // the canvas, px
uniform float T;         // time, s
uniform float uWaveT;    // the wave's clock
uniform float uSeen;     // 0 until the pointer first moves over the page
uniform vec2 uPointer;   // the pointer, -1..1 over the canvas, y up
uniform vec3 uTrail[32]; // where it has just been and how many seconds ago, newest first
uniform vec2 uCentre;    // the lens's centre, 0..1 over the canvas, y down, eased
uniform float uVh;       // the window's height in canvas heights: Точек count per window height, so the points
                         // are the same size in the lab's full-screen canvas and the guide's shorter box
// Рой
uniform float DOTS, SIZE, BG, JITTER, TWINKLE, WAVE, WAVE_W, LIGHT, TRAIL, CHAOS, RADIUS;
// The lens
uniform float DIST, ABER, TAPS, RAINBOW, WIDTH;
uniform float EDGE;      // past the picture's edge: 0 nothing, 1 mirrored, 2 the edge stretched (as lens.html)
out vec4 o;

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
// The wordmark as a distance field, in the units of umo-logo.svg (480×96, y down)
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
  float cell = uVh / DOTS;
  vec2 gid = floor(sp / cell);
  vec2 c0 = (gid + .5) * cell;
  vec2 asp = vec2(R.x / R.y, 1.) * .5;
  float r = RADIUS * .1;
  vec2 pp = uPointer * asp;
  float lit = exp(-dot(c0 - pp, c0 - pp) / (r * r * 4.)) * uSeen;
  float trail = 0.;
  for (int i = 0; i < 31; i++) {
    vec3 a = uTrail[i], b = uTrail[i + 1];
    if (b.z > 3.) break;
    vec2 pa = a.xy * asp, pb = b.xy * asp, ab = pb - pa;
    float f = clamp(dot(c0 - pa, ab) / max(dot(ab, ab), 1e-8), 0., 1.);
    float dt = length(c0 - pa - ab * f);
    trail = max(trail, exp(-dt * dt / (r * r)) * exp(-mix(a.z, b.z, f) * 1.6));
  }
  float stir = CHAOS * max(lit, trail);
  vec2 shake = vec2(sin(T * 7. + h(gid + 1.) * 40.), cos(T * 6. + h(gid + 2.) * 40.)) * .5;
  vec2 jit = (vec2(h(gid + 9.), h(gid + 12.1)) - .5) * JITTER * .7;
  jit = clamp(jit + ((vec2(h(gid + 14.), h(gid + 18.)) - .5) * .8 + shake * .3) * stir, -.45, .45);
  vec2 home = (gid + .5 + jit) * cell;
  float dd = length(sp - home);

  // The lens: where the wordmark is after the distortion, for each of the split's three amounts, averaged over
  // the kernel as the effect does (a tent of TAPS samples). Its centre and radius in the same units as sp
  vec2 centre = vec2((uCentre.x - .5) * R.x / R.y, .5 - uCentre.y);
  float radius = length(asp);
  vec2 c = home - centre, n = c / radius;
  float d2 = dot(n, n), bend = d2 + d2 * d2;
  float k = 480. / (R.x / R.y * WIDTH);   // the wordmark across WIDTH of the canvas
  float chroma = (1. + abs(DIST)) * ABER;
  vec3 v = vec3(0.);
  float wsum = 0.;
  int taps = int(TAPS);
  for (int i = 0; i < 16; i++) {
    if (i >= taps) break;
    float fi = taps > 1 ? float(i) / float(taps - 1) - .5 : 0.;
    float w = 1. - abs(fi * 2.) + .001;
    vec3 a = DIST + (fi + vec3(.5, 0., -.5)) * chroma;
    for (int ch = 0; ch < 3; ch++) {
      vec2 q = c * (1. + a[ch] * bend) + centre;
      // Where the lens reaches past the canvas: nothing there, the picture mirrored, or its edge stretched
      vec2 t = vec2(q.x / (2. * asp.x) + .5, .5 - q.y);
      if (EDGE > 1.5) t = clamp(t, 0., 1.);
      else if (EDGE > .5) t = 1. - abs(mod(t, 2.) - 1.);
      else if (t.x < 0. || t.x > 1. || t.y < 0. || t.y > 1.) continue;
      q = vec2((t.x - .5) * 2. * asp.x, .5 - t.y);
      v[ch] += w * smoothstep(3., -3., logo(vec2(q.x, -q.y) * k + vec2(240, 48)));
    }
    wsum += w;
  }
  v /= wsum;
  // Lit by any of the three, coloured by how far they agree
  float top = max(v.r, max(v.g, v.b)), cov = (v.r + v.g + v.b) / 3.;
  float agree = cov / max(top, .001);
  float val = max(top, trail * TRAIL * .9);

  float tw = mix(1., .45 + .55 * sin(T * 3. + h(gid) * 30.), TWINKLE);
  float wave = 1. + WAVE * .45 * sin(length(home) * 9. / WAVE_W - uWaveT * 1.5);
  float rad = cell * .5 * SIZE * wave * (1. + TRAIL * trail * .4);
  float dotv = smoothstep(rad, rad * .55, dd) * mix(BG, 1., val) * tw * (1. + LIGHT * lit * 2.);
  float halo = exp(-dd / cell * 4.) * .35 * val * tw;
  // Рой's colour: peach where all three agree, down the brand gradient towards red on the fringe
  vec3 col = pal(mix(.6, 1., agree) - .1 + .1 * h(gid + 7.));
  // Радуга: the lens's own colours, where the channels part
  vec3 rgb = mix(col, v / max(top, .001), smoothstep(0., .5, top - min(v.r, min(v.g, v.b))));
  col = mix(col, rgb, RAINBOW);
  col *= dotv + halo;
  col += (h(gl_FragCoord.xy + fract(T * 7.) * 91.) - .5) * 1.5 / 255.;
  o = vec4(col, 1);
}
`

/** [id, label, min, max, step, default, the names of a list's choices]: ids in capitals are the shader's uniforms, the rest the script's */
export type Control = readonly [string, string, number, number, number, number, (readonly string[])?]
export const GROUPS: readonly (readonly Control[])[] = [
  [
    ['DOTS', 'Точек', 60, 400, 1, 250],
    ['SIZE', 'Размер', 0.1, 1, 0.01, 0.5],
    ['BG', 'Фон', 0, 1, 0.01, 0.5],
    ['JITTER', 'Разброс', 0, 1, 0.01, 0.75],
    ['TWINKLE', 'Мерцание', 0, 1, 0.01, 1],
    ['WAVE', 'Волна', 0, 2, 0.01, 1],
    ['WAVE_W', 'Длина волны', 0.5, 4, 0.01, 2],
  ],
  [
    ['DIST', 'Distortion', -1, 2, 0.01, 0.25],
    ['ABER', 'Aberration', 0, 3, 0.01, 3],
    ['TAPS', 'Отсчёты', 1, 16, 1, 8],
    ['WIDTH', 'Ширина лого', 0.3, 1, 0.01, 0.9],
    ['RAINBOW', 'Радуга', 0, 1, 0.01, 0],
    ['EDGE', 'За краем', 0, 2, 1, 0, ['Пусто', 'Зеркало', 'Растянуть']],
    ['inf', 'Влияние', 0, 1, 0.01, 0.5],
    ['infy', 'По вертикали', 0, 1, 0.01, 0.5],
    ['ease', 'Плавность', 0.02, 1, 0.01, 0.75],
  ],
  [
    ['LIGHT', 'Свет', 0, 2, 0.01, 0.5],
    ['TRAIL', 'След', 0, 2, 0.01, 1],
    ['CHAOS', 'Хаос', 0, 4, 0.01, 2],
    ['RADIUS', 'Радиус', 0.5, 4, 0.01, 2],
    ['speed', 'Скорость', 0, 2, 0.01, 1],
  ],
]
export const CONTROLS = GROUPS.flat()
export type Params = Record<string, number>
export const DEFAULTS: Params = Object.fromEntries(CONTROLS.map(([id, , , , , v]) => [id, v]))

/**
 * Draws the picture on the canvas every frame while visible() says some of it is on screen, with the settings
 * params() gives at that moment; still: no motion and no pointer. Returns what stops it, or nothing without WebGL2.
 */
export function swarmLens(canvas: HTMLCanvasElement, params: () => Params, { visible = () => true, still = false }: { visible?: () => boolean; still?: boolean } = {}) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false })
  if (!gl) return
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
  const uniforms = ['R', 'T', 'uWaveT', 'uSeen', 'uPointer', 'uTrail', 'uCentre', 'uVh', ...CONTROLS.map(([id]) => id).filter((id) => /^[A-Z]/.test(id))]
  const u = Object.fromEntries(uniforms.map((k) => [k, gl.getUniformLocation(prog, k)]))

  // The pointer over the canvas, -1..1, y up, and its path one point every 25 ms (Рой); the lens's centre eases
  // after it, 0..1, y down, back to the middle when the pointer leaves the page
  const pointer = [0, 0]
  const trail: { x: number; y: number; t: number }[] = []
  let seen = 0, px = 0.5, py = 0.5, cx = 0.5, cy = 0.5
  const onMove = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height
    px = Math.min(Math.max(x, 0), 1)
    py = Math.min(Math.max(y, 0), 1)
    pointer[0] = x * 2 - 1
    pointer[1] = 1 - y * 2
    seen = 1
    const now = performance.now()
    if (!trail.length || now - trail[0].t > 25) {
      trail.unshift({ x: pointer[0], y: pointer[1], t: now })
      trail.length = Math.min(trail.length, 32)
    } else Object.assign(trail[0], { x: pointer[0], y: pointer[1] })
  }
  const onLeave = () => { px = 0.5; py = 0.5 }
  if (!still) {
    window.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
  }

  let t = 0, waveT = 0, last = performance.now(), raf = 0
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame)
    const dt = still ? 0 : Math.min(now - last, 100) / 1000
    last = now
    if (!visible()) return
    const p = params()
    t += dt * p.speed
    waveT += dt * p.speed * 1.25
    cx += (0.5 + (px - 0.5) * p.inf - cx) * p.ease
    cy += (0.5 + (py - 0.5) * p.inf * p.infy - cy) * p.ease
    const w = canvas.clientWidth, h = canvas.clientHeight
    if (!w || !h) return
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h }
    gl.viewport(0, 0, w, h)
    gl.uniform2f(u.R, w, h)
    gl.uniform1f(u.T, t + 3)
    gl.uniform1f(u.uWaveT, waveT + 3)
    gl.uniform1f(u.uSeen, seen)
    gl.uniform2f(u.uPointer, pointer[0], pointer[1])
    gl.uniform2f(u.uCentre, cx, cy)
    gl.uniform1f(u.uVh, innerHeight / h)
    const tr = new Float32Array(96).fill(99)
    trail.forEach((q, i) => tr.set([q.x, q.y, (now - q.t) / 1000], i * 3))
    gl.uniform3fv(u.uTrail, tr)
    for (const [id] of CONTROLS) if (/^[A-Z]/.test(id)) gl.uniform1f(u[id], p[id] ?? DEFAULTS[id])
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }
  raf = requestAnimationFrame(frame)
  return () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('pointermove', onMove)
    document.documentElement.removeEventListener('pointerleave', onLeave)
  }
}
