import {
  PDFDocument, PDFPage, PDFOperator, PDFOperatorNames, StandardFonts, rgb,
  moveTo, lineTo, appendBezierCurve, closePath, pushGraphicsState, popGraphicsState, setFillingCmykColor, setFillingRgbColor,
} from 'pdf-lib'
import { zipSync } from 'fflate'
import { specMarks, type Cmd, type Sheet } from './geometry'
import type { Surface } from './layout'

const PT = 72 / 25.4
// The livery colour of the Illustrator sources: rich black, C60 M40 Y40 K100.
const INK: [number, number, number, number] = [0.6, 0.4, 0.4, 1]

/** Fills outlines given in sheet millimetres (y down), scaled by `k` and moved to (ox, oy) from the page's top left */
function fillShapes(page: PDFPage, shapes: Cmd[][], k: number, ox: number, oy: number, color: 'ink' | 'white' | 'black') {
  const H = page.getHeight()
  const X = (x: number) => ox + x * k
  const Y = (y: number) => H - (oy + y * k)
  const ops: PDFOperator[] = [pushGraphicsState(), color === 'ink' ? setFillingCmykColor(...INK) : color === 'black' ? setFillingRgbColor(0, 0, 0) : setFillingRgbColor(1, 1, 1)]
  for (const c of shapes.flat()) {
    if (c[0] === 'M') ops.push(moveTo(X(c[1]), Y(c[2])))
    else if (c[0] === 'L') ops.push(lineTo(X(c[1]), Y(c[2])))
    else if (c[0] === 'C') ops.push(appendBezierCurve(X(c[1]), Y(c[2]), X(c[3]), Y(c[4]), X(c[5]), Y(c[6])))
    else ops.push(closePath())
  }
  ops.push(PDFOperator.of(PDFOperatorNames.FillEvenOdd), popGraphicsState())
  page.pushOperators(...ops)
}

/** Decals: each sheet on a page of its own at 1:1 in millimetres, lettering in the livery colour */
async function cutFile(sheets: Sheet[], title: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.setTitle(title)
  for (const s of sheets) {
    const page = doc.addPage([s.surface.w * PT, s.surface.h * PT])
    fillShapes(page, s.shapes, PT, 0, 0, 'ink')
  }
  return doc.save()
}

/** The car photo flattened onto its background, as a JPEG the PDF can carry */
async function photoJpeg(surface: Surface): Promise<Uint8Array> {
  const img = new Image()
  img.src = surface.photo.src
  await img.decode()
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = surface.photo.background
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  if (surface.photo.mirror) { ctx.translate(canvas.width, 0); ctx.scale(-1, 1) }
  ctx.drawImage(img, 0, 0)
  const blob = await new Promise<Blob>(resolve => canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.9))
  return new Uint8Array(await blob.arrayBuffer())
}

/**
 * The spec: each surface on the car with its dimensions in red, like 00_UMO8_dealer-livery_spec.pdf. One point on these
 * pages is a millimetre on the car, so the numbers can be checked with a ruler in Illustrator.
 */
async function specFile(sheets: Sheet[], title: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.setTitle(title)
  const font = await doc.embedFont(StandardFonts.HelveticaBold)
  const red = rgb(1, 0, 0)
  for (const s of sheets) {
    const { photo } = s.surface
    const [vx, vy, vw, vh] = photo.view
    const page = doc.addPage([vw, vh])
    page.drawRectangle({ x: 0, y: 0, width: vw, height: vh, color: photo.background === '#000000' ? rgb(0, 0, 0) : rgb(1, 1, 1) })
    const jpg = await doc.embedJpg(await photoJpeg(s.surface))
    page.drawImage(jpg, { x: -vx, y: vh - (photo.h - vy), width: photo.w, height: photo.h })
    const ox = photo.x - vx
    const oy = photo.y - vy
    // The decals as they look on the car: white, or black on the white UMO 5's sides
    fillShapes(page, s.shapes, 1, ox, oy, s.surface.decal === '#000000' ? 'black' : 'white')

    // Dimensions, as in the preview
    const marks = specMarks(s.surface)
    const X = (x: number) => ox + x
    const Y = (y: number) => vh - (oy + y)
    for (const [x1, y1, x2, y2] of marks.lines) {
      page.drawLine({ start: { x: X(x1), y: Y(y1) }, end: { x: X(x2), y: Y(y2) }, thickness: marks.thickness, color: red })
    }
    for (const l of marks.labels) {
      const tw = font.widthOfTextAtSize(l.text, marks.size)
      const dx = l.align === 'left' ? 0 : l.align === 'center' ? -tw / 2 : -tw
      page.drawText(l.text, { x: X(l.x) + dx, y: Y(l.y), size: marks.size, font, color: red })
    }
  }
  return doc.save()
}

/**
 * A dealer livery in one zip: the decals (left side, right side, rear window — one page each, every page at its own
 * size) and the spec, named as in the Livery folder on Yandex Disk
 */
export async function liveryZip(prefix: string, sheets: Sheet[]): Promise<Blob> {
  const [livery, spec] = await Promise.all([
    cutFile(sheets, `${prefix} dealer livery`),
    specFile(sheets, `${prefix} dealer livery spec`),
  ])
  const zip = zipSync({
    [`00_${prefix}_dealer-livery_spec.pdf`]: spec,
    [`${prefix}_dealer-livery.pdf`]: livery,
  }, { level: 0 })
  return new Blob([zip as BlobPart], { type: 'application/zip' })
}
