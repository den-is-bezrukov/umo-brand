import {
  PDFDocument, PDFName, PDFNumber, PDFOperator, PDFOperatorNames,
  moveTo, lineTo, appendBezierCurve, closePath, pushGraphicsState, popGraphicsState,
} from 'pdf-lib'
import { STRIP, type Strip } from './frame'

// Loaded only when the PDF is downloaded, so the guide and the constructor page don't carry pdf-lib.

const PT = 72 / 25.4

/**
 * The strip for the printer: a 501×21 mm page, the text as filled outlines in a spot colour named White, as white ink
 * for UV printing is usually marked. Its stand-in for screens and proofs is cyan, so the text shows on a white page.
 */
export async function stripPdf(strip: Strip): Promise<Blob> {
  const doc = await PDFDocument.create()
  doc.setTitle('UMO plate frame 501×21')
  const page = doc.addPage([STRIP.w * PT, STRIP.h * PT])
  const tint = doc.context.obj({ FunctionType: 2, Domain: [0, 1], C0: [0, 0, 0, 0], C1: [1, 0, 0, 0], N: 1 })
  const white = doc.context.register(doc.context.obj([PDFName.of('Separation'), PDFName.of('White'), PDFName.of('DeviceCMYK'), tint]))
  page.node.Resources()!.set(PDFName.of('ColorSpace'), doc.context.obj({ White: white }))

  const H = page.getHeight()
  const X = (x: number) => x * PT
  const Y = (y: number) => H - y * PT
  const ops: PDFOperator[] = [
    pushGraphicsState(),
    PDFOperator.of(PDFOperatorNames.NonStrokingColorspace, [PDFName.of('White')]),
    PDFOperator.of(PDFOperatorNames.NonStrokingColorN, [PDFNumber.of(1)]),
  ]
  for (const c of strip.cmds) {
    if (c[0] === 'M') ops.push(moveTo(X(c[1]), Y(c[2])))
    else if (c[0] === 'L') ops.push(lineTo(X(c[1]), Y(c[2])))
    else if (c[0] === 'C') ops.push(appendBezierCurve(X(c[1]), Y(c[2]), X(c[3]), Y(c[4]), X(c[5]), Y(c[6])))
    else ops.push(closePath())
  }
  ops.push(PDFOperator.of(PDFOperatorNames.FillNonZero), popGraphicsState())
  page.pushOperators(...ops)
  const bytes = await doc.save()
  return new Blob([bytes as BlobPart], { type: 'application/pdf' })
}
