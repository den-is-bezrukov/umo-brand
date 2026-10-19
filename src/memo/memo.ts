import type { Cmd } from '@/livery/geometry'
import { pathCmds } from '@/ui/type'
import { formatPhone, siteText } from '@/card/card'
import { hasProfanity, PROFANITY } from '@/ui/profanity'
import { nameFault } from '@/ui/names'
import { layoutText, glyphRuns, advance, type Line, type MemoFonts, type MemoText } from './text'
import TEXTS from './texts.json'

// The owner's memo (Figma: UMO | Evrone, section 5222:5427): two A4 pages a dealership hands over with a car. Everything
// but the contacts at the foot of the second page (5222:6042) is Figma's, taken out by scripts/fetch-memo.mjs into
// src/assets/memo (outlines) and texts.json (the texts, for the template's live text). The contacts are two columns
// 90 mm apart from 15 mm in and 252 mm down: the dealership (its name, then address, phone, email and site) and the
// consultant (position, then name, phone and email), the first line CoFo Sans Medium 4,5 mm on 5,985 mm lines, the
// rest Regular 3,6 mm on 4,5, each 1,5 mm under the one before; a line left out closes up. Figma px, 10 a millimetre.

/** The PDF info entry holding what the memos were made from (`writePdfData`), read back when the PDF is dropped */
export const MEMOS_KEY = 'UMOOwnerMemos'

/** A4, Figma px */
export const PAGE = { w: 2100, h: 2970 }

export const MEMO_TEXTS = TEXTS as MemoText[]

/** Where the dealership's column ends, as in Figma (its five lines from 2520): it grows up from there */
const BOTTOM = 2820
/**
 * The columns, [x, measure], on twelve of 150 px across the 1800 px text: six and six (the dealer's measure 50 px
 * clear of the consultant, as the second page's two columns of features), or, `wide`, eight and four, for an address
 * that takes a third line in six
 */
const COLUMNS = {
  even: { dealer: [150, 850], person: [1050, 850] },
  wide: { dealer: [150, 1150], person: [1350, 600] },
} as const
const GAP = 15
const HEAD = { size: 45, lineHeight: 59.85, font: 'm' as const }
const BODY = { size: 36, lineHeight: 45, font: 'r' as const }

export interface Dealer { name: string; address: string; phone: string; email: string; site: string }
export interface Person { position: string; name: string; surname: string; phone: string; email: string }

export type MemoField = 'dealer' | 'address' | 'dealerPhone' | 'dealerEmail' | 'site' | 'position' | 'name' | 'surname' | 'phone' | 'email'
export const DEALER_FIELDS: MemoField[] = ['dealer', 'dealerPhone', 'address', 'dealerEmail', 'site']

export interface Issue { field: MemoField | null; text: string }

/** One field as set: its lines, for outlines and for live text */
export interface FieldLines { field: MemoField; size: number; lines: Line[] }

export interface Block {
  /** Each field's outlines, Figma px, y down */
  fields: Partial<Record<MemoField, Cmd[]>>
  set: FieldLines[]
  issues: Issue[]
  /** The fields with more lines than they may have */
  over: MemoField[]
}

const oneLine = (t: string) => t.replace(/[​-‍⁠﻿]/g, '').replace(/\s+/g, ' ').trim()
/** Line breaks kept, as typed */
const lines = (t: string) => t.replace(/[​-‍⁠﻿]/g, '').replace(/\r/g, '').split('\n').map(oneLine).filter(Boolean).join('\n')

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const mixedScripts = (email: string) => email.split(/[@.]/).some(part => /[a-z]/i.test(part) && /[а-яё]/i.test(part))

/** Outlines of set lines */
export function outlines(fonts: MemoFonts, size: number, set: Line[]): Cmd[] {
  return set.flatMap(l => l.segs.flatMap(s => glyphRuns(fonts, size, s, l.baseline).flatMap(g => pathCmds(g.glyph.getPath(g.x, g.y, size).commands))))
}

/**
 * The contacts for one consultant. The texts come as shown: the page puts placeholders in empty fields, the same
 * layout then holding them in grey
 */
export function buildBlock(fonts: MemoFonts, dealer: Dealer, person: Person, wide = false): Block {
  const fields: Block['fields'] = {}
  const set: FieldLines[] = []
  const issues: Issue[] = []
  const over: MemoField[] = []
  const columns = COLUMNS[wide ? 'wide' : 'even']

  /**
   * A column hanging from `top`, or, with none, standing on `BOTTOM` and growing up as its lines grow; returns its top.
   * An item: field, label, text, most lines and, for a line of two fields, where the second's characters start and which it is
   */
  const column = ([x, measure]: readonly [number, number], items: [MemoField, string, string, number, [number, MemoField]?][], top?: number) => {
    const shown = items.map(([field, label, raw, max, split], i) => {
      const style = i ? BODY : HEAD
      const text = max > 1 ? lines(raw) : split ? raw : oneLine(raw)
      return { field, label, max, style, text, split }
    }).filter(it => it.text)
    const at = (y: number, it: typeof shown[number]): MemoText => ({
      page: 1, id: it.field, x, y, w: measure, size: it.style.size, lineHeight: it.style.lineHeight,
      paragraphSpacing: 0, listSpacing: 0, align: 'left', text: it.text, runs: [[0, it.text.length, it.style.font]],
    })
    const height = shown.reduce((h, it, i) => h + (i ? GAP : 0) + layoutText(fonts, at(0, it)).length * it.style.lineHeight, 0)
    let y = top ?? BOTTOM - height
    const start = y
    shown.forEach(it => {
      const { field, label, max, style, text, split } = it
      const l = layoutText(fonts, at(y, it))
      if (l.length > max) over.push(field)
      if (l.length > max) issues.push({ field, text: `${label} — не больше ${max === 1 ? 'одной строки' : `${max} строк`}` })
      // A word wider than the column (an email has no spaces to break at) stays on its line and runs past it
      const past = l.some(line => { const last = line.segs[line.segs.length - 1]; return last.x + advance(fonts[last.font], last.text, style.size).end - x > measure + 0.01 })
      if (past) {
        over.push(field)
        issues.push({ field, text: `${label} шире ${measure / 10} мм` })
      }
      const font = fonts[style.font]
      const absent = [...new Set([...text.replace(/\s/g, '')].filter(c => !font.hasChar(c)))]
      if (absent.length) issues.push({ field, text: `${label}: нет в шрифте ${absent.map(c => `«${c}»`).join(', ')}` })
      if (hasProfanity(text)) issues.push({ field, text: `${label}: ${PROFANITY.toLowerCase()}` })
      set.push({ field, size: style.size, lines: l })
      if (split) {
        // One line of two fields, each its own outlines (black, red or grey on its own)
        const glyphs = l.flatMap(line => line.segs.flatMap(sg => glyphRuns(fonts, style.size, sg, line.baseline)))
        const path = (g: typeof glyphs) => g.flatMap(r => pathCmds(r.glyph.getPath(r.x, r.y, style.size).commands))
        fields[field] = path(glyphs.slice(0, split[0]))
        fields[split[1]] = path(glyphs.slice(split[0]))
      } else fields[field] = outlines(fonts, style.size, l)
      y += l.length * style.lineHeight + GAP
    })
    return start
  }

  /** The dealer's phone and email are said as the dealer's, as their fields are labelled */
  const whose = (field: MemoField, label: string) => DEALER_FIELDS.includes(field) ? `${label} дилера` : label
  const phone = (field: MemoField, raw: string) => {
    const f = formatPhone(raw)
    if (oneLine(raw) && !f) issues.push({ field, text: `${whose(field, 'Телефон')}: проверьте номер` })
    return f ?? raw
  }
  const email = (field: MemoField, raw: string) => {
    const e = oneLine(raw)
    if (!e) return e
    if (!EMAIL.test(e)) issues.push({ field, text: `${whose(field, 'Почта')}: проверьте адрес` })
    else if (mixedScripts(e)) issues.push({ field, text: `${whose(field, 'Почта')}: смешаны русские и латинские буквы` })
    return e
  }

  // The phone over the address, level with the consultant's name, so an address of two or three lines (on 4,5 mm
  // lines, against 6 mm between the lines) comes after the rows the columns share
  // The dealership stands on `BOTTOM` and grows up; the consultant hangs from its top, the dealer's name and the
  // position always on one line
  const top = column(columns.dealer, [
    ['dealer', 'Название', dealer.name, 1],
    ['dealerPhone', 'Телефон дилера', phone('dealerPhone', dealer.phone), 1],
    ['address', 'Адрес', dealer.address, 3],
    ['dealerEmail', 'Почта дилера', email('dealerEmail', dealer.email), 1],
    ['site', 'Сайт', siteText(dealer.site), 1],
  ])
  column(columns.person, [
    ['position', 'Должность', person.position, 2],
    // Name and surname on one line, the name first, as the business card has them
    ['name', 'Имя и фамилия', `${oneLine(person.name)} ${oneLine(person.surname)}`.trim(), 1, [oneLine(person.name).length + 1, 'surname']],
    ['phone', 'Телефон', phone('phone', person.phone), 1],
    ['email', 'Почта', email('email', person.email), 1],
  ], top)
  for (const [field, label, t] of [['name', 'Имя', person.name], ['surname', 'Фамилия', person.surname]] as const) {
    const fault = nameFault(oneLine(t))
    if (fault) issues.push({ field, text: `${label}: ${fault}` })
  }
  // The line too long is the surname's fault too
  for (const i of issues.filter(i => i.field === 'name' && i.text.startsWith('Имя и фамилия'))) issues.push({ ...i, field: 'surname' })

  return { fields, set, over, issues: issues.filter((v, i) => issues.findIndex(o => o.text === v.text && o.field === v.field) === i) }
}

/**
 * The whole list's contacts, in one layout for all: six and six, or eight and four where the address takes a third
 * line in six and every consultant fits in four (the position in two lines, the rest in one)
 */
export function buildBlocks(fonts: MemoFonts, dealer: Dealer, people: Person[]): Block[] {
  const even = people.map(p => buildBlock(fonts, dealer, p))
  const lines = even[0]?.set.find(s => s.field === 'address')?.lines.length ?? 0
  if (lines < 3) return even
  const wide = people.map(p => buildBlock(fonts, dealer, p, true))
  return wide.every(b => !b.over.some(f => !DEALER_FIELDS.includes(f))) ? wide : even
}

/** A shape of Figma's pages: a path (or a rounded rectangle) filled black or white, or stroked; `text` marks text outlines */
export interface Shape { d: Cmd[]; fill?: 'black' | 'white'; evenOdd?: boolean; stroke?: { width: number; opacity: number }; text?: boolean }

/** Absolute M L H V C Z, as Figma writes them */
function parsePath(d: string): Cmd[] {
  const cmds: Cmd[] = []
  let x = 0
  let y = 0
  for (const [, op, args] of d.matchAll(/([MLHVCZ])([^MLHVCZ]*)/g)) {
    const n = args.trim() ? args.trim().split(/[\s,]+/).map(Number) : []
    if (op === 'Z') { cmds.push(['Z']); continue }
    if (op === 'H') { for (const v of n) { x = v; cmds.push(['L', x, y]) } continue }
    if (op === 'V') { for (const v of n) { y = v; cmds.push(['L', x, y]) } continue }
    if (op === 'C') {
      for (let i = 0; i + 5 < n.length; i += 6) { cmds.push(['C', n[i], n[i + 1], n[i + 2], n[i + 3], n[i + 4], n[i + 5]]); [x, y] = [n[i + 4], n[i + 5]] }
      continue
    }
    for (let i = 0; i + 1 < n.length; i += 2) { [x, y] = [n[i], n[i + 1]]; cmds.push([op === 'M' && i === 0 ? 'M' : 'L', x, y]) }
  }
  return cmds
}

/** A rounded rectangle as a path */
function roundRect(x: number, y: number, w: number, h: number, r: number): Cmd[] {
  const k = r * 0.5523
  return [
    ['M', x + r, y], ['L', x + w - r, y], ['C', x + w - r + k, y, x + w, y + r - k, x + w, y + r],
    ['L', x + w, y + h - r], ['C', x + w, y + h - r + k, x + w - r + k, y + h, x + w - r, y + h],
    ['L', x + r, y + h], ['C', x + r - k, y + h, x, y + h - r + k, x, y + h - r],
    ['L', x, y + r], ['C', x, y + r - k, x + r - k, y, x + r, y], ['Z'],
  ]
}

/** The shapes of one of src/assets/memo's pages */
export function parseArt(svg: string): Shape[] {
  const shapes: Shape[] = []
  for (const [, tag, attrs] of svg.matchAll(/<(path|rect)\b([^>]*)\/?>/g)) {
    const a = (k: string) => attrs.match(new RegExp(`\\s${k}="([^"]*)"`))?.[1]
    const d = tag === 'path' ? parsePath(a('d') ?? '') : roundRect(+(a('x') ?? 0), +(a('y') ?? 0), +a('width')!, +a('height')!, +(a('rx') ?? 0))
    const fill = a('fill')
    shapes.push({
      d,
      fill: fill === 'black' || fill === 'white' ? fill : undefined,
      evenOdd: a('fill-rule') === 'evenodd',
      stroke: a('stroke') ? { width: +(a('stroke-width') ?? 1), opacity: +(a('stroke-opacity') ?? 1) } : undefined,
      text: /\sdata-text\b/.test(attrs),
    })
  }
  return shapes
}
