import {
  PDFDocument, PDFOperator, PDFOperatorNames,
  moveTo, lineTo, appendBezierCurve, closePath, pushGraphicsState, popGraphicsState, setFillingCmykColor, rectangle, fill,
} from 'pdf-lib'
import { SIGN, SIGN_KEY, VARIANTS, type Sign } from './sign'
import type { Cmd } from '@/livery/geometry'
import { writePdfData } from '@/ui/pdfDataWrite'
import { embedFonts, textOps, type LiveFonts } from '@/ui/liveTextPdf'
import type { TextLine } from '@/ui/liveText'
import { SITE } from '@/site'

// Loaded only when the PDF is downloaded, so the page doesn't carry pdf-lib until then.

const PT = 72 / 25.4
/** The file's name, also its title, which Chrome shows on the tab of a PDF opened from a link */
export const SIGN_FILE = `${SITE.file}_hours-sign.pdf`
/** The editable template's name */
export const SIGN_TEMPLATE = `${SITE.file}_hours-sign_template.pdf`
/** The source's colour, C60 M40 Y40 K100, as the livery's and the name tag's; a black variant's ground */
const INK: [number, number, number, number] = [0.6, 0.4, 0.4, 1]
/** White on a black ground: no ink */
const WHITE: [number, number, number, number] = [0, 0, 0, 0]

/**
 * The sign for the maker, as the source: a page at 1:1, no bleed, the logo and text as filled outlines (white on a
 * black ground in a `dark` variant); the fields as typed in its info, so the PDF dropped back on the page opens them
 */
export async function signPdf(sign: Sign, data: unknown, variant = 0): Promise<Blob> {
  const doc = await PDFDocument.create()
  doc.setTitle(SIGN_FILE)
  writePdfData(doc, SIGN_KEY, data)
  return signPage(doc, sign, variant)
}

/** The editable template: the same page, the text live in the brand font (`src/ui/liveTextPdf.ts`), the logo in outlines */
export async function signTemplate(sign: Sign, lines: TextLine[], variant = 0): Promise<Blob> {
  const doc = await PDFDocument.create()
  doc.setTitle(SIGN_TEMPLATE)
  return signPage(doc, sign, variant, lines, await embedFonts(doc))
}

/** The page: the text as outlines, or, with `live`, the noted lines as text */
async function signPage(doc: PDFDocument, sign: Sign, variant: number, lines: TextLine[] = [], live?: LiveFonts): Promise<Blob> {
  const dark = !!VARIANTS[variant]?.dark
  const page = doc.addPage([SIGN.w * PT, SIGN.h * PT])
  const H = page.getHeight()
  const X = (x: number) => x * PT
  const Y = (y: number) => H - y * PT
  const path = (cmds: Cmd[]) => cmds.map(c =>
    c[0] === 'M' ? moveTo(X(c[1]), Y(c[2]))
      : c[0] === 'L' ? lineTo(X(c[1]), Y(c[2]))
        : c[0] === 'C' ? appendBezierCurve(X(c[1]), Y(c[2]), X(c[3]), Y(c[4]), X(c[5]), Y(c[6]))
          : closePath())
  if (dark) page.pushOperators(pushGraphicsState(), setFillingCmykColor(...INK), rectangle(0, 0, SIGN.w * PT, SIGN.h * PT), fill(), popGraphicsState())
  page.pushOperators(
    pushGraphicsState(),
    setFillingCmykColor(...(dark ? WHITE : INK)),
    // The logo's counters are cut out by even-odd, the glyphs' by their winding
    ...path(sign.logo),
    PDFOperator.of(PDFOperatorNames.FillEvenOdd),
    ...(live ? [] : [...path(sign.parts.flatMap(p => p.cmds)), PDFOperator.of(PDFOperatorNames.FillNonZero)]),
    popGraphicsState(),
  )
  if (live) page.pushOperators(...textOps(page, live, lines, (x, y) => [X(x), Y(y)], PT, dark ? WHITE : INK))
  const bytes = await doc.save({ useObjectStreams: false })
  return new Blob([bytes as BlobPart], { type: 'application/pdf' })
}
