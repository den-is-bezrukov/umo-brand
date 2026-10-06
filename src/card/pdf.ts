import {
  PDFDocument, PDFOperator, PDFOperatorNames, PDFNumber, PDFName,
  moveTo, lineTo, appendBezierCurve, closePath, pushGraphicsState, popGraphicsState, setFillingCmykColor, setStrokingCmykColor, stroke,
} from 'pdf-lib'
import { CARD, FACE, BACK_LOGO, type Back } from './card'
import type { Cmd } from '@/livery/geometry'

// Loaded only when the cards are downloaded, so the page doesn't carry pdf-lib until then.

const PT = 72 / 25.4
/** Bleed: the card is white, so nothing runs into it, but printers ask for it */
const BLEED = 2
/** Crop marks start this far from the trim, past the bleed, and run 4 mm */
const MARK_GAP = 3
const MARK = 4
/** The page: the card, the marks around it */
const SLUG = MARK_GAP + MARK

/** Black text on white: 100% K, no rich black, so small type stays sharp whatever the registration */
const BLACK: [number, number, number, number] = [0, 0, 0, 1]

/** Which pages: the face once, then a back per person (the default), or a face and a back for each */
export type Order = 'face-once' | 'pairs'

function pathOps(cmds: Cmd[], H: number): PDFOperator[] {
  const X = (x: number) => (x + SLUG) * PT
  const Y = (y: number) => H - (y + SLUG) * PT
  return cmds.map(c =>
    c[0] === 'M' ? moveTo(X(c[1]), Y(c[2]))
      : c[0] === 'L' ? lineTo(X(c[1]), Y(c[2]))
        : c[0] === 'C' ? appendBezierCurve(X(c[1]), Y(c[2]), X(c[3]), Y(c[4]), X(c[5]), Y(c[6]))
          : closePath())
}

/** Crop marks at the four corners, outside the bleed */
function marks(): Cmd[] {
  const { w, h } = CARD
  const cmds: Cmd[] = []
  for (const x of [0, w]) {
    for (const y of [0, h]) {
      const sx = x ? 1 : -1
      const sy = y ? 1 : -1
      cmds.push(['M', x + sx * MARK_GAP, y], ['L', x + sx * SLUG, y])
      cmds.push(['M', x, y + sy * MARK_GAP], ['L', x, y + sy * SLUG])
    }
  }
  return cmds
}

/**
 * The cards for the printer, 90×50 mm at 1:1 with 2 mm of bleed and crop marks, the trim and bleed boxes set; all
 * text and logos as filled outlines in 100% K
 */
export async function cardsPdf(backs: Back[], order: Order): Promise<Blob> {
  const doc = await PDFDocument.create()
  doc.setTitle('UMO business cards 90×50')
  const page = (art: Cmd[]) => {
    const p = doc.addPage([(CARD.w + 2 * SLUG) * PT, (CARD.h + 2 * SLUG) * PT])
    const H = p.getHeight()
    const box = (inset: number) => [(SLUG - inset) * PT, (SLUG - inset) * PT, (SLUG + CARD.w + inset) * PT, (SLUG + CARD.h + inset) * PT]
    p.node.set(PDFName.of('TrimBox'), doc.context.obj(box(0)))
    p.node.set(PDFName.of('BleedBox'), doc.context.obj(box(BLEED)))
    p.pushOperators(
      pushGraphicsState(), setStrokingCmykColor(...BLACK), PDFOperator.of(PDFOperatorNames.SetLineWidth, [PDFNumber.of(0.25)]),
      ...pathOps(marks(), H), stroke(), popGraphicsState(),
      pushGraphicsState(), setFillingCmykColor(...BLACK),
      ...pathOps(art, H), PDFOperator.of(PDFOperatorNames.FillEvenOdd),
      popGraphicsState(),
    )
  }
  const back = (b: Back) => [...BACK_LOGO, ...Object.values(b.fields).flat(), ...b.qr]
  if (order === 'face-once') {
    page(FACE)
    backs.forEach(b => page(back(b)))
  } else {
    backs.forEach(b => { page(FACE); page(back(b)) })
  }
  const bytes = await doc.save()
  return new Blob([bytes as BlobPart], { type: 'application/pdf' })
}
