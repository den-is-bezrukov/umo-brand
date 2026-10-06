import { parse, type Font } from 'opentype.js'
import QRCode from 'qrcode'
import { UMO, EIGHT } from './logo'
import type { Surface, TextBlock, Obstacle, TextPart } from './layout'
import { hasProfanity, PROFANITY } from '@/ui/profanity'

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
  /** Over the block's line limit: the top lines when the block grows upwards, the bottom ones when it grows down */
  extra: boolean
}

export interface TextResult { lines: Line[]; issues: string[] }

export interface Sheet {
  surface: Surface
  /** Everything to cut: `fixed` (the QR and the UMO 8 lettering), then the text lines */
  shapes: Cmd[][]
  fixed: Cmd[][]
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

/** The deepest descender of CoFo Sans Cyrillic (р, у, д), in em */
const DESCENDER = 0.194

function moveCmds(cmds: Cmd[], dx: number, dy: number): Cmd[] {
  return cmds.map(c => c.length === 1 ? c : c.map((v, i) => (i === 0 ? v : (v as number) + (i % 2 ? dx : dy))) as Cmd)
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

/** Lines grow upwards from `block.baseline`, or downwards from `firstBaseline` when given */
/**
 * Text as typed or pasted, made safe to set: every kind of space (no-break, narrow, thin — Figma and typographers
 * leave them in) becomes a plain one, so wrapping sees the words and short ones get bound again; zero-width marks go.
 * The narrow no-break space in particular has no glyph in CoFo Sans and would glue words together.
 */
function clean(text: string): string {
  return text.replace(/[\u200b-\u200d\u2060\ufeff]/g, '').replace(/[^\S\n]+/g, ' ')
}

function setText(font: Font, raw: string, block: TextBlock, name: string, surface: Surface, firstBaseline?: number): TextResult {
  const text = clean(raw)
  const wrapped = wrap(font, text, block)
  // A `centred` block with fewer lines than it takes sits in the middle of its lines' zone, not at its bottom
  const lift = block.centred && wrapped.length < block.maxLines ? (block.maxLines - wrapped.length) * block.leading / 2 : 0
  const lines: Line[] = wrapped.map((t, i) => {
    const baseline = firstBaseline === undefined ? block.baseline - lift - (wrapped.length - 1 - i) * block.leading : firstBaseline + i * block.leading
    const width = font.getAdvanceWidth(t.replace(/ /g, ' '), block.size)
    const x = block.align === 'left' ? block.x : block.align === 'center' ? block.x - width / 2 : block.x - width
    const { path, ink } = shape(font, t, x, baseline, block.size)
    const issues: string[] = []
    if (ink.x2 - ink.x1 > block.maxWidth) issues.push(`${name} шире ${block.maxWidth} мм`)
    for (const o of surface.obstacles) if (hits(ink, o, surface.clearance)) issues.push(`${name} задевает ${o.label}`)
    const extra = firstBaseline === undefined ? i < wrapped.length - block.maxLines : i >= block.maxLines
    return { text: t, cmds: pathCmds(path.commands), ink, issues, extra }
  })
  // The lines with an obscene word turn red; a word spaced out across lines turns them all
  if (hasProfanity(text)) {
    const bad = lines.filter(l => hasProfanity(l.text))
    for (const l of bad.length ? bad : lines) l.issues.push(`${name}: ${PROFANITY.toLowerCase()}`)
  }
  const issues = [...new Set(lines.flatMap(l => l.issues))]
  const missing = [...new Set([...text.replace(/\s/g, '')].filter(c => !font.hasChar(c)))]
  if (missing.length) issues.push(`${name}: нет в шрифте ${missing.map(c => `«${c}»`).join(', ')}`)
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

/** Dealer name, tagline and the QR link; `null` leaves that part off the sheet */
export function buildSheet(font: Font, base: Surface, input: { dealer: string | null; tagline: string | null; url: string | null; large?: boolean }): Sheet {
  // The larger tagline where the sheet has one
  const chosen = input.large && base.taglineLarge ? { ...base, tagline: base.taglineLarge } : base
  const surface = chosen.stack ? chosen : trimmed(chosen, input)
  const { qr, umo, num, stack } = surface
  const none: TextResult = { lines: [], issues: [] }
  const dealer = input.dealer === null ? none
    : setText(font, input.dealer, surface.dealer, 'Имя дилера', surface, stack && surface.dealer.baseline)
  // Stacked, the tagline follows the dealer name, or takes its place
  const afterDealer = dealer.lines.length
    ? surface.dealer.baseline + (dealer.lines.length - 1) * surface.dealer.leading + (stack?.gap ?? 0)
    : surface.dealer.baseline
  // Stacked, the tagline may take the dealer's lines too when there's no dealer name
  const taglineBlock = stack && input.dealer === null
    ? { ...surface.tagline, maxLines: surface.tagline.maxLines + surface.dealer.maxLines }
    : surface.tagline
  const tagline = input.tagline === null ? none
    : setText(font, input.tagline, taglineBlock, 'Слоган', surface, stack && afterDealer)
  let sheetSurface = surface
  const digit = surface.numGlyph ?? EIGHT
  let lettering = [fromD(UMO.d, umo.h / UMO.h, umo.x, umo.y), fromD(digit.d, num.h / digit.h, num.x, num.y)]
  if (stack) {
    // Centre the column (lettering and text) on the sheet's height: from the top of the lettering to the deepest
    // descender of the last line
    const last = [...dealer.lines, ...tagline.lines].length
      ? (tagline.lines.length ? { block: surface.tagline, n: tagline.lines.length, first: afterDealer } : { block: surface.dealer, n: dealer.lines.length, first: surface.dealer.baseline })
      : null
    const top = Math.min(umo.y, num.y)
    const bottom = last ? last.first + (last.n - 1) * last.block.leading + last.block.size * DESCENDER : Math.max(umo.y + umo.h, num.y + num.h)
    // With the QR the sheet keeps the QR's height and the column is centred on it; without, the sheet is cut down to
    // the column, centred where the full sheet was
    const height = bottom - top
    const crop = input.url === null
    const dy = crop ? -top : (surface.h - height) / 2 - top
    lettering = lettering.map(c => moveCmds(c, 0, dy))
    for (const l of [...dealer.lines, ...tagline.lines]) {
      l.cmds = moveCmds(l.cmds, 0, dy)
      l.ink = { ...l.ink, y1: l.ink.y1 + dy, y2: l.ink.y2 + dy }
    }
    const sized = crop ? { ...surface, h: height, photo: { ...surface.photo, y: surface.photo.y + (surface.h - height) / 2 } } : surface
    sheetSurface = { ...sized, dims: stackDims(sized, top + dy, bottom + dy, !!last) }
  }
  const fixed = [
    ...(input.url === null ? [] : [qrOutline(input.url, qr.x, qr.y, qr.size)]),
    ...lettering,
  ]
  const shapes = [
    ...fixed,
    ...dealer.lines.map(l => l.cmds),
    ...tagline.lines.map(l => l.cmds),
  ]
  const issues = [...dealer.issues, ...tagline.issues]
  if (input.dealer !== null && !input.dealer.trim()) issues.unshift('Нет текста сверху')
  if (input.tagline !== null && !input.tagline.trim()) issues.unshift('Нет текста снизу')
  return { surface: sheetSurface, shapes, fixed, dealer, tagline, issues }
}

/** A dimension to half a millimetre, so rows add up to the sheet: 87,5 + 75 + 87,5 */
export const mm = (v: number) => String(Math.round(v * 2) / 2).replace('.', ',')

/**
 * The spec's dimensions without the rows and lines of the texts left out. On each side the rows around a dropped
 * one close up: the dealer's 80 and 60 become one 140, the tagline's two 120s one 240.
 */
function withoutParts(dims: Surface['dims'], off: Set<TextPart>): Surface['dims'] {
  type Row = Surface['dims']['rows'][number]
  const gone = (r: Row) => !!r.part && off.has(r.part)
  const merged: Row[] = []
  for (const side of [-1, 1]) {
    // Runs of adjacent dropped rows become one row over the space they leave
    const runs: [number, number][] = []
    for (const r of dims.rows.filter(r => r.x === side && gone(r)).sort((a, b) => a.from - b.from)) {
      const run = runs[runs.length - 1]
      if (run && Math.abs(run[1] - r.from) < 1) run[1] = r.to
      else runs.push([r.from, r.to])
    }
    merged.push(...runs.map(([from, to]) => ({ from, to, label: mm(to - from), x: side })))
  }
  return { ...dims, rows: [...dims.rows.filter(r => !gone(r)), ...merged], grid: dims.grid.filter(g => !(g[4] && off.has(g[4]))) }
}

/**
 * A side surface with only what's on it: the rows and lines of the texts left out go (`withoutParts`), and the sheet
 * is cut down to its content — without the dealer name it starts at the top of the QR and lettering, without the
 * tagline (and the QR, which reaches the bottom too) it ends under the lettering. The sheet stays where it was on the
 * body, so the strip cut off joins the distance to the window line or the moulding: ~100 + 140 become ~240.
 */
function trimmed(s: Surface, input: { dealer: string | null; tagline: string | null; url: string | null }): Surface {
  const off = new Set<TextPart>([...(input.dealer === null ? ['dealer' as const] : []), ...(input.tagline === null ? ['tagline' as const] : [])])
  const parts = off.size ? withoutParts(s.dims, off) : s.dims
  const qr = input.url !== null
  const top = input.dealer !== null ? 0 : Math.min(...(qr ? [s.qr.y] : []), s.umo.y, s.num.y)
  const bottom = input.tagline !== null ? s.h : Math.max(...(qr ? [s.qr.y + s.qr.size] : []), s.umo.y + s.umo.h, s.num.y + s.num.h)
  if (top === 0 && bottom === s.h) return { ...s, dims: parts }
  const h = bottom - top
  const rows = parts.rows.flatMap(r => {
    if (r.margin === 'top') return [{ ...r, from: r.from - top, to: 0, label: `~${Math.round(r.to - r.from + top)}` }]
    if (r.margin === 'bottom') return [{ ...r, from: h, to: r.to - top, label: `~${Math.round(r.to - r.from + s.h - bottom)}` }]
    const from = r.from - top
    const to = r.to - top
    return from > -1 && to < h + 1 ? [{ ...r, from, to }] : []
  })
  const grid = parts.grid.flatMap(([x1, y1, x2, y2, part]): Surface['dims']['grid'] => {
    if (y1 === y2) return y1 - top > 0 && y1 - top < h ? [[x1, y1 - top, x2, y2 - top, part]] : []
    const a = Math.max(0, y1 - top)
    const b = Math.min(h, y2 - top)
    return b > a ? [[x1, a, x2, b, part]] : []
  })
  const up = (o: Obstacle): Obstacle =>
    o.kind === 'seam' ? { ...o, top: [o.top[0], o.top[1] - top], bottom: [o.bottom[0], o.bottom[1] - top] } : { ...o, y: o.y - top }
  return {
    ...s,
    h,
    qr: { ...s.qr, y: s.qr.y - top },
    umo: { ...s.umo, y: s.umo.y - top },
    num: { ...s.num, y: s.num.y - top },
    dealer: { ...s.dealer, baseline: s.dealer.baseline - top },
    tagline: { ...s.tagline, baseline: s.tagline.baseline - top },
    obstacles: s.obstacles.map(up),
    photo: { ...s.photo, y: s.photo.y + top },
    dims: { cols: parts.cols.map(c => (c.y === undefined ? c : { ...c, y: c.y - top })), rows, grid },
  }
}

/**
 * The spec's dimensions for a stacked surface, from where its column landed (`top` to `bottom`): the lettering, the
 * gap and the text zone on the column's side, with lines across the column between them, and the sheet's full height
 * on the other side. When the column is shorter than the sheet (the QR keeps it at full height) the margins above
 * and under it are given too, from the QR's edges. Columns and the vertical lines stay as in the layout.
 */
function stackDims(surface: Surface, top: number, bottom: number, text: boolean): Surface['dims'] {
  const { umo, num, h, dims, stack } = surface
  const x1 = umo.x
  const digit = surface.numGlyph ?? EIGHT
  const x2 = num.x + num.h * (digit.w / digit.h)
  const column = [top, top + umo.h, ...(text ? [top + stack!.textTop, bottom] : [])]
  const end = column[column.length - 1]
  const steps = [...(top > 1 ? [0] : []), ...column, ...(h - end > 1 ? [h] : [])]
  // Rounded to half a millimetre, the last one taking up the rounding so the rows add up to what they span
  const half = (v: number) => Math.round(v * 2) / 2
  const sizes = steps.slice(1).map((to, i) => half(to - steps[i]))
  sizes[sizes.length - 1] = half(steps[steps.length - 1] - steps[0]) - sizes.slice(0, -1).reduce((a, b) => a + b, 0)
  const rows = steps.slice(1).map((to, i) => ({ from: steps[i], to, label: mm(sizes[i]), x: 1 }))
  const height = dims.rows.filter(r => r.x < 0)
  // The full height, unless the lettering alone already is it
  const total = height.length ? height : rows.length > 1 || Math.abs(rows[0].to - rows[0].from - h) > 1 ? [{ from: 0, to: h, label: mm(h), x: -1 }] : []
  return {
    cols: dims.cols,
    rows: [...total, ...rows],
    grid: [
      ...dims.grid.filter(([ax, , bx]) => ax === bx),
      ...steps.filter(y => y > 1 && y < h - 1).map(y => [x1, y, x2, y] as [number, number, number, number]),
    ],
  }
}

export interface SpecMarks {
  /** Label size and line weight, in mm */
  size: number
  thickness: number
  lines: [number, number, number, number][]
  labels: { text: string; x: number; y: number; align: 'left' | 'center' | 'right' }[]
}

/**
 * The red dimensions of the spec in sheet millimetres (y down): the sheet edges, its zone grid, column widths above it
 * and row heights beside it. Labels are positioned by their baseline. Drawn by the spec PDF and by the preview.
 */
export function specMarks(surface: Surface): SpecMarks {
  const { w, h, dims } = surface
  const size = surface.labelSize
  const lines: SpecMarks['lines'] = [[0, 0, w, 0], [w, 0, w, h], [w, h, 0, h], [0, h, 0, 0], ...dims.grid.map(([x1, y1, x2, y2]) => [x1, y1, x2, y2] as [number, number, number, number])]
  const labels: SpecMarks['labels'] = []
  for (const c of dims.cols) {
    const y = c.y ?? -size
    lines.push([c.from, 0, c.from, y], [c.to, 0, c.to, y])
    if (c.y) lines.push([c.from, y, c.to, y])
    labels.push({ text: c.label, x: (c.from + c.to) / 2, y: y - size * 0.3, align: 'center' })
  }
  for (const r of dims.rows) {
    const x = r.at ?? (r.x < 0 ? 0 : w)
    const tick = x + r.x * size * 3
    lines.push([x, r.from, tick, r.from], [x, r.to, tick, r.to])
    labels.push({ text: r.label, x: x + r.x * size * 0.4, y: (r.from + r.to) / 2 + size * 0.35, align: r.x < 0 ? 'right' : 'left' })
  }
  return { size, thickness: size / 20, lines, labels }
}
