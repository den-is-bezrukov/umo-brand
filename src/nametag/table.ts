import { unzipSync, strFromU8 } from 'fflate'
import type { Person } from './tag'

// The staff list from a spreadsheet: an .xlsx file (Excel, Google Sheets' «Скачать → .xlsx», Numbers' export) or rows
// copied from one. Columns: name, surname, position, as in the template `public/downloads/UMO_name-tags_template.xlsx`;
// a header row is found by its titles and may put the columns in any order. A line break in a cell (Alt+Enter) is kept,
// so it breaks the position where it's typed.

/** A person and the spreadsheet row they came from, for the errors */
export interface TableRow { line: number; person: Person }

const HEADERS: Record<keyof Person, RegExp> = { name: /^имя$/i, surname: /^фамилия$/i, position: /^должность$/i }

/**
 * Rows of cells into people. Three or more cells are name, surname and position; two with a space in the first are
 * «Имя Фамилия» and position, otherwise name and surname.
 */
export function toPeople(rows: { line: number; cells: string[] }[]): TableRow[] {
  const filled = rows.map(r => ({ ...r, cells: r.cells.map(c => (c ?? '').trim()) })).filter(r => r.cells.some(Boolean))
  const head = filled[0]
  const cols = head && head.cells.some(c => HEADERS.name.test(c))
    ? Object.fromEntries(Object.entries(HEADERS).map(([k, re]) => [k, head.cells.findIndex(c => re.test(c))])) as Record<keyof Person, number>
    : null
  return (cols ? filled.slice(1) : filled).map(({ line, cells: c }) => {
    if (cols) return { line, person: { name: c[cols.name] ?? '', surname: c[cols.surname] ?? '', position: c[cols.position] ?? '' } }
    if (c.length >= 3) return { line, person: { name: c[0], surname: c[1], position: c.slice(2).filter(Boolean).join(' ') } }
    if (c.length === 2 && c[0].includes(' ')) {
      const [name, ...rest] = c[0].split(/\s+/)
      return { line, person: { name, surname: rest.join(' '), position: c[1] } }
    }
    return { line, person: { name: c[0] ?? '', surname: c[1] ?? '', position: '' } }
  })
}

/** Copied cells: tab-separated, a line per row */
export function parsePasted(text: string): TableRow[] {
  return toPeople(text.replace(/\r/g, '').split('\n').map((l, i) => ({ line: i + 1, cells: l.split('\t') })))
}

const xml = (s: string) => new DOMParser().parseFromString(s, 'application/xml')
/** Elements by local name, whatever prefix the writer used */
const all = (el: Document | Element, name: string) => [...el.getElementsByTagNameNS('*', name)]
const text = (el: Element) => all(el, 't').map(t => t.textContent ?? '').join('')

/** Column index of a cell reference: C7 → 2 */
function column(ref: string): number {
  let n = 0
  for (const ch of ref.replace(/\d+$/, '')) n = n * 26 + ch.charCodeAt(0) - 64
  return n - 1
}

/** The first sheet of an .xlsx; throws on anything else */
export function readXlsx(data: ArrayBuffer): TableRow[] {
  const files = unzipSync(new Uint8Array(data))
  const read = (path: string) => files[path] ? strFromU8(files[path]) : undefined
  const workbook = read('xl/workbook.xml')
  if (!workbook) throw new Error('Это не файл .xlsx')
  const rid = all(xml(workbook), 'sheet')[0]?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id')
  const target = all(xml(read('xl/_rels/workbook.xml.rels') ?? '<r/>'), 'Relationship').find(r => r.getAttribute('Id') === rid)?.getAttribute('Target')
  const sheetPath = target ? (target.startsWith('/') ? target.slice(1) : `xl/${target}`) : 'xl/worksheets/sheet1.xml'
  const sheet = read(sheetPath)
  if (!sheet) throw new Error('В файле нет листа')
  const shared = all(xml(read('xl/sharedStrings.xml') ?? '<sst/>'), 'si').map(text)
  const rows = all(xml(sheet), 'row').map(r => {
    const cells: string[] = []
    for (const c of all(r, 'c')) {
      const type = c.getAttribute('t')
      const v = all(c, 'v')[0]?.textContent ?? ''
      cells[column(c.getAttribute('r') ?? 'A')] = type === 's' ? shared[Number(v)] ?? '' : type === 'inlineStr' ? text(c) : v
    }
    return { line: Number(r.getAttribute('r')), cells: Array.from(cells, c => c ?? '') }
  })
  return toPeople(rows)
}
