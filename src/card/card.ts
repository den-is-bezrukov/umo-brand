import type { Font } from 'opentype.js'
import { qrOutline, type Cmd } from '@/livery/geometry'
import { oneLine, setLine as setType, tidy, wrap as wrapLines, missingChars, type Fonts } from '@/ui/type'
import { hasProfanity, PROFANITY } from '@/ui/profanity'
import { nameFault } from '@/ui/names'
import { withListBreak } from '@/data/positions'
import { noteLine } from '@/ui/liveText'
import { LOGO } from '@brand/logo'
import { BUSINESS_CARD as L } from '@brand/business-card'
import { SITE } from '@/site'
import { withoutBrand } from '@/data/points'

// An employee's business card, two sides, laid out as the brand's `@brand/business-card` says (`BrandBusinessCard`).
// The face is the brand's logo, the same for everyone. The back: the dealership at the top if the card names one, set
// once for the whole list — its name in the brand font's Medium, then «Официальный дилер <Бренд>», the address and the
// site in Regular — and the person at the bottom: name and surname in Medium, over the position or on lines of their
// own, then position, email and phone in Regular, with the QR code. The dealership block hangs from its top, the
// person's stands on its bottom, so a line left out or a second one closes up towards the edge.

/** A logo `w` mm wide from (x, y), mm */
export interface LogoBox { x: number; y: number; w: number }

/**
 * `@brand/business-card`: the card's layout, mm, from Figma, whose text boxes are trimmed to the capitals, so the
 * numbers are cap tops and baselines
 */
export interface BrandBusinessCard {
  size: { w: number; h: number }
  /** The brand font's cap height, of its size */
  cap: number
  /** The faces to choose from, the first the default: black (`dark`, the logo white) or white, and the logo on it */
  faces: { label: string; dark: boolean; logo: LogoBox }[]
  /** The back's logo, if it has one */
  logo?: LogoBox
  qr: { x: number; y: number; size: number }
  /**
   * The dealership at the top, if the card names one, its name's capitals on `top`: the name in `name` mm (Medium,
   * `width` wide), «Официальный дилер <Бренд>», the address (up to two lines, `addressWidth`) and the site in `size`
   * (Regular); `afterName` from the name's baseline to the next, `pitch` between items, `leading` inside one
   */
  dealer?: { x: number; top: number; name: number; size: number; width: number; addressWidth: number; afterName: number; pitch: number; leading: number }
  /**
   * The person, from the bottom: phone, email and position (`position.lines` at most, after a fixed `prefix`) in
   * `size` (Regular) within `width`, the last baseline on `bottom`, `pitch` between items, `leading` inside one; name and
   * surname in `name.size` (Medium) within `name.width`, on one line `afterPosition` over the position's capitals, or
   * on two from (`x`, `baseline`), `pitch` apart
   */
  person: {
    x: number; bottom: number; size: number; width: number; pitch: number; leading: number
    position: { lines: number; prefix?: string }
    name: { size: number; width: number } & ({ afterPosition: number } | { x: number; baseline: number; pitch: number })
  }
}

/** The PDF info entry holding what the cards were made from (`writePdfData`), read back when the PDF is dropped */
export const CARDS_KEY = `${SITE.file}BusinessCards`

/** The card, mm */
export const CARD = L.size

export const QR = L.qr

/** The logo `w` mm wide from (x, y), as commands (absolute M, L, H, V, C, Z) */
export function logo(x: number, y: number, w: number): Cmd[] {
  const k = w / LOGO.w
  const cmds: Cmd[] = []
  let cx = 0
  let cy = 0
  for (const [, op, args] of LOGO.d.matchAll(/([MLHVCZ])([^MLHVCZ]*)/g)) {
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

/** The faces to choose from, the first the default, each with its logo */
export const FACES = L.faces.map(f => ({ label: f.label, dark: f.dark, art: logo(f.logo.x, f.logo.y, f.logo.w) }))
/** The back's logo, if it has one */
export const BACK_LOGO = L.logo ? logo(L.logo.x, L.logo.y, L.logo.w) : []
/** Whether the card names the dealership */
export const HAS_DEALER = !!L.dealer

/** The dealership, set once for the whole list */
export interface Dealer { name: string; address: string; site: string }
/** `ext`, the extension, is the one optional field */
export interface Person { name: string; surname: string; position: string; email: string; phone: string; ext: string }

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

const TYPE = `Официальный дилер ${SITE.name}`

/** One line from `x` on `baseline`: kerning, and the case-sensitive forms where `caseForms` (on in Figma for the Medium headings) */
function setLine(font: Font, text: string, x: number, baseline: number, size: number, caseForms: boolean) {
  const l = setType(font, text, x, baseline, size, caseForms ? ['case'] : [])
  return { cmds: l.cmds, width: l.right, end: l.end, pens: l.pens }
}

/** Lines within `width`, breaking where typed and between words */
const wrap = (font: Font, text: string, size: number, width: number) =>
  wrapLines(tidy(text), l => setLine(font, l, 0, 0, size, false).width <= width).map(l => l.replace(/\u00a0/g, ' '))

/** An extension typed or pasted with the number («… доб. 204», «ext 204», «#204», «, 204»), split off; null without one */
export function splitPhone(raw: string): { phone: string; ext: string } | null {
  const m = oneLine(raw).match(/^(.*?)\s*(?:доб\.?|доп\.?|ext\.?|#|,)\s*(\d{1,6})$/i)
  return m ? { phone: m[1], ext: m[2] } : null
}

/**
 * A Russian number as the card sets it, «+7 495 000 00 00», from however it's typed (8 or +7, brackets, dashes);
 * 8 800 numbers keep their 8. Null if it isn't one
 */
/**
 * The codes of the cities with seven-digit numbers, set +7 495 000 00 00 as mobiles (9…) and 8 800 are: Moscow and its
 * region, St Petersburg, the cities of a million and a few more. Every other city's code is four digits, its number
 * six, set +7 4922 77 07 36 (Vladimir), as the code's split into 492 277 read wrong. Five-digit codes (small towns)
 * are rare enough to read as four
 */
const SEVEN_DIGIT_CITIES = new Set(['495', '499', '496', '498', '812', '343', '383', '831', '843', '846', '351', '342', '347', '391', '473', '861', '862', '863', '423'])

/** The ten digits after the country code in their groups, as many as are there: 3-3-2-2, or 4-2-2-2 for a four-digit code */
function phoneGroups(rest: string): string[] {
  const four = rest.length > 3 && !/^[89]/.test(rest) && !SEVEN_DIGIT_CITIES.has(rest.slice(0, 3))
  const cuts = four ? [4, 6, 8, 10] : [3, 6, 8, 10]
  return cuts.map((end, i) => rest.slice(i ? cuts[i - 1] : 0, end)).filter(Boolean)
}

export function formatPhone(raw: string): string | null {
  const t = oneLine(raw)
  if (/[^\d\s()+\-.]/.test(t)) return null
  let d = t.replace(/\D/g, '')
  if (d.length === 10) d = '7' + d
  if (d.length !== 11 || !/^[78]/.test(d)) return null
  return [d.startsWith('8800') ? '8' : '+7', ...phoneGroups(d.slice(1))].join(' ')
}

/**
 * The phone field's live mask: digits only, set as the card sets them while they're typed, «+7 987 654 32 10». A first
 * 8 is the country code and becomes +7 (8 800 keeps its 8), a number typed without one gets +7; ten digits after it
 * at most. `digits` is how many digits stand before a caret, to put it back after the same digit
 */
export function maskPhone(raw: string, digits = Infinity): { text: string; caret: number } {
  let d = raw.replace(/\D/g, '')
  if (!d) return { text: raw.trim() === '+' ? '+' : '', caret: raw.trim() === '+' ? 1 : 0 }
  let before = Math.min(digits, d.length)
  if (!/^[78]/.test(d)) { d = '7' + d; before++ }
  const prefix = d.startsWith('8800') ? '8' : '+7'
  const text = [prefix, ...phoneGroups(d.slice(1, 11))].join(' ')
  // The caret after the `before`-th digit, the country code's counting as one
  let caret = before === 0 ? 0 : text.length
  for (let i = 0, seen = 0; i < text.length && before > 0; i++) {
    if (/\d/.test(text[i]) && ++seen === before) { caret = i + 1; break }
  }
  return { text, caret }
}

/** The phone line: the number set as `formatPhone` does (as typed if it isn't one) and its extension */
export const phoneLine = (p: Pick<Person, 'phone' | 'ext'>) =>
  [formatPhone(p.phone) ?? oneLine(p.phone), p.ext.trim() && `доб. ${p.ext.trim()}`].filter(Boolean).join(' ')

/** The site as it reads on the card: no protocol, no «www.», no slash at the end */
export const siteText = (raw: string) => oneLine(raw).replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '')

const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n',
  о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y',
  ь: '', э: 'e', ю: 'yu', я: 'ya',
}

/**
 * The site offered for a dealership: its name without the brand's name, transliterated, as a subdomain of the
 * brand's site (`SITE.home`), as the Figma card has it: «<Бренд> Дилер Город» → dealer-city.<brand site>. Such subdomains don't
 * exist yet; it's a suggestion, typed over freely
 */
export function siteFor(dealer: string): string {
  const slug = [...withoutBrand(oneLine(dealer)).toLowerCase()].map(c => TRANSLIT[c] ?? c).join('')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return slug ? `${slug}.${new URL(SITE.home).host}` : ''
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
/** A part of the address (before the @, a domain label) with Latin and Cyrillic letters both: «ivanоv» with a Russian о */
const mixedScripts = (email: string) => email.split(/[@.]/).some(part => /[a-z]/i.test(part) && /[а-яё]/i.test(part))

/**
 * The back for one person. The texts come as shown: the page puts placeholders in empty fields, the same layout then
 * holding them in grey. `qr` null leaves the QR out
 */
export function buildBack(fonts: Fonts, dealer: Dealer, person: Person, qr: QrData | null): Back {
  const fields: Partial<Record<CardField, Cmd[]>> = {}
  const issues: Issue[] = []
  const P = L.person

  const check = (field: CardField, label: string, text: string, font: Font) => {
    const absent = missingChars(font, text)
    if (absent.length) issues.push({ field, text: `${label}: нет в шрифте ${absent.map(c => `«${c}»`).join(', ')}` })
    if (hasProfanity(text)) issues.push({ field, text: `${label}: ${PROFANITY.toLowerCase()}` })
  }
  /**
   * Lines of one field from (`x`, `baseline`) down, `leading` apart, checked against its column and line count; a
   * `heading` in Medium with the case forms, the rest in Regular
   */
  const lines = (field: CardField, label: string, text: string, x: number, baseline: number, size: number, leading: number, width: number, max: number, wrapIt: boolean, heading = false) => {
    const font = heading ? fonts.medium : fonts.regular
    const set = wrapIt ? wrap(font, text, size, width) : [oneLine(text)].filter(Boolean)
    const cmds: Cmd[] = []
    set.forEach((t, i) => {
      const l = setLine(font, t, x, baseline + i * leading, size, heading)
      noteLine(font, size, baseline + i * leading, t, l.pens)
      cmds.push(...l.cmds)
      if (l.width > width + 0.01) issues.push({ field, text: `${label} шире ${width} мм` })
    })
    if (set.length > max) issues.push({ field, text: `${label} — не больше ${max === 1 ? 'одной строки' : `${max} строк`}` })
    check(field, label, text, font)
    fields[field] = cmds
    return set.length
  }

  // The dealership, from the top: its capitals on the top
  const D = L.dealer
  if (D) {
    let y = D.top + L.cap * D.name
    lines('dealer', 'Название', dealer.name, D.x, y, D.name, D.leading, D.width, 1, false, true)
    y += D.afterName
    lines('type', 'Подпись', TYPE, D.x, y, D.size, D.leading, D.width, 1, false)
    y += D.pitch
    const address = lines('address', 'Адрес', dealer.address, D.x, y, D.size, D.leading, D.addressWidth, 2, true)
    y += (address - 1) * D.leading + D.pitch
    const site = siteText(dealer.site)
    if (site) lines('site', 'Сайт', site, D.x, y, D.size, D.leading, D.width, 1, false)
  }

  // The person, from the bottom: the last line on the bottom
  let y = P.bottom
  const phone = phoneLine(person)
  if (phone) {
    lines('phone', 'Телефон', phone, P.x, y, P.size, P.leading, P.width, 1, false)
    if (!formatPhone(person.phone)) issues.push({ field: 'phone', text: 'Телефон: проверьте номер' })
    y -= P.pitch
  }
  const email = oneLine(person.email)
  if (email) {
    lines('email', 'Почта', email, P.x, y, P.size, P.leading, P.width, 1, false)
    if (!EMAIL.test(email.replace(/ /g, ''))) issues.push({ field: 'email', text: 'Почта: проверьте адрес' })
    else if (mixedScripts(email)) issues.push({ field: 'email', text: 'Почта: смешаны русские и латинские буквы' })
    y -= P.pitch
  }
  // The position may take two lines, breaking where typed, or where the list breaks it (typed or picked on one line);
  // after a fixed prefix, one
  const font = fonts.regular
  const prefix = P.position.prefix
  if (prefix) {
    const pre = setLine(font, prefix, P.x, y, P.size, false)
    noteLine(font, P.size, y, prefix, pre.pens)
    fields.type = pre.cmds
    const text = oneLine(person.position)
    lines('position', 'Должность', text, pre.end, y, P.size, P.leading, P.width - (pre.end - P.x), 1, false)
  } else {
    const listed = withListBreak(person.position)
    const position = wrap(font, listed, P.size, P.width)
    const first = y - (Math.max(position.length, 1) - 1) * P.leading
    lines('position', 'Должность', listed, P.x, first, P.size, P.leading, P.width, P.position.lines, true)
    y = first
  }

  const name = oneLine(person.name)
  const surname = oneLine(person.surname)
  const N = P.name
  if ('afterPosition' in N) {
    // Name and surname on one line, never shrunk: too long is an error, as on the name tag
    y -= N.afterPosition
    const n = setLine(fonts.medium, name, P.x, y, N.size, true)
    noteLine(fonts.medium, N.size, y, name, n.pens)
    const space = name ? fonts.medium.charToGlyph(' ').advanceWidth! * N.size / fonts.medium.unitsPerEm : 0
    const start = name ? n.end + space : P.x
    const s = setLine(fonts.medium, surname, start, y, N.size, true)
    noteLine(fonts.medium, N.size, y, surname, s.pens)
    fields.name = n.cmds
    fields.surname = s.cmds
    const width = surname ? start - P.x + s.width : n.width
    if (width > N.width + 0.01) for (const field of ['name', 'surname'] as const) issues.push({ field, text: `Имя и фамилия шире ${N.width} мм` })
  } else {
    // Name and surname on lines of their own, from the top
    lines('name', 'Имя', name, N.x, N.baseline, N.size, N.pitch, N.width, 1, false, true)
    lines('surname', 'Фамилия', surname, N.x, N.baseline + N.pitch, N.size, N.pitch, N.width, 1, false, true)
  }
  check('name', 'Имя', name, fonts.medium)
  check('surname', 'Фамилия', surname, fonts.medium)
  for (const [field, label, t] of [['name', 'Имя', name], ['surname', 'Фамилия', surname]] as const) {
    const fault = nameFault(t)
    if (fault) issues.push({ field, text: `${label}: ${fault}` })
  }

  return {
    fields,
    qr: qr ? qrOutline(qr.text, QR.x, QR.y, QR.size, qr.level) : [],
    issues: issues.filter((v, i) => issues.findIndex(o => o.text === v.text && o.field === v.field) === i),
  }
}
