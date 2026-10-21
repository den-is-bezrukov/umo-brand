import { DEFAULT_CAPTION, type Item } from './tag'
import { isPdf, readPdfData } from '@/ui/pdfData'
import { SITE } from '@/site'

// The tags' own PDF dropped back on the page, to fix a price and download again: it carries the dealer and the goods
// as typed in its info (`DATA_KEY`, written by `tagsPdf`). Any other PDF has no tags to give.

/** The PDF info entry holding the list, as JSON */
export const DATA_KEY = `${SITE.file}PriceTags`

export interface TagsData { dealer: string; items: Item[] }

const NOT_OURS_PDF = 'В этом PDF нет ценников: подходят PDF, скачанные здесь'

/** A PDF's tags; null for anything else (an .xlsx, read as a table) */
export function readTagsFile(data: ArrayBuffer): TagsData | null {
  const bytes = new Uint8Array(data)
  return isPdf(bytes) ? readPdf(bytes) : null
}

function readPdf(bytes: Uint8Array): TagsData {
  const d = readPdfData(bytes, DATA_KEY) as Partial<TagsData> | undefined
  const items = (d?.items ?? []).map(it => ({ name: String(it.name ?? ''), code: String(it.code ?? ''), caption: String(it.caption ?? DEFAULT_CAPTION), price: String(it.price ?? '') }))
  if (!items.length) throw new Error(NOT_OURS_PDF)
  return { dealer: String(d?.dealer ?? ''), items }
}
