import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate'
import template from '@/assets/pricetag/UMO_price-tag_template.docx?url'
import type { Item } from './tag'

// The tags as a Word document, for those who print from Word or fix a price by hand: the brand team's template
// (Yandex Disk `02 UMO/Price Tag/UMO_Price-tag.docx`, CoFo Sans embedded, which Word for Windows shows) with the texts
// put in. Its table is two tags wide, five rows a tag (band, name, code, caption, price: 60 mm together); the first
// tag row is the pattern, its sample texts replaced cell by cell. A table per page of eight, centred, with a page break
// between them; grey cut lines round every tag, as in the PDF, none inside it. Loaded only when the Word file is downloaded.

const PER_PAGE = 8
const ROWS_PER_TAG = 5

/** The template's sample texts, the same in every cell */
const SAMPLE = {
  dealer: 'GAC Левобережный',
  name: 'Яндекс Станция Макс с Zigbee, модель YNDX-00053 (графитовый)',
  code: '>YNDX-00053<',
  caption: 'Цена за штуку с НДС',
  price: '30\u00a0000 ',
}

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
/** A text with its line breaks, inside a run's <w:t> */
const lines = (t: string) => t.trim().split('\n').map(l => esc(l.replace(/\s+/g, ' ').trim())).join('</w:t><w:br/><w:t xml:space="preserve">')

/** A cell where a row of two has only one tag */
const EMPTY_CELL = '<w:tc><w:tcPr><w:tcW w:w="5102" w:type="dxa"/></w:tcPr><w:p/></w:tc>'

const LINE = 'w:val="single" w:sz="2" w:space="0" w:color="E6E6E6"'
/** Lines round the table and between the columns; none between a tag's own rows (`UNDER` closes each tag) */
const BORDERS = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideV'].map(s => `<w:${s} ${LINE}/>`).join('') +
  '<w:insideH w:val="none" w:sz="0" w:space="0" w:color="auto"/></w:tblBorders>'
/** The line under a tag, on its price row's cells */
const UNDER = `<w:tcBorders><w:bottom ${LINE}/></w:tcBorders>`

export async function tagsDocx(dealer: string, items: Item[]): Promise<Blob> {
  const files = unzipSync(new Uint8Array(await (await fetch(template)).arrayBuffer()))
  const doc = strFromU8(files['word/document.xml'])
  const open = doc.indexOf('<w:tbl>')
  const close = doc.indexOf('</w:tbl>') + '</w:tbl>'.length
  const table = doc.slice(open, close)
  const head = table.slice(0, table.search(/<w:tr[ >]/))
    // In the flow rather than floating, centred, so the tables follow each other page by page
    .replace(/<w:tblpPr[^>]*\/>/, '')
    .replace(/<w:tblW [^>]*\/>/, '<w:tblW w:w="10204" w:type="dxa"/><w:jc w:val="center"/>')
    .replace(/<w:tblBorders>[\s\S]*?<\/w:tblBorders>/, BORDERS)
  const pattern = (table.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) ?? []).slice(0, ROWS_PER_TAG)

  const fill = (cell: string, row: number, it: Item) => {
    switch (row) {
      case 0: return cell.replace(SAMPLE.dealer, () => lines(dealer))
      case 1: return cell.replace(SAMPLE.name, () => lines(it.name))
      case 2: return cell.replace(SAMPLE.code, () => `>${lines(it.code)}<`)
      case 3: return cell.replace(SAMPLE.caption, () => lines(it.caption))
      default: return cell.replace(/(<w:tcW [^>]*\/>)/, `$1${UNDER}`).replace(SAMPLE.price, () => `${esc(it.price.trim().replace(/ /g, '\u00a0'))} `)
    }
  }
  const tagRow = (pair: Item[]) => pattern.map((tr, r) => {
    let i = 0
    return tr.replace(/<w:tc>[\s\S]*?<\/w:tc>/g, cell => {
      const it = pair[i++]
      return it ? fill(cell, r, it) : EMPTY_CELL
    })
  }).join('')

  const pages: string[] = []
  for (let p = 0; p < items.length; p += PER_PAGE) {
    const page = items.slice(p, p + PER_PAGE)
    const rows: string[] = []
    for (let i = 0; i < page.length; i += 2) rows.push(tagRow(page.slice(i, i + 2)))
    pages.push(head + rows.join('') + '</w:tbl>')
  }
  const pageBreak = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'
  const body = doc.slice(0, open) + pages.join(pageBreak) + doc.slice(close)
  // The tables start where the floating one stood, 19,4 mm from the top
  files['word/document.xml'] = strToU8(body.replace(/(<w:pgMar w:top=")\d+/, '$11099'))
  return new Blob([zipSync(files) as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
}
