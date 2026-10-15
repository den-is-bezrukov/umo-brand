import { pdf } from '@react-pdf/renderer'
import PriceCardPdf from './PriceCardPdf'
import { ensurePdfFonts } from './pdfFonts'
import type { ComponentProps } from 'react'

/** The cards' PDF, an A3 page each. Its own module, loaded on the first download: react-pdf is most of the price card's code */
export function cardsPdf(pages: ComponentProps<typeof PriceCardPdf>['pages'], title: string) {
  ensurePdfFonts()
  return pdf(<PriceCardPdf pages={pages} title={title} />).toBlob()
}
