import type { Font } from 'opentype.js'
import {
  PDFOperator, PDFOperatorNames, PDFArray, PDFNumber, type PDFDocument, type PDFFont, type PDFPage,
  pushGraphicsState, popGraphicsState, setFillingCmykColor, beginText, endText, setTextMatrix, setFontAndSize,
} from 'pdf-lib'
import type { TextLine } from './liveText'
import { FONTS } from '@brand/fonts'

// The noted lines (`liveText.ts`) written into a template's pages, loaded with the PDF only: each letter at its pen
// (kerning and tracking as TJ adjustments), so nothing moves. The font goes in whole and under its own name:
// Illustrator, importing a PDF's pages, outlined text set in a subset, and pdf-lib's random suffix kept it from the
// installed font.

/** The fonts a template writes in, by their PostScript names: the brand's Regular and Medium (`@brand/fonts`), whole */
export type LiveFonts = Map<string, PDFFont>

/** fontkit (some 320 KB) loads here, with the template only: the files to print are in outlines and don't need it */
export async function embedFonts(doc: PDFDocument): Promise<LiveFonts> {
  doc.registerFontkit((await import('@pdf-lib/fontkit')).default)
  const [regular, medium] = await embedFaces(doc, [FONTS.regular, FONTS.medium])
  return new Map([[FONTS.regular.name, regular], [FONTS.medium.name, medium]])
}

/**
 * Faces whole and under their own names (pdf-lib would add a random suffix), so Illustrator finds the installed ones;
 * fontkit registered. Fetched at once, embedded in the order given, so the file comes out the same every time
 */
export async function embedFaces(doc: PDFDocument, faces: { file: string; name: string }[]) {
  const bytes = await Promise.all(faces.map(f => fetch(`${import.meta.env.BASE_URL}${f.file}`).then(r => r.arrayBuffer())))
  const fonts: PDFFont[] = []
  for (const [i, f] of faces.entries()) fonts.push(await doc.embedFont(bytes[i], { subset: false, customName: f.name }))
  return fonts
}

/** The font's own name, as the brand's Medium or Regular: opentype.js 2 keeps it per platform */
const psName = (font: Font) => {
  const n = font.names as unknown as Record<string, { postScriptName?: { en?: string } } | undefined>
  return (n.windows?.postScriptName?.en ?? n.macintosh?.postScriptName?.en ?? '') === FONTS.medium.name ? FONTS.medium.name : FONTS.regular.name
}

/** A face's name in a page's resources: CoFoRegular for CoFoSans-Regular */
const resourceName = (name: string) => FONTS.short + (name === FONTS.medium.name ? 'Medium' : 'Regular')

/**
 * The lines as text on a page: `toPage(x, y)` turns the generator's units into the page's points (y up), `scale`
 * its units into points; `fill` the colour, CMYK (a `white` line, white) or the operators setting one (a spot colour)
 */
export function textOps(page: PDFPage, fonts: LiveFonts, lines: TextLine[], toPage: (x: number, y: number) => [number, number], scale: number, fill: [number, number, number, number] | PDFOperator[]): PDFOperator[] {
  if (!lines.length) return []
  const names = new Map([...fonts].map(([n, f]) => [n, page.node.newFontDictionary(resourceName(n), f.ref)]))
  const cmyk = typeof fill[0] === 'number' ? fill as [number, number, number, number] : undefined
  const ops: PDFOperator[] = [pushGraphicsState(), ...(cmyk ? [setFillingCmykColor(...cmyk)] : fill as PDFOperator[]), beginText()]
  for (const line of lines) {
    const name = psName(line.font)
    const font = fonts.get(name)!
    const size = line.size * scale
    const tj = PDFArray.withContext(page.doc.context)
    line.chars.forEach((c, i) => {
      tj.push(font.encodeText(c.ch))
      const next = line.chars[i + 1]
      if (!next) return
      // The gap to the next pen, less the plain glyph's own advance: kerning, tracking, a substituted width
      const gap = (next.x - c.x) * scale - font.widthOfTextAtSize(c.ch, size)
      if (Math.abs(gap) > 0.001) tj.push(PDFNumber.of(Math.round(-gap / size * 1000 * 100) / 100))
    })
    const [x, y] = toPage(line.chars[0].x, line.baseline)
    if (cmyk) ops.push(setFillingCmykColor(...(line.white ? [0, 0, 0, 0] as typeof cmyk : cmyk)))
    ops.push(setFontAndSize(names.get(name)!, size), setTextMatrix(1, 0, 0, 1, x, y), PDFOperator.of(PDFOperatorNames.ShowTextAdjusted, [tj]))
  }
  ops.push(endText(), popGraphicsState())
  return ops
}
