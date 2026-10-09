import { unzipSync, strFromU8 } from 'fflate'
import { DEFAULT_CAPTION, readPrice, type Item } from './tag'

// The tags' own files dropped back on the page, to fix a price and download again: the PDF carries the dealer and the
// goods as typed in its info (`DATA_KEY`, written by `tagsPdf`), the Word file is read off its table, so what was
// changed in Word comes back too. Any other PDF or Word file has no tags to give.

/** The PDF info entry holding the list, as JSON */
export const DATA_KEY = 'UMOPriceTags'

export interface TagsData { dealer: string; items: Item[] }

const NOT_OURS_PDF = 'В этом PDF нет ценников: подходят PDF, скачанные здесь'
const NOT_OURS_WORD = 'В этом файле Word нет ценников: подходят файлы, скачанные здесь'

/** A PDF's or Word file's tags; null for anything else (an .xlsx, read as a table) */
export function readTagsFile(data: ArrayBuffer): TagsData | null {
  const bytes = new Uint8Array(data)
  if (strFromU8(bytes.subarray(0, 5), true) === '%PDF-') return readPdf(bytes)
  let files: Record<string, Uint8Array>
  try { files = unzipSync(bytes) } catch { return null }
  return files['word/document.xml'] ? readDocx(strFromU8(files['word/document.xml'])) : null
}

function readPdf(bytes: Uint8Array): TagsData {
  // Latin-1, one character a byte, to find the entry in the file as written (no object streams)
  const text = strFromU8(bytes, true)
  const m = text.match(new RegExp(`/${DATA_KEY}\\s*<([0-9A-Fa-f\\s]*)>`))
  if (!m) throw new Error(NOT_OURS_PDF)
  const hex = m[1].replace(/\s/g, '')
  const raw = new Uint8Array(hex.length / 2).map((_, i) => parseInt(hex.slice(2 * i, 2 * i + 2), 16))
  // pdf-lib writes text as UTF-16BE after a byte-order mark
  const json = raw[0] === 0xfe && raw[1] === 0xff ? new TextDecoder('utf-16be').decode(raw.subarray(2)) : new TextDecoder().decode(raw)
  try {
    const d = JSON.parse(json) as Partial<TagsData>
    const items = (d.items ?? []).map(it => ({ name: String(it.name ?? ''), code: String(it.code ?? ''), caption: String(it.caption ?? DEFAULT_CAPTION), price: String(it.price ?? '') }))
    if (!items.length) throw new Error()
    return { dealer: String(d.dealer ?? ''), items }
  } catch {
    throw new Error(NOT_OURS_PDF)
  }
}

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

/** A cell's text: its paragraphs and line breaks as line breaks */
function cellText(tc: Element): string {
  return [...tc.getElementsByTagNameNS(W, 'p')].map(p => {
    let line = ''
    for (const el of p.getElementsByTagNameNS(W, '*')) {
      if (el.localName === 't') line += el.textContent ?? ''
      else if (el.localName === 'br' && el.getAttributeNS(W, 'type') !== 'page') line += '\n'
      else if (el.localName === 'tab') line += ' '
    }
    return line
  }).join('\n').replace(/[ \t]+/g, ' ').trim()
}

/** The tag table, five rows a tag (band, name, code, caption, price), two tags a row; every table of the file in turn */
function readDocx(xml: string): TagsData {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  let dealer = ''
  const items: Item[] = []
  for (const tbl of doc.getElementsByTagNameNS(W, 'tbl')) {
    const rows = [...tbl.getElementsByTagNameNS(W, 'tr')].map(tr => [...tr.getElementsByTagNameNS(W, 'tc')].map(cellText))
    for (let r = 0; r + 4 < rows.length; r += 5) {
      for (let c = 0; c < rows[r].length; c++) {
        const [band, name, code, caption, price] = rows.slice(r, r + 5).map(row => row[c] ?? '')
        if (!name && !price) continue
        dealer ||= band.replace(/\s+/g, ' ')
        items.push({ name, code: code.replace(/\s+/g, ' '), caption: caption.replace(/\s+/g, ' ') || DEFAULT_CAPTION, price: readPrice(price) ?? price.replace(/\s*₽\s*$/, '') })
      }
    }
  }
  if (!items.length) throw new Error(NOT_OURS_WORD)
  return { dealer, items }
}
