import {
  PDFDocument, PDFOperator, PDFOperatorNames,
  moveTo, lineTo, appendBezierCurve, closePath, pushGraphicsState, popGraphicsState, setFillingCmykColor,
  setStrokingCmykColor, setLineWidth, stroke,
} from 'pdf-lib'
import { CARD, FACE, BACK_LOGO, type Back } from './card'
import type { Cmd } from '@/livery/geometry'

// Loaded only when the cards are downloaded, so the page doesn't carry pdf-lib until then.

const PT = 72 / 25.4

/** Black text on white: 100% K, no rich black, so small type stays sharp whatever the registration */
const BLACK: [number, number, number, number] = [0, 0, 0, 1]

/**
 * `faceEach`: a face before every back, rather than one face and then the backs (the default). `marks`: crop marks,
 * the page then 3 mm larger on every side, the marks in that margin from 1 mm off the card's edge, as no bleed is
 * needed (the card is white) and the printers' margins were 3 mm at most
 */
export interface PageOptions { faceEach: boolean; marks: boolean }

const MARGIN = 3
const MARK_OFF = 1
/** Registration black (100% of every ink), as crop marks are, so they show on every plate */
const REGISTRATION: [number, number, number, number] = [1, 1, 1, 1]

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
 * The cards for the printer, a 90×50 mm page each at 1:1, no bleed (the card is white, nothing runs off its edge),
 * crop marks if asked; all text and logos as filled outlines in 100% K
 */
export async function cardsPdf(backs: Back[], { faceEach, marks }: PageOptions): Promise<Blob> {
  const doc = await PDFDocument.create()
  doc.setTitle('UMO business cards 90×50')
  const m = marks ? MARGIN : 0
  const page = (art: Cmd[]) => {
    const p = doc.addPage([(CARD.w + 2 * m) * PT, (CARD.h + 2 * m) * PT])
    const H = p.getHeight()
    // The card's own box, for the printer's imposition
    p.setTrimBox(m * PT, m * PT, CARD.w * PT, CARD.h * PT)
    const at = (cmds: Cmd[]): Cmd[] => cmds.map(c => c.map((v, i) => (i === 0 ? v : (v as number) + m)) as Cmd)
    p.pushOperators(
      pushGraphicsState(), setFillingCmykColor(...BLACK),
      ...pathOps(at(art), H), PDFOperator.of(PDFOperatorNames.FillEvenOdd),
      popGraphicsState(),
    )
    if (!marks) return
    // Two short lines at each corner, along the card's edges, in the margin
    const X = (x: number) => x * PT
    const Y = (y: number) => H - y * PT
    const [l, t, r, b] = [m, m, m + CARD.w, m + CARD.h]
    const [W, Hm] = [CARD.w + 2 * m, CARD.h + 2 * m]
    const lines: [number, number, number, number][] = [
      [l, 0, l, t - MARK_OFF], [r, 0, r, t - MARK_OFF], [l, b + MARK_OFF, l, Hm], [r, b + MARK_OFF, r, Hm],
      [0, t, l - MARK_OFF, t], [0, b, l - MARK_OFF, b], [r + MARK_OFF, t, W, t], [r + MARK_OFF, b, W, b],
    ]
    p.pushOperators(
      pushGraphicsState(), setStrokingCmykColor(...REGISTRATION), setLineWidth(0.25),
      ...lines.flatMap(([x1, y1, x2, y2]) => [moveTo(X(x1), Y(y1)), lineTo(X(x2), Y(y2))]), stroke(),
      popGraphicsState(),
    )
  }
  const back = (b: Back) => [...BACK_LOGO, ...Object.values(b.fields).flat(), ...b.qr]
  if (!faceEach) {
    page(FACE)
    backs.forEach(b => page(back(b)))
  } else {
    backs.forEach(b => { page(FACE); page(back(b)) })
  }
  const bytes = await doc.save()
  return new Blob([bytes as BlobPart], { type: 'application/pdf' })
}
