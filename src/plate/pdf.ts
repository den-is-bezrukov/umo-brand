import {
  PDFDocument, PDFName, PDFNumber, PDFHexString, PDFOperator, PDFOperatorNames,
  moveTo, lineTo, appendBezierCurve, closePath, pushGraphicsState, popGraphicsState, rectangle, fill, setFillingCmykColor,
} from 'pdf-lib'
import { STRIP, type Strip } from './frame'

// Loaded only when the PDF is downloaded, so the guide and the constructor page don't carry pdf-lib.

const PT = 72 / 25.4

/**
 * The strip for the printer: a 501×21 mm page, the text as filled outlines in a spot colour named White, as white ink
 * for UV printing is usually marked, shown white on screen. Under it a black stand-in for the frame's plastic, so the
 * text reads as it will on the frame; it sits on a layer of its own, «Фон — не печатать», set not to print.
 */
export async function stripPdf(strip: Strip): Promise<Blob> {
  const doc = await PDFDocument.create()
  doc.setTitle('UMO plate frame 501×21')
  const page = doc.addPage([STRIP.w * PT, STRIP.h * PT])
  const tint = doc.context.obj({ FunctionType: 2, Domain: [0, 1], C0: [0, 0, 0, 0], C1: [0, 0, 0, 0], N: 1 })
  const white = doc.context.register(doc.context.obj([PDFName.of('Separation'), PDFName.of('White'), PDFName.of('DeviceCMYK'), tint]))
  // The background's layer: on screen, off when printed
  const layer = doc.context.register(doc.context.obj({
    Type: 'OCG',
    Name: PDFHexString.fromText('Фон — не печатать'),
    Usage: { Print: { PrintState: 'OFF' }, View: { ViewState: 'ON' } },
  }))
  doc.catalog.set(PDFName.of('OCProperties'), doc.context.obj({
    OCGs: [layer],
    D: { Order: [layer], ON: [layer], AS: [{ Event: 'Print', Category: ['Print'], OCGs: [layer] }] },
  }))
  const resources = page.node.Resources()!
  resources.set(PDFName.of('ColorSpace'), doc.context.obj({ White: white }))
  resources.set(PDFName.of('Properties'), doc.context.obj({ Background: layer }))

  const H = page.getHeight()
  const X = (x: number) => x * PT
  const Y = (y: number) => H - y * PT
  const ops: PDFOperator[] = [
    PDFOperator.of(PDFOperatorNames.BeginMarkedContentSequence, [PDFName.of('OC'), PDFName.of('Background')]),
    pushGraphicsState(), setFillingCmykColor(0, 0, 0, 1), rectangle(0, 0, page.getWidth(), H), fill(), popGraphicsState(),
    PDFOperator.of(PDFOperatorNames.EndMarkedContent),
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
