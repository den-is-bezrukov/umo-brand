import sideImg from '@/assets/livery/umo8-side.webp'
import rearImg from '@/assets/livery/umo8-rear.webp'

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
    rows: { from: number; to: number; label: string; x: number; at?: number; part?: TextPart }[]
    grid: [number, number, number, number, TextPart?][]
  }
  /**
   * The sheet without the QR: its column (the code and the gap after it) is cut out at the `side` it sits on, so the
   * lettering moves into its place, nearer the front of the car, and the sheet gets narrower; `dims` replace the spec's.
   * `centre` keeps the narrower sheet centred where the full one was (the rear window) instead of at the front edge,
   * and centres the text on it.
   */
  noQr: { side: 'start' | 'end'; width: number; centre?: boolean; dims: Surface['dims'] }
}

const SIDE_W = 1280
const SIDE_H = 500

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
  { from: -100, to: 0, label: '~100', x, at },
  { from: 500, to: 650, label: '~150', x, at },
]
// The lettering, the gap under it and the tagline zone
const letteringRows = (x: number): Surface['dims']['rows'] => [
  { from: 140, to: 260, label: '120', x },
  { from: 260, to: 380, label: '120', x, part: 'tagline' },
  { from: 380, to: 500, label: '120', x, part: 'tagline' },
]
// Along the moulding: ~125 from the front door's edge, the sheet, and ~320 on to the rear door's edge (full sheet only)
const sideBottom = (w: number, front: 'start' | 'end'): Surface['dims']['cols'] => {
  const y = 650
  const sheet = { label: String(w), y }
  return front === 'start'
    ? [{ from: -125, to: 0, label: '~125', y }, { from: 0, to: w, ...sheet }, ...(w === SIDE_W ? [{ from: w, to: w + 320, label: '~320', y }] : [])]
    : [...(w === SIDE_W ? [{ from: -320, to: 0, label: '~320', y }] : []), { from: 0, to: w, ...sheet }, { from: w, to: w + 125, label: '~125', y }]
}

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
    dealer: { x: 0, align: 'left', baseline: 74, ...sideText, maxWidth: 450, maxLines: 2 },
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
      side: 'start',
      width: 450,
      dims: {
        cols: [{ from: -125, to: 0, label: '~125' }, { from: 0, to: 830, label: '830' }, ...sideBottom(830, 'start')],
        rows: [
          ...sideMargins(-1, -125),
          { from: 0, to: 80, label: '80', x: -1, part: 'dealer' },
          { from: 80, to: 140, label: '60', x: -1, part: 'dealer' },
          ...letteringRows(1),
        ],
        grid: [[0, 80, 450, 80, 'dealer'], [0, 140, 830, 140], [0, 260, 830, 260], [0, 380, 830, 380, 'tagline']],
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
    dealer: { x: 1280, align: 'right', baseline: 74, ...sideText, maxWidth: 450, maxLines: 2 },
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
      side: 'end',
      width: 450,
      dims: {
        cols: [{ from: 0, to: 830, label: '830' }, { from: 830, to: 955, label: '~125' }, ...sideBottom(830, 'end')],
        rows: [
          ...letteringRows(-1),
          ...sideMargins(1, 955),
          { from: 0, to: 80, label: '80', x: 1, part: 'dealer' },
          { from: 80, to: 140, label: '60', x: 1, part: 'dealer' },
        ],
        grid: [[380, 80, 830, 80, 'dealer'], [0, 140, 830, 140], [0, 260, 830, 260], [0, 380, 830, 380, 'tagline']],
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
