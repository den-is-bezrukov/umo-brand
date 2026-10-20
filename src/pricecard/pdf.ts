import {
  PDFDocument, PDFOperator, PDFOperatorNames,
  moveTo, lineTo, appendBezierCurve, closePath, pushGraphicsState, popGraphicsState, setFillingRgbColor, rectangle, clip, endPath,
} from 'pdf-lib'
import type { Cmd } from '@/livery/geometry'
import { BAND, CARD, INKS, photoRect, type Art, type Ink } from './card'

// Loaded only when the PDF is downloaded, so the page doesn't carry pdf-lib until then.

/** A3, 297×420 mm, in points: the card's 2100 px across */
const PAGE_W = 297 * 72 / 25.4
const K = PAGE_W / CARD.w

const rgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number]

/**
 * The cards, an A3 page each at 1:1, no bleed, in RGB as the photo is: the full photo cut to the band, the text, the
 * wordmark and the QR as filled outlines. `title` goes in the PDF's info: Chrome shows it on the tab of a PDF opened
 * from a link
 */
export async function cardsPdf(cards: Art[], title: string): Promise<Blob> {
  const doc = await PDFDocument.create()
  doc.setTitle(title)
  const photos = new Map<string, Awaited<ReturnType<PDFDocument['embedJpg']>>>()
  for (const art of cards) {
    const url = art.photo.print
    if (!photos.has(url)) photos.set(url, await doc.embedJpg(await fetch(url).then(r => r.arrayBuffer())))
    const page = doc.addPage([PAGE_W, CARD.h * K])
    const H = page.getHeight()
    const X = (x: number) => x * K
    const Y = (y: number) => H - y * K
    const path = (cmds: Cmd[]) => cmds.map(c =>
      c[0] === 'M' ? moveTo(X(c[1]), Y(c[2]))
        : c[0] === 'L' ? lineTo(X(c[1]), Y(c[2]))
          : c[0] === 'C' ? appendBezierCurve(X(c[1]), Y(c[2]), X(c[3]), Y(c[4]), X(c[5]), Y(c[6]))
            : closePath())

    const r = photoRect(art.photo)
    page.pushOperators(pushGraphicsState(), rectangle(0, Y(BAND), PAGE_W, BAND * K), clip(), endPath())
    page.drawImage(photos.get(url)!, { x: X(r.x), y: Y(r.y + r.h), width: r.w * K, height: r.h * K })
    page.pushOperators(popGraphicsState())

    for (const ink of Object.keys(INKS) as Ink[]) {
      if (!art.parts[ink].length) continue
      page.pushOperators(
        pushGraphicsState(),
        setFillingRgbColor(...rgb(INKS[ink])),
        ...path(art.parts[ink]),
        PDFOperator.of(PDFOperatorNames.FillEvenOdd),
        popGraphicsState(),
      )
    }
  }
  const bytes = await doc.save({ useObjectStreams: false })
  return new Blob([bytes as BlobPart], { type: 'application/pdf' })
}
