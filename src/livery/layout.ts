import sideImg from '@/assets/livery/umo8-side.webp'
import rearImg from '@/assets/livery/umo8-rear.webp'
import side5Img from '@/assets/livery/umo5-side.webp'
import rear5Img from '@/assets/livery/umo5-rear.webp'
import { FIVE } from './logo'

// Dealer livery surfaces, in millimetres, from 00_UMO8_dealer-livery_spec.pdf and the Illustrator sources next to it
// (Yandex Disk: Livery/UMO 8). Every surface is a sheet with its origin at the top left; the same numbers drive the
// preview, the cut files and the spec.

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
  /** UMO wordmark and the model number, by their top left corner and height */
  umo: { x: number; y: number; h: number }
  num: { x: number; y: number; h: number }
  /** The model number's outline (`logo.ts`); UMO 8's when not given */
  numGlyph?: { w: number; h: number; d: string }
  /** Colour of the decals in the preview and the spec, white when not given: black on the white UMO 5's sides */
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
   * - `layout` (the sides, Figma: UMO | Evrone, node 4920:39): its own lettering, text blocks, size and spec; the sheet
   *   keeps its front edge on the body, its origin moving `shift` along it;
   * - `cut` (the rear window): the QR's column (the code and the gap after it) is cut out at the `side` it sits on,
   *   the lettering moving into its place; `centre` keeps the narrower sheet centred where the full one was and
   *   centres the text on it.
   */
  noQr:
    | { kind: 'layout'; shift: number } & Pick<Surface, 'w' | 'umo' | 'num' | 'dealer' | 'tagline' | 'taglineLarge' | 'dims'>
    | { kind: 'cut'; side: 'start' | 'end'; width: number; centre?: boolean; dims: Surface['dims'] }
}

const SIDE_W = 1280
const SIDE_H = 500

// The dealer name runs up to 500 from the front edge, with the QR or without; the front door handle stays 13–23 clear
const DEALER_W = 500

// Side text: CoFo Sans Medium, 40 mm on 40 mm lines. The last baseline of a block sits a descender (0.194 em) above
// the sheet's bottom edge, so р, у or д in the last line stay on the sheet.
const sideText = { size: 40, leading: 40 }

// Measured on the left side with the front on the left; the right side is its mirror image.
const leftObstacles: Obstacle[] = [
  { kind: 'seam', label: 'шов между дверями', top: [878, -40], bottom: [864, 540] },
  { kind: 'rect', label: 'ручку двери', x: 523, y: -12, w: 231, h: 44 },
]

const mirror = (o: Obstacle): Obstacle =>
  o.kind === 'seam'
    ? { ...o, top: [SIDE_W - o.top[0], o.top[1]], bottom: [SIDE_W - o.bottom[0], o.bottom[1]] }
    : { ...o, x: SIDE_W - o.x - o.w }

// Side spec dimensions shared by both sides and their QR-less versions, as in 00_UMO8_dealer-livery_spec.pdf.
// The sheet's distance to the body: ~100 down from the window line, ~150 to the sill moulding, measured at the front
// door's edge (`at`), ~125 ahead of the sheet, so they clear the ~125 labels
const sideMargins = (x: number, at: number): Surface['dims']['rows'] => [
  { from: -100, to: 0, label: '~100', x, at, margin: 'top' },
  { from: 500, to: 650, label: '~150', x, at, margin: 'bottom' },
]
// The lettering, the gap under it and the tagline zone
const letteringRows = (x: number): Surface['dims']['rows'] => [
  { from: 140, to: 260, label: '120', x },
  { from: 260, to: 380, label: '120', x, part: 'tagline' },
  { from: 380, to: 500, label: '120', x, part: 'tagline' },
]
// Along the moulding: ~125 from the front door's edge, the sheet, and on to the rear door's edge, 1600 from the front
const sideBottom = (w: number, front: 'start' | 'end'): Surface['dims']['cols'] => {
  const y = 650
  const sheet = { label: String(w), y }
  const rest = { label: `~${1600 - w}`, y }
  return front === 'start'
    ? [{ from: -125, to: 0, label: '~125', y }, { from: 0, to: w, ...sheet }, { from: w, to: 1600, ...rest }]
    : [{ from: w - 1600, to: 0, ...rest }, { from: 0, to: w, ...sheet }, { from: w, to: w + 125, label: '~125', y }]
}

// The QR-less side (Figma: UMO | Evrone, node 4920:39): the lettering a third larger, 160 mm, its 1100 mm from the front
// edge making the sheet; the texts as before, the tagline 40 mm in three lines or 60 mm in two, under the lettering.
const BARE_W = 1100
const bareLettering = { y: 140, h: 160 }
const bareTagline = { baseline: 492, ...sideText, maxWidth: 400, maxLines: 3 }
// 60 mm on 60 mm lines, its last baseline a descender (0.194 em) above the sheet's bottom edge
const bareTaglineLarge = { baseline: 488, size: 60, leading: 60, maxWidth: 850, maxLines: 2 }
const bareRows = (x: number): Surface['dims']['rows'] => [
  { from: 140, to: 300, label: '160', x },
  { from: 300, to: 380, label: '80', x, part: 'tagline' },
  { from: 380, to: 500, label: '120', x, part: 'tagline' },
]
const dealerRows = (x: number): Surface['dims']['rows'] => [
  { from: 0, to: 80, label: '80', x, part: 'dealer' },
  { from: 80, to: 140, label: '60', x, part: 'dealer' },
]
// UMO, the gap, the model number
const bareCols = (front: 'start' | 'end'): Surface['dims']['cols'] => [
  ...(front === 'start' ? [{ from: -125, to: 0, label: '~125' }] : []),
  { from: 0, to: 800, label: '800' },
  { from: 800, to: 900, label: '100' },
  { from: 900, to: BARE_W, label: '200' },
  ...(front === 'end' ? [{ from: BARE_W, to: BARE_W + 125, label: '~125' }] : []),
  ...sideBottom(BARE_W, front),
]
const bareGrid = (dealerFrom: number): Surface['dims']['grid'] => [
  [dealerFrom, 80, dealerFrom + 450, 80, 'dealer'], [0, 140, BARE_W, 140], [0, 300, BARE_W, 300], [0, 380, BARE_W, 380, 'tagline'],
]

// The side photo covers 4800 × 2000 mm of the spec page, starting 450 mm from its top.
const sidePhoto = { src: sideImg, w: 4800, h: 2000, background: '#ffffff', view: [80, 60, 4640, 1880] as [number, number, number, number] }

export const UMO8: Record<SurfaceId, Surface> = {
  left: {
    id: 'left',
    title: 'Левый борт',
    w: SIDE_W,
    h: SIDE_H,
    qr: { x: 0, y: 140, size: 360 },
    umo: { x: 450, y: 140, h: 120 },
    num: { x: 1130, y: 140, h: 120 },
    dealer: { x: 0, align: 'left', baseline: 74, ...sideText, maxWidth: DEALER_W, maxLines: 2, centred: true },
    tagline: { x: 450, align: 'left', baseline: 492, ...sideText, maxWidth: 400, maxLines: 3 },
    obstacles: leftObstacles,
    clearance: 10,
    labelSize: 46,
    photo: { ...sidePhoto, x: 1709, y: 749 },
    dims: {
      cols: [
        { from: -125, to: 0, label: '~125' },
        { from: 0, to: 360, label: '360' },
        { from: 360, to: 450, label: '90' },
        { from: 450, to: 1280, label: '830' },
        ...sideBottom(1280, 'start'),
      ],
      rows: [
        ...sideMargins(-1, -125),
        { from: 0, to: 80, label: '80', x: -1, part: 'dealer' },
        { from: 80, to: 140, label: '60', x: -1, part: 'dealer' },
        { from: 140, to: 500, label: '360', x: -1 },
        ...letteringRows(1),
      ],
      grid: [
        [360, 0, 360, 500], [450, 0, 450, 500],
        [0, 80, 450, 80, 'dealer'], [0, 140, 1280, 140],
        [450, 260, 1280, 260], [450, 380, 1280, 380, 'tagline'],
      ],
    },
    noQr: {
      kind: 'layout',
      shift: 0,
      w: BARE_W,
      umo: { x: 0, ...bareLettering },
      num: { x: 900, ...bareLettering },
      dealer: { x: 0, align: 'left', baseline: 74, ...sideText, maxWidth: DEALER_W, maxLines: 2, centred: true },
      tagline: { x: 0, align: 'left', ...bareTagline },
      taglineLarge: { x: 0, align: 'left', ...bareTaglineLarge },
      dims: {
        cols: bareCols('start'),
        rows: [...sideMargins(-1, -125), ...dealerRows(-1), ...bareRows(1)],
        grid: bareGrid(0),
      },
    },
  },
  right: {
    id: 'right',
    title: 'Правый борт',
    w: SIDE_W,
    h: SIDE_H,
    qr: { x: 920, y: 140, size: 360 },
    umo: { x: 0, y: 140, h: 120 },
    num: { x: 680, y: 140, h: 120 },
    dealer: { x: 1280, align: 'right', baseline: 74, ...sideText, maxWidth: DEALER_W, maxLines: 2, centred: true },
    tagline: { x: 830, align: 'right', baseline: 492, ...sideText, maxWidth: 400, maxLines: 3 },
    obstacles: leftObstacles.map(mirror),
    clearance: 10,
    labelSize: 46,
    photo: { ...sidePhoto, mirror: true, x: 4800 - 1709 - SIDE_W, y: 749 },
    dims: {
      cols: [
        { from: 0, to: 830, label: '830' },
        { from: 830, to: 920, label: '90' },
        { from: 920, to: 1280, label: '360' },
        { from: 1280, to: 1405, label: '~125' },
        ...sideBottom(1280, 'end'),
      ],
      rows: [
        ...letteringRows(-1),
        ...sideMargins(1, 1405),
        { from: 0, to: 80, label: '80', x: 1, part: 'dealer' },
        { from: 80, to: 140, label: '60', x: 1, part: 'dealer' },
        { from: 140, to: 500, label: '360', x: 1 },
      ],
      grid: [
        [920, 0, 920, 500], [830, 0, 830, 500],
        [830, 80, 1280, 80, 'dealer'], [0, 140, 1280, 140],
        [0, 260, 830, 260], [0, 380, 830, 380, 'tagline'],
      ],
    },
    noQr: {
      kind: 'layout',
      shift: SIDE_W - BARE_W,
      w: BARE_W,
      umo: { x: 0, ...bareLettering },
      num: { x: 900, ...bareLettering },
      dealer: { x: BARE_W, align: 'right', baseline: 74, ...sideText, maxWidth: DEALER_W, maxLines: 2, centred: true },
      tagline: { x: BARE_W, align: 'right', ...bareTagline },
      taglineLarge: { x: BARE_W, align: 'right', ...bareTaglineLarge },
      dims: {
        cols: bareCols('end'),
        rows: [...bareRows(-1), ...sideMargins(1, BARE_W + 125), ...dealerRows(1)],
        grid: bareGrid(BARE_W - 450),
      },
    },
  },
  rear: {
    id: 'rear',
    title: 'Заднее стекло',
    w: 835,
    h: 250,
    qr: { x: 0, y: 0, size: 250 },
    umo: { x: 325, y: 0, h: 75 },
    num: { x: 835 - 93.75, y: 0, h: 75 },
    // Rear text: 37.5 mm, one dealer line over a two-line tagline in the 125 mm under the lettering.
    dealer: { x: 325, align: 'left', baseline: 152.5, size: 37.5, leading: 37.5, maxWidth: 510, maxLines: 1, oneLine: true },
    tagline: { x: 325, align: 'left', baseline: 242.5, size: 37.5, leading: 37.5, maxWidth: 510, maxLines: 2 },
    obstacles: [],
    clearance: 0,
    labelSize: 30,
    // 152.5 + 52.5 puts the tagline's first baseline at 205, as in the source
    stack: { gap: 52.5, textTop: 125 },
    // The rear photo covers 2280 × 2400 mm of the spec page from (300, 250).
    photo: { src: rearImg, w: 2280, h: 2400, background: '#000000', x: 723, y: 1075, view: [180, 60, 1920, 2240] },
    dims: {
      cols: [
        { from: 0, to: 250, label: '250' },
        { from: 250, to: 325, label: '75' },
        { from: 325, to: 835, label: '510' },
        { from: 0, to: 835, label: '835', y: 330 },
      ],
      rows: [
        { from: 0, to: 75, label: '75', x: 1 },
        { from: 75, to: 125, label: '50', x: 1 },
        { from: 125, to: 250, label: '125', x: 1 },
        { from: 0, to: 250, label: '250', x: -1 },
      ],
      grid: [
        [250, 0, 250, 250], [325, 0, 325, 250],
        [325, 75, 835, 75], [325, 125, 835, 125],
      ],
    },
    noQr: {
      kind: 'cut',
      side: 'start',
      width: 325,
      centre: true,
      dims: {
        cols: [{ from: 0, to: 510, label: '510' }],
        rows: [
          { from: 0, to: 75, label: '75', x: 1 },
          { from: 75, to: 125, label: '50', x: 1 },
          { from: 125, to: 250, label: '125', x: 1 },
        ],
        grid: [[0, 75, 510, 75], [0, 125, 510, 125]],
      },
    },
  },
}

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
    umo: { ...s.umo, x: shift(s.umo.x) },
    num: { ...s.num, x: shift(s.num.x) },
    dealer: centre ? { ...s.dealer, align: 'center', x: (s.w - width) / 2 } : { ...s.dealer, x: shift(s.dealer.x) },
    tagline: centre ? { ...s.tagline, align: 'center', x: (s.w - width) / 2 } : { ...s.tagline, x: shift(s.tagline.x) },
    obstacles: s.obstacles.map(moveObstacle),
    photo: { ...s.photo, x: s.photo.x + offset },
    dims,
  }
}

export const SURFACES: SurfaceId[] = ['left', 'right', 'rear']

// ─── UMO 5 ───────────────────────────────────────────────────────────────────
// Figma: UMO | Evrone, node 3532:454 (the sides with the QR and the rear window) and 4934:3338 (the sides without the
// QR). Laid out like UMO 8 with its own numbers: the lettering column is 830 (UMO 600, 90, the 5 140), the QR column
// 360 after a 120 gap, so the side is 1310 × 500. Text is 40 mm on 42 mm lines. The car is white, so the side decals
// are black; on the rear window they stay white.

const SIDE5_W = 1310
const side5Text = { size: 40, leading: 42 }
// The dealer name may run 550 from the front edge with the QR or without, so one that fits fits both ways; it stays
// clear of the front door handle either way
const DEALER5_W = 550

// Measured on the photo of the right side (front on the right): the seam between the doors crosses the lettering, the
// front door handle sits under the dealer's corner of the sheet; the left side is its mirror image.
const right5Obstacles: Obstacle[] = [
  { kind: 'seam', label: 'шов между дверями', top: [402, -40], bottom: [396, 540] },
  { kind: 'rect', label: 'ручку двери', x: 448, y: 3, w: 242, h: 50 },
]
const mirror5 = (o: Obstacle): Obstacle =>
  o.kind === 'seam'
    ? { ...o, top: [SIDE5_W - o.top[0], o.top[1]], bottom: [SIDE5_W - o.bottom[0], o.bottom[1]] }
    : { ...o, x: SIDE5_W - o.x - o.w }

// Under the sheet at the front door's edge, ~200 ahead of it: ~60 to the moulding and the moulding's ~75. Along it,
// ~340 behind the sheet to the rear door's edge.
const MOULDING_Y = 635
const side5Bottom = (at: number, x: number): Surface['dims']['rows'] => [
  { from: 500, to: 560, label: '~60', x, at, margin: 'bottom' },
  { from: 560, to: 635, label: '~75', x, at },
]
const side5Lettering = (x: number): Surface['dims']['rows'] => [
  { from: 140, to: 260, label: '120', x },
  { from: 260, to: 380, label: '120', x, part: 'tagline' },
  { from: 380, to: 500, label: '120', x, part: 'tagline' },
]
const side5Qr = (x: number): Surface['dims']['rows'] => [
  { from: 0, to: 80, label: '80', x, part: 'dealer' },
  { from: 80, to: 140, label: '60', x, part: 'dealer' },
  { from: 140, to: 500, label: '360', x },
]

// Without the QR (node 4934:3338): the lettering 160 high (UMO 800, 100, the 5 186,67), the sheet as wide, the dealer
// name over its front end, 40 mm in two lines or one centred on them and the tagline under it: 40 mm in three lines (node 4934:3341) or, with
// the size switch, 60 mm in two. The sheet keeps its height and moves along the body: on the right side 183,33 back
// from the front, on the left 40.
const BARE5_W = 800 + 100 + FIVE.w * (160 / FIVE.h)
const bare5Lettering = { y: 140, h: 160 }
// Two lines filling the 80 over the lettering, or one in the middle of them (node 4934:3325)
const bare5Dealer = { baseline: 74, size: 40, leading: 40, maxWidth: DEALER5_W, maxLines: 2, centred: true }
const bare5Tagline = { baseline: 486, size: 40, leading: 40, maxWidth: 420, maxLines: 3 }
const bare5TaglineLarge = { baseline: 483, size: 60, leading: 60, maxWidth: 850, maxLines: 2 }
const bare5Rows = (x: number): Surface['dims']['rows'] => [
  { from: 140, to: 300, label: '160', x },
  { from: 300, to: 380, label: '80', x, part: 'tagline' },
  { from: 380, to: 500, label: '120', x, part: 'tagline' },
]
const bare5Dealer80 = (x: number): Surface['dims']['rows'] => [
  { from: 0, to: 80, label: '80', x, part: 'dealer' },
  { from: 80, to: 140, label: '60', x, part: 'dealer' },
]
const bare5Cols: Surface['dims']['cols'] = [
  { from: 0, to: 800, label: '800' },
  { from: 800, to: 900, label: '100' },
  { from: 900, to: BARE5_W, label: '186,5' },
]
const bare5Grid = (dealerFrom: number): Surface['dims']['grid'] => [
  [dealerFrom, 80, dealerFrom + DEALER5_W, 80, 'dealer'], [0, 140, BARE5_W, 140], [0, 300, BARE5_W, 300], [0, 380, BARE5_W, 380, 'tagline'],
]

// The side photo is the Figma frame's: 4718 × 1680 mm, the car's right side, the sheet's top 682 down.
const side5Photo = { src: side5Img, w: 4718, h: 1680, background: '#ffffff', view: [150, 0, 4418, 1680] as [number, number, number, number] }
const RIGHT5_X = 1820

export const UMO5: Record<SurfaceId, Surface> = {
  left: {
    id: 'left',
    title: 'Левый борт',
    w: SIDE5_W,
    h: SIDE_H,
    qr: { x: 0, y: 140, size: 360 },
    umo: { x: 480, y: 140, h: 120 },
    num: { x: 1170, y: 140, h: 120 },
    numGlyph: FIVE,
    decal: '#000000',
    dealer: { x: 0, align: 'left', baseline: 71, ...side5Text, maxWidth: DEALER5_W, maxLines: 2, centred: true },
    tagline: { x: 480, align: 'left', baseline: 492, ...side5Text, maxWidth: 420, maxLines: 3 },
    obstacles: right5Obstacles.map(mirror5),
    clearance: 10,
    labelSize: 46,
    photo: { ...side5Photo, mirror: true, x: side5Photo.w - RIGHT5_X - SIDE5_W, y: 682 },
    dims: {
      cols: [
        { from: 0, to: 360, label: '360' },
        { from: 360, to: 480, label: '120' },
        { from: 480, to: SIDE5_W, label: '830' },
        { from: -200, to: 0, label: '~200', y: MOULDING_Y },
        { from: 0, to: SIDE5_W, label: '1310', y: MOULDING_Y },
        { from: SIDE5_W, to: SIDE5_W + 340, label: '~340', y: MOULDING_Y },
      ],
      rows: [...side5Qr(-1), ...side5Bottom(-200, -1), ...side5Lettering(1)],
      grid: [
        [360, 0, 360, 500], [480, 0, 480, 500],
        [0, 80, DEALER5_W, 80, 'dealer'], [0, 140, SIDE5_W, 140],
        [480, 260, SIDE5_W, 260], [480, 380, SIDE5_W, 380, 'tagline'],
      ],
    },
    noQr: {
      kind: 'layout',
      shift: 40,
      w: BARE5_W,
      umo: { x: 0, ...bare5Lettering },
      num: { x: 900, ...bare5Lettering },
      dealer: { x: 0, align: 'left', ...bare5Dealer },
      tagline: { x: 0, align: 'left', ...bare5Tagline },
      taglineLarge: { x: 0, align: 'left', ...bare5TaglineLarge },
      dims: {
        cols: [
          ...bare5Cols,
          { from: -240, to: 0, label: '~240', y: MOULDING_Y },
          { from: 0, to: BARE5_W, label: '1086,5', y: MOULDING_Y },
          { from: BARE5_W, to: SIDE5_W + 340 - 40, label: '~523', y: MOULDING_Y },
        ],
        rows: [...bare5Dealer80(-1), ...side5Bottom(-240, -1), ...bare5Rows(1)],
        grid: bare5Grid(0),
      },
    },
  },
  right: {
    id: 'right',
    title: 'Правый борт',
    w: SIDE5_W,
    h: SIDE_H,
    qr: { x: 950, y: 140, size: 360 },
    umo: { x: 0, y: 140, h: 120 },
    num: { x: 690, y: 140, h: 120 },
    numGlyph: FIVE,
    decal: '#000000',
    dealer: { x: SIDE5_W, align: 'right', baseline: 71, ...side5Text, maxWidth: DEALER5_W, maxLines: 2, centred: true },
    tagline: { x: 830, align: 'right', baseline: 492, ...side5Text, maxWidth: 420, maxLines: 3 },
    obstacles: right5Obstacles,
    clearance: 10,
    labelSize: 46,
    photo: { ...side5Photo, x: RIGHT5_X, y: 682 },
    dims: {
      cols: [
        { from: 0, to: 830, label: '830' },
        { from: 830, to: 950, label: '120' },
        { from: 950, to: SIDE5_W, label: '360' },
        { from: -340, to: 0, label: '~340', y: MOULDING_Y },
        { from: 0, to: SIDE5_W, label: '1310', y: MOULDING_Y },
        { from: SIDE5_W, to: SIDE5_W + 200, label: '~200', y: MOULDING_Y },
      ],
      rows: [...side5Lettering(-1), ...side5Qr(1), ...side5Bottom(SIDE5_W + 200, 1)],
      grid: [
        [830, 0, 830, 500], [950, 0, 950, 500],
        [SIDE5_W - DEALER5_W, 80, SIDE5_W, 80, 'dealer'], [0, 140, SIDE5_W, 140],
        [0, 260, 830, 260], [0, 380, 830, 380, 'tagline'],
      ],
    },
    noQr: {
      kind: 'layout',
      shift: 183.33,
      w: BARE5_W,
      umo: { x: 0, ...bare5Lettering },
      num: { x: 900, ...bare5Lettering },
      dealer: { x: BARE5_W, align: 'right', ...bare5Dealer },
      tagline: { x: BARE5_W, align: 'right', ...bare5Tagline },
      taglineLarge: { x: BARE5_W, align: 'right', ...bare5TaglineLarge },
      dims: {
        cols: [
          ...bare5Cols,
          { from: -340 - 183.33, to: 0, label: '~523', y: MOULDING_Y },
          { from: 0, to: BARE5_W, label: '1086,5', y: MOULDING_Y },
          { from: BARE5_W, to: SIDE5_W + 200 - 183.33, label: '~240', y: MOULDING_Y },
        ],
        rows: [...bare5Rows(-1), ...bare5Dealer80(1), ...side5Bottom(SIDE5_W + 200 - 183.33, 1)],
        grid: bare5Grid(BARE5_W - DEALER5_W),
      },
    },
  },
  rear: {
    id: 'rear',
    title: 'Заднее стекло',
    w: 650,
    h: 200,
    qr: { x: 0, y: 0, size: 200 },
    umo: { x: 250, y: 0, h: 60 },
    num: { x: 580, y: 0, h: 60 },
    numGlyph: FIVE,
    decal: '#ffffff',
    // Rear text: 30 mm, one dealer line over a two-line tagline, 45 under the lettering.
    dealer: { x: 250, align: 'left', baseline: 126, size: 30, leading: 30, maxWidth: 400, maxLines: 1, oneLine: true },
    tagline: { x: 250, align: 'left', baseline: 194, size: 30, leading: 30, maxWidth: 400, maxLines: 2 },
    obstacles: [],
    clearance: 0,
    labelSize: 24,
    // 126 + 38 puts the tagline's first baseline at 164, 2 mm over Figma's, so a descender in its last line stays on the
    // 200 mm sheet, as on the sides
    stack: { gap: 38, textTop: 105 },
    // The rear photo is the Figma frame's, cropped to 2080 × 1980 around the car, the window darkened as there.
    photo: { src: rear5Img, w: 2080, h: 1980, background: '#999999', x: 733, y: 860, view: [100, 0, 1880, 1980] },
    dims: {
      cols: [
        { from: 0, to: 200, label: '200' },
        { from: 200, to: 250, label: '50' },
        { from: 250, to: 650, label: '400' },
        { from: 0, to: 650, label: '650', y: 270 },
      ],
      rows: [
        { from: 0, to: 60, label: '60', x: 1 },
        { from: 60, to: 105, label: '45', x: 1 },
        { from: 105, to: 200, label: '95', x: 1 },
        { from: 0, to: 200, label: '200', x: -1 },
      ],
      grid: [
        [200, 0, 200, 200], [250, 0, 250, 200],
        [250, 60, 650, 60], [250, 105, 650, 105],
      ],
    },
    noQr: {
      kind: 'cut',
      side: 'start',
      width: 250,
      centre: true,
      dims: {
        cols: [{ from: 0, to: 400, label: '400' }],
        rows: [
          { from: 0, to: 60, label: '60', x: 1 },
          { from: 60, to: 105, label: '45', x: 1 },
          { from: 105, to: 200, label: '95', x: 1 },
        ],
        grid: [[0, 60, 400, 60], [0, 105, 400, 105]],
      },
    },
  },
}

export type Model = 'umo8' | 'umo5'
export const LIVERIES: Record<Model, Record<SurfaceId, Surface>> = { umo8: UMO8, umo5: UMO5 }
