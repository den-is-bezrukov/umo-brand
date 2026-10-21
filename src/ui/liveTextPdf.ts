import type { Font } from 'opentype.js'
import {
  PDFOperator, PDFOperatorNames, PDFArray, PDFNumber, type PDFDocument, type PDFFont, type PDFPage,
  pushGraphicsState, popGraphicsState, setFillingCmykColor, beginText, endText, setTextMatrix, setFontAndSize,
} from 'pdf-lib'
import type { TextLine } from './liveText'

// The noted lines (`liveText.ts`) written into a template's pages, loaded with the PDF only: each letter at its pen
// (kerning and tracking as TJ adjustments), so nothing moves. The font goes in whole and under its own name:
// Illustrator, importing a PDF's pages, outlined text set in a subset, and pdf-lib's random suffix kept it from the
// installed font.

/** The fonts a template writes in: CoFo Sans Regular and Medium, whole */
export type LiveFonts = Map<string, PDFFont>

/** fontkit (some 320 KB) loads here, with the template only: the files to print are in outlines and don't need it */
export async function embedCoFo(doc: PDFDocument): Promise<LiveFonts> {
  doc.registerFontkit((await import('@pdf-lib/fontkit')).default)
  const one = async (name: string) => {
    const bytes = await fetch(`${import.meta.env.BASE_URL}fonts/CoFoSans-${name}.ttf`).then(r => r.arrayBuffer())
    return [`CoFoSans-${name}`, await doc.embedFont(bytes, { subset: false, customName: `CoFoSans-${name}` })] as const
  }
  return new Map(await Promise.all([one('Regular'), one('Medium')]))
}

/** The font's own name: opentype.js 2 keeps it per platform */
const psName = (font: Font) => {
  const n = font.names as unknown as Record<string, { postScriptName?: { en?: string } } | undefined>
  return (n.windows?.postScriptName?.en ?? n.macintosh?.postScriptName?.en ?? '').includes('Medium') ? 'CoFoSans-Medium' : 'CoFoSans-Regular'
}

/**
 * The lines as text on a page: `toPage(x, y)` turns the generator's units into the page's points (y up), `scale`
 * its units into points; `fill` the colour, CMYK (a `white` line, white) or the operators setting one (a spot colour)
 */
export function textOps(page: PDFPage, fonts: LiveFonts, lines: TextLine[], toPage: (x: number, y: number) => [number, number], scale: number, fill: [number, number, number, number] | PDFOperator[]): PDFOperator[] {
  if (!lines.length) return []
  const names = new Map([...fonts].map(([n, f]) => [n, page.node.newFontDictionary(n.replace('CoFoSans-', 'CoFo'), f.ref)]))
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
