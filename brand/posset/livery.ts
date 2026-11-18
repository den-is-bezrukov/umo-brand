import type { BrandLivery, Surface, SurfaceId } from '@/livery/surface'
import { LOGO } from './logo'
import noCar from './assets/livery/no-car.svg'





const SIDE_W = 1280
const SIDE_H = 500
const sideText = { size: 40, leading: 40 }

const LETTERING = { h: 100, y: 150 }

const NONE = { w: 1, h: 1, d: '' }

const BARE_W = 1100
const bareTagline = { baseline: 492, ...sideText, maxWidth: 400, maxLines: 3 }
const bareTaglineLarge = { baseline: 488, size: 60, leading: 60, maxWidth: 850, maxLines: 2 }


const field = (x: number, y: number) => ({ src: noCar, w: 4800, h: 2400, background: '#000000', x, y, view: [80, 60, 4640, 2280] as [number, number, number, number] })

const sideDims = (front: 'start' | 'end'): Surface['dims'] => ({
  cols: front === 'start'
    ? [{ from: 0, to: 360, label: '360' }, { from: 360, to: 450, label: '90' }, { from: 450, to: SIDE_W, label: '830' }]
    : [{ from: 0, to: 830, label: '830' }, { from: 830, to: 920, label: '90' }, { from: 920, to: SIDE_W, label: '360' }],
  rows: [
    { from: 0, to: 80, label: '80', x: front === 'start' ? -1 : 1, part: 'point' },
    { from: 80, to: 140, label: '60', x: front === 'start' ? -1 : 1, part: 'point' },
    { from: 140, to: 500, label: '360', x: front === 'start' ? -1 : 1 },
  ],
  grid: [[0, 140, SIDE_W, 140]],
})
const bareDims: Surface['dims'] = {
  cols: [{ from: 0, to: BARE_W, label: String(BARE_W) }],
  rows: [{ from: 0, to: 140, label: '140', x: -1, part: 'point' }, { from: 140, to: 500, label: '360', x: -1 }],
  grid: [[0, 140, BARE_W, 140]],
}

const SURFACES: Record<SurfaceId, Surface> = {
  left: {
    id: 'left',
    title: 'Левый борт',
    w: SIDE_W,
    h: SIDE_H,
    qr: { x: 0, y: 140, size: 360 },
    wordmark: { x: 450, ...LETTERING },
    num: { x: SIDE_W, ...LETTERING },
    numGlyph: NONE,
    point: { x: 0, align: 'left', baseline: 74, ...sideText, maxWidth: 500, maxLines: 2, centred: true },
    tagline: { x: 450, align: 'left', baseline: 492, ...sideText, maxWidth: 400, maxLines: 3 },
    obstacles: [],
    clearance: 10,
    labelSize: 46,
    photo: field(1709, 749),
    dims: sideDims('start'),
    noQr: {
      kind: 'layout',
      shift: 0,
      w: BARE_W,
      wordmark: { x: 0, ...LETTERING },
      num: { x: BARE_W, ...LETTERING },
      point: { x: 0, align: 'left', baseline: 74, ...sideText, maxWidth: 500, maxLines: 2, centred: true },
      tagline: { x: 0, align: 'left', ...bareTagline },
      taglineLarge: { x: 0, align: 'left', ...bareTaglineLarge },
      dims: bareDims,
    },
  },
  right: {
    id: 'right',
    title: 'Правый борт',
    w: SIDE_W,
    h: SIDE_H,
    qr: { x: 920, y: 140, size: 360 },
    wordmark: { x: 30, ...LETTERING },
    num: { x: 830, ...LETTERING },
    numGlyph: NONE,
    point: { x: SIDE_W, align: 'right', baseline: 74, ...sideText, maxWidth: 500, maxLines: 2, centred: true },
    tagline: { x: 830, align: 'right', baseline: 492, ...sideText, maxWidth: 400, maxLines: 3 },
    obstacles: [],
    clearance: 10,
    labelSize: 46,
    photo: field(4800 - 1709 - SIDE_W, 749),
    dims: sideDims('end'),
    noQr: {
      kind: 'layout',
      shift: SIDE_W - BARE_W,
      w: BARE_W,
      wordmark: { x: BARE_W - 800, ...LETTERING },
      num: { x: BARE_W, ...LETTERING },
      point: { x: BARE_W, align: 'right', baseline: 74, ...sideText, maxWidth: 500, maxLines: 2, centred: true },
      tagline: { x: BARE_W, align: 'right', ...bareTagline },
      taglineLarge: { x: BARE_W, align: 'right', ...bareTaglineLarge },
      dims: bareDims,
    },
  },
  rear: {
    id: 'rear',
    title: 'Заднее стекло',
    w: 835,
    h: 250,
    qr: { x: 0, y: 0, size: 250 },
    wordmark: { x: 325, y: 0, h: 60 },
    num: { x: 835, y: 0, h: 60 },
    numGlyph: NONE,
    point: { x: 325, align: 'left', baseline: 152.5, size: 37.5, leading: 37.5, maxWidth: 510, maxLines: 1, oneLine: true },
    tagline: { x: 325, align: 'left', baseline: 242.5, size: 37.5, leading: 37.5, maxWidth: 510, maxLines: 2 },
    obstacles: [],
    clearance: 0,
    labelSize: 30,
    stack: { gap: 52.5, textTop: 125 },
    photo: { src: noCar, w: 2280, h: 2400, background: '#000000', x: 723, y: 1075, view: [180, 60, 1920, 2240] },
    dims: {
      cols: [{ from: 0, to: 250, label: '250' }, { from: 250, to: 325, label: '75' }, { from: 325, to: 835, label: '510' }],
      rows: [{ from: 0, to: 250, label: '250', x: -1 }],
      grid: [[250, 0, 250, 250], [325, 0, 325, 250]],
    },
    noQr: {
      kind: 'cut',
      side: 'start',
      width: 325,
      centre: true,
      dims: { cols: [{ from: 0, to: 510, label: '510' }], rows: [], grid: [] },
    },
  },
}

export const LIVERY: BrandLivery = {
  vehicles: [
    { id: 'van', name: 'Грузовой', page: 'https://posset.example' },
    { id: 'hatch', name: 'Легковой', page: 'https://posset.example' },
  ],
  wordmark: LOGO,
  smallQr: { size: 160, gap: 100 },
  surfaces: { van: SURFACES, hatch: SURFACES },
}
