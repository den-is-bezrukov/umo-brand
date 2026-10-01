import { parse, type Font } from 'opentype.js'
import QRCode from 'qrcode'
import { UMO, EIGHT } from './logo'
import type { Surface, TextBlock, Obstacle } from './layout'

// Everything on a livery sheet is a filled outline in millimetres: the shapes the plotter cuts. The preview draws them
// as SVG, the export writes the same commands into the PDF.

export type Cmd = ['M', number, number] | ['L', number, number] | ['C', number, number, number, number, number, number] | ['Z']

export interface Box { x1: number; y1: number; x2: number; y2: number }

export interface Line {
  text: string
  cmds: Cmd[]
  ink: Box
  /** Why this line can't go on the car as it is */
  issues: string[]
}

export interface TextResult { lines: Line[]; issues: string[] }

export interface Sheet {
  surface: Surface
  shapes: Cmd[][]
  dealer: TextResult
  tagline: TextResult
  issues: string[]
}

let fontPromise: Promise<Font> | undefined

export function loadFont(): Promise<Font> {
  fontPromise ??= fetch(`${import.meta.env.BASE_URL}fonts/CoFoSans-Medium.ttf`)
    .then(r => r.arrayBuffer())
    .then(buf => parse(buf))
  return fontPromise
}

export function toD(cmds: Cmd[]): string {
  return cmds.map(c => c[0] + (c.length > 1 ? c.slice(1).map(n => +(n as number).toFixed(2)).join(' ') : '')).join('')
}

/** Absolute M/L/C/Z path data (what the logo is stored as) to commands, scaled and moved */
function fromD(d: string, scale: number, dx: number, dy: number): Cmd[] {
  const tokens = d.match(/[MLCZ]|-?\d*\.?\d+/g) ?? []
  const cmds: Cmd[] = []
  let op = ''
  let nums: number[] = []
  const flush = () => {
    const p = nums.map((n, i) => n * scale + (i % 2 ? dy : dx))
    if (op === 'M' || op === 'L') for (let i = 0; i < p.length; i += 2) cmds.push([op, p[i], p[i + 1]] as Cmd)
    if (op === 'C') for (let i = 0; i < p.length; i += 6) cmds.push(['C', p[i], p[i + 1], p[i + 2], p[i + 3], p[i + 4], p[i + 5]])
    if (op === 'Z') cmds.push(['Z'])
    nums = []
  }
  for (const t of tokens) {
    if (/[A-Z]/.test(t)) { flush(); op = t } else nums.push(Number(t))
  }
  flush()
  return cmds
}

/**
 * The QR code as outlines of its dark areas, with no edges between neighbouring modules: a plotter cuts each contour
 * once, so the film doesn't fall apart into squares. Contours run clockwise with the dark side on the right; where
 * two dark modules touch only at a corner the trace turns right, keeping them separate pieces.
 */
function qrOutline(url: string, x: number, y: number, size: number): Cmd[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qr = (QRCode as any).create(url, { errorCorrectionLevel: 'M' })
  const n: number = qr.modules.size
  const dark = (r: number, c: number) => r >= 0 && c >= 0 && r < n && c < n && !!qr.modules.data[r * n + c]
  const key = (vx: number, vy: number) => vy * (n + 1) + vx
  // Outgoing edges per vertex: [toX, toY]
  const out = new Map<number, [number, number][]>()
  const add = (ax: number, ay: number, bx: number, by: number) => {
    const k = key(ax, ay)
    if (!out.has(k)) out.set(k, [])
    out.get(k)!.push([bx, by])
  }
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!dark(r, c)) continue
      if (!dark(r - 1, c)) add(c, r, c + 1, r)
      if (!dark(r, c + 1)) add(c + 1, r, c + 1, r + 1)
      if (!dark(r + 1, c)) add(c + 1, r + 1, c, r + 1)
      if (!dark(r, c - 1)) add(c, r + 1, c, r)
    }
  }
  const cell = size / n
  const cmds: Cmd[] = []
  for (const [startKey, list] of out) {
    while (list.length) {
      const sx = startKey % (n + 1)
      const sy = Math.floor(startKey / (n + 1))
      const pts: [number, number][] = [[sx, sy]]
      let [px, py] = [sx, sy]
      let [nx, ny] = list.pop()!
      while (!(nx === sx && ny === sy)) {
        pts.push([nx, ny])
        const dx = nx - px
        const dy = ny - py
        const options = out.get(key(nx, ny))!
        // Right turn in screen coordinates (y down) is (-dy, dx); then straight, then left.
        const prefs: [number, number][] = [[-dy, dx], [dx, dy], [dy, -dx]]
        let i = -1
        for (const [tx, ty] of prefs) {
          i = options.findIndex(([ox, oy]) => ox - nx === tx && oy - ny === ty)
          if (i >= 0) break
        }
        const [next] = options.splice(i, 1)
        ;[px, py] = [nx, ny]
        ;[nx, ny] = next
      }
      // Keep the corners only
      const corners = pts.filter((p, i) => {
        const a = pts[(i - 1 + pts.length) % pts.length]
        const b = pts[(i + 1) % pts.length]
        return (p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0]) !== 0
      })
      corners.forEach(([cx, cy], i) => cmds.push([i ? 'L' : 'M', x + cx * cell, y + cy * cell]))
      cmds.push(['Z'])
    }
  }
  return cmds
}

/** Short words (prepositions, conjunctions, a separator bar) go to the next line together with the word after them */
function bindShortWords(text: string): string {
  let prev
  do {
    prev = text
    text = text.replace(/(^|[\s ])([^\s ]{1,2}) +(?=\S)/g, '$1$2 ')
  } while (text !== prev)
  return text
}

function shape(font: Font, text: string, x: number, baseline: number, size: number) {
  const path = font.getPath(text.replace(/ /g, ' '), x, baseline, size)
  const b = path.getBoundingBox()
  return { path, ink: { x1: b.x1, y1: b.y1, x2: b.x2, y2: b.y2 } }
}

const inkWidth = (font: Font, text: string, size: number) => {
  const { ink } = shape(font, text, 0, 0, size)
  return text.trim() ? ink.x2 - ink.x1 : 0
}

function wrap(font: Font, text: string, block: TextBlock): string[] {
  const paragraphs = (block.oneLine ? text.replace(/\s*\n\s*/g, ' ') : text).split('\n')
  const lines: string[] = []
  for (const p of paragraphs) {
    const words = bindShortWords(p.trim()).split(/ +/).filter(Boolean)
    let line = ''
    for (const w of words) {
      const candidate = line ? `${line} ${w}` : w
      if (line && inkWidth(font, candidate, block.size) > block.maxWidth) {
        lines.push(line)
        line = w
      } else line = candidate
    }
    if (line) lines.push(line)
  }
  return lines
}

function seamX(o: Extract<Obstacle, { kind: 'seam' }>, y: number) {
  const t = (y - o.top[1]) / (o.bottom[1] - o.top[1])
  return o.top[0] + (o.bottom[0] - o.top[0]) * t
}

function hits(ink: Box, o: Obstacle, c: number): boolean {
  if (o.kind === 'rect') return ink.x1 < o.x + o.w + c && ink.x2 > o.x - c && ink.y1 < o.y + o.h + c && ink.y2 > o.y - c
  const xs = [seamX(o, ink.y1), seamX(o, ink.y2)]
  return ink.x1 - c < Math.max(...xs) && ink.x2 + c > Math.min(...xs)
}

function setText(font: Font, text: string, block: TextBlock, name: string, surface: Surface): TextResult {
  const lines: Line[] = wrap(font, text, block).map((t, i) => {
    const baseline = block.baseline + i * block.leading
    const width = font.getAdvanceWidth(t.replace(/ /g, ' '), block.size)
    const x = block.align === 'left' ? block.x : block.x - width
    const { path, ink } = shape(font, t, x, baseline, block.size)
    const issues: string[] = []
    if (ink.x2 - ink.x1 > block.maxWidth) issues.push(`${name} шире ${block.maxWidth} мм`)
    for (const o of surface.obstacles) if (hits(ink, o, surface.clearance)) issues.push(`${name} задевает ${o.label}`)
    return { text: t, cmds: pathCmds(path.commands), ink, issues }
  })
  const issues = [...new Set(lines.flatMap(l => l.issues))]
  if (lines.length > block.maxLines) issues.unshift(`${name} не помещается в ${block.maxLines === 1 ? 'одну строку' : `${block.maxLines} строки`}`)
  return { lines, issues }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pathCmds(commands: any[]): Cmd[] {
  const cmds: Cmd[] = []
  let cx = 0
  let cy = 0
  for (const c of commands) {
    if (c.type === 'M' || c.type === 'L') { cmds.push([c.type, c.x, c.y]); cx = c.x; cy = c.y }
    else if (c.type === 'C') { cmds.push(['C', c.x1, c.y1, c.x2, c.y2, c.x, c.y]); cx = c.x; cy = c.y }
    else if (c.type === 'Q') {
      // Quadratic to cubic
      cmds.push(['C', cx + (2 / 3) * (c.x1 - cx), cy + (2 / 3) * (c.y1 - cy), c.x + (2 / 3) * (c.x1 - c.x), c.y + (2 / 3) * (c.y1 - c.y), c.x, c.y])
      cx = c.x; cy = c.y
    } else if (c.type === 'Z') cmds.push(['Z'])
  }
  return cmds
}

export function buildSheet(font: Font, surface: Surface, input: { dealer: string; tagline: string; url: string }): Sheet {
  const { qr, umo, num } = surface
  const dealer = setText(font, input.dealer, surface.dealer, 'Дилер', surface)
  const tagline = setText(font, input.tagline, surface.tagline, 'Теглайн', surface)
  const shapes = [
    qrOutline(input.url, qr.x, qr.y, qr.size),
    fromD(UMO.d, umo.h / UMO.h, umo.x, umo.y),
    fromD(EIGHT.d, num.h / EIGHT.h, num.x, num.y),
    ...dealer.lines.map(l => l.cmds),
    ...tagline.lines.map(l => l.cmds),
  ]
  const issues = [...dealer.issues, ...tagline.issues]
  if (!input.dealer.trim()) issues.unshift('Нет имени дилера')
  if (!input.tagline.trim()) issues.unshift('Нет теглайна')
  return { surface, shapes, dealer, tagline, issues }
}
