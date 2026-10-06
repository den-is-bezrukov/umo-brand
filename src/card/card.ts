import type { Font, Glyph } from 'opentype.js'
import { qrOutline, type Cmd } from '@/livery/geometry'
import { caseMap, pathCmds } from '@/plate/frame'
import { hasProfanity, PROFANITY } from '@/ui/profanity'
import type { Fonts } from '@/nametag/tag'

// A dealership employee's business card (Figma: UMO | Evrone, section 4021:2849): 90×50 mm, two sides. The face
// (4456:5172) is the UMO logo 40×8 mm in the bottom left corner, the same for everyone. The back (4456:5175) has
// two blocks within 5 mm margins: the dealership at the top, set once for the whole list — its name in CoFo Sans
// Medium 4 mm, then «Официальный дилер UMO», the address and the site in Regular 3 mm, with the logo 15×3 mm in the
// top right corner — and the person at the bottom — name and surname in Medium 4 mm, then position, email and phone
// in Regular 3 mm, with the QR code 15×15 mm in the bottom right corner. The dealership block hangs from the top
// margin, the person's stands on the bottom one, so a line left out or a second one closes up towards the edge.
// Figma's text boxes are trimmed to the capitals (680 of 1000 units), so its numbers are cap tops and baselines.

/** The card, mm */
export const CARD = { w: 90, h: 50 }

const MARGIN = 5
const CAP = 0.68
/** The name lines, Medium */
const BIG = 4
/** The rest, Regular */
const SMALL = 3
/** From a heading's baseline to the first line under it: 2.3 mm between the capitals */
const AFTER_HEADING = 2.3 + CAP * SMALL
/** From one item's baseline to the next: 2 mm between them */
const PITCH = 2 + CAP * SMALL
/** Between the lines of one item (the address, a position in two lines): 100% */
const LEADING = SMALL

/** The dealership's column, left of the logo */
const DEALER_W = 65
/** The person's column, left of the QR with 5 mm to it */
const PERSON_W = 60

export const QR = { x: 70, y: 30, size: 15 }

/** The UMO logo of the guide (`src/guide/UmoLogo.tsx`), 480×96 units */
const LOGO = 'M218.401 34.8H182.399V96H146.4V34.6746C146.4 10.0442 158.096 0 182.399 0H218.401V34.8ZM290.398 0C314.693 0 326.4 10.0299 326.4 34.6746V96H290.398V34.8H254.399V96H218.401V34.8H254.399V0H290.398Z' +
  'M98.4 61.2H36V0H0V61.3254C0 85.9702 11.7204 96 36.0301 96H98.3663C122.694 96 134.4 85.9558 134.4 61.3254V0H98.4V61.2Z' +
  'M443.973 0C468.284 0 480 10.0299 480 34.6746V61.3254C480 85.9558 468.299 96 443.973 96H374.43C350.116 96 338.4 85.9702 338.4 61.3254V34.6746C338.4 10.0442 350.116 0 374.43 0H443.973ZM374.4 61.2H444V34.6746L374.4 34.8V61.2Z'

/** The logo `w` mm wide from (x, y), as commands (absolute M, L, H, V, C, Z) */
export function logo(x: number, y: number, w: number): Cmd[] {
  const k = w / 480
  const cmds: Cmd[] = []
  let cx = 0
  let cy = 0
  for (const [, op, args] of LOGO.matchAll(/([MLHVCZ])([^MLHVCZ]*)/g)) {
    const n = args.trim() ? args.trim().split(/[\s,]+/).map(Number) : []
    if (op === 'Z') { cmds.push(['Z']); continue }
    if (op === 'C') { cmds.push(['C', x + n[0] * k, y + n[1] * k, x + n[2] * k, y + n[3] * k, x + n[4] * k, y + n[5] * k]); [cx, cy] = [n[4], n[5]]; continue }
    if (op === 'H') cx = n[0]
    else if (op === 'V') cy = n[0]
    else [cx, cy] = [n[0], n[1]]
    cmds.push([op === 'M' ? 'M' : 'L', x + cx * k, y + cy * k])
  }
  return cmds
}

/** The face: the logo 40×8 mm, its bottom left corner on the margins */
export const FACE = logo(MARGIN, CARD.h - MARGIN - 8, 40)
/** The back's logo, 15×3 mm, its top right corner on the margins, level with the capitals of the dealership's name */
export const BACK_LOGO = logo(CARD.w - MARGIN - 15, MARGIN, 15)

/** The dealership, set once for the whole list */
export interface Dealer { name: string; address: string; site: string }
export interface Person { name: string; surname: string; position: string; email: string; phone: string }

export type CardField = 'dealer' | 'type' | 'address' | 'site' | 'name' | 'surname' | 'position' | 'email' | 'phone'
export const DEALER_FIELDS: CardField[] = ['dealer', 'address', 'site']

export interface Issue { field: CardField | null; text: string }

/** What the QR holds: a link (`M`, sturdier) or a contact, longer (`L`, so it stays coarse enough to print at 15 mm) */
export interface QrData { text: string; level: 'L' | 'M' }

export interface Back {
  /** Each field's outlines, mm, y down */
  fields: Partial<Record<CardField, Cmd[]>>
  qr: Cmd[]
  issues: Issue[]
}

const TYPE = 'Официальный дилер UMO'

/** Every kind of space becomes a plain one, zero-width marks go; line breaks are kept */
const tidy = (t: string) => t.replace(/[​-‍⁠﻿]/g, '').replace(/\r/g, '').split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean)
/** One line, typed line breaks as spaces */
const oneLine = (t: string) => tidy(t).join(' ')

/** One line from `x` on `baseline`: kerning, and the case-sensitive forms where `caseForms` (on in Figma for the Medium headings) */
function setLine(font: Font, text: string, x: number, baseline: number, size: number, caseForms: boolean) {
  const scale = size / font.unitsPerEm
  const forms = caseForms ? caseMap(font) : new Map<number, number>()
  const glyphs: Glyph[] = font.stringToGlyphs(text).map(g => font.glyphs.get(forms.get(g.index) ?? g.index))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const commands: any[] = []
  let right = x
  let pen = x
  glyphs.forEach((g, i) => {
    const p = g.getPath(pen, baseline, size)
    commands.push(...p.commands)
    if (p.commands.length) right = Math.max(right, p.getBoundingBox().x2)
    pen += g.advanceWidth! * scale
    if (i < glyphs.length - 1) pen += font.getKerningValue(g, glyphs[i + 1]) * scale
  })
  return { cmds: pathCmds(commands), width: right - x, end: pen }
}

const inkWidth = (font: Font, text: string, size: number) => setLine(font, text, 0, 0, size, false).width

/** Words of one or two characters (prepositions) stick to the next word */
function bindShortWords(text: string): string {
  let prev
  do {
    prev = text
    text = text.replace(/(^|[\s ])([^\s ]{1,2}) +(?=\S)/g, '$1$2 ')
  } while (text !== prev)
  return text
}

/** Lines within `width`, breaking where typed and between words */
function wrap(font: Font, text: string, size: number, width: number): string[] {
  const lines: string[] = []
  for (const paragraph of tidy(text)) {
    let line = ''
    for (const w of bindShortWords(paragraph).split(/ +/).filter(Boolean)) {
      const candidate = line ? `${line} ${w}` : w
      if (line && inkWidth(font, candidate, size) > width) {
        lines.push(line)
        line = w
      } else line = candidate
    }
    if (line) lines.push(line)
  }
  return lines.map(l => l.replace(/ /g, ' '))
}

/**
 * A Russian number as the card sets it, «+7 495 000 00 00 доб. 12345», from however it's typed (8 or +7, brackets,
 * dashes, «доб», «ext», «#» or a comma before the extension); 8 800 numbers keep their 8. Anything else stays as typed
 */
export function formatPhone(raw: string): string {
  const t = oneLine(raw)
  const m = t.match(/^(.*?)(?:\s*(?:доб\.?|доп\.?|ext\.?|#|,)\s*(\d{1,6}))?$/i)
  if (!m) return t
  let d = m[1].replace(/\D/g, '')
  if (/[^\d\s()+\-.]/.test(m[1])) return t
  if (d.length === 10) d = '7' + d
  if (d.length !== 11 || !/^[78]/.test(d)) return t
  const free = d.startsWith('8800')
  const n = `${free ? '8' : '+7'} ${d.slice(1, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9)}`
  return m[2] ? `${n} доб. ${m[2]}` : n
}

/** The site as it reads on the card: no protocol, no «www.», no slash at the end */
export const siteText = (raw: string) => oneLine(raw).replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '')

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * The back for one person. The texts come as shown: the page puts placeholders in empty fields, the same layout then
 * holding them in grey. `qr` null leaves the QR out
 */
export function buildBack(fonts: Fonts, dealer: Dealer, person: Person, qr: QrData | null): Back {
  const fields: Partial<Record<CardField, Cmd[]>> = {}
  const issues: Issue[] = []
  const x = MARGIN

  const check = (field: CardField, label: string, text: string, font: Font) => {
    const absent = [...new Set([...text.replace(/\s/g, '')].filter(c => !font.hasChar(c)))]
    if (absent.length) issues.push({ field, text: `${label}: нет в шрифте ${absent.map(c => `«${c}»`).join(', ')}` })
    if (hasProfanity(text)) issues.push({ field, text: `${label}: ${PROFANITY.toLowerCase()}` })
  }
  /** Lines of one field from `baseline` down, checked against its column and line count */
  const lines = (field: CardField, label: string, text: string, baseline: number, size: number, width: number, max: number, wrapIt: boolean) => {
    const font = size === BIG ? fonts.medium : fonts.regular
    const set = wrapIt ? wrap(font, text, size, width) : [oneLine(text)].filter(Boolean)
    const cmds: Cmd[] = []
    set.forEach((t, i) => {
      const l = setLine(font, t, x, baseline + i * LEADING, size, size === BIG)
      cmds.push(...l.cmds)
      if (l.width > width + 0.01) issues.push({ field, text: `${label} шире ${width} мм` })
    })
    if (set.length > max) issues.push({ field, text: `${label} — не больше ${max === 1 ? 'одной строки' : `${max} строк`}` })
    check(field, label, text, font)
    fields[field] = cmds
    return set.length
  }

  // The dealership, from the top: its capitals on the top margin
  let y = MARGIN + CAP * BIG
  lines('dealer', 'Название', dealer.name, y, BIG, DEALER_W, 1, false)
  y += AFTER_HEADING
  lines('type', 'Подпись', TYPE, y, SMALL, DEALER_W, 1, false)
  y += PITCH
  const address = lines('address', 'Адрес', dealer.address, y, SMALL, DEALER_W, 2, true)
  y += (address - 1) * LEADING + PITCH
  const site = siteText(dealer.site)
  if (site) lines('site', 'Сайт', site, y, SMALL, DEALER_W, 1, false)

  // The person, from the bottom: the last line on the bottom margin
  y = CARD.h - MARGIN
  const phone = formatPhone(person.phone)
  if (phone) { lines('phone', 'Телефон', phone, y, SMALL, PERSON_W, 1, false); y -= PITCH }
  const email = oneLine(person.email)
  if (email) {
    lines('email', 'Почта', email, y, SMALL, PERSON_W, 1, false)
    if (!EMAIL.test(email.replace(/ /g, ''))) issues.push({ field: 'email', text: 'Почта: проверьте адрес' })
    y -= PITCH
  }
  // The position may take two lines, breaking where typed or picked from the list
  const font = fonts.regular
  const position = wrap(font, person.position, SMALL, PERSON_W)
  const first = y - (Math.max(position.length, 1) - 1) * LEADING
  lines('position', 'Должность', person.position, first, SMALL, PERSON_W, 2, true)
  y = first - AFTER_HEADING

  // Name and surname on one line, never shrunk: too long is an error, as on the name tag
  const name = oneLine(person.name)
  const surname = oneLine(person.surname)
  const n = setLine(fonts.medium, name, x, y, BIG, true)
  const space = name ? fonts.medium.charToGlyph(' ').advanceWidth! * BIG / fonts.medium.unitsPerEm : 0
  const start = name ? n.end + space : x
  const s = setLine(fonts.medium, surname, start, y, BIG, true)
  fields.name = n.cmds
  fields.surname = s.cmds
  const width = surname ? start - x + s.width : n.width
  if (width > PERSON_W + 0.01) for (const field of ['name', 'surname'] as const) issues.push({ field, text: `Имя и фамилия шире ${PERSON_W} мм` })
  check('name', 'Имя', name, fonts.medium)
  check('surname', 'Фамилия', surname, fonts.medium)

  return {
    fields,
    qr: qr ? qrOutline(qr.text, QR.x, QR.y, QR.size, qr.level) : [],
    issues: issues.filter((v, i) => issues.findIndex(o => o.text === v.text && o.field === v.field) === i),
  }
}

/** vCard text: commas, semicolons and backslashes escaped */
const esc = (t: string) => t.replace(/[\\;,]/g, m => '\\' + m)

/**
 * The person as a contact (vCard 3.0), for the QR: scanned, a phone offers to save it with the name, position,
 * dealership, phone (the extension after a comma, dialled after a pause), email and site filled in. No address: it's
 * printed beside the code, and a long one made the code too fine to print at 15 mm (81 modules, 0,19 mm each, against
 * 57–65 without it)
 */
export function vcard(dealer: Dealer, p: Person): string {
  const phone = formatPhone(p.phone)
  const [main, ext] = phone.split(' доб. ')
  const site = siteText(dealer.site)
  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${esc(oneLine(p.surname))};${esc(oneLine(p.name))};;;`,
    `FN:${esc(`${oneLine(p.name)} ${oneLine(p.surname)}`.trim())}`,
    dealer.name.trim() && `ORG:${esc(oneLine(dealer.name))}`,
    p.position.trim() && `TITLE:${esc(oneLine(p.position))}`,
    main && `TEL;TYPE=WORK,VOICE:${main.replace(/[^\d+]/g, '')}${ext ? `,${ext}` : ''}`,
    p.email.trim() && `EMAIL;TYPE=WORK:${oneLine(p.email)}`,
    site && `URL:https://${site}`,
    'END:VCARD',
  ].filter(Boolean).join('\r\n')
}
