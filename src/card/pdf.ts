import {
  PDFDocument, PDFOperator, PDFOperatorNames,
  moveTo, lineTo, appendBezierCurve, closePath, pushGraphicsState, popGraphicsState, setFillingCmykColor,
} from 'pdf-lib'
import { CARD, FACE, BACK_LOGO, type Back } from './card'
import type { Cmd } from '@/livery/geometry'

// Loaded only when the cards are downloaded, so the page doesn't carry pdf-lib until then.

const PT = 72 / 25.4

/** Black text on white: 100% K, no rich black, so small type stays sharp whatever the registration */
const BLACK: [number, number, number, number] = [0, 0, 0, 1]

/** Which pages: the face once, then a back per person (the default), or a face and a back for each */
export type Order = 'face-once' | 'pairs'

function pathOps(cmds: Cmd[], H: number): PDFOperator[] {
  const X = (x: number) => x * PT
  const Y = (y: number) => H - y * PT
  return cmds.map(c =>
    c[0] === 'M' ? moveTo(X(c[1]), Y(c[2]))
      : c[0] === 'L' ? lineTo(X(c[1]), Y(c[2]))
        : c[0] === 'C' ? appendBezierCurve(X(c[1]), Y(c[2]), X(c[3]), Y(c[4]), X(c[5]), Y(c[6]))
          : closePath())
}

/**
 * The cards for the printer, a 90×50 mm page each at 1:1, no bleed or crop marks (the card is white, nothing runs off
 * its edge); all text and logos as filled outlines in 100% K
 */
export async function cardsPdf(backs: Back[], order: Order): Promise<Blob> {
  const doc = await PDFDocument.create()
  doc.setTitle('UMO business cards 90×50')
  const page = (art: Cmd[]) => {
    const p = doc.addPage([CARD.w * PT, CARD.h * PT])
    const H = p.getHeight()
    p.pushOperators(
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
