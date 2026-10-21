import type { Mark } from '@/brand'

// The livery's surfaces, in millimetres: the mechanics every car shares. A surface is a sheet with its origin at the
// top left, its zones, the obstacles on the body under it and the dimensions for the spec; the same numbers drive the
// preview, the cut files and the spec. The cars themselves, their surfaces, photos and lettering, are the brand's
// (`@brand/livery`).

export type SurfaceId = 'left' | 'right' | 'rear'

export type TextPart = 'dealer' | 'tagline'

export interface TextBlock {
  /** Left edge for left-aligned text, right edge for right-aligned, middle for centred */
  x: number
  align: 'left' | 'center' | 'right'
  /** Baseline of the last line: text grows upwards from it, each line above `leading` higher */
  baseline: number
  size: number
  leading: number
  /** Widest a line may be, by ink */
  maxWidth: number
  maxLines: number
  /** Line breaks typed in the field become spaces (the rear window has room for one line only) */
  oneLine?: boolean
  /** Fewer lines than `maxLines` are centred in the zone the full block takes, rather than kept at its last baseline */
  centred?: boolean
}

/** Things on the body the lettering must keep clear of, in the surface's coordinates */
export type Obstacle =
  | { kind: 'seam'; label: string; top: [number, number]; bottom: [number, number] }
  | { kind: 'rect'; label: string; x: number; y: number; w: number; h: number }

export interface Surface {
  id: SurfaceId
  title: string
  w: number
  h: number
  qr: { x: number; y: number; size: number }
  /** The wordmark and the model number, by their top left corner and height */
  wordmark: { x: number; y: number; h: number }
  num: { x: number; y: number; h: number }
  /** The model number's outline */
  numGlyph: Mark
  /** Colour of the decals in the preview and the spec, white when not given: black on a white car */
  decal?: string
  dealer: TextBlock
  tagline: TextBlock
  obstacles: Obstacle[]
  /** How much space text needs from an obstacle */
  clearance: number
  /** Size of the spec's dimension labels, in mm, the same with or without the QR */
  labelSize: number
  /**
   * Text stacked under the lettering instead of each block sitting at its own baseline: the dealer name at its
   * baseline, the tagline `gap` under it (or in its place without one), and the lettering with the text centred
   * vertically on the sheet, so leaving a text out doesn't leave a hole. The QR stays put. `textTop` is where the
   * text zone starts under the top of the lettering, for the spec's rows; the spec's rows and lines on the text
   * side follow the column wherever it lands.
   */
  stack?: { gap: number; textTop: number }
  photo: {
    src: string
    /** Photo size in millimetres of the car */
    w: number
    h: number
    mirror?: boolean
    background: string
    /** Where the sheet sits on the photo */
    x: number
    y: number
    /** Part of the photo shown in the preview: x, y, w, h */
    view: [number, number, number, number]
  }
  /**
   * Dimension lines for the spec: horizontal ones above the sheet (or at `y`), vertical ones beside it (on the side
   * `x` points to), and the zone grid inside it as [x1, y1, x2, y2] segments. Rows and lines that belong to the
   * dealer name or the tagline carry its `part` and go when it's left out; the rows next to them close the gap.
   */
  dims: {
    cols: { from: number; to: number; label: string; y?: number }[]
    /** `at` moves a row off the sheet's edge, e.g. to the door's edge for the distances to the body */
    rows: { from: number; to: number; label: string; x: number; at?: number; part?: TextPart; margin?: 'top' | 'bottom' }[]
    grid: [number, number, number, number, TextPart?][]
  }
  /** A larger tagline the sheet can take instead (`large` in `buildSheet`); only the QR-less sides have one */
  taglineLarge?: TextBlock
  /**
   * The sheet without the QR, either laid out anew or cut down:
   * - `layout` (the sides): its own lettering, text blocks, size and spec; the sheet
   *   keeps its front edge on the body, its origin moving `shift` along it;
   * - `cut` (the rear window): the QR's column (the code and the gap after it) is cut out at the `side` it sits on,
   *   the lettering moving into its place; `centre` keeps the narrower sheet centred where the full one was and
   *   centres the text on it.
   */
  noQr:
    | { kind: 'layout'; shift: number } & Pick<Surface, 'w' | 'wordmark' | 'num' | 'dealer' | 'tagline' | 'taglineLarge' | 'dims'>
    | { kind: 'cut'; side: 'start' | 'end'; width: number; centre?: boolean; dims: Surface['dims'] }
}

/** An obstacle mirrored across a sheet `w` wide: one side's, measured, for the other */
export const mirrorObstacle = (w: number) => (o: Obstacle): Obstacle =>
  o.kind === 'seam'
    ? { ...o, top: [w - o.top[0], o.top[1]], bottom: [w - o.bottom[0], o.bottom[1]] }
    : { ...o, x: w - o.x - o.w }

/**
 * The surface with the QR column cut out (see `noQr`). Everything past the column moves into it; the sheet keeps its
 * front edge on the car (or its centre, with `centre`), so its origin may move along the body.
 */
export function withoutQr(s: Surface): Surface {
  if (s.noQr.kind === 'layout') {
    const { kind: _, shift, ...layout } = s.noQr
    const move = (o: Obstacle): Obstacle =>
      o.kind === 'seam'
        ? { ...o, top: [o.top[0] - shift, o.top[1]], bottom: [o.bottom[0] - shift, o.bottom[1]] }
        : { ...o, x: o.x - shift }
    return { ...s, ...layout, obstacles: s.obstacles.map(move), photo: { ...s.photo, x: s.photo.x + shift } }
  }
  const { side, width, centre, dims } = s.noQr
  const start = side === 'start'
  // On the start side what lies beyond the column moves back; on the end side what lies over it does
  const shift = (x: number) => (start ? (x >= width ? x - width : x) : (x > s.w - width ? x - width : x))
  // How far the sheet's origin moves along the body; obstacles, fixed to the body, move back by as much
  const offset = centre ? width / 2 : start ? 0 : width
  const moveObstacle = (o: Obstacle): Obstacle =>
    o.kind === 'seam'
      ? { ...o, top: [o.top[0] - offset, o.top[1]], bottom: [o.bottom[0] - offset, o.bottom[1]] }
      : { ...o, x: o.x - offset }
  return {
    ...s,
    w: s.w - width,
    wordmark: { ...s.wordmark, x: shift(s.wordmark.x) },
    num: { ...s.num, x: shift(s.num.x) },
    dealer: centre ? { ...s.dealer, align: 'center', x: (s.w - width) / 2 } : { ...s.dealer, x: shift(s.dealer.x) },
    tagline: centre ? { ...s.tagline, align: 'center', x: (s.w - width) / 2 } : { ...s.tagline, x: shift(s.tagline.x) },
    obstacles: s.obstacles.map(moveObstacle),
    photo: { ...s.photo, x: s.photo.x + offset },
    dims,
  }
}

// The small QR: the QR-less side with a QR as
// tall as its lettering, 160, `SMALL_QR_GAP` behind the model number, at the rear end of the sheet
const SMALL_QR = 160
const SMALL_QR_GAP = 100

/** A length for a spec label: whole millimetres, or halves with a decimal comma */
const mmLabel = (v: number) => String(Math.round(v * 2) / 2).replace('.', ',')

/**
 * The side with the small QR: laid out as without the QR, the sheet `SMALL_QR_GAP + SMALL_QR` longer towards the rear
 * with the QR there, level with the lettering; the front edge stays where it was on the body. Sides only.
 */
export function smallQr(s: Surface): Surface {
  const bare = withoutQr(s)
  const add = SMALL_QR_GAP + SMALL_QR
  const w = bare.w
  // The dealer name sits at the front edge: left-aligned when the front is at the sheet's start
  const frontStart = bare.dealer.align === 'left'
  // With the front at the end the QR comes first and everything else moves along
  const dx = frontStart ? 0 : add
  const shiftX = <T extends { x: number }>(o: T): T => ({ ...o, x: o.x + dx })
  const moveObstacle = (o: Obstacle): Obstacle =>
    o.kind === 'seam'
      ? { ...o, top: [o.top[0] + dx, o.top[1]], bottom: [o.bottom[0] + dx, o.bottom[1]] }
      : { ...o, x: o.x + dx }
  const { cols, rows, grid } = bare.dims
  const qrCols: Surface['dims']['cols'] = frontStart
    ? [{ from: w, to: w + SMALL_QR_GAP, label: String(SMALL_QR_GAP) }, { from: w + SMALL_QR_GAP, to: w + add, label: String(SMALL_QR) }]
    : [{ from: 0, to: SMALL_QR, label: String(SMALL_QR) }, { from: SMALL_QR, to: add, label: String(SMALL_QR_GAP) }]
  // The bottom row (`y` set) runs ahead of the sheet, along it and behind it; the sheet grows into the distance behind
  const col = (c: Surface['dims']['cols'][number]): Surface['dims']['cols'][number] => {
    if (c.y === undefined) return { ...c, from: c.from + dx, to: c.to + dx }
    if (c.from >= 0 && c.to <= w) return { ...c, from: 0, to: w + add, label: mmLabel(w + add) }
    const behind = frontStart ? c.from >= w : c.to <= 0
    if (!behind) return { ...c, from: c.from + dx, to: c.to + dx }
    const [from, to] = frontStart ? [w + add, c.to] : [c.from + dx, 0]
    return { ...c, from, to, label: `~${Math.round(to - from)}` }
  }
  return {
    ...bare,
    w: w + add,
    qr: { x: frontStart ? w + SMALL_QR_GAP : 0, y: bare.wordmark.y, size: SMALL_QR },
    wordmark: shiftX(bare.wordmark),
    num: shiftX(bare.num),
    dealer: shiftX(bare.dealer),
    tagline: shiftX(bare.tagline),
    taglineLarge: bare.taglineLarge && shiftX(bare.taglineLarge),
    obstacles: bare.obstacles.map(moveObstacle),
    photo: { ...bare.photo, x: bare.photo.x - dx },
    dims: {
      cols: [...cols.map(col), ...qrCols],
      rows: rows.map(r => (r.at === undefined ? r : { ...r, at: r.at + dx })),
      // Lines across the whole sheet reach the QR; the rest move with what they mark
      grid: grid.map(([x1, y1, x2, y2, part]) =>
        x1 === 0 && x2 === w ? [0, y1, w + add, y2, part] : [x1 + dx, y1, x2 + dx, y2, part]),
    },
  }
}

export const SURFACES: SurfaceId[] = ['left', 'right', 'rear']

/** A model's id (`@brand/models`) */
export type Model = string

/**
 * What the brand gives the livery (`@brand/livery`): the wordmark the lettering starts with (absolute path data, its
 * height the lettering's) and each model's surfaces
 */
export interface BrandLivery { wordmark: Mark; surfaces: Record<Model, Record<SurfaceId, Surface>> }
