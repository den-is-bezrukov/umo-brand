import sideImg from '@/assets/livery/umo8-side.webp'
import rearImg from '@/assets/livery/umo8-rear.webp'

// Dealer livery surfaces, in millimetres, from 00_UMO8_dealer-livery_spec.pdf and the Illustrator sources next to it
// (Yandex Disk: Livery/UMO 8). Every surface is a sheet with its origin at the top left; the same numbers drive the
// preview, the cut files and the spec.

export type SurfaceId = 'left' | 'right' | 'rear'

export interface TextBlock {
  /** Left edge for left-aligned text, right edge for right-aligned */
  x: number
  align: 'left' | 'right'
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
   * Dimension lines for the spec: horizontal ones above the sheet, vertical ones beside it, and the zone grid inside
   * it as [x1, y1, x2, y2] segments
   */
  dims: {
    cols: { from: number; to: number; label: string; y?: number }[]
    rows: { from: number; to: number; label: string; x: number }[]
    grid: [number, number, number, number][]
  }
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
    photo: { ...sidePhoto, x: 1709, y: 749 },
    dims: {
      cols: [
        { from: -125, to: 0, label: '~125' },
        { from: 0, to: 360, label: '360' },
        { from: 360, to: 450, label: '90' },
        { from: 450, to: 1280, label: '830' },
        { from: 0, to: 1280, label: '1280', y: 650 },
      ],
      rows: [
        { from: 0, to: 80, label: '80', x: -1 },
        { from: 80, to: 140, label: '60', x: -1 },
        { from: 140, to: 500, label: '360', x: -1 },
        { from: 140, to: 260, label: '120', x: 1 },
        { from: 260, to: 380, label: '120', x: 1 },
        { from: 380, to: 500, label: '120', x: 1 },
      ],
      grid: [
        [360, 0, 360, 500], [450, 0, 450, 500],
        [0, 80, 450, 80], [0, 140, 1280, 140],
        [450, 260, 1280, 260], [450, 380, 1280, 380],
      ],
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
    photo: { ...sidePhoto, mirror: true, x: 4800 - 1709 - SIDE_W, y: 749 },
    dims: {
      cols: [
        { from: 0, to: 830, label: '830' },
        { from: 830, to: 920, label: '90' },
        { from: 920, to: 1280, label: '360' },
        { from: 1280, to: 1405, label: '~125' },
        { from: 0, to: 1280, label: '1280', y: 650 },
      ],
      rows: [
        { from: 140, to: 260, label: '120', x: -1 },
        { from: 260, to: 380, label: '120', x: -1 },
        { from: 380, to: 500, label: '120', x: -1 },
        { from: 0, to: 80, label: '80', x: 1 },
        { from: 80, to: 140, label: '60', x: 1 },
        { from: 140, to: 500, label: '360', x: 1 },
      ],
      grid: [
        [920, 0, 920, 500], [830, 0, 830, 500],
        [830, 80, 1280, 80], [0, 140, 1280, 140],
        [0, 260, 830, 260], [0, 380, 830, 380],
      ],
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
  },
}

export const SURFACES: SurfaceId[] = ['left', 'right', 'rear']
