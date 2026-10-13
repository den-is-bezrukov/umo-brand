import {
  PDFDocument, PDFOperator, PDFOperatorNames,
  moveTo, lineTo, appendBezierCurve, closePath, pushGraphicsState, popGraphicsState, setFillingCmykColor,
} from 'pdf-lib'
import { SIGN, SIGN_KEY, LOGO, type Sign } from './sign'
import type { Cmd } from '@/livery/geometry'
import { writePdfData } from '@/ui/pdfDataWrite'

// Loaded only when the PDF is downloaded, so the page doesn't carry pdf-lib until then.

const PT = 72 / 25.4
/** The source's colour, C60 M40 Y40 K100, as the livery's and the name tag's */
const INK: [number, number, number, number] = [0.6, 0.4, 0.4, 1]

/**
 * The sign for the maker, as the source: a 480×680 mm page at 1:1, no bleed, the logo and text as filled outlines; the
 * fields as typed in its info, so the PDF dropped back on the page opens them
 */
export async function signPdf(sign: Sign, data: unknown): Promise<Blob> {
  const doc = await PDFDocument.create()
  doc.setTitle('UMO hours sign 480×680')
  writePdfData(doc, SIGN_KEY, data)
  const page = doc.addPage([SIGN.w * PT, SIGN.h * PT])
  const H = page.getHeight()
  const X = (x: number) => x * PT
  const Y = (y: number) => H - y * PT
  const path = (cmds: Cmd[]) => cmds.map(c =>
    c[0] === 'M' ? moveTo(X(c[1]), Y(c[2]))
      : c[0] === 'L' ? lineTo(X(c[1]), Y(c[2]))
        : c[0] === 'C' ? appendBezierCurve(X(c[1]), Y(c[2]), X(c[3]), Y(c[4]), X(c[5]), Y(c[6]))
          : closePath())
  page.pushOperators(
    pushGraphicsState(),
    setFillingCmykColor(...INK),
    // The logo's counters are cut out by even-odd, the glyphs' by their winding
    ...path(LOGO),
    PDFOperator.of(PDFOperatorNames.FillEvenOdd),
    ...path(sign.parts.flatMap(p => p.cmds)),
    PDFOperator.of(PDFOperatorNames.FillNonZero),
    popGraphicsState(),
  )
  const bytes = await doc.save({ useObjectStreams: false })
  return new Blob([bytes as BlobPart], { type: 'application/pdf' })
}
