import {
  PDFDocument, PDFOperator, PDFOperatorNames,
  moveTo, lineTo, appendBezierCurve, closePath, pushGraphicsState, popGraphicsState, setFillingCmykColor,
  setStrokingCmykColor, setLineWidth, stroke, PDFName, PDFHexString, type PDFDict,
} from 'pdf-lib'
import { TAG, BAND, BAND_ART, type Tag } from './tag'
import { DATA_KEY, type TagsData } from './read'
import type { Cmd } from '@/livery/geometry'

// Loaded only when the tags are downloaded, so the page doesn't carry pdf-lib until then.

const PT = 72 / 25.4

/** A4, printed on any office printer at its actual size */
const PAGE = { w: 210, h: 297 }
const COLS = 2
const ROWS = 4
export const PER_PAGE = COLS * ROWS
/**
 * The 180×240 block of tags centred on the sheet: 15 mm at the sides, 28.5 at the top and bottom, more than any office
 * printer leaves unprinted
 */
const X0 = (PAGE.w - COLS * TAG.w) / 2
const Y0 = (PAGE.h - ROWS * TAG.h) / 2

const BLACK: [number, number, number, number] = [0, 0, 0, 1]
const WHITE: [number, number, number, number] = [0, 0, 0, 0]
/** The cut lines: K20 (#CCCCCC), light, so a hair of one left on a tag's edge doesn't show, yet printed by an office printer (K10 was too faint) */
const LINE: [number, number, number, number] = [0, 0, 0, 0.2]

function pathOps(cmds: Cmd[], dx: number, dy: number): PDFOperator[] {
  const X = (x: number) => (x + dx) * PT
  const Y = (y: number) => (PAGE.h - y - dy) * PT
  return cmds.map(c =>
    c[0] === 'M' ? moveTo(X(c[1]), Y(c[2]))
      : c[0] === 'L' ? lineTo(X(c[1]), Y(c[2]))
        : c[0] === 'C' ? appendBezierCurve(X(c[1]), Y(c[2]), X(c[3]), Y(c[4]), X(c[5]), Y(c[6]))
          : closePath())
}

const rect = (x: number, y: number, w: number, h: number): Cmd[] => [['M', x, y], ['L', x + w, y], ['L', x + w, y + h], ['L', x, y + h], ['Z']]

/**
 * The tags on A4 sheets, eight to a sheet at 1:1, butting each other so one cut parts two; the cut lines run across the
 * whole sheet, so scissors or a guillotine can follow them from the edge. Over the black bands the line between the
 * columns is white. All text and logos are filled outlines, black 100% K
 */
export async function tagsPdf(tags: Tag[], data: TagsData): Promise<Blob> {
  const doc = await PDFDocument.create()
  doc.setTitle('UMO price tags 90×60')
  // The dealer and the goods as typed, in the document's info, so the file dropped back on the page opens its list
  // (`readTagsFile`); nothing of it is printed
  ;(doc as unknown as { getInfoDict(): PDFDict }).getInfoDict().set(PDFName.of(DATA_KEY), PDFHexString.fromText(JSON.stringify(data)))
  for (let from = 0; from < tags.length; from += PER_PAGE) {
    const sheet = tags.slice(from, from + PER_PAGE)
    const p = doc.addPage([PAGE.w * PT, PAGE.h * PT])
    const at = (i: number) => ({ x: X0 + (i % COLS) * TAG.w, y: Y0 + Math.floor(i / COLS) * TAG.h })
    const fill = (color: typeof BLACK, cmds: Cmd[], dx = 0, dy = 0) => p.pushOperators(
      pushGraphicsState(), setFillingCmykColor(...color),
      ...pathOps(cmds, dx, dy), PDFOperator.of(PDFOperatorNames.FillEvenOdd),
      popGraphicsState(),
    )
    sheet.forEach((t, i) => {
      const { x, y } = at(i)
      const { dealer = [], ...rest } = t.fields
      fill(BLACK, rect(0, 0, TAG.w, BAND), x, y)
      fill(WHITE, [...BAND_ART, ...dealer], x, y)
      fill(BLACK, Object.values(rest).flat(), x, y)
    })
    // The lines: across the sheet at every row's edge, down it at every column's edge
    const rows = Math.ceil(sheet.length / COLS)
    const X = (v: number) => v * PT
    const Y = (v: number) => (PAGE.h - v) * PT
    const seg = (x1: number, y1: number, x2: number, y2: number) => [moveTo(X(x1), Y(y1)), lineTo(X(x2), Y(y2))]
    const grey = [
      ...Array.from({ length: rows + 1 }, (_, r) => seg(0, Y0 + r * TAG.h, PAGE.w, Y0 + r * TAG.h)).flat(),
      // Down from the sheet's top to its edge, or to the last row's bottom on a sheet not full; the middle line breaks
      // over the bands, where it's white
      ...Array.from({ length: COLS + 1 }, (_, c) => X0 + c * TAG.w).flatMap(x => {
        const end = rows === ROWS ? PAGE.h : Y0 + rows * TAG.h
        if (x === X0 || x === X0 + COLS * TAG.w) return seg(x, 0, x, end)
        const out = [...seg(x, 0, x, Y0)]
        for (let r = 0; r < rows; r++) out.push(...seg(x, Y0 + r * TAG.h + BAND, x, Y0 + (r + 1) * TAG.h))
        if (rows === ROWS) out.push(...seg(x, Y0 + ROWS * TAG.h, x, PAGE.h))
        return out
      }),
    ]
    const white = Array.from({ length: rows }, (_, r) => seg(X0 + TAG.w, Y0 + r * TAG.h, X0 + TAG.w, Y0 + r * TAG.h + BAND)).flat()
    p.pushOperators(
      pushGraphicsState(), setLineWidth(0.25),
      setStrokingCmykColor(...LINE), ...grey, stroke(),
      setStrokingCmykColor(...WHITE), ...white, stroke(),
      popGraphicsState(),
    )
  }
  // No object streams: the info stays plain in the file, read back without a PDF parser
  const bytes = await doc.save({ useObjectStreams: false })
  return new Blob([bytes as BlobPart], { type: 'application/pdf' })
}
