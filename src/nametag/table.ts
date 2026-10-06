import { unzipSync, strFromU8 } from 'fflate'
import type { Person } from './tag'

// The staff list from a spreadsheet: an .xlsx file (Excel, Google Sheets' «Скачать → .xlsx», Numbers' export) or rows
// copied from one. Columns: name, surname, position, as in the template `public/downloads/UMO_name-tags_template.xlsx`;
// a header row is found by its titles and may put the columns in any order. A line break in a cell (Alt+Enter) is kept,
// so it breaks the position where it's typed.

/** A person and the spreadsheet row they came from, for the errors */
export interface TableRow { line: number; person: Person }

const HEADERS: Record<keyof Person, RegExp> = { name: /^имя$/i, surname: /^фамилия$/i, position: /^должность$/i }

/** A column with the whole name, as HR systems export it: «ФИО», «Ф.И.О.», «Сотрудник», «Фамилия Имя Отчество» */
export const FULL_NAME = /^(ф\.?\s*и\.?\s*о\.?|сотрудник|фамилия,?\s+имя(,?\s+отчество)?)$/i

const PATRONYMIC = /^[а-яё]+(вич|вна|ична|инична)$/i
const TURKIC = /^(оглы|кызы|улы|гызы)$/i

/**
 * Name and surname out of a whole name, or null where it can't be told which is which. A patronymic (with оглы or кызы
 * after it) goes, and where it stood tells the order: last, «Петров Иван Сергеевич»; in the middle, «Иван Сергеевич
 * Петров». Without one, two words are read in the order the place they came from uses: `nameFirst` in the name field
 * («Иван Петров»), surname first in a ФИО column. More words than that are left alone; hyphenated ones are one word.
 */
export function splitFullName(text: string, nameFirst: boolean): { name: string; surname: string } | null {
  if (text.includes('\n')) return null
  const words = text.trim().split(/\s+/).filter(Boolean)
  // The patronymic's words: one on -вич / -вна, or the father's name with оглы / кызы after it
  const t = words.findIndex((w, i) => i > 1 && TURKIC.test(w))
  const p = t >= 0 ? t - 1 : words.findIndex((w, i) => i > 0 && PATRONYMIC.test(w))
  if (p >= 0) {
    const end = t >= 0 ? t : p
    const rest = words.filter((_, i) => i < p || i > end)
    if (rest.length !== 2) return null
    return end === words.length - 1 ? { surname: rest[0], name: rest[1] } : { name: rest[0], surname: rest[1] }
  }
  if (words.length !== 2) return null
  return nameFirst ? { name: words[0], surname: words[1] } : { surname: words[0], name: words[1] }
}

/** A row's name and surname from its ФИО cell, when it has no name or surname of its own; all of it as the name if it can't be split */
export function fromFullName<T extends { name: string; surname: string }>(person: T, full: string): T {
  if (person.name.trim() || person.surname.trim() || !full.trim()) return person
  return { ...person, ...(splitFullName(full, false) ?? { name: full.trim(), surname: '' }) }
}

/**
 * Rows of cells into people. Three or more cells are name, surname and position; two with a space in the first are
 * «Имя Фамилия» and position, otherwise name and surname.
 */
export function toPeople(rows: { line: number; cells: string[] }[]): TableRow[] {
  const filled = rows.map(r => ({ ...r, cells: r.cells.map(c => (c ?? '').trim()) })).filter(r => r.cells.some(Boolean))
  const head = filled[0]
  const cols = head && head.cells.some(c => HEADERS.name.test(c) || FULL_NAME.test(c))
    ? Object.fromEntries(Object.entries(HEADERS).map(([k, re]) => [k, head.cells.findIndex(c => re.test(c))])) as Record<keyof Person, number>
    : null
  const full = cols ? head.cells.findIndex(c => FULL_NAME.test(c)) : -1
  return (cols ? filled.slice(1) : filled).map(({ line, cells: c }) => {
    if (cols) return { line, person: fromFullName({ name: c[cols.name] ?? '', surname: c[cols.surname] ?? '', position: c[cols.position] ?? '' }, c[full] ?? '') }
    if (c.length >= 3) return { line, person: { name: c[0], surname: c[1], position: c.slice(2).filter(Boolean).join(' ') } }
    if (c.length === 2 && c[0].includes(' ')) {
      const [name, ...rest] = c[0].split(/\s+/)
      return { line, person: { name, surname: rest.join(' '), position: c[1] } }
    }
    return { line, person: { name: c[0] ?? '', surname: c[1] ?? '', position: '' } }
  })
}

export interface Cells { line: number; cells: string[] }

/** Copied cells: tab-separated, a line per row */
export function pastedCells(text: string): Cells[] {
  return text.replace(/\r/g, '').split('\n').map((l, i) => ({ line: i + 1, cells: l.split('\t') }))
}

export function parsePasted(text: string): TableRow[] {
  return toPeople(pastedCells(text))
}

/**
 * Rows of cells into records with the fields of `headers`: by a header row found by its titles, in any column order,
 * or else in the order of `headers`
 */
export function byHeaders<K extends string>(rows: Cells[], headers: Record<K, RegExp>): Record<K, string>[] {
  const keys = Object.keys(headers) as K[]
  const filled = rows.map(r => r.cells.map(c => (c ?? '').trim())).filter(c => c.some(Boolean))
  const head = filled[0]
  const found = head ? keys.map(k => head.findIndex(c => headers[k].test(c))) : []
  const cols = found.some(i => i >= 0) ? found : null
  return (cols ? filled.slice(1) : filled).map(c => Object.fromEntries(keys.map((k, i) => [k, c[cols ? cols[i] : i] ?? ''])) as Record<K, string>)
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
  return toPeople(xlsxCells(data))
}

/** The first sheet's rows of cells */
export function xlsxCells(data: ArrayBuffer): Cells[] {
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
  return all(xml(sheet), 'row').map(r => {
    const cells: string[] = []
    for (const c of all(r, 'c')) {
      const type = c.getAttribute('t')
      const v = all(c, 'v')[0]?.textContent ?? ''
      cells[column(c.getAttribute('r') ?? 'A')] = type === 's' ? shared[Number(v)] ?? '' : type === 'inlineStr' ? text(c) : v
    }
    return { line: Number(r.getAttribute('r')), cells: Array.from(cells, c => c ?? '') }
  })
}
