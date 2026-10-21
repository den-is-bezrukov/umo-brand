import {
  PDFDocument, PDFOperator, PDFOperatorNames, PDFArray, PDFNumber, type PDFFont, type PDFPage, type PDFRef, drawObject,
  moveTo, lineTo, appendBezierCurve, closePath, pushGraphicsState, popGraphicsState, setFillingCmykColor,
  beginText, endText, setTextMatrix, setFontAndSize,
} from 'pdf-lib'
import type { Cmd } from '@/livery/geometry'
import { writePdfData } from '@/ui/pdfDataWrite'
import { embedFace } from '@/ui/liveTextPdf'
import type { BrandFont } from '@/brand'
import { FONTS } from '@brand/fonts'
import { MEMOS_KEY, PAGE, MEMO_TEXTS, parseArt, type Block, type Shape } from './memo'
import { layoutText, advance, type FontKey, type Line, type MemoFonts } from './text'
import page1 from '@/assets/memo/page-1.svg'
import page2 from '@/assets/memo/page-2.svg'

// Loaded only when a memo is downloaded, so the page doesn't carry pdf-lib until then. Two files: the memos to print,
// everything in outlines (Figma's own for its parts), and the template, the same pages with every text live in CoFo
// Sans (embedded for viewing and printing only, as the font allows: it's edited in Illustrator or Acrobat where the
// font is installed). Each consultant gets both pages; the parts every memo shares are drawn once and placed on each
// page (a form XObject), so ten memos weigh little more than one. 100% K, white where Figma has white.

const PT = 72 / 25.4
/** Figma px to points: 10 px a millimetre */
const P = PT / 10
const H = PAGE.h * P

const K = (k: number): [number, number, number, number] => [0, 0, 0, k]

const art = (url: string) => fetch(url).then(r => r.text()).then(parseArt)

function pathOps(cmds: Cmd[]): PDFOperator[] {
  const X = (x: number) => x * P
  const Y = (y: number) => H - y * P
  return cmds.map(c =>
    c[0] === 'M' ? moveTo(X(c[1]), Y(c[2]))
      : c[0] === 'L' ? lineTo(X(c[1]), Y(c[2]))
        : c[0] === 'C' ? appendBezierCurve(X(c[1]), Y(c[2]), X(c[3]), Y(c[4]), X(c[5]), Y(c[6]))
          : closePath())
}


/** A shape as content, written by hand to 0,01 pt (pdf-lib's operators write every digit, doubling the file) */
function shapeContent(s: Shape): string {
  const n = (v: number) => String(Math.round(v * 100) / 100)
  const path = s.d.map(c =>
    c[0] === 'M' ? `${n(c[1] * P)} ${n(H - c[2] * P)} m`
      : c[0] === 'L' ? `${n(c[1] * P)} ${n(H - c[2] * P)} l`
        : c[0] === 'C' ? `${n(c[1] * P)} ${n(H - c[2] * P)} ${n(c[3] * P)} ${n(H - c[4] * P)} ${n(c[5] * P)} ${n(H - c[6] * P)} c`
          : 'h').join('\n')
  if (s.stroke) return `q 0 0 0 ${n(s.stroke.opacity)} K ${n(s.stroke.width * P)} w\n${path}\nS Q`
  return `q 0 0 0 ${s.fill === 'white' ? 0 : 1} k\n${path}\n${s.evenOdd ? 'f*' : 'f'} Q`
}

/**
 * Shapes drawn once into a form XObject, compressed (pdf-lib leaves page contents as they are: a page of Figma's
 * outlines is 1,7 MB), placed on every page that has them
 */
function shared(doc: PDFDocument, shapes: Shape[]): PDFRef {
  const content = shapes.map(shapeContent).join('\n')
  return doc.context.register(doc.context.flateStream(content, { Type: 'XObject', Subtype: 'Form', BBox: [0, 0, PAGE.w * P, H], Resources: {} }))
}

/** A shared XObject on a page */
const place = (page: PDFPage, ref: PDFRef) => page.pushOperators(drawObject(page.node.newXObject('Art', ref)))

const newPage = (doc: PDFDocument) => doc.addPage([PAGE.w * P, H])

/** Operators pushed in parts: Figma's page of text outlines is far more than a call's arguments may be */
function push(page: PDFPage, ops: PDFOperator[]) {
  for (let i = 0; i < ops.length; i += 10000) page.pushOperators(...ops.slice(i, i + 10000))
}

/** Outlines of the contacts, one fill */
const fillOps = (cmds: Cmd[]) => [pushGraphicsState(), setFillingCmykColor(...K(1)), ...pathOps(cmds), PDFOperator.of(PDFOperatorNames.FillNonZero), popGraphicsState()]

/** The memos to print: Figma's pages in outlines and each consultant's contacts */
export async function memosPdf(blocks: Block[], data: unknown): Promise<Blob> {
  const doc = await PDFDocument.create()
  doc.setTitle('UMO_owner-memo.pdf')
  writePdfData(doc, MEMOS_KEY, data)
  const [one, two] = await Promise.all([art(page1), art(page2)])
  const [first, second] = [shared(doc, one), shared(doc, two)]
  for (const b of blocks) {
    place(newPage(doc), first)
    const p = newPage(doc)
    place(p, second)
    push(p, fillOps(Object.values(b.fields).flat()))
  }
  return new Blob([await doc.save({ useObjectStreams: false }) as BlobPart], { type: 'application/pdf' })
}

/**
 * Lines as live text: each line a TJ of its segments, kerned as opentype.js kerns them (Figma's kerning), so a line
 * stands where Figma sets it. A line is one text object, as Illustrator opens it
 */
function textOps(page: PDFPage, pdfFonts: Record<FontKey, PDFFont>, fonts: MemoFonts, sets: { size: number; lines: Line[] }[]): PDFOperator[] {
  const names = { r: page.node.newFontDictionary(`${FONTS.short}R`, pdfFonts.r.ref), m: page.node.newFontDictionary(`${FONTS.short}M`, pdfFonts.m.ref) }
  const ops: PDFOperator[] = [pushGraphicsState(), setFillingCmykColor(...K(1)), beginText()]
  for (const { size, lines } of sets) for (const l of lines) {
    for (const s of l.segs) {
      const font = fonts[s.font]
      const { glyphs } = advance(font, s.text, size)
      const chars = [...s.text]
      const tj = PDFArray.withContext(page.doc.context)
      let run = ''
      chars.forEach((c, i) => {
        run += c
        const k = i < glyphs.length - 1 ? font.getKerningValue(glyphs[i], glyphs[i + 1]) * 1000 / font.unitsPerEm : 0
        if (k && i < chars.length - 1) {
          tj.push(pdfFonts[s.font].encodeText(run))
          tj.push(PDFNumber.of(-k))
          run = ''
        }
      })
      if (run) tj.push(pdfFonts[s.font].encodeText(run))
      ops.push(setFontAndSize(names[s.font], size * P), setTextMatrix(1, 0, 0, 1, s.x * P, H - l.baseline * P), PDFOperator.of(PDFOperatorNames.ShowTextAdjusted, [tj]))
    }
  }
  ops.push(endText(), popGraphicsState())
  return ops
}

/** The template: the same pages, every text live in CoFo Sans, the rest as in `memosPdf` */
export async function memosTemplate(blocks: Block[], fonts: MemoFonts): Promise<Blob> {
  const doc = await PDFDocument.create()
  doc.setTitle('UMO_owner-memo_template.pdf')
  // fontkit loads with the template only, as in `embedFonts`
  doc.registerFontkit((await import('@pdf-lib/fontkit')).default)
  // Whole and named as the font is, so Illustrator finds the installed one for it: a subset kept the text live in a
  // page opened alone, but Illustrator's import of all pages outlined it
  const font = (face: BrandFont) => embedFace(doc, face.file, face.name)
  const [one, two, r, m] = await Promise.all([art(page1), art(page2), font(FONTS.regular), font(FONTS.medium)])
  const pdfFonts = { r, m }
  const [first, second] = [shared(doc, one.filter(s => !s.text)), shared(doc, two.filter(s => !s.text))]
  /** Each page's fixed texts, set once */
  const sets = [0, 1].map(p => MEMO_TEXTS.filter(t => t.page === p).map(t => ({ size: t.size, lines: layoutText(fonts, t) })))
  for (const b of blocks) {
    const p1 = newPage(doc)
    place(p1, first)
    push(p1, textOps(p1, pdfFonts, fonts, sets[0]))
    const p2 = newPage(doc)
    place(p2, second)
    push(p2, textOps(p2, pdfFonts, fonts, [...sets[1], ...b.set]))
  }
  return new Blob([await doc.save({ useObjectStreams: false }) as BlobPart], { type: 'application/pdf' })
}
