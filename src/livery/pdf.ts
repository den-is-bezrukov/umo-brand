import {
  PDFDocument, PDFPage, PDFOperator, PDFOperatorNames, StandardFonts, rgb,
  moveTo, lineTo, appendBezierCurve, closePath, pushGraphicsState, popGraphicsState, setFillingCmykColor, setFillingRgbColor,
} from 'pdf-lib'
import { zipSync } from 'fflate'
import type { Cmd, Sheet } from './geometry'
import type { Surface } from './layout'

const PT = 72 / 25.4
// The livery colour of the Illustrator sources: rich black, C60 M40 Y40 K100.
const INK: [number, number, number, number] = [0.6, 0.4, 0.4, 1]

/** Fills outlines given in sheet millimetres (y down), scaled by `k` and moved to (ox, oy) from the page's top left */
function fillShapes(page: PDFPage, shapes: Cmd[][], k: number, ox: number, oy: number, color: 'ink' | 'white') {
  const H = page.getHeight()
  const X = (x: number) => ox + x * k
  const Y = (y: number) => H - (oy + y * k)
  const ops: PDFOperator[] = [pushGraphicsState(), color === 'ink' ? setFillingCmykColor(...INK) : setFillingRgbColor(1, 1, 1)]
  for (const c of shapes.flat()) {
    if (c[0] === 'M') ops.push(moveTo(X(c[1]), Y(c[2])))
    else if (c[0] === 'L') ops.push(lineTo(X(c[1]), Y(c[2])))
    else if (c[0] === 'C') ops.push(appendBezierCurve(X(c[1]), Y(c[2]), X(c[3]), Y(c[4]), X(c[5]), Y(c[6])))
    else ops.push(closePath())
  }
  ops.push(PDFOperator.of(PDFOperatorNames.FillEvenOdd), popGraphicsState())
  page.pushOperators(...ops)
}

/** Cut files: each sheet at 1:1 in millimetres, lettering in the livery colour */
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
    const { photo, dims } = s.surface
    const [vx, vy, vw, vh] = photo.view
    const page = doc.addPage([vw, vh])
    page.drawRectangle({ x: 0, y: 0, width: vw, height: vh, color: photo.background === '#000000' ? rgb(0, 0, 0) : rgb(1, 1, 1) })
    const jpg = await doc.embedJpg(await photoJpeg(s.surface))
    page.drawImage(jpg, { x: -vx, y: vh - (photo.h - vy), width: photo.w, height: photo.h })
    const ox = photo.x - vx
    const oy = photo.y - vy
    fillShapes(page, s.shapes, 1, ox, oy, 'white')

    // Sheet edges and zone lines
    const X = (x: number) => ox + x
    const Y = (y: number) => vh - (oy + y)
    const { w, h } = s.surface
    const size = w / 28
    const thickness = size / 20
    const line = (x1: number, y1: number, x2: number, y2: number) =>
      page.drawLine({ start: { x: X(x1), y: Y(y1) }, end: { x: X(x2), y: Y(y2) }, thickness, color: red })
    line(0, 0, w, 0); line(w, 0, w, h); line(w, h, 0, h); line(0, h, 0, 0)
    for (const [x1, y1, x2, y2] of dims.grid) line(x1, y1, x2, y2)
    for (const c of dims.cols) {
      const y = c.y ?? -size
      line(c.from, 0, c.from, y); line(c.to, 0, c.to, y)
      if (c.y) line(c.from, y, c.to, y)
      const tw = font.widthOfTextAtSize(c.label, size)
      page.drawText(c.label, { x: X((c.from + c.to) / 2) - tw / 2, y: Y(y) + size * 0.3, size, font, color: red })
    }
    for (const r of dims.rows) {
      const x = r.x < 0 ? 0 : w
      line(x, r.from, x + r.x * size * 3, r.from); line(x, r.to, x + r.x * size * 3, r.to)
      const tw = font.widthOfTextAtSize(r.label, size)
      page.drawText(r.label, { x: X(x) + (r.x < 0 ? -tw - size * 0.4 : size * 0.4), y: Y((r.from + r.to) / 2) - size * 0.35, size, font, color: red })
    }
  }
  return doc.save()
}

/** All three files of a dealer livery in one zip, named as in the Livery folder on Yandex Disk */
export async function liveryZip(prefix: string, side: Sheet[], rear: Sheet): Promise<Blob> {
  const [livery, rearWindow, spec] = await Promise.all([
    cutFile(side, `${prefix} dealer livery`),
    cutFile([rear], `${prefix} dealer livery, rear window`),
    specFile([...side, rear], `${prefix} dealer livery spec`),
  ])
  const zip = zipSync({
    [`00_${prefix}_dealer-livery_spec.pdf`]: spec,
    [`${prefix}_dealer-livery.pdf`]: livery,
    [`${prefix}_dealer-livery_rearwindow.pdf`]: rearWindow,
  }, { level: 0 })
  return new Blob([zip as BlobPart], { type: 'application/zip' })
}
