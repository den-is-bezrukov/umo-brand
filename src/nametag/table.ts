import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate'
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

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * The list behind the tags, for the archive: a sheet like the template's (bold header, frozen; text wrapped, so a
 * position's line break shows), with a first column «№» matching the tag's page in the PDF
 */
export function writeXlsx(people: Person[]): Uint8Array {
  const rows = [['№', 'Имя', 'Фамилия', 'Должность'], ...people.map((p, i) => [String(i + 1), p.name.trim(), p.surname.trim(), p.position.trim()])]
  const cell = (ref: string, v: string, style: number) => `<c r="${ref}" t="inlineStr" s="${style}"><is><t xml:space="preserve">${esc(v)}</t></is></c>`
  const data = rows.map((r, i) => `<row r="${i + 1}">${r.map((v, j) => cell(`${'ABCD'[j]}${i + 1}`, v, i === 0 ? 1 : 2)).join('')}</row>`).join('')
  const head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
  const rel = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
  return zipSync({
    '[Content_Types].xml': strToU8(`${head}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`),
    '_rels/.rels': strToU8(`${head}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    'xl/workbook.xml': strToU8(`${head}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${rel}"><sheets><sheet name="Бейджи" sheetId="1" r:id="rId1"/></sheets></workbook>`),
    'xl/_rels/workbook.xml.rels': strToU8(`${head}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${rel}/styles" Target="styles.xml"/></Relationships>`),
    'xl/styles.xml': strToU8(`${head}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="12"/><name val="Arial"/></font><font><b/><sz val="12"/><name val="Arial"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="3"><xf/><xf fontId="1" applyFont="1"/><xf applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf></cellXfs></styleSheet>`),
    'xl/worksheets/sheet1.xml': strToU8(`${head}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="6" customWidth="1"/><col min="2" max="2" width="20" customWidth="1"/><col min="3" max="3" width="26" customWidth="1"/><col min="4" max="4" width="44" customWidth="1"/></cols><sheetData>${data}</sheetData></worksheet>`),
  })
}
